import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeAll, beforeEach, afterAll, afterEach, describe, it } from 'vitest';

const RULES = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-fitness-rpg',
    firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

function validQuest(uid: string) {
  return {
    uid,
    questDefId: 'daily-workout-1',
    progress: 0,
    completedAt: null,
    claimedAt: null,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    rewards: { xp: 100, gold: 50 },
  };
}

describe('activeQuests — read / delete', () => {
  it('denies unauthenticated read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('activeQuests').doc('q1').set(validQuest('user1'));
    });
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(ctx.firestore().collection('activeQuests').doc('q1').get());
  });

  it('allows owner read', async () => {
    const uid = 'user1';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('activeQuests').doc('q1').set(validQuest(uid));
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(ctx.firestore().collection('activeQuests').doc('q1').get());
  });

  it('denies cross-user read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('activeQuests').doc('q1').set(validQuest('user1'));
    });
    const ctx = testEnv.authenticatedContext('attacker');
    await assertFails(ctx.firestore().collection('activeQuests').doc('q1').get());
  });
});

describe('activeQuests — create', () => {
  it('allows creating a valid quest', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(ctx.firestore().collection('activeQuests').add(validQuest(uid)));
  });

  it('denies creating a quest with completedAt already set', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('activeQuests')
        .add({ ...validQuest(uid), completedAt: Date.now() }),
    );
  });

  it('denies creating a quest with claimedAt already set', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('activeQuests')
        .add({ ...validQuest(uid), claimedAt: Date.now() }),
    );
  });
});

describe('activeQuests — update (two-step claim enforcement)', () => {
  const uid = 'user1';

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('activeQuests').doc('q1').set(validQuest(uid));
    });
  });

  it('allows updating quest progress', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      ctx.firestore().collection('activeQuests').doc('q1').update({ progress: 10 }),
    );
  });

  it('allows setting completedAt when quest is done', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      ctx.firestore().collection('activeQuests').doc('q1').update({ completedAt: Date.now() }),
    );
  });

  it('denies setting claimedAt when completedAt is still null (two-step enforcement)', async () => {
    // completedAt is null from beforeEach — the forged write tries to claim in one shot
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('activeQuests').doc('q1').update({ claimedAt: Date.now() }),
    );
  });

  it('denies setting both completedAt and claimedAt simultaneously', async () => {
    // The rule uses resource.data.completedAt (stored value), not the in-flight one.
    // A single write setting both is blocked because the stored completedAt is still null.
    const ctx = testEnv.authenticatedContext(uid);
    const now = Date.now();
    await assertFails(
      ctx
        .firestore()
        .collection('activeQuests')
        .doc('q1')
        .update({ completedAt: now, claimedAt: now }),
    );
  });

  it('allows setting claimedAt once completedAt is already stored', async () => {
    // First write: set completedAt (rules-disabled to bypass update rule for isolation)
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .collection('activeQuests')
        .doc('q1')
        .update({ completedAt: Date.now() });
    });
    // Second write: set claimedAt — should succeed because completedAt is now in resource.data
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      ctx.firestore().collection('activeQuests').doc('q1').update({ claimedAt: Date.now() }),
    );
  });

  it('denies unsetting completedAt once it is set (write-once)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .collection('activeQuests')
        .doc('q1')
        .update({ completedAt: Date.now() });
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('activeQuests').doc('q1').update({ completedAt: null }),
    );
  });

  it('denies changing immutable fields (questDefId, expiresAt, rewards)', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('activeQuests').doc('q1').update({ questDefId: 'weekly-steps-1' }),
    );
  });

  it('denies update by a different authenticated user', async () => {
    const ctx = testEnv.authenticatedContext('intruder');
    await assertFails(ctx.firestore().collection('activeQuests').doc('q1').update({ progress: 5 }));
  });
});

describe('activeQuests — rewardedXp / rewardedGold scoping', () => {
  const uid = 'user1';

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      // Quest that is completed but not yet claimed — valid target for a claim write
      await ctx
        .firestore()
        .collection('activeQuests')
        .doc('q1')
        .set({ ...validQuest(uid), completedAt: Date.now() });
    });
  });

  it('allows stamping rewardedXp and rewardedGold during the claimedAt transition', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      ctx.firestore().collection('activeQuests').doc('q1').update({
        claimedAt: Date.now(),
        rewardedXp: 120,
        rewardedGold: 40,
      }),
    );
  });

  it('denies rewardedXp on a plain progress update (no claimedAt transition)', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('activeQuests').doc('q1').update({
        progress: 5,
        rewardedXp: 120,
      }),
    );
  });

  it('denies rewardedXp with an out-of-bounds value (> 100 000)', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('activeQuests').doc('q1').update({
        claimedAt: Date.now(),
        rewardedXp: 999999,
        rewardedGold: 40,
      }),
    );
  });

  it('denies rewardedXp when the quest is already claimed (double-claim)', async () => {
    // Pre-set claimedAt so the quest is already claimed
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('activeQuests').doc('q1').update({ claimedAt: Date.now() });
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('activeQuests').doc('q1').update({
        claimedAt: Date.now(),
        rewardedXp: 120,
      }),
    );
  });
});

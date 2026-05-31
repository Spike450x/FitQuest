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

function validBounty(uid: string) {
  return {
    uid,
    bountyDefId: 'bounty-workout-45',
    progress: 0,
    completedAt: null,
    claimedAt: null,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    rewards: { reputation: 45 },
  };
}

describe('activeBounties — read / delete', () => {
  it('denies unauthenticated read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('activeBounties').doc('b1').set(validBounty('user1'));
    });
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(ctx.firestore().collection('activeBounties').doc('b1').get());
  });

  it('allows owner read', async () => {
    const uid = 'user1';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('activeBounties').doc('b1').set(validBounty(uid));
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(ctx.firestore().collection('activeBounties').doc('b1').get());
  });

  it('denies cross-user read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('activeBounties').doc('b1').set(validBounty('user1'));
    });
    const ctx = testEnv.authenticatedContext('attacker');
    await assertFails(ctx.firestore().collection('activeBounties').doc('b1').get());
  });
});

describe('activeBounties — create', () => {
  it('allows creating a valid bounty', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(ctx.firestore().collection('activeBounties').add(validBounty(uid)));
  });

  it('denies create when uid mismatches the authenticated user', async () => {
    const ctx = testEnv.authenticatedContext('realuser');
    await assertFails(ctx.firestore().collection('activeBounties').add(validBounty('otheruser')));
  });

  it('denies creating a bounty with completedAt already set', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('activeBounties')
        .add({ ...validBounty(uid), completedAt: Date.now() }),
    );
  });

  it('denies creating a bounty with claimedAt already set', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('activeBounties')
        .add({ ...validBounty(uid), claimedAt: Date.now() }),
    );
  });
});

describe('activeBounties — update (two-step claim enforcement)', () => {
  const uid = 'user1';

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('activeBounties').doc('b1').set(validBounty(uid));
    });
  });

  it('allows updating bounty progress', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      ctx.firestore().collection('activeBounties').doc('b1').update({ progress: 10 }),
    );
  });

  it('denies setting claimedAt when completedAt is still null (two-step enforcement)', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('activeBounties').doc('b1').update({ claimedAt: Date.now() }),
    );
  });

  it('denies changing immutable fields (bountyDefId, expiresAt, rewards)', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('activeBounties')
        .doc('b1')
        .update({ bountyDefId: 'bounty-run-3' }),
    );
  });

  it('denies update by a different authenticated user', async () => {
    const ctx = testEnv.authenticatedContext('intruder');
    await assertFails(
      ctx.firestore().collection('activeBounties').doc('b1').update({ progress: 5 }),
    );
  });
});

describe('activeBounties — rewardedReputation scoping', () => {
  const uid = 'user1';

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      // Completed but unclaimed — valid target for a claim write.
      await ctx
        .firestore()
        .collection('activeBounties')
        .doc('b1')
        .set({ ...validBounty(uid), completedAt: Date.now() });
    });
  });

  it('allows stamping rewardedReputation during the claimedAt transition', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      ctx.firestore().collection('activeBounties').doc('b1').update({
        claimedAt: Date.now(),
        rewardedReputation: 45,
      }),
    );
  });

  it('denies rewardedReputation on a plain progress update (no claim transition)', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('activeBounties').doc('b1').update({
        progress: 5,
        rewardedReputation: 45,
      }),
    );
  });

  it('denies rewardedReputation with an out-of-bounds value (> 100 000)', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('activeBounties').doc('b1').update({
        claimedAt: Date.now(),
        rewardedReputation: 999999,
      }),
    );
  });
});

describe('activeBounties — hunt combat fields', () => {
  const uid = 'user1';

  it('allows creating a hunt bounty with combatMonsterId + combatWonAt null', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      ctx
        .firestore()
        .collection('activeBounties')
        .add({ ...validBounty(uid), combatMonsterId: 'goblin-scout', combatWonAt: null }),
    );
  });

  it('denies creating a bounty with combatWonAt already set', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('activeBounties')
        .add({ ...validBounty(uid), combatMonsterId: 'goblin-scout', combatWonAt: Date.now() }),
    );
  });

  describe('update', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        // Completed hunt, unclaimed, target pinned — valid target for a fight claim.
        await ctx
          .firestore()
          .collection('activeBounties')
          .doc('h1')
          .set({
            ...validBounty(uid),
            completedAt: Date.now(),
            combatMonsterId: 'goblin-scout',
            combatWonAt: null,
          });
      });
    });

    it('allows stamping combatWonAt during the claim transition', async () => {
      const ctx = testEnv.authenticatedContext(uid);
      await assertSucceeds(
        ctx.firestore().collection('activeBounties').doc('h1').update({
          claimedAt: Date.now(),
          combatWonAt: Date.now(),
          rewardedReputation: 150,
        }),
      );
    });

    it('denies stamping combatWonAt without the claim transition', async () => {
      const ctx = testEnv.authenticatedContext(uid);
      await assertFails(
        ctx.firestore().collection('activeBounties').doc('h1').update({ combatWonAt: Date.now() }),
      );
    });

    it('denies mutating combatMonsterId (immutable)', async () => {
      const ctx = testEnv.authenticatedContext(uid);
      await assertFails(
        ctx
          .firestore()
          .collection('activeBounties')
          .doc('h1')
          .update({ combatMonsterId: 'ancient-dragon' }),
      );
    });
  });
});

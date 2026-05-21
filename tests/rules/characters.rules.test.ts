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

function validCharacter(uid: string) {
  return {
    uid,
    name: 'Thorin',
    class: 'warrior',
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    gold: 0,
    stats: { strength: 10, wisdom: 8, agility: 8, stamina: 50, health: 50, defense: 30 },
    equippedGear: { weapon: null, armor: null, accessory: null },
    createdAt: Date.now(),
  };
}

describe('characters — read', () => {
  it('denies unauthenticated read', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(ctx.firestore().collection('characters').doc('uid1').get());
  });

  it('allows owner to read own document', async () => {
    const uid = 'user1';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('characters').doc(uid).set(validCharacter(uid));
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(ctx.firestore().collection('characters').doc(uid).get());
  });

  it('denies cross-user read', async () => {
    const uid = 'user2';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('characters').doc(uid).set(validCharacter(uid));
    });
    const ctx = testEnv.authenticatedContext('attacker');
    await assertFails(ctx.firestore().collection('characters').doc(uid).get());
  });
});

describe('characters — create', () => {
  it('allows a valid level-1 character', async () => {
    const uid = 'newuser';
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      ctx.firestore().collection('characters').doc(uid).set(validCharacter(uid)),
    );
  });

  it('denies creation at level > 1', async () => {
    const uid = 'cheat1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('characters')
        .doc(uid)
        .set({ ...validCharacter(uid), level: 5 }),
    );
  });

  it('denies creation with a subclass pre-set', async () => {
    const uid = 'cheat2';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('characters')
        .doc(uid)
        .set({ ...validCharacter(uid), subclass: 'berserker' }),
    );
  });

  it('denies creation when uid mismatches the document id', async () => {
    const uid = 'realuser';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('characters')
        .doc(uid)
        .set({ ...validCharacter(uid), uid: 'spoofed' }),
    );
  });

  it('denies creation when unauthenticated', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(
      ctx.firestore().collection('characters').doc('anyuid').set(validCharacter('anyuid')),
    );
  });

  it('denies creation with a primary stat exceeding cap (> 50)', async () => {
    const uid = 'cheat3';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('characters')
        .doc(uid)
        .set({
          ...validCharacter(uid),
          stats: { strength: 51, wisdom: 8, agility: 8, stamina: 50, health: 50, defense: 30 },
        }),
    );
  });
});

describe('characters — update', () => {
  const uid = 'existing';

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('characters').doc(uid).set(validCharacter(uid));
    });
  });

  it('allows a valid XP / gold progression write', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      ctx.firestore().collection('characters').doc(uid).update({ xp: 50, gold: 10 }),
    );
  });

  it('denies changing uid (immutable)', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(ctx.firestore().collection('characters').doc(uid).update({ uid: 'newuid' }));
  });

  it('denies changing class (immutable)', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('characters').doc(uid).update({ class: 'wizard' }),
    );
  });

  it('denies an XP jump exceeding the 2000-per-write delta cap', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    // Cap raised from 600 → 2000 to accommodate Dragon's Keep boss XP awards.
    // Character starts at xp: 0; writing xp: 2001 is a delta of 2001 > 2000.
    await assertFails(ctx.firestore().collection('characters').doc(uid).update({ xp: 2001 }));
  });

  it('denies a level jump exceeding the 5-per-write delta cap', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    // Character starts at level: 1; writing level: 7 is a delta of 6 > 5
    await assertFails(ctx.firestore().collection('characters').doc(uid).update({ level: 7 }));
  });

  it('allows setting a valid subclass at level >= 10', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .collection('characters')
        .doc(uid)
        .set({ ...validCharacter(uid), level: 10 });
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      ctx.firestore().collection('characters').doc(uid).update({ subclass: 'berserker' }),
    );
  });

  it('denies setting subclass when character is below level 10', async () => {
    // Character is at level 1 (set in beforeEach)
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('characters').doc(uid).update({ subclass: 'berserker' }),
    );
  });

  it('denies changing subclass once it has been set (one-way lock)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .collection('characters')
        .doc(uid)
        .set({ ...validCharacter(uid), level: 10, subclass: 'berserker' });
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('characters').doc(uid).update({ subclass: 'paladin' }),
    );
  });

  it('denies update by a different authenticated user', async () => {
    const ctx = testEnv.authenticatedContext('intruder');
    await assertFails(ctx.firestore().collection('characters').doc(uid).update({ xp: 10 }));
  });
});

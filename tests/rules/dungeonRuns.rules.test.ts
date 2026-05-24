import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeAll, afterAll, afterEach, describe, it } from 'vitest';

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

function validRunCreate(uid: string, overrides: Record<string, unknown> = {}) {
  return {
    uid,
    tierId: 'goblin-caves',
    weekSeed: 12345,
    status: 'active',
    currentRoom: 0,
    rooms: [],
    currentHp: 80,
    currentStamina: 40,
    currentMagic: 20,
    legendaryEligible: true,
    cumulativeXp: 0,
    cumulativeGold: 0,
    allDroppedItems: [],
    startedAt: Date.now(),
    completedAt: null,
    ...overrides,
  };
}

async function seedRun(uid: string, overrides: Record<string, unknown> = {}) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().collection('dungeonRuns').doc('run1').set(validRunCreate(uid, overrides));
  });
}

describe('dungeonRuns — read', () => {
  it('allows owner to read own run', async () => {
    const uid = 'user1';
    await seedRun(uid);
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(ctx.firestore().collection('dungeonRuns').doc('run1').get());
  });

  it('denies unauthenticated read', async () => {
    await seedRun('user1');
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(ctx.firestore().collection('dungeonRuns').doc('run1').get());
  });

  it('denies cross-user read', async () => {
    await seedRun('user1');
    const ctx = testEnv.authenticatedContext('attacker');
    await assertFails(ctx.firestore().collection('dungeonRuns').doc('run1').get());
  });
});

describe('dungeonRuns — create', () => {
  it('allows a valid run creation', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(ctx.firestore().collection('dungeonRuns').add(validRunCreate(uid)));
  });

  it('denies unauthenticated create', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(ctx.firestore().collection('dungeonRuns').add(validRunCreate('anyone')));
  });

  it('denies create when uid mismatches the authenticated user', async () => {
    const ctx = testEnv.authenticatedContext('realuser');
    await assertFails(
      ctx.firestore().collection('dungeonRuns').add(validRunCreate('differentuser')),
    );
  });

  it('allows all valid tiers', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    for (const tierId of ['goblin-caves', 'spider-lair', 'dark-sanctum', 'dragons-keep']) {
      await assertSucceeds(
        ctx.firestore().collection('dungeonRuns').add(validRunCreate(uid, { tierId })),
      );
    }
  });

  it('denies an invalid tierId', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('dungeonRuns')
        .add(validRunCreate(uid, { tierId: 'unknown-dungeon' })),
    );
  });

  it('denies create with non-active status', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('dungeonRuns')
        .add(validRunCreate(uid, { status: 'completed' })),
    );
  });

  it('denies create with currentRoom != 0', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('dungeonRuns')
        .add(validRunCreate(uid, { currentRoom: 1 })),
    );
  });

  it('denies create with non-zero cumulativeXp', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('dungeonRuns')
        .add(validRunCreate(uid, { cumulativeXp: 100 })),
    );
  });

  it('denies create with non-zero cumulativeGold', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('dungeonRuns')
        .add(validRunCreate(uid, { cumulativeGold: 50 })),
    );
  });

  it('denies create with completedAt already set', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('dungeonRuns')
        .add(validRunCreate(uid, { completedAt: Date.now() })),
    );
  });

  it('denies create with negative currentHp', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('dungeonRuns')
        .add(validRunCreate(uid, { currentHp: -1 })),
    );
  });
});

describe('dungeonRuns — update (progress)', () => {
  // For update tests, request.resource.data is the full merged document.
  // Unchanged fields keep their seeded values, so only changed fields need
  // to be included in the .update() payload.

  it('allows advancing a room with accumulated xp/gold', async () => {
    const uid = 'user1';
    await seedRun(uid);
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      ctx
        .firestore()
        .collection('dungeonRuns')
        .doc('run1')
        .update({ currentRoom: 1, cumulativeXp: 150, cumulativeGold: 75, currentHp: 60 }),
    );
  });

  it('allows completing a run (active → completed)', async () => {
    const uid = 'user1';
    await seedRun(uid);
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      ctx.firestore().collection('dungeonRuns').doc('run1').update({
        status: 'completed',
        completedAt: Date.now(),
        currentRoom: 5,
        cumulativeXp: 500,
        cumulativeGold: 200,
      }),
    );
  });

  it('allows abandoning a run (active → abandoned)', async () => {
    const uid = 'user1';
    await seedRun(uid);
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      ctx
        .firestore()
        .collection('dungeonRuns')
        .doc('run1')
        .update({ status: 'abandoned', completedAt: Date.now(), currentHp: 0 }),
    );
  });

  it('denies reverting a completed run back to active', async () => {
    const uid = 'user1';
    await seedRun(uid, { status: 'completed', completedAt: Date.now(), currentRoom: 5 });
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('dungeonRuns').doc('run1').update({ status: 'active' }),
    );
  });

  it('denies decreasing currentRoom', async () => {
    const uid = 'user1';
    await seedRun(uid, { currentRoom: 3 });
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('dungeonRuns').doc('run1').update({ currentRoom: 2 }),
    );
  });

  it('denies cumulativeXp exceeding 8000', async () => {
    const uid = 'user1';
    await seedRun(uid);
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('dungeonRuns').doc('run1').update({ cumulativeXp: 8001 }),
    );
  });

  it('denies cumulativeGold exceeding 10000', async () => {
    const uid = 'user1';
    await seedRun(uid);
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('dungeonRuns').doc('run1').update({ cumulativeGold: 10001 }),
    );
  });

  it('denies mutating the immutable tierId', async () => {
    const uid = 'user1';
    await seedRun(uid);
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('dungeonRuns').doc('run1').update({ tierId: 'dragons-keep' }),
    );
  });

  it('denies mutating the immutable weekSeed', async () => {
    const uid = 'user1';
    await seedRun(uid);
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('dungeonRuns').doc('run1').update({ weekSeed: 99999 }),
    );
  });

  it('denies cross-user update', async () => {
    await seedRun('user1');
    const ctx = testEnv.authenticatedContext('attacker');
    await assertFails(
      ctx.firestore().collection('dungeonRuns').doc('run1').update({ currentRoom: 1 }),
    );
  });

  it('denies unsetting claimed once it is true (write-once guard)', async () => {
    const uid = 'user1';
    await seedRun(uid, {
      claimed: true,
      status: 'completed',
      completedAt: Date.now(),
      currentRoom: 5,
      cumulativeXp: 500,
      cumulativeGold: 200,
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('dungeonRuns').doc('run1').update({ claimed: false }),
    );
  });
});

describe('dungeonRuns — delete (always denied)', () => {
  it('denies delete by the owner', async () => {
    const uid = 'user1';
    await seedRun(uid);
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(ctx.firestore().collection('dungeonRuns').doc('run1').delete());
  });

  it('denies delete by an unauthenticated user', async () => {
    await seedRun('user1');
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(ctx.firestore().collection('dungeonRuns').doc('run1').delete());
  });
});

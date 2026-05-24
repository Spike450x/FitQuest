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

function validCombatLog(uid: string, loggedAt = Date.now()) {
  return {
    uid,
    monsterId: 'goblin',
    monsterName: 'Goblin',
    xp: 120,
    gold: 30,
    loggedAt,
  };
}

describe('combatLogs — read', () => {
  it('allows owner to read own log', async () => {
    const uid = 'user1';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('combatLogs').doc('c1').set(validCombatLog(uid));
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(ctx.firestore().collection('combatLogs').doc('c1').get());
  });

  it('denies unauthenticated read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('combatLogs').doc('c1').set(validCombatLog('user1'));
    });
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(ctx.firestore().collection('combatLogs').doc('c1').get());
  });

  it('denies cross-user read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('combatLogs').doc('c1').set(validCombatLog('user1'));
    });
    const ctx = testEnv.authenticatedContext('attacker');
    await assertFails(ctx.firestore().collection('combatLogs').doc('c1').get());
  });
});

describe('combatLogs — create', () => {
  it('denies owner from creating a combat log (admin SDK only)', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(ctx.firestore().collection('combatLogs').add(validCombatLog(uid)));
  });

  it('denies create when unauthenticated', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(ctx.firestore().collection('combatLogs').add(validCombatLog('anyuid')));
  });

  it('denies create when uid mismatches the authenticated user', async () => {
    const ctx = testEnv.authenticatedContext('realuser');
    await assertFails(
      ctx.firestore().collection('combatLogs').add(validCombatLog('differentuser')),
    );
  });

  it('denies a log with a stale timestamp (backdated more than 2 minutes)', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    await assertFails(
      ctx.firestore().collection('combatLogs').add(validCombatLog(uid, fiveMinutesAgo)),
    );
  });

  it('denies a log with a future timestamp (more than 2 minutes ahead)', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    const fiveMinutesAhead = Date.now() + 5 * 60 * 1000;
    await assertFails(
      ctx.firestore().collection('combatLogs').add(validCombatLog(uid, fiveMinutesAhead)),
    );
  });

  it('denies a log with xp exceeding the cap (> 10 000)', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('combatLogs')
        .add({ ...validCombatLog(uid), xp: 10001 }),
    );
  });

  it('denies a log with gold exceeding the cap (> 10 000)', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('combatLogs')
        .add({ ...validCombatLog(uid), gold: 10001 }),
    );
  });

  it('denies a log with an empty monsterId', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('combatLogs')
        .add({ ...validCombatLog(uid), monsterId: '' }),
    );
  });
});

describe('combatLogs — update / delete (always denied)', () => {
  it('denies any update by the owner', async () => {
    const uid = 'user1';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('combatLogs').doc('c1').set(validCombatLog(uid));
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(ctx.firestore().collection('combatLogs').doc('c1').update({ xp: 999 }));
  });

  it('denies delete by the owner', async () => {
    const uid = 'user1';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('combatLogs').doc('c1').set(validCombatLog(uid));
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(ctx.firestore().collection('combatLogs').doc('c1').delete());
  });
});

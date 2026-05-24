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

function validCombatLog(uid: string) {
  return {
    uid,
    monsterId: 'goblin',
    monsterName: 'Goblin',
    xp: 120,
    gold: 30,
    loggedAt: Date.now(),
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

// combatLogs are written exclusively by the claimCombatVictory Cloud Function
// via the admin SDK (which bypasses these rules). No client write path exists —
// the rule is `if false` for all creates. These tests verify the blanket deny,
// not per-field validation (there is none).
describe('combatLogs — create (always denied — admin SDK only)', () => {
  it('denies an authenticated owner from creating a combat log', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(ctx.firestore().collection('combatLogs').add(validCombatLog(uid)));
  });

  it('denies an unauthenticated create', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(ctx.firestore().collection('combatLogs').add(validCombatLog('anyuid')));
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

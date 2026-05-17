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

function validLog(uid: string, loggedAt = Date.now()) {
  return {
    id: 'log-test-1',
    uid,
    type: 'workout',
    data: { duration: 30 },
    statGains: { strength: 1 },
    xpGained: 50,
    loggedAt,
    rewardEligible: true,
  };
}

describe('activityLogs — read / delete', () => {
  it('denies unauthenticated read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('activityLogs').doc('log1').set(validLog('user1'));
    });
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(ctx.firestore().collection('activityLogs').doc('log1').get());
  });

  it('allows owner to read own log', async () => {
    const uid = 'user1';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('activityLogs').doc('log1').set(validLog(uid));
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(ctx.firestore().collection('activityLogs').doc('log1').get());
  });

  it('denies cross-user read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('activityLogs').doc('log1').set(validLog('user1'));
    });
    const ctx = testEnv.authenticatedContext('attacker');
    await assertFails(ctx.firestore().collection('activityLogs').doc('log1').get());
  });

  it('allows owner to delete own log', async () => {
    const uid = 'user1';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('activityLogs').doc('log1').set(validLog(uid));
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(ctx.firestore().collection('activityLogs').doc('log1').delete());
  });

  it('denies cross-user delete', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('activityLogs').doc('log1').set(validLog('user1'));
    });
    const ctx = testEnv.authenticatedContext('attacker');
    await assertFails(ctx.firestore().collection('activityLogs').doc('log1').delete());
  });
});

describe('activityLogs — create (timestamp window)', () => {
  it('allows a log with a current timestamp', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(ctx.firestore().collection('activityLogs').add(validLog(uid)));
  });

  it('denies a log backdated more than 2 minutes (streak-gaming prevention)', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    await assertFails(
      ctx.firestore().collection('activityLogs').add(validLog(uid, fiveMinutesAgo)),
    );
  });

  it('denies a log with a timestamp more than 2 minutes in the future', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    const fiveMinutesAhead = Date.now() + 5 * 60 * 1000;
    await assertFails(
      ctx.firestore().collection('activityLogs').add(validLog(uid, fiveMinutesAhead)),
    );
  });

  it('denies create when unauthenticated', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(ctx.firestore().collection('activityLogs').add(validLog('anyuid')));
  });

  it('denies create when uid mismatches the authenticated user', async () => {
    const ctx = testEnv.authenticatedContext('realuser');
    await assertFails(ctx.firestore().collection('activityLogs').add(validLog('differentuser')));
  });

  it('denies a log with xpGained exceeding the cap (> 500)', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('activityLogs')
        .add({ ...validLog(uid), xpGained: 501 }),
    );
  });

  it('denies a log marked ineligible but carrying non-zero XP', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('activityLogs')
        .add({
          ...validLog(uid),
          rewardEligible: false,
          xpGained: 50, // must be 0 when ineligible
        }),
    );
  });

  it('allows an ineligible log with zero XP and empty statGains', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      ctx
        .firestore()
        .collection('activityLogs')
        .add({
          ...validLog(uid),
          rewardEligible: false,
          xpGained: 0,
          statGains: {},
        }),
    );
  });
});

describe('activityLogs — update (always denied)', () => {
  it('denies any update by the owner', async () => {
    const uid = 'user1';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('activityLogs').doc('log1').set(validLog(uid));
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('activityLogs').doc('log1').update({ xpGained: 999 }),
    );
  });
});

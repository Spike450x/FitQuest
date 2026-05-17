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

function validItem(uid: string) {
  return {
    uid,
    itemDefId: 'iron-sword',
    quantity: 1,
    equipped: false,
    acquiredAt: Date.now(),
  };
}

describe('inventory — read / delete', () => {
  it('denies unauthenticated read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('inventory').doc('item1').set(validItem('user1'));
    });
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(ctx.firestore().collection('inventory').doc('item1').get());
  });

  it('allows owner read', async () => {
    const uid = 'user1';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('inventory').doc('item1').set(validItem(uid));
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(ctx.firestore().collection('inventory').doc('item1').get());
  });

  it('denies cross-user read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('inventory').doc('item1').set(validItem('user1'));
    });
    const ctx = testEnv.authenticatedContext('attacker');
    await assertFails(ctx.firestore().collection('inventory').doc('item1').get());
  });

  it('allows owner to delete own item', async () => {
    const uid = 'user1';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('inventory').doc('item1').set(validItem(uid));
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(ctx.firestore().collection('inventory').doc('item1').delete());
  });
});

describe('inventory — create', () => {
  it('allows creating a valid item', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(ctx.firestore().collection('inventory').add(validItem(uid)));
  });

  it('denies creating an item with quantity = 0', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('inventory')
        .add({ ...validItem(uid), quantity: 0 }),
    );
  });

  it('denies creating an item with quantity > 999', async () => {
    const uid = 'user1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('inventory')
        .add({ ...validItem(uid), quantity: 1000 }),
    );
  });

  it('denies creating an item when uid mismatches authenticated user', async () => {
    const ctx = testEnv.authenticatedContext('realuser');
    await assertFails(ctx.firestore().collection('inventory').add(validItem('otheruser')));
  });
});

describe('inventory — update', () => {
  const uid = 'user1';

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('inventory').doc('item1').set(validItem(uid));
    });
  });

  it('allows updating quantity to a valid positive value', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      ctx.firestore().collection('inventory').doc('item1').update({ quantity: 5 }),
    );
  });

  it('allows toggling equipped state', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      ctx.firestore().collection('inventory').doc('item1').update({ equipped: true }),
    );
  });

  it('denies setting quantity to 0 (doc must be deleted instead)', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(ctx.firestore().collection('inventory').doc('item1').update({ quantity: 0 }));
  });

  it('denies changing itemDefId (immutable)', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx.firestore().collection('inventory').doc('item1').update({ itemDefId: 'golden-sword' }),
    );
  });

  it('denies changing acquiredAt (immutable)', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      ctx
        .firestore()
        .collection('inventory')
        .doc('item1')
        .update({ acquiredAt: Date.now() + 1000 }),
    );
  });

  it('denies update by a different authenticated user', async () => {
    const ctx = testEnv.authenticatedContext('intruder');
    await assertFails(
      ctx.firestore().collection('inventory').doc('item1').update({ quantity: 999 }),
    );
  });
});

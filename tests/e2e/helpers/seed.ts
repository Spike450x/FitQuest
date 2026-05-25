// Emulator seed helpers shared by Playwright globalSetup and flow tests.
//
// Two auth modes:
//   - `idToken`: per-user token from accounts:signInWithPassword. Used by
//     globalSetup so the initial character create exercises the production
//     `characters/{uid}` rules path (isSignedIn + isOwner + level == 1).
//   - `owner`: emulator-only admin shortcut. The Firestore emulator accepts
//     the literal Bearer string "owner" and bypasses rules entirely. Used by
//     `resetCharacter` / `clearSubcollection` so per-test resets don't have
//     to satisfy immutable-field rules or refresh stale idTokens.

export const PROJECT_ID = 'demo-fitness-rpg';
export const AUTH_EMU = 'http://127.0.0.1:9099';
export const FS_EMU = 'http://127.0.0.1:8080';
export const E2E_EMAIL = 'e2e@test.local';
export const E2E_PASSWORD = 'testpassword1';

export type AuthTokens = { localId: string; idToken: string };

const FS_BASE = `${FS_EMU}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function createTestUser(): Promise<AuthTokens> {
  const signUpResp = await fetch(
    `${AUTH_EMU}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: E2E_EMAIL,
        password: E2E_PASSWORD,
        returnSecureToken: true,
      }),
    },
  );

  if (signUpResp.ok) return (await signUpResp.json()) as AuthTokens;

  const signInResp = await fetch(
    `${AUTH_EMU}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: E2E_EMAIL,
        password: E2E_PASSWORD,
        returnSecureToken: true,
      }),
    },
  );
  if (!signInResp.ok) {
    throw new Error(`[seed] Failed to create or sign in test user: ${await signInResp.text()}`);
  }
  return (await signInResp.json()) as AuthTokens;
}

// Baseline level-1 warrior matching `characters/{uid}` create rules.
function baselineCharacterFields(uid: string) {
  return {
    uid: { stringValue: uid },
    name: { stringValue: 'TestHero' },
    class: { stringValue: 'warrior' },
    level: { integerValue: '1' },
    xp: { integerValue: '0' },
    xpToNextLevel: { integerValue: '100' },
    gold: { integerValue: '500' },
    createdAt: { integerValue: String(Date.now()) },
    pendingStatPoints: { integerValue: '0' },
    currentHp: { integerValue: '50' },
    currentStamina: { integerValue: '20' },
    currentMagic: { integerValue: '20' },
    stats: {
      mapValue: {
        fields: {
          strength: { integerValue: '5' },
          stamina: { integerValue: '4' },
          agility: { integerValue: '3' },
          health: { integerValue: '4' },
          wisdom: { integerValue: '2' },
          defense: { integerValue: '3' },
        },
      },
    },
    equippedGear: {
      mapValue: {
        fields: {
          weapon: { nullValue: null },
          armor: { nullValue: null },
          accessory: { nullValue: null },
        },
      },
    },
    masteryCounts: { mapValue: { fields: {} } },
    legendaryDryStreak: { mapValue: { fields: {} } },
    achievements: { arrayValue: { values: [] } },
    streakData: {
      mapValue: {
        fields: {
          currentStreak: { integerValue: '0' },
          longestStreak: { integerValue: '0' },
          lastLogDate: { stringValue: new Date().toISOString().slice(0, 10) },
          shields: { integerValue: '0' },
        },
      },
    },
  };
}

// Initial create — uses per-user idToken so the create satisfies production
// security rules. Idempotent: skips if the doc already exists.
export async function seedCharacter(tokens: AuthTokens): Promise<void> {
  const { localId: uid, idToken } = tokens;
  const docUrl = `${FS_BASE}/characters/${uid}`;
  const existing = await fetch(docUrl, { headers: authHeaders(idToken) });
  if (existing.ok) return;

  const resp = await fetch(docUrl, {
    method: 'PATCH',
    headers: authHeaders(idToken),
    body: JSON.stringify({ fields: baselineCharacterFields(uid) }),
  });
  if (!resp.ok) {
    throw new Error(`[seed] Failed to seed character: ${resp.status} ${await resp.text()}`);
  }
}

// Hard reset between flow tests. Uses the emulator `owner` admin token so
// we don't have to satisfy immutable-field rules. Also clears CF-written
// sub-collections that survive a character doc overwrite.
export async function resetCharacter(uid: string): Promise<void> {
  // Force-overwrite the character doc back to baseline.
  const charUrl = `${FS_BASE}/characters/${uid}`;
  const resp = await fetch(charUrl, {
    method: 'PATCH',
    headers: authHeaders('owner'),
    body: JSON.stringify({ fields: baselineCharacterFields(uid) }),
  });
  if (!resp.ok && resp.status !== 404) {
    throw new Error(`[seed] resetCharacter failed: ${resp.status} ${await resp.text()}`);
  }

  await Promise.all([
    clearCollectionForUid('activityLogs', uid),
    clearCollectionForUid('combatLogs', uid),
    clearCollectionForUid('dungeonRuns', uid),
    clearCollectionForUid('inventory', uid),
    clearCollectionForUid('activeQuests', uid),
  ]);
}

// Deletes every doc in `collection` whose `uid` field matches. Uses a
// runQuery filter and individual DELETEs via the owner token.
export async function clearCollectionForUid(collection: string, uid: string): Promise<void> {
  const queryUrl = `${FS_EMU}/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'uid' },
          op: 'EQUAL',
          value: { stringValue: uid },
        },
      },
    },
  };
  const queryResp = await fetch(queryUrl, {
    method: 'POST',
    headers: authHeaders('owner'),
    body: JSON.stringify(body),
  });
  if (!queryResp.ok) {
    // Collection may not exist yet — that's fine.
    if (queryResp.status === 404) return;
    throw new Error(`[seed] runQuery failed: ${queryResp.status} ${await queryResp.text()}`);
  }
  const rows = (await queryResp.json()) as Array<{ document?: { name: string } }>;
  const docNames = rows.map((r) => r.document?.name).filter((n): n is string => Boolean(n));
  await Promise.all(
    docNames.map((name) =>
      fetch(`${FS_EMU}/v1/${name}`, { method: 'DELETE', headers: authHeaders('owner') }),
    ),
  );
}

// Seeds a "completed but unclaimed" quest doc so quest-claim flow tests have
// a deterministic claim target. Field shape matches `ActiveQuest` type plus
// the in-app `progress` / `completedAt` / `claimedAt` markers.
export async function seedClaimableQuest(
  uid: string,
  questId: string,
  questDefId: string,
  rewards: { xp: number; gold: number },
): Promise<void> {
  const docUrl = `${FS_BASE}/activeQuests/${questId}`;
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000;
  const fields = {
    id: { stringValue: questId },
    uid: { stringValue: uid },
    questDefId: { stringValue: questDefId },
    progress: { integerValue: '1' },
    completedAt: { integerValue: String(now) },
    claimedAt: { nullValue: null },
    expiresAt: { integerValue: String(expiresAt) },
    rewards: {
      mapValue: {
        fields: {
          xp: { integerValue: String(rewards.xp) },
          gold: { integerValue: String(rewards.gold) },
        },
      },
    },
  };
  const resp = await fetch(docUrl, {
    method: 'PATCH',
    headers: authHeaders('owner'),
    body: JSON.stringify({ fields }),
  });
  if (!resp.ok) {
    throw new Error(`[seed] seedClaimableQuest failed: ${resp.status} ${await resp.text()}`);
  }
}

// Equips a weapon end-to-end: writes the inventory doc AND patches the
// character's equippedGear.weapon to the itemDefId. Combat code reads
// equippedGear.weapon directly (see totalGearBonuses in combat.ts).
export async function seedEquippedWeapon(uid: string, itemDefId: string): Promise<void> {
  await seedInventoryItem(uid, itemDefId, { equipped: true });
  const docUrl = `${FS_BASE}/characters/${uid}?updateMask.fieldPaths=equippedGear`;
  const fields = {
    equippedGear: {
      mapValue: {
        fields: {
          weapon: { stringValue: itemDefId },
          armor: { nullValue: null },
          accessory: { nullValue: null },
        },
      },
    },
  };
  const resp = await fetch(docUrl, {
    method: 'PATCH',
    headers: authHeaders('owner'),
    body: JSON.stringify({ fields }),
  });
  if (!resp.ok) {
    throw new Error(`[seed] seedEquippedWeapon failed: ${resp.status} ${await resp.text()}`);
  }
}

// Seeds an unequipped inventory item — used by combat tests that need a
// usable weapon, and by reset paths that need a known baseline inventory.
export async function seedInventoryItem(
  uid: string,
  itemDefId: string,
  opts: { equipped?: boolean } = {},
): Promise<void> {
  const docUrl = `${FS_BASE}/inventory/${uid}_${itemDefId}`;
  const fields = {
    uid: { stringValue: uid },
    itemDefId: { stringValue: itemDefId },
    quantity: { integerValue: '1' },
    equipped: { booleanValue: opts.equipped ?? false },
    acquiredAt: { integerValue: String(Date.now()) },
  };
  const resp = await fetch(docUrl, {
    method: 'PATCH',
    headers: authHeaders('owner'),
    body: JSON.stringify({ fields }),
  });
  if (!resp.ok) {
    throw new Error(`[seed] seedInventoryItem failed: ${resp.status} ${await resp.text()}`);
  }
}

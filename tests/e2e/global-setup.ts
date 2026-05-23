import { chromium, type FullConfig } from '@playwright/test';

const AUTH_FILE = 'tests/e2e/.auth/user.json';
const E2E_EMAIL = 'e2e@test.local';
const E2E_PASSWORD = 'testpassword1';
const PROJECT_ID = 'demo-fitness-rpg';
const AUTH_EMU = 'http://127.0.0.1:9099';
const FS_EMU = 'http://127.0.0.1:8080';

type AuthEmuTokens = { localId: string; idToken: string };

export default async function globalSetup(_config: FullConfig) {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR !== 'true') {
    console.log('[global-setup] Emulator not enabled — skipping authenticated setup');
    return;
  }

  // 1. Create test user via Auth emulator REST API. The emulator accepts any
  // API key; 'fake-key' is the conventional placeholder.
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

  let tokens: AuthEmuTokens;
  if (!signUpResp.ok) {
    // User may already exist from a previous run — try to sign in instead.
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
      const body = await signInResp.text();
      throw new Error(`[global-setup] Failed to create or sign in test user: ${body}`);
    }
    tokens = (await signInResp.json()) as AuthEmuTokens;
  } else {
    tokens = (await signUpResp.json()) as AuthEmuTokens;
  }

  await seedCharacter(tokens);

  // 2. Log in via browser to capture storage state. The Playwright webServer
  // must be running at this point (it starts before globalSetup).
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login');
  await page.locator('input#email').fill(E2E_EMAIL);
  await page.locator('input#password').fill(E2E_PASSWORD);
  await page.locator('button[type=submit]').click();

  // Redirect may go to /dashboard (returning user) or /character-creation
  // (first login). Wait for either — both mean auth succeeded.
  await page.waitForURL(/\/(dashboard|character-creation)/, { timeout: 20_000 });

  await context.storageState({ path: AUTH_FILE });
  await browser.close();
  console.log('[global-setup] Auth state saved to', AUTH_FILE);
}

// Firestore emulator document seed. Goes through the REST API authenticated
// with the user's emulator idToken so the production `characters/{uid}` rules
// (isSignedIn + isOwner + level == 1 on create) pass without any test-only
// rule relaxation. Idempotent: re-runs against an already-seeded user simply
// no-op since the doc exists and we never PATCH again.
async function seedCharacter({ localId: uid, idToken }: AuthEmuTokens): Promise<void> {
  const docUrl = `${FS_EMU}/v1/projects/${PROJECT_ID}/databases/(default)/documents/characters/${uid}`;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  };

  // Skip if the character already exists — keeps re-runs clean and avoids
  // running into the immutable-fields update rules (uid/class/createdAt).
  const existingResp = await fetch(docUrl, { headers: authHeaders });
  if (existingResp.ok) {
    console.log('[global-setup] Character already seeded for', uid);
    return;
  }

  // Create path: rules require level == 1, all stat/gear fields present, and
  // no `subclass` field. Stats use the warrior starter spread.
  const fields = {
    uid: { stringValue: uid },
    name: { stringValue: 'TestHero' },
    class: { stringValue: 'warrior' },
    level: { integerValue: '1' },
    xp: { integerValue: '0' },
    xpToNextLevel: { integerValue: '100' },
    gold: { integerValue: '50' },
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
          lastLogDate: { stringValue: '' },
          shields: { integerValue: '0' },
        },
      },
    },
  };

  const resp = await fetch(docUrl, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ fields }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`[global-setup] Failed to seed character: ${resp.status} ${body}`);
  }
}

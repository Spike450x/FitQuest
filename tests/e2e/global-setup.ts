import { chromium, type FullConfig } from '@playwright/test';

const AUTH_FILE = 'tests/e2e/.auth/user.json';
const E2E_EMAIL = 'e2e@test.local';
const E2E_PASSWORD = 'testpassword1';
const PROJECT_ID = 'demo-fitness-rpg';
const AUTH_EMU = 'http://127.0.0.1:9099';
const FS_EMU = 'http://127.0.0.1:8080';

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

  let uid: string;
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
    if (!signInResp.ok) throw new Error('[global-setup] Failed to create or sign in test user');
    ({ localId: uid } = (await signInResp.json()) as { localId: string });
  } else {
    ({ localId: uid } = (await signUpResp.json()) as { localId: string });
  }

  await seedCharacter(uid);

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

// Firestore emulator document seed. Uses the Firestore REST API (no SDK
// needed — avoids import issues in setup context). Field encoding follows the
// Firestore REST API typed-value format.
async function seedCharacter(uid: string): Promise<void> {
  const url = `${FS_EMU}/v1/projects/${PROJECT_ID}/databases/(default)/documents/characters/${uid}`;

  const fields = {
    uid: { stringValue: uid },
    name: { stringValue: 'TestHero' },
    class: { stringValue: 'warrior' },
    level: { integerValue: '5' },
    xp: { integerValue: '400' },
    xpToNextLevel: { integerValue: '500' },
    gold: { integerValue: '250' },
    createdAt: { integerValue: String(Date.now()) },
    pendingStatPoints: { integerValue: '0' },
    currentHp: { integerValue: '100' },
    currentStamina: { integerValue: '100' },
    currentMagic: { integerValue: '100' },
    stats: {
      mapValue: {
        fields: {
          strength: { integerValue: '8' },
          stamina: { integerValue: '7' },
          agility: { integerValue: '6' },
          health: { integerValue: '7' },
          wisdom: { integerValue: '5' },
          defense: { integerValue: '6' },
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
          currentStreak: { integerValue: '3' },
          longestStreak: { integerValue: '7' },
          lastLogDate: { stringValue: new Date().toISOString().slice(0, 10) },
          shields: { integerValue: '1' },
        },
      },
    },
  };

  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`[global-setup] Failed to seed character: ${resp.status} ${body}`);
  }
}

import { chromium, type FullConfig } from '@playwright/test';
import { createTestUser, seedCharacter, E2E_EMAIL, E2E_PASSWORD } from './helpers/seed';

const AUTH_FILE = 'tests/e2e/.auth/user.json';

export default async function globalSetup(_config: FullConfig) {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR !== 'true') {
    console.log('[global-setup] Emulator not enabled — skipping authenticated setup');
    return;
  }

  const tokens = await createTestUser();
  await seedCharacter(tokens);

  // Browser login to capture storageState. Playwright's webServer is up by this
  // point (it boots before globalSetup runs).
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login');
  await page.locator('input#email').fill(E2E_EMAIL);
  await page.locator('input#password').fill(E2E_PASSWORD);
  await page.locator('button[type=submit]').click();

  // First login may redirect to /character-creation; returning users to /dashboard.
  await page.waitForURL(/\/(dashboard|character-creation)/, { timeout: 20_000 });

  await context.storageState({ path: AUTH_FILE });
  await browser.close();
  console.log('[global-setup] Auth state saved to', AUTH_FILE);
}

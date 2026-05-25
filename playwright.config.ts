import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  // JSON reporter feeds .github/actions/discord-notify/notify.mjs.
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  // Runs once before all tests: creates the emulator test user + seeds Firestore.
  // No-ops when NEXT_PUBLIC_USE_FIREBASE_EMULATOR is not 'true'.
  globalSetup: './tests/e2e/global-setup.ts',
  projects: [
    // Unauthenticated — no stored auth needed
    {
      name: 'unauthenticated',
      testMatch: ['**/smoke.test.ts', '**/dark-mode.test.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    // Authenticated structure smoke — fast route-renders-correctly checks.
    {
      name: 'authenticated',
      testMatch: '**/authenticated.test.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
    },
    // Authenticated flow tests — real user actions (log workout, claim quest,
    // win a fight, buy+equip, enter dungeon). Slower; relies on Cloud Functions
    // emulator. RNG is seeded inside each flow test via helpers/rng.ts.
    {
      name: 'authenticated-flows',
      testMatch: 'flows/**/*.test.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // NOTE: NEXT_PUBLIC_* vars are inlined at build time. We use `npm run dev`
    // here (runtime env) so changing NEXT_PUBLIC_USE_FIREBASE_EMULATOR between
    // runs works. Switching to `npm start` would freeze it at the build value.
    env: {
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'e2e-test-key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'demo.firebaseapp.com',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID:
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'demo-fitness-rpg',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'demo.appspot.com',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '123456789',
      NEXT_PUBLIC_FIREBASE_APP_ID:
        process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:123456789:web:abcdef',
      NEXT_PUBLIC_USE_FIREBASE_EMULATOR: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR ?? 'false',
    },
  },
});

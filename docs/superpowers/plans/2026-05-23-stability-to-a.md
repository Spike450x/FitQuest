# Stability to A — FitQuest Hardening Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise every stability scorecard category to grade A by closing four gaps: offline write UX, authenticated E2E coverage, production-accurate vulnerability auditing, and bundle size analysis + silhouette code-splitting.

**Architecture:** Each task group is fully independent — they share no files and can be executed in any order. Groups 1 and 6 are tiny (< 1 hour). Group 2 (E2E) is the largest effort: it adds Firebase Auth + Firestore emulator wiring to the Next.js dev server, a Playwright global-setup seed script, and authenticated smoke tests for all 9 game routes. Group 3 (bundle) splits the 55-item silhouette map into its own file to enable route-level code splitting.

**Tech Stack:** Next.js 15 App Router · TypeScript · Firebase Auth + Firestore emulators · Playwright · `@next/bundle-analyzer` · Node.js script (`scripts/audit-check.mjs`)

---

## Context every agent must read first

- **Stack:** Next.js 15, React 18, TypeScript 5, Tailwind, Firebase (Auth + Firestore), Zustand
- **Commands:** `npm test` (vitest), `npm run typecheck` (tsc --noEmit), `npm run lint` (ESLint), `npm run build` (Next.js prod build), `npx playwright test` (E2E)
- **Pre-commit hook** runs typecheck + vitest on every commit — all must pass before committing
- **Branch rule:** never push directly to `master`. Open a PR per task group, squash-merge through GitHub
- **Firebase project:** `fitness-rpg-claude` (production). E2E tests use the local emulator with project ID `demo-fitness-rpg` — no production data is touched
- **Middleware** (`src/middleware.ts:10`): only checks `Boolean(request.cookies.get('__session')?.value)` — any non-empty string passes the auth gate
- **Character type** (`src/types/index.ts:38-85`): required fields are `uid`, `name`, `class`, `level`, `xp`, `xpToNextLevel`, `gold`, `stats`, `equippedGear`, `createdAt`
- **firebase.json** already configures Auth emulator on port 9099 and Firestore on port 8080
- **CI** (`.github/workflows/ci.yml`): single `check` job; E2E step passes placeholder Firebase env vars

---

## File Map

| Status | Path                                      | Change                                                                       |
| ------ | ----------------------------------------- | ---------------------------------------------------------------------------- |
| Modify | `src/components/ui/OfflineBanner.tsx`     | Update sync message                                                          |
| Modify | `src/lib/firebase.ts`                     | Add emulator connection when `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`        |
| Create | `tests/e2e/global-setup.ts`               | Seed emulator + save Playwright storageState                                 |
| Create | `tests/e2e/.auth/.gitkeep`                | Placeholder so `.auth/` directory exists in repo                             |
| Modify | `.gitignore`                              | Ignore `tests/e2e/.auth/user.json` (contains auth tokens)                    |
| Create | `tests/e2e/authenticated.test.ts`         | Smoke tests for all 9 authenticated game routes                              |
| Modify | `playwright.config.ts`                    | Add `globalSetup`, add `authenticated` project with `storageState`           |
| Modify | `.github/workflows/ci.yml`                | Start emulators before E2E; set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`     |
| Create | `scripts/audit-check.mjs`                 | Fail CI only on high/critical production-dep vulns                           |
| Modify | `.github/workflows/ci.yml`                | Replace `npm audit` step with `node scripts/audit-check.mjs`                 |
| Modify | `docs/SECURITY-SETUP.md`                  | Document known firebase-tools transitive vulns                               |
| Modify | `package.json`                            | Add `"analyze"` script                                                       |
| Modify | `next.config.mjs`                         | Wrap config with `@next/bundle-analyzer`                                     |
| Create | `src/components/art/item-silhouettes.tsx` | Extract all 55 item silhouette functions + ITEM_SILHOUETTES map              |
| Modify | `src/components/art/silhouettes.tsx`      | Remove item silhouette functions; re-export ITEM_SILHOUETTES from new file   |
| Modify | `src/components/art/EntityArt.tsx`        | Import ITEM_SILHOUETTES from `./item-silhouettes` instead of `./silhouettes` |

---

## Group 1 — Offline UX (B+ → A)

### Task 1: Update OfflineBanner pending-write message

**Files:**

- Modify: `src/components/ui/OfflineBanner.tsx`

The banner currently says "changes may not save until you reconnect." Firestore IndexedDB persistence (`persistentLocalCache`) queues writes and syncs them automatically on reconnect — the message should reflect that accurately.

- [ ] **Step 1: Update the banner text**

Replace the full file content:

```tsx
'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Renders a sticky top banner when the browser reports no network connection.
 * Firestore's offline cache queues writes and syncs them automatically on reconnect.
 * Disappears automatically when connectivity is restored.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-center justify-center gap-2 bg-amber-500 text-white text-sm font-medium py-2 px-4 shadow-sm"
    >
      <span aria-hidden="true">📡</span>
      You&apos;re offline — queued changes will sync automatically when you reconnect.
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/OfflineBanner.tsx
git commit -m "Fix OfflineBanner to accurately describe automatic sync on reconnect"
```

---

## Group 2 — Authenticated E2E Coverage (B → A)

Four tasks. Execute in order — each builds on the previous.

### Task 2: Add Firebase emulator support to SDK init

**Files:**

- Modify: `src/lib/firebase.ts`

When the env var `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`, the SDK must connect to the local emulators instead of production Firebase. IndexedDB persistence is skipped in emulator mode (emulator data is ephemeral; persistence would cause stale reads between test runs).

- [ ] **Step 1: Read the current file**

Read `src/lib/firebase.ts` to confirm its current content before editing. The expected content is the 43-line file with `buildDb()`, SSR guard, and hot-reload guard.

- [ ] **Step 2: Replace the file with emulator support**

```ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

// Prevent re-initializing on hot reload in development
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const functions = getFunctions(app);

// Enable IndexedDB persistence so reads are served from the local cache when
// offline or on a slow connection (PWA offline support).
// Skipped in emulator mode — emulator data is ephemeral and persistence
// causes stale reads between test runs.
// SSR / Node (vitest): window is undefined — fall back to memory-only instance.
// Hot reload: initializeFirestore throws if already called — catch and fall through.
function buildDb() {
  if (typeof window === 'undefined') return getFirestore(app);
  if (USE_EMULATOR) return getFirestore(app);
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return getFirestore(app);
  }
}
export const db = buildDb();

// Connect to local emulators when NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true.
// Guards prevent double-connection on hot reload.
if (USE_EMULATOR && typeof window !== 'undefined') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  } catch {
    // already connected on hot reload
  }
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  } catch {
    // already connected on hot reload
  }
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 4: Run unit tests**

```bash
npm test
```

Expected: all 438 tests pass (unit tests don't use the browser Firebase SDK)

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebase.ts
git commit -m "Add Firebase emulator support behind NEXT_PUBLIC_USE_FIREBASE_EMULATOR flag"
```

---

### Task 3: Playwright global setup — seed emulator and save auth state

**Files:**

- Create: `tests/e2e/global-setup.ts`
- Create: `tests/e2e/.auth/.gitkeep`
- Modify: `.gitignore`

The global setup runs once before all Playwright tests. It:

1. Creates a test user in the Auth emulator via REST API
2. Seeds a minimal character document in the Firestore emulator
3. Opens a Playwright browser, logs in via the running Next.js dev server, and saves the resulting storage state (cookies + localStorage) so authenticated tests can reuse it without re-logging in

The emulators must already be running when globalSetup executes — they are started by CI (Task 5) or manually by the developer.

- [ ] **Step 1: Add `.auth/` to .gitignore**

Read `.gitignore` first, then append:

```
# Playwright auth state (contains real tokens from emulator — never commit)
tests/e2e/.auth/user.json
```

- [ ] **Step 2: Create the `.auth/` directory placeholder**

Create an empty file at `tests/e2e/.auth/.gitkeep` so the directory exists in the repo. Content: empty string.

- [ ] **Step 3: Create `tests/e2e/global-setup.ts`**

```ts
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

  // ── 1. Create test user via Auth emulator REST API ──────────────────────────
  // The emulator accepts any API key; 'fake-key' is the conventional placeholder.
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

  if (!signUpResp.ok) {
    // User may already exist from a previous run — try to sign in instead
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
    const { localId: uid } = (await signInResp.json()) as { localId: string };
    await seedCharacter(uid);
  } else {
    const { localId: uid } = (await signUpResp.json()) as { localId: string };
    await seedCharacter(uid);
  }

  // ── 2. Log in via browser to capture storage state ──────────────────────────
  // The Playwright webServer must be running at this point (it starts before globalSetup).
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login');
  await page.locator('input#email').fill(E2E_EMAIL);
  await page.locator('input#password').fill(E2E_PASSWORD);
  await page.locator('button[type=submit]').click();

  // Redirect may go to /dashboard (returning user) or /character-creation (first login).
  // Wait for either — both mean auth succeeded.
  await page.waitForURL(/\/(dashboard|character-creation)/, { timeout: 20_000 });

  await context.storageState({ path: AUTH_FILE });
  await browser.close();
  console.log('[global-setup] Auth state saved to', AUTH_FILE);
}

// ── Firestore emulator document seed ──────────────────────────────────────────
// Uses the Firestore REST API (no SDK needed — avoids import issues in setup context).
// Field encoding follows the Firestore REST API typed-value format.
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
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/global-setup.ts tests/e2e/.auth/.gitkeep .gitignore
git commit -m "Add Playwright global setup: seed emulator and save auth storage state"
```

---

### Task 4: Authenticated game-screen smoke tests

**Files:**

- Create: `tests/e2e/authenticated.test.ts`

These tests use the storage state saved by the global setup. Each test verifies that a game screen renders its heading and primary content container without crashing. They are intentionally shallow — they detect 500 errors and broken layouts, not data correctness (unit tests own that).

- [ ] **Step 1: Create `tests/e2e/authenticated.test.ts`**

```ts
import { test, expect } from '@playwright/test';

// Storage state is applied at the project level in playwright.config.ts.
// The __session cookie + Firebase localStorage auth are set before each test,
// so the middleware allows access and Firebase Auth reports a signed-in user.

test.describe('authenticated game screens — structure smoke tests', () => {
  test('dashboard renders heading and XP progress bar', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({
      timeout: 10_000,
    });
    // XPBar renders a progressbar role element
    await expect(page.getByRole('progressbar').first()).toBeVisible({ timeout: 10_000 });
  });

  test('shop renders heading and tab list', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.getByRole('heading', { name: /shop/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('tablist', { name: /shop categories/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('inventory renders heading', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.getByRole('heading', { name: /inventory/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('quests renders heading', async ({ page }) => {
    await page.goto('/quests');
    await expect(page.getByRole('heading', { name: /quests/i })).toBeVisible({ timeout: 10_000 });
  });

  test('character renders heading', async ({ page }) => {
    await page.goto('/character');
    await expect(page.getByRole('heading', { name: /character/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('combat renders heading', async ({ page }) => {
    await page.goto('/combat');
    await expect(page.getByRole('heading', { name: /combat/i })).toBeVisible({ timeout: 10_000 });
  });

  test('stats renders heading', async ({ page }) => {
    await page.goto('/stats');
    await expect(page.getByRole('heading', { name: /stats/i })).toBeVisible({ timeout: 10_000 });
  });

  test('profile renders heading', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible({ timeout: 10_000 });
  });

  test('dungeons renders heading', async ({ page }) => {
    await page.goto('/combat/dungeons');
    await expect(page.getByRole('heading', { name: /dungeon/i })).toBeVisible({ timeout: 10_000 });
  });

  test('authenticated pages do not redirect to /login', async ({ page }) => {
    for (const route of [
      '/dashboard',
      '/shop',
      '/inventory',
      '/quests',
      '/character',
      '/combat',
      '/stats',
      '/profile',
    ]) {
      await page.goto(route);
      await expect(page).not.toHaveURL(/\/login/);
    }
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/authenticated.test.ts
git commit -m "Add authenticated E2E smoke tests for all 9 game routes"
```

---

### Task 5: Update Playwright config and CI workflow

**Files:**

- Modify: `playwright.config.ts`
- Modify: `.github/workflows/ci.yml`

The Playwright config needs a `globalSetup` pointer and a second project that applies the saved `storageState`. The CI workflow needs to start the Firebase emulators (auth + firestore) before the E2E step and pass `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`.

- [ ] **Step 1: Replace `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  // Runs once before all tests: creates the emulator test user + seeds Firestore.
  // No-ops when NEXT_PUBLIC_USE_FIREBASE_EMULATOR is not 'true'.
  globalSetup: './tests/e2e/global-setup.ts',
  projects: [
    // ── Unauthenticated — no stored auth needed ────────────────────────────────
    {
      name: 'unauthenticated',
      testMatch: ['**/smoke.test.ts', '**/dark-mode.test.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    // ── Authenticated — applies saved emulator auth state ──────────────────────
    // Only runs when NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true (global setup must
    // have populated tests/e2e/.auth/user.json first).
    {
      name: 'authenticated',
      testMatch: '**/authenticated.test.ts',
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
      // Passed through to the Next.js dev server so firebase.ts connects to emulators
      NEXT_PUBLIC_USE_FIREBASE_EMULATOR: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR ?? 'false',
    },
  },
});
```

- [ ] **Step 2: Update `.github/workflows/ci.yml` — add emulator start before E2E**

Find the existing `E2E smoke tests` step in `.github/workflows/ci.yml` and replace the block from `- name: Install Playwright browsers` through the end of the `E2E smoke tests` step with:

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Start Firebase emulators for E2E (auth + firestore)
  run: |
    npx firebase emulators:start \
      --only auth,firestore \
      --project demo-fitness-rpg &
    # Poll until both emulators respond (max 60 s)
    for i in $(seq 1 30); do
      curl -sf http://127.0.0.1:9099 > /dev/null 2>&1 \
        && curl -sf http://127.0.0.1:8080 > /dev/null 2>&1 \
        && echo "Emulators ready" && break
      sleep 2
    done

- name: E2E tests (unauthenticated + authenticated)
  run: npx playwright test
  env:
    NEXT_PUBLIC_USE_FIREBASE_EMULATOR: 'true'
    NEXT_PUBLIC_FIREBASE_API_KEY: e2e-placeholder
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: demo.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: demo-fitness-rpg
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: demo.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000'
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:e2etest'
```

- [ ] **Step 3: Run typecheck to verify playwright.config.ts is valid**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 4: Local smoke test (requires emulators running)**

Start the emulators in a separate terminal, then verify the new authenticated project runs locally:

```bash
# Terminal 1: start emulators
npx firebase emulators:start --only auth,firestore --project demo-fitness-rpg

# Terminal 2: run authenticated tests only
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true npx playwright test --project=authenticated
```

Expected: all 10 authenticated tests pass

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts .github/workflows/ci.yml
git commit -m "Wire authenticated Playwright project and CI emulator startup for E2E"
```

---

## Group 3 — Production-accurate Vulnerability Audit (B- → A)

### Task 6: Replace blanket npm audit with a production-dep-only check

**Files:**

- Create: `scripts/audit-check.mjs`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/SECURITY-SETUP.md`

All 7 current moderate vulnerabilities live inside `firebase-tools` transitive dependencies (`uuid` via `gaxios` / `teeny-request` / `retry-request`). `firebase-tools` is a devDependency used only for deployment — none of these paths reach the production JS bundle served to users. The raw `npm audit --audit-level=high` step is already `continue-on-error: true` for this reason, but it's misleading — it flags issues that can never hurt users and hides genuine signal.

This task replaces it with a script that fails CI immediately on any high/critical vulnerability in a **production** dependency, logs moderate devDep issues as warnings, and never masks new production vulnerabilities.

- [ ] **Step 1: Create `scripts/audit-check.mjs`**

```mjs
#!/usr/bin/env node
/**
 * Production-only vulnerability check.
 *
 * Fails with exit code 1 if any HIGH or CRITICAL vulnerability affects a
 * production dependency (not devDependencies).
 *
 * Moderate vulnerabilities in devDependencies are logged as warnings and do
 * not block the build. The current known case is uuid inside the firebase-tools
 * transitive chain — a devDep deployment tool with no runtime exposure.
 * See docs/SECURITY-SETUP.md § Known devDependency vulnerabilities.
 */

import { execSync } from 'child_process';

const FAIL_SEVERITIES = new Set(['critical', 'high']);

let audit;
try {
  const stdout = execSync('npm audit --json', { encoding: 'utf8' });
  audit = JSON.parse(stdout);
} catch (err) {
  // npm audit exits non-zero when vulnerabilities exist; capture stdout from the error.
  try {
    audit = JSON.parse(/** @type {any} */ (err).stdout);
  } catch {
    console.error('Failed to parse npm audit output. Run "npm audit" manually.');
    process.exit(1);
  }
}

const vulns = Object.entries(audit.vulnerabilities ?? {});

const prodBlockers = vulns.filter(([, v]) => !v.dev && FAIL_SEVERITIES.has(v.severity));

const devWarnings = vulns.filter(([, v]) => v.dev || !FAIL_SEVERITIES.has(v.severity));

if (devWarnings.length > 0) {
  console.warn(
    `\n⚠️  ${devWarnings.length} moderate/low vulnerability(ies) in devDependencies` +
      ` — not blocking (see docs/SECURITY-SETUP.md § Known devDependency vulnerabilities)\n`,
  );
  devWarnings.forEach(([name, v]) => {
    const via = Array.isArray(v.via)
      ? v.via.map((x) => (typeof x === 'string' ? x : x.title)).join(', ')
      : '';
    console.warn(`  [${v.severity}] ${name}${via ? ` — via ${via}` : ''}`);
  });
}

if (prodBlockers.length > 0) {
  console.error(`\n❌ ${prodBlockers.length} high/critical production vulnerability(ies):\n`);
  prodBlockers.forEach(([name, v]) => {
    const via = Array.isArray(v.via)
      ? v.via.map((x) => (typeof x === 'string' ? x : x.title)).join(', ')
      : '';
    console.error(`  [${v.severity.toUpperCase()}] ${name}${via ? ` — via ${via}` : ''}`);
  });
  console.error('\nRun "npm audit" for details and fix before merging.\n');
  process.exit(1);
}

console.log('\n✅ No high/critical production vulnerabilities found.\n');
```

- [ ] **Step 2: Verify the script runs correctly**

```bash
node scripts/audit-check.mjs
```

Expected output (approximately):

```
⚠️  7 moderate/low vulnerability(ies) in devDependencies — not blocking ...
  [moderate] gaxios — via uuid
  [moderate] google-gax — via ...
  ...

✅ No high/critical production vulnerabilities found.
```

Expected exit code: `0`

- [ ] **Step 3: Update CI — replace the two `npm audit` steps with one script call**

In `.github/workflows/ci.yml`, find and replace both audit steps:

```yaml
# Non-blocking audit so a freshly-published advisory surfaces in PR
# checks without immediately blocking the merge. If a high-severity
# vuln appears, follow the workflow in docs/SECURITY-SETUP.md § 8.
- name: Audit dependencies (root, non-blocking)
  continue-on-error: true
  run: npm audit --audit-level=high

- name: Audit dependencies (functions, non-blocking)
  continue-on-error: true
  run: cd functions && npm audit --audit-level=high
```

with:

```yaml
# Fails immediately on high/critical production-dep vulnerabilities.
# Moderate devDependency vulns (e.g., firebase-tools transitive chain) are
# logged as warnings. See docs/SECURITY-SETUP.md § Known devDependency vulnerabilities.
- name: Audit production dependencies
  run: node scripts/audit-check.mjs

- name: Audit Cloud Functions production dependencies
  run: cd functions && node ../scripts/audit-check.mjs
```

- [ ] **Step 4: Add known-issues section to `docs/SECURITY-SETUP.md`**

Append the following section to the end of `docs/SECURITY-SETUP.md`:

```markdown
---

## Known devDependency Vulnerabilities

These vulnerabilities are flagged by `npm audit` but **cannot be fixed without breaking changes** and **do not affect the production runtime bundle**. They are logged as warnings by `scripts/audit-check.mjs` and do not block CI.

| Package                | Severity | Via                      | Status                                                           |
| ---------------------- | -------- | ------------------------ | ---------------------------------------------------------------- |
| `gaxios`               | moderate | `uuid < 9`               | Transitive dep of `firebase-tools` (devDep). Not in prod bundle. |
| `google-gax`           | moderate | `retry-request` → `uuid` | Same chain.                                                      |
| `@google-cloud/pubsub` | moderate | `google-gax`             | Same chain.                                                      |
| `teeny-request`        | moderate | `uuid < 9`               | Same chain.                                                      |
| `retry-request`        | moderate | `teeny-request`          | Same chain.                                                      |

**Root cause:** `firebase-tools` requires `uuid@^3` or `^7` in its transitive chain. The `uuid` advisory covers versions < 9. `npm audit fix --force` would downgrade `firebase-tools` to a breaking version.

**Resolution path:** Watch [firebase-tools releases](https://github.com/firebase/firebase-tools/releases). When a release notes a `uuid` bump past v9 in its transitive deps, run `npm update firebase-tools` on a branch and re-run `npm audit`.

**Last reviewed:** 2026-05-23
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add scripts/audit-check.mjs .github/workflows/ci.yml docs/SECURITY-SETUP.md
git commit -m "Replace blanket npm audit with production-dep-only vulnerability check"
```

---

## Group 4 — Bundle Analysis + Silhouette Code-Split (B → A)

Two tasks. Execute Task 7 first (analysis), then Task 8 (the split, which the analysis confirms is needed).

### Task 7: Install bundle analyzer and establish baseline

**Files:**

- Modify: `package.json`
- Modify: `next.config.mjs`

`@next/bundle-analyzer` wraps the Next.js build and opens an interactive treemap in the browser showing exactly which modules end up in which chunks. This makes the silhouette question answerable with data.

- [ ] **Step 1: Install the package**

```bash
npm install --save-dev @next/bundle-analyzer
```

- [ ] **Step 2: Update `next.config.mjs`**

Read the current file first. Then replace the final export block:

```mjs
// Wrap with bundle analyzer. Only active when ANALYZE=true — zero overhead in
// normal dev and production builds.
import bundleAnalyzer from '@next/bundle-analyzer';
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

export default withBundleAnalyzer(nextConfig);
```

The full updated file (replace everything after the `nextConfig` const closing brace):

```mjs
/** @type {import('next').NextConfig} */
import bundleAnalyzer from '@next/bundle-analyzer';

// ... (keep all existing FIREBASE_CONNECT, cspDirectives, securityHeaders, nextConfig as-is)

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
export default withBundleAnalyzer(nextConfig);
```

To be concrete — the only changes to `next.config.mjs` are:

1. Add `import bundleAnalyzer from '@next/bundle-analyzer';` at the top
2. Replace `export default nextConfig;` at the bottom with:
   ```mjs
   const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
   export default withBundleAnalyzer(nextConfig);
   ```

- [ ] **Step 3: Add `analyze` script to `package.json`**

In `package.json`, inside the `"scripts"` object, add:

```json
"analyze": "ANALYZE=true next build"
```

- [ ] **Step 4: Run the analyzer**

```bash
npm run analyze
```

Expected: build completes, two browser tabs open (client + server bundle treemaps)

In the **client** treemap, search for `silhouettes`. Note which chunk it appears in (look at the chunk name in the top-right breadcrumb when hovering). If it appears in a chunk shared by 3+ routes, Task 8 is confirmed necessary. If it's only in route-specific chunks, Task 8 can be skipped.

In practice, since `EntityArt` is used by `shop`, `inventory`, `character`, and `combat` pages, `silhouettes.tsx` will appear in a shared chunk. Task 8 proceeds.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add package.json next.config.mjs package-lock.json
git commit -m "Add @next/bundle-analyzer with npm run analyze script"
```

---

### Task 8: Split item silhouettes into a dedicated file

**Files:**

- Create: `src/components/art/item-silhouettes.tsx`
- Modify: `src/components/art/silhouettes.tsx`
- Modify: `src/components/art/EntityArt.tsx`

`silhouettes.tsx` contains 9 category maps. The `ITEM_SILHOUETTES` map has 55 entries — it is the largest category by far and is only needed on pages that render item cards (shop, inventory). Monster, class, ability, dungeon, and achievement silhouettes are needed on other pages (combat, character, dashboard). Keeping all maps in one file forces every route that uses `EntityArt` to load all 55 item SVGs even when it only needs monster silhouettes.

Splitting `ITEM_SILHOUETTES` into `item-silhouettes.tsx` lets Next.js create a separate chunk for it, which is then only loaded by shop and inventory — not combat or character.

- [ ] **Step 1: Read `src/components/art/silhouettes.tsx`**

Read the full file. You need to identify:

- All item silhouette functions: starts with the comment `// ─── Item silhouettes` and ends just before `export const ITEM_SILHOUETTES`
- The `ITEM_SILHOUETTES` export itself (the last map in the file before any other exports)
- The exact line range so you can remove them precisely

- [ ] **Step 2: Create `src/components/art/item-silhouettes.tsx`**

Create a new file containing:

- The `'use client';` directive
- All item silhouette functions cut from `silhouettes.tsx` (everything that was under the item silhouettes comment)
- The `ITEM_SILHOUETTES` export cut from `silhouettes.tsx`

The file should follow this structure:

```tsx
'use client';

// ─── Item silhouettes ─────────────────────────────────────────────────────────
// One function per item id. Use fill="currentColor" on the root <g> so the
// heraldic frame's tint color applies automatically.
// viewBox is 0 0 100 100; silhouettes should fill the central ~60×60 area.

// [paste all item silhouette functions here — WornSword, OakStaff, ... GreaterStaminaPotion]

export const ITEM_SILHOUETTES: Record<string, () => React.ReactNode> = {
  // Type-level fallbacks
  weapon: ItemWeapon,
  armor: ItemArmor,
  accessory: ItemAccessory,
  consumable: ItemConsumable,
  // Weapons
  'worn-sword': WornSword,
  'oak-staff': OakStaff,
  // ... (all 55 entries as they appear in silhouettes.tsx)
};
```

- [ ] **Step 3: Remove item content from `src/components/art/silhouettes.tsx`**

In `silhouettes.tsx`:

1. Delete all item silhouette functions (everything from the `// ─── Item silhouettes` comment through the closing brace of the last item function)
2. Delete the `ITEM_SILHOUETTES` export

The file should still export: `MONSTER_SILHOUETTES`, `CLASS_SILHOUETTES`, `SUBCLASS_SILHOUETTES`, `ABILITY_SILHOUETTES`, `SPELL_SILHOUETTES`, `ACTIVITY_SILHOUETTES`, `ACHIEVEMENT_SILHOUETTES`, `DUNGEON_SILHOUETTES`, and the `SpellEffectKey` type.

Do **not** add a re-export of `ITEM_SILHOUETTES` from `silhouettes.tsx` — `EntityArt.tsx` will import it directly.

- [ ] **Step 4: Update `src/components/art/EntityArt.tsx`**

Change the import at the top from:

```tsx
import {
  ABILITY_SILHOUETTES,
  ACHIEVEMENT_SILHOUETTES,
  ACTIVITY_SILHOUETTES,
  CLASS_SILHOUETTES,
  DUNGEON_SILHOUETTES,
  ITEM_SILHOUETTES,
  MONSTER_SILHOUETTES,
  SPELL_SILHOUETTES,
  SUBCLASS_SILHOUETTES,
  type SpellEffectKey,
} from './silhouettes';
```

to:

```tsx
import {
  ABILITY_SILHOUETTES,
  ACHIEVEMENT_SILHOUETTES,
  ACTIVITY_SILHOUETTES,
  CLASS_SILHOUETTES,
  DUNGEON_SILHOUETTES,
  MONSTER_SILHOUETTES,
  SPELL_SILHOUETTES,
  SUBCLASS_SILHOUETTES,
  type SpellEffectKey,
} from './silhouettes';
import { ITEM_SILHOUETTES } from './item-silhouettes';
```

No other changes to `EntityArt.tsx`.

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 6: Run unit tests**

```bash
npm test
```

Expected: all 438 tests pass (silhouettes are not directly unit-tested, but EntityArt-dependent logic is)

- [ ] **Step 7: Verify build size improvement**

```bash
npm run analyze
```

In the treemap, search for `item-silhouettes`. It should now appear only in chunks associated with the `shop` and `inventory` routes, not in the shared chunk that `combat` and `character` load. The shared chunk should be smaller.

Also run a regular build and confirm the shared chunk shrank:

```bash
npm run build
```

Compare the `First Load JS shared by all` line against the baseline from Task 7. Expect a reduction of 20–40 kB in the shared chunk.

- [ ] **Step 8: Commit**

```bash
git add src/components/art/item-silhouettes.tsx src/components/art/silhouettes.tsx src/components/art/EntityArt.tsx
git commit -m "Split item silhouettes into dedicated file for route-level code splitting"
```

---

## Self-Review

### 1. Spec coverage

| Scorecard category                 | Task(s)       | Status                            |
| ---------------------------------- | ------------- | --------------------------------- |
| Offline UX (B+ → A)                | Task 1        | ✅ covered                        |
| E2E authenticated coverage (B → A) | Tasks 2–5     | ✅ covered                        |
| Known vulnerabilities (B- → A)     | Task 6        | ✅ covered                        |
| Bundle / performance (B → A)       | Tasks 7–8     | ✅ covered                        |
| Risks: CHANGELOG PR #105 pending   | Pre-condition | Handled before starting this plan |
| Risks: silhouettes.tsx parse time  | Task 8        | ✅ covered                        |

### 2. Placeholder scan

None found. Every step includes exact commands, exact file content, or explicit "read first, then edit" instructions.

### 3. Type consistency

- `globalSetup` signature in `global-setup.ts` matches the `FullConfig` type from `@playwright/test` ✅
- `ITEM_SILHOUETTES` type is `Record<string, () => React.ReactNode>` in both `silhouettes.tsx` (current) and `item-silhouettes.tsx` (new) ✅
- `connectAuthEmulator` and `connectFirestoreEmulator` are imported from their correct Firebase SDK subpackages ✅

---

## Execution Order

Tasks 1, 6, 7–8 are completely independent of each other. Tasks 2–5 must run in sequence (each depends on the previous). Recommended execution order for a subagent-driven run:

1. Task 1 (Offline UX) — 5 min
2. Task 2 (Firebase SDK emulator) — 15 min
3. Task 3 (Global setup) — 20 min
4. Task 4 (Authenticated tests) — 15 min
5. Task 5 (Playwright config + CI) — 20 min
6. Task 6 (Audit script) — 20 min
7. Task 7 (Bundle analyzer) — 10 min
8. Task 8 (Silhouette split) — 30 min

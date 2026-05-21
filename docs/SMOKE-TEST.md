# FitQuest — Manual Smoke Test

A fast (≈2 min) manual smoke for verifying that the dev build boots, Firebase initializes, the middleware route gate works, and Auth round-trips correctly. **No test credentials needed** — the test deliberately uses invalid credentials and confirms the error path.

Use this:

- After a Next.js / Firebase / middleware-affecting dependency bump (e.g. PR #26 next 14→15, PR #28 firebase 12.12→12.13)
- After any change to `src/middleware.ts` or `next.config.mjs`
- Before signing off on a PR that touches the auth flow, the layout, or the root page
- When CI is green but you want one more belt-and-suspenders check before merge

If any of the four steps below fails, **do not merge** — investigate.

---

## Setup

Start the dev server (or use Claude Preview's `preview_start`):

```bash
npm run dev
```

Open `http://localhost:3000` in a fresh incognito window so cached Firebase tokens don't pollute the test.

---

## Step 1 — `/login` renders without console errors

Navigate to `/login`. Confirm:

- Heading "Welcome back, adventurer" renders
- Email + Password inputs render with placeholder text
- "Enter the Realm" submit button renders
- Browser DevTools Console is empty (only the React DevTools info-level nag is OK)

**Catches:** broken Next.js build, missing CSS, hydration errors, top-level Firebase init crashes.

## Step 2 — Firebase Auth round-trip with invalid credentials

In the login form:

- Email: `smoketest@invalid.example`
- Password: any non-empty string (e.g. `deliberately-wrong-password-12345`)
- Click **Enter the Realm**

Confirm:

- Form submits (button briefly shows loading state)
- Red banner appears: **"Invalid email or password."**
- DevTools Console still has zero errors (the auth failure is handled, not thrown)

**Catches:** Firebase SDK not initialized, wrong API key, broken Sonner toast renderer, missing error-handling branch in `LoginForm`.

## Step 3 — Middleware redirects unauthenticated users

In the address bar, navigate directly to `/dashboard`.

Confirm:

- URL changes back to `/login` (middleware redirect)
- Login form renders again

Then navigate to `/`:

- URL changes to `/login`

**Catches:** broken `src/middleware.ts`, broken cookie-based auth check, missing route protection on a new page.

## Step 4 — Public routes render

Navigate to `/register`. Confirm:

- Heading "Begin your journey" renders
- Email + Password inputs render
- Console clean

**Catches:** broken `(auth)` layout, broken shared header/branding component.

---

## Optional — authenticated flow

If you have a test account, log in and walk through:

1. `/dashboard` → character loads, no console errors
2. `/activities` → log a small activity → success toast → XP bar updates
3. `/quests` → claim any completed quest if available
4. `/combat` → run one round → spell cast → victory modal renders correctly
5. `/character` → if level ≥ 10, subclass selection works
6. `/shop` → buy an item, equip it, stats update

Watch the dev console specifically for: Next.js async-API deprecation warnings, Firebase SDK warnings, and React hydration mismatches.

---

## Why this exists

Build + tests + typecheck don't exercise the runtime auth flow or the middleware. A dependency bump can pass all CI checks and still break Firebase init or the route guard. This 4-step smoke catches those classes of regressions without needing test credentials, and runs in ≈2 minutes.

History: introduced after the firebase 12.12 → 12.13 bump (PR #28) where the same pattern verified Firebase Auth still round-tripped under the new SDK version.

## Automation

**Steps 1–4 are now covered by the Playwright E2E smoke suite** (`tests/e2e/smoke.test.ts`) running in CI on every PR and master push. The suite asserts:

- All 13 protected routes redirect to `/login` (Step 3 equivalent): `/`, `/dashboard`, `/activities`, `/combat`, `/combat/dungeons`, `/combat/dungeons/[tierId]` (tested via `/combat/dungeons/goblin-caves`), `/combat/dungeons/run`, `/character`, `/inventory`, `/shop`, `/quests`, `/profile`, `/stats`.
- `/login` renders the heading, email/password inputs, submit button, and correct a11y attributes (Steps 1–2 equivalent).
- `/register` renders the heading and link back to login (Step 4 equivalent).

Run it locally with `npx playwright test` (or `npm run test:e2e`). On first run you may need `npx playwright install chromium`.

**This manual checklist remains valuable for:**

- The optional authenticated flow (Step 5 and below) — the E2E suite deliberately avoids real Firebase calls.
- Checking DevTools Console output for hydration errors or SDK warnings — Playwright doesn't inspect the console by default in these tests.
- Post-bump verification when the change is in Firebase Auth, Next.js internals, or middleware (belt-and-suspenders on top of CI).

The Claude Preview MCP can also drive these steps via `preview_fill` + `preview_click` + `preview_console_logs` + `preview_eval(window.location = '/dashboard')`. See the agent transcripts under `.claude/projects/...` for an example trace.

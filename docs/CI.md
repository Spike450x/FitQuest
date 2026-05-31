# FitQuest — CI / Pipeline

Reference for every automated check that runs against the repo: GitHub Actions, husky hooks, and Dependabot. Pair with [SECURITY-SETUP.md](SECURITY-SETUP.md) for the GitHub-side branch protection that wraps these checks.

---

## Defense in depth

There are **three** layers, each catching a different class of regression:

| Layer            | Where it runs                       | What it blocks                                    | Bypassable?                                     |
| ---------------- | ----------------------------------- | ------------------------------------------------- | ----------------------------------------------- |
| Husky pre-commit | Local — every `git commit`          | Type errors, lint errors, broken game-logic tests | Yes (`HUSKY=0 git commit`) — discouraged        |
| Husky pre-push   | Local — every `git push`            | Direct pushes to `master`                         | Yes (`HUSKY=0 git push`) — emergency only       |
| GitHub Actions   | Cloud — every PR + push to `master` | Same checks + format + production build           | No — branch protection requires the green check |

The local hooks fail fast (seconds) so the cloud run is rarely the first time a regression is caught. The cloud run is the authoritative gate before merge.

---

## GitHub Actions — `.github/workflows/ci.yml`

Single workflow named `CI`. One job, `Typecheck, Lint, Test`, runs on Ubuntu with Node 24. On pushes to `master` (after all checks pass), it also deploys Firestore security rules and indexes to the live project.

### Triggers

```yaml
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]
```

Runs on every PR targeting `master` (the gate before merge) and on every push to `master` (post-merge sanity check).

### Permissions

```yaml
permissions:
  contents: read
```

`GITHUB_TOKEN` is read-only by default. Workflows cannot write to the repo, open issues/PRs, or push tags. Tightens the blast radius if a dependency in a third-party action is ever compromised.

### Steps

| #   | Step                               | Command / condition                                                                       | Catches / purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Checkout                           | `actions/checkout@…`                                                                      | n/a — fetches the repo. SHA-pinned (see below).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2   | Setup Node                         | `actions/setup-node@…`                                                                    | Pins Node 24 + npm cache.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 3   | Install                            | `npm ci`                                                                                  | Lockfile drift / missing dependencies.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 4   | Validate Firestore indexes         | `node scripts/validate-firestore-indexes.mjs`                                             | Schema drift in `firestore.indexes.json` before deploy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 4b  | Validate documentation counts      | `node scripts/validate-doc-counts.mjs`                                                     | Documentation drift, three ways: (1) **counts** — items/spells/monsters/achievements/quest-pools/silhouettes computed from source vs README.md / GAME-LOGIC.md / ART-ASSETS.md (anchored so historical CHANGELOG entries are never matched); (2) **silhouette coverage** — every non-spell item must have a per-id silhouette; (3) **export coverage** — every `src/lib/gameLogic/*` export must appear in GAME-LOGIC.md or be on the script's `DOC_EXEMPT` list. When code changes a count or export, update the doc prose — not the script. See [GAME-LOGIC.md](GAME-LOGIC.md).                                                                                                                                              |
| 5   | Typecheck Cloud Functions          | `cd functions && npm ci && npx tsc --noEmit`                                              | TypeScript errors in `functions/src/`. Note: `functions/package.json` pins `"node": "22"` (Firebase's current max) — Firebase Cloud Functions does not yet support Node 24, so the functions runtime intentionally lags behind the CI runtime. This mismatch is expected.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 5b  | Test Cloud Functions               | `cd functions && npm test`                                                                | Vitest unit suite for pure game-logic functions that live in `functions/src/` (e.g. `isMasteryMilestone`, `statCap`). Catches regressions in server-side logic without requiring Firebase emulator or deployment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 6   | Audit production dependencies      | `node scripts/audit-check.mjs` (root + functions, blocking)                               | Parses `npm audit --json` and fails the build on any high/critical advisory. Moderate/low advisories (notably the firebase-tools transitive uuid<9 chain) are logged as warnings and do not block the build. See [SECURITY-SETUP.md § Known devDependency vulnerabilities](SECURITY-SETUP.md#known-devdependency-vulnerabilities) for the full list and the watch-and-update plan.                                                                                                                                                                                                                                                                                                                                                |
| 7   | Format check                       | `npm run format:check`                                                                    | Prettier diff noise — files that aren't formatted to the shared baseline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 8   | Typecheck                          | `npm run typecheck`                                                                       | TypeScript errors across the whole project (`tsc --noEmit`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 9   | Lint                               | `npm run lint`                                                                            | ESLint errors and `next/core-web-vitals` rule violations.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 10  | Test                               | `npm test`                                                                                | Vitest unit suite (800+ tests, ~15 s). Covers pure game logic (`src/lib/gameLogic/`), Zustand stores (`src/store/`), data-layer wrappers (`src/lib/`), hooks (`src/hooks/`), and UI components (`src/components/ui/`). JSX in `.tsx` test files is parsed via `@vitejs/plugin-react`. Coverage scope (`npm run test:coverage`) reports for all four areas; thresholds (80/80/70/80) gate only `src/lib/gameLogic/**`.                                                                                                                                                                                                                                                                                                             |
| 11  | Test Firestore rules               | `firebase emulators:exec … "npm run test:rules"`                                          | Starts the Firestore emulator (`demo-fitness-rpg` demo project — no real Firebase connection) and runs `tests/rules/`. Covers auth ownership, immutable fields, delta caps, the ±2-min timestamp anti-backdating window, the two-step quest-claim gate, `rewardedXp`/`rewardedGold` claim-time scoping, and combatLogs writes.                                                                                                                                                                                                                                                                                                                                                                                                    |
| 12  | Build                              | `npm run build:ci`                                                                        | Next.js build issues that typecheck doesn't surface (e.g. RSC boundaries). Uses dummy Firebase env from `.env.ci` so the build doesn't connect to real Firestore.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 13  | Run E2E suite (composite action)   | `uses: ./.github/actions/run-e2e-suite`                                                   | Composite action that: builds Cloud Functions (with `functions/lib/` cache), installs Chromium for Playwright, boots `auth,firestore,functions` emulators on ports 9099/8080/5001, and runs `npx playwright test` with `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`. Three Playwright projects run: `unauthenticated` (smoke + dark-mode), `authenticated` (route-renders smoke against the seeded test user), and `authenticated-flows` (real user actions — log a workout, claim a quest, win a fight, buy+equip gear, enter a dungeon, welcome-back banner trigger, daily-login bonus, polymath progress widget). The composite is reused by `scheduled-e2e.yml`. `test-results/results.json` is emitted for the Discord notifier. |
| 13b | Notify Discord on master failure   | `uses: ./.github/actions/discord-notify` (failure-only on master pushes)                  | Posts a colored embed to `DISCORD_WEBHOOK_URL` (GitHub secret) with pass/fail counts, top 10 truncated failures, and a run-URL link. Skipped on green PRs to keep the channel quiet. Swallows webhook network errors so notifier glitches don't fail the build.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 15  | Deploy Firestore rules and indexes | `npx firebase deploy --only firestore:rules,firestore:indexes` (master push only)         | Auto-deploys `firestore.rules` and `firestore.indexes.json` to `fitness-rpg-claude` after all checks pass. Skipped on PRs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 16  | Deploy Cloud Functions             | `npx firebase deploy --only functions --force` (master push only, `functions/**` changed) | Auto-deploys all Cloud Functions — the core callables (`logActivity`, `claimDungeonRun`, `claimCombatVictory`) plus the health-integration functions (`createStravaAuthUrl`, `createGarminAuthUrl`, `stravaOAuthCallback`, `garminOAuthCallback`, `stravaWebhook`, `garminWebhook`, dormant until their secrets are set) — after all checks pass. Skipped on PRs and on pushes that touch no files under `functions/`. `--force` is required in non-interactive mode: it suppresses both the Artifact Registry cleanup-policy prompt and the billing confirmation that Firebase shows when a function uses `minInstances: 1`.                                                                                                                                                                                                                                                                                                                                                        |

### Auto-deploy steps (15 and 16)

Steps 15 and 16 run only on master push — PRs only validate, they never deploy.

Step 16 additionally checks whether any file under `functions/` changed in the push (via `git diff HEAD~1 HEAD`). If no functions files changed, the deploy is skipped entirely, saving ~2 min of Cloud Build time on frontend-only commits. The checkout step uses `fetch-depth: 2` to make `HEAD~1` available for this comparison.

**Authentication:** both steps use a long-lived Firebase CI token stored as the `FIREBASE_TOKEN` GitHub Actions secret. This is a one-time maintainer setup:

```bash
npx firebase-tools login:ci   # opens browser → outputs a CI token
```

Copy the token → GitHub repo **Settings → Secrets and variables → Actions → New repository secret** → name `FIREBASE_TOKEN`.

`firebase-tools` is listed as a devDependency in `package.json` so `npm ci` (step 3) installs it, and `npx firebase` resolves it from `node_modules/.bin/` without a global install.

**Token rotation:** `FIREBASE_TOKEN` is a long-lived credential. If it expires or needs rotation, both deploy steps (12 and 13) will fail simultaneously on the next master push. To rotate: run `npx firebase-tools login:ci` locally, then update the `FIREBASE_TOKEN` secret in **Settings → Secrets and variables → Actions**. See [SECURITY-SETUP.md](SECURITY-SETUP.md#firebase_token-rotation) for the rotation checklist.

**What is auto-deployed:** `firestore:rules` and `firestore:indexes` (step 15, combined deploy) and Cloud Functions (step 16). Deploying rules and indexes together ensures the composite index is always in sync with the security rules that depend on it.

### Action pinning

All third-party actions are pinned to a **commit SHA** with a trailing `# vX.Y.Z` tag comment, e.g.:

```yaml
- uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
```

Tags can be moved; commits cannot. Pinning to a SHA defends against an attacker compromising a tag and pushing a malicious workflow into our run. Dependabot reads the trailing tag comment to know what version to bump us to (see Dependabot section below).

### Bundle Gate (`.github/workflows/bundle-gate.yml`)

Runs on every **PR** targeting `master`. Builds the app and compares `.next/static/` sizes against the committed baseline in `docs/bundle-baseline.json`.

**Regression threshold:** >10% JS growth fails the check and posts an orange Discord warning embed. CSS deltas are logged but never block. The threshold constant (`REGRESSION_THRESHOLD_PCT`) lives at the top of `scripts/bundle-stats.mjs`.

**Baseline missing:** if `docs/bundle-baseline.json` doesn't exist yet (first PR after the feature was introduced), `--compare` exits 0 with a warning — no false failure.

**Updating the baseline:** run this locally whenever you intentionally add something that will grow the bundle (new heavy dependency, large new route), then commit the result as part of your PR:

```bash
npm run build:ci
node scripts/bundle-stats.mjs --write
git add docs/bundle-baseline.json
```

You don't need to do this on every PR — only when the bundle-gate fails and the growth is intentional. If you don't update the baseline, the PR check will tell you by failing.

### Deploy Announce (`.github/workflows/deploy-announce.yml`)

Triggered via `workflow_run` after the `CI` workflow **completes successfully** on `master`. Posts a green Discord embed with the PR title, author, short SHA, files-changed count, and a link to the CI run.

Fires only on genuine deploys — PRs, the scheduled E2E, and baseline-update commits (`[skip ci]`) never trigger it. Requires `DISCORD_WEBHOOK_URL` secret.

### Scheduled E2E (`.github/workflows/scheduled-e2e.yml`)

A separate workflow that runs the full E2E suite on a daily cadence — independent of feature pushes — so regressions in flaky flows, seeded fixtures, or time-dependent code paths are surfaced even when no one pushed code that day.

**Trigger:** Daily at 08:00 UTC (cron) plus `workflow_dispatch` for on-demand runs. `concurrency: scheduled-e2e` with `cancel-in-progress: false` queues overlapping runs rather than cancelling them.

**What it runs:** Vitest unit suite → production build → composite `run-e2e-suite` action with `--trace=on` (scheduled-run failures are useless without artifacts; PR-run failures already have local repro) → `discord-notify` step that fires on every status (`if: always()`). Pass and fail both post — a silent cron is a broken cron, so green runs confirm the schedule is firing.

**Authentication:** None against production. Everything runs against the same demo emulator stack as PR CI. Requires `DISCORD_WEBHOOK_URL` GitHub secret.

**Do not add this workflow as a required status check** — same reason as Scheduled Firebase Sync below: it doesn't run on PRs.

### Scheduled Firebase Sync (`.github/workflows/scheduled-firebase-sync.yml`)

A separate workflow that redeploys Cloud Functions and Firestore rules/indexes on a recurring schedule, independent of feature pushes.

**Trigger:** Every Monday at 06:00 UTC, plus `workflow_dispatch` for on-demand runs.

**Why it exists:** Cloud Run IAM policies (specifically the `allUsers → roles/run.invoker` binding that allows public callable invocation) can drift if a Firebase deployment fails mid-way and the Cloud Run service is left in a partially configured state. Without a scheduled redeploy, this drift is invisible until the next push that touches `functions/`, which could be weeks. The scheduled workflow self-heals within one week of any drift.

**Steps:** install deps → validate Firestore indexes (coverage check included) → deploy `firestore:rules,firestore:indexes` → deploy functions (unconditional, no diff check).

**Authentication:** uses the same `FIREBASE_TOKEN` secret as the CI deploy steps. The workflow does not require branch protection status — it is not a PR gate.

**Do not add this workflow as a required status check** — it runs on a schedule, not on PRs, so adding it as a required check would permanently block all merges.

### CodeQL (`.github/workflows/codeql.yml`)

A separate `CodeQL` workflow runs the `security-extended` query suite (JavaScript/TypeScript) on every PR and push to `master`, plus a weekly scheduled scan. It uses `codeql-action@v4` (Node 24-compatible) with SHA-pinned `actions/checkout`.

The workflow uses an **advanced configuration** (custom `.yml`) rather than GitHub's default setup — this enables the `security-extended` query set and a weekly scheduled scan, neither of which the default UI exposes. **Do not re-enable the default setup in repo Settings → Code security** — enabling both simultaneously causes a SARIF conflict that fails the check.

### Adding a new required check

When a new workflow lands (e.g. CodeQL, rules tests):

1. Open a PR that adds the workflow file. Let it run at least once.
2. After the PR merges, go to **Settings → Branches → master → Edit protection rule**.
3. Under **Require status checks to pass before merging**, search for and add the new check name.

This is the only manual step — branch protection cannot reference a check that has never run.

---

## Husky hooks (`.husky/`)

Activated by the `prepare` script in `package.json`, so they install on every fresh `npm install`. If a fresh clone's hooks aren't firing, re-run `npm install`.

### `pre-commit`

```bash
npx lint-staged && npm run typecheck && npm test
```

- **lint-staged** — runs Prettier (`prettier --write`) and ESLint on staged `.ts`, `.tsx`, `.js`, `.json`, `.md`, `.css`, and `.yaml` files. Auto-fixes formatting; fails the commit if ESLint flags an error.
- **`npm run typecheck`** — `tsc --noEmit` across the whole project. Catches API drift in files you didn't touch (e.g. a renamed type that leaves a stale call site).
- **`npm test`** — `vitest run` across `src/lib/gameLogic/__tests__/`. Pure-logic regression check. Fast (~2s) so it can run on every commit.

A failed pre-commit blocks the commit — the staged changes stay staged so you can fix and re-commit.

### Running Firestore rules tests locally

The rules test suite (`tests/rules/`) requires a Firebase Firestore emulator. The pre-commit hook does **not** run these — they are CI-only by default because the emulator adds ~10 s cold-start overhead.

**Prerequisites:** Java must be on `PATH` (the emulator JVM dependency). Node 18+ is sufficient; the emulator binary is downloaded on first run into `~/.cache/firebase/emulators/`.

```bash
# One-shot run (same command CI uses):
npx firebase emulators:exec --only firestore --project demo-fitness-rpg "npm run test:rules"

# Watch mode while iterating on rules or tests:
npx firebase emulators:exec --only firestore --project demo-fitness-rpg \
  "npx vitest --config vitest.rules.config.ts"
```

`demo-fitness-rpg` is a Firebase demo project ID — the emulator intercepts all Firestore calls locally; no real Firebase connection is made and no credentials are required.

The suite covers: auth ownership, immutable fields, delta caps, the ±2-min timestamp anti-backdating window, the two-step quest-claim gate, `rewardedXp`/`rewardedGold` claim-time scoping, and `combatLogs` write/read rules.

---

### `pre-push`

```bash
# blocks pushes whose remote_ref is refs/heads/master
```

Refuses any push that targets `refs/heads/master`. Forces the squash-merge-via-PR workflow described in CLAUDE.md.

**Bypass (emergency only):**

```bash
HUSKY=0 git push origin master:master
```

Branch protection on the GitHub side still rejects this — the local hook is layer one of two.

---

## Dependabot — `.github/dependabot.yml`

Three ecosystems, all on a weekly schedule.

### `npm` (root)

- **Patch + minor bumps** are batched into a **single weekly PR** under the `patch-and-minor` group. Safe to merge once CI passes.
- **Major bumps** (e.g. `next 14 → 15`) are explicitly excluded from the group and arrive as separate PRs. They get manual review — breaking-change reads, manual smoke tests, possible code changes.

### `npm` (`functions/`)

The Cloud Functions package has its own `package-lock.json`, so it gets its own grouped weekly PR (same patch+minor / no-major rules). Keeps `firebase-admin` patches from sharing a PR with `next.js` minors.

### `github-actions`

Bumps the SHA pins in `.github/workflows/*.yml` weekly. Dependabot reads the `# vX.Y.Z` tag comment next to each `uses:` line to figure out the target version, then resolves and writes the new SHA.

### Dependabot **security** updates

These are _separate_ from the version-bump config above and are toggled in **Settings → Code security**. They auto-open PRs for known CVEs as soon as a patched version is published, regardless of the weekly schedule. See [SECURITY-SETUP.md](SECURITY-SETUP.md#3-dependabot-security-updates).

### Dependabot auto-merge

`.github/workflows/dependabot-auto-merge.yml` runs on every PR opened by `dependabot[bot]`. It:

1. Reads the PR's update-type via `dependabot/fetch-metadata`.
2. If the bump is **NOT** `version-update:semver-major`, calls `gh pr merge --auto --squash`.
3. GitHub queues the PR with auto-merge enabled. Once required status checks (`Typecheck, Lint, Test`) land green, GitHub squash-merges automatically.

**Major bumps fall through:** the dependabot config already filters majors out of the grouped PR (they arrive as separate PRs), and the auto-merge gate skips them belt-and-suspenders style. Majors stay manual.

**Prerequisite:** repo Settings → General → Pull Requests → **Allow auto-merge** must be enabled, and branch protection on `master` must require at least one status check (it does — `Typecheck, Lint, Test`).

**Why "auto-merge" instead of "merge immediately":** merging immediately would bypass the CI gate. Auto-merge waits for the gate to pass first, then merges — same safety as a human clicking the button after CI greens.

---

## Mapping checks to regression classes

| Regression                                                                                | Caught by                                                 |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Renamed type leaves stale call sites                                                      | Typecheck (local + CI)                                    |
| `console.log` left in committed code                                                      | Lint (local + CI)                                         |
| Game-logic regression (e.g. wrong XP curve, broken combat)                                | Test (local + CI)                                         |
| Server-side game-logic regression in Cloud Functions (e.g. mastery milestone, stat cap)   | Test Cloud Functions step (CI)                            |
| Whitespace/style drift                                                                    | Format check (CI) + lint-staged (local)                   |
| RSC / app-router-only build error                                                         | Build (CI only)                                           |
| Unauthenticated routing regression (protected route stops redirecting)                    | E2E smoke tests (CI)                                      |
| Login / register page regression (form fields, accessibility attributes)                  | E2E smoke tests (CI)                                      |
| Authenticated game-route regression (heading missing, broken layout, 500 on render)       | E2E authenticated tests (CI, emulator-backed)             |
| JS bundle grows >10% vs baseline                                                          | Bundle Gate (PR only)                                     |
| Direct push to `master`                                                                   | pre-push (local) + branch protection (GitHub)             |
| Compromised third-party action                                                            | SHA pinning + `permissions: contents: read`               |
| New high/critical CVE in a dependency                                                     | `scripts/audit-check.mjs` (blocking root + functions, CI) |
| New moderate CVE in a dependency                                                          | `scripts/audit-check.mjs` (warning) + Dependabot updates  |
| Stale `firestore.rules` or `firestore.indexes.json` (merged but not deployed)             | Auto-deploy step 15 on master push                        |
| `firestore.indexes.json` schema drift                                                     | Validate Firestore indexes step (CI)                      |
| Cloud Function type error                                                                 | Typecheck Cloud Functions step (CI)                       |
| Forged claim, backdated timestamp, or field mutation bypassing Firestore rules            | Test Firestore rules step (CI)                            |
| Double-claim of quest rewards or `rewardedXp`/`rewardedGold` written outside claim window | Test Firestore rules step (CI)                            |

---

## Cross-references

- **Branch protection + secret scanning + push protection setup** → [SECURITY-SETUP.md](SECURITY-SETUP.md)
- **What husky hooks live alongside (commit conventions, branching, merging)** → [CLAUDE.md](../CLAUDE.md#git-workflow)
- **Vulnerability reporting** → [SECURITY.md](../SECURITY.md)

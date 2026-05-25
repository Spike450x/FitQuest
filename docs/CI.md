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

| #   | Step                                        | Command / condition                                                                                              | Catches / purpose                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Checkout                                    | `actions/checkout@…`                                                                                             | n/a — fetches the repo. SHA-pinned (see below).                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2   | Setup Node                                  | `actions/setup-node@…`                                                                                           | Pins Node 24 + npm cache.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 3   | Install                                     | `npm ci`                                                                                                         | Lockfile drift / missing dependencies.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 4   | Validate Firestore indexes                  | `node scripts/validate-firestore-indexes.mjs`                                                                    | Schema drift in `firestore.indexes.json` before deploy.                                                                                                                                                                                                                                                                                                                                                                                                |
| 5   | Typecheck Cloud Functions                   | `cd functions && npm ci && npx tsc --noEmit`                                                                     | TypeScript errors in `functions/src/`. Note: `functions/package.json` pins `"node": "22"` (Firebase's current max) — Firebase Cloud Functions does not yet support Node 24, so the functions runtime intentionally lags behind the CI runtime. This mismatch is expected.                                                                                                                                                                              |
| 5b  | Test Cloud Functions                        | `cd functions && npm test`                                                                                       | Vitest unit suite for pure game-logic functions that live in `functions/src/` (e.g. `isMasteryMilestone`, `statCap`). Catches regressions in server-side logic without requiring Firebase emulator or deployment.                                                                                                                                                                                                                                      |
| 6   | Audit production dependencies               | `node scripts/audit-check.mjs` (root + functions, blocking)                                                      | Parses `npm audit --json` and fails the build on any high/critical advisory. Moderate/low advisories (notably the firebase-tools transitive uuid<9 chain) are logged as warnings and do not block the build. See [SECURITY-SETUP.md § Known devDependency vulnerabilities](SECURITY-SETUP.md#known-devdependency-vulnerabilities) for the full list and the watch-and-update plan.                                                                     |
| 7   | Format check                                | `npm run format:check`                                                                                           | Prettier diff noise — files that aren't formatted to the shared baseline.                                                                                                                                                                                                                                                                                                                                                                              |
| 8   | Typecheck                                   | `npm run typecheck`                                                                                              | TypeScript errors across the whole project (`tsc --noEmit`).                                                                                                                                                                                                                                                                                                                                                                                           |
| 9   | Lint                                        | `npm run lint`                                                                                                   | ESLint errors and `next/core-web-vitals` rule violations.                                                                                                                                                                                                                                                                                                                                                                                              |
| 10  | Test                                        | `npm test`                                                                                                       | Vitest unit suite (~720 tests, ~15 s). Covers pure game logic (`src/lib/gameLogic/`), Zustand stores (`src/store/`), data-layer wrappers (`src/lib/`), hooks (`src/hooks/`), and UI components (`src/components/ui/`). JSX in `.tsx` test files is parsed via `@vitejs/plugin-react`. Coverage scope (`npm run test:coverage`) reports for all four areas; thresholds (80/80/70/80) gate only `src/lib/gameLogic/**`.                                  |
| 11  | Test Firestore rules                        | `firebase emulators:exec … "npm run test:rules"`                                                                 | Starts the Firestore emulator (`demo-fitness-rpg` demo project — no real Firebase connection) and runs `tests/rules/`. Covers auth ownership, immutable fields, delta caps, the ±2-min timestamp anti-backdating window, the two-step quest-claim gate, `rewardedXp`/`rewardedGold` claim-time scoping, and combatLogs writes.                                                                                                                         |
| 12  | Build                                       | `npm run build:ci`                                                                                               | Next.js build issues that typecheck doesn't surface (e.g. RSC boundaries). Uses dummy Firebase env from `.env.ci` so the build doesn't connect to real Firestore.                                                                                                                                                                                                                                                                                      |
| 13  | Install Playwright browsers                 | `npx playwright install --with-deps chromium`                                                                    | Downloads Chromium (and OS-level deps) for E2E smoke tests. Chromium-only keeps the install fast (~30 s).                                                                                                                                                                                                                                                                                                                                              |
| 13b | Start Firebase emulators (E2E)              | `npx firebase emulators:start --only auth,firestore --project demo-fitness-rpg` (background, 60s readiness poll) | Starts the Auth and Firestore emulators on ports 9099 and 8080 so the `authenticated` Playwright project can exercise real auth + Firestore flows against ephemeral local data.                                                                                                                                                                                                                                                                        |
| 14  | E2E tests (unauthenticated + authenticated) | `npx playwright test` with `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`                                              | Runs the `unauthenticated` project (`smoke.test.ts` + `dark-mode.test.ts`) and the `authenticated` project (`authenticated.test.ts`). The `authenticated` project applies the `storageState` produced by `tests/e2e/global-setup.ts`, which seeds an Auth user + Firestore character via REST and drives the login form once. Authenticated tests then smoke-test dashboard, shop, inventory, quests, character, combat, stats, profile, and dungeons. |
| 15  | Deploy Firestore rules and indexes          | `npx firebase deploy --only firestore:rules,firestore:indexes` (master push only)                                | Auto-deploys `firestore.rules` and `firestore.indexes.json` to `fitness-rpg-claude` after all checks pass. Skipped on PRs.                                                                                                                                                                                                                                                                                                                             |
| 16  | Deploy Cloud Functions                      | `npx firebase deploy --only functions --force` (master push only, `functions/**` changed)                        | Auto-deploys `logActivity`, `claimDungeonRun`, and `claimCombatVictory` after all checks pass. Skipped on PRs and on pushes that touch no files under `functions/`. `--force` is required in non-interactive mode: it suppresses both the Artifact Registry cleanup-policy prompt and the billing confirmation that Firebase shows when a function uses `minInstances: 1`.                                                                             |

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

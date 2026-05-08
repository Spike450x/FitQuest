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

Single workflow named `CI`. One job, `Typecheck, Lint, Test`, runs on Ubuntu with Node 20. On pushes to `master` (after all checks pass), it also deploys the Firestore security rules to the live project.

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

| #   | Step                       | Command / condition                                             | Catches / purpose                                                                                                                                                 |
| --- | -------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Checkout                   | `actions/checkout@…`                                            | n/a — fetches the repo. SHA-pinned (see below).                                                                                                                   |
| 2   | Setup Node                 | `actions/setup-node@…`                                          | Pins Node 20 + npm cache.                                                                                                                                         |
| 3   | Install                    | `npm ci`                                                        | Lockfile drift / missing dependencies.                                                                                                                            |
| 4   | Validate Firestore indexes | `node scripts/validate-firestore-indexes.mjs`                   | Schema drift in `firestore.indexes.json` before deploy.                                                                                                           |
| 5   | Typecheck Cloud Functions  | `cd functions && npm ci && npx tsc --noEmit`                    | TypeScript errors in `functions/src/`.                                                                                                                            |
| 6   | Format check               | `npm run format:check`                                          | Prettier diff noise — files that aren't formatted to the shared baseline.                                                                                         |
| 7   | Typecheck                  | `npm run typecheck`                                             | TypeScript errors across the whole project (`tsc --noEmit`).                                                                                                      |
| 8   | Lint                       | `npm run lint`                                                  | ESLint errors and `next/core-web-vitals` rule violations.                                                                                                         |
| 9   | Test                       | `npm test`                                                      | Vitest unit suite (game-logic regressions in `src/lib/gameLogic/`).                                                                                               |
| 10  | Build                      | `npm run build:ci`                                              | Next.js build issues that typecheck doesn't surface (e.g. RSC boundaries). Uses dummy Firebase env from `.env.ci` so the build doesn't connect to real Firestore. |
| 11  | Deploy Firestore rules     | `npx firebase deploy --only firestore:rules` (master push only) | Auto-deploys `firestore.rules` to `fitness-rpg-claude` after all checks pass. Skipped on PRs.                                                                     |

### Firestore rules auto-deploy (step 11)

Step 11 deploys `firestore.rules` automatically after a successful master-push run. It is skipped on PR builds — PRs only validate, they never deploy.

**Authentication:** the step uses a long-lived Firebase CI token stored as the `FIREBASE_TOKEN` GitHub Actions secret. This is a one-time maintainer setup:

```bash
npx firebase-tools login:ci   # opens browser → outputs a CI token
```

Copy the token → GitHub repo **Settings → Secrets and variables → Actions → New repository secret** → name `FIREBASE_TOKEN`.

`firebase-tools` is listed as a devDependency in `package.json` so `npm ci` (step 3) installs it, and `npx firebase` resolves it from `node_modules/.bin/` without a global install.

**What it deploys:** only `firestore:rules` — indexes and functions are _not_ auto-deployed. Indexes and functions require manual ordering via `npm run deploy:prod` because the composite index must exist before the function is deployed.

### Action pinning

All third-party actions are pinned to a **commit SHA** with a trailing `# vX.Y.Z` tag comment, e.g.:

```yaml
- uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
```

Tags can be moved; commits cannot. Pinning to a SHA defends against an attacker compromising a tag and pushing a malicious workflow into our run. Dependabot reads the trailing tag comment to know what version to bump us to (see Dependabot section below).

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

Two ecosystems, both on a weekly schedule.

### `npm` (root)

- **Patch + minor bumps** are batched into a **single weekly PR** under the `patch-and-minor` group. Safe to merge once CI passes.
- **Major bumps** (e.g. `next 14 → 15`) are explicitly excluded from the group and arrive as separate PRs. They get manual review — breaking-change reads, manual smoke tests, possible code changes.

### `github-actions`

Bumps the SHA pins in `.github/workflows/*.yml` weekly. Dependabot reads the `# vX.Y.Z` tag comment next to each `uses:` line to figure out the target version, then resolves and writes the new SHA.

### Dependabot **security** updates

These are _separate_ from the version-bump config above and are toggled in **Settings → Code security**. They auto-open PRs for known CVEs as soon as a patched version is published, regardless of the weekly schedule. See [SECURITY-SETUP.md](SECURITY-SETUP.md#3-dependabot-security-updates).

---

## Mapping checks to regression classes

| Regression                                                 | Caught by                                     |
| ---------------------------------------------------------- | --------------------------------------------- |
| Renamed type leaves stale call sites                       | Typecheck (local + CI)                        |
| `console.log` left in committed code                       | Lint (local + CI)                             |
| Game-logic regression (e.g. wrong XP curve, broken combat) | Test (local + CI)                             |
| Whitespace/style drift                                     | Format check (CI) + lint-staged (local)       |
| RSC / app-router-only build error                          | Build (CI only)                               |
| Direct push to `master`                                    | pre-push (local) + branch protection (GitHub) |
| Compromised third-party action                             | SHA pinning + `permissions: contents: read`   |
| New CVE in a dependency                                    | Dependabot security updates                   |
| Stale `firestore.rules` (merged but not deployed)          | Auto-deploy step on master push               |
| `firestore.indexes.json` schema drift                      | Validate Firestore indexes step (CI)          |
| Cloud Function type error                                  | Typecheck Cloud Functions step (CI)           |

---

## Cross-references

- **Branch protection + secret scanning + push protection setup** → [SECURITY-SETUP.md](SECURITY-SETUP.md)
- **What husky hooks live alongside (commit conventions, branching, merging)** → [CLAUDE.md](../CLAUDE.md#git-workflow)
- **Vulnerability reporting** → [SECURITY.md](../SECURITY.md)

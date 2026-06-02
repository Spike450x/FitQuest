# GitHub Security Setup Checklist

One-time hardening for the FitQuest GitHub repository. Most items are toggles in the GitHub web UI — no code changes required. Work top-to-bottom; each section is independent.

This complements the engineering-side controls (CI checks, Dependabot version bumps, husky hooks). The settings below are what GitHub enforces _server-side_ and what husky cannot.

> Repository URL: replace `<owner>/<repo>` below with the actual GitHub path when navigating.

---

## 1. Branch Protection on `master`

Husky's `pre-push` master block is client-side only — `HUSKY=0 git push` bypasses it. Branch protection enforces the same intent server-side.

**Path:** Settings → Branches → **Add branch protection rule**

- **Branch name pattern:** `master`
- Enable **Require a pull request before merging**
  - Required approvals: `1` (a solo maintainer can self-approve on GitHub Free, but the PR mechanic — diff view, status checks, discussion thread — still adds value)
  - Optional: enable **Dismiss stale pull request approvals when new commits are pushed**
- Enable **Require status checks to pass before merging**
  - Enable **Require branches to be up to date before merging**
  - Search and select the existing CI job: **`Typecheck, Lint, Test`**
  - Add any new checks introduced by future PRs (CodeQL, PR-title validation, Firestore rules tests) once they have run at least once
- Enable **Require linear history** (matches the squash-merge workflow in CLAUDE.md)
- Enable **Do not allow bypassing the above settings** — apply to admins. Without this, the protection is opt-in for the repository owner.
- Leave **Allow force pushes** disabled
- Leave **Allow deletions** disabled

Click **Create**.

## 2. Secret Scanning + Push Protection

Free for public repositories. Push protection blocks commits that contain detected secret patterns (Firebase API keys, GitHub tokens, AWS keys, etc.) before they reach the remote.

**Path:** Settings → Code security

- Under **Secret scanning** → enable **Secret scanning**
- Under **Secret scanning** → enable **Push protection**

If push protection ever blocks a legitimate commit, GitHub provides a per-commit bypass with a required justification.

## 3. Dependabot Security Updates

Distinct from the existing version-bump configuration in `.github/dependabot.yml`. Security updates auto-open PRs for known CVEs as soon as a patched version is published.

**Path:** Settings → Code security

- Enable **Dependabot alerts**
- Enable **Dependabot security updates**

The existing `.github/dependabot.yml` handles routine version bumps; this toggle handles emergency CVE patches.

## 4. GitHub Actions Permissions

Restricts what workflows triggered by external contributors can do. Important once the repository accepts PRs from non-collaborators.

**Path:** Settings → Actions → General

- **Actions permissions:**
  - Allow `<owner>`, and select non-`<owner>`, actions and reusable workflows
  - Allow actions created by GitHub
  - Allow specified actions and reusable workflows: any third-party Action used in `.github/workflows/` (currently `actions/checkout`, `actions/setup-node`)
- **Fork pull request workflows from outside collaborators:**
  - Select **Require approval for first-time contributors**
- **Workflow permissions:**
  - Select **Read repository contents and packages permissions** (read-only `GITHUB_TOKEN` by default)
  - Disable **Allow GitHub Actions to create and approve pull requests** (unless a specific workflow needs it; can be re-enabled later)

Click **Save** at the bottom of each section.

## 5. Verify No Secrets in Git History

One-time read-only check — make sure no `.env.local` or Firebase credential file ever made it into a commit.

```bash
git log --all -p -- .env.local
git log --all -p -- '*-firebase-adminsdk-*.json' '*service-account*.json'
```

Both should return empty output. If anything appears:

1. **Rotate the leaked credential immediately** in the Firebase Console (regenerate the API key / delete the service account).
2. Use [`git filter-repo`](https://github.com/newren/git-filter-repo) or [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) to scrub the history.
3. Force-push the rewritten history (coordinate with any collaborators first — this is destructive).

## 6. Optional: Code Scanning (CodeQL)

Tracked separately — see the planned `.github/workflows/codeql.yml` workflow. Once that workflow has run at least once, return to **Settings → Branches → master** and add the CodeQL check to the list of required status checks.

## 7. Optional: Private Vulnerability Reporting

Lets researchers report security issues through GitHub's built-in workflow rather than email.

**Path:** Settings → Code security

- Enable **Private vulnerability reporting**

This works in tandem with `SECURITY.md` at the repository root — once both are enabled, a **Report a vulnerability** button appears on the repository's main page.

## 8. Dependency Vulnerability Response Workflow

When Dependabot opens an alert (or `npm audit` surfaces one):

1. **Audit both manifests.** This repo has two: `package.json` (root) and `functions/package.json` (Cloud Functions). Run `npm audit` in the root and `cd functions && npm audit`.
2. **Triage by attack surface.**
   - Runtime deps (`next`, `firebase`, `react`, `framer-motion`, anything that ships to the browser or runs in the Cloud Function): prefer a real version bump.
   - Dev-only chains (`firebase-tools`, `eslint-config-next`, build tooling): prefer `npm overrides` over a major version bump of the parent dep — overrides are surgical and avoid revalidating the deploy/CI surface.
3. **Override pattern** — the root `package.json` and `functions/package.json` both have an `overrides` block. Add or update entries there to pin a transitive dep to a patched version. Note: if the override target is also a direct dep (e.g. `postcss`), the direct-dep semver range must be compatible with the override, or `npm install` fails with `EOVERRIDE`.
4. **Verify.** After fix:
   - `npm audit` (root) shows 0 vulnerabilities
   - `cd functions && npm audit` shows 0 vulnerabilities
   - `npm run typecheck` + `npm run lint` + `npm test` + `npm run build` all pass
   - `cd functions && npm run build` passes
   - `npm run validate:indexes` passes (sanity that the firebase-tools chain still works)
5. **Document.** Append an entry to [`docs/CHANGELOG.md`](CHANGELOG.md) listing the GHSA IDs that were closed, and add a row to the Remediations Log below.

---

## Verification

After completing the steps above:

- The **Security** tab on the repository should show the policy from `SECURITY.md` and a green checkmark for secret scanning.
- A test direct push to `master` (e.g., `git push origin master:master` from a clean clone) should be rejected by GitHub with a branch-protection error.
- A test PR with an obvious dummy secret in the diff should be blocked by push protection at commit time.
- The **Insights → Dependency graph → Dependabot** view should list both alerts and version-update PRs.

Re-run this checklist any time the repository changes ownership or moves between organizations.

---

## Remediations Log

Chronological log of hardening work that has actually shipped — pair each row with [`docs/CHANGELOG.md`](CHANGELOG.md) for the surrounding context. Newest first.

| Date       | Change                                                                                                                                                                                                                                                                                                                                    | Source                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 2026-05-25 | `uuid` + `qs` moderate vulns in `functions/` resolved via overrides (`"uuid": ">=11.1.1"`, `"qs": ">=6.15.2"`) in `functions/package.json`. Closes Dependabot alert #27. `functions/` `npm audit` reports 0 vulnerabilities. Functions build passes.                                                                                      | this PR                                                                                                    |
| 2026-05-25 | `uuid` moderate vuln (GHSA-w5hq-g745-h8pq, Dependabot alert #29) resolved via `"uuid": ">=11.1.1"` in root `package.json` `overrides`. All `uuid` instances deduplicated to `14.0.0`. `npm audit` now reports 0 vulnerabilities. `--force` downgrade path avoided.                                                                        | #133                                                                                                       |
| 2026-05-16 | CodeQL workflow added (`.github/workflows/codeql.yml`): `security-extended` queries on every push/PR + weekly schedule. SARIF results upload to the Security tab. Dependabot will SHA-pin the `github/codeql-action` references.                                                                                                          | this PR                                                                                                    |
| 2026-05-16 | Firestore rules unit tests: `tests/rules/` suite (40+ assertions) covers all four collections; CI step 10 runs them via `firebase emulators:exec --project demo-fitness-rpg`.                                                                                                                                                             | this PR                                                                                                    |
| 2026-05-16 | Confirmed automated Firestore rules deploy was already live in CI step 11 (documented in CI.md since initial CI setup); removed from outstanding backlog.                                                                                                                                                                                 | CI step 11                                                                                                 |
| 2026-05-08 | Dependency hygiene: bumped `next` 14 → 15.5.18 (closes 5 GHSAs on Next.js); added `overrides` blocks to root + `functions/` `package.json` pinning `tar`, `glob`, `@tootallnate/once`, `postcss` to patched versions (closes 9 transitive GHSAs in the firebase-tools and firebase-admin dev chains). Both `npm audit` outputs now clean. | [#26](https://github.com/Spike450x/FitQuest/pull/26) + this PR                                             |
| 2026-05-03 | CI third-party actions pinned to commit SHAs; `permissions: contents: read` added to `ci.yml`.                                                                                                                                                                                                                                            | [#15](https://github.com/Spike450x/FitQuest/pull/15) `a81e8ad`                                             |
| 2026-05-03 | `.gitattributes` added for LF line-ending normalization across the repo.                                                                                                                                                                                                                                                                  | [#14](https://github.com/Spike450x/FitQuest/pull/14) `68964e4`                                             |
| 2026-05-03 | `SECURITY.md` published (vulnerability reporting policy + safe harbor) and this hardening checklist.                                                                                                                                                                                                                                      | [#13](https://github.com/Spike450x/FitQuest/pull/13) `abd984e`                                             |
| 2026-05-03 | Firestore rules: field-level validation, `level` 1–100 cap, immutable `uid`/`class`/`createdAt`/`itemDefId`/`acquiredAt`, 10-min `loggedAt` window (blocks backdated streak gaming), write-once `completedAt`/`claimedAt` on quests.                                                                                                      | [`docs/CHANGELOG.md`](CHANGELOG.md#2026-05-03--type-renames--correctness-fixes--firestore-rules-hardening) |
| 2026-05-03 | Firebase admin / service-account file patterns (`*-firebase-adminsdk-*.json`, `*service-account*.json`) added to `.gitignore`.                                                                                                                                                                                                            | [`docs/CHANGELOG.md`](CHANGELOG.md#2026-05-03--workflow--instructions-hardening)                           |
| 2026-05-03 | Husky `pre-push` hook blocks direct pushes to `master`; husky `pre-commit` runs lint-staged + typecheck + vitest.                                                                                                                                                                                                                         | [#10](https://github.com/Spike450x/FitQuest/pull/10) `c065b1a`                                             |
| 2026-05-03 | Branch protection on `master` enabled requiring the `Typecheck, Lint, Test` check (GitHub-side).                                                                                                                                                                                                                                          | [`docs/CHANGELOG.md`](CHANGELOG.md#2026-05-03--prettier-ci-build-repo-polish)                              |

---

## `FIREBASE_TOKEN` Rotation

The `FIREBASE_TOKEN` secret is a long-lived Firebase CI token used by the CI auto-deploy steps (Firestore rules and Cloud Functions). It does not expire automatically, but should be rotated if:

- A team member with Firebase access leaves
- The token is accidentally exposed (e.g., printed in CI logs)
- As a periodic security hygiene measure

**To rotate:**

1. Generate a new token locally:

   ```bash
   npx firebase-tools login:ci   # opens browser → outputs a new CI token
   ```

2. Update the secret: **Settings → Secrets and variables → Actions → `FIREBASE_TOKEN` → Update**.
3. Revoke the old token in the [Firebase Console](https://console.firebase.google.com/) under **Project settings → Service accounts** if applicable, or via `firebase logout --token <old-token>`.
4. Trigger a master push (or re-run the last CI workflow) to confirm both deploy steps succeed with the new token.

**Failure signature:** if the token is expired or invalid, steps 12 and 13 (`Deploy Firestore rules` and `Deploy Cloud Functions`) will both fail on master push with a Firebase authentication error. No other CI steps are affected.

---

## Cloud Functions Secrets — health-data integration (Strava + Garmin)

The health-data integration (see [HEALTH-INTEGRATION.md](HEALTH-INTEGRATION.md)) is the first feature to use **Firebase Functions secrets** (`defineSecret` / Google Secret Manager) rather than `NEXT_PUBLIC_*` env vars. Each provider has its own secret set; the functions degrade safely (callable throws `failed-precondition`; webhook no-ops) until provisioned.

**Strava (works today):**

| Secret / param         | Used by                                  | Purpose                                                                       |
| ---------------------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| `STRAVA_CLIENT_ID`     | `createStravaAuthUrl`, callback, webhook | Strava OAuth2 client id                                                       |
| `STRAVA_CLIENT_SECRET` | `stravaOAuthCallback`, `stravaWebhook`   | OAuth client secret (also used for the 6-hour token refresh)                  |
| `STRAVA_VERIFY_TOKEN`  | `stravaWebhook`                          | Echoed in the subscription-validation handshake; rejects stray GETs           |
| `STRAVA_REDIRECT_URI`  | callback + authorize URL (param)         | Deployed `stravaOAuthCallback` URL; its domain = Strava app's callback domain |

**Garmin (pending enterprise approval):** Three secrets + one non-secret param back it —

| Secret / param         | Used by                               | Purpose                                                                                           |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `GARMIN_CLIENT_ID`     | `createGarminAuthUrl`, OAuth callback | Garmin OAuth 2.0 PKCE client id                                                                   |
| `GARMIN_CLIENT_SECRET` | `garminOAuthCallback`                 | OAuth client secret (server-side only — never shipped to the client)                              |
| `GARMIN_WEBHOOK_TOKEN` | `garminWebhook`                       | Shared secret carried as `?token=` in the registered Push callback URL (Garmin push isn't signed) |
| `GARMIN_REDIRECT_URI`  | callback + authorize URL (param)      | The deployed `garminOAuthCallback` URL; must be whitelisted verbatim in the Garmin portal         |

**Set them with:**

```bash
firebase functions:secrets:set GARMIN_CLIENT_ID
firebase functions:secrets:set GARMIN_CLIENT_SECRET
firebase functions:secrets:set GARMIN_WEBHOOK_TOKEN
# GARMIN_REDIRECT_URI is a non-secret param — set in functions/.env or the console
```

Secrets are versioned in Secret Manager and injected at runtime — **not** in source, CI env, or `.env*`. The functions degrade safely when unset (the callable throws `failed-precondition`; the webhook acknowledges without processing), so the scaffold is inert until provisioned.

**OAuth token custody:** Garmin-direct means **we hold the user's OAuth tokens.** They are written to the **server-only** `healthTokens` collection (and the short-lived PKCE verifier to `healthOAuthStates`), both denying **all** client access in `firestore.rules` — tokens never reach the browser. Rotate `GARMIN_WEBHOOK_TOKEN` if the Push callback URL is exposed (then update the URL in the Garmin portal).

---

### Outstanding hardening (not yet shipped)

For each item below, when it ships, add a row to the Remediations Log above.

- **Private vulnerability reporting** — section 7 toggle, no code required. Enable at **Settings → Code security → Private vulnerability reporting**. Once enabled, a **Report a vulnerability** button appears on the repo's Security tab alongside the `SECURITY.md` policy.

---

## Known devDependency Vulnerabilities

No outstanding known vulnerabilities as of 2026-06-01. `npm audit` reports 0 vulnerabilities in both the root and `functions/` manifests.

**CI behaviour:** `scripts/audit-check.mjs` (invoked in `.github/workflows/ci.yml`) blocks the build on any high/critical vulnerability and logs moderate/low ones as warnings. The script does not currently distinguish dev-only from prod-only chains (the npm audit JSON does not expose a top-level dev flag), so a high/critical vuln anywhere — including dev-only — will fail CI. This is intentionally conservative.

**Last reviewed:** 2026-06-01

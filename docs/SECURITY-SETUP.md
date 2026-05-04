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

---

## Verification

After completing the steps above:

- The **Security** tab on the repository should show the policy from `SECURITY.md` and a green checkmark for secret scanning.
- A test direct push to `master` (e.g., `git push origin master:master` from a clean clone) should be rejected by GitHub with a branch-protection error.
- A test PR with an obvious dummy secret in the diff should be blocked by push protection at commit time.
- The **Insights → Dependency graph → Dependabot** view should list both alerts and version-update PRs.

Re-run this checklist any time the repository changes ownership or moves between organizations.

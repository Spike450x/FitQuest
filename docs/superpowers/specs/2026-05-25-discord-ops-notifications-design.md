# Discord Ops Notifications — Design Spec

**Date:** 2026-05-25  
**Status:** Shipped — 2026-05-25 (`.github/actions/discord-notify`, wired into `ci.yml`, `bundle-gate.yml`, `deploy-announce.yml`, `scheduled-e2e.yml`)  
**Scope:** GitHub Actions CI infra only — no application code changes

---

## Overview

Add two operational Discord notification streams to the FitQuest CI pipeline:

1. **Bundle size regression gate** — warns on PRs that grow the JS bundle >10%
2. **Deploy announcement** — posts a rich embed to Discord on every successful master push

Both are built on a refactored general-purpose `discord-notify` action that replaces the current Playwright-specific implementation. A single `DISCORD_WEBHOOK_URL` secret routes all notifications to one channel.

---

## Architecture

```
ci.yml (push to master)
  └─ build → bundle-stats.mjs --write → commit baseline → push

bundle-gate.yml (pull_request → master)
  └─ build → bundle-stats.mjs --compare → discord-notify (on regression only)

deploy-announce.yml (workflow_run: CI completed success on master)
  └─ extract commit info → discord-notify

scheduled-e2e.yml (daily cron)
  └─ ... → format-playwright-results step → discord-notify (unchanged behaviour)

.github/actions/discord-notify/   ← refactored: general-purpose embed poster
scripts/bundle-stats.mjs          ← new: reads .next/static/, writes/compares baseline
docs/bundle-baseline.json         ← new: committed baseline file, updated on master push
```

---

## Component 1: Refactored `discord-notify` action

### Purpose

General-purpose Discord embed poster. Replaces the Playwright-coupled implementation.

### Inputs

| Input         | Required | Description                                                                 |
| ------------- | -------- | --------------------------------------------------------------------------- |
| `webhook-url` | yes      | `secrets.DISCORD_WEBHOOK_URL`                                               |
| `title`       | yes      | Embed heading                                                               |
| `description` | no       | Body text below the title                                                   |
| `color`       | no       | Discord color as decimal integer. If omitted, derived from `status`.        |
| `fields`      | no       | JSON array string: `[{"name":"…","value":"…","inline":true}]`               |
| `status`      | no       | `success \| failure \| cancelled` — auto-selects color when `color` omitted |

### Color constants (defined in `notify.mjs`)

| Status / use     | Color name | Decimal      |
| ---------------- | ---------- | ------------ |
| success / deploy | Green      | `3_900_732`  |
| failure          | Red        | `15_746_117` |
| cancelled        | Grey       | `9_807_270`  |
| bundle warning   | Orange     | `16_426_522` |

### `notify.mjs` implementation

- Receives all inputs via env vars
- Parses `fields` JSON if present
- Constructs Discord embed payload
- Posts via `fetch` (Node 18+ built-in) — no npm dependencies
- Exits non-zero on HTTP error

### `scheduled-e2e.yml` changes

A new step before the `discord-notify` call reads `test-results/results.json`, formats pass/fail counts and top 3 failures into a `fields` JSON string, and writes it to `$GITHUB_OUTPUT`. The discord-notify step then receives `fields` from that output. Notification content is identical to today — only the plumbing changes.

---

## Component 2: `scripts/bundle-stats.mjs`

### Purpose

Single script with two modes: write a baseline on master, compare against it on PRs.

### Measurement

Recursively sums file sizes under:

- `.next/static/chunks/` → `totalJsBytes`
- `.next/static/css/` → `totalCssBytes`

### `--write` mode

1. Reads `.next/static/` sizes
2. Writes `docs/bundle-baseline.json`:

```json
{
  "updatedAt": "2026-05-25T08:00:00Z",
  "commit": "abc1234",
  "totalJsBytes": 462000,
  "totalCssBytes": 38000
}
```

3. Exits 0

### `--compare` mode

1. Reads `docs/bundle-baseline.json`. If the file does not exist (first run before any master push), logs a warning and exits 0 — the check is skipped gracefully rather than blocking the feature PR that introduced it. The baseline is created when that PR merges to master.
2. Reads current `.next/static/` sizes
3. Computes delta percentage for JS and CSS separately
4. Writes comparison summary to `$GITHUB_OUTPUT` as pre-formatted Discord fields
5. Logs a human-readable table to stdout (visible in CI logs regardless of Discord)
6. Exits `1` if JS delta exceeds `REGRESSION_THRESHOLD_PCT = 10`; CSS warnings are logged but never block

### Regression threshold

`REGRESSION_THRESHOLD_PCT` is a named constant at the top of the script. Default: `10`.

---

## Component 3: `ci.yml` changes (master push path only)

After the existing build step, on `push` to `master`:

```yaml
- name: Update bundle baseline
  if: github.ref == 'refs/heads/master'
  run: node scripts/bundle-stats.mjs --write

- name: Commit baseline if changed
  if: github.ref == 'refs/heads/master'
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git diff --quiet docs/bundle-baseline.json || (
      git add docs/bundle-baseline.json &&
      git commit -m "chore: update bundle baseline [skip ci]" &&
      git push
    )
```

`permissions: contents: write` added to the job.

The `[skip ci]` suffix and `github-actions[bot]` authorship together prevent infinite workflow loops.

---

## Component 4: `bundle-gate.yml` (new workflow)

**Trigger:** `pull_request` targeting `master`

**Steps:**

1. Checkout
2. Setup Node 24 + cache npm
3. `npm ci`
4. `npm run build`
5. `node scripts/bundle-stats.mjs --compare`
   - Sets step output `fields` on completion (pass or fail)
   - Exits 1 on regression → fails the check
6. Post Discord warning (only if step 5 failed, via `if: failure()`):
   - Orange embed, title: "Bundle regression detected"
   - Fields from step 5 output
   - Link to the failing run

**Permissions:** `contents: read`

---

## Component 5: `deploy-announce.yml` (new workflow)

**Trigger:**

```yaml
on:
  workflow_run:
    workflows: ['CI']
    types: [completed]
    branches: [master]
```

Job runs only when `github.event.workflow_run.conclusion == 'success'`.

**Steps:**

1. Checkout at `github.event.workflow_run.head_sha`
2. Extract commit metadata (inline shell):
   - `TITLE` — `git log -1 --format=%s` (squash merge = PR title)
   - `AUTHOR` — `git log -1 --format=%an`
   - `SHORT_SHA` — first 7 chars of head SHA
   - `FILES_CHANGED` — `git diff --name-only HEAD~1 HEAD | wc -l | tr -d ' '`
   - `RUN_URL` — `github.event.workflow_run.html_url`
3. Format into `fields` JSON string (inline)
4. Post green Discord embed via `discord-notify`:
   - Title: `Shipped: {TITLE}`
   - Fields: Author · SHA · Files changed · CI run link

**Permissions:** `contents: read`

---

## Security

- Single secret: `DISCORD_WEBHOOK_URL` — already exists in the repo
- No new secrets required
- `ci.yml` needs `contents: write` on the master-push job only (baseline commit)
- All other new workflows use `contents: read`
- No application secrets or Firebase credentials involved

---

## What is not changing

- The scheduled E2E notification content and channel are unchanged
- The CI failure notification on master push is unchanged
- No application code, game logic, or Firestore schema changes
- No new npm dependencies (script uses Node built-ins + `fs`, `path`)

---

## Success criteria

- [ ] PRs that grow JS bundle >10% get a failed check + orange Discord warning
- [ ] PRs with no regression pass silently (no Discord noise)
- [ ] Every successful master push triggers a rich Discord embed within ~30s of CI completing
- [ ] Daily E2E Discord notifications are visually and functionally identical to today
- [ ] `docs/bundle-baseline.json` is committed and up to date after each master push
- [ ] No new npm dependencies introduced

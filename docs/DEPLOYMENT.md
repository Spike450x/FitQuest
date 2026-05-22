# FitQuest — Deployment Runbook

Reference for deploying the Firebase backend (Firestore rules, indexes, and Cloud Functions). The Next.js frontend has no production hosting target yet — this document covers the Firebase-side deploy only.

Pair with [CI.md](CI.md) for the automated checks that gate every deploy and [SECURITY-SETUP.md](SECURITY-SETUP.md) for the hardening context behind the deploy order.

---

## What "deploy" means today

FitQuest has two deployable artifacts:

| Artifact                       | Deployed by                                                              | Command                                                    |
| ------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `firestore.rules`              | CI auto-deploy on every master push (CI step 15)                         | `firebase deploy --only firestore:rules,firestore:indexes` |
| `firestore.indexes.json`       | CI auto-deploy step 15 (combined with rules)                             | `firebase deploy --only firestore:rules,firestore:indexes` |
| Cloud Functions (`functions/`) | CI step 16 auto-deploys when `functions/` files change; manual otherwise | `firebase deploy --only functions --force`                 |

**Firestore rules and indexes are auto-deployed together** on every master push (CI step 15). Any rules or index change merged to master is live within minutes. You do not normally need to deploy either manually.

**Cloud Functions are conditionally auto-deployed.** CI step 16 deploys when files under `functions/` changed in the push; skipped on frontend-only pushes. Use `deploy:prod` for a forced full deploy.

---

## Pre-deploy checklist

Run through this before any manual deploy (`deploy:prod`):

- [ ] `npm run typecheck` passes (root + `cd functions && npx tsc --noEmit`)
- [ ] `npm run lint` passes
- [ ] `npm test` passes (game-logic unit suite)
- [ ] `npm run test:rules` passes with the emulator running (Firestore rules tests)
- [ ] `npm run validate:indexes` passes (validates `firestore.indexes.json` schema)
- [ ] `npm run build` or `npm run build:ci` passes (confirms no RSC/Next.js build errors)
- [ ] You are on the latest `master` commit: `git status` clean, `git log origin/master..HEAD` empty
- [ ] The active Firebase project is correct: `npx firebase use` → should show `fitness-rpg-claude`

---

## Deploying

### Standard full deploy (indexes → rules → functions)

```bash
npm run deploy:prod
```

This script (`package.json` → `"deploy:prod"`) runs in order:

1. `node scripts/validate-firestore-indexes.mjs` — validates the index schema before touching production
2. `npx firebase deploy --only firestore:indexes,firestore:rules` — indexes and rules first
3. `npx firebase deploy --only functions --force` — Cloud Functions second (`--force` suppresses `minInstances` billing prompt)

**The ordering is not optional.** The Cloud Functions query composite indexes — `logActivity` uses `(uid, type, loggedAt)` and `claimCombatVictory` uses `(uid, loggedAt DESC)` on `combatLogs`. If you deploy a function before the index it depends on is ready, it will throw `FAILED_PRECONDITION` on every call until the index finishes building (which can take several minutes on an active dataset).

### Rules-only (hotfix path)

When fixing a rules bug without changing functions or indexes:

```bash
npx firebase deploy --only firestore:rules --project fitness-rpg-claude
```

This is safe at any time — rules are applied atomically and the old rules remain active until the new ones are fully propagated.

### Functions-only (no schema change)

When the function logic changes but no new indexes are needed:

```bash
cd functions && npm run build && cd ..
npx firebase deploy --only functions --force --project fitness-rpg-claude
```

Build the functions first to catch TypeScript errors before they go to production.

---

## Post-deploy verification

After any function deploy, confirm all three callable functions are healthy:

```bash
npx firebase functions:log --project fitness-rpg-claude --limit 20
```

Or via the Firebase MCP in Claude Code:

```bash
firebase functions get_logs
```

Look for: no `INTERNAL` or `FAILED_PRECONDITION` errors in the first 1–2 minutes after deploy. If you see `FAILED_PRECONDITION`, the composite index is still building — wait and recheck. Currently deployed callables:

- `logActivity` — server-authoritative activity log + daily cap enforcement + mastery / restore writes
- `claimDungeonRun` — atomic dungeon-run XP/gold/item award + achievement gold
- `claimCombatVictory` — server-authoritative combat-win XP/gold award with diminishing-returns multiplier (P0-3)

Run the manual smoke test ([SMOKE-TEST.md](SMOKE-TEST.md)) after any deploy that touches the auth flow or a Cloud Function the UI calls.

---

## Rollback

### Functions rollback

Firebase does not have a one-command rollback. Options:

1. **Redeploy the previous commit's functions:** `git checkout <previous-sha> -- functions/src/` → rebuild → `npx firebase deploy --only functions`
2. **Revert on master:** Create a PR that reverts the change, merge it, let CI gate it, then deploy.

Option 2 is preferred — it keeps the git history clean and goes through CI.

### Rules rollback

Rules are deployed from `firestore.rules` in the repo. The fastest rollback is to `git show <previous-sha>:firestore.rules > firestore.rules` and deploy:

```bash
npx firebase deploy --only firestore:rules --project fitness-rpg-claude
```

This is safe to do without going through CI — rules have no build step.

### Index rollback

Indexes cannot be rolled back cleanly. Deleting an index requires the Function that depends on it to also be stopped or reverted. If an index is mistakenly deployed, leave it in place until you are ready to redeploy the associated function without it.

---

## Environment

| Variable                 | Where set                           | Purpose                                                          |
| ------------------------ | ----------------------------------- | ---------------------------------------------------------------- |
| `FIREBASE_TOKEN`         | GitHub Actions secret               | CI auto-deploy — rules/indexes (step 15) and functions (step 16) |
| `NEXT_PUBLIC_FIREBASE_*` | `.env.local` (gitignored)           | Firebase client config for dev                                   |
| `NEXT_PUBLIC_FIREBASE_*` | `.env.ci` (committed, dummy values) | Prevents build from connecting to real Firebase during CI        |

Never commit `.env.local`. The `.env.ci` file contains intentionally non-functional values so the Next.js build succeeds in CI without live Firebase credentials.

---

## Future: hosting

When a hosting platform is chosen, extend this document with:

- Which platform (Vercel, Firebase Hosting, etc.)
- Environment variable management (platform dashboard, not `.env.local`)
- Preview deployment strategy per PR
- Production promotion workflow
- Rollback path for frontend deploys

---

## Cross-references

- **CI pipeline (automated checks + rules auto-deploy)** → [CI.md](CI.md)
- **Security hardening decisions** → [SECURITY-SETUP.md](SECURITY-SETUP.md)
- **Manual smoke test** → [SMOKE-TEST.md](SMOKE-TEST.md)
- **Firestore schema + index documentation** → [FIRESTORE.md](FIRESTORE.md)

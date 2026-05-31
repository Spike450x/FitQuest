# FitQuest — Deployment Runbook

Reference for deploying the FitQuest stack: the Next.js frontend on **Vercel** and the Firebase backend (Firestore rules, indexes, Cloud Functions).

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

Look for: no `INTERNAL` or `FAILED_PRECONDITION` errors in the first 1–2 minutes after deploy. If you see `FAILED_PRECONDITION`, the composite index is still building — wait and recheck. Currently deployed functions:

**Core game callables (`onCall`):**

- `logActivity` — server-authoritative activity log + daily cap enforcement + mastery / restore / achievement writes (thin wrapper over the shared `logActivityCore`)
- `claimDungeonRun` — atomic dungeon-run XP/gold/item award + achievement gold
- `claimCombatVictory` — server-authoritative combat-win XP/gold award with diminishing-returns multiplier (P0-3)

**Health-integration functions (feature-flagged; inert until their secrets are set — see below):**

- `createStravaAuthUrl` / `createGarminAuthUrl` (`onCall`) — start the provider OAuth flow
- `stravaOAuthCallback` / `garminOAuthCallback` (`onRequest` HTTP) — code → token exchange; store tokens server-side
- `stravaWebhook` / `garminWebhook` (`onRequest` HTTP) — provider push ingestion → `logActivityCore`

The 6 health functions only do real work once their secrets exist; until then they are deployed but dormant, and `NEXT_PUBLIC_HEALTH_SYNC_ENABLED` keeps the client UI hidden. See [HEALTH-INTEGRATION.md](HEALTH-INTEGRATION.md) for the provisioning runbook.

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

| Variable                          | Where set                           | Purpose                                                          |
| --------------------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| `FIREBASE_TOKEN`                  | GitHub Actions secret               | CI auto-deploy — rules/indexes (step 15) and functions (step 16) |
| `NEXT_PUBLIC_FIREBASE_*`          | `.env.local` (gitignored)           | Firebase client config for dev                                   |
| `NEXT_PUBLIC_FIREBASE_*`          | `.env.ci` (committed, dummy values) | Prevents build from connecting to real Firebase during CI        |
| `NEXT_PUBLIC_HEALTH_SYNC_ENABLED` | `.env.local` / Vercel               | Feature flag — gates the `/profile/connections` health-sync UI. Off by default. |

Never commit `.env.local`. The `.env.ci` file contains intentionally non-functional values so the Next.js build succeeds in CI without live Firebase credentials.

### Cloud Functions secrets (health integration)

The health-integration functions are the repo's **first use of Firebase Functions secrets** — they are not env vars in `.env.local`; they live in Google Secret Manager and are bound to the functions at deploy time. The functions are deployed but dormant until these are set:

| Secret                                              | Provider | Purpose                                            |
| --------------------------------------------------- | -------- | -------------------------------------------------- |
| `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET`         | Strava   | OAuth2 app credentials                             |
| `STRAVA_VERIFY_TOKEN`                               | Strava   | Webhook subscription-validation handshake token    |
| `STRAVA_REDIRECT_URI`                               | Strava   | OAuth callback URL (the deployed `stravaOAuthCallback` HTTP fn) |
| `GARMIN_CLIENT_ID` / `GARMIN_CLIENT_SECRET`         | Garmin   | OAuth 2.0 PKCE app credentials (enterprise-gated)  |
| `GARMIN_WEBHOOK_TOKEN`                              | Garmin   | Webhook push verification (enterprise-gated)       |

Set each with:

```bash
firebase functions:secrets:set STRAVA_CLIENT_ID --project fitness-rpg-claude
```

Then redeploy functions so the bindings take effect. **Strava is the works-today free path** (no approval needed); **Garmin waits on enterprise Developer Program approval** plus the post-approval endpoint/payload constants flagged in the code. Full step-by-step in [HEALTH-INTEGRATION.md](HEALTH-INTEGRATION.md) §7 (Strava) / §8 (Garmin).

---

## Frontend hosting — Vercel

The Next.js frontend is hosted on Vercel. Vercel auto-detects the framework, runs `next build`, and serves the static + serverless output. The `/functions` directory and other backend assets are excluded via `.vercelignore`.

### First-time setup (one-time, ~5 minutes)

1. **Create the project on Vercel.** Visit <https://vercel.com/new>, sign in with GitHub, choose the `Spike450x/FitQuest` repo, click **Import**.
2. **Framework Preset** — confirm Vercel auto-selected **Next.js**. Leave Build/Output/Install commands at their defaults (`next build` / `.next` / `npm install`).
3. **Root Directory** — `.` (repo root).
4. **Node.js Version (Settings → General).** Vercel reads `engines.node: ">=24.0.0"` from `package.json`. If Vercel doesn't support Node 24 yet, set Node Version to **22.x** in the Vercel project settings — the codebase runs on 22 (CI uses 24 but it is not a strict requirement). No code change needed.
5. **Environment variables (Settings → Environment Variables).** Copy each value from your local `.env.local` into Vercel for **Production**, **Preview**, and **Development** scopes:

   | Variable                                   | Source                              |
   | ------------------------------------------ | ----------------------------------- |
   | `NEXT_PUBLIC_FIREBASE_API_KEY`             | Firebase Console → Project Settings |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Firebase Console → Project Settings |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Firebase Console → Project Settings |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Firebase Console → Project Settings |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console → Project Settings |
   | `NEXT_PUBLIC_FIREBASE_APP_ID`              | Firebase Console → Project Settings |

   These are all `NEXT_PUBLIC_*` so they are baked into the browser bundle — safe to expose (Firebase keys are not secrets; access control lives in `firestore.rules`).

6. **Deploy.** Click **Deploy**. First build takes ~2–3 minutes. Vercel will assign a domain like `fitquest-<hash>.vercel.app`.

7. **Whitelist the Vercel domain in Firebase Auth.** Without this step, sign-in will fail with `auth/unauthorized-domain`.
   - Firebase Console → **Authentication** → **Settings** → **Authorized domains** → **Add domain**
   - Add both: the auto-assigned `*.vercel.app` domain **and** any custom domain you map later.

### Per-PR preview deployments

Vercel automatically creates a preview deployment for every PR. The preview URL appears in a bot comment on the PR within ~2 minutes of push. Each preview is a fully isolated Vercel deployment — safe to share for manual QA from a phone.

**Preview deploys share the production Firebase project.** Be careful: any writes during preview testing land in the same Firestore the production app reads. Use a throwaway test character.

### Production promotion

Vercel treats `master` as the production branch by default. Every merge to `master` triggers a production deploy automatically (no separate promote step). The previous deployment stays running until the new one passes health checks, so there is no downtime.

### Frontend rollback

Vercel keeps every deployment. To roll back:

1. **Dashboard:** Project → Deployments → find the last known-good deployment → ⋯ menu → **Promote to Production**. Takes ~10 seconds.
2. **CLI:** `npx vercel rollback <deployment-url> --prod`

Frontend rollback does **not** touch Firestore or Cloud Functions — if the bad release also changed schema/rules/functions, roll those back separately per the sections above.

### Installing the PWA on a phone

After the first deploy:

1. Open the Vercel URL in **Safari (iOS)** or **Chrome (Android)** on your phone.
2. iOS: tap **Share → Add to Home Screen.** Android: tap menu (⋮) → **Install app** (the prompt may also auto-appear).
3. The app launches full-screen with the FitQuest icon. The PWA manifest is generated by `src/app/manifest.ts` via Next.js's metadata API — no extra config needed.

### Things that do **not** carry over from local dev

- The local Firebase emulator hosts (`127.0.0.1:9099/8080/5001`) are intentionally listed in the CSP `connect-src` even in production. They are harmless — a real browser cannot reach an attacker's loopback. See the comment block in `next.config.mjs`.
- `npm run dev` features (Fast Refresh, Turbopack) are dev-only. Production runs the optimized `next start` server output that Vercel manages.

---

## Cross-references

- **CI pipeline (automated checks + rules auto-deploy)** → [CI.md](CI.md)
- **Security hardening decisions** → [SECURITY-SETUP.md](SECURITY-SETUP.md)
- **Manual smoke test** → [SMOKE-TEST.md](SMOKE-TEST.md)
- **Firestore schema + index documentation** → [FIRESTORE.md](FIRESTORE.md)
- **Health-data integration design + provisioning runbook** → [HEALTH-INTEGRATION.md](HEALTH-INTEGRATION.md)

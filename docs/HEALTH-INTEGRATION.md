# FitQuest — Health-Data Integration (Garmin)

Auto-log real workouts, runs, steps and sleep from a Garmin device instead of
typing them in. This document is the design spec **and** the operations runbook
for the integration on the `claude/health-data-integration-NWLGo` branch.

Status: **scaffold landed, feature-flagged off.** Everything network-dependent
is gated behind `NEXT_PUBLIC_HEALTH_SYNC_ENABLED` and Cloud Functions secrets.
The pure logic (mapping, dedupe, PKCE) is implemented and unit-tested; turning
it on is an ops task (get Garmin Developer approval, set secrets, register the
push callbacks), not a code task.

---

## 1. Why Garmin-direct (free)

FitQuest is a web app / PWA on Firebase. That constraint decides the approach:

| Source                      | Reachable from the web app?                                              | Cost                                                           |
| --------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| **Apple Health**            | ❌ No — HealthKit is on-device only; needs a native iOS/Capacitor shell. | —                                                              |
| **Garmin (direct)**         | ✅ Yes — real server-to-server OAuth 2.0 + push webhooks.                | **Free** (Developer Program has no licensing/maintenance fee). |
| **Aggregator (Terra/Rook)** | ✅ Yes — covers 50+ providers in one integration.                        | Paid (~$249–$499/mo); no free tier.                            |

We chose **Garmin-direct**: $0, fits the architecture, and the ingestion core
below is provider-neutral so a paid aggregator or a second provider can be added
later as a thin adapter without touching the reward path.

---

## 2. Architecture

```
User → /profile/connections (feature-flagged)
     → createGarminAuthUrl (onCall)  → mint PKCE verifier+state, stash server-side
     → browser → Garmin authorize page (user logs in, approves)
     → Garmin → garminOAuthCallback (onRequest)
                ├─ consume state → exchange code for tokens (PKCE)
                ├─ fetch Garmin userId
                ├─ store tokens in healthTokens (SERVER-ONLY)
                ├─ upsert healthConnections (tokenless, client-readable)
                └─ redirect back to /profile/connections?connected=1
     ... later, when the user syncs their device ...
Garmin → garminWebhook (onRequest "Push")
        ├─ verify ?token=GARMIN_WEBHOOK_TOKEN (push is NOT HMAC-signed)
        ├─ mapGarminPayload(body)  → owner-tagged [{ activityType, amount, … }]  (pure)
        ├─ resolve uid via healthTokens (garminUserId → uid)
        ├─ dedupe (event id / daily delta)                                        (pure)
        └─ logActivityCore(uid, …)  ← SHARED with the manual logActivity onCall
```

The keystone is **`functions/src/logActivityCore.ts`**: the authoritative write
sequence (server-side daily-cap query → log write → mastery milestone → resource
restore → achievement evaluation), extracted from the `logActivity` callable so
both the manual form and the webhook run _identical_ logic. A Garmin-synced run
earns exactly the same Agility mastery, restore, quests, streaks and achievements
as a hand-typed one.

### Files

**Cloud Functions (`functions/src/`)**

- `logActivityCore.ts` — shared write sequence (provider-agnostic).
- `gameLogic/healthShared.ts` — shared `MappedActivity` + clamp/round helpers.
- `gameLogic/garminMapping.ts` — pure Garmin push payload → `MappedActivity[]`.
- `gameLogic/healthDedupe.ts` — pure idempotency keys + daily-delta math.
- `garminOAuth.ts` — pure OAuth 2.0 PKCE helpers + Garmin endpoint constants.
- `garminConnect.ts` — `createGarminAuthUrl` (onCall) + `garminOAuthCallback` (onRequest).
- `garminWebhook.ts` — `onRequest` push ingestion.
- `healthTokens.ts` — server-only token + PKCE-state store.
- `healthConnections.ts` — tokenless connection upsert.
- `index.ts` — exports the three Garmin functions; `logActivity` refactored onto the core.

**Client (`src/`)**

- `lib/health.ts` — `createGarminAuthUrl` wrapper + `HEALTH_SYNC_ENABLED` flag.
- `lib/healthData.ts` — `subscribeToHealthConnections` + normalizer.
- `hooks/useHealthConnections.ts` — live connection list (no-op when flag off).
- `app/(game)/profile/connections/page.tsx` — Connect Garmin UI.
- `types/index.ts` — `ActivityLog.source?`, `HealthConnection`.
- `types/cloudFunctions.ts` — `CreateGarminAuthUrl*`.

---

## 3. Data mapping (v1)

| Garmin push record | Condition                | FitQuest activity | Amount                                |
| ------------------ | ------------------------ | ----------------- | ------------------------------------- |
| `activities[]`     | `distanceInMeters` ≥ 400 | `run`             | miles (`distanceInMeters / 1609.344`) |
| `activities[]`     | otherwise                | `workout`         | minutes (`durationInSeconds / 60`)    |
| `dailies[]`        | `steps > 0`              | `steps`           | cumulative daily steps                |
| `sleeps[]`         | `durationInSeconds > 0`  | `sleep`           | hours                                 |

All amounts are clamped to `ACTIVITY_AMOUNT_MAX`. Heuristics are intentionally
simple; refining by `activityType` (walking→steps, naps, etc.) is a follow-up.

---

## 4. De-duplication

Garmin re-pushes data and daily counters grow all day. Two idempotency models:

- **Discrete sessions (`event`)** — a run / workout / sleep. The `summaryId` is
  stable, so the log doc id `${uid}_garmin_${summaryId}` makes a redelivery a
  no-op Firestore `set`.
- **Cumulative counters (`daily`, steps)** — a `healthDailySnapshots` doc keyed
  by `${uid}_garmin_${day}_steps` stores the last cumulative value; each push
  transactionally logs only the **positive delta**. The day's summed step-logs
  equal the latest total — no double-count — and the daily cap still clamps.

Backdated data is handled: `logActivityCore` derives the cap window from each
log's own `loggedAt` (Garmin `startTimeInSeconds`), so it counts to the right day.

---

## 5. Security

- **We hold OAuth tokens** (unlike an aggregator). Access/refresh tokens live in **`healthTokens`** and the short-lived PKCE verifier in **`healthOAuthStates`** — both **deny all client access** in `firestore.rules`. The client-readable `healthConnections` doc holds only status/provider/lastSync — **never tokens**.
- **PKCE** (S256) protects the auth-code exchange. `state` is a one-shot CSRF
  token consumed (read-and-deleted) in the callback.
- **Push auth** — Garmin push is **not** signed, so `garminWebhook` requires a
  secret `?token=GARMIN_WEBHOOK_TOKEN` in the registered callback URL **and**
  only ingests records whose `garminUserId` maps to a stored connection.
- **CSP** — unchanged. The connect flow is a full-page nav to a Garmin URL; the
  webhook/callback are inbound.

---

## 6. Game balance

v1 **keeps caps and reward rules unchanged** — a synced log earns the same
mastery / restore / achievements as a manual one, just auto-filled. Synced logs
carry `source: 'garmin'` and show a "⌚ synced" feed badge. A verified-source
XP/trust bonus is deliberately deferred (confirm before any reward divergence).

---

## 7. Operations runbook (enabling it)

### A. Get Garmin Developer access (the long pole — do this first)

1. Apply to the **[Garmin Connect Developer Program](https://developer.garmin.com/gc-developer-program/)** → request **Health API** (and/or Activity API) access. Approval is free but can take ~1–4 weeks.
2. Once approved, from the developer portal note your **Client ID** and **Client Secret** (OAuth 2.0 PKCE).
3. In the portal, you'll also configure **Push** callback URLs per data type (activities, dailies, sleeps) — you set these in step C after deploying.

### B. Set the Cloud Functions secrets + redirect param

Pick a strong random value for the webhook token (e.g. `openssl rand -hex 24`).

```bash
firebase functions:secrets:set GARMIN_CLIENT_ID
firebase functions:secrets:set GARMIN_CLIENT_SECRET
firebase functions:secrets:set GARMIN_WEBHOOK_TOKEN
```

The OAuth callback URL is a non-secret param. After the first deploy you'll know
the function URL; set it (it must match what you register at Garmin verbatim):

```bash
# functions/.env  (or set in the Firebase console → Functions → params)
GARMIN_REDIRECT_URI=https://us-central1-fitness-rpg-claude.cloudfunctions.net/garminOAuthCallback
```

### C. Deploy + register

```bash
firebase deploy --only functions:createGarminAuthUrl,functions:garminOAuthCallback,functions:garminWebhook
firebase deploy --only firestore:rules
```

From the deploy output, copy the URLs for `garminOAuthCallback` and `garminWebhook`. Then in the **Garmin developer portal**:

- Add the **`garminOAuthCallback`** URL to your app's **OAuth redirect URIs** (must equal `GARMIN_REDIRECT_URI`).
- Set the **Push callback URL** for each enabled data type to:
  `https://…/garminWebhook?token=<the GARMIN_WEBHOOK_TOKEN value>`

### D. Flip the flag on the web app (Vercel)

- Vercel → project → **Settings → Environment Variables** → `NEXT_PUBLIC_HEALTH_SYNC_ENABLED = true` (Production) → redeploy.

### E. Smoke-test

See [SMOKE-TEST.md § Health-data sync](SMOKE-TEST.md).

---

## 8. ⚠️ Verify post-approval (constants to confirm)

The exact values below come from the Garmin spec but are only authoritative
inside the approved portal. They're isolated in `garminOAuth.ts` / `garminConnect.ts`
so a fix is one line each:

- `GARMIN_AUTHORIZE_URL` (`connect.garmin.com/oauth2Confirm`)
- `GARMIN_TOKEN_URL` (`diauth.garmin.com/di-oauth2-service/oauth/token`)
- `GARMIN_USER_ID_URL` (`apis.garmin.com/wellness-api/rest/user/id`)
- Token request fields (confidential client: `client_secret` + PKCE `code_verifier`).
- Push payload field names (`summaryId`, `steps`, `distanceInMeters`,
  `durationInSeconds`, `startTimeInSeconds`, `activityType`, `userId`) — confirm
  the `userId` field used for attribution matches what your push payloads carry.

---

## 9. Out of scope (future phases)

- **Apple Health** — needs a Capacitor/native iOS shell.
- **Token refresh + backfill** — Push delivers data directly so v1 needs no
  outbound API calls; add refresh (tokens last ~3 months) when you pull history.
- **Disconnect / deauth** from the UI.
- **Verified-source reward tuning** (see §6) and deeper activity-type mapping.
- **Multi-provider** — the core is provider-neutral; an aggregator/Fitbit/Strava
  adapter would reuse `logActivityCore`, `healthDedupe`, the connections UI.

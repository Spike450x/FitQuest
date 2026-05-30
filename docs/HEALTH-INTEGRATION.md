# FitQuest — Health-Data Integration (Terra)

Auto-log real workouts, runs, steps and sleep from wearables instead of typing
them in. This document is the design spec **and** the operations runbook for the
integration scaffolded in the `claude/health-data-integration-NWLGo` branch.

Status: **scaffold landed, feature-flagged off.** Everything network-dependent
is gated behind `NEXT_PUBLIC_HEALTH_SYNC_ENABLED` and three Cloud Functions
secrets. The pure logic (mapping, dedupe, signature verification) and the full
write path are implemented and unit-tested; flipping it on is an ops task
(create a Terra account, set secrets, register the webhook), not a code task.

---

## 1. Why an aggregator, and why not Apple Health (yet)

FitQuest is a web app / PWA on Firebase. That constraint decides the approach:

| Source                 | Reachable from the web app? | Notes                                                                                                                                                                                                                                                   |
| ---------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Apple Health**       | ❌ No                       | HealthKit has no backend/web API. Data is on-device; reaching it needs a native iOS app or a Capacitor shell. An aggregator does **not** change this.                                                                                                   |
| **Garmin (direct)**    | ✅ Yes                      | Real server-to-server API + webhooks, but Garmin-only and needs per-provider Developer Program approval.                                                                                                                                                |
| **Aggregator (Terra)** | ✅ Yes (chosen)             | One integration → Garmin, Fitbit, Oura, WHOOP, Strava, Google Fit, Polar, Samsung, Withings, Suunto + more. **Terra holds the provider OAuth tokens**, so we store none. Apple Health rides the same integration the day FitQuest ships a native shell. |

We picked **Terra**: maximum device coverage per unit of work, no OAuth-token
custody, and a clean forward path to Apple Health later.

---

## 2. Architecture

```
User → /profile/connections (feature-flagged)
     → createTerraSession (onCall)  → Terra generateWidgetSession (reference_id = uid)
     → browser navigates to Terra-hosted widget → user authorizes their provider
     → Terra stores the OAuth tokens and sends webhooks ─────────────┐
                                                                      ▼
Terra → terraWebhook (onRequest — the repo's FIRST HTTP function)
        ├─ verify `terra-signature` (HMAC-SHA256 over `${t}.${rawBody}`)
        ├─ resolve uid from reference_id (signature-trusted)
        ├─ upsert healthConnections/{uid_provider}
        ├─ mapTerraPayload(payload)      → [{ activityType, amount, unit, … }]  (pure)
        ├─ dedupe (event id / daily delta)                                       (pure)
        └─ logActivityCore(uid, …)  ← SHARED with the manual logActivity onCall
```

The keystone is **`functions/src/logActivityCore.ts`**: the authoritative write
sequence (server-side daily-cap query → log write → mastery milestone → resource
restore → achievement evaluation) extracted out of the `logActivity` callable so
both the manual form and the webhook run _identical_ logic. A Garmin-synced run
earns exactly the same Agility mastery, restore, quests, streaks and achievements
as a hand-typed one. The `logActivity` callable is now a thin auth + validation
wrapper; existing parity/behaviour tests guard the extraction.

### Files

**Cloud Functions (`functions/src/`)**

- `logActivityCore.ts` — shared write sequence (`logActivityCore`, `LogActivityResult`).
- `gameLogic/healthMapping.ts` — pure Terra payload → `MappedActivity[]`.
- `gameLogic/healthDedupe.ts` — pure idempotency keys + daily-delta math.
- `terraSignature.ts` — `verifyTerraSignature(rawBody, header, secret)`.
- `healthConnections.ts` — `resolveUidForConnection`, `upsertConnection`.
- `terraWebhook.ts` — `onRequest` ingestion endpoint.
- `createTerraSession.ts` — `onCall` widget-session generator.
- `index.ts` — exports both new functions; `logActivity` refactored onto the core.

**Client (`src/`)**

- `lib/health.ts` — `createTerraSession` callable wrapper + `HEALTH_SYNC_ENABLED` flag.
- `lib/healthData.ts` — `subscribeToHealthConnections` + normalizer.
- `hooks/useHealthConnections.ts` — live connection list (no-op when flag off).
- `app/(game)/profile/connections/page.tsx` — Connected Devices UI.
- `types/index.ts` — `ActivityLog.source?`, `HealthConnection`.
- `types/cloudFunctions.ts` — `CreateTerraSessionInput/Result`.

---

## 3. Data mapping (v1)

| Terra event                           | Condition          | FitQuest activity | Amount                               |
| ------------------------------------- | ------------------ | ----------------- | ------------------------------------ |
| `activity`                            | distance ≥ 400 m   | `run`             | miles (`distance_meters / 1609.344`) |
| `activity`                            | otherwise          | `workout`         | minutes (`activity_seconds / 60`)    |
| `daily`                               | `steps > 0`        | `steps`           | cumulative daily steps               |
| `sleep`                               | asleep seconds > 0 | `sleep`           | hours                                |
| `body` / `nutrition` / `menstruation` | —                  | _ignored in v1_   | —                                    |

All amounts are clamped to `ACTIVITY_AMOUNT_MAX`. The distance/duration split and
sleep/nutrition depth are intentionally simple heuristics — refinement (explicit
activity-type codes, walking → steps, naps) is a documented follow-up.

---

## 4. De-duplication

Webhooks redeliver (Terra retries ~8× with backoff on any non-2XX), and daily
counters re-send a growing total all day. Two idempotency models:

- **Discrete sessions (`event`)** — a run / workout / sleep. The provider's
  `summary_id` is stable, so the log doc id `${uid}_terra_${summary_id}` makes a
  redelivery a no-op Firestore `set`.
- **Cumulative counters (`daily`, steps)** — a `healthDailySnapshots` doc keyed
  by `${uid}_${provider}_${day}_steps` stores the last-ingested cumulative value.
  Each webhook transactionally diffs against it and logs only the **positive
  delta**, keyed by the new cumulative value. So the day's summed step-logs equal
  the latest cumulative total — no double-count — and the existing daily cap still
  clamps rewards. A downward correction logs nothing.

Backdated device data is handled correctly: `logActivityCore` derives the
daily-cap window from each log's own `loggedAt`, so a workout completed earlier
counts against the right UTC day.

---

## 5. Security

- **Webhook auth** — every Terra event is HMAC-SHA256 signed. `terraWebhook`
  verifies `terra-signature` against the **raw request body** with a constant-time
  comparison before doing anything. Unsigned/invalid → `401`. Multiple `v1`
  signatures are accepted (secret rotation).
- **User attribution** — `reference_id` (the uid we passed at session creation) is
  trusted _only because_ the request is signature-verified. Falls back to a
  `terraUserId` → connection lookup.
- **Firestore** — `healthConnections` is owner-read, **all client writes denied**
  (written only by the admin-SDK webhook). `healthDailySnapshots` is fully
  server-only (no client read or write).
- **Token custody** — none. Terra holds provider OAuth tokens; FitQuest never sees
  them.
- **CSP** — no change required. The connect flow is a full-page navigation to a
  Terra-hosted URL (not a `fetch`), and the webhook is inbound. If a future
  client-side Terra call is added, add `https://*.tryterra.co` to `connect-src` in
  `next.config.mjs`.

---

## 6. Game balance

Device-verified data is far harder to fake than typed numbers, but v1
**keeps the existing caps and reward rules unchanged** — a synced log earns the
same mastery / restore / achievements as a manual one, just auto-filled. This
avoids a balance shock and keeps `/balance-check` stable. A future option — a
modest XP/"trust" bonus for verified-source data once anti-abuse is proven — is
deliberately deferred and must be confirmed before any reward divergence ships.

Synced logs carry a `source` tag (e.g. `terra:GARMIN`) and show a "⌚ synced"
badge in the activity feed for transparency.

---

## 7. Operations runbook (enabling it)

1. Create a [Terra](https://tryterra.co) account; note the **dev-id**, **API key**,
   and create a webhook **destination** to get its **signing secret**.
2. Set the Cloud Functions secrets:
   ```bash
   firebase functions:secrets:set TERRA_DEV_ID
   firebase functions:secrets:set TERRA_API_KEY
   firebase functions:secrets:set TERRA_SIGNING_SECRET
   ```
3. `firebase deploy --only functions:terraWebhook,functions:createTerraSession` and
   `firebase deploy --only firestore:rules`.
4. In the Terra dashboard, point the destination webhook at the deployed
   `terraWebhook` URL.
5. Set `NEXT_PUBLIC_HEALTH_SYNC_ENABLED=true` and deploy the web app.
6. Smoke-test per [SMOKE-TEST.md](SMOKE-TEST.md § Health-data sync).

---

## 8. Out of scope (future phases)

- **Apple Health** — needs a Capacitor/native iOS shell + Terra mobile SDK.
- **Historical backfill** on first connect (Terra supports a one-off data pull).
- **Disconnect / deauth** from the UI (needs a Terra deauth callable).
- **Verified-source reward tuning** (see §6).
- **Deeper mapping** — explicit activity-type codes, naps, nutrition, body metrics.

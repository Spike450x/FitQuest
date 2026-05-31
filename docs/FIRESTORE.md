# FitQuest — Firestore Data Layer

Reference for the Firestore collections, their TypeScript shapes, and the authoritative validation rules in [`firestore.rules`](../firestore.rules). Pair with [ARCHITECTURE.md](ARCHITECTURE.md) for how the app talks to these collections.

The live project is `fitness-rpg-claude`. There is no emulator setup — dev and CI use real Firestore (CI uses dummy creds via `.env.ci` and never connects in `build:ci`).

---

## Auth model

Every collection enforces the same shape:

- **Read / delete:** signed-in **and** the document's `uid` matches `request.auth.uid`. Owner-only.
- **Create:** signed-in, the new doc's `uid` matches `request.auth.uid`, and a per-collection validator passes.
- **Update:** signed-in, ownership unchanged, and a per-collection validator passes.

There are no admin paths and no public reads. The middleware in `src/middleware.ts` is UX redirection only — Firestore rules are the only authoritative gate.

Helper functions defined at the top of `firestore.rules`:

- `isSignedIn()` — `request.auth != null`
- `isOwner(uid)` — `request.auth.uid == uid`

---

## `characters/{uid}`

The player document. **Document ID is the user's Firebase Auth UID** — there is exactly one character per user. Stored TypeScript shape mirrors [`Character`](../src/types/index.ts).

```ts
interface Character {
  uid: string;
  name: string; // 1–30 chars
  class: 'warrior' | 'wizard' | 'rogue';
  level: number; // 1–100
  xp: number; // ≥ 0
  xpToNextLevel: number; // 1–200,000
  gold: number; // 0–1,000,000
  stats: Stats; // see below
  equippedGear: EquippedGear; // weapon | armor | accessory, each string|null

  createdAt: number; // unix ms — immutable
  currentHp?: number; // 0–2000;        undefined = full
  currentStamina?: number; // 0–500;         undefined = full
  currentMagic?: number; // 0–250;         undefined = full
  pendingStatPoints?: number; // 0–100
  subclass?: CharacterSubclass; // one-way set at level ≥ 10
  masteryCounts?: { run?: number; workout?: number; steps?: number; meditation?: number };
  streakData?: { currentStreak: number; longestStreak: number; lastLogDate: string };
  personalRecords?: Partial<
    Record<ActivityType, { value: number; loggedAt: number; unit: string }>
  >;
  legendaryDryStreak?: Record<string, number>; // kills-since-last-legendary per monster — pity system
  /** Per-monster kill tally for the bestiary surface. Incremented on every defeat (arena + dungeon). */
  monstersKilled?: Record<string, { killCount: number; firstKilledAt: number }>;
  dungeonRunsToday?: {
    date: string; // 'YYYY-MM-DD' UTC
    count: number; // runs started this calendar day (max 2)
    legendaryUsed: boolean; // true after the first run of the day is claimed
  };
  activeDungeonRunId?: string | null; // set to runId when a run is in progress; null otherwise
  achievements?: AchievementId[]; // one-time milestone badges earned (see src/lib/gameLogic/achievements.ts)

  // ── Achievement-tracking counters (added in PR5b + balance pass) ──────────
  /** Lifetime arena combat wins. Incremented inside `claimCombatVictory` CF. Drives `centurion`. */
  totalCombatWins?: number;
  /** Lifetime activity-log counts per type. Incremented inside `logActivity` CF. Drives iron-body / marathoner / well-fed / well-rested / enlightened. */
  activityLogCounts?: Partial<Record<ActivityType, number>>;
  /** Lifetime quests claimed. Incremented client-side on `questStore.claimReward`. Drives quest-novice/-veteran/-legend. */
  totalQuestsClaimed?: number;
  /** Tracks weekly quests claimed inside the current ISO week (`weekKey: "YYYY-WW"`). Drives `weekly-perfectionist`. */
  weeklyQuestsClaimed?: { weekKey: string; questDefIds: string[] };
  /** UTC date ("YYYY-MM-DD") of the most-recent daily-login bonus grant. */
  lastLoginGrantedDate?: string;
}

interface Stats {
  strength: number; // 0–50  (PRIMARY_STAT_CAP)
  wisdom: number; // 0–50
  agility: number; // 0–50
  spirit: number; // 0–50  (primary; drives spell/ability crit chance + damage)
  stamina: number; // 0–600 (level-scaled at runtime)
  health: number; // 0–600
  defense: number; // 0–600
}
```

### Validation — create

- `uid` matches the document ID and the caller.
- `level == 1`.
- `subclass` field absent.
- All required fields present and within the ranges above.

### Validation — update

- `uid`, `class`, `createdAt` are **immutable** — write must equal the existing value.
- All fields revalidated against the same ranges (so a buggy client cannot push `level: 200` or `gold: 1e9`).
- `legendaryDryStreak` must be a map if present (`is map` validated in `isValidCharacterOptionals`).
- `monstersKilled` must be a map if present.
- `dungeonRunsToday` must be a map if present.
- `activeDungeonRunId` must be a string or null if present.
- `achievements` must be a list if present.
- `totalCombatWins`, `totalQuestsClaimed` must be non-negative numbers if present.
- `activityLogCounts`, `weeklyQuestsClaimed` must be maps if present.
- `lastLoginGrantedDate` must be a string if present.
- Subclass rules (`subclassIsValid`):
  - Absent → OK (not chosen yet).
  - Same as before → OK (already locked in).
  - New value → only allowed if the previous doc had no subclass set, the new value is in `[berserker, paladin, archmage, warlock, assassin, ranger]`, **and** `level >= 10`. One-way lock.

### Why these caps

- `50` primary cap ≡ `PRIMARY_STAT_CAP` in `src/lib/gameLogic/constants.ts`.
- `600` secondary cap is a generous level-100 ceiling; runtime per-stat cap is `level × 5 + 10` enforced in `statCap()`.
- `2000 / 500 / 250` resource ceilings are 2–3× the maximum a fully-geared level-100 character can reach — exists purely as an anti-cheat hard wall.

---

## `activityLogs/{auto-id}`

Append-only log of every activity submission. Document ID is auto-generated; `uid` field carries ownership.

```ts
interface ActivityLog {
  id: string;
  uid: string;
  type: 'workout' | 'run' | 'steps' | 'sleep' | 'water' | 'nutrition';
  data: Record<string, number | string>;
  statGains: Partial<Stats>;
  xpGained: number; // ≥ 0
  loggedAt: number; // unix ms — server-window-validated
  rewardEligible: boolean; // set by logActivity Cloud Function after daily-cap check
}
```

### Validation — create

- `uid == request.auth.uid`.
- `type` ∈ the activity type list.
- `xpGained ≥ 0`.
- `loggedAt` falls within `[request.time − 2m, request.time + 2m]`.

### Validation — update

**Always denied.** Activity logs are immutable. Mistakes are corrected by deleting and re-logging.

### Why the timestamp window

The ±2-minute symmetric window (2 min past, 2 min future) blocks **streak gaming** — without it, a player could backdate a log to fill in a missed day and keep their streak alive. The window also handles client-clock drift in both directions. Note: the docs previously stated a 10-minute past window; the live rule (`isRecentTimestamp` in `firestore.rules`) uses 2 minutes in both directions.

---

## `inventory/{auto-id}`

One document per stack of items the player owns. `uid` carries ownership; `itemDefId` references an entry in `ITEM_CATALOG` (`src/lib/gameLogic/items.ts`).

```ts
interface InventoryItem {
  id: string;
  itemDefId: string; // non-empty
  uid: string;
  quantity: number; // 1–999
  equipped: boolean;
  acquiredAt: number; // unix ms — immutable
  charges?: number; // remaining spell charges for this encounter/run; undefined = full
}
```

### Validation — create

- `uid == request.auth.uid`.
- `itemDefId` non-empty string.
- `quantity` between 1 and 999.
- `equipped` is bool, `acquiredAt > 0`.

### Validation — update

- `uid`, `itemDefId`, `acquiredAt` are **immutable**.
- `quantity ≥ 1` (the app deletes the doc when quantity hits 0; a stored `0` is never legitimate).
- `equipped` remains a bool.
- `charges` — optional; when present, a non-negative integer. `undefined` (field absent) means full charges. Written by `persistSpellChargeDecrements` during combat; reset at fight end (arena) or Rest Site (dungeon).

---

## `activeQuests/{auto-id}`

The player's currently-assigned daily and weekly quests. Auto-rotated by `useQuestStore.fetchAndAssignQuests` when the existing set has fully expired or is empty.

```ts
interface ActiveQuest {
  id: string;
  uid: string;
  questDefId: string; // references DAILY_QUEST_POOL or WEEKLY_QUEST_POOL
  progress: number; // ≥ 0
  completedAt: number | null; // write-once
  claimedAt: number | null; // write-once, gated on completedAt
  expiresAt: number; // unix ms — immutable
  rewards: QuestReward; // immutable
  rewardedXp?: number; // XP actually awarded at claim time (level-scaled + streak multiplier)
  rewardedGold?: number; // gold actually awarded at claim time (level-scaled)
}
```

`rewardedXp` and `rewardedGold` are absent on quests claimed before this field was introduced — fall back to `rewards.xp`/`rewards.gold` (base definition values) in those cases.

### Validation — create

- `uid == request.auth.uid`.
- `progress ≥ 0`, `completedAt == null`, `claimedAt == null`, `expiresAt > 0`.
- `rewards` is a map.

### Validation — update

- `uid`, `questDefId`, `expiresAt`, `rewards` are **immutable**.
- `progress` stays `≥ 0`.
- `completedAt`: `null` → `int > 0` allowed exactly once. Cannot be unset, cannot be re-set.
- `claimedAt`: `null` → `int > 0` allowed exactly once **and** the existing document must already have `completedAt` set. The check uses `resource.data.completedAt` (the stored value), not `request.resource.data.completedAt` (the proposed value) — this prevents a single forged write from setting both `completedAt` and `claimedAt` simultaneously.
- `rewardedXp` / `rewardedGold`: only writable **during the `claimedAt` null → int transition** (i.e. the same write that sets `claimedAt`). Cannot be set before the claim or updated after. Capped at 100,000 each. This prevents post-claim forgery of the awarded amounts.

### Why the two-step claim

A claim grants gold + XP. Without the `resource.data.completedAt != null` constraint, an attacker who can write to the doc could fabricate "completed and claimed" in one call. The two-step gate forces them to first write `completedAt` (which is checked against the immutable `progress` and `rewards`), then write `claimedAt` (which checks the stored completedAt, not the in-flight one).

---

## `combatLogs/{auto-id}`

One document per completed combat encounter. Used by the stats page to aggregate battles won and combat XP earned. Document ID is auto-generated; `uid` carries ownership.

```ts
interface CombatLog {
  id: string;
  uid: string;
  monsterId: string; // non-empty — references MONSTER_CATALOG
  monsterName: string;
  xp: number; // 0–10,000 — final XP after the daily diminishing-returns multiplier
  gold: number; // 0–10,000 — never diminished
  loggedAt: number; // unix ms — server-window-validated
  multiplier?: number; // 0.1 / 0.25 / 0.5 / 1.0 — recorded by claimCombatVictory CF (P0-3)
  winsTodayAfter?: number; // running count of wins for this UTC day, including this one
}
```

`multiplier` and `winsTodayAfter` are absent on combat logs written before the `claimCombatVictory` Cloud Function shipped (P0-3, 2026-05-22). Treat them as `1.0` / unknown on legacy reads.

**Document ID convention:** under the `claimCombatVictory` CF the document ID is `${uid}_${idempotencyKey}` (client-generated UUID). This makes retries idempotent — the CF short-circuits on an existing doc rather than double-awarding XP. Legacy combat logs (pre-P0-3) used auto-generated IDs; both still satisfy the `uid == request.auth.uid` rule.

### Validation — create / update / delete

**Always denied for clients.** All combat logs are written by the `claimCombatVictory` Cloud Function using the admin SDK, which bypasses security rules. Locking client creates prevents a rogue client from forging logs that would artificially inflate `winsToday` (reducing the player's own XP multiplier) or polluting analytics.

### Why the 10,000 cap

The highest single-combat XP reward in the game (Ancient Dragon, level 100 gear) is around 3,000 XP. The 10,000 ceiling is a generous anti-cheat wall that cannot be hit through normal play.

### The `claimCombatVictory` Cloud Function

Combat-win XP and gold are awarded server-side via the `claimCombatVictory` callable Cloud Function in `functions/src/claimCombatVictory.ts` (shipped 2026-05-22, P0-3). The CF:

1. Aggregate-queries `combatLogs` for the player's wins today (UTC day range query — uses the `uid ASC, loggedAt ASC` index; the DESC index covers ORDER BY reads but not `>=` range scans).
2. Computes `combatXpDailyMultiplier(winsTodayBefore)` — the tiered diminishing-returns curve (`1.0 → 0.5 → 0.25 → 0.1` at thresholds 10 / 20 / 30).
3. Inside a Firestore transaction: reads the character doc, applies the level-scaled XP via `applyXp`, handles level-up bookkeeping (stat auto-grants, resource refill, `pendingStatPoints` increment), writes the character update.
4. After the transaction: writes the combat log doc with the **final** XP (post-multiplier), the multiplier, and `winsTodayAfter`.

Gold is **not** diminished — only XP. Combat farming for gold remains viable; XP grinding the same monster does not.

The CF runs with `minInstances: 1` to eliminate cold-start latency.

---

## `dungeonRuns/{runId}`

One document per dungeon run attempt. `uid` carries ownership; document ID is auto-generated.

```ts
interface DungeonRun {
  uid: string;
  tierId: 'goblin-caves' | 'spider-lair' | 'dark-sanctum' | 'dragons-keep';
  weekSeed: number; // ISO week number used to generate this run's layout
  status: 'active' | 'completed' | 'abandoned';
  currentRoom: number; // 0-indexed; advances per room cleared
  rooms: Array<{
    type: 'combat' | 'stat-check' | 'rest' | 'boss';
    monsterId?: string; // present for combat and boss rooms
    cleared: boolean;
    lootAwarded: string[]; // itemDefIds awarded on clear
    xpAwarded: number;
    goldAwarded: number;
  }>;
  currentHp: number;
  currentStamina: number;
  currentMagic: number;
  legendaryEligible: boolean;
  cumulativeXp: number; // XP across all cleared rooms so far
  cumulativeGold: number;
  allDroppedItems: string[]; // itemDefIds across all rooms (for history panel)
  startedAt: number; // unix ms
  completedAt: number | null;
  claimed?: boolean; // set by claimDungeonRun CF — write-once idempotency guard
}
```

### Validation — create

- `uid == request.auth.uid`.
- `status == 'active'`.
- `currentRoom == 0`.
- `cumulativeXp == 0`, `cumulativeGold == 0`.
- `claimed` field absent.

### Validation — update

- `uid` is **immutable**.
- `status` transitions one-way: `active → completed` or `active → abandoned`. Once non-active, no further updates allowed.
- `currentRoom` is non-decreasing.
- `cumulativeXp ≤ 8000`, `cumulativeGold ≤ 10000` (anti-cheat ceilings for a single run).
- `claimed` is write-once — once set to `true`, it cannot be changed. This is the idempotency guard that prevents double-award even if the client retries the claim call.

### The `claimDungeonRun` Cloud Function

Run rewards (XP, gold, inventory items) are awarded atomically by the `claimDungeonRun` callable Cloud Function in `functions/src/claimDungeonRun.ts`. It uses a Firestore transaction to stamp `claimed: true` + final status before applying any rewards — making the claim idempotent. Inventory writes happen outside the transaction (acceptable: worst-case is a lost item, not duplicate XP). The function runs with `minInstances: 1` to eliminate cold-start latency.

---

## `healthConnections/{uid}_{provider}`

A user's link to a wearable provider (**Garmin**). A **tokenless, client-readable** status record. Mirrors [`HealthConnection`](../src/types/index.ts).

```ts
interface HealthConnection {
  id: string; // `${uid}_${provider}` e.g. `${uid}_garmin`
  uid: string;
  provider: string; // 'strava' | 'garmin'
  providerUserId?: string; // the provider's opaque user id
  status: 'connected' | 'error' | 'disconnected';
  lastSyncAt?: number; // epoch ms of the most recent sync
}
```

**Written exclusively by the provider Cloud Functions (Strava/Garmin)** (admin SDK, bypasses rules). The rule is owner-**read-only** — `allow create, update, delete: if false` — so a client cannot forge a "connected" record or attribute another user's device to itself. Holds **no OAuth tokens** (see `healthTokens`). Read on the client via `subscribeToHealthConnections` (`src/lib/healthData.ts`). See [HEALTH-INTEGRATION.md](HEALTH-INTEGRATION.md).

---

## `healthTokens/{uid}_{provider}` · `healthOAuthStates/{state}`

**Secrets — fully server-only.** `healthTokens` holds each provider's OAuth access/refresh tokens + `providerUserId` (Strava athlete id / Garmin user id), keyed `${uid}_${provider}`; `healthOAuthStates` holds the short-lived `codeVerifier` (PKCE, Garmin) + `returnOrigin` keyed by the opaque `state` token (consumed once in the callback). Both rule blocks are `allow read, create, update, delete: if false` — the admin-SDK provider functions are the only readers/writers, so tokens never reach the browser.

---

## `healthDailySnapshots/{uid}_{provider}_{day}_{metric}`

Internal de-dupe cursors holding the last-ingested cumulative value of a growing daily counter (steps), so `garminWebhook` logs only the positive delta each time Garmin re-sends the day's total. Fully **server-only** — `allow read, create, update, delete: if false`; never touched by clients. Fields: `{ uid, provider, day, metric, lastValue }`.

> Note: the `activityLogs` schema gains an optional `source` field (`'strava'` / `'garmin'`) on device-synced logs. It is absent on manual logs and is written server-side by the shared `logActivityCore`.

---

## Indexes

Indexes are declared in [`firestore.indexes.json`](../firestore.indexes.json) at the repo root and deployed with:

```bash
firebase deploy --only firestore:indexes
```

`firebase.json` points to this file via `"firestore": { "indexes": "firestore.indexes.json" }`. The `deploy:prod` npm script enforces deploy ordering — indexes and rules first, then functions — so the composite index always exists before the Cloud Function queries it.

### Active composite indexes

| Collection     | Fields (in order)                         | Purpose                                                                                                                    |
| -------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `activityLogs` | `uid ASC`, `type ASC`, `loggedAt ASC`     | 3-field range query in `logActivity` CF — aggregate today's logged amount by type for daily-cap enforcement.               |
| `activityLogs` | `uid ASC`, `loggedAt DESC`                | Stats page — fetch the player's most recent activity logs for the XP-over-time chart and activity breakdown.               |
| `combatLogs`   | `uid ASC`, `loggedAt ASC`                 | `claimCombatVictory` CF — range query (`loggedAt >= startOfDay`) for today's win count. ASC required for `>=` range scans. |
| `combatLogs`   | `uid ASC`, `loggedAt DESC`                | Stats page — fetch the player's most recent combat logs for battles-won count and combat XP stacked bars.                  |
| `dungeonRuns`  | `uid ASC`, `status ASC`, `startedAt DESC` | Dungeon store — query for the player's active run on lobby load.                                                           |
| `dungeonRuns`  | `uid ASC`, `startedAt DESC`               | Dungeon lobby — fetch recent run history (all statuses) ordered by start date.                                             |

> **Index direction matters for range queries.** A `loggedAt DESC` index supports ORDER BY reads efficiently but cannot serve `loggedAt >= X` range scans — Firestore requires the range field to be ASCENDING for those. The two `combatLogs` indexes are intentionally separate for this reason.

The `questStore` deliberately avoids composite queries for `activeQuests` — it filters by `uid` only and applies the `expiresAt` check client-side. No index needed there.

### Drift protection

`scripts/validate-firestore-indexes.mjs` validates `firestore.indexes.json` on two levels and runs in CI before any deploy step:

1. **Structure** — required shape, valid `order`/`arrayConfig` values.
2. **Coverage** — a hardcoded table of 6 known required indexes (one per composite query in `functions/src/` and `src/lib/`) is checked against the file. A missing index fails CI before any code is type-checked, linted, or tested. When a new composite query is introduced, add a corresponding entry to the `REQUIRED_INDEXES` table in the script.

---

## Deploying rules and indexes

Rules (`firestore.rules`) and indexes (`firestore.indexes.json`) are **auto-deployed together on every push to `master`** (step 15 in [`CI.md`](CI.md)). The combined deploy ensures indexes are always in sync with the rules that depend on them. Manual deploy when needed:

```bash
npx firebase deploy --only firestore:rules,firestore:indexes --project fitness-rpg-claude
```

Prefer `npm run deploy:prod` for full deploys — it runs the index validation script first and deploys in the correct order (indexes/rules before functions).

### Adding a post-MVP schema field

When adding a new optional field to an existing Firestore document:

1. Add the field to the TypeScript interface in `src/types/index.ts` (mark it optional with `?`).
2. Add a safe default in the relevant normalizer in `src/lib/fetchPlayerData.ts` (`normalizeActiveQuest`, `normalizeInventoryItem`, or a new one for a new collection). This prevents raw `as` casts from silently carrying `undefined` on docs written before the field existed.
3. Add the field to the `firestore.rules` validator if it has write constraints (immutability, value ranges, state-transition scoping).
4. Update this doc with the field in the collection's interface block and any new validation rules.

---

## Cross-references

- **Application architecture and data flows** → [ARCHITECTURE.md](ARCHITECTURE.md)
- **Game logic API (functions that build the writes)** → [GAME-LOGIC.md](GAME-LOGIC.md)
- **Security hardening shipped to date** → [SECURITY-SETUP.md](SECURITY-SETUP.md#remediations-log)
- **TypeScript type definitions** → [`src/types/index.ts`](../src/types/index.ts)
- **Authoritative rules file** → [`firestore.rules`](../firestore.rules)

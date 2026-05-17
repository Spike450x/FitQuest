# FitQuest — Firestore Data Layer

Reference for the four Firestore collections, their TypeScript shapes, and the authoritative validation rules in [`firestore.rules`](../firestore.rules). Pair with [ARCHITECTURE.md](ARCHITECTURE.md) for how the app talks to these collections.

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
  masteryCounts?: { run?: number; workout?: number; steps?: number };
  streakData?: { currentStreak: number; longestStreak: number; lastLogDate: string };
  personalRecords?: Partial<
    Record<ActivityType, { value: number; loggedAt: number; unit: string }>
  >;
}

interface Stats {
  strength: number; // 0–50  (PRIMARY_STAT_CAP)
  wisdom: number; // 0–50
  agility: number; // 0–50
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
}
```

### Validation — create

- `uid == request.auth.uid`.
- `progress ≥ 0`, `completedAt == null`, `claimedAt == null`, `expiresAt > 0`.
- `rewards` is a map.

### Validation — update

- `uid`, `questDefId`, `expiresAt`, `rewards` are **immutable**.
- `progress` stays `≥ 0`.
- `completedAt`: `null` → `int > 0` allowed exactly once. Cannot be unset, cannot be re-set.
- `claimedAt`: `null` → `int > 0` allowed exactly once **and** the existing document must already have `completedAt` set. The check uses `resource.data.completedAt` (the stored value), not `request.resource.data.completedAt` (the proposed value) — this prevents a single forged write from setting both `completedAt` and `claimedAt` simultaneously.

### Why the two-step claim

A claim grants gold + XP. Without the `resource.data.completedAt != null` constraint, an attacker who can write to the doc could fabricate "completed and claimed" in one call. The two-step gate forces them to first write `completedAt` (which is checked against the immutable `progress` and `rewards`), then write `claimedAt` (which checks the stored completedAt, not the in-flight one).

---

## Indexes

Indexes are declared in [`firestore.indexes.json`](../firestore.indexes.json) at the repo root and deployed with:

```bash
firebase deploy --only firestore:indexes
```

`firebase.json` points to this file via `"firestore": { "indexes": "firestore.indexes.json" }`. The `deploy:prod` npm script enforces deploy ordering — indexes and rules first, then functions — so the composite index always exists before the Cloud Function queries it.

### Active composite indexes

| Collection     | Fields (in order)                     | Purpose                                                                                                    |
| -------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `activityLogs` | `uid ASC`, `type ASC`, `loggedAt ASC` | 3-field query in `logActivity` Cloud Function — aggregate today's logged amount for daily-cap enforcement. |

The `questStore` deliberately avoids composite queries for `activeQuests` — it filters by `uid` only and applies the `expiresAt` check client-side. No index needed there.

### Drift protection

`scripts/validate-firestore-indexes.mjs` validates the schema of `firestore.indexes.json` (required shape, valid `order`/`arrayConfig` values) and runs in CI before any deploy step. A failing validation blocks the CI run before any code is type-checked, linted, or tested.

---

## Deploying rules

Rules live in `firestore.rules` at the repo root. The CI pipeline **auto-deploys rules on every push to `master`** (step 11 in [`CI.md`](CI.md)). Manual deploy when needed:

```bash
npx firebase deploy --only firestore:rules --project fitness-rpg-claude
```

Prefer `npm run deploy:prod` for full deploys — it runs the index validation script first and deploys in the correct order (indexes/rules before functions).

---

## Cross-references

- **Application architecture and data flows** → [ARCHITECTURE.md](ARCHITECTURE.md)
- **Game logic API (functions that build the writes)** → [GAME-LOGIC.md](GAME-LOGIC.md)
- **Security hardening shipped to date** → [SECURITY-SETUP.md](SECURITY-SETUP.md#remediations-log)
- **TypeScript type definitions** → [`src/types/index.ts`](../src/types/index.ts)
- **Authoritative rules file** → [`firestore.rules`](../firestore.rules)

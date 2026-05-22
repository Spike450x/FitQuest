# FitQuest — Architecture

Reference for how the app is wired together. For game-design / mechanic details see [README.md](../README.md). For data-layer specifics see [FIRESTORE.md](FIRESTORE.md). For pipeline details see [CI.md](CI.md). For game-logic API see [GAME-LOGIC.md](GAME-LOGIC.md).

---

## Layered architecture

FitQuest is a single-page Next.js 15 app with a clear top-down dependency chain. Every layer below is a **producer** that the layer above consumes; nothing skips a layer (e.g. components must not call Firestore directly).

```mermaid
graph TD
    A["UI / Pages<br/>(src/app/**)"] --> B["Components<br/>(src/components/**)"]
    A --> C["Custom Hooks<br/>(src/hooks/**)"]
    B --> D["Zustand Stores<br/>(src/store/**)"]
    C --> D
    D --> E["Pure Game Logic<br/>(src/lib/gameLogic/**)"]
    D --> F["Firebase SDK<br/>(src/lib/firebase.ts)"]
    F --> G[("Firestore + Auth<br/>fitness-rpg-claude")]
    F --> CF["Cloud Functions<br/>(functions/)"]
    CF --> G
    H["Middleware<br/>(src/middleware.ts)"] -. route guard .-> A
```

**Rules of the layout:**

- **UI never calls Firebase directly.** All reads/writes route through a Zustand store action or lib wrapper. Firestore reads → `src/lib/fetchPlayerData.ts`; Firestore domain writes → `src/lib/{characterData,activityData,questData,inventoryData,combatData}.ts`; Auth → `src/lib/auth.ts`; Cloud Functions → `src/lib/functions.ts`. No component or hook imports the Firebase SDK directly (except `useAuth`, which owns the auth-state subscription, and is the only sanctioned exception).
- **Game logic is pure and side-effect-free.** `src/lib/gameLogic/` contains deterministic functions that take inputs and return outputs — no I/O, no globals. This is what the vitest suite covers.
- **Zustand is the in-memory source of truth during a session.** Firestore is the persistence layer. Store actions reconcile the two.
- **Auth gating is enforced in two places.** Client-side via `src/middleware.ts` (redirects), server-side via Firestore rules (the only authoritative gate).

---

## Folder map (`src/`)

| Path                      | Role                                                                                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(auth)/`             | Public auth routes — login, register.                                                                                                                                                                           |
| `app/(game)/`             | All authenticated game pages. Behind both middleware and Firestore-rule gates.                                                                                                                                  |
| `app/character-creation/` | One-time class-selection flow on first login.                                                                                                                                                                   |
| `app/layout.tsx`          | Root layout, global providers, font setup.                                                                                                                                                                      |
| `app/page.tsx`            | Landing redirect.                                                                                                                                                                                               |
| `components/`             | Shared UI building blocks (forms, cards, modals, bars).                                                                                                                                                         |
| `hooks/`                  | Reusable client hooks (`useAuth`, `useCharacter`, `useRecentActivity`, `useCombatBursts`, `useInventoryNewMarkers`, `useTodayKey`). All hooks live here — none in component files.                              |
| `lib/firebase.ts`         | Firebase SDK init. Reads env vars; exports `app`, `auth`, `db`, `functions`. The only Firebase wiring in the repo.                                                                                              |
| `lib/gameLogic/`          | Pure deterministic logic — combat, spells, XP, streaks, items, monsters, quests. Unit-tested.                                                                                                                   |
| `store/`                  | Zustand stores (`characterStore`, `inventoryStore`, `questStore`).                                                                                                                                              |
| `types/index.ts`          | Single source of truth for TypeScript types. Imported by every other layer.                                                                                                                                     |
| `types/cloudFunctions.ts` | Canonical `LogActivityInput` / `LogActivityResult` types shared between `ActivityLogForm` and `functions/`.                                                                                                     |
| `lib/fetchPlayerData.ts`  | Firestore fetch helpers with field-normalizing functions (`normalizeActiveQuest`, `normalizeInventoryItem`). Applies safe defaults for fields added post-MVP so raw `as` casts never silently hold `undefined`. |
| `lib/characterData.ts`    | Firestore write helpers for the `characters/{uid}` document (XP, gold, HP/Stamina/Magic, streak, stats, gear).                                                                                                  |
| `lib/activityData.ts`     | Firestore helpers for `activityLogs/{uid}` reads (recent activity feed, per-day aggregates).                                                                                                                    |
| `lib/questData.ts`        | Firestore write helpers for `activeQuests/{id}` (progress updates, claim writes).                                                                                                                               |
| `lib/inventoryData.ts`    | Firestore write helpers for `inventory/{id}` documents (equip/unequip, parallel gear writes).                                                                                                                   |
| `lib/combatData.ts`       | Firestore write helpers for `combatLogs/{id}` documents (per-day combat XP tracking).                                                                                                                           |
| `lib/dungeonData.ts`      | Firestore read/write helpers for `dungeonRuns/{runId}` documents (`createDungeonRunDoc`, `getActiveDungeonRun`, `updateDungeonRunProgress`, `finalizeDungeonRun`, `getRecentDungeonRuns`).                      |
| `lib/errors.ts`           | Shared error types / helpers used across lib wrappers for consistent error propagation.                                                                                                                         |
| `lib/functions.ts`        | Cloud Functions callable wrappers (`logActivityFn`, `claimDungeonRunCF`, `claimCombatVictoryCF`). Components import from here — never instantiate `httpsCallable` directly.                                     |
| `lib/auth.ts`             | Firebase Auth wrappers (`signIn`, `signUp`, `logOut`). Auth pages import from here — never import Firebase Auth SDK directly.                                                                                   |
| `middleware.ts`           | Next.js middleware — checks the Firebase `__session` cookie and redirects.                                                                                                                                      |

---

## Route reference

### Auth group — `src/app/(auth)/`

| Route       | Purpose                                                   |
| ----------- | --------------------------------------------------------- |
| `/login`    | Email/password sign-in.                                   |
| `/register` | Email/password sign-up. Sends to character creation next. |

### Game group — `src/app/(game)/`

All routes are gated by middleware redirect to `/login` if the auth cookie is missing.

| Route                       | Purpose                                                                                                                                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard`                | Main hub — character summary, XP bar, quick actions, recent activity feed.                                                                                                                                              |
| `/activities`               | Log workouts, runs, sleep, etc. Shows preview of XP/stat gains before submission.                                                                                                                                       |
| `/character`                | Stat allocation, level-up flow, subclass selection at level 10.                                                                                                                                                         |
| `/combat`                   | Turn-based battle screen with Arena \| Dungeons tab switcher. Arena: standard single-fight flow. Dungeons: multi-room dungeon lobby.                                                                                    |
| `/combat/dungeons`          | Dungeon lobby — 4-tier tier cards, resume banner for active runs, run history with loot preview.                                                                                                                        |
| `/combat/dungeons/[tierId]` | Tier entry screen — HP gate, legendary lockout status, room layout preview, champion slots stub, entry CTA.                                                                                                             |
| `/combat/dungeons/run`      | Active dungeon run — combat rooms, stat-check rooms, rest rooms, boss fight, room transition interstitial, victory/defeat screens.                                                                                      |
| `/inventory`                | Owned items, gear slots, spell loadout, combat pack of consumables.                                                                                                                                                     |
| `/shop`                     | Daily-rotating gear, plus permanent consumable and spell tabs.                                                                                                                                                          |
| `/quests`                   | Active daily and weekly quests with progress bars and claim buttons.                                                                                                                                                    |
| `/profile`                  | Account settings and profile management.                                                                                                                                                                                |
| `/stats`                    | Full analytics dashboard — XP chart (quest XP vs combat XP as stacked bars), activity breakdown, personal records, streak panel, and overview cards (quests completed, activities, gold earned, total XP, battles won). |

### Standalone — `src/app/character-creation/`

First-login flow. Picks a name and one of `warrior` / `wizard` / `rogue` and creates the `characters/{uid}` document.

---

## Middleware (`src/middleware.ts`)

Pure redirection logic — **not an authoritative auth gate**, just UX guidance. Implements secure-by-default: every route requires auth unless explicitly listed in `PUBLIC_PATHS`.

- Reads the `__session` cookie (set client-side by Firebase Auth).
- Defines `PUBLIC_PATHS = ['/login', '/register']` — the _only_ routes accessible without authentication. All other routes are automatically protected.
- If unauthenticated and the path is not in `PUBLIC_PATHS` → redirect to `/login`.
- If authenticated and the path is in `PUBLIC_PATHS` → redirect to `/dashboard` (avoid showing auth forms to logged-in users).
- The matcher excludes `_next/static`, `_next/image`, `favicon.ico`, and any path containing a `.` (asset requests).

**No AUTH_PATHS allowlist to maintain** — new game routes are automatically protected without middleware changes.

Authoritative protection lives in `firestore.rules` — see [FIRESTORE.md](FIRESTORE.md).

---

## State management

Three Zustand stores, each owning one domain. Each store exposes typed actions; React components only call those actions, never Firestore.

| Store               | Owns                                                                                                                                                                                                                                                                                                                 | Persistence                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useCharacterStore` | The signed-in player's `Character` (level, XP, stats, gold, current HP/SP/MP, streak, PRs, mastery counts, subclass).                                                                                                                                                                                                | `characters/{uid}` document. Mix of immediate-write actions and "local-only" setters used during combat for live UI without Firestore round-trips. |
| `useInventoryStore` | Inventory items, equipped gear slots, spell loadout, combat pack.                                                                                                                                                                                                                                                    | `inventory/{auto-id}` documents. Equip/unequip also writes `equippedGear` on the character doc.                                                    |
| `useQuestStore`     | Active daily + weekly quests for the player.                                                                                                                                                                                                                                                                         | `activeQuests/{auto-id}` documents. Auto-rotates expired quests on fetch.                                                                          |
| `useDungeonStore`   | Active dungeon run state (current room, HP/SP/MP, monster, phase, loot, XP). `fetchActiveRun` detects and auto-finalizes phantom runs. `startRun` enforces HP gate + daily cap + gold check. `completeRun`/`abandonRun` guard against redundant finalization when the Cloud Function already wrote the final status. | `dungeonRuns/{runId}` documents via `src/lib/dungeonData.ts`.                                                                                      |

**Local-only actions** (`setHpLocal`, `setStaminaLocal`, `setMagicLocal`) update the in-memory state without a Firestore write — used during combat so the HP bar updates instantly between rolls. `updateCurrentHp` / `updateCurrentStamina` / `updateCurrentMagic` flush to Firestore at the end of the fight.

---

## Data flow — logging an activity

End-to-end walkthrough of what happens when the player submits an activity. The `logActivity` Cloud Function owns the authoritative write path; the client handles display and secondary writes.

```mermaid
sequenceDiagram
    participant UI as ActivityLogForm
    participant CF as logActivity (Cloud Function)
    participant CS as characterStore
    participant QS as questStore
    participant Lib as lib/gameLogic/*
    participant FS as Firestore

    UI->>UI: Render preview (restore amount / mastery progress)
    UI->>CF: httpsCallable logActivity({activityType, amount, unit})
    CF->>FS: getDocs(activityLogs, uid+type+loggedAt≥today) — server-side cap query
    CF->>CF: eligibleAmountForRewards() — authoritative cap enforcement
    CF->>FS: batch.set(activityLogs/{id}, {id, uid, type, data, rewardEligible, ...})
    CF->>FS: batch.update(characters/{uid}, {masteryCounts.X}) [mastery only, if eligible]
    CF->>FS: batch.update(characters/{uid}, {stats.Y++}) [mastery milestone only]
    CF-->>UI: {rewardEligible, eligibleAmount, masteryHit, newMasteryCount, ...}
    UI->>CS: applyMasteryLocal(type, newCount, milestoneHit) — local state only, no write
    UI->>CS: restoreHp/restoreStamina/restoreMagic [sleep/water/nutrition, if eligible]
    CS->>FS: updateDoc(characters/{uid}, {currentHp/Stamina/Magic})
    UI->>UI: setResult() — show result card immediately
    UI-->>QS: updateQuestProgress() [fire-and-forget]
    QS->>FS: updateDoc(activeQuests/{id}, {progress, completedAt?})
    UI-->>CS: persistStreakAndRecord() [fire-and-forget]
    CS->>Lib: computeNewStreak(streakData, todayUTC())
    CS->>FS: updateDoc(characters/{uid}, {streakData, personalRecords})
```

**Key properties of this design:**

- **Atomic server writes.** The `activityLog` doc, mastery count, and any milestone stat increment are committed in a single Firestore batch by the Cloud Function — they either all land or none do.
- **Cap is non-bypassable.** The aggregate query runs server-side; a forged client can't skip it.
- **Result card is immediate.** `setResult()` fires as soon as the function responds. Quest-progress and streak writes are fire-and-forget — a Firestore hiccup there doesn't block the player from seeing their reward.
- **Local state stays consistent.** `applyMasteryLocal` mirrors the function's write to the Zustand store with zero extra Firestore reads. Both use `Math.min(stat + 1, statCap(linkedStat, level))`.
- **Restore writes are server-side (R4-StageC).** The function computes the formula-derived max (`playerMaxHp/Stamina/Magic`) using a minimal gear-stat lookup in `functions/src/gameLogic/combat.ts` and writes `currentHp/Stamina/Magic` atomically with the activity log. The client receives `restored.newValue` and mirrors it to Zustand via `applyRestoreLocal` — no client Firestore write occurs.

---

## Data flow — claiming a combat victory

End-to-end walkthrough of what happens when the player clicks "Claim rewards" on the victory modal. The `claimCombatVictory` Cloud Function (P0-3) owns the authoritative XP/gold award path — the client never writes the combat log doc or the character XP directly.

```mermaid
sequenceDiagram
    participant UI as combat/page.tsx (victory modal)
    participant CF as claimCombatVictory (Cloud Function)
    participant CS as characterStore
    participant FS as Firestore

    UI->>UI: User clicks Claim Rewards (computes xpReward, goldReward from store + streak + monster scaling)
    UI->>CF: claimCombatVictoryCF({xpReward, goldReward, monsterId, monsterName, idempotencyKey})
    CF->>FS: get(combatLogs/{uid}_{idempotencyKey}) — short-circuit if retry
    CF->>FS: getDocs(combatLogs where uid+loggedAt≥startOfUTCDay) — count today's wins
    CF->>CF: combatXpDailyMultiplier(winsTodayBefore) → finalXp = round(xpReward × multiplier)
    CF->>FS: txn.get(characters/{uid})
    CF->>CF: applyXp(level, xp, finalXp) → may level up
    CF->>FS: txn.update(characters/{uid}, {level, xp, gold, stats?, currentHp?, currentStamina?, currentMagic?, pendingStatPoints?})
    CF->>FS: combatLogs/{uid}_{idempotencyKey}.set({xp:finalXp, gold, multiplier, winsTodayAfter, ...})
    CF-->>UI: {finalXp, multiplier, winsTodayBefore, winsTodayAfter, leveledUp}
    UI->>CS: awardXpAndStats(finalXp, {}) — mirrors server XP to Zustand for instant UI
    UI->>UI: setWinsToday(winsTodayAfter) — updates the "Daily combat XP" badge
    UI->>UI: toast.warning() if multiplier < 1.0
```

**Key properties of this design:**

- **Server-authoritative cap.** The diminishing-returns multiplier (`1.0 → 0.5 → 0.25 → 0.1` at 10 / 20 / 30 wins) is applied inside the CF. A forged client cannot fake the win count because it doesn't control the documents being counted.
- **Idempotent retries.** The combat log doc id is `${uid}_${idempotencyKey}` where the key is a client-generated UUID. A retry hits the same doc id; the CF detects it and returns the previously-awarded amounts instead of double-awarding.
- **Gold is not capped.** Only XP is diminished — gold flows through at full value. This preserves combat as a viable gold sink for quest rerolls and dungeon entry fees while removing the XP grind incentive.
- **Atomic character write.** Level-up bookkeeping (stats, resource refill, `pendingStatPoints`) happens inside a Firestore transaction with the XP/gold update. Combat log write is post-transaction (no character-write contention) and idempotent.
- **Parity-tested multiplier.** `combatXpDailyMultiplier` is duplicated in `functions/src/gameLogic/combat.ts` (the CF can't import `@/` aliases). A parity test in `functions/src/__tests__/combatXp.test.ts` cross-checks the client and server copies for 0–100 wins.

---

## Cross-references

- **Firestore schema, validation rules, and the security model** → [FIRESTORE.md](FIRESTORE.md)
- **CI pipeline, husky hooks, dependabot** → [CI.md](CI.md)
- **Game logic API (every exported function in `src/lib/gameLogic/`)** → [GAME-LOGIC.md](GAME-LOGIC.md)
- **Hardening checklist + remediations log** → [SECURITY-SETUP.md](SECURITY-SETUP.md)
- **Vulnerability reporting policy** → [SECURITY.md](../SECURITY.md)
- **Game mechanics, formulas, balance tables** → [README.md](../README.md)

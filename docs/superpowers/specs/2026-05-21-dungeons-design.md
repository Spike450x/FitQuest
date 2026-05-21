# FitQuest — Dungeons System Design

**Date:** 2026-05-21
**Status:** Shipped — 2026-05-21
**Scope:** V1 Dungeon system — multi-room runs with escalating loot, seeded weekly rotation, stat check rooms, boss encounters, and Firestore-persisted run state.
**Depends on:** Existing combat engine (`src/lib/gameLogic/combat.ts`), existing rotation logic, existing consumable system
**Deferred to V2:** Activity gate rooms, text riddle rooms, Champions system (slots stubbed in V1)

---

## Related Specs

- [`2026-05-17-future-features-roadmap-design.md`](./2026-05-17-future-features-roadmap-design.md) — Section 3: Dungeons (high-level roadmap)
- [`2026-05-19-game-systems-audit-design.md`](./2026-05-19-game-systems-audit-design.md) — P1-6: Dungeon resource model, Dungeon Design Notes section

---

## Architecture

### Approach: New route wrapping the existing combat engine

A new page at `src/app/(game)/combat/dungeons/` owns the dungeon flow end-to-end. It calls into the existing combat resolution functions (`calculateRound`, `resolveRoundOutcome`, `rollLoot`) from `src/lib/gameLogic/combat.ts` without modification. The existing `src/app/(game)/combat/page.tsx` is untouched.

**Navigation entry point:** A tab switcher added to the top of the combat page — `Arena | Dungeons`. "Arena" is the existing combat flow; "Dungeons" renders the dungeon lobby. URL structure: `/combat` (arena, default) and `/combat/dungeons` (dungeon lobby and active runs). The mobile bottom nav is unchanged — "Combat" tab covers both systems, keeping the bar at 5 items.

**New files:**

- `src/app/(game)/combat/dungeons/page.tsx` — dungeon lobby (tier list + resume banner)
- `src/app/(game)/combat/dungeons/[tierId]/page.tsx` — tier entry screen
- `src/app/(game)/combat/dungeons/run/page.tsx` — active dungeon run (room combat, stat checks, interstitial)
- `src/lib/dungeonData.ts` — Firestore read/write for dungeon runs
- `src/lib/gameLogic/dungeons.ts` — seeded generation, stat check resolution, boss definitions
- `src/store/dungeonStore.ts` — Zustand store for active run state

---

## Dungeon Tiers

Four static tiers. The tier definition is fixed; the weekly seed determines layout within that tier.

| Tier ID        | Name          | Rec. Level | Entry Fee | Rooms      | XP Bonus |
| -------------- | ------------- | ---------- | --------- | ---------- | -------- |
| `goblin-caves` | Goblin Caves  | 1–5        | 50g       | 3–5 + boss | +50%     |
| `spider-lair`  | Spider Lair   | 4–8        | 100g      | 3–6 + boss | +60%     |
| `dark-sanctum` | Dark Sanctum  | 7–10       | 200g      | 4–6 + boss | +75%     |
| `dragons-keep` | Dragon's Keep | 10+        | 400g      | 4–7 + boss | +100%    |

The XP bonus is applied multiplicatively per room cleared: `baseXpReward × dungeonTierBonus`. When P0-2 (monster XP level scaler) ships, the three factors multiply: `baseXpReward × levelScaler × tierBonus`.

---

## Weekly Seeded Generation

The week number (ISO week, UTC) seeds a deterministic generator. All players on the same calendar week see the same dungeon layout for each tier.

**Seeded per dungeon per week:**

- Room count (within tier min/max)
- Room type sequence: `'combat' | 'stat-check' | 'rest'` (rest room: 0 or 1 per dungeon, seed-determined)
- Monster pick per combat room (from a tier-appropriate monster subset)
- Stat check variant per stat-check room (which two of the three STR/WIS/AGI paths appear)
- Boss identity (fixed per tier in V1; seed selects flavor text variant)

**Monster subsets per tier:**

| Tier          | Monster Pool                           |
| ------------- | -------------------------------------- |
| Goblin Caves  | goblin-scout, giant-rat, forest-goblin |
| Spider Lair   | cave-spider, forest-goblin, orc-grunt  |
| Dark Sanctum  | skeleton-warrior, dark-wolf, dark-mage |
| Dragon's Keep | stone-troll, dark-mage, ancient-dragon |

Boss monsters are defined separately (see Bosses section) and do not appear in room pools.

---

## Entry Gates & Daily Limits

### HP Gate

Player must have ≥ 50% of max HP to enter any dungeon. On the entry screen, the HP bar shows a pass/fail badge. If HP is below 50%, the "Enter Dungeon" button is disabled with the message: "You need at least 50% HP. Log meals to recover."

### Daily Run Limit

- **2 runs per day hard limit** — global across all tiers (not per-tier independent). A player cannot do 4 runs by hitting 2 tiers; the global cap is 2.
- Tracked via `character.dungeonRunsToday` which stores `{ date: 'YYYY-MM-DD', count: number, legendaryUsed: boolean }`.
- Resets at UTC midnight (consistent with existing daily reset logic).

### Legendary Lockout

- Run 1 (first run of the calendar day, any tier): legendary-eligible. Boss loot table includes legendary rolls.
- Run 2: legendary locked. Boss loot table drops legendaries from the roll. Common–epic items remain available.
- Lockout status is displayed prominently on both the entry screen and the boss victory modal.

### Entry Fee

- Deducted from player gold at dungeon start (when "Enter Dungeon" is tapped).
- If the player abandons or retreats, the entry fee is not refunded. Retreat is an in-run decision, not a pre-run abort.
- If the player cannot afford the entry fee, the "Enter Dungeon" button is disabled with their current gold shown.

---

## Room Types

### Combat Rooms

Standard turn-based combat using the existing engine. The monster is seeded from the tier's pool. Loot escalates by room position:

| Room position | Loot tier                      |
| ------------- | ------------------------------ |
| Room 1        | Common, Uncommon               |
| Room 2        | Uncommon, Rare                 |
| Room 3+       | Rare, Epic                     |
| Boss room     | Epic + Legendary (if eligible) |

### Stat Check Rooms

Three option cards, one per path (STR / WIS / AGI). The seed picks which two paths appear (at minimum STR and one of WIS/AGI must always be present — Wizards cannot be locked out of all paths). The third path appears on a coin flip from the seed.

**Each option card shows:**

- Flavor text (imperative action label, e.g. "Force the door open")
- Stat requirement badge: colored by stat family (STR = red, WIS = violet, AGI = amber)
- Player's current stat displayed inline for direct comparison
- Green ✓ badge if player meets the threshold; red ✗ badge if not
- If player meets threshold: "Choose This Path" CTA button (enabled)
- If player fails threshold: card is dimmed, button reads "Not Available"
- If all paths are failed: the path whose stat is closest to the player's current stat shows "Attempt Anyway" with the explicit HP damage consequence stated (e.g. "Fail = −23 HP"). Exactly one path may show this option (or zero, if the player passes at least one path). This is the risky option — enabled even when the stat is insufficient.

**Stat check thresholds and failure damage by tier:**

| Tier          | STR threshold | WIS threshold | AGI threshold | Failure damage |
| ------------- | ------------- | ------------- | ------------- | -------------- |
| Goblin Caves  | 12            | 10            | 10            | 10% of max HP  |
| Spider Lair   | 16            | 14            | 14            | 15% of max HP  |
| Dark Sanctum  | 19            | 16            | 16            | 20% of max HP  |
| Dragon's Keep | 25            | 21            | 21            | 25% of max HP  |

Thresholds use the player's base stat plus gear bonuses (same calculation as combat stat lookups).

Passing a stat check costs no resources. Failing (via "Attempt Anyway") deals the listed HP damage and advances the player to the next room regardless. There is no "skip room" option — stat checks always resolve one way or the other.

### Rest Rooms

Seed-generated (0 or 1 per dungeon). No combat. Flavor text only. Restores 30% of max Stamina and 30% of max Magic. HP is not restored (HP restores only via real-world nutrition logging). The rest room is a surprise — the room type preview on the entry screen shows it as a `?` node.

---

## Resource Model

HP, Stamina, and Magic carry over between rooms. There is no automatic restore between rooms.

**Between rooms, players may:**

- Use consumables from their equipped combat pack (the room transition interstitial shows a consumable quick-use row)

**HP restoration during a run:**

- Only via real-world nutrition logging (existing mechanic: 20 HP per meal logged, up to daily cap)
- The entry screen makes this explicit: "HP restores only by logging meals in real life"

**Entering a dungeon:**

- Player enters with their current HP, Stamina, and Magic at the moment of entry
- These values are snapshotted into the `dungeonRuns` document at run start
- The `dungeonRunsToday` check also enforces that the player has ≥ 50% HP at the moment of entry (not at the moment of page load)

---

## Bosses

Boss stats scale with player level at run start (boss level = player level at entry + 1) up to a per-tier cap. Above the cap, stats are frozen at cap values. The boss XP values in the table below are base rewards before the tier XP bonus multiplier is applied.

| Tier          | Boss Name               | HP  | ATK | DEF | XP  | Boss Level Cap | Enrage Mechanic                                    |
| ------------- | ----------------------- | --- | --- | --- | --- | -------------- | -------------------------------------------------- |
| Goblin Caves  | The Goblin King         | 140 | 18  | 8   | 150 | 7              | None in V1                                         |
| Spider Lair   | The Broodmother         | 200 | 22  | 11  | 240 | 10             | At 25% HP: +5 ATK permanently                      |
| Dark Sanctum  | The High Necromancer    | 280 | 28  | 14  | 360 | 11             | At 50% HP: absorb next 30 damage (one-time shield) |
| Dragon's Keep | The Ancient Dragon King | 380 | 36  | 18  | 550 | 15             | At 30% HP: +8 ATK, ignores player DEF for 3 rounds |

**Boss enrage mechanics** are stat-conditional modifiers applied within the existing `calculateRound` pipeline — no new combat code architecture required. The Necromancer shield is equivalent to the existing Divine Aegis passive logic.

**Boss loot tables** are defined separately per tier and contain 1–2 dungeon-exclusive items not available from regular combat or the shop. Boss loot is independent of the regular monster loot catalog.

---

## Dungeon-Exclusive Items (Boss Loot)

Items are thematically tied to their tier and build-enabling rather than strictly stat-superior. Two to three per tier in V1.

### Goblin Caves

- **Goblin King's Signet** (Accessory, Epic): +3 AGI, +2 STR. Passive: 10% chance on physical attack to steal 5 gold.
- **Scavenger's Chain** (Armor, Rare): +4 DEF, +2 STA. Passive: survive one fatal hit per combat at 1 HP.
- **Flintsteel Dagger** (Weapon, Uncommon): +4 STR. Passive: natural d10 roll of 10 deals +5 bonus damage.

### Spider Lair

- **Venomfang Bracer** (Accessory, Epic): +5 AGI. Passive: 20% chance on physical hit to apply venom — monster takes 3 damage per round for 3 rounds, bypassing defense. **Implementation note:** venom DoT requires a `poisoned: { roundsRemaining: number; damagePerRound: number }` status field on in-combat monster state, and a per-round tick in `resolveRoundOutcome` before incoming passive resolution. DoT damage bypasses defense and the `DEFENSE_FAIL_CHANCE` roll. Scoped into V1.
- **Arachnoweave Cloak** (Armor, Rare): +3 DEF, +4 AGI. Passive: reduce escape-roll failure chance by 15%.
- **Spiderspun Tome** (Accessory, Epic, Wizard only): +6 WIS. Passive: once per combat, when magic would drop to 0, retain 10 magic instead.

### Dark Sanctum

- **Bone Lattice Armor** (Armor, Epic): +5 DEF, +3 WIS. Passive: gain a Bone Shield charge at combat start absorbing up to 15 damage once.
- **Necrotic Staff** (Weapon, Epic, Wizard only): +8 WIS. Passive: magic attacks ignore 4 monster defense.
- **Wraithbound Ring** (Accessory, Legendary): +4 WIS, +4 STA. Passive: 8% chance per round to restore 8 magic.

### Dragon's Keep

- **Draconic Sigil** (Accessory, Legendary): +6 STR. Passive: once per dungeon run, the first natural d10 roll of 10 after dungeon entry deals double damage.
- **Emberclaw Gauntlets** (Weapon, Epic): +7 STR. Passive: physical attacks gain +2 ATK when player is at or below 40% max HP.
- **Scale of the Dragon King** (Armor, Legendary): +8 DEF, +4 Health. Passive: reduce all incoming monster damage by 1 (flat, always-on, applied after defense).

---

## UI Flow

### 1. Dungeon Lobby (`/combat/dungeons`)

- **Resume banner** (if active run exists): shown at top, above tier cards. Shows dungeon name, current room, HP/Stamina/Magic at last save. One "Resume Run" CTA.
- **Weekly reset timer**: "Resets in Xd Yh (UTC)" — consistent with existing rotation idiom.
- **Tier cards** (4): Each card shows tier name, level range, entry fee, loot badge summary (highest rarity available), and runs-remaining today (e.g. "1/2 runs today"). Thematic gradient background per tier. Tapping a tier card navigates to the entry screen.

### 2. Tier Entry Screen (`/combat/dungeons/[tierId]`)

Top to bottom:

1. Dungeon identity — tier name, thematic header, weekly reset countdown
2. Three resource bars (HP, Stamina, Magic) at current/max with pass/fail HP gate badge
3. Entry fee pill + player's current gold; legendary lockout status badge
4. Room layout preview — horizontal chain of room-type icons (⚔ combat, 🔍 stat check, ? rest, 💀 boss), boss shown as a distinct hexagonal shape
5. Four champion slots — each shows lock icon and "Coming Soon" label in common-gray rarity border (V1 stub)
6. "Enter [Tier Name] · Xg" CTA (disabled if HP gate or gold insufficient)

### 3. Active Run — Combat Room (`/combat/dungeons/run`)

- **Progress chain** above the fight card: nodes labeled R1–Rn + Boss. Current room highlighted (indigo fill, glow). Completed rooms show ✓ (green). Upcoming rooms show faint outline with room-type icon. Boss node is a hexagon shape.
- **Dungeon context strip** below the chain: "Room X of Y · [Tier Name]"
- **Combat HUD** — existing HP/Stamina/Magic bars. On room 1 only: a one-time notice below the bars: "Resources carry over between rooms."
- All existing combat actions (Attack, Magic, Ability, Spell, Run) remain available.

### 4. Active Run — Stat Check Room

- Progress chain (same as combat room, stat check node highlighted in amber)
- Room flavor card (icon, name, description)
- Two or three option cards (see Stat Check Rooms section above)
- No timer — player decides at their own pace

### 5. Room Transition Interstitial

Appears after a room is cleared (combat win or stat check resolved). Replaces the action area without navigating away.

- Updated progress chain (current room now marked ✓)
- Room loot: items with rarity cards, staggered reveal animation (reuse `BattleResultsModal` pattern)
- XP and gold earned this room
- Resource snapshot: three mini-bars (HP/Stamina/Magic). Labels turn amber below 30%, red below 15%
- Consumable quick-use row: tap to use an equipped consumable before advancing
- Two buttons: "↩ Retreat with Loot" (gray, secondary) and "Advance to Room X →" (indigo, primary)
- Retreating ends the run, awards all loot and XP earned so far, marks the run completed (not abandoned). Entry fee is not refunded.

### 6. Boss Victory Modal

Escalated beyond the standard `BattleResultsModal`:

- Full-width gradient header (warm gold tone) with boss emoji large-sized, "CLEARED" in wide letter-spacing above tier name
- Run summary strip: "X rooms cleared · Y rounds fought · Z consumables used"
- Cumulative XP and gold (all rooms + boss, larger typography)
- Boss loot reveal first: staggered animation, legendary card gets a pulse glow if it drops
- Legendary lockout status: "Legendary claimed — next eligible tomorrow" or "Legendary locked (run 2 today)"
- Collapsible "All loot this run (X items)" section below boss loot
- "Claim Rewards" CTA

### 7. Defeat Screen

Standard defeat flow with a dungeon-aware message ("You fell in Room X of [Tier Name]"). Current room node on the progress chain turns red before navigating to defeat screen. Run is marked `abandoned`. Entry fee is not refunded. Loot and XP from cleared rooms prior to the fatal room are retained.

---

## Firestore Data Model

### `dungeonRuns/{runId}`

```ts
{
  uid: string;
  tierId: 'goblin-caves' | 'spider-lair' | 'dark-sanctum' | 'dragons-keep';
  weekSeed: number;              // ISO week number used to generate this run
  status: 'active' | 'completed' | 'abandoned';
  currentRoom: number;           // 0-indexed; boss is rooms.length - 1
  rooms: Array<{
    type: 'combat' | 'stat-check' | 'rest' | 'boss';
    monsterId?: string;          // present for combat and boss rooms
    cleared: boolean;
    lootAwarded: string[];       // itemDefIds awarded on clear
    xpAwarded: number;
    goldAwarded: number;
  }>;
  currentHp: number;
  currentStamina: number;
  currentMagic: number;
  legendaryEligible: boolean;
  cumulativeXp: number;
  cumulativeGold: number;
  allDroppedItems: string[];     // itemDefIds across all rooms
  startedAt: number;             // unix ms
  completedAt: number | null;
}
```

### `characters/{uid}` additions

```ts
dungeonRunsToday?: {
  date: string;           // 'YYYY-MM-DD' UTC
  count: number;          // runs started today (max 2)
  legendaryUsed: boolean; // true after first run completes
};
activeDungeonRunId?: string; // null when no run in progress
```

---

## Pre-Ship Dependencies

The following audit findings from `2026-05-19-game-systems-audit-design.md` should ship with or before dungeons to avoid known issues surfacing at launch:

| Issue                               | Why it matters for dungeons                                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| P0-1: Unify monster damage formula  | Combat rooms use the same engine; the inconsistency affects dungeon fights identically                                             |
| P0-2: Monster XP level scaler       | The tier-scaled XP bonuses are designed to stack with this scaler; shipping dungeons without it means the bonus math is incomplete |
| P0-3: Combat XP diminishing returns | Dungeon clears produce 3–8× the XP of a single fight; without a cap, Dragon's Keep becomes an exploit                              |
| P1-5: Add level 9 monster           | Dark Sanctum and Dragon's Keep pools are thin without it                                                                           |

These are not blockers if tight on time — dungeons will function without them — but the XP economy will be miscalibrated.

---

## Pre-Ship Checklist

- [ ] `dungeonRuns` Firestore collection with security rules (uid-scoped read/write, status transition validation)
- [ ] `characters/{uid}` schema additions for `dungeonRunsToday` and `activeDungeonRunId`
- [ ] Seeded generation function produces deterministic output for the same week seed
- [ ] Stat check thresholds include gear bonuses (same as combat stat resolution)
- [ ] Entry fee deducted atomically with run document creation
- [ ] Dungeon lobby renders a skeleton loading state until active run check resolves (prevents false "no run" flash before resume banner appears)
- [ ] Resume banner shows dungeon name, current room, and HP/Stamina/Magic at last save point
- [ ] Daily limit and legendary lockout enforced server-side (not just client-side)
- [ ] Boss enrage mechanics stay within existing `calculateRound` pipeline
- [ ] Enrage UI: a status strip below the progress chain shows active boss effects ("Enraged — +8 ATK", "Shield active — 30 HP remaining") when triggered
- [ ] Necromancer shield implemented as a damage-absorption modifier in `resolveRoundOutcome` (mirrors existing Divine Aegis passive pattern)
- [ ] Dragon King enrage implemented as a stat override applied for exactly 3 rounds with a round counter in dungeon run state
- [ ] Venom DoT: `poisoned` status on in-combat monster state, 3-damage tick per round for 3 rounds in `resolveRoundOutcome`, bypassing defense
- [ ] Venom proc chance (20%) and DoT values covered by vitest unit tests in `src/lib/gameLogic/__tests__/`
- [ ] Dungeon-exclusive items added to item catalog with `lootOnly: true`
- [ ] Retreat and defeat both award previously-cleared-room loot/XP
- [ ] Progress chain accessible: nodes use icon + label, not color alone
- [ ] `.superpowers/` in `.gitignore` ✓ (already confirmed)

---

## Next-Level Suggestions

1. **Weekly dungeon record tracking** — the seeded structure means every player runs the same dungeon. Track "fewest consumables used" or "lowest HP at boss kill" for a future weekly leaderboard (natural fit given the existing leaderboard roadmap item).
2. **Dungeon completion badges** — a first-clear badge per tier on the character screen creates a collector hook. Four booleans in Firestore, minimal implementation.
3. **Room-type icon vocabulary** — establish the icon set (⚔ combat, 🔍 stat check, 💤 rest) now so V2 room types (activity gates 🏃, riddles 📜) slot in without redesigning the progress chain.
4. **Cursed room variant** — the seed could occasionally generate a room where a stat check failure applies a one-room debuff (e.g. −3 STR next room) instead of HP damage. Adds variety without a new room type.
5. **Dungeon-exclusive badge on loot** — a small tower icon on dungeon-exclusive items in inventory creates a visual signal that pulls players back for the weekly run.

## Potential Risks / Gaps

1. **Global daily limit vs per-tier** — a player who runs Goblin Caves twice has used their daily allocation and cannot access Dragon's Keep that day. This may feel restrictive for high-level players who have outgrown Goblin Caves. Consider whether the global cap should only apply to same-tier runs, or exempt lower tiers from counting against the cap for players 5+ levels above the tier range.
2. **HP gate gaming via nutrition logging** — a player at 30% HP can log meals to restore HP and then immediately enter. This is the intended fitness loop, but the restoration is instant in-game (no cooldown). Acceptable design risk given the Cloud Function daily cap on nutrition, but worth monitoring.
3. **Enrage UI** — resolved: a status strip below the progress chain surfaces active boss effects. Necromancer shield mirrors the existing Divine Aegis passive. Dragon King enrage uses a 3-round counter in run state. Fully scoped into V1.
4. **Resume latency** — resolved: lobby renders a skeleton loading state until the active run check resolves. See pre-ship checklist.
5. **Hybrid build stat check accessibility** — a player who split points across STR/WIS/AGI may fail all available paths on Dark Sanctum or Dragon's Keep checks (thresholds 19/16/16 and 25/21/21). Consider a fourth fallback path using a secondary stat (Stamina or Defense) for high-tier dungeons.
6. **Legendary lockout communication on run 2** — if the lockout status is not shown inside the boss victory modal (only on the entry screen), players on their second daily run will fight the full boss and see no legendary with no explanation. The lockout must appear in the boss loot section of the victory modal.

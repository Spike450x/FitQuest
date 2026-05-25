# FitQuest — Game Logic API Reference

Every exported symbol from `src/lib/gameLogic/*.ts` with a one-line description and source location. This is a **reference** — the source files are short and well-commented; lean on them for full signatures and the comments-explaining-why.

For balance numbers (XP curves, stat caps, drop rates, formulas), see [`src/lib/gameLogic/constants.ts`](../src/lib/gameLogic/constants.ts) and the [Game Mechanics section of the README](../README.md#game-mechanics). For how stores call into these functions, see [ARCHITECTURE.md](ARCHITECTURE.md).

All functions are **pure and deterministic** except those that explicitly call `Math.random()` (`rollD10`, `rollSpellDice`, `rollLoot`, `rollRunAway`, `calculateRound`'s damage rolls, ability resolution randomness). The vitest suite at [`src/lib/gameLogic/__tests__/`](../src/lib/gameLogic/__tests__/) covers every logic module — `xp`, `combat`, `spells`, `streaks`, `quests`, `abilities`, `passives`, `rotation`, `stats`, mastery milestone helpers in `constants`, `activityCaps`, `dungeons`, and `achievements` — plus four parity tests (`activityCaps-parity`, `gearBonuses-parity`, `achievements-parity`, `combatXp-parity` inside `functions/`) that prevent drift from the duplicated `functions/` copies.

---

## `constants.ts` — balance + class definitions

The single source of truth for game numbers. Everything else imports from here.

| Export                        | Kind     | Purpose                                                                                                                                                                                                                              |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CLASS_DEFINITIONS`           | const    | Per-class starting stats and the per-activity stat-multiplier matrix.                                                                                                                                                                |
| `ACTIVITY_DEFINITIONS`        | const    | Per-activity unit, base stat gains, and base XP for the 6 activity types.                                                                                                                                                            |
| `RESTORE`                     | const    | Resource-restore rates for sleep/water/nutrition (e.g. `+5 stamina/hr`, `+5 magic/glass`).                                                                                                                                           |
| `MasteryActivityType`         | type     | Union of `'run' \| 'workout' \| 'steps'`.                                                                                                                                                                                            |
| `MASTERY_CONFIG`              | const    | Mastery milestone interval and the stat each mastery activity grants.                                                                                                                                                                |
| `isMasteryMilestone(count)`   | function | True if `count` is `5` or `15, 25, 35, …` (every 10 after the first 5).                                                                                                                                                              |
| `nextMasteryMilestone(count)` | function | The next mastery threshold above `count`.                                                                                                                                                                                            |
| `LEVEL_UP`                    | const    | Per-level auto-grants (HP, DEF) and pending stat-point increment.                                                                                                                                                                    |
| `xpToNextLevel(level)`        | function | `floor(100 * level^1.5)`. The XP curve.                                                                                                                                                                                              |
| `PRIMARY_STAT_CAP`            | const    | `50` — hard cap for STR / WIS / AGI. Mirrored in `firestore.rules`.                                                                                                                                                                  |
| `maxStatForLevel(level)`      | function | Secondary-stat cap formula (`level × 5 + 10`).                                                                                                                                                                                       |
| `statCap(stat, level)`        | function | Returns the cap for any stat — primary stats use `PRIMARY_STAT_CAP`, secondary use `maxStatForLevel`.                                                                                                                                |
| `COMBAT`                      | const    | Combat balance numbers (defense-bypass chance, ability stamina cost, etc.). Key values: `MAX_EQUIPPED_SPELLS: 5`. `SPELL_MAX_CHARGES: 3` is a defensive fallback — per-rarity charges live in `getSpellMaxCharges()` in `spells.ts`. |

---

## `activityCaps.ts` — daily reward caps

Tested in [`__tests__/activityCaps.test.ts`](../src/lib/gameLogic/__tests__/activityCaps.test.ts) and parity-tested against the `functions/` copy in [`__tests__/activityCaps-parity.test.ts`](../src/lib/gameLogic/__tests__/activityCaps-parity.test.ts).

| Export                                                  | Kind     | Purpose                                                                                                                        |
| ------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ActivityType`                                          | type     | Union of the 6 activity types (`workout` \| `run` \| `steps` \| `sleep` \| `water` \| `nutrition`).                            |
| `DAILY_ACTIVITY_CAPS`                                   | const    | Per-activity daily soft cap on the amount eligible for XP, stat gains, mastery, and quest progress. Excess still logs.         |
| `eligibleAmountForRewards(type, alreadyLogged, amount)` | function | Returns the portion of `amount` still under the cap given today's prior total. Used by both client preview and Cloud Function. |

**Why duplicated:** This module is also copied to `functions/src/gameLogic/activityCaps.ts` so the `logActivity` Cloud Function can apply the same cap without `@/` path-alias dependencies. The parity test asserts the two copies cannot drift.

---

## `xp.ts` — leveling

Tested in [`__tests__/xp.test.ts`](../src/lib/gameLogic/__tests__/xp.test.ts).

| Export                  | Returns                                      | Notes                                                                                 |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `applyXp(char, gained)` | `{ level, xp, xpToNextLevel, levelsGained }` | Handles **multi-level** XP awards in one call (loops until carryover XP is consumed). |
| `xpProgress(xp, level)` | `0–1` fraction                               | For rendering the XP bar.                                                             |

---

## `stats.ts` — stat application + resource math

| Export                                    | Returns / Purpose                                                                                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `ResourceType`                            | `'hp' \| 'stamina' \| 'magic'`.                                                                                                              |
| `ResourceRestore`                         | Result shape for `calculateResourceRestore`.                                                                                                 |
| `calculateResourceRestore(activity, ...)` | Maps an activity log to HP/stamina/magic restore amounts (e.g. sleep → stamina, water → magic, food → HP).                                   |
| `applyStatGains(stats, gains, statCap)`   | Applies per-stat gains and clamps each stat to its cap. Used by `awardXpAndStats` (mastery awards live in the `logActivity` Cloud Function). |

---

## `combat.ts` — fight resolution

Tested in [`__tests__/combat.test.ts`](../src/lib/gameLogic/__tests__/combat.test.ts).

| Export                                       | Purpose                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `playerMaxHp(character)`                     | `50 + stamina*2 + health + gear`. Called by stores when normalizing HP.                                                                                                                                                                                                                                                                                                            |
| `playerMaxStamina(character)`                | `20 + stamina*5 + gear`.                                                                                                                                                                                                                                                                                                                                                           |
| `playerMaxMagic(character)`                  | `20 + wisdom*3 (+10 if wizard)`.                                                                                                                                                                                                                                                                                                                                                   |
| `totalGearBonuses(equippedGear)`             | Sums stat bonuses across the three equipped gear slots.                                                                                                                                                                                                                                                                                                                            |
| `gearAttackBonus(character, attackMode)`     | Weapon STR bonus for `'attack'` mode, weapon WIS bonus for `'magic'` mode.                                                                                                                                                                                                                                                                                                         |
| `gearDefenseBonus(character)`                | Total armor + accessory DEF bonus.                                                                                                                                                                                                                                                                                                                                                 |
| `rollD10()`                                  | `1–10` inclusive.                                                                                                                                                                                                                                                                                                                                                                  |
| `calculateRound(character, monster, action)` | Resolves a single combat round (player damage, monster counter, defense bypass, etc.).                                                                                                                                                                                                                                                                                             |
| `rollLoot(monster, lootMultiplier)`          | Rolls the monster's loot table; `lootMultiplier` from `getStreakLootMultiplier` for rare+ items.                                                                                                                                                                                                                                                                                   |
| `rollRunAway(character, monster)`            | `d10 + AGI + escape bonuses` vs `monster d10`. Returns escape outcome.                                                                                                                                                                                                                                                                                                             |
| `monsterXpScaling(playerLvl, monsterLvl)`    | Returns the player-over-monster XP scaling for top-tier monsters (level ≥ 8). +8% per level above, capped at 2.0×. Returns 1.0× for low-tier monsters so grinding the Goblin Scout at level 20 never becomes optimal.                                                                                                                                                              |
| `combatXpDailyMultiplier(winsToday)`         | Daily diminishing-returns multiplier on **combat-win XP** (gold is never diminished). `1.0×` for wins 1–9, `0.5×` at wins 10–19, `0.25×` at 20–29, `0.1×` floor at 30+. Mirrored in `functions/src/gameLogic/combat.ts` because the authoritative application happens inside the `claimCombatVictory` Cloud Function. Parity-tested in `functions/src/__tests__/combatXp.test.ts`. |
| `combatWinsUntilNextPenalty(winsToday)`      | UI helper for the "Daily combat XP" badge on the combat page. Returns `{ remaining, nextMultiplier }` describing the next breakpoint, or `null` once the floor (30+ wins) is reached.                                                                                                                                                                                              |

---

## `abilities.ts` — 6d6 class ability system

| Export                                              | Kind      | Purpose                                                                                         |
| --------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| `DicePattern`                                       | type      | `'three' \| 'small_straight' \| 'large_straight' \| 'full_house' \| 'four_of_a_kind'`.          |
| `AbilityDef`                                        | interface | Static ability definition (name, base damage, multiplier, flags for stun / bypass / lifesteal). |
| `AbilityResolution`                                 | interface | Result of resolving an ability (final damage, stun, bypass, lifesteal payback).                 |
| `detectPattern(dice)`                               | function  | Detects highest poker-like pattern in 6d6. Returns `null` if no pattern hits.                   |
| `getAbility(class, pattern)`                        | function  | Looks up the ability for a `(class, pattern)` pair. Returns `null` if none.                     |
| `resolveAbility(character, monster, ability, dice)` | function  | Applies subclass mods + outgoing passives, computes final damage.                               |

The catalog itself (`CLASS_ABILITY_CATALOG`) is module-internal — go through `getAbility` / `resolveAbility`.

---

## `spells.ts` — spell dice resolution

Tested in [`__tests__/spells.test.ts`](../src/lib/gameLogic/__tests__/spells.test.ts).

| Export                                          | Purpose                                                                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rollSpellDice(count)`                          | Rolls `count` d6.                                                                                                                                         |
| `checkRequirement(req, dice)`                   | Evaluates a `SpellDiceRequirement` against the rolled dice (sum_gte, exact_value, pair, three, straight).                                                 |
| `describeRequirement(req)`                      | Human-readable text for a requirement (e.g. "Roll 3d6, total ≥ 10").                                                                                      |
| `SpellResolution`                               | Result interface — succeeded/failed, dice, damage, heal, stun, etc.                                                                                       |
| `resolveSpell(character, monster, spell, dice)` | Full spell resolution: cost, requirement check, effect application, passive mods.                                                                         |
| `getHighlightedSpellDiceIndices(req, dice)`     | Returns which dice indices to highlight in the UI (the dice that satisfy the requirement).                                                                |
| `getSpellMaxCharges(rarity?)`                   | Per-rarity max charges per encounter (common 2, uncommon/rare 3, epic 4, legendary 5). Falls back to `COMBAT.SPELL_MAX_CHARGES` when rarity is undefined. |

---

## `combatActions.ts` — pure action resolvers

Tested in [`__tests__/combatActions.test.ts`](../src/lib/gameLogic/__tests__/combatActions.test.ts).

Pure resolver layer that wraps `combat.ts` / `abilities.ts` / `spells.ts` / `passives.ts`. Each `resolveXAction` takes a `state + character + modifiers` input and returns `{ nextState, logEntry, pending, bannerMessage? }` — no React, no Firestore. Consumed by `useCombatEncounter` (`src/hooks/useCombatEncounter.ts`) in both the arena page and the dungeon run page.

| Export                                            | Purpose                                                                                                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ActionInput`                                     | Inputs for every resolver: `state, character, maxHp, maxStamina, maxMagic, streakMultiplier, getPityFor, modifiers?`.                                      |
| `ActionResolution`                                | Output: `nextState`, `logEntry`, `pending` (overlay payload — `'action' \| 'ability' \| 'spell' \| 'none'`), `bannerMessage?` surfaced by `postRoundHook`. |
| `resolveAttackAction(input, 'attack' \| 'magic')` | Standard d10 attack. Applies outgoing passives, Soul Drain, `resolveRoundOutcome`. Runs all four `CombatModifiers` hooks in order.                         |
| `resolveAbilityAction(input)`                     | 6d6 class ability roll. Applies subclass mods, Lethal Opener, lifesteal, Execute, Momentum stamina restore, fizzle refund.                                 |
| `resolveSpellAction(input, spellDef)`             | Spell cast. Resolves dice requirement, applies Archmage discount + Blood Pact, defense boost, monster stun.                                                |
| `resolveMeditateAction(input)`                    | Roll d10 + WIS magic restore. Monster gets a free attack (defense bypassed).                                                                               |
| `resolveRestAction(input)`                        | Roll d10 × 3 stamina restore. Monster gets a free attack (defense bypassed).                                                                               |
| `resolveFleeAction(input)`                        | AGI roll vs monster. On escape → `outcome: 'fled'`. On failure → monster strikes (defense bypassed).                                                       |
| `resolveUseItemAction(input, hp, sta, mag)`       | Synchronous consumable apply — clamps gained values and returns `pending.kind = 'none'` (no overlay). Caller awaits `useConsumable` before invoking.       |

The `CombatModifiers` seam (declared in `src/components/combat/types.ts`) fires at four fixed slots inside each offensive resolver:

1. `preActionTick(state)` — venom DoT (mutates monster HP before the round).
2. `effectiveMonster(base, state)` — swap monster ATK/DEF (boss enrage, Dragon ignore-DEF). Receives the _already active-boosted_ base (enrage/harden already applied from `FightState.monsterBonusAtk` / `monsterBonusDef`) so dungeon overrides stack correctly.
3. `absorbPlayerDamage(damage, state)` — Necro Shield absorbs raw player damage.
4. `postRoundHook(state, ctx)` — re-evaluate enrage, fire venom proc, surface banner message.

Arena passes `modifiers: undefined` and every hook short-circuits to identity. Dungeon delegates to the unchanged helpers in `dungeons.ts` (`checkVenomProc`, `bossEffectiveAtk`, `applyNecroShield`, `evaluateBossEnrage`, `dragonIgnoresDef`).

**Monster passive/active hooks** (built into the resolvers — not part of `CombatModifiers`):

| Timing                                | Mechanic                                                 | Notes                                                                                |
| ------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Pre-action (after venom tick)         | `regen` heals monster HP                                 | Only on offensive actions (attack/magic/ability/spell); skipped on rest/meditate     |
| After player damage lands             | `thorns` reflects `value%` of player damage to player    | Added on top of monster counter-attack; can cause simultaneous kill (player wins)    |
| After monster counter-attack resolves | `vampiric` heals monster `value%` of its own counter     | Skip when monster is dead (HP = 0)                                                   |
| After player damage lands             | Active threshold check — fires `enrage` or `harden` once | Sets `FightState.activeUsed = true`, accumulates `monsterBonusAtk`/`monsterBonusDef` |

---

## `passives.ts` — subclass passive system

Largest file by export count. Read the source for the actual passive descriptions; the table below is a navigation aid.

| Group                 | Exports                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| **Static catalog**    | `SubclassDef`, `SUBCLASS_CATALOG`, `getSubclassDef(subclass)`                                             |
| **Outgoing damage**   | `applyOutgoingPassives(...)`, `OutgoingPassiveResult`, `getAbilityDamageMultiplier(char, isFirstAbility)` |
| **Incoming damage**   | `applyIncomingPassives(...)`, `IncomingPassiveResult`                                                     |
| **Lifesteal**         | `resolveLifesteal(...)`, `LifestealResult`                                                                |
| **Spells**            | `applySpellDamagePassives(char, raw)`, `getEffectiveSpellCost(char, base)`, `canBloodPact(char, ...)`     |
| **Abilities**         | `applySubclassAbilityMods(...)`, `ModifiedAbility`, `getAbilityStaminaCost(char, ability)`                |
| **Per-round effects** | `getPerRoundPassives(char)`, `PerRoundPassives`, `getMomentumRestore(char, abilityKill)`                  |
| **Execute / escape**  | `checkExecute(...)`, `getEscapeBonus(char)`, `hasSureEscape(char)`                                        |
| **Context type**      | `PassiveContext`                                                                                          |

`combat.ts` and `spells.ts` are the primary callers — they invoke these in fixed order around damage calculations.

---

## `items.ts` — item catalog

| Export            | Kind     | Purpose                                                                                    |
| ----------------- | -------- | ------------------------------------------------------------------------------------------ |
| `RARITY_BADGE`    | const    | Tailwind background-color classes per rarity (`common` → gray, `legendary` → orange/gold). |
| `RARITY_TEXT`     | const    | Tailwind text-color classes per rarity.                                                    |
| `ITEM_CATALOG`    | const    | Every item in the game (gear, consumables, spells). Single source of truth.                |
| `getItemById(id)` | function | Catalog lookup. Returns `undefined` for unknown IDs.                                       |

Items with `lootOnly: true` never appear in the shop — only in monster loot tables.

---

## `monsters.ts` — monster catalog

| Export            | Purpose                                                                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MONSTER_CATALOG` | 11 monsters (levels 1–10; two at level 1, Lich King at level 9, Ancient Dragon at level 10). Every entry carries a `passive` or `active` from `MonsterPassive` / `MonsterActive` (see `src/types/index.ts`). Tested in `monsterPassives.test.ts`. |

### Monster passive/active assignments

| Monster          | Lvl | Mechanic                                 | Detail                                     |
| ---------------- | --- | ---------------------------------------- | ------------------------------------------ |
| Goblin Scout     | 1   | Passive: `thorns` (Spiked Hide)          | Reflects 10% of incoming player damage     |
| Giant Rat        | 1   | Passive: `thorns` (Jagged Claws)         | Reflects 12% of incoming player damage     |
| Forest Goblin    | 2   | Passive: `regen` (Hardy)                 | Heals 2 HP each offensive round            |
| Orc Grunt        | 3   | Active: `enrage` @ 50% HP                | Permanently boosts ATK +4                  |
| Cave Spider      | 4   | Passive: `thorns` (Venomous Spines)      | Reflects 18% of incoming player damage     |
| Skeleton Warrior | 5   | Passive: `regen` (Undying)               | Heals 4 HP each offensive round            |
| Dark Wolf        | 6   | Active: `enrage` @ 40% HP (Blood Frenzy) | Permanently boosts ATK +5                  |
| Stone Troll      | 7   | Passive: `regen` (Trollish Resilience)   | Heals 6 HP each offensive round            |
| Dark Mage        | 8   | Passive: `vampiric` (Life Tap)           | Heals 30% of its own counter-attack damage |
| Lich King        | 9   | Active: `harden` @ 50% HP (Bone Shield)  | Permanently boosts DEF +6                  |
| Ancient Dragon   | 10  | Passive: `thorns` (Dragon Scales)        | Reflects 25% of incoming player damage     |

Dungeon boss rooms (`isBossRoom`) suppress the passive/active badge UI and do not apply `passive`/`active` fields — bosses use the existing `CombatModifiers` seam.

The Ancient Dragon's loot table is the primary source of legendary loot from regular combat. Dungeon bosses have separate, tier-specific loot tables (defined in `dungeons.ts`) containing 12 dungeon-exclusive items not available from regular combat or the shop (`lootOnly: true`).

---

## `quests.ts` — quest pools

| Export                    | Kind     | Purpose                                                                               |
| ------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `DAILY_QUEST_POOL`        | const    | 28 daily quests across 6 activity types. 3 are picked each day via `getDailyPick`.    |
| `WEEKLY_QUEST_POOL`       | const    | 14 weekly quests across 6 activity types. 3 are picked each week via `getWeeklyPick`. |
| `getQuestDef(questDefId)` | function | Catalog lookup across both pools.                                                     |

---

## `rotation.ts` — deterministic daily/weekly rotation

| Export                       | Purpose                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `getDailyPick(arr, count)`   | Seeded shuffle by today's local date. Same `arr` → same picks for everyone, all day. |
| `getWeeklyPick(arr, count)`  | Seeded shuffle by ISO week (Mon–Sun). Same picks for everyone, all week.             |
| `deriveWeekKey(dateKey)`     | Converts `'YYYY-MM-DD'` → `'YYYY-WW'` ISO week key without reading the clock.        |
| `dailyExpiresAt()`           | Unix ms for local midnight tonight (start of tomorrow).                              |
| `weeklyExpiresAt()`          | Unix ms for end of this Sunday `23:59:59.999` local time.                            |
| `formatCountdown(expiresAt)` | Human-readable "Xh Ym" / "Nd" countdown for quest UI.                                |

Internal helpers (`getDaySeed`, `getWeekSeed`, `seededShuffle` — Numerical Recipes LCG) are not exported.

---

## `shopRotation.ts` — weekly spell featured rotation

Thin wrapper around `getWeeklyPick` with the canonical spell-count constant.

| Export                              | Purpose                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| `WEEKLY_SPELL_COUNT`                | `5` — number of featured spells shown in the shop each week.                                     |
| `getWeeklySpells(spells, weekKey?)` | Returns the 5 weekly featured spells seeded by ISO week. Pass `weekKey` for deterministic tests. |

Tested in [`__tests__/shopRotation.test.ts`](../src/lib/gameLogic/__tests__/shopRotation.test.ts).

---

## `streaks.ts` — daily streaks + personal records

| Export                             | Kind      | Purpose                                                                                                                                                                       |
| ---------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StreakData`                       | interface | `{ currentStreak, longestStreak, lastLogDate }`. Stored on the character doc.                                                                                                 |
| `PersonalRecord`                   | interface | `{ value, loggedAt, unit }` per activity type.                                                                                                                                |
| `PersonalRecords`                  | type      | `Partial<Record<ActivityType, PersonalRecord>>`.                                                                                                                              |
| `StreakTier`                       | interface | A Blessing-tier definition (name, day threshold, loot multiplier).                                                                                                            |
| `STREAK_TIERS`                     | const     | The 6 Blessing tiers (Focused → Blessed). Multiplier applies to **rare+** loot only.                                                                                          |
| `todayUTC()`                       | function  | `'YYYY-MM-DD'` for today in UTC. Used for `lastLogDate`.                                                                                                                      |
| `utcDayStartMs(date?)`             | function  | Unix ms for the UTC midnight that begins the given date (defaults to now). Used by `fetchTodayLogsForType` so the date boundary is injectable in tests without Firebase deps. |
| `computeNewStreak(current, today)` | function  | Streak transition: same day → no change, consecutive day → +1, gap → reset to 1.                                                                                              |
| `getStreakTier(streak)`            | function  | Highest tier reached at the given streak length.                                                                                                                              |
| `getStreakLootMultiplier(streak)`  | function  | Convenience accessor for the tier's loot multiplier.                                                                                                                          |
| `getStreakXpMultiplier(streak)`    | function  | XP multiplier for the current streak length (≥ 1.0). Snapshotted at kill-time for the `BattleResultsModal` annotation.                                                        |

---

## `dungeons.ts` — dungeon system logic

Tested in [`__tests__/dungeons.test.ts`](../src/lib/gameLogic/__tests__/dungeons.test.ts).

| Export                                          | Kind      | Purpose                                                                                                                                                                                                                                              |
| ----------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DungeonTierId`                                 | type      | `'goblin-caves' \| 'spider-lair' \| 'dark-sanctum' \| 'dragons-keep'`.                                                                                                                                                                               |
| `DungeonTierDef`                                | interface | Static tier definition: name, rec level range, entry fee, min/max rooms, XP multiplier, monster pool.                                                                                                                                                |
| `DUNGEON_TIERS`                                 | const     | The 4 tier definitions keyed by `DungeonTierId`.                                                                                                                                                                                                     |
| `DUNGEON_BOSS_DEFS`                             | const     | Boss definitions per tier — HP, ATK, DEF, base XP, level cap, and enrage threshold/effect.                                                                                                                                                           |
| `mulberry32(seed)`                              | function  | Deterministic PRNG. Returns a seeded `() => number` generator. All dungeon generation is seeded through this.                                                                                                                                        |
| `getWeekSeedForDungeon(tierId)`                 | function  | Computes `year * 100 + ISO week number` — stable across all players in the same calendar week.                                                                                                                                                       |
| `generateDungeonRooms(tierId, seed)`            | function  | Produces the full room sequence (type, monsterId, etc.) for a given tier and week seed. Deterministic — same inputs → same layout.                                                                                                                   |
| `getStatCheckThreshold(tierId, stat)`           | function  | Returns the stat threshold for a given tier and stat path (STR/WIS/AGI).                                                                                                                                                                             |
| `getStatCheckDamage(tierId, maxHp)`             | function  | Returns the HP damage for a failed stat-check "Attempt Anyway" (percentage of maxHp, tier-scaled).                                                                                                                                                   |
| `resolveStatCheck(character, tierId, statPath)` | function  | Evaluates whether the player passes the stat check for the chosen path, using base stat + gear bonuses.                                                                                                                                              |
| `applyVenomTick(monsterHp, poisoned)`           | function  | Advances the venom DoT state: decrements `roundsRemaining`, applies `damagePerRound` to monster HP, bypassing defense.                                                                                                                               |
| `applyBossEnrage(boss, enrageState, round)`     | function  | Returns modified boss stats for the current round given active enrage state (Broodmother ATK+5, Necromancer shield, Dragon King 3-round).                                                                                                            |
| `isBossEnrageTriggered(boss, bossHp, maxHp)`    | function  | Returns whether the enrage threshold has been crossed this round.                                                                                                                                                                                    |
| `resolveStatCheckFlavor(tierId, roomSeed)`      | function  | Returns a thematic `{ description, hint }` for a stat-check room, seeded deterministically from `roomSeed`. Each tier has 3–4 entries in `STAT_CHECK_SCENARIOS`. Used by the dungeon run page to display narrative context above the option buttons. |

---

## `achievements.ts` — one-time milestone badges

Tested in [`__tests__/achievements.test.ts`](../src/lib/gameLogic/__tests__/achievements.test.ts) and parity-tested against the `functions/` copy in [`__tests__/achievements-parity.test.ts`](../src/lib/gameLogic/__tests__/achievements-parity.test.ts).

| Export                                     | Kind      | Purpose                                                                                                                                                          |
| ------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AchievementDef`                           | interface | Static badge definition: `id`, `name`, `description`, `goldReward`, `emoji`.                                                                                     |
| `ACHIEVEMENTS`                             | const     | All 6 dungeon achievement definitions keyed by `AchievementId`: `dungeon-initiate`, `goblin-slayer`, `web-walker`, `dark-arts`, `dragonheart`, `legendary-haul`. |
| `checkDungeonAchievements(character, run)` | function  | Compares a completed run against the character's existing achievements. Returns newly earned `AchievementId[]`. Returns `[]` for non-completed runs.             |

Gold rewards: `dungeon-initiate` 50g, `goblin-slayer` 100g, `web-walker` 150g, `dark-arts` 250g, `dragonheart` 500g, `legendary-haul` 200g.

**Why duplicated:** Achievement award logic runs inside the `claimDungeonRun` Firestore transaction so gold + badge are stamped atomically. To avoid `@/` path-alias dependencies in the Cloud Function, the pure helpers (`LEGENDARY_ITEM_IDS`, `ACHIEVEMENT_GOLD`, `checkNewAchievements`) are mirrored in `functions/src/gameLogic/achievements.ts`. The parity test asserts `LEGENDARY_ITEM_IDS` exactly matches every `rarity: 'legendary'` item in `ITEM_CATALOG`, `ACHIEVEMENT_GOLD` values match `ACHIEVEMENTS[id].goldReward`, and `checkNewAchievements` produces the same output as `checkDungeonAchievements` for equivalent inputs.

---

## Adding a new game-logic function

1. Decide which file it belongs in (or add a new file under `src/lib/gameLogic/` with one clear responsibility).
2. Keep it pure — no Firestore reads/writes, no `Date.now()` unless the function is genuinely time-dependent (rotation/streaks).
3. Add a vitest test in `src/lib/gameLogic/__tests__/<file>.test.ts` covering the happy path and one or two edge cases.
4. Export the symbol; update this doc with a row in the right table.

---

## Cross-references

- **How stores consume these functions** → [ARCHITECTURE.md](ARCHITECTURE.md#data-flow--logging-an-activity)
- **Field-level shape of the data these functions read/write** → [FIRESTORE.md](FIRESTORE.md)
- **CI gates that protect game-logic regressions** → [CI.md](CI.md#mapping-checks-to-regression-classes)
- **Game-mechanic narrative + balance tables** → [README.md](../README.md#game-mechanics)

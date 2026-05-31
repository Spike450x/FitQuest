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
| `ACTIVITY_DEFINITIONS`        | const    | Per-activity metadata (label, unit, description) for the 7 activity types. Activities do **not** grant XP directly — XP comes via quest completion. They grant mastery counters + resource restores.                                 |
| `RESTORE`                     | const    | Resource-restore rates: `HP_PER_MEAL: 20`, `STAMINA_PER_SLEEP_HOUR: 5`, `MAGIC_PER_WATER_GLASS: 5`, `MAGIC_PER_MEDITATION_MINUTE: 0.2`.                                                                                              |
| `MasteryActivityType`         | type     | Union of `'run' \| 'workout' \| 'steps' \| 'meditation'`.                                                                                                                                                                            |
| `MASTERY_CONFIG`              | const    | Mastery milestone interval and the stat each mastery activity grants.                                                                                                                                                                |
| `MASTERY_ACTIVITIES`          | const    | `Set` of the 4 activities that accrue mastery (`run`, `workout`, `steps`, `meditation`).                                                                                                                                             |
| `RESTORE_ACTIVITIES`          | const    | `Set` of the 4 activities that restore a resource (`nutrition`, `sleep`, `water`, `meditation`). `meditation` is the only activity in both sets.                                                                                     |
| `isMasteryMilestone(count)`   | function | True if `count` is `5` or `15, 25, 35, …` (every 10 after the first 5).                                                                                                                                                              |
| `nextMasteryMilestone(count)` | function | The next mastery threshold above `count`.                                                                                                                                                                                            |
| `LEVEL_UP`                    | const    | Per-level auto-grants (HP, DEF) and pending stat-point increment.                                                                                                                                                                    |
| `xpToNextLevel(level)`        | function | `floor(100 * level^1.5)`. The XP curve.                                                                                                                                                                                              |
| `PRIMARY_STAT_CAP`            | const    | `50` — hard cap for STR / WIS / AGI / SPR. Mirrored in `firestore.rules`.                                                                                                                                                            |
| `maxStatForLevel(level)`      | function | Secondary-stat cap formula (`level × 5 + 10`).                                                                                                                                                                                       |
| `statCap(stat, level)`        | function | Returns the cap for any stat — primary stats use `PRIMARY_STAT_CAP`, secondary use `maxStatForLevel`.                                                                                                                                |
| `COMBAT`                      | const    | Combat balance numbers (defense-bypass chance, ability stamina cost, etc.). Key values: `MAX_EQUIPPED_SPELLS: 5`. `SPELL_MAX_CHARGES: 3` is a defensive fallback — per-rarity charges live in `getSpellMaxCharges()` in `spells.ts`. |
| `QUEST_REROLL_BASE`           | const    | `100` — base gold cost of a quest reroll before level scaling.                                                                                                                                                                       |
| `questRerollCost(level)`      | function | Level-scaled reroll cost: `100 × max(1, floor(level/5))`. L1–9 = 100 g, L10–14 = 200 g, L15+ = 300 g.                                                                                                                                |

---

## `activityCaps.ts` — daily reward caps

Tested in [`__tests__/activityCaps.test.ts`](../src/lib/gameLogic/__tests__/activityCaps.test.ts) and parity-tested against the `functions/` copy in [`__tests__/activityCaps-parity.test.ts`](../src/lib/gameLogic/__tests__/activityCaps-parity.test.ts).

| Export                                                   | Kind     | Purpose                                                                                                                        |
| -------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ActivityType`                                           | type     | Union of the 6 activity types (`workout` \| `run` \| `steps` \| `sleep` \| `water` \| `nutrition`).                            |
| `DAILY_ACTIVITY_CAPS`                                    | const    | Per-activity daily soft cap on the amount eligible for XP, stat gains, mastery, and quest progress. Excess still logs.         |
| `eligibleAmountForRewards(type, alreadyLogged, amount)`  | function | Returns the portion of `amount` still under the cap given today's prior total. Used by both client preview and Cloud Function. |
| `remainingCapacityForActivity(type, alreadyLoggedToday)` | function | Amount still loggable for rewards today (`cap − alreadyLogged`, floored at 0). Backs the log-form cap meter.                   |
| `dailyCapUsageFraction(type, alreadyLoggedToday)`        | function | `alreadyLogged / cap` clamped to `[0, 1]` — progress-bar width / "X% of cap used" label.                                       |

**Why duplicated:** This module is also copied to `functions/src/gameLogic/activityCaps.ts` so the `logActivity` Cloud Function can apply the same cap without `@/` path-alias dependencies. The parity test asserts the two copies cannot drift.

---

## `xp.ts` — leveling

Tested in [`__tests__/xp.test.ts`](../src/lib/gameLogic/__tests__/xp.test.ts).

| Export                           | Returns                                      | Notes                                                                                                                        |
| -------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `applyXp(char, gained)`          | `{ level, xp, xpToNextLevel, levelsGained }` | Handles **multi-level** XP awards in one call (loops until carryover XP is consumed).                                        |
| `xpProgress(xp, level)`          | `0–1` fraction                               | For rendering the XP bar.                                                                                                    |
| `scaleQuestRewards(base, level)` | `{ xp, gold }`                               | Level-scales a quest's base reward via `0.4 + 0.6·√l` (steepened in P1-1; 1.0× at L1, ~3.4× at L25). Applied at quest claim. |

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

| Export                                                               | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `effectiveStat(character, statKey)`                                  | Class-scaled stat: `floor(base × statMultipliers[statKey])`. The single source of truth that makes the character-sheet class multipliers **real** — every combat/pool formula consumes the effective value (gear added flat). Drives outgoing damage (STR/WIS), physical damage taken (DEF), escape (AGI), crit (Spirit), pools (STA/HEALTH/WIS). Multipliers were compressed and the magic-axis added in the 2026-05-31 balance pass.                                     |
| `classDodgeChance(character)`                                        | Rogue-only chance (0–1) to fully negate a monster hit; scales with effective Agility (`ROGUE_DODGE_PER_AGILITY`), capped at `ROGUE_DODGE_CAP`. `0` for every other class.                                                                                                                                                                                                                                                                                                  |
| `rollClassDodge(character, rng?)`                                    | Rolls the Rogue dodge. Applied at every incoming-hit chokepoint (`resolveRoundOutcome`, recovery free hit, failed-escape hit); surfaces as `dodged` in the round log.                                                                                                                                                                                                                                                                                                      |
| `incomingMonsterDamage(character, monster, rawAttack, effectiveDef)` | Final monster→player hit (pre-passives/dodge). **Physical** subtracts `effectiveDef`; **magic** ignores armor — then scaled by `CLASS_DAMAGE_TAKEN[class][school]` and floored at `MIN_DAMAGE`. The magic axis of the class triangle (Warrior ×1.3 magic, Wizard ×0.75 magic). Used by `calculateRound` / `rollMonsterAttack` / spell counter / recovery + failed-escape hits.                                                                                             |
| `playerMaxHp(character)`                                             | `50 + effStamina*1 + effHealth*2 + gear` (Health is the primary HP stat; Stamina mainly drives the ability pool). Effective = class-scaled. Mirrored in `functions/` (pool parity).                                                                                                                                                                                                                                                                                        |
| `playerMaxStamina(character)`                                        | `20 + effStamina*5 + gear` (effective = class-scaled). Mirrored in `functions/`.                                                                                                                                                                                                                                                                                                                                                                                           |
| `playerMaxMagic(character)`                                          | `20 + effWisdom*3 (+10 if wizard)` (effective = class-scaled). Mirrored in `functions/`.                                                                                                                                                                                                                                                                                                                                                                                   |
| `totalGearBonuses(equippedGear)`                                     | Sums stat bonuses across the three equipped gear slots.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `gearAttackBonus(character, attackMode)`                             | Weapon STR bonus for `'attack'` mode, weapon WIS bonus for `'magic'` mode.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `gearDefenseBonus(character)`                                        | Total armor + accessory DEF bonus.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `rollD10()`                                                          | `1–10` inclusive.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `calculateRound(character, monster, action)`                         | Resolves a single combat round (player damage, monster counter, defense bypass, etc.).                                                                                                                                                                                                                                                                                                                                                                                     |
| `rollLoot(monster, lootMultiplier)`                                  | Rolls the monster's loot table; `lootMultiplier` from `getStreakLootMultiplier` for rare+ items.                                                                                                                                                                                                                                                                                                                                                                           |
| `rollRunAway(character, monster)`                                    | `d10 + AGI + escape bonuses` vs `monster d10`. Returns escape outcome.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `monsterXpScaling(playerLvl, monsterLvl)`                            | Returns the player-over-monster XP scaling for top-tier monsters (level ≥ 8). +8% per level above, capped at 2.0×. Returns 1.0× for low-tier monsters so grinding the Goblin Scout at level 20 never becomes optimal.                                                                                                                                                                                                                                                      |
| `combatXpDailyMultiplier(winsToday)`                                 | Daily diminishing-returns multiplier on **combat-win XP** (gold is never diminished). `1.0×` for wins 1–4, `0.5×` at wins 5–14, `0.25×` at 15–24, `0.1×` floor at 25+. Tightened in the balance pass from the original `0–9 / 10–19 / 20–29 / 30+` breakpoints. Mirrored in `functions/src/gameLogic/combat.ts` because the authoritative application happens inside the `claimCombatVictory` Cloud Function. Parity-tested in `functions/src/__tests__/combatXp.test.ts`. |
| `combatWinsUntilNextPenalty(winsToday)`                              | UI helper for the "Daily combat XP" badge on the combat page. Returns `{ remaining, nextMultiplier }` describing the next breakpoint, or `null` once the floor (25+ wins) is reached.                                                                                                                                                                                                                                                                                      |
| `spellCritChance(spirit)`                                            | Spirit → spell/ability crit chance: `+1%` per point, capped at `40%` (content-scaling PR1).                                                                                                                                                                                                                                                                                                                                                                                |
| `spellCritDamage(spirit)`                                            | Spirit → crit damage bonus: `+0.5%` per point, capped at `+25%` (PR1).                                                                                                                                                                                                                                                                                                                                                                                                     |
| `rollSpellCrit(spirit)`                                              | Rolls a spell/ability crit using `spellCritChance(spirit)`. Returns `{ crit, multiplier }`. Wired into `resolveAbilityAction` / `resolveSpellAction` — fires only on a successful, damage-dealing action. Mirrored in `functions/src/gameLogic/combat.ts`.                                                                                                                                                                                                                 |
| `monsterArmorPierce(monster)`                                        | Flat player-DEF reduction from a monster's `armor-pierce` passive (`0` if absent). PR2.                                                                                                                                                                                                                                                                                                                                                                                    |
| `effectivePlayerDefenseVsMonster(char, monster)`                     | Player effective DEF: class-scaled base DEF (`effectiveStat`) + flat gear − `monsterArmorPierce`. The DEF multiplier is the **physical** damage affinity (Wizard ×0.8 = fragile, Warrior ×1.35 = tanky); the **magic** axis lives in `incomingMonsterDamage` instead. Used by `calculateRound` / `rollRunAway` / spell counter / `rollMonsterAttack`.                                                                                                                      |
| `CLASS_DAMAGE_TAKEN` (constants)                                     | Per-class incoming-damage multiplier by school. Physical is governed by DEF (all 1.0 here); **magic ignores armor**, so this is its texture: Warrior ×1.3, Wizard ×0.75, Rogue ×1.0. Consumed by `incomingMonsterDamage`.                                                                                                                                                                                                                                                  |     |
| `monsterSiphonAmount(monster)`                                       | Player-stamina drain from a monster's `siphon` passive per landed hit (`0` if absent). Applied post-damage in all three combat resolvers; surfaces as `monsterSiphon` in the round log. PR2.                                                                                                                                                                                                                                                                               |
| `effectiveMonsterMaxHp(state)`                                       | Monster max HP including any one-time `summon-add` bonus (`FightState.monsterBonusHp`). Regen / vampiric caps clamp against this. PR2.                                                                                                                                                                                                                                                                                                                                     |
| `SPIRIT_PER_CRIT_CHANCE` / `SPIRIT_PER_CRIT_DAMAGE`                  | Spirit→crit per-point steps (`1` each) behind `spellCritChance` / `spellCritDamage`.                                                                                                                                                                                                                                                                                                                                                                                       |
| `MAX_SPELL_CRIT_CHANCE` / `MAX_SPELL_CRIT_DAMAGE_MULT`               | Crit caps — `0.4` chance, `1.25` damage multiplier.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `LEGENDARY_PITY_THRESHOLD` / `LEGENDARY_PITY_STEP`                   | Legendary pity tuning — after `10` rare+ kills with no legendary, each further kill adds `+0.02` to the legendary drop chance (consumed by `rollLoot`).                                                                                                                                                                                                                                                                                                                    |

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

The spell **catalog** (35 spells after content-scaling PR4 — 14 added) lives in `ITEM_CATALOG` (`items.ts`) as items with `type: 'spell'`, not in this module. PR4 added the `SpellEffect.dotDamage` field (`{ perRound, rounds }`) — a bleed/burn applied to the monster on a successful cast and ticked at the start of each subsequent offensive round (bypassing defense) via `FightState.monsterDots`. DoTs are ticked in `runPreAction` (inside `combatActions.ts`) so they work in both arena and dungeon with zero modifier plumbing. Spell/ability crits roll via `rollSpellCrit` (see `combat.ts`).

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

| Export                               | Kind     | Purpose                                                                                                                                                                                                          |
| ------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RARITY_BADGE`                       | const    | Tailwind background-color classes per rarity (`common` → gray, `legendary` → orange/gold).                                                                                                                       |
| `RARITY_TEXT`                        | const    | Tailwind text-color classes per rarity.                                                                                                                                                                          |
| `RARITY_CARD`                        | const    | Per-rarity card chrome — `{ header, border, glow }` Tailwind classes for item/spell cards.                                                                                                                       |
| `ITEM_CATALOG`                       | const    | Every item in the game — 149 total (41 weapons / 26 armor / 31 accessories / 16 consumables / 35 spells). Single source of truth.                                                                                |
| `getItemById(id)`                    | function | Catalog lookup. Returns `undefined` for unknown IDs.                                                                                                                                                             |
| `ConsumableEffect`                   | type     | Discriminated union of consumable effects. Variants: `restore` (single resource), and `multi` (`{ restores: Array<{resource, amount}> }`) for combo elixirs (Battle Stim, Spirit Tea, Sage's Brew) added in PR3. |
| `describeConsumableEffect(effect)`   | function | Human-readable label for a consumable effect (used by the inventory page + in-combat action bar).                                                                                                                |
| `consumableEffectColorClass(effect)` | function | Tailwind text-color class for the effect's resource(s).                                                                                                                                                          |
| `consumableEffectColorHex(effect)`   | function | Hex color for the effect's resource(s) (chart/badge use).                                                                                                                                                        |

Items with `lootOnly: true` never appear in the shop — only in monster / boss loot tables.

---

## `monsters.ts` — monster catalog

| Export               | Purpose                                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MONSTER_CATALOG`    | 21 monsters (levels 1–14). The original 11 cover levels 1–10 (two at level 1, Lich King at level 9, Ancient Dragon at level 10); the 2× content-scaling drop (PR2) added 10 more spanning levels 1–14. Every entry carries a `passive` and/or `active` from `MonsterPassive` / `MonsterActive` (see `src/types/index.ts`). Tested in `monsterPassives.test.ts`. |
| `getMonsterById(id)` | Map-backed catalog lookup. Used by the arena, the bestiary, and the Wanted Board hunt route to resolve a pinned target.                                                                                                                                                                                                                                         |

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

### Content-scaling additions (PR2 — 10 monsters, levels 1–14)

These thicken low-level variety and fill the level 11–14 progression gap, and introduce three new mechanics: `siphon` (drains player stamina per landed hit), `armor-pierce` (flat reduction to player effective DEF), and `summon-add` (one-time HP bump to current + cap).

| Monster        | Lvl | Mechanic                                                                   | Detail                                     |
| -------------- | --- | -------------------------------------------------------------------------- | ------------------------------------------ |
| Mud Imp        | 1   | Passive: `siphon` (Sticky Grip)                                            | Drains 1 player stamina per landed hit     |
| Boar Runt      | 2   | Active: `enrage` @ 50% HP (Tusk Charge)                                    | Permanently boosts ATK +3                  |
| Bog Lurker     | 4   | Passive: `siphon` (Mire Grasp)                                             | Drains 2 player stamina per landed hit     |
| Iron Husk      | 5   | Passive: `armor-pierce` (Sundering Strike)                                 | Reduces player effective DEF by 2          |
| Frost Wraith   | 6   | Passive: `siphon` (Numbing Chill)                                          | Drains 3 player stamina per landed hit     |
| Gloom Knight   | 8   | Active: `harden` @ 40% HP (Oathbreaker Bulwark)                            | Permanently boosts DEF +5                  |
| Obsidian Golem | 11  | Passive: `armor-pierce` (Volcanic Edge)                                    | Reduces player effective DEF by 4          |
| Ashwyrm        | 12  | Passive: `thorns` (Cinder Hide)                                            | Reflects 22% of incoming player damage     |
| Void Revenant  | 13  | Active: `summon-add` @ 50% HP (Echo Reinforcements)                        | One-time +60 HP to current + cap           |
| Storm Djinn    | 14  | Passive: `vampiric` (Skyfeast) + Active: `enrage` @ 30% HP (Tempest Wrath) | Heals 25% of its counter; ATK +6 on enrage |

Dungeon boss rooms (`isBossRoom`) suppress the passive/active badge UI and do not apply `passive`/`active` fields — bosses use the existing `CombatModifiers` seam.

The Ancient Dragon's loot table is the primary source of legendary loot from regular combat. Dungeon bosses have separate, tier-specific loot tables (defined in `dungeons.ts`) containing 12 dungeon-exclusive items not available from regular combat or the shop (`lootOnly: true`).

---

## `quests.ts` — quest pools

| Export                    | Kind     | Purpose                                                                                                             |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `DAILY_QUEST_POOL`        | const    | 61 daily quests across 7 activity types (incl. 18 cross-habit combos). 3 are picked each day via `getDailyPick`.    |
| `WEEKLY_QUEST_POOL`       | const    | 31 weekly quests across 7 activity types (incl. 10 cross-habit combos). 3 are picked each week via `getWeeklyPick`. |
| `getQuestDef(questDefId)` | function | Catalog lookup across both pools.                                                                                   |

---

## `bounties.ts` — Wanted Board bounty pool

The Wanted Board posts a daily-rotating set of fitness bounties that grant **Reputation**. Bounties advance off the **same** activity logs quests do (one log feeds both surfaces — an intentional parallel earning track, not a replacement). Two archetypes (`BountyDef.kind`):

- **`'standing'`** (default) — the activity-only Loot path: log → collect Reputation (the rest-day floor). Claimed inline on `/wanted` via `claimBounty(id, { path: 'loot' })`.
- **`'hunt'`** — the activity is an **unlock**: completing it lets the player engage a level-scaled target (pinned at assignment) in combat on `/wanted/hunt/[bountyId]`; **winning** collects a bigger Reputation payout via `claimBounty(id, { path: 'fight' })`. Hunt reps (130 / 170 / 220 by `combat.levelBand` difficulty) sit above every standing bounty.

The daily board is composed of 2 hunts + 1 standing (see `bountyStore.fetchAndAssignBounties`), so it skews to combat.

| Export                                      | Kind     | Purpose                                                                                                                                                                                   |
| ------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BOUNTY_POOL`                               | const    | The bounty catalog — `'standing'` (activity-only) + `'hunt'` (combat-fork) defs.                                                                                                          |
| `getBountyDef(bountyDefId)`                 | function | Catalog lookup by id.                                                                                                                                                                     |
| `pickHuntMonster(playerLevel, band, seed?)` | function | Pure, deterministic level-scaled target picker for hunt bounties. `band` is RELATIVE to the player's level (offsets); the window widens until a `MONSTER_CATALOG` monster exists (total). |

---

## `reputation.ts` — Reputation rank math

Reputation is dual-track: a **spendable** wallet (`Character.spendableReputation`) plus a cumulative **lifetime** tracker (`Character.lifetimeReputation`) that — never spent down — determines the visible Rank. Pure module (no clock, no Firestore); the earn/spend writes live in `bountyStore`.

| Export                         | Kind      | Purpose                                                                                                                           |
| ------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `REPUTATION_RANKS`             | const     | The 5 ranks by ascending lifetime threshold: Newcomer (0) / Known (500) / Respected (1500) / Renowned (4000) / Legendary (10000). |
| `reputationRank(lifetime)`     | function  | Highest rank whose threshold ≤ lifetime. Negative input clamps to Newcomer.                                                       |
| `nextReputationRank(lifetime)` | function  | The next rank up, or `null` at the top (Legendary).                                                                               |
| `reputationProgress(lifetime)` | function  | `{ rank, next, pctToNext, remaining, atMax }` — everything the rank progress bar needs in one call.                               |
| `ReputationProgress`           | interface | Return shape of `reputationProgress`.                                                                                             |

---

## `calendar.ts` — activity-calendar date helpers

Pure date helpers backing the read-only `/calendar` view. Days are bucketed by **local** time (a workout logged at 11 pm local belongs to "today") — deliberately different from the UTC keys in `streaks.ts`, which serve streak math.

| Export                  | Kind     | Purpose                                                                                                    |
| ----------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `localDayKey(ts)`       | function | Local-time `'YYYY-MM-DD'` key for a unix-ms timestamp or `Date`.                                           |
| `monthMatrix(year, mo)` | function | Sunday→Saturday weeks (4–6 rows of 7 `Date`s) covering a 0-indexed month, padded with adjacent-month days. |
| `weekDays(ref)`         | function | The 7 dates (Sun→Sat) of the week containing `ref`.                                                        |
| `groupLogsByDay(logs)`  | function | Buckets `ActivityLog[]` into a `Record<localDayKey, ActivityLog[]>`.                                       |

---

## `avatars.ts` — preset avatar catalog

Curated avatar crests rendered through the existing `EntityArt` heraldic-art system — no image upload, no Firebase Storage. A choice persists as `Character.avatarId`; unset falls back to the class crest.

| Export                | Kind      | Purpose                                                                                       |
| --------------------- | --------- | --------------------------------------------------------------------------------------------- |
| `AvatarOption`        | interface | `{ id, category, label, tint? }` — references an already-registered silhouette.               |
| `AVATAR_OPTIONS`      | const     | The selectable preset crests (classes, subclasses, monster + achievement crests).             |
| `getAvatarOption(id)` | function  | Lookup an option by its stored id (`undefined` for unknown/empty).                            |
| `resolveAvatar(char)` | function  | The chosen preset, or the class-crest fallback when unset/unknown. Used by `CharacterAvatar`. |

---

## `rotation.ts` — deterministic daily/weekly rotation

| Export                       | Purpose                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `getDailyPick(arr, count)`   | Seeded shuffle by today's local date. Same `arr` → same picks for everyone, all day.                                                   |
| `getWeeklyPick(arr, count)`  | Seeded shuffle by ISO week (Mon–Sun). Same picks for everyone, all week.                                                               |
| `deriveWeekKey(dateKey)`     | Converts `'YYYY-MM-DD'` → `'YYYY-WW'` ISO week key without reading the clock.                                                          |
| `rotationExpiresAt()`        | Unix ms for the next **UTC** midnight — when daily monster/shop picks rotate. (Quest expiry uses `dailyExpiresAt()` — local midnight.) |
| `dailyExpiresAt()`           | Unix ms for local midnight tonight (start of tomorrow).                                                                                |
| `weeklyExpiresAt()`          | Unix ms for end of this Sunday `23:59:59.999` local time.                                                                              |
| `formatCountdown(expiresAt)` | Human-readable "Xh Ym" / "Nd" countdown for quest UI.                                                                                  |

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

| Export                                         | Kind      | Purpose                                                                                                                                                                       |
| ---------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StreakData`                                   | interface | `{ currentStreak, longestStreak, lastLogDate }`. Stored on the character doc.                                                                                                 |
| `PersonalRecord`                               | interface | `{ value, loggedAt, unit }` per activity type.                                                                                                                                |
| `PersonalRecords`                              | type      | `Partial<Record<ActivityType, PersonalRecord>>`.                                                                                                                              |
| `StreakTier`                                   | interface | A Blessing-tier definition (name, day threshold, loot multiplier).                                                                                                            |
| `STREAK_TIERS`                                 | const     | The 6 Blessing tiers (Focused → Blessed). Multiplier applies to **rare+** loot only.                                                                                          |
| `todayUTC()`                                   | function  | `'YYYY-MM-DD'` for today in UTC. Used for `lastLogDate`.                                                                                                                      |
| `utcDayStartMs(date?)`                         | function  | Unix ms for the UTC midnight that begins the given date (defaults to now). Used by `fetchTodayLogsForType` so the date boundary is injectable in tests without Firebase deps. |
| `computeNewStreak(current, today)`             | function  | Streak transition: same day → no change, consecutive day → +1, gap → reset to 1.                                                                                              |
| `getStreakTier(streak)`                        | function  | Highest tier reached at the given streak length.                                                                                                                              |
| `getStreakLootMultiplier(streak)`              | function  | Convenience accessor for the tier's loot multiplier.                                                                                                                          |
| `getStreakXpMultiplier(streak)`                | function  | XP multiplier for the current streak length (≥ 1.0). Snapshotted at kill-time for the `BattleResultsModal` annotation.                                                        |
| `daysSinceLastLog(last, today?)`               | function  | Integer day delta between two `'YYYY-MM-DD'` strings. Returns `Infinity` for `undefined` last-log (fresh accounts). Used by the welcome-back trigger.                         |
| `shouldOfferWelcomeBack(last, streak, today?)` | function  | True iff absent ≥ `WELCOME_BACK_ABSENCE_DAYS` AND `streak < lowest-tier-minDays`. Drives `WelcomeBackBanner` + boost. Fresh accounts return false.                            |
| `WELCOME_BACK_ABSENCE_DAYS`                    | const     | `14`. Threshold for offering the welcome-back boost.                                                                                                                          |
| `WELCOME_BACK_LOOT_MULTIPLIER`                 | const     | `1.3`. Loot multiplier while welcome-back is active.                                                                                                                          |
| `WELCOME_BACK_XP_MULTIPLIER`                   | const     | `1.1`. XP multiplier while welcome-back is active.                                                                                                                            |
| `MAX_STREAK_SHIELDS`                           | const     | `3`. Cap on grace-day shields. Weekly refill tops up to this value in `refillShieldsIfNewWeek`.                                                                               |

---

## `dungeons.ts` — dungeon system logic

Tested in [`__tests__/dungeons.test.ts`](../src/lib/gameLogic/__tests__/dungeons.test.ts).

`DungeonTierId` (`'goblin-caves' | 'spider-lair' | 'dark-sanctum' | 'dragons-keep'`) is defined in `src/types/index.ts`, not here.

| Export                                                 | Kind             | Purpose                                                                                                                                                    |
| ------------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DungeonTierDef`                                       | interface        | Static tier definition: name, rec level range, entry fee, room count, XP multiplier, monster pool, `failureDamagePct`.                                     |
| `DUNGEON_TIERS`                                        | const            | The 4 tier definitions keyed by `DungeonTierId`.                                                                                                           |
| `DungeonBossDef`                                       | interface        | A boss definition (`extends MonsterDef`) — boss stats + enrage metadata.                                                                                   |
| `DUNGEON_BOSSES`                                       | const            | Boss definitions per tier (HP, ATK, DEF, base XP, enrage threshold/effect), keyed by `DungeonTierId`.                                                      |
| `mulberry32(seed)`                                     | function         | Deterministic PRNG — returns a seeded `() => number`. All dungeon generation is seeded through this.                                                       |
| `getWeekSeed(nowMs?)` / `getWeekNumber(nowMs?)`        | function         | `getWeekSeed` → `year * 100 + ISO week` (stable per calendar week); `getWeekNumber` → the ISO week number. Defaults to now; injectable for tests.          |
| `todayUTCDate()`                                       | function         | `'YYYY-MM-DD'` in UTC. Backs the daily run-limit checks.                                                                                                   |
| `generateDungeonLayout(tierId, weekSeed)`              | function         | Produces the full room sequence (`DungeonRoomDef[]`) for a tier + week seed. Deterministic — same inputs → same layout.                                    |
| `StatCheckPath` / `StatCheckOption`                    | type / interface | A stat-check choice (`'str' \| 'wis' \| 'agi'`) and the resolved option presented to the player.                                                           |
| `resolveStatCheckOptions(tierId, character, roomSeed)` | function         | The stat-check options for a room — pass/fail per path using base stat + gear bonuses, seeded by `roomSeed`.                                               |
| `statCheckFailureDamage(tierId, maxHp)`                | function         | HP lost on a failed "Attempt Anyway" — `failureDamagePct × maxHp`, tier-scaled.                                                                            |
| `resolveStatCheckFlavor(tierId, roomSeed)`             | function         | Thematic `StatCheckScenario` (`{ description, hint }`) for a stat-check room, seeded from `roomSeed`. Each tier has 3–4 entries in `STAT_CHECK_SCENARIOS`. |
| `LootRarityFilter` / `roomLootFilter(roomIndex)`       | type / function  | Per-room loot-rarity band — `roomLootFilter` returns the band (`'common-uncommon'` → richer deeper in the run).                                            |
| `applyVenomTick(monsterHp, poisoned)`                  | function         | Advances the venom DoT: decrements `roundsRemaining`, applies `damagePerRound` to monster HP (bypasses defense).                                           |
| `createPoisonedStatus()`                               | function         | Fresh `PoisonedStatus` (`{ roundsRemaining: 3, damagePerRound: 3 }`) — the Venomfang Bracer / boss venom seed.                                             |
| `checkVenomProc(hasVenomfangBracer)`                   | function         | Whether a venom DoT procs this hit. (Also used via the `CombatModifiers` seam — see `combatActions.ts`.)                                                   |
| `VENOMFANG_BRACER_ID`                                  | const            | `'venomfang-bracer'` — the accessory that enables venom procs.                                                                                             |
| `initialEnrageState()`                                 | function         | Fresh `BossEnrageState` (`{ triggered: false, dragonIgnoreDefRoundsLeft: 0, necroShieldHp: 0 }`).                                                          |
| `evaluateBossEnrage(tierId, bossHp, bossMaxHp, prev)`  | function         | Boss enrage transition after a round → `{ next, message }`. Drives Broodmother / Necromancer / Dragon King effects.                                        |
| `bossEffectiveAtk(tierId, baseAtk, enrage)`            | function         | Boss ATK after enrage (Spider Lair +5, Dragon's Keep +8 when triggered).                                                                                   |
| `applyNecroShield(incomingDamage, shieldHp)`           | function         | Absorbs player damage through the Necromancer shield → `{ absorbed, shieldHpLeft, damageToBoss }`.                                                         |
| `dragonIgnoresDef(enrage)`                             | function         | True while the Dragon King's ignore-DEF window is active (pass player defense=0 to `calculateRound`).                                                      |
| `canStartDungeonRun(runsToday)`                        | function         | Daily-cap gate — `true` unless 2 runs already started this UTC day.                                                                                        |
| `isLegendaryEligible(runsToday)`                       | function         | `true` unless the day's first legendary-eligible run has already been claimed.                                                                             |
| `nextDungeonRunsToday(runsToday)`                      | function         | The updated `DungeonRunsToday` counter after starting a run (resets on a new UTC day).                                                                     |

---

## `achievements.ts` — one-time milestone badges

Tested in [`__tests__/achievements.test.ts`](../src/lib/gameLogic/__tests__/achievements.test.ts) and parity-tested against the `functions/` copy in [`__tests__/achievements-parity.test.ts`](../src/lib/gameLogic/__tests__/achievements-parity.test.ts).

| Export                                     | Kind      | Purpose                                                                                                                                               |
| ------------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AchievementDef`                           | interface | Static badge definition: `id`, `name`, `description`, `goldReward`, `emoji`.                                                                          |
| `ACHIEVEMENTS`                             | const     | All 31 achievement definitions keyed by `AchievementId`. Categories: 6 dungeon, 7 combat, 6 activity, 4 mastery, 4 quest, 4 collection.               |
| `checkDungeonAchievements(character, run)` | function  | Compares a completed run against the character's existing achievements. Returns newly earned `AchievementId[]`. Returns `[]` for non-completed runs.  |
| `checkCombatAchievements(input)`           | function  | Server-side combat-achievement checker. Drives `first-blood`, `centurion`, the 4 `slayer-*`, and `untouched`. Runs inside `claimCombatVictory` CF.    |
| `checkActivityAchievements(input)`         | function  | Server-side activity-achievement checker. Drives `iron-body` / `marathoner` / `well-fed` / `well-rested` / `enlightened` / `hydration-streak`.        |
| `checkMasteryAchievements(input)`          | function  | Server-side mastery-tier checker. Drives `apprentice` / `journeyman` / `master` (5/15/25 on any mastery stat) + `polymath` (5 on all four).           |
| `checkQuestAchievements(input)`            | function  | Client-mirrored checker for `quest-novice` / `-veteran` / `-legend` / `weekly-perfectionist`. Called from `questStore.claimReward`.                   |
| `checkCollectionAchievements(input)`       | function  | Client-mirrored checker for `bestiary-complete` / `legendary-hoarder` / `armory` / `arcane-archive`. Called from `useCollectionAchievementSync` hook. |
| `sumAchievementGold(ids)`                  | function  | Aggregate gold reward for a list of achievement IDs. Used by every checker call-site to credit gold atomically.                                       |
| `SLAYER_KILL_TARGET`                       | const     | `5` — kills required for each `slayer-*` achievement.                                                                                                 |
| `CENTURION_WIN_TARGET`                     | const     | `100` — lifetime arena wins required for `centurion`.                                                                                                 |
| `HYDRATION_STREAK_DAYS`                    | const     | `7` — distinct UTC days with a water log required for `hydration-streak`.                                                                             |
| `MASTERY_TIERS`                            | const     | `{ apprentice: 5, journeyman: 15, master: 25 }` — mastery thresholds.                                                                                 |
| `POLYMATH_THRESHOLD`                       | const     | `5` — mastery count required on every primary stat for `polymath`.                                                                                    |
| `ARMORY_UNIQUE_GEAR_TARGET`                | const     | `15` — unique gear pieces owned simultaneously required for `armory`.                                                                                 |
| `QUEST_COUNT_TIERS`                        | const     | `{ 'quest-novice': 50, 'quest-veteran': 250, 'quest-legend': 1000 }`.                                                                                 |
| `WEEKLY_PERFECTIONIST_TARGET`              | const     | `3` — weekly quests claimed inside one ISO week for `weekly-perfectionist`.                                                                           |
| `ACTIVITY_COUNT_TARGETS`                   | const     | Maps an activity type → its lifetime-count achievement id (`workout`→`iron-body`, `run`→`marathoner`, …).                                             |
| `ACTIVITY_COUNT_THRESHOLD`                 | const     | Lifetime-count target per activity achievement (`100` for most, `50` for `enlightened`).                                                              |
| `PRIMARY_MASTERY_STATS`                    | const     | The 4 primary mastery stats (`strength`, `wisdom`, `agility`, `spirit`) checked for `polymath`.                                                       |

**Plumbing summary:**

- **Server-authoritative (17 IDs):** combat / activity / mastery achievements are evaluated inside `claimCombatVictory` (combat) and `logActivity` (activity + mastery) Cloud Functions. Gold + badge merge atomically with the existing transaction. Tamper-proof.
- **Client-mirrored (14 IDs):** dungeon (6), quest (4), collection (4) achievements are written from the client. Dungeon achievements live inside the `claimDungeonRun` CF transaction; the rest are optimistic client writes. **The current CF transactions do NOT re-validate quest or collection achievements** — they're written once and trusted. Worst-case tamper is a few hundred gold per fabricated unlock; harden when leaderboards arrive.

**Why parity-duplicated:** Achievement award logic runs inside Firestore transactions, so the helpers (`LEGENDARY_ITEM_IDS`, `ACHIEVEMENT_GOLD`, `checkNew*` mirrors, all thresholds) are mirrored in `functions/src/gameLogic/achievements.ts` to avoid `@/` path-alias dependencies. The parity test (`achievements-parity.test.ts`, 20 assertions) cross-checks every constant + threshold + checker output between the two copies on equivalent fixtures.

---

## `collections.ts` — bestiary + collection completion

Pure derivations backing the `/collections/bestiary` and `/collections/collection` surfaces (the old `/stats/bestiary` and `/stats/collection` routes redirect there). Tested in [`__tests__/collectionsPR5.test.ts`](../src/lib/gameLogic/__tests__/collectionsPR5.test.ts).

| Export                                                               | Kind      | Purpose                                                                                                                                                                                                          |
| -------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BOSS_TIER_ACHIEVEMENT`                                              | const     | Maps each `DungeonTierId` to its 1:1 tier-clear `AchievementId`. Bosses are not tracked in `monstersKilled` (pruned to `MONSTER_CATALOG` ids), so the bestiary uses the achievement as the boss-defeated signal. |
| `tierName(tierId)`                                                   | function  | Display name for a dungeon tier (delegates to `DUNGEON_TIERS[tierId].name`).                                                                                                                                     |
| `bestiaryProgress(character)`                                        | function  | Returns `BestiaryProgress` (`{ monstersDiscovered, totalMonsters, bossesDefeated, totalBosses }`) — monsters from `character.monstersKilled` (catalog-filtered), bosses from achievements.                       |
| `collectionProgress(ownedIds)`                                       | function  | Returns `CollectionProgress` (`{ owned, total, pct, byType[] }`) — overall + per-type owned-vs-total from a `Set<itemDefId>`.                                                                                    |
| `BestiaryProgress` / `CollectionProgress` / `TypeCollectionProgress` | interface | Return shapes for the two functions above (`TypeCollectionProgress` is one per-type row inside `CollectionProgress.byType`).                                                                                     |

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

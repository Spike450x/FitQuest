# FitQuest — Game Systems Audit & Improvement Findings

**Date:** 2026-05-19
**Scope:** Full audit of all implemented game systems (XP, combat, abilities, spells, loot, quests, streaks, economy) plus dungeon design integration recommendations.
**Structure:** P0 (fix now) → P1 (fix before dungeons ship) → P2 (polish) → Dungeon Design Notes
**Primary pain point identified by owner:** Progression / XP economy

---

## How to Read This Doc

Each finding includes:

- **What's wrong** — the problem in plain terms
- **Where in code** — specific file + export or line range
- **Proposed fix** — concrete change (constant, formula, or new logic)
- **Effort** — S (< 2h) / M (half day) / L (full day+)

---

## P0 — Critical (Core Experience Broken)

### P0-1: Monster counter-attack formula is inconsistent between combat modes

**What's wrong:**
Regular attacks and magic attacks use `flat monster.attack - player.defense` for counter-damage. Ability rolls use `d10 + monster.attack - player.defense`. This silent inconsistency makes abilities 1–10 damage more dangerous per use than regular attacks — but nothing in the UI communicates this. A player choosing abilities isn't aware they're accepting extra risk. Against the Ancient Dragon (attack: 32), a failed ability defense bypass can deal up to `10 + 32 = 42 raw damage` versus the flat 32 of a regular attack.

**Where in code:**

- `src/lib/gameLogic/combat.ts:calculateRound()` — monster damage: `Math.max(MIN_DAMAGE, monster.attack - effectivePlayerDef)` (flat, no roll)
- `src/lib/gameLogic/abilities.ts:rollMonsterAttack()` — monster damage: `monsterRoll + monster.attack` (d10 added)

**Proposed fix (pick one):**

- **Option A (unify to roll-based):** Add the monster's d10 roll to `calculateRound()` counter-damage as well, making all combat paths equally risky. This is a net difficulty increase — tune down monster attack values accordingly.
- **Option B (unify to flat):** Remove `rollD10()` from `rollMonsterAttack()` in `abilities.ts` so all paths use flat damage. Simpler, less chaos.
- **Option C (document as intentional):** Add `bypassPlayerDefRoll` to `AbilityDef` and surface a tooltip in the combat UI ("Abilities risk a harder counter-attack").

**Recommendation:** Option B. Flat damage is more predictable and the current d10 addition in `rollMonsterAttack` appears to be an oversight rather than intentional design — it isn't mentioned anywhere in the docs or UI.

**Effort:** S

---

### P0-2: XP progression hits a hard ceiling at level 10

**What's wrong:**
There are 10 monsters covering levels 1–10. Once a player passes level 10, the Ancient Dragon is the only combat target. XP from the Dragon (320) grows far slower than the XP cost to level:

| Level | XP to next | Dragon gives | Kills needed |
| ----- | ---------- | ------------ | ------------ |
| 10    | 3,162      | 320          | ~10          |
| 15    | 6,090      | 320          | ~19          |
| 20    | 8,944      | 320          | ~28          |
| 30    | 16,432     | 320          | ~51          |

A level 25 player needs 51 identical Dragon kills to level up. There is no monster variety, no difficulty scaling, no sense of progression. This is the highest-severity gap in the game.

**Where in code:**

- `src/lib/gameLogic/monsters.ts` — 10 monsters, max level 10, max XP reward 320
- `src/lib/gameLogic/constants.ts:xpToNextLevel()` — `floor(100 * level^1.5)` grows fast

**Proposed fix:**

1. Add a **level-scaling multiplier to monster XP** based on player level vs. monster level:

   ```ts
   // In rollLoot / combat reward logic
   const levelBonus = Math.max(1, 1 + (playerLevel - monster.level) * 0.05);
   // Caps at 2x for 20-level gap, prevents infinite scaling
   const effectiveXp = Math.round(Math.min(monster.xpReward * 2, monster.xpReward * levelBonus));
   ```

   This addresses the immediate grind without requiring new monsters.

2. **Add 3–5 new high-level monsters** (levels 11–15) that can be introduced as dungeon-exclusive or as a separate world area. These naturally solve the content wall.

3. **Add a missing level 9 monster** (currently jumps from level 8 to level 10) — see P1-5.

**Effort:** M (scaling multiplier = S; new monsters = M)

---

### P0-3: No daily cap on combat XP — unlimited grinding vector

**What's wrong:**
Every activity type has a `DAILY_ACTIVITY_CAPS` entry enforced server-side by the `logActivity` Cloud Function. Combat has no equivalent. A player can fight and kill monsters indefinitely in a single session, earning unbounded XP and gold. With Dungeons (multi-room runs), this amplifies: a dungeon clear yields XP for every room's monster kill.

**Where in code:**

- `src/lib/gameLogic/activityCaps.ts` — only covers 6 activity types, not combat
- `src/lib/combatData.ts` — tracks `combatLogs/{id}` for per-day XP, but no server-enforced cap

**Proposed fix:**
Add a `DAILY_COMBAT_XP_CAP` constant (suggested: 2,000 XP/day at level 1, scaling with level). Track cumulative combat XP in `combatLogs/{uid}/days/{YYYY-MM-DD}` and enforce the cap in `combatData.ts` writes. Alternatively, use a **diminishing returns curve** rather than a hard cap:

```ts
// After 1,000 combat XP in a day, each subsequent point yields 50% less
const effectiveCombatXp = Math.min(earned, cap) + Math.max(0, earned - cap) * 0.5;
```

Diminishing returns feels less punishing than a hard wall.

**Effort:** M

---

## P1 — Important (Fix Before Dungeons Ship)

### P1-1: Quest XP collapses at high levels — quests become meaningless

**What's wrong:**
The quest XP scaler uses `0.6 + 0.4 * sqrt(level)`. At level 20, this is `~2.39×`. The hardest daily quest (130 base XP) becomes 310 XP. But `xpToNextLevel(20) = 8,944`. Quests contribute 3.5% of a level at level 20 — negligible.

**Calculated scaling:**
| Level | Scaler | Best daily quest XP | % of level-up |
|-------|--------|---------------------|----------------|
| 5 | 1.49× | 194 | 10% |
| 10 | 1.86× | 242 | 7.7% |
| 20 | 2.39× | 310 | 3.5% |
| 30 | 2.79× | 363 | 2.2% |

**Where in code:**

- `src/lib/gameLogic/quests.ts:scaleQuestRewards()` — `factor = 0.6 + 0.4 * Math.sqrt(safeLevel)`

**Proposed fix (two options):**

- **Option A — Steepen the scaler:** Change to `factor = 0.4 + 0.6 * Math.sqrt(safeLevel)`. Level 20 becomes 3.09×, level 30 becomes 3.68×. Still sub-linear but more meaningful.
- **Option B — Add a level-gated quest tier:** Create a "Veteran" quest pool for level 10+ with higher base XP (300–600 base) and harder targets (5 miles, 90 min workout). Picked via the same `getDailyPick` rotation.

**Recommendation:** Option B is better long-term design. Option A is a fast patch. Do A now, plan B as a follow-up.

**Effort:** S (Option A) / L (Option B)

---

### P1-2: Streak XP multiplier cap (1.25×) is too low relative to the loot multiplier (2.0×)

**What's wrong:**
Streaks provide two bonuses: loot drop multiplier (1.0 → 2.0×) and XP multiplier (1.0 → 1.25×). The loot multiplier is meaningful and motivating. The XP multiplier is barely perceptible at high levels — at level 20, a 1.25× XP bonus means an extra 78 XP per Dragon kill (320 → 400). That's 0.9% of a level. Players who maintain a 30-day streak deserve a more compelling XP reward.

**Where in code:**

- `src/lib/gameLogic/streaks.ts:STREAK_TIERS` — `xpMultiplier` tops at `1.25` (Blessed tier)

**Proposed fix:**
| Tier | Days | Loot (current) | XP (current) | XP (proposed) |
|-------------|------|----------------|--------------|----------------|
| Focused | 3 | 1.15× | 1.05× | 1.08× |
| Dedicated | 7 | 1.30× | 1.10× | 1.15× |
| Relentless | 14 | 1.50× | 1.15× | 1.25× |
| Unstoppable | 21 | 1.75× | 1.20× | 1.35× |
| Blessed | 30 | 2.00× | 1.25× | 1.50× |

The cap of 1.5× still keeps the XP scaler below the loot scaler (maintaining that loot is the primary streak reward), but makes the XP bonus feel meaningful at high levels.

**Effort:** S (constants change only)

---

### P1-3: Gold economy has no endgame sink — gold accumulates forever

**What's wrong:**
Once a player has their best-in-slot gear set (roughly 700–750 gold per slot, ~2,200 gold total for all three), gold has no use. Quests award gold indefinitely. A level 20 player doing all three weekly quests earns ~500+ gold/week with nowhere to spend it. The number grows but means nothing, which makes it feel pointless.

**Where in code:**

- `src/lib/gameLogic/items.ts:ITEM_CATALOG` — no items priced above 2,200 gold
- No consumable crafting, prestige items, or gold-to-XP conversion

**Proposed fix — add gold sinks (ordered by implementation complexity):**

1. **Quest reroll token** (100 gold/day): Allows players to swap one active quest for a new random one. Low complexity, high utility.
2. **Dungeon entry fee** (50–200 gold/run, scaling by dungeon tier): Makes dungeon runs feel like an investment with real stakes.
3. **Consumable crafting** (bulk discounts at 5+ of same type): Gold spent at "Alchemist" tab in Shop.
4. **Prestige cosmetics** (title, border on character card, 5,000+ gold): Pure vanity, no gameplay impact, strong gold drain.

**Effort:** S–M per sink (start with #1 and #2)

---

### P1-4: Class ability fizzle rate is ~48% — half of all ability rolls waste stamina

**What's wrong:**
6d6 dice have roughly a 48% probability of producing no qualifying pattern (no three-of-a-kind or better, no straight). On a fizzle, the player spends 10 stamina (the full ability cost) but deals only `avgRoll + stat + gear - monsterDef` damage with no special effect. Stamina is limited — a typical player has 50–80 combat stamina. Fizzling half of ability rolls means the system's most exciting mechanic also punishes players for engaging with it.

**Calculated fizzle probability with 6d6:**

- No pattern: ~48%
- Three of a kind: ~21%
- Small straight: ~14%
- Full house: ~9%
- Large straight: ~7%
- Four of a kind: ~1.5%

**Where in code:**

- `src/lib/gameLogic/abilities.ts:resolveAbility()` — fizzle path (no pattern detected)
- `src/lib/gameLogic/constants.ts:COMBAT.ABILITY_STAMINA_COST` = 10

**Proposed fix (pick one):**

- **Option A — Reduce dice to 5d6:** Shifts fizzle rate from ~48% to ~35%. Small change, meaningful feel improvement.
- **Option B — Partial fizzle refund:** Fizzle costs only 5 stamina instead of 10 (half refund). Players still feel punished but not as badly.
- **Option C — Minimum guarantee:** Any fizzle that rolls 3+ unique values gets a `war_cry` equivalent (1.5× damage, no stun). "You swing wildly but still connect."

**Recommendation:** Option B is the fastest fix. Option C has the best design feel — the fizzle always does _something_, just not the cool thing. A/B first, C if it still feels bad.

**Effort:** S

---

### P1-5: Missing level 9 monster — jump from Dark Mage (L8) to Ancient Dragon (L10) is abrupt

**What's wrong:**
The monster catalog goes L1 → L1 → L2 → L3 → L4 → L5 → L6 → L7 → L8 → L10. The gap between Dark Mage (attack: 25, HP: 80) and Ancient Dragon (attack: 32, HP: 220) is jarring. The Dragon is also the only source of legendary loot, so mid-progression players immediately get forced into it.

**Where in code:**

- `src/lib/gameLogic/monsters.ts:MONSTER_CATALOG` — 10 entries, no level 9

**Proposed fix:**
Add a level 9 monster between Dark Mage and Ancient Dragon:

```ts
{
  id: 'lich-king',
  name: 'Lich King',
  level: 9,
  hp: 150,
  attack: 28,
  defense: 10,
  xpReward: 230,
  goldReward: 115,
  lootTable: [
    { itemId: 'void-tome', chance: 0.15 },
    { itemId: 'ring-of-dominance', chance: 0.18 },
    { itemId: 'staff-of-ages', chance: 0.12 },
    { itemId: 'greater-health-potion', chance: 0.12 },
  ],
  description: 'An undead sorcerer of terrible power. Defeat him to face the Dragon.',
}
```

**Effort:** S

---

### P1-6: Dungeons must persist stamina and magic between rooms to create tension

**What's wrong (design gap):**
The current combat initializes stamina and magic to their full max at the start of every fight. Multi-room dungeons with the same behavior feel identical to stringing together regular combats — there is no resource pressure or meaningful decision-making. "Higher stakes/tension" (stated dungeon goal) requires that entering room 3 with 15 stamina and 8 magic feels genuinely dangerous.

**Where in code:**

- Combat page initializes: `currentStamina = playerMaxStamina(character)`, `currentMagic = playerMaxMagic(character)` at fight start
- HP is already persistent between fights (stored in Firestore)

**Proposed dungeon resource model:**

```
On dungeon entry:
  - HP: use current (already persistent) — do NOT heal on entry
  - Stamina: carry over from previous room (start at dungeon-entry value)
  - Magic: carry over from previous room

Between rooms:
  - No full reset
  - "Rest between rooms": restore 20% stamina, 20% magic (small breath, not a reset)
  - Player can use combat-pack consumables between rooms

Dungeon exit (before boss):
  - Player can voluntarily exit with current loot but no boss reward

On dungeon clear (boss defeated):
  - HP, stamina, magic restored to full
  - Bonus loot roll
```

This creates meaningful decisions: do I use my last stamina potion now or save it for the boss? Do I run from room 3 with my loot, or push through with 30 HP?

**Effort:** L (requires dungeon state management, new data model, new UI flow)

---

## P2 — Polish (Important but Not Blocking)

### P2-1: Wisdom-from-Steps mastery mapping is thematically unclear

**What:** Steps → Wisdom has no clear real-world analogue. Running → Agility and Workout → Strength both have obvious body-ability connections. "Walking = wisdom" needs a tooltip or rename.

**Fix:** Add a tooltip on the mastery card: _"Consistent daily movement builds mindfulness and awareness — the foundation of wisdom."_ Alternatively, remap steps → health (walking is foundational wellness) and find a new activity for wisdom.

**Effort:** S

---

### P2-2: Wizard starts with significantly lower total stats than Warrior/Rogue

**What:**

- Warrior starting stats total: 34
- Rogue starting stats total: 35
- Wizard starting stats total: 29 (lowest by 5–6)

Early-game wizard is noticeably harder, which may cause class regret. The Mana Barrier passive only activates with magic points, and magic starts at `20 + 8×3 = 44` which drains fast at 10 magic absorbed/round.

**Fix:** Raise wizard `health` from 6 → 8 (total becomes 31) or `stamina` from 5 → 7. Don't touch wisdom — that's their defining stat.

**Effort:** S

---

### P2-3: No activity cap proximity indicator on the log form

**What:** Players have no visibility into how close they are to the daily cap (e.g., workout: 120 min). Logging 80 minutes after already having logged 60 silently yields 0 reward for the last 20. The result card does show `rewardEligible: false` but the form doesn't prevent the surprise.

**Fix:** On the activity log form, show "You've logged X/120 min today" next to the input for activity types with daily caps. Pull this from today's aggregate in `activityData.ts`.

**Effort:** M (requires a today-aggregate read on the form component)

---

### P2-4: Quest pool exhaustion — players see all 28 daily quests in ~2 weeks

**What:** The daily rotation is deterministic (`getDailyPick` seeded by date). With 28 quests in the pool and 3 shown per day, players complete the full rotation in 9–10 days. There's no reroll and no impossible-quest escape hatch.

**Fix (two parts):**

1. **Quest reroll (gold sink from P1-3):** One reroll per quest per day for 100 gold.
2. **Pool expansion:** Add 8–12 more daily quests across activity types, especially combo quests (currently only 4 combo quests exist).

**Effort:** S (reroll) / M (pool expansion)

---

## Dungeon Design Notes

_Not a full spec — this captures design constraints derived from the above audit that must be true for Dungeons to satisfy the stated goal (higher stakes/tension)._

### Required design constraints

1. **Resource persistence between rooms** (P1-6 above) — non-negotiable for tension
2. **No full heal on dungeon entry** — players who enter at 40 HP face real risk
3. **Daily dungeon limit** (1–2 runs/day) — prevents the "no combat XP cap" exploitation at scale
4. **Dungeon-specific XP bonus** — each room-clear grants +50% XP vs. regular combat to patch the level 10 progression cliff (P0-2) for dungeon-engaged players

### Recommended room structure

```
Room 1: Level = player level - 1 (warm-up)
Room 2: Level = player level (even fight)
Room 3: Level = player level (even fight, lower resource)
Boss:   Level = player level + 1 (punishing, escalated loot)
```

Loot escalation by room:

- Room 1: common/uncommon only
- Room 2: uncommon/rare
- Room 3: rare/epic
- Boss: epic + legendary roll eligible

### Dungeon entry gate

Require 50% HP minimum to enter a dungeon. This:

- Creates a reason for players to log nutrition (HP restore via meals)
- Ties the fitness loop (real-world eating → in-game preparation) more tightly
- Prevents "I'll just enter at 1 HP and hope for the best" speedruns

### Gold entry fee (connects P1-3 gold sink)

| Dungeon tier  | Entry fee | Player level range |
| ------------- | --------- | ------------------ |
| Goblin Caves  | 50 gold   | 1–5                |
| Spider Lair   | 100 gold  | 4–8                |
| Dark Sanctum  | 200 gold  | 7–10               |
| Dragon's Keep | 400 gold  | 10+                |

### Boss loot table strategy

Boss rooms should have their own loot table independent of the regular monster catalog. This gives dungeons a unique item identity and creates targeted farming goals:

- Each dungeon tier has 1–2 exclusive drops (not available from regular combat)
- Exclusive items should be visual/thematic, not strictly stronger than current legendaries
- This preserves the Ancient Dragon as a loot target while giving dungeons their own identity

---

## Implementation Priority Queue

For a single sprint, work in this order:

| Priority | Issue                               | Effort | Impact                    |
| -------- | ----------------------------------- | ------ | ------------------------- |
| 1        | P0-1: Unify monster damage formula  | S      | High (consistency)        |
| 2        | P0-2: Monster XP level scaler       | S–M    | Very High (progression)   |
| 3        | P1-5: Add level 9 monster           | S      | Medium                    |
| 4        | P1-4: Fizzle stamina refund         | S      | Medium                    |
| 5        | P1-2: Streak XP multiplier bump     | S      | Medium                    |
| 6        | P1-1: Quest XP scaler steepen       | S      | High                      |
| 7        | P2-2: Wizard starting stats         | S      | Low–Med                   |
| 8        | P1-3: Quest reroll gold sink        | S–M    | High (economy)            |
| 9        | P0-3: Combat XP diminishing returns | M      | High (exploit prevention) |
| 10       | P1-6: Dungeon resource model        | L      | Very High (dungeon)       |

---

_This doc is the input to an implementation plan. Use `/superpowers:writing-plans` to convert findings into executable tasks._

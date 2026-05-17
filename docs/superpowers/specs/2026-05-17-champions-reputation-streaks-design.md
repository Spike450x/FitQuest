# FitQuest — Champions, Reputation & Streak Makeup (Supplemental Design)

**Date:** 2026-05-17
**Status:** Design approved, not yet scheduled for implementation
**Supplements:** [2026-05-17-future-features-roadmap-design.md](./2026-05-17-future-features-roadmap-design.md)

This document fills in the open design questions flagged in the main roadmap: Champion AI behavior model, the full champion and NPC rosters, reputation economy clarity, and streak makeup mechanics for raids. Read the roadmap first for the broader feature context.

---

## Section 1: Champion AI & Combat Behavior

### Core Model: Hybrid Control

Champions act automatically each round based on their archetype's built-in behavior. The player can optionally spend their own action to issue a **direct command** to one champion, triggering their special move immediately — at the cost of skipping their own attack that round.

This keeps combat fluid (the player focuses on their own decisions) while giving skilled players a meaningful tactical lever. Commanding is never required; it is a power tool.

### Archetype Behavior Table

Each archetype has a distinct **auto behavior** that fires on a cooldown, and a **command ability** with a longer cooldown that the player can trigger manually.

| Archetype | Auto Behavior                    | Auto Cooldown  | Command Ability                                               | Command Cooldown |
| --------- | -------------------------------- | -------------- | ------------------------------------------------------------- | ---------------- |
| Knight    | Attacks the monster              | Every 1 round  | Shield bash — stuns monster for 1 round                       | 3 rounds         |
| Cleric    | Heals player when HP < 40%       | Every 2 rounds | Group heal — restores HP for player + all champions           | 4 rounds         |
| Ranger    | Second attack at 50% damage      | Every 2 rounds | Trap — reduces monster ATK for 2 rounds                       | 3 rounds         |
| Mage      | Random damage spell              | Every 3 rounds | Burst — high damage, costs the player their action this round | 5 rounds         |
| Berserker | Heavy attack + takes self-damage | Every 1 round  | Rage — doubles damage output for 2 rounds                     | 4 rounds         |
| Paladin   | Buffs player DEF each round      | Every 2 rounds | Divine smite — bonus damage + small player HP restore         | 4 rounds         |
| Assassin  | High-damage crit strike          | Every 3 rounds | Immediate crit regardless of cooldown                         | 3 rounds         |

**Cooldown notes:**

- Cooldowns are per-champion, tracked independently
- A champion's cooldown timer advances each combat round regardless of whether they acted (they don't freeze up if the player commands them)
- The Mage's burst command costs the player their action — communicate this clearly in the UI before the player confirms

### Champion Injured State

When a champion's HP reaches 0 mid-combat, they enter an **injured state**:

- Unavailable for deployment until recovered
- Default recovery time: **24 hours** (real-world time)
- **Gold accelerates recovery** — spending gold reduces the remaining cooldown; exact exchange rate TBD at implementation
- A champion cannot be deployed into any dungeon or raid while injured
- The player is warned before entering combat if a champion in their party is below 25% HP (optional pre-fight healing via consumables TBD)

---

## Section 2: Champion Roster

The full starter roster of 10 named heroes, matching the stable cap. Rarity determines base stats and purchase cost — higher rarity champions are significantly more expensive in gold + reputation.

| Champion      | Archetype | Rarity    | Personality                                                                 |
| ------------- | --------- | --------- | --------------------------------------------------------------------------- |
| Drek          | Knight    | Common    | Loyal but slow; a wall in plate armor. Reliable, says little.               |
| Lysa          | Ranger    | Uncommon  | Elven tracker; quiet, precise, never misses twice.                          |
| Brother Aldus | Cleric    | Uncommon  | Former monk turned healer; patches you up without being asked.              |
| Gorath        | Berserker | Rare      | Scarred orc warrior; hits hard and takes damage doing it. Thrives in chaos. |
| Vael          | Mage      | Rare      | Reckless spellcaster; brilliant but unstable. Occasionally too eager.       |
| Cass          | Cleric    | Rare      | Field medic turned adventurer; practical above all else.                    |
| Seraphine     | Paladin   | Epic      | Holy knight; fights with grace and protects fiercely. Calm under pressure.  |
| Zira          | Assassin  | Epic      | Ghost-silent. You never see her move until it is over.                      |
| Ironjaw       | Berserker | Legendary | A living legend. Costs a fortune but fights like a god.                     |
| Whisper       | Ranger    | Legendary | No one knows her real name. Raids entire keeps alone.                       |

### Champion Progression

- Champions gain XP from every Dungeon and Raid they participate in
- Capped at the player's own character level at all times
- **Gold catch-up mechanic:** if a champion is underleveled (e.g. benched for a long time), gold can be spent directly to boost their XP — expensive but available
- > **Monetization flag:** The gold-for-XP boost is a natural premium currency hook for a future monetization layer (battle pass, premium currency). Design is compatible without requiring it.

### Dialogue System

Every champion and Monthly NPC has a set of flavor dialogue lines triggered by specific game events. Dialogue is **display-only** — no branching choices, no gameplay impact. The goal is to make characters feel like people, not stat blocks.

| Trigger                              | Description                                                        |
| ------------------------------------ | ------------------------------------------------------------------ |
| First meeting                        | Introductory line establishing personality and voice               |
| Quest / challenge accepted           | Motivation or warning before the task begins                       |
| Mid-progress check-in (50%)          | Optional flavor line — encourages or taunts depending on character |
| Quest / dungeon completed            | Personal reaction to success; varies by character                  |
| Quest failed / NPC challenge expired | Disappointment, challenge to do better, or dark humor              |
| Champion deployed into combat        | Battle cry or tactical quip on fight start                         |
| Champion injured (HP = 0)            | Short reaction line as they go down                                |
| Champion leveled up                  | Brief celebration line; some characters are humble, some are not   |

Dialogue lines are written per-character and stored as string arrays per trigger key. Implementation detail (Firestore vs. local asset) is TBD at build time.

---

## Section 3: Reputation Economy

### Dual-Layer System

Reputation operates on two parallel tracks:

1. **Spendable balance** — a flat number the player earns and spends, like gold. Spending it does not affect rank.
2. **Lifetime earned tracker** — a separate cumulative number that only goes up. Determines the player's visible **Reputation Rank**.

This means a player who spends heavily on champions does not lose their "Renowned" badge — rank reflects history, not current wallet.

### Earn Sources

| Source                    | Notes                                                    |
| ------------------------- | -------------------------------------------------------- |
| Wanted Board — fight path | Primary source; higher payout for taking the combat risk |
| Wanted Board — loot path  | Lower payout; safe option                                |
| Monthly NPC completion    | One-time per NPC challenge appearance                    |
| Guild rank milestone      | Each new rank reached grants a reputation bonus          |
| Dungeon first-clear       | Resets weekly with the dungeon rotation                  |
| Raid first-clear          | Resets bi-weekly with the raid rotation                  |
| Prestige achievements     | One-time only (30-day streak, first dungeon clear, etc.) |

### Reputation Ranks (Lifetime Earned)

| Rank      | Lifetime Earned | Unlocks                                               |
| --------- | --------------- | ----------------------------------------------------- |
| Newcomer  | 0               | Basic Wanted Board access                             |
| Known     | 500             | Reputation vendor opens                               |
| Respected | 1,500           | Monthly NPC access; champion tier 2 purchasable       |
| Renowned  | 4,000           | Guild switching privilege; raid access                |
| Legendary | 10,000          | Exclusive cosmetics; god-tier reputation vendor items |

> **Balance note:** The exact earn rates per source and vendor prices are TBD at implementation. The rank thresholds above are starting targets and should be tuned once the earn cadence is observable in playtesting.

---

## Section 4: Streak Makeup Mechanics

### Raid Entry — Partial Grace

The 5-day raid-specific activity streak tracks each qualifying day as either a **real log** (actual activity logged) or a **shielded day** (general streak shield consumed). Both types count toward the 5-day requirement, but the composition of the streak determines the **raid entry bonus**:

| Streak composition     | Entry bonus                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| 5 real logs            | Full entry bonus — max starting stats, full loot modifier active |
| 4 real + 1 shielded    | 80% entry bonus                                                  |
| 3 real + 2 shielded    | 60% entry bonus — minimum threshold to enter                     |
| Fewer than 3 real logs | Cannot enter, even with shields making up the count              |

The entry bonus affects starting combat stats and the loot drop modifier for that raid run. A full-clean streak rewards the committed player without locking out the occasional shield user.

### Broken Raid Streak Recovery

If a player fully breaks their raid streak (gap too large for any shield to cover), two recovery paths are available — they can be used together:

**Path 1 — Reputation Buyback:**

- Spend reputation to purchase up to **2 makeup days** on a broken raid streak
- Expensive by design — this is a prestige resource, not a casual convenience
- Can only be used **once per raid cycle** (resets with the bi-weekly rotation)
- Exact reputation cost TBD at balance time

**Path 2 — Champion Assist:**

- A champion at **level 10 or higher** passively contributes **1 makeup day per week** toward a broken raid streak
- Represents the champion holding the mission alive while the player was away
- Only **one champion** can provide this per week, regardless of how many high-level champions are in the stable

> **Monetization footnote (future, not MVP):** A premium streak recovery option — spending real money to restore a broken streak — is a natural fit alongside the gold/reputation recovery paths. Not planned for any current phase but design is intentionally compatible. Implement only after the free recovery paths are fully live and tuned.

---

## Section 5: Monthly NPC Roster

### Dynamic Challenge System

Each NPC has a fixed **identity, personality, and activity theme**. Their specific challenge and reward are **drawn from a pool** each time they appear — same character, different ask. This makes returning NPCs feel fresh rather than repetitive.

- Challenge pools are weighted: common challenge variants appear more often, hard variants are rarer
- Reward pools match rarity weighting: epic/legendary rewards are possible but weighted low
- The same reward can appear across multiple appearances of the same NPC; no guaranteed unique-per-run behavior

### NPC Roster

**Aldric the Ironbound**

- Theme: Strength / Workout
- Personality: Gruff, direct, respects only effort. No sympathy for excuses.
- Challenge pool: Log 15–25 workouts this month / Log workouts on 4 of every 5 days / Hit a new workout PR twice this month
- Reward pool: Epic or Legendary heavy armor, STR-boosting accessories, "Ironbound" title

**Sera of the Dawnrun**

- Theme: Endurance / Run
- Personality: Optimistic and relentless. Believes anyone can be a runner if they just start.
- Challenge pool: Run 3x/week for 3 consecutive weeks / Log X total miles this month / Hit a new distance or pace PR twice this month
- Reward pool: Legendary boots, AGI-boosting accessories, "Dawnrunner" title

**Brother Merek**

- Theme: Nutrition / Recovery
- Personality: Calm, patient, and quietly judgmental about skipped meals. Warm but firm.
- Challenge pool: Log 3 healthy meals/day for 21 days / Log at least 2 meals every day this month / Log nutrition on 25 of 30 days
- Reward pool: Epic accessories, WIS-boosting items, "Well-Nourished" title

**The Sleepless Sage**

- Theme: Sleep / Wisdom
- Personality: Ancient and cryptic. Speaks in riddles. Deeply invested in rest as power.
- Challenge pool: Log 7+ hours of sleep for 14 consecutive days / Average 7+ hours sleep across the whole month / Log sleep every single day this month
- Reward pool: Rare spell unlocks, WIS-boosting gear, "Sage's Rest" title

**Kira Swiftfoot**

- Theme: Steps / Movement
- Personality: Cheerful and competitive. Turns everything into a race. Can't sit still.
- Challenge pool: Hit 10,000 steps on 20 days this month / Average 8,000+ steps across the full month / Hit a new single-day steps PR
- Reward pool: Legendary accessories, AGI gear, "Swiftfoot" title

**Commander Vex**

- Theme: Full discipline (all 6 activity types)
- Personality: Intense, military bearing, no tolerance for partial effort. The hardest NPC.
- Challenge pool: Complete all 6 activity types every week for 4 weeks / Log every activity type at least once every 3 days / Maintain an active streak in all 6 types simultaneously for 2 weeks
- Reward pool: God-tier cosmetics, exclusive titles ("The Disciplined", "Vex's Champion"), one-of-a-kind gear not available elsewhere

---

## Open Questions for Implementation

The following were left intentionally TBD and should be resolved during implementation planning:

- Exact reputation earn amounts per source and vendor pricing
- Gold cost per hour of champion recovery acceleration
- Reputation cost for the streak buyback (per makeup day)
- Champion ability damage/heal values (need balancing against existing monster stat ranges)
- Dialogue line counts per trigger (minimum 3 lines per trigger to avoid repetition is a reasonable starting target)
- Whether champion dialogue is stored in Firestore or as a local asset file

---

_This document supplements the main roadmap. When these features are implemented, update the relevant sections of the roadmap doc to reference the implementation spec._

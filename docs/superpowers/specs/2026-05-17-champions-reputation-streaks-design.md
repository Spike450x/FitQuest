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

#### Aldric the Ironbound

- Theme: Strength / Workout
- Personality: Gruff, direct, respects only effort. No sympathy for excuses.
- Challenge pool: Log 15–25 workouts this month / Log workouts on 4 of every 5 days / Hit a new workout PR twice this month
- Reward pool: Epic or Legendary heavy armor, STR-boosting accessories, "Ironbound" title

#### Sera of the Dawnrun

- Theme: Endurance / Run
- Personality: Optimistic and relentless. Believes anyone can be a runner if they just start.
- Challenge pool: Run 3x/week for 3 consecutive weeks / Log X total miles this month / Hit a new distance or pace PR twice this month
- Reward pool: Legendary boots, AGI-boosting accessories, "Dawnrunner" title

#### Brother Merek

- Theme: Nutrition / Recovery
- Personality: Calm, patient, and quietly judgmental about skipped meals. Warm but firm.
- Challenge pool: Log 3 healthy meals/day for 21 days / Log at least 2 meals every day this month / Log nutrition on 25 of 30 days
- Reward pool: Epic accessories, WIS-boosting items, "Well-Nourished" title

#### The Sleepless Sage

- Theme: Sleep / Wisdom
- Personality: Ancient and cryptic. Speaks in riddles. Deeply invested in rest as power.
- Challenge pool: Log 7+ hours of sleep for 14 consecutive days / Average 7+ hours sleep across the whole month / Log sleep every single day this month
- Reward pool: Rare spell unlocks, WIS-boosting gear, "Sage's Rest" title

#### Kira Swiftfoot

- Theme: Steps / Movement
- Personality: Cheerful and competitive. Turns everything into a race. Can't sit still.
- Challenge pool: Hit 10,000 steps on 20 days this month / Average 8,000+ steps across the full month / Hit a new single-day steps PR
- Reward pool: Legendary accessories, AGI gear, "Swiftfoot" title

#### Commander Vex

- Theme: Full discipline (all 6 activity types)
- Personality: Intense, military bearing, no tolerance for partial effort. The hardest NPC.
- Challenge pool: Complete all 6 activity types every week for 4 weeks / Log every activity type at least once every 3 days / Maintain an active streak in all 6 types simultaneously for 2 weeks
- Reward pool: God-tier cosmetics, exclusive titles ("The Disciplined", "Vex's Champion"), one-of-a-kind gear not available elsewhere

---

## Section 6: Champion Cooldown Visualization

Each champion card in the combat UI displays **pip dots** for cooldown state:

- **Auto-behavior pips** — one pip per cooldown round (e.g. Knight = 1 pip, Mage = 3 pips). Filled = rounds remaining. Empty = ready.
- **Command ability pips** — separate pip row in a distinct color (purple vs. blue for auto) so both cooldowns are independently trackable at a glance
- **Injured state** — the entire champion card grays out and shows a clock icon with the real-world recovery time remaining (e.g. "Recovering — 18h left")
- **Ready state** — all pips empty, card at full opacity, subtle green indicator

Pip count per archetype (auto / command):

| Archetype | Auto Pips | Command Pips |
| --------- | --------- | ------------ |
| Knight    | 1         | 3            |
| Cleric    | 2         | 4            |
| Ranger    | 2         | 3            |
| Mage      | 3         | 5            |
| Berserker | 1         | 4            |
| Paladin   | 2         | 4            |
| Assassin  | 3         | 3            |

---

## Section 7: Mage Burst Confirmation UX

When the player taps the command button for Vael's burst, an **inline warning banner** appears above the confirm/cancel buttons before any action is committed:

- Red left border
- Bold red label: "⚠ COSTS YOUR ACTION"
- One plain-English line: "Vael unleashes a devastating burst — but you must hold back to direct her. You won't attack this round."
- **Confirm Burst** button (green) and **Cancel** button (gray) below

No modal, no extra screen. The warning lives inline in the existing command UI. This pattern applies **only to the Mage burst** — all other command abilities have no player-action cost and require no warning.

---

## Section 8: NPC Challenge Balance & Gating

Each NPC has a gate reflecting challenge difficulty. Players who don't meet the gate don't see that NPC in their monthly rotation. The three ungated NPCs ensure every player always has at least one Monthly NPC available.

| NPC                  | Gate       | Threshold                            |
| -------------------- | ---------- | ------------------------------------ |
| Brother Merek        | None       | Available from day 1                 |
| The Sleepless Sage   | None       | Available from day 1                 |
| Kira Swiftfoot       | None       | Available from day 1                 |
| Aldric the Ironbound | Level      | Level 8                              |
| Sera of the Dawnrun  | Reputation | Known (500 lifetime)                 |
| Commander Vex        | Both       | Level 20 + Renowned (4,000 lifetime) |

Commander Vex requiring both gates means he only appears for established, active players who've genuinely earned the encounter.

---

## Section 9: Champion Firestore Schema

Champion state lives in a subcollection under the character document: `characters/{uid}/champions/{championId}`.

Each champion document shape:

```ts
interface ChampionDoc {
  id: string; // roster key, e.g. "gorath"
  level: number;
  xp: number;
  currentHp: number;
  maxHp: number;
  injuredUntil: number | null; // unix ms; null = healthy
  deployCount: number; // total dungeon/raid runs participated in
  acquiredAt: number; // unix ms
}
```

- `injuredUntil` drives recovery — `null` = healthy, future timestamp = injured
- Gold-accelerated recovery sets `injuredUntil` to `null` early via a Firestore write
- The `Character` type in `src/types/index.ts` does **not** change — champion state is self-contained in the subcollection and read separately (Champions page, dungeon entry check)

---

## Section 10: NPC Challenge Pool — Seeded Rotation

NPC challenge variants are selected using a **month seed** derived from `YYYY-MM` (e.g. `"2026-05"`). The seed is hashed to an integer and used to pick deterministically from each NPC's challenge pool.

- Every player worldwide sees the same NPC challenge variant in a given month
- Consecutive months always produce different seeds — no back-to-back repeats by design
- The function must be **pure and testable**: accepts a `monthKey` string parameter, never reads the clock internally — mirrors the existing `getDailyPick` / `getWeeklyPick` pattern in `rotation.ts`
- **Minimum pool size: 5 variants per NPC** — at 5 variants a full cycle takes 5 months before any variant could theoretically repeat

> **Content reminder: NPC pool expansion needed.** The current roster has 3 challenge variants per NPC. Each NPC needs at least 2 more variants written before launch. Additionally, the overall NPC roster should grow beyond the current 6 characters — plan to add more NPCs covering underrepresented activity types and difficulty tiers over time. NPC creation is a content task, not an engineering task, but it must be scoped into the Monthly NPCs implementation milestone.

---

## Open Questions for Implementation

The following were left intentionally TBD and should be resolved during implementation planning:

- Exact reputation earn amounts per source and vendor pricing
- Gold cost per hour of champion recovery acceleration
- Reputation cost for the streak buyback (per makeup day)
- Champion ability damage/heal values (need balancing against existing monster stat ranges)
- Dialogue line counts per trigger (minimum 3 lines per trigger to avoid repetition is a reasonable starting target)
- Whether champion dialogue is stored in Firestore or as a local asset file
- Exact level thresholds for unlocking champion stable slots (currently TBD, max 10)
- Seeded month hash function implementation (follow `rotation.ts` pattern)

---

## Future Considerations

### Next-Level Suggestions

- **Commander Vex dialogue** deserves extra investment — he's the hardest NPC and players who complete his challenge will remember the interaction. Consider 5–6 lines per trigger instead of the minimum 3, and give him more distinct language than other NPCs.
- **Champion stable UI** — the Champions page doesn't exist yet. When it's built, the pip-dot cooldown pattern should extend there too, showing injured state and real-world recovery timers outside of combat so players can plan their team composition.
- **Seeded month hash** — when implementing, reuse the ISO week key pattern from `streaks.ts` as a model. `YYYY-MM` hashing is nearly identical to `YYYY-Www` hashing already in the codebase — minimizes new logic and keeps the pattern consistent.
- **NPC roster expansion** — 6 NPCs is a solid start but the rotation will feel thin after a few months. Plan to add new NPCs over time, particularly ones covering underrepresented fitness themes (e.g. flexibility/stretching, mental wellness, consistency over intensity). NPC creation is a content task but should be tracked as a roadmap milestone.

### Potential Risks / Gaps

- **Champion HP between dungeon rooms** — the `ChampionDoc` schema tracks `currentHp` but there is no defined rule yet for whether HP carries over between rooms in a multi-room dungeon or resets at each room. This must be explicitly decided during the Dungeons implementation to avoid inconsistent behavior.
- **NPC gating must be server-enforced** — the gating table (level / reputation thresholds) must be enforced server-side via Firestore Security Rules or a Cloud Function, not just client-side display logic. A client could otherwise manipulate requests to surface gated NPCs early.
- **5-variant minimum is a launch blocker** — the content work to expand each NPC's challenge pool from 3 to 5 variants must be tracked as a hard dependency of the Monthly NPCs feature, not an afterthought. If this is missed, the seeded rotation cannot cycle correctly.
- **Champion AI cooldown state in multi-champion parties** — four champions with independent cooldown trackers running in parallel with the player's turn creates meaningful UI complexity. The combat screen will need careful layout work to show all pip states simultaneously without cluttering the fight view.
- **Monetization footnotes must not ship as features** — both the streak recovery and champion XP boost have premium currency flags. Ensure these are never partially implemented (e.g. a disabled button labeled "Premium") until a full monetization strategy is ready — half-shipped monetization erodes trust.

---

_This document supplements the main roadmap. When these features are implemented, update the relevant sections of the roadmap doc to reference the implementation spec._

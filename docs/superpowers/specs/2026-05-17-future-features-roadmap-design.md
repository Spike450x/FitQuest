# FitQuest — Post-MVP Feature Roadmap

**Date:** 2026-05-17
**Status:** Design approved, not yet scheduled for implementation
**Scope:** Mid-to-late game systems to be built after Dungeons (Phase 6+)

This document captures the agreed design for six major feature areas plus one long-horizon concept. Features are ordered by dependency — the Reputation economy and Champions must be understood before Dungeons and Raids make full sense. Guilds, Pets, and Monthly NPCs are parallel systems with no hard prerequisites beyond character level.

**Supplemental design doc:** [2026-05-17-champions-reputation-streaks-design.md](./2026-05-17-champions-reputation-streaks-design.md) — fills in Champion AI behavior, the full champion and NPC rosters, reputation earn rates and rank system, and raid streak makeup mechanics.

---

## Interconnection Map

```text
Wanted Board → Reputation (currency)
                    ↓
Reputation + Gold → Champions (purchasable)
                         ↓                ↓
                     Dungeons          Raids (requires 2+ champions)
Guilds ─────────────────────────────────────────────────────→ stat buffs, exclusive gear
Pets ────────────────────────────────────────────────────────→ passive + active buffs
Monthly NPCs ────────────────────────────────────────────────→ prestige rewards
Territory/Map ───────────────────────────────────────────────→ future horizon (GPS/PvP)
```

---

## Section 1: Core Economy — Reputation & Wanted Board

> **Implementation status (2026-05-31):** **PR1 + PR2 SHIPPED.** Dual-track Reputation currency (`spendableReputation` wallet + monotonic `lifetimeReputation` → 5-tier rank), the `/wanted` Wanted Board, the **Loot** path (PR1), and the **Fight fork** (PR2) are live.
>
> - **Fight fork (PR2, shipped)** — most bounties are now combat **Hunts**: the activity _tracks down_ a named, level-scaled target (the unlock), then the player fights it on `/wanted/hunt/[bountyId]`; winning collects a bigger Reputation payout via `claimBounty(id, { path: 'fight' })`. A thin set of activity-only "standing" bounties remains as the floor. Win rewards = Reputation + the fight's own XP/gold (no item loot); a loss is a soft failure (no reset, free retry). Reuses `useCombatEncounter` + the arena combat surface.
> - **Rank stat bonuses** — still deferred. Rank gates nothing yet (the vendor/NPCs/raids it unlocks don't exist), so it remains a visible badge + progress bar.
> - **Spend sinks** (champion purchases, vendor, guild switching, quest skipping) — none exist yet; `spendableReputation` only grows.
> - **Hardening** — writes are client-mirrored via `applyCharacterPatch`, with rules-level delta caps + lifetime monotonicity. A `claimBounty` Cloud Function (server-authoritative Reputation) is the remaining hardening step before leaderboards.

### Overview

Reputation is a second currency (alongside gold) that powers mid-to-late game systems. It is earned primarily through the Wanted Board and spent across several sinks to keep it from inflating.

### Wanted Board

- A rotating list of random objectives visible to the player (e.g. "Log 3 workouts this week", "Defeat 5 enemies in combat", "Log 10,000 steps in a day")
- When an objective is completed, the player is presented with a **fork**:
  - **Fight** — triggers a combat encounter; winning yields larger rewards (gear, reputation bonus)
  - **Take the loot** — skips combat, opens a loot cache with standard rewards
- Objectives rotate on a schedule (exact cadence TBD — likely daily or every 2–3 days)
- The Wanted Board is available from early-mid game; no hard level gate currently defined

### Reputation Economy

Reputation is earned by completing Wanted Board objectives (both paths award reputation, fight path awards more). It is spent across:

| Spend                 | Description                                                                |
| --------------------- | -------------------------------------------------------------------------- |
| Champion purchases    | Primary spend sink; champions are expensive                                |
| Guild switching       | Cost to change guilds (alongside a gold fee)                               |
| Guild rank milestones | Certain guild ranks require reputation as a gate                           |
| Monthly NPC access    | Some Monthly NPCs may require minimum reputation to unlock                 |
| Reputation vendor     | Exclusive gear/cosmetics not available elsewhere                           |
| Quest skipping        | Spend reputation to skip a daily/weekly quest and still receive its reward |

> **Open design:** Additional reputation sinks are intentionally left TBD for a future brainstorm. The above list is confirmed; more will be added.

### Design Notes

- Reputation should feel earned, not grindable — Wanted Board objectives should require real fitness effort (tied to activity logging where possible)
- Reputation is **not** a premium currency; no real-money path to reputation is planned at this stage

---

## Section 2: Champions

### Overview

Champions are purchasable NPC companions that accompany players into Dungeons and Raids. They are powerful, expensive investments that grow alongside the player over time.

### Acquisition

- Purchased from a dedicated Champions page using **gold + reputation**
- Champions are expensive by design — they are late-game investments, not early unlocks
- New champion slots unlock as the player's character level increases
- **Roster cap:** Maximum of 10 champions total (the stable grows with character level via tiered unlocks)

### Deployment

- Up to **4 champions** can be taken into a Dungeon
- **Raids require at least 2 champions** to enter (no cap other than the dungeon max of 4)
- Champions not deployed still accumulate passive XP at a reduced rate (TBD)

### Champion Progression

- Champions have their own level and stats, separate from the player character
- Champions gain XP from Dungeon and Raid participation — the more they run, the stronger they get
- If a champion is underleveled (e.g. neglected in favor of others), **gold can be spent to boost their stats** directly — a catch-up mechanic
- Champions are capped at the player's own character level (you cannot have a stronger champion than yourself)

> **Monetization flag:** The gold-for-XP boost on champions is a natural future monetization hook — premium currency acceleration, battle pass perks, etc. Design is intentionally compatible with this without requiring it.

### Champion Tiers

- Champions come in tiers (Common → Legendary) at purchase, matching the existing rarity color system
- Higher-tier champions cost significantly more but have better base stats and unique abilities
- Exact champion roster, abilities, and stat spreads are TBD for the Champions implementation spec

---

## Section 3: Dungeons

### Overview

Dungeons are the primary repeatable group-content system. A new dungeon is available every week, generated from the week's seed so every player experiences the same layout — but the layout feels fresh each rotation.

### Rotation & Generation

- **Weekly rotation** — dungeon resets every Monday (UTC midnight, consistent with existing rotation logic)
- **Seeded procedural generation** — the week number seeds the generator; room count, room types, enemy variants, and puzzle pulls are all deterministic from that seed
- Every player on the same week sees the same dungeon; players can compare notes and strategies

### Structure

- **Room count:** 3–7 rooms per dungeon, determined by the weekly seed (some weeks are short, some are brutal)
- **Room types** (pulled from three pools, seed-weighted):
  - **Stat checks** — "Force the door open [STR 15] or find the mechanism [WIS 12]"; rewards diverse builds
  - **Activity gates** — "The bridge is frozen. Log a `workout` today to cross" — ties dungeon progress to real fitness behavior
  - **Text riddles** — written riddle with 3 multiple-choice answers; wrong answers deal damage, correct answer opens the path
- **Final room:** Most dungeons end with a **boss encounter**; some end in a **loot room** with no combat (seed-determined — a surprise when it happens)

### Champions in Dungeons

- Optional — you can enter a dungeon solo or bring up to 4 champions
- Champions participate in combat encounters and stat checks (their stats contribute)

### Rewards

- Dungeons have **unique loot tables** per dungeon theme (seed-determined themes, e.g. ice cave, fire fortress, ancient ruins)
- **Legendary gear** has a drop chance unique to each dungeon
- **Daily legendary lockout** — the legendary drop chance is available once per day per dungeon; normal loot (common through epic) is always available on repeat runs
- This allows casual players to clear once and move on; dedicated players to repeat for non-legendary rewards without feeling like they're grinding legendaries endlessly

---

## Section 4: Raids

### Overview

Raids are the prestige end-game content — harder than Dungeons, gated by real fitness commitment, and rewarding god-tier loot not available anywhere else.

### Entry Requirements

- **At least 2 champions** deployed (maximum 4, same cap as Dungeons)
- **5-day raid-specific activity streak** — each raid has a designated activity type (e.g. a Warrior's Raid requires 5 consecutive days of `workout`; a Shadow Raid requires `run`). The streak must be active at raid entry.
- This ties the hardest content to real-world fitness habits — you earn the right to raid

### Rotation

- **Bi-weekly** — raids reset every two weeks, giving players enough time to build the required streak and feel the prestige of the event

### Structure

- More rooms than Dungeons (exact count TBD — likely 6–10)
- Escalating monster difficulty across rooms
- **Always ends with a final boss** — no loot-room-only finales; raids are combat-focused
- Monsters in Raids are significantly stronger than Dungeon equivalents

### Rewards

- **God-tier loot** — a distinct rarity tier above Legendary, exclusive to Raids (color/name TBD — candidates: "Divine", "Mythic", "Ascended")
- Raid-specific cosmetics and titles for first-clear and repeated clears
- Loot lockout cadence TBD (likely once per raid cycle rather than daily)

### Design Notes

- The 5-day streak requirement is intentional friction — Raids should feel earned, not accessible on a whim
- The bi-weekly cadence means missing a raid window is meaningful; this is deliberate prestige design

---

## Section 5: Parallel Systems

### 5a. Guilds

#### Overview

Guilds give players a long-term faction identity built around their dominant stat/fitness focus. They are a permanent choice with a costly exit, creating deep identity.

#### Unlock

- Available at **character level 15** — after subclass unlock (level 10), giving players time to develop an identity before committing to a guild

#### Guild Types (current examples; full roster TBD)

| Guild                 | Primary Stat   | Activity Focus                                     |
| --------------------- | -------------- | -------------------------------------------------- |
| Guild of Arcana       | Wisdom (WIS)   | Sleep, water, nutrition — magic/restore activities |
| Guild of Fighters     | Strength (STR) | Workout, run — physical activities                 |
| Additional guilds TBD | AGI, etc.      | TBD                                                |

#### Membership Rules

- **Permanent by default** — joining a guild is a meaningful commitment
- **Switching is allowed** but costs both **gold and reputation** (amounts TBD at implementation)
- A player can only belong to one guild at a time

#### Guild Benefits (tiered by guild rank)

| Tier           | Benefit                                                             |
| -------------- | ------------------------------------------------------------------- |
| Rank 1 (entry) | Passive stat bonus to guild's primary stat                          |
| Rank 2         | Activity XP multiplier for guild-aligned activity types             |
| Rank 3+        | Access to exclusive guild gear and spells not available in the shop |

#### Guild Rank Progression

- **Daily drip:** Logging activities aligned with the guild's stat earns guild XP passively
- **Milestone gates:** Each rank-up requires completing a guild-specific quest as a milestone (not just accumulated XP)
- Combining both means casual players slowly climb while dedicated players can accelerate via quests

---

### 5b. Pets

#### Overview

Pets are collectible companions that provide passive buffs and, at higher tiers, active special abilities. They reward milestone achievements and unique real-world moments.

#### Unlock Methods

- **Milestone-based** — pets unlock at character and activity milestones (e.g. "Log your 50th workout", "Reach level 20")
- **Unique triggers** — special pets unlock from specific real-world events:
  - **Birthday Pet** — log any activity on your birthday (birthday set during profile setup) to unlock a unique pet unavailable any other way
  - Additional unique trigger pets TBD (holidays, streaks, first dungeon clear, etc.)

#### Active Pet Slots (level-gated)

| Level Range | Active Slots            |
| ----------- | ----------------------- |
| Low levels  | 1 active pet            |
| Mid levels  | 2 active pets           |
| High levels | 3 active pets (maximum) |

Exact level thresholds TBD at implementation.

#### Pet Abilities by Tier

- **Common/Uncommon pets** — passive buffs only (stat bonuses, XP boosts for specific activity types, resource restore bonuses)
- **Rare/Epic pets** — passive buff + a minor active ability (e.g. "Once per dungeon, restores 10 stamina"; "After logging a run, grants +5% XP for 1 hour")
- **Legendary pets** — powerful passive + a meaningful active ability, not always combat-focused (e.g. "Once per day, doubles quest progress on next activity log"; "Reduces guild quest milestone requirement by 1")

#### Design Notes

- Pets should feel like personal rewards, not power requirements — no content should be locked behind pet ownership
- The birthday pet is intentionally unattainable any other way; it is a collector's item and conversation piece

---

### 5c. Monthly NPCs

#### Overview

Monthly NPCs are time-limited characters who appear for a calendar month and offer a single, harder-than-normal challenge. They reward prestige — unique cosmetics plus high-tier gear — and expire permanently if missed.

#### Challenge Design

- Challenges are multi-week fitness goals (e.g. "Run at least 3 times per week for 3 consecutive weeks", "Log 30 workout sessions this month")
- Harder than daily/weekly quests; require sustained real-world effort
- Each NPC has a thematic identity (name, backstory, challenge flavor text)

#### Expiry

- **Expires at end of calendar month — permanently gone**
- Partial progress does not carry over
- The same NPC may return in a future month with a different quest, but this month's quest and its rewards are gone forever
- No grace period; the hard deadline creates genuine urgency

#### Rewards

- **Unique cosmetic or title** specific to that NPC (e.g. "Champion of the Ember Run", a mount skin, a title prefix)
- **High-tier gear piece** — Epic or Legendary, specific to the NPC's theme
- Both rewards are awarded simultaneously on completion; neither is available from any other source

---

## Section 6: Future Horizon — Territory/Map

> **Status: Long-horizon concept — not for near-term implementation. Requires GPS/location services, real-time or async multiplayer infrastructure, and significant backend work. Captured here to preserve the vision.**

### Core Concept

Real-world runs and walks claim real geographic territory on a live map. Players become conquerors of their own neighborhoods.

### Mechanics (high-level)

- **Claiming:** When a player logs a run or walk, the GPS route is mapped and the covered territory is claimed under their name (if unclaimed)
- **Contested territory:** If a player runs through territory already claimed by another player, a **territorial dispute** is triggered
- **Response window:** The defending player has **3 days** to respond to the dispute. If they do not respond within 3 days, the attacker automatically claims the territory
- **PvP combat:** If the defender responds, a combat encounter is initiated using the existing combat system (same mechanics as monster combat, just player vs. player stat matchup)
- **Winner takes the territory**

### Open Design Questions (for future brainstorm)

- How is GPS route data captured and stored? (mobile app requirement)
- What is the territory granularity — city blocks, hexagonal grid, custom shapes?
- How are combat stats balanced in PvP vs. PvE (gear disparity, level gaps)?
- Is there a maximum territory size per player to prevent total domination?
- Guild territory — can guilds claim land collectively?
- Privacy — opt-in only, pseudonymous locations?

### Why It's Exciting

This feature transforms real fitness behavior into a persistent, social game layer. Running the same route as usual becomes geopolitically meaningful. It is the most ambitious feature on this roadmap and warrants its own full design session when the time comes.

---

## Implementation Sequencing Notes

When it's time to build, the recommended order based on dependencies:

1. **Reputation system + Wanted Board** — foundation currency; unlocks everything else
2. **Champions** — needed for Dungeons (optional) and Raids (required)
3. **Dungeons** — already the active focus; this doc deepens the design
4. **Guilds** — parallel system, no hard dependencies, high player impact
5. **Pets** — parallel system, primarily additive; low risk
6. **Monthly NPCs** — primarily a content system once quests are solid
7. **Raids** — requires Champions to be solid; highest complexity
8. **Territory/Map** — long-horizon; separate technical spike required

---

_This document is a living design reference. Update it as decisions are finalized during implementation planning sessions._

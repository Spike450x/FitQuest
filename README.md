# FitQuest — Fitness RPG

[![CI](https://github.com/Spike450x/FitQuest/actions/workflows/ci.yml/badge.svg)](https://github.com/Spike450x/FitQuest/actions/workflows/ci.yml)

A full-stack fitness RPG where your real-world workouts power a fantasy character. Log runs, track sleep, eat well — your stats grow, you level up, and you fight monsters.

Built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, **Firebase**, and **Zustand**.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Documentation](#documentation)
- [Project Status](#project-status)
- [Architecture](#architecture)
- [Features](#features)
  - [Authentication & Character Creation](#authentication--character-creation)
  - [Activity Logging](#activity-logging)
  - [Streaks & Personal Records](#streaks--personal-records)
  - [Combat System](#combat-system)
  - [Class Abilities](#class-abilities)
  - [Subclass System](#subclass-system)
  - [Spell System](#spell-system)
  - [Inventory & Shop](#inventory--shop)
  - [Consumable Combat Pack](#consumable-combat-pack)
  - [Quests](#quests)
  - [Dungeons](#dungeons)
  - [Achievement System](#achievement-system)
  - [Profile & Analytics](#profile--analytics)
- [Game Mechanics](#game-mechanics)
  - [Stats](#stats)
  - [XP & Leveling](#xp--leveling)
  - [Combat Formulas](#combat-formulas)
  - [Monsters](#monsters)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Roadmap](#roadmap)

---

## Tech Stack

| Layer            | Technology                |
| ---------------- | ------------------------- |
| Framework        | Next.js 15 (App Router)   |
| Language         | TypeScript 5              |
| Styling          | Tailwind CSS 3            |
| Auth & Database  | Firebase Auth + Firestore |
| State Management | Zustand 4                 |
| Charts           | Recharts                  |

---

## Documentation

This README covers feature breakdowns and game mechanics. Deeper engineering references live under [`docs/`](docs/):

| Doc                                                        | Covers                                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)               | Layered architecture, folder map, route reference, data-flow diagrams.      |
| [docs/FIRESTORE.md](docs/FIRESTORE.md)                     | Collections, schemas, validation rules, the security model.                 |
| [docs/CI.md](docs/CI.md)                                   | GitHub Actions, husky hooks, Dependabot, action SHA-pinning policy.         |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)                   | Firebase deploy process, environment setup, CI deploy step.                 |
| [docs/GAME-LOGIC.md](docs/GAME-LOGIC.md)                   | Reference for every export under `src/lib/gameLogic/`.                      |
| [docs/SECURITY-SETUP.md](docs/SECURITY-SETUP.md)           | GitHub-side hardening checklist + log of shipped remediations.              |
| [docs/CHANGELOG.md](docs/CHANGELOG.md)                     | Newest-first feature log.                                                   |
| [docs/BACKLOG.md](docs/BACKLOG.md)                         | Engineering debt and deferred technical items.                              |
| [docs/UI-UX-MODERNIZATION.md](docs/UI-UX-MODERNIZATION.md) | UI/UX audit tracking — 24-item modernization checklist.                     |
| [docs/ART-ASSETS.md](docs/ART-ASSETS.md)                   | Heraldic art system — asset inventory, generation guide, usage rules.       |
| [docs/HEALTH-INTEGRATION.md](docs/HEALTH-INTEGRATION.md)   | Health-data sync (Strava + Garmin) — design, OAuth flows, provisioning runbook. |
| [docs/SMOKE-TEST.md](docs/SMOKE-TEST.md)                   | Manual smoke-test checklist for auth, middleware, and Firebase round-trips. |
| [docs/superpowers/specs/](docs/superpowers/specs/)         | Post-MVP feature design specs (roadmap, champions, reputation, etc.).       |
| [SECURITY.md](SECURITY.md)                                 | Vulnerability reporting policy.                                             |
| [CLAUDE.md](CLAUDE.md)                                     | Development partner guide (commands, workflow, conventions).                |

---

## Project Status

All 5 MVP phases are complete. The app is fully playable end-to-end.

| Phase  | Feature                         | Status         |
| ------ | ------------------------------- | -------------- |
| 1      | Auth & Character Creation       | ✅ Complete    |
| 2      | Activity Logging                | ✅ Complete    |
| 3      | Combat System + Class Abilities | ✅ Complete    |
| 4      | Inventory & Shop                | ✅ Complete    |
| 5      | Quests (Daily & Weekly)         | ✅ Complete    |
| Bonus  | Profile Analytics               | ✅ Complete    |
| Bonus  | Spell System (dice-based)       | ✅ Complete    |
| Bonus  | Magic Consumables + Combat Pack | ✅ Complete    |
| Bonus  | Rest & Meditate combat actions  | ✅ Complete    |
| Bonus  | Streaks & Blessing system       | ✅ Complete    |
| Bonus  | Personal Records                | ✅ Complete    |
| Bonus  | Subclass System (6 subclasses)  | ✅ Complete    |
| Bonus  | Dungeons (multi-room runs)      | ✅ Complete    |
| Bonus  | Achievement system (31 badges)  | ✅ Complete    |
| Bonus  | Content-scaling 2× pass         | ✅ Complete    |
| Bonus  | Spirit stat + Meditation        | ✅ Complete    |
| Future | Champions & Raids               | 🔲 Not started |
| Future | Guilds                          | 🔲 Not started |
| Future | Prestige / Ascension            | 🔲 Not started |
| Future | Pets                            | 🔲 Not started |
| Future | Wanted Board & Reputation       | 🔲 Not started |
| Future | Monthly NPCs                    | 🔲 Not started |
| Bonus  | PWA install prompt              | ✅ Complete    |
| Future | Apple Health integration        | 🔲 Not started |
| Future | Leaderboards                    | 🔲 Not started |

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          FitQuest — Architecture                        │
└─────────────────────────────────────────────────────────────────────────┘

  BROWSER
  ┌─────────────────────────────────────────────────────────────────────┐
  │  Next.js 15 (App Router)                                           │
  │                                                                     │
  │  Auth Routes            Game Routes (behind middleware)            │
  │  ┌──────────────┐       ┌──────────────────────────────────────┐   │
  │  │ /login       │       │ /dashboard  /activities  /combat     │   │
  │  │ /register    │       │ /inventory  /shop        /quests     │   │
  │  │ /character-  │       │ /profile    /stats       /character  │   │
  │  │  creation    │       └──────────────────────────────────────┘   │
  │  └──────────────┘                        │                         │
  │                               React Components                      │
  │                         ┌────────────────────────────┐             │
  │                         │ ActivityLogForm             │             │
  │                         │ CharacterCard / StatBar     │             │
  │                         │ SubclassModal               │             │
  │                         │ SpellCard / StatAllocModal  │             │
  │                         └────────────────────────────┘             │
  │                                   │                                 │
  │                       ┌───────────┼───────────┐                    │
  │                       ▼           ▼           ▼                    │
  │  ┌─────────────────────────────────────────────────────────────┐   │
  │  │                    Zustand Stores                           │   │
  │  │                                                             │   │
  │  │  characterStore          inventoryStore      questStore     │   │
  │  │  ─────────────           ─────────────       ──────────     │   │
  │  │  fetchCharacter          fetchInventory      fetchAndAssign │   │
  │  │  createCharacter         buyItem             Quests         │   │
  │  │  awardXpAndStats         awardLoot           updateQuest    │   │
  │  │  awardGold               equipItem           Progress       │   │
  │  │  setHpLocal/Stamina/     unequipItem         claimReward    │   │
  │  │   MagicLocal             consumeItem                        │   │
  │  │  updateCurrentHp/        equipSpell/                        │   │
  │  │   Stamina/Magic           Consumable                        │   │
  │  │  allocateStatPoint                                          │   │
  │  │  resetCharacter                                             │   │
  │  │  persistStreakAndRecord                                     │   │
  │  │  applyMasteryLocal                                          │   │
  │  │  applyRestoreLocal                                          │   │
  │  │  chooseSubclass                                             │   │
  │  │  updateMonsterPity                                          │   │
  │  │                                                             │   │
  │  │  dungeonStore                                               │   │
  │  │  ─────────────                                              │   │
  │  │  fetchActiveRun  startRun  completeRun  abandonRun          │   │
  │  └─────────────────────────────────────────────────────────────┘   │
  │                                   │                                 │
  │  ┌─────────────────────────────────────────────────────────────┐   │
  │  │              Pure Game Logic  (src/lib/gameLogic/)          │   │
  │  │                                                             │   │
  │  │  constants.ts   CLASS_DEFINITIONS, COMBAT, LEVEL_UP,        │   │
  │  │                 RESTORE, MASTERY_CONFIG, stat caps, XP      │   │
  │  │                                                             │   │
  │  │  xp.ts          applyXp(), xpProgress()                     │   │
  │  │  stats.ts       applyStatGains(), calculateResourceRestore() │   │
  │  │  combat.ts      calculateRound(), rollLoot(), rollRunAway()  │   │
  │  │                 playerMaxHp/Stamina/Magic(), rollD10()       │   │
  │  │                                                             │   │
  │  │  abilities.ts   resolveAbility(), detectPattern()           │   │
  │  │                 CLASS_ABILITY_CATALOG (15 abilities)        │   │
  │  │  spells.ts      resolveSpell(), checkRequirement()          │   │
  │  │                 rollSpellDice(), describeRequirement()       │   │
  │  │  passives.ts    applyOutgoing/IncomingPassives()            │   │
  │  │                 resolveLifesteal(), SUBCLASS_CATALOG        │   │
  │  │                                                             │   │
  │  │  items.ts       ITEM_CATALOG (gear/consumables/spells, 146 items)│  │
  │  │  monsters.ts    MONSTER_CATALOG (21 monsters)               │   │
  │  │  quests.ts      DAILY_QUEST_POOL (61), WEEKLY_QUEST_POOL (31)│  │
  │  │  rotation.ts    getDailyPick(), getWeeklyPick(),            │   │
  │  │                 seededShuffle(), dailyExpiresAt()           │   │
  │  │  streaks.ts     computeNewStreak(), getStreakTier(),        │   │
  │  │                 STREAK_TIERS (6 tiers)                      │   │
  │  └─────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  Firebase (Cloud)                                                   │
  │                                                                     │
  │  Authentication          Firestore Collections                      │
  │  ─────────────           ─────────────────────                      │
  │  Email/Password          characters/{uid}                           │
  │  Route guard via         ├─ uid, name, class, level, xp, gold       │
  │  middleware.ts           ├─ stats { str/sta/agi/spr/hp/wis/def }   │
  │                          ├─ equippedGear { weapon/armor/accessory } │
  │                          ├─ currentHp / currentStamina / currentMagic│
  │                          ├─ pendingStatPoints, subclass             │
  │                          ├─ masteryCounts, streakData               │
  │                          ├─ personalRecords, legendaryDryStreak     │
  │                          ├─ dungeonRunsToday, activeDungeonRunId    │
  │                          ├─ achievements[], monstersKilled          │
  │                          ├─ totalCombatWins, activityLogCounts      │
  │                          └─ totalQuestsClaimed, weeklyQuestsClaimed │
  │                                                                     │
  │                          inventory/{docId}                          │
  │                          ├─ uid, itemDefId, quantity                │
  │                          └─ equipped, acquiredAt                    │
  │                                                                     │
  │                          activityLogs/{docId}                       │
  │                          ├─ uid, type, data, statGains, xpGained    │
  │                          └─ loggedAt, rewardEligible                │
  │                                                                     │
  │                          activeQuests/{docId}                       │
  │                          ├─ uid, questDefId, progress               │
  │                          └─ completedAt, claimedAt, expiresAt       │
  │                                                                     │
  │                          dungeonRuns/{runId}                        │
  │                          ├─ uid, tierId, weekSeed, status           │
  │                          ├─ currentRoom, rooms[], currentHp/Sta/Mag │
  │                          ├─ cumulativeXp, cumulativeGold            │
  │                          ├─ allDroppedItems[], legendaryEligible    │
  │                          └─ startedAt, completedAt, claimed         │
  │                                                                     │
  │  Cloud Functions                                                    │
  │  ───────────────                                                    │
  │  logActivity            Server-side daily-cap, mastery, HP restore  │
  │  claimDungeonRun        Atomic XP/gold/item award on run complete   │
  └─────────────────────────────────────────────────────────────────────┘

  KEY DATA FLOWS
  ─────────────
  Activity Log  →  logActivity Cloud Function (authoritative writes)
                     ├─ server-side daily-cap aggregate query
                     ├─ activityLogs Firestore write (with rewardEligible)
                     ├─ mastery: masteryCounts++ + stat++ at milestone
                     └─ restore: HP/Stamina/Magic capped at formula max
                →  applyMasteryLocal/applyRestoreLocal (mirror to Zustand)
                →  updateQuestProgress() + persistStreakAndRecord()
                     [client-side, fire-and-forget]

  Combat Round  →  calculateRound() | resolveAbility() | resolveSpell()
                →  applyOutgoingPassives() → applyIncomingPassives()
                →  setHpLocal/StaminaLocal/MagicLocal() [live, no Firestore]
                →  On win: rollLoot() → awardLoot() → awardXpAndStats() + awardGold()
                →  updateCurrentHp/Stamina/Magic() [Firestore persist on fight end]

  Quest Claim   →  claimReward() → awardXpAndStats() + awardGold() [in parallel]

  Shop Purchase →  awardGold(-price) + buyItem() [caller responsible for both]

  Dungeon Run   →  dungeonStore.startRun() — HP gate, daily cap, gold deduct
                     → createDungeonRunDoc() [Firestore write]
                →  per-room: updateDungeonRunProgress() [HP/Stamina/Magic sync]
                →  on complete/retreat: claimDungeonRunCF() [Cloud Function]
                     ├─ Firestore transaction: stamp claimed=true + status
                     ├─ apply XP+gold with level-up logic
                     └─ inventory item writes (outside transaction)
                →  checkDungeonAchievements() → toastAchievement() [client-side]

  Level-Up      →  applyXp() → levelsGained > 0 → LEVEL_UP bonuses applied
                →  health + defense auto-increase; pendingStatPoints++
                →  HP / Stamina / Magic fully restored to new maximums
```

---

## Features

### Authentication & Character Creation

- Email/password auth via Firebase Auth
- Route protection via Next.js middleware (all game pages require login)
- Character creation: choose a name and one of three classes

| Class      | Playstyle                              | Starting Stats Emphasis |
| ---------- | -------------------------------------- | ----------------------- |
| ⚔️ Warrior | Tank — highest defense, absorbs damage | STR, DEF                |
| 🧙 Wizard  | Glass cannon — low defense, high magic | WIS (scales fast)       |
| 🗡️ Rogue   | Speed — agility-focused, high stamina  | AGI, STA                |

Each class has unique stat multipliers applied to every XP gain, and a unique set of class abilities and spells.

---

### Activity Logging

Log 7 real-world fitness activities. Each one grants XP via quest progress and raises specific stats based on class multipliers.

| Activity      | Unit          | Primary Stats Gained | Resource Restored     |
| ------------- | ------------- | -------------------- | --------------------- |
| 🏋️ Workout    | per 30 min    | STR, STA, AGI, DEF   | —                     |
| 🏃 Run        | per mile      | STR, STA, AGI, HP    | —                     |
| 👣 Steps      | per 10,000    | STA, AGI, HP         | —                     |
| 😴 Sleep      | per 8 hours   | HP, DEF              | +5 Stamina per hour   |
| 💧 Water      | per 8 glasses | HP, WIS              | +5 Magic per glass    |
| 🥗 Nutrition  | per meal      | WIS                  | +20 HP per meal       |
| 🧘 Meditation | per minute    | SPR                  | +0.2 Magic per minute |

Activity logs are persisted to Firestore. A real-time preview shows XP and stat gains before you submit. Level-up banners trigger on submission.

**Mastery system:** Logging run, workout, steps, or meditation accumulates a mastery count. At log 5, then every 10 after that (5, 15, 25, …), you permanently gain +1 to the linked stat: Agility (run), Strength (workout), Wisdom (steps), Spirit (meditation).

---

### Streaks & Personal Records

**Activity Streaks:** Log at least one activity every day to build a streak. Longer streaks unlock Blessing tiers that boost rare item drop rates in combat.

| Tier        | Days | Rare+ Loot Bonus |
| ----------- | ---- | ---------------- |
| Focused     | 3+   | +15%             |
| Dedicated   | 7+   | +30%             |
| Relentless  | 14+  | +50%             |
| Unstoppable | 21+  | +75%             |
| Blessed     | 30+  | +100%            |

The bonus applies only to "rare", "epic", and "legendary" items in monster loot tables. Common and uncommon drop chances are unaffected.

**Personal Records:** Each activity type tracks your all-time best logged value. Breaking a personal record awards **1.5× XP** for that log and displays a "New Personal Record!" banner.

---

### Combat System

Turn-based combat against a roster of 21 monsters (levels 1–14). Each day a rotation of 4 monsters is available (deterministic seed, changes daily).

**Combat actions each round:**

| Action          | Cost            | Effect                                                               |
| --------------- | --------------- | -------------------------------------------------------------------- |
| ⚔️ Attack       | Free            | d10 + STR + gear bonus vs monster defense                            |
| 🔮 Magic        | Free            | d10 + WIS + gear bonus vs monster defense                            |
| 🎲 Roll Ability | 10 stamina      | Roll 6d6, trigger poker-like class ability                           |
| ✨ Cast Spell   | Magic (varies)  | Roll 2–4d6, meet requirement to trigger spell effect                 |
| 🛌 Rest         | Free turn       | Roll d10 × 3 stamina restored; monster gets a free undefended attack |
| 🧘 Meditate     | Free turn       | Roll d10 + WIS magic restored; monster gets a free undefended attack |
| 🧪 Use Item     | **Free action** | Use a packed consumable without spending your combat turn            |
| 🏃 Run Away     | Free            | Roll d10 + AGI vs monster d10; success = escape                      |

**Defense mechanics:**

- Every incoming attack has a **25% chance to bypass all defense** (armor piercing)
- Rest/Meditate free attacks bypass defense entirely — recovery carries real risk

**Persistence:** HP, stamina, and magic persist between battles. Death resets the character to level 1.

**Loot:** Winning a fight rolls the monster's loot table. Gear, consumables, and spells can all drop.

**Daily combat XP cap:** Combat-win XP is subject to diminishing returns to prevent grind loops. Wins 1–9 of the UTC day earn full XP; wins 10–19 earn 50%; wins 20–29 earn 25%; wins 30+ earn 10%. **Gold is never diminished** — combat farming for gold to fund quest rerolls or dungeon entry fees stays viable. The "Daily combat XP" badge on the combat page shows the current multiplier and the wins remaining until the next penalty. Enforced server-side by the `claimCombatVictory` Cloud Function (P0-3).

---

### Class Abilities

Roll 6d6 during combat to trigger a class-specific ability. Costs 10 stamina. The ability triggered depends on the poker-like pattern rolled.

**Pattern priority (highest wins):** Four of a Kind > Full House > Large Straight (1–5 or 2–6) > Small Straight (any 4 consecutive) > Three of a Kind

**Warrior:**

| Pattern         | Ability        | Effect                                      |
| --------------- | -------------- | ------------------------------------------- |
| Three of a Kind | Power Strike   | 2× damage, bypasses monster defense         |
| Full House      | Shield Slam    | 2× damage, stuns monster                    |
| Small Straight  | War Cry        | 1.5× damage, stuns monster                  |
| Large Straight  | Berserker Rage | 3× damage, bypasses all defense (yours too) |
| Four of a Kind  | Unstoppable    | 3× damage, bypasses defense, stuns monster  |

**Wizard:**

| Pattern         | Ability         | Effect                            |
| --------------- | --------------- | --------------------------------- |
| Three of a Kind | Arcane Bolt     | 2× magic damage                   |
| Full House      | Mana Surge      | 2× magic damage, stuns monster    |
| Small Straight  | Chain Lightning | 3× magic damage                   |
| Large Straight  | Meteor          | 3× magic damage, bypasses defense |
| Four of a Kind  | Time Warp       | 2.5× magic damage, stuns monster  |

**Rogue:**

| Pattern         | Ability     | Effect                                     |
| --------------- | ----------- | ------------------------------------------ |
| Three of a Kind | Backstab    | 2× damage                                  |
| Full House      | Smoke Bomb  | 1.5× damage, stuns monster                 |
| Small Straight  | Blade Dance | 1.5× damage, 30% lifesteal                 |
| Large Straight  | Death Mark  | 2.5× damage, 50% lifesteal                 |
| Four of a Kind  | Assassinate | 3× damage, bypasses defense, stuns monster |

---

### Subclass System

At level 10, the player permanently chooses one of two subclasses per class. Subclasses add passive abilities that modify combat every round.

| Class   | Subclass     | Identity                                                |
| ------- | ------------ | ------------------------------------------------------- |
| Warrior | 🪓 Berserker | Damage scales with HP lost; ability cost halved         |
| Warrior | 🛡️ Paladin   | Block attacks by divine will; heal every round          |
| Wizard  | 🔮 Archmage  | Spells hit harder, cost less, magic regens faster       |
| Wizard  | 💀 Warlock   | Drain life from every hit; spend HP when magic runs out |
| Rogue   | ☠️ Assassin  | First ability hits 2×; execute enemies at low HP        |
| Rogue   | 🏹 Ranger    | Crit on high d10 rolls; always escapes safely           |

All subclassed Warriors share **Battle-Hardened** (+2 attack per 5 DEF) and **Iron Will** (−20% incoming damage below 30% HP).  
All subclassed Rogues share **Hemorrhage** (lifesteal abilities drain an extra 15%) and **Ghost Step** (+AGI÷4 escape bonus).  
All Wizards share **Mana Barrier** (absorb up to 10 damage per round from magic pool) and base magic regeneration (+2/round).

---

### Spell System

Spells are items with `type: "spell"`. They must be purchased or looted, then equipped in a loadout (up to 5 spells) before entering combat.

**Spell catalog — 35 spells total** (14 added in the 2× content-scaling drop):

- 12 generic spells (all classes)
- 8 Warrior spells
- 8 Wizard spells
- 7 Rogue spells
- 6 are loot-only (never sold): 3 epic class spells (Titan's Fury / Void Collapse / Phantom Assault, now also boss drops) + 3 legendary class spells (Worldbreaker / Stellar Collapse / Thousand Cuts, dropped by the Dragon King + L11–14 monsters)
- The 5 buyable spells featured each week rotate via the shop's weekly rotation

**How casting works:**

1. Click "✨ Cast Spell" during your turn → spell panel opens
2. Pick a spell — magic cost is deducted and you roll the spell's dice
3. If the dice meet the requirement → full effect applied
4. If the dice fail → spell fizzles (magic still spent, no effect)
5. Monster retaliates unless the spell stuns it

**Dice requirement types:**

| Type              | Example                       |
| ----------------- | ----------------------------- |
| `sum_gte`         | Roll 3d6, total ≥ 10          |
| `exact_value`     | Roll 2d6, get at least one 6  |
| `pair`            | Roll 3d6, get any pair        |
| `three_of_a_kind` | Roll 4d6, get three of a kind |
| `straight`        | Roll 4d6, get a straight of 3 |

**Spell effects (can combine):**

| Effect           | Description                                                     |
| ---------------- | --------------------------------------------------------------- |
| `damage`         | Extra damage to monster (vs defense, unless `bypassMonsterDef`) |
| `heal`           | HP restored to player                                           |
| `restoreStamina` | Stamina restored to player                                      |
| `stun`           | Monster skips its counter-attack this round                     |
| `defenseBoost`   | Temporary defense bonus for this round                          |
| `lifestealPct`   | Fraction of damage dealt returned as HP                         |
| `dotDamage`      | Bleed/burn — `{ perRound, rounds }` ticks on the monster each subsequent round, bypassing defense (content-scaling PR4) |

**Wisdom scaling:** Many spells scale with the player's WIS stat. Spell cards display the formula clearly — e.g., `20 base + 8 WIS = 28 heal`.

**Spirit crit:** Spells (and class abilities) can critically hit based on the player's SPR stat — `+1 %` crit chance per point (cap 40 %) and `+0.5 %` crit damage per point (cap +25 %). Fires only on a successful, damage-dealing cast.

**Magic resource:**

- `maxMagic = 20 (base) + WIS × 3 + 10 (wizard bonus only)`
- Persists to Firestore between battles
- Restored to full on level-up

---

### Inventory & Shop

**Item catalog — 5 rarity tiers:**

| Rarity    | Color  | Description                                  |
| --------- | ------ | -------------------------------------------- |
| Common    | Gray   | Cheap early-game gear                        |
| Uncommon  | Green  | Meaningful mid-game bonuses                  |
| Rare      | Blue   | Late-game, strong bonuses                    |
| Epic      | Purple | High-end, very expensive                     |
| Legendary | Orange | Best-in-slot; loot-only (never sold in shop) |

**Item types:** Weapons (boost STR or WIS in combat), Armor (boost DEF), Accessories (mixed bonuses), Consumables (HP/stamina/magic restore), Spells.

**Gear slots:** Weapon, Armor, Accessory. Equipping a new item to an occupied slot automatically unequips the old one. HP and stamina adjust immediately when gear changes.

**Shop:** 8 daily-rotating purchasable items (gear changes each day; consumables and spells are always available in separate tabs). Legendary items never appear in the shop.

---

### Consumable Combat Pack

Consumables must be packed into a **Combat Pack** before entering battle (up to 5 slots). You cannot use items from your bag mid-fight — only what's in the pack.

**Consumable types:**

| Type               | Items                    | Restore Amount       |
| ------------------ | ------------------------ | -------------------- |
| ❤️ HP Potions      | Minor, Standard, Greater | 25 / 50 / 100 HP     |
| ⚡ Stamina Potions | Minor, Standard, Greater | 20 / 40 / 80 Stamina |
| ✨ Magic Potions   | Minor, Standard, Greater | 15 / 30 / 60 Magic   |

**Using a consumable in combat is a free action** — it does not consume your turn.

Pack management is handled from the **Inventory → Consumables** tab.

---

### Quests

**Daily quests:** 3 quests active per day, drawn from a pool of 61 (across all 7 activity types, including cross-habit combos). Rotate deterministically — same quests for all players on a given day.

**Weekly quests:** 3 quests active per week, drawn from a pool of 31 (across all 7 activity types, including cross-habit combos). Rotate deterministically — same quests for all players in a given week.

Quest progress updates automatically as you log activities. Rewards (XP + gold) are claimed manually via a button. Quests expire at the end of the day/week with a live countdown timer.

---

### Dungeons

Multi-room dungeon runs with escalating loot, seeded weekly layouts, and a boss encounter at the end.

**Four tiers:**

| Tier             | Rec. Level | Entry Fee | Rooms      | Top Loot  |
| ---------------- | ---------- | --------- | ---------- | --------- |
| 👺 Goblin Caves  | 1–5        | 50g       | 3–5 + boss | Epic      |
| 🕷 Spider Lair   | 4–8        | 100g      | 3–6 + boss | Epic      |
| 💀 Dark Sanctum  | 7–10       | 200g      | 4–6 + boss | Legendary |
| 🔥 Dragon's Keep | 10+        | 400g      | 4–7 + boss | Legendary |

**Rules:**

- Entry requires ≥ 50% HP. HP restores only by logging real-world meals and sleep.
- 2 runs per day maximum (global across all tiers). First run is legendary-eligible; second run is legendary-locked.
- Entry fee is non-refundable — retreat or defeat still costs the fee.
- Resources (HP, Stamina, Magic) carry over between rooms.

**Room types:**

- ⚔ **Combat rooms** — turn-based fight using the existing engine; loot quality scales with room depth.
- 🔍 **Stat check rooms** — choose a path (STR / WIS / AGI); meet the threshold to pass free, or attempt anyway for HP damage.
- 💤 **Rest rooms** — seed-determined; restores 30% Stamina and 30% Magic (shown as `?` on the entry preview).
- 💀 **Boss room** — tier-specific boss with an enrage mechanic; awards the dungeon-exclusive loot table.

**Seeded weekly rotation:** All players on the same calendar week see the same dungeon layout per tier (same rooms, same monsters, same stat check variants). The layout resets each Monday (UTC).

**12 dungeon-exclusive items** (cannot drop from regular combat or be purchased in the shop): Goblin King's Signet, Scavenger's Chain, Flintsteel Dagger, Venomfang Bracer, Arachnoweave Cloak, Spiderspun Tome, Bone Lattice Armor, Necrotic Staff, Wraithbound Ring, Draconic Sigil, Emberclaw Gauntlets, Scale of the Dragon King.

**Flee:** During combat rooms, the "Flee" action uses Agility (same `rollRunAway` mechanic as the arena). Failed flee = monster gets a free hit and you stay in the fight. In the room transition interstitial, "Retreat with Loot" is always-succeeds and ends the run with all earned loot/XP.

**Rewards:** Claimed atomically by the `claimDungeonRun` Cloud Function — XP, gold, and inventory items are awarded server-side. Run history with loot preview is shown in the dungeon lobby.

---

### Achievement System

**31 one-time milestone badges** across six categories. Each badge awards gold once and appears in the profile badge gallery and the `/collections` catalog (with locked/unlocked states). Most are server-authoritative (awarded atomically inside the `claimCombatVictory` / `logActivity` / `claimDungeonRun` Cloud Functions); quest and collection badges are client-mirrored. See [`src/lib/gameLogic/achievements.ts`](src/lib/gameLogic/achievements.ts).

**Dungeon (6):**

| Badge               | Condition                                    | Gold |
| ------------------- | -------------------------------------------- | ---- |
| 🏰 Dungeon Initiate | Complete your first dungeon run              | 50g  |
| 👺 Goblin Slayer    | Clear the Goblin Caves                       | 100g |
| 🕷 Web Walker       | Clear the Spider Lair                        | 150g |
| 💀 Dark Arts        | Clear the Dark Sanctum                       | 250g |
| 🔥 Dragonheart      | Clear Dragon's Keep                          | 500g |
| ⭐ Legendary Haul   | Receive a legendary item from a dungeon boss | 200g |

**Combat (7):** First Blood (first arena win, 50g), Centurion (100 wins, 300g), the four Slayer badges (defeat 5 each of Obsidian Golem / Ashwyrm / Void Revenant / Storm Djinn, 150g each), and Untouched (win a fight without taking damage, 200g).

**Activity (6):** Iron Body (100 workouts), Marathoner (100 runs), Well-Fed (100 nutrition logs), Well-Rested (100 sleep logs) — 200g each; Like Water (water 7 days running, 150g); Enlightened (50 meditation sessions, 250g).

**Mastery (4):** Apprentice (mastery 5 on any primary stat, 50g), Journeyman (15, 150g), Master (25, 300g), Polymath (mastery 5 on all of STR/WIS/AGI/SPR, 500g).

**Quest (4):** Quest Novice (50 quests, 100g), Quest Veteran (250, 300g), Quest Legend (1000, 1000g), Weekly Perfectionist (claim all 3 weekly quests in one week, 400g).

**Collection (4):** Bestiary Complete (discover every monster + boss, 500g), Legendary Hoarder (own every legendary at once, 1500g), Armory (own 15+ unique gear pieces, 300g), Arcane Archive (own every spell, 800g).

---

### Profile & Analytics

A dedicated profile page with:

- XP earned over time (line chart)
- Activity breakdown by type (bar chart)
- Streak history and personal records panel
- Quests claimed count
- Time range filters (7 days, 30 days, all time)
- Account management: change display name, email, password

---

## Game Mechanics

### Stats

| Stat           | Combat Role                                                                     | Activity Source           |
| -------------- | ------------------------------------------------------------------------------- | ------------------------- |
| Strength (STR) | Physical attack damage                                                          | Workouts, runs            |
| Stamina (STA)  | Max HP pool, ability fuel                                                       | Runs, steps, sleep        |
| Agility (AGI)  | Escape rolls                                                                    | Runs, steps, workouts     |
| Health (HP)    | Max HP pool                                                                     | Runs, steps, sleep, water |
| Wisdom (WIS)   | Magic pool, spell scaling                                                       | Water, nutrition          |
| Defense (DEF)  | Reduces incoming damage                                                         | Workouts, sleep           |
| Spirit (SPR)   | Spell + ability crit chance (+1 %/pt, cap 40 %) & damage (+0.5 %/pt, cap +25 %) | Meditation                |

**Stat caps:**

- Primary stats (STR, WIS, AGI, SPR): hard cap at **50**
- Secondary stats (STA, HP, DEF): level-scaled cap of `level × 5 + 10`

**Level-up bonuses (per level):** +1 HP (auto), +1 DEF (auto), +1 free stat point (player choice: STR, WIS, AGI, SPR, or STA)

### XP & Leveling

```text
XP to next level = floor(100 × level^1.5)
```

Examples: Level 1 → 2 requires 100 XP. Level 5 → 6 requires 559 XP. Level 10 → 11 requires 3,162 XP.

### Combat Formulas

```text
Player Max HP      = 50 + (stamina × 2) + (health × 1) + gear bonuses
Player Max Stamina = 20  + (stamina stat × 5) + gear bonuses
Player Max Magic   = 20  + (wisdom × 3) [+10 for wizards]

Physical attack    = d10 + STR + weapon gear bonus − monster defense
Magic attack       = d10 + WIS + weapon gear bonus − monster defense
Defense bypass     = 25% chance per hit for defender's defense to be ignored

Regular round      = monster deals flat monster.attack − player defense
                     (monster d10 roll is displayed for atmosphere only)
Ability/Spell round = monster counter-attack adds d10 + monster.attack − player defense

Escape roll        = d10 + AGI vs monster d10

Daily combat XP    = base_xp × multiplier, where multiplier =
                     1.0  if wins_today < 5
                     0.5  if wins_today < 15
                     0.25 if wins_today < 25
                     0.1  otherwise        (gold is NOT diminished)
```

### Monsters

21 monsters spanning levels 1–14 (10 added in the 2× content-scaling drop). Below shows the original 10 — see [`src/lib/gameLogic/monsters.ts`](src/lib/gameLogic/monsters.ts) for the full catalog including the 10 L1–14 additions (Mud Imp, Boar Runt, Bog Lurker, Iron Husk, Frost Wraith, Gloom Knight, Obsidian Golem, Ashwyrm, Void Revenant, Storm Djinn) and their new mechanics (`siphon`, `armor-pierce`, `summon-add`):

| Monster          | Level | HP  | Attack | Defense | XP  | Gold |
| ---------------- | ----- | --- | ------ | ------- | --- | ---- |
| Giant Rat        | 1     | 22  | 9      | 1       | 18  | 8    |
| Goblin Scout     | 1     | 30  | 8      | 2       | 20  | 10   |
| Forest Goblin    | 2     | 45  | 10     | 3       | 32  | 16   |
| Orc Grunt        | 3     | 60  | 13     | 5       | 50  | 25   |
| Cave Spider      | 4     | 50  | 15     | 3       | 65  | 33   |
| Skeleton Warrior | 5     | 80  | 15     | 7       | 85  | 43   |
| Dark Wolf        | 6     | 90  | 18     | 5       | 105 | 53   |
| Stone Troll      | 7     | 120 | 20     | 9       | 135 | 68   |
| Dark Mage        | 8     | 80  | 25     | 4       | 160 | 80   |
| Ancient Dragon   | 10    | 220 | 32     | 16      | 320 | 160  |

All monsters have loot tables. The Ancient Dragon drops legendary loot-only items at low chances.

---

## Project Structure

```text
src/
├── app/
│   ├── (auth)/              # Login, register pages
│   ├── (game)/              # All game pages (auth-protected)
│   │   ├── dashboard/       # Main hub: stats, XP, quick actions, feed
│   │   ├── activities/      # Log workouts, runs, sleep, etc.
│   │   ├── combat/          # Turn-based battle page
│   │   ├── inventory/       # Gear, spells, consumables + Combat Pack
│   │   ├── shop/            # Buy gear, spells, consumables
│   │   ├── quests/          # Daily & weekly quest tracking
│   │   ├── character/       # Stat allocation, level-up
│   │   └── profile/         # Analytics charts, account settings
│   └── character-creation/  # One-time class selection on first login
│
├── components/
│   ├── activities/          # ActivityLogForm
│   ├── character/           # CharacterCard, ClassSelector, StatBar, StatAllocModal, SubclassModal
│   └── ui/                  # SpellCard, XPBar, GoldDisplay
│
├── lib/
│   └── gameLogic/
│       ├── constants.ts     # COMBAT, RESTORE, LEVEL_UP, stat caps, XP formula, class/activity defs
│       ├── items.ts         # Full item catalog (146 items: 40 weapons / 25 armor / 30 accessories / 16 consumables / 35 spells)
│       ├── monsters.ts      # MONSTER_CATALOG (21 monsters with loot tables, levels 1–14)
│       ├── quests.ts        # DAILY_QUEST_POOL (61) + WEEKLY_QUEST_POOL (31)
│       ├── rotation.ts      # Deterministic daily/weekly rotation via seeded LCG shuffle
│       ├── abilities.ts     # 6d6 class ability system (CLASS_ABILITY_CATALOG, detectPattern)
│       ├── spells.ts        # Spell dice rolling, requirement checks, resolveSpell
│       ├── passives.ts      # Subclass passive system (SUBCLASS_CATALOG, all passive functions)
│       ├── combat.ts        # HP/stamina/magic max calcs, gear bonuses, rollD10, calculateRound
│       ├── stats.ts         # Stat gain application, resource restore calculations
│       ├── streaks.ts       # Streak tracking, STREAK_TIERS, loot multiplier
│       └── xp.ts            # XP award and leveling logic
│
├── store/
│   ├── characterStore.ts    # Zustand: character state, XP/stat/HP/magic sync with Firestore
│   ├── inventoryStore.ts    # Zustand: inventory, equip/unequip, spell and consumable loadouts
│   └── questStore.ts        # Zustand: active quests, progress tracking, reward claiming
│
├── hooks/
│   ├── useAuth.ts           # Firebase auth state listener
│   ├── useCharacter.ts      # Convenience wrapper around characterStore
│   └── useRecentActivity.ts # Firestore query for recent activity logs
│
├── types/
│   └── index.ts             # All shared TypeScript types and interfaces
│
└── middleware.ts             # Firebase Auth route protection (redirects unauthenticated users)
```

---

## Getting Started

### Prerequisites

- Node.js 24+ (CI runs on Node 24; Node 20/22 still work locally but are not tested in CI)
- Java 11+ on `PATH` — required only if you want to run the Firestore emulator (`npm run test:rules`) locally. Not needed for normal development.
- A Firebase project with **Authentication** (Email/Password) and **Firestore** enabled

### Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/Spike450x/FitQuest.git
   cd FitQuest
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

   This also activates **git hooks** via `husky` (runs automatically through the `prepare` script):
   - **pre-commit** — runs `lint-staged` (ESLint on staged `.ts`/`.tsx`) + `npm run typecheck` (project-wide `tsc --noEmit`) + `npm test` (vitest unit tests). Blocks commits with type, lint, or test failures.
   - **pre-push** — blocks direct pushes to `master`. Use a feature branch + PR. Bypass in a true emergency with `HUSKY=0 git push ...`.

   If you ever clone the repo and the hooks aren't firing, run `npm install` again — `prepare` is what wires them up.

3. **Configure Firebase**

   Copy `.env.local.example` to `.env.local` and fill in your Firebase project credentials:

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=
   ```

   Find these in: Firebase Console → Project Settings → Your Apps → SDK setup and configuration.

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

---

## Roadmap

Full post-MVP feature designs are documented in [`docs/superpowers/specs/`](docs/superpowers/specs/).

- **Dungeons** — weekly seeded procedural dungeon runs, 3–7 rooms, stat checks + riddles + activity gates, unique loot tables, legendary daily lockout
- **Champions & Raids** — purchasable NPC heroes with hybrid AI (auto + player commands, per-archetype cooldowns); bi-weekly raids requiring 2+ champions and a 5-day activity streak
- **Guilds** — stat-focused factions unlocked at level 15, tiered buffs (passive stat → XP multiplier → exclusive gear), guild rank via daily activity + milestone quests
- **Pets** — milestone and event unlocks (including birthday pet), passive and active abilities by rarity tier, up to 3 simultaneous active pets
- **Wanted Board & Reputation** — random objectives that trigger fight-or-loot encounters; dual-layer reputation economy (spendable balance + lifetime rank) with 5 rank tiers
- **Monthly NPCs** — rotating characters with dynamic challenge pools and dynamic rewards, gated by level/reputation, expire permanently if missed
- **Achievement system** — one-time milestone badges for combat kills, streak lengths, level milestones, etc.
- **Prestige / Ascension** — reset to level 1 with permanent carry-over bonuses for replayability
- **Apple Health integration** — auto-import workouts, steps, and sleep directly from HealthKit
- **Leaderboards** — compare XP, level, and kill counts with other players via Firestore
- **Territory / Map** _(long-horizon)_ — GPS-based territory claiming, contested land triggers async PvP using the existing combat system

---

_Built iteratively as a solo side project. MVP playable end-to-end._

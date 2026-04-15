# FitQuest — Fitness RPG

A full-stack fitness RPG where your real-world workouts power a fantasy character. Log runs, track sleep, eat well — your stats grow, you level up, and you fight monsters.

Built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, **Firebase**, and **Zustand**.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Status](#project-status)
- [Features](#features)
  - [Authentication & Character Creation](#authentication--character-creation)
  - [Activity Logging](#activity-logging)
  - [Combat System](#combat-system)
  - [Spell System](#spell-system)
  - [Inventory & Shop](#inventory--shop)
  - [Consumable Combat Pack](#consumable-combat-pack)
  - [Quests](#quests)
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

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Auth & Database | Firebase Auth + Firestore |
| State Management | Zustand 4 |
| Charts | Recharts |

---

## Project Status

All 5 MVP phases are complete. The app is fully playable end-to-end.

| Phase | Feature | Status |
|---|---|---|
| 1 | Auth & Character Creation | ✅ Complete |
| 2 | Activity Logging | ✅ Complete |
| 3 | Combat System + Class Abilities | ✅ Complete |
| 4 | Inventory & Shop | ✅ Complete |
| 5 | Quests (Daily & Weekly) | ✅ Complete |
| Bonus | Profile Analytics | ✅ Complete |
| Bonus | Spell System (dice-based) | ✅ Complete |
| Bonus | Magic Consumables + Combat Pack | ✅ Complete |
| Bonus | Rest & Meditate combat actions | ✅ Complete |
| Future | Dungeons (multi-room runs) | 🔲 Not started |
| Future | Apple Health integration | 🔲 Not started |
| Future | Leaderboards | 🔲 Not started |

---

## Features

### Authentication & Character Creation

- Email/password auth via Firebase Auth
- Route protection via Next.js middleware (all game pages require login)
- Character creation: choose a name and one of three classes

| Class | Playstyle | Starting Stats Emphasis |
|---|---|---|
| ⚔️ Warrior | Tank — highest defense, absorbs damage | STR, DEF |
| 🧙 Wizard | Glass cannon — low defense, high magic | WIS (scales fast) |
| 🗡️ Rogue | Speed — agility-focused, high stamina | AGI, STA |

Each class has unique stat multipliers applied to every XP gain, and a unique set of class abilities and spells.

---

### Activity Logging

Log 6 real-world fitness activities. Each one grants XP and raises specific stats based on class multipliers.

| Activity | Unit | XP (base) | Stats Gained |
|---|---|---|---|
| 🏋️ Workout | per 30 min | 10 | STR, STA, AGI, DEF |
| 🏃 Run | per mile | 15 | STR, STA, AGI, HP |
| 👣 Steps | per 10,000 | 8 | STA, AGI, HP |
| 😴 Sleep | per 8 hours | 8 | HP, DEF |
| 💧 Water | per 8 glasses | 5 | HP, WIS |
| 🥗 Nutrition | per meal | 6 | WIS |

Activity logs are persisted to Firestore. A real-time preview shows XP and stat gains before you submit. Level-up banners trigger on submission.

Sleep, water, and nutrition also restore out-of-combat **stamina** (5 per sleep hour, 2 per glass of water, 5 per meal).

---

### Combat System

Turn-based combat against a roster of 10 monsters. Each day a rotation of 4 monsters is available (deterministic seed, changes daily).

**Combat actions each round:**

| Action | Cost | Effect |
|---|---|---|
| ⚔️ Attack | Free | d10 + STR + gear bonus vs monster defense |
| 🎲 Roll Ability | 10 stamina | Roll 6d6, trigger poker-like class ability |
| ✨ Cast Spell | Magic (varies) | Roll 2–4d6, meet requirement to trigger spell effect |
| 🛌 Rest | Free turn | Roll d10 × 3 stamina restored; monster gets a free undefended attack |
| 🧘 Meditate | Free turn | Roll d10 + WIS magic restored; monster gets a free undefended attack |
| 🧪 Use Item | **Free action** | Use a packed consumable without spending your combat turn |
| 🏃 Run Away | Free | Roll d10 + AGI vs monster; success = escape |

**Defense mechanics:**
- Every incoming attack has a **25% chance to bypass all defense** (armor piercing)
- Rest/Meditate free attacks bypass defense entirely — recovery is a meaningful risk

**Persistence:** HP, stamina, and magic persist between battles. Death resets the character to level 1.

**Loot:** Winning a fight rolls the monster's loot table. Gear, consumables, and spells can all drop.

---

### Spell System

Spells are items with `type: "spell"`. They must be purchased or looted, then equipped in a loadout (up to 5 spells) before entering combat.

**Spell catalog — 21 spells total:**
- 6 generic spells (all classes)
- 5 Warrior spells
- 5 Wizard spells
- 5 Rogue spells
- 3 epic/legendary spells are loot-only (one per class, dropped from hard monsters)

**How casting works:**
1. Click "✨ Cast Spell" during your turn → spell panel opens (free action, no turn spent opening it)
2. Pick a spell — magic cost is deducted and you roll the spell's dice
3. If the dice meet the requirement → full effect applied
4. If the dice fail → spell fizzles (magic still spent, no effect)
5. Monster retaliates unless the spell stuns it

**Dice requirement types:**

| Type | Example |
|---|---|
| `sum_gte` | Roll 3d6, total ≥ 10 |
| `exact_value` | Roll 2d6, get at least one 6 |
| `pair` | Roll 3d6, get any pair |
| `three_of_a_kind` | Roll 4d6, get three of a kind |
| `straight` | Roll 4d6, get a straight of 3 |

**Spell effects (can combine):**

| Effect | Description |
|---|---|
| `damage` | Extra damage to monster (vs defense, unless `bypassMonsterDef`) |
| `heal` | HP restored to player |
| `restoreStamina` | Stamina restored to player |
| `stun` | Monster skips its counter-attack this round |
| `defenseBoost` | Temporary defense bonus for this round |
| `lifestealPct` | Fraction of damage dealt returned as HP |

**Wisdom scaling:** Many spells scale with the player's WIS stat. Spell cards display the formula clearly — e.g., `20 base + 8 WIS = 28 heal`. Warrior physical spells don't scale; wizard/rogue magical spells generally do.

**Magic resource:**
- `maxMagic = 20 (base) + WIS × 3 + 10 (wizard bonus only)`
- Persists to Firestore between battles
- Restored to full on level-up

**Spell cards** are displayed as physical playing cards — rarity-colored header, magic cost in corners, emoji center, dice requirement, effect tags.

---

### Inventory & Shop

**Item catalog — 5 rarity tiers:**

| Rarity | Color | Description |
|---|---|---|
| Common | Gray | Cheap early-game gear |
| Uncommon | Green | Meaningful mid-game bonuses |
| Rare | Blue | Late-game, strong bonuses |
| Epic | Purple | High-end, very expensive |
| Legendary | Orange | Best-in-slot; loot-only (no shop) |

**Item types:** Weapons (boost STR or WIS in combat), Armor (boost DEF), Accessories (mixed bonuses), Consumables (HP/stamina/magic restore), Spells.

**Gear slots:** Weapon, Armor, Accessory. Equipping a new item to an occupied slot automatically unequips the old one.

**Shop:** 8 daily-rotating purchasable items (gear changes each day, consumables always available, spells always available in a separate tab). Legendary items never appear in the shop.

---

### Consumable Combat Pack

Consumables must be packed into a **Combat Pack** before entering battle (up to 5 consumables). You cannot use items from your bag mid-fight — only what's in the pack.

**Consumable types:**

| Type | Items |
|---|---|
| ❤️ HP Potions | Minor (30 HP), Standard (60 HP), Greater (120 HP) |
| ⚡ Stamina Potions | Minor (20 STA), Standard (40 STA), Greater (80 STA) |
| ✨ Magic Potions | Minor (15 magic), Standard (30 magic), Greater (60 magic) |

**Using a consumable in combat is a free action** — it does not consume your turn. You can heal and still attack in the same round.

Pack management is handled from the **Inventory → Consumables** tab, which shows the current pack loadout (up to 5 slots, emerald-themed UI).

---

### Class Abilities

Roll 6d6 during combat to trigger a class-specific ability. Costs 10 stamina. The ability triggered depends on the poker-like pattern rolled.

**Warrior abilities:**
- Three of a Kind → Shield Slam (heavy damage + stun)
- Small Straight → War Cry (attack bonus this round)
- Large Straight → Heroic Strike (massive damage)
- Four of a Kind → Bulwark (near-perfect defense)
- Full House → Rallying Blow (damage + self-heal)

**Wizard abilities:**
- Three of a Kind → Arcane Burst (magic AoE-style hit)
- Small Straight → Mana Surge (bonus magic restored)
- Large Straight → Time Warp (extra action)
- Four of a Kind → Void Collapse (obliterating damage, bypass defense)
- Full House → Arcane Shield (absorb incoming damage)

**Rogue abilities:**
- Three of a Kind → Backstab (precision crit)
- Small Straight → Evasion (dodge next hit)
- Large Straight → Shadow Step (stun + escape)
- Four of a Kind → Death Mark (stacking damage debuff)
- Full House → Smoke Bomb (confusion, monster misses)

---

### Quests

**Daily quests:** 3 quests active per day, drawn from a pool of 12 (2 per activity type). Rotate deterministically — same quests for all players on a given day.

**Weekly quests:** 3 quests active per week, drawn from a pool of 5. Cover running, workouts, steps, sleep, and nutrition.

Quest progress updates automatically as you log activities. Rewards (XP + gold) are claimed manually via a button. Quests expire at the end of the day/week with a live countdown timer.

---

### Profile & Analytics

A dedicated profile page with:
- XP earned over time (line chart)
- Activity breakdown by type (bar chart)
- Quests claimed count
- Time range filters (7 days, 30 days, all time)
- Account management: change display name, email, password

---

## Game Mechanics

### Stats

| Stat | Combat Role | Activity Source |
|---|---|---|
| Strength (STR) | Physical attack damage | Workouts, runs |
| Stamina (STA) | Max HP pool, ability fuel | Runs, steps, sleep |
| Agility (AGI) | Escape rolls, dodge | Runs, steps, workouts |
| Health (HP) | Max HP pool | Runs, steps, sleep, water |
| Wisdom (WIS) | Magic pool, spell scaling | Water, nutrition |
| Defense (DEF) | Reduces incoming damage | Workouts, sleep |

**Stat caps:**
- Primary stats (STR, WIS, AGI): hard cap at **50**
- Secondary stats (STA, HP, DEF): level-scaled cap of `level × 5 + 10`

**Level-up bonuses (per level):** +1 HP (auto), +1 DEF (auto), +1 free stat point (player choice)

### XP & Leveling

```
XP to next level = floor(100 × level^1.5)
```

Examples: Level 1 → 2 requires 100 XP. Level 5 → 6 requires 559 XP. Level 10 → 11 requires 3,162 XP.

### Combat Formulas

```
Player Max HP     = 50 + (stamina × 2) + (health × 1)
Player Max Stamina = BASE_STAMINA(20) + (stamina stat × 5)
Player Max Magic  = 20 + (wisdom × 3) [+10 for wizards]

Attack roll       = d10 + STR + gear weapon bonus
Spell damage      = spell base [+ WIS if scalable] − monster defense [unless bypass]
Monster attack    = monster.attack + d10 − player DEF [25% chance DEF = 0]
Escape roll       = d10 + AGI vs monster.attack + d10
```

### Monsters

10 monsters spanning levels 1–10:

| Monster | Level | HP | Attack | Defense | XP | Gold |
|---|---|---|---|---|---|---|
| Giant Rat | 1 | 22 | 9 | 1 | 18 | 8 |
| Goblin Scout | 1 | 30 | 8 | 2 | 20 | 10 |
| Forest Goblin | 2 | 45 | 10 | 3 | 32 | 16 |
| Orc Grunt | 3 | 60 | 13 | 5 | 50 | 25 |
| Cave Spider | 4 | 50 | 15 | 3 | 65 | 33 |
| Skeleton Warrior | 5 | 80 | 15 | 7 | 85 | 43 |
| Dark Wolf | 6 | 90 | 18 | 5 | 105 | 53 |
| Stone Troll | 7 | 120 | 20 | 9 | 135 | 68 |
| Dark Mage | 8 | 80 | 25 | 4 | 160 | 80 |
| Ancient Dragon | 10 | 220 | 32 | 16 | 320 | 160 |

All monsters have loot tables. The Ancient Dragon drops legendary loot-only items at low chances.

---

## Project Structure

```
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
│   ├── character/           # CharacterCard, ClassSelector, StatBar, StatAllocModal
│   └── ui/                  # SpellCard, XPBar, GoldDisplay
│
├── lib/
│   └── gameLogic/
│       ├── constants.ts     # COMBAT, RESTORE, LEVEL_UP, stat caps, XP formula
│       ├── items.ts         # Full item catalog (weapons, armor, consumables, spells)
│       ├── monsters.ts      # Monster catalog
│       ├── quests.ts        # Daily + weekly quest pools
│       ├── rotation.ts      # Deterministic daily/weekly rotation (LCG seed)
│       ├── abilities.ts     # 6d6 class ability resolution
│       ├── spells.ts        # Dice rolling, requirement checks, resolveSpell
│       ├── combat.ts        # HP/stamina/magic calculations, gear bonuses
│       ├── stats.ts         # Stat gain application, class multipliers
│       └── xp.ts            # XP award, leveling
│
├── store/
│   ├── characterStore.ts    # Zustand: character state, stat/HP/magic sync
│   ├── inventoryStore.ts    # Zustand: inventory, equip/unequip, spell/consumable loadout
│   └── questStore.ts        # Zustand: active quests, progress, claiming
│
├── hooks/
│   ├── useAuth.ts
│   ├── useCharacter.ts
│   └── useRecentActivity.ts
│
├── types/
│   └── index.ts             # All shared TypeScript types
│
└── middleware.ts             # Firebase Auth route protection
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with **Authentication** (Email/Password) and **Firestore** enabled

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/Spike450x/fitness-rpg-2.0.git
   cd fitness-rpg-2.0
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**

   Copy `.env.local.example` to `.env.local` and fill in your Firebase project credentials:
   ```
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

- **Dungeons** — multi-room dungeon runs with sequential monster encounters and persistent state between rooms
- **Apple Health integration** — auto-import workouts, steps, and sleep directly from HealthKit
- **Leaderboards** — compare XP, level, and kill counts with other players via Firestore

---

*Built iteratively as a solo side project. MVP playable end-to-end.*

# FitQuest — Fitness RPG Development Guide

## Project Overview

A gamified fitness web app built as a full Fitness × Fantasy RPG hybrid. Players log real-world workouts to earn XP, level up a character, unlock gear, complete quests, and battle enemies.

**Stack:** Next.js 15 (App Router) · React 18 · TypeScript 5 · Tailwind CSS · Firebase (Firestore + Auth) · Zustand · Recharts

**Firebase project:** `fitness-rpg-claude`

**Key paths:**

- `src/app/(game)/` — all game screens (dashboard, activities, quests, combat, character, shop, stats, inventory, profile)
- `src/app/(auth)/` — login / register
- `src/components/` — shared UI components
- `src/lib/` — Firebase init + game logic utilities
- `src/store/` — Zustand stores (character, inventory, quests)
- `src/types/` — TypeScript definitions
- `src/hooks/` — custom React hooks
- `src/middleware.ts` — route protection
- `docs/` — engineering references: [ARCHITECTURE](docs/ARCHITECTURE.md), [FIRESTORE](docs/FIRESTORE.md), [CI](docs/CI.md), [GAME-LOGIC](docs/GAME-LOGIC.md), [SECURITY-SETUP](docs/SECURITY-SETUP.md), [SMOKE-TEST](docs/SMOKE-TEST.md), [CHANGELOG](docs/CHANGELOG.md), [UI-UX-MODERNIZATION](docs/UI-UX-MODERNIZATION.md), [ART-ASSETS](docs/ART-ASSETS.md)

---

## Current Status (last updated 2026-05-21)

**Shipped:** MVP phases 1–5 + Spells (21-spell catalog, dice resolution) + Streaks/PRs (Blessing tiers, 1.5× PR XP) + Subclasses (6, level-10 unlock) + Profile analytics + R1 streak boost transparency in victory modal + R4-StageB `logActivity` Cloud Function (server-side daily-cap enforcement, mastery writes) + R4-StageC restore migration (HP/Stamina/Magic capped at formula-derived max server-side) + CI Firestore rules auto-deploy. Code-audit sweeps to 10/10 — full architecture contract (lib wrappers for Firestore/Auth/Cloud Functions via `src/lib/{auth,functions,fetchPlayerData,characterData,activityData,questData,inventoryData,combatData,errors}.ts`), Firestore field normalizers (safe defaults for post-MVP schema fields), store-first reads on stats page, parallel equipment writes in `awardLoot`, combat `useMemo` hoisting, `useCharacter` 30 s TTL with `force` bypass, stat-alloc two-click confirmation, auth form a11y (`id`/`htmlFor`/`autoComplete`), `rotationExpiresAt()`, `(uid, loggedAt DESC)` Firestore index deployed, `rewardedXp`/`rewardedGold` stamped at quest claim, `legendaryDryStreak` Firestore rule validation, Cloud Functions vitest suite, Playwright E2E smoke suite (14 tests), CI updated with functions tests + E2E steps + combined `firestore:rules,indexes` auto-deploy, stats page analytics dashboard (stacked XP chart, Battles Won card, error state, 1000-log limit). **Dungeons** — 4-tier multi-room runs (Goblin Caves/Spider Lair/Dark Sanctum/Dragon's Keep), seeded weekly layouts, stat-check/rest/boss rooms, enrage mechanics, venom DoT, 12 exclusive items, legendary lockout, `claimDungeonRun` CF for atomic rewards. **Achievements** — 6 dungeon badges (Initiate, 4 tier clears, Legendary Haul), gold rewards awarded atomically inside `claimDungeonRun` CF transaction (no race window), parity-tested CF copy, achievement gold breakdown in victory screen, profile badge gallery.

**Active focus:** Balance & engine fixes — high-value, small-to-medium effort items that sharpen the core game loop before adding new features.

**Next priorities (post-MVP backlog, prioritized):**

### Balance & engine fixes (from game-systems-audit spec — fix before adding features)

- ~~**P0-1** — Unify monster counter-attack formula~~ — verified already flat (`monster.attack − effectivePlayerDef`); no change needed
- ~~**P0-2** — Monster XP scaling cliff at level 10~~ — shipped: `monsterXpScaling(playerLevel, monsterLevel)` adds +8%/level over the monster for top-tier (level ≥ 8) monsters, capped at 2.0×
- **P0-3** — Daily combat XP cap / diminishing returns: prevent farm loops after ~10 battles/day; M effort
- ~~**P1-1** — Steepen quest XP scaler~~ — shipped: `0.4 + 0.6·√l` (was `0.6 + 0.4·√l`); level-10 lifts 1.86× → 2.30×
- ~~**P1-2** — Raise Blessed tier streak XP multiplier 1.25× → 1.50×~~ — shipped
- ~~**P1-3** — Gold endgame sinks~~ — shipped: 100g quest reroll mechanic on every active QuestCard (excludes currently-held questDefIds for genuine variety); dungeon entry fees verified already deducted
- ~~**P1-4** — Fizzle stamina refund~~ — shipped: `COMBAT.FIZZLE_STAMINA_REFUND = 5` returned on failed ability roll
- ~~**P1-5** — Add level-9 monster (Lich King)~~ — shipped: HP 150 / atk 28 / def 9 / xp 220 / gold 110 with necromancer loot table
- **P1-6** — Dungeon resource persistence: HP/Stamina/Magic carry between rooms (currently reset); L effort
- ~~**P2-1** — Mastery linked-stat hint on activity log form~~ — shipped: inline indigo callout shows the activity → stat mapping for workout / run / steps tabs
- ~~**P2-2** — Wizard starting stats~~ — shipped: starting health 6 → 8
- **P2-3** — Activity cap proximity indicator on the log form (e.g., "68% of daily cap used"); M effort
- ~~**P2-4** — Quest reroll mechanic~~ — shipped alongside P1-3 (100g per reroll, excludes held questDefIds). Quest pool expansion deferred — current pool (28 daily / 14 weekly) already supports variety.

### Feature backlog (dependency order — each unlocks the next)

1. **Achievements page** — `/character/achievements` full catalog with locked/unlocked states (badge gallery exists on profile; this adds the dedicated view with descriptions and progress hints)
2. **Reputation / Wanted Board** — foundation currency for all social/endgame features; daily bounties from the Wanted Board, Reputation tiers with stat bonuses; spec: `2026-05-17-future-features-roadmap-design.md`
3. **Champions** — 10-champion roster, dungeon deployment, injury/recovery system, 7 archetypes (Warrior/Mage/Rogue/Ranger/Paladin/Necromancer/Bard), pip-dot cooldown UI; spec: `2026-05-17-champions-reputation-streaks-design.md`; requires Reputation
4. **Guilds** — level-15 unlock, activity-aligned XP drip, rank milestones, exclusive gear; requires Reputation
5. **Pets** — milestone/birthday unlock, 3 active slots, passive+active abilities scaled by rarity; requires Reputation/Champions groundwork
6. **Monthly NPCs** — 6 rotating NPCs with seeded challenge pools, permanent expiry after each month, level/reputation gates; requires Champions + Reputation
7. **Raids** — bi-weekly events, 5-day streak gate, 2+ champions required, god-tier loot, streak makeup mechanics; requires Champions + Guilds
8. **Territory / Map** — GPS-based zone claiming, PvP disputes with 3-day response window; long-horizon feature, requires all above
9. **Prestige / Ascension** — reset for permanent bonuses; design TBD (no spec yet)
10. **PWA** — installable mobile experience (no spec yet; can land independently)
11. **Apple Health integration** — auto-import workouts (no spec yet; can land independently)
12. **Leaderboards** — compare with other users (no spec yet; requires user growth)

**Update protocol:** when a feature ships, move it from "Next" to "Shipped", bump the date, and append an entry to [docs/CHANGELOG.md](docs/CHANGELOG.md). This section in CLAUDE.md is the **canonical** status snapshot — `memory/project_state.md` no longer tracks status, only deep implementation details.

---

## How to Work

**Commands** (run from repo root):

- `npm run dev` — start dev server on `http://localhost:3000`
- `npm run typecheck` — `tsc --noEmit`. Fast TS-only check
- `npm run lint` — ESLint check
- `npm test` — `vitest run` (pure game-logic unit tests in `src/lib/gameLogic/__tests__/`)
- `npm run test:watch` — vitest in watch mode while developing
- `npm run test:coverage` — coverage report via `@vitest/coverage-v8`
- `npm run build` — production build. Catches everything above + build-time issues
- `npm run start` — serve the built output
- `npm run test:rules` — Firestore security-rules tests (requires Firebase emulator). Run via: `npx firebase emulators:exec --only firestore --project demo-fitness-rpg "npm run test:rules"`. **Java 11+ must be on `PATH`** — the emulator is a JVM process. Not needed for any other dev command.

**Runtime:** CI runs on Node 24. Node 20/22 still work locally but are not tested in CI — prefer Node 24 to match.

**Verification:**

- Unit tests cover pure game logic (combat, spells, xp). UI / behavior changes still must be verified manually in the browser — golden path _and_ edge cases — since there's no E2E layer
- New game-logic functions in `src/lib/gameLogic/` should ship with vitest tests when feasible
- Before opening a PR: hooks (`typecheck` + `lint` + `vitest run`) pass + manual browser verification of any UI/UX change
- CI runs the same checks via `.github/workflows/` on every push

**Firebase:** live project `fitness-rpg-claude`. No emulator setup; dev hits live Firestore. Be intentional about test data — it's real.

**Cloud Functions runtime:** `functions/package.json` pins `"node": "22"` — Firebase Cloud Functions does not yet support Node 24 in production (Node 22 is the current max). This intentionally lags behind the CI runtime (Node 24). Do not bump the functions engine version without first confirming Firebase support.

**EBADENGINE warning:** running `npm install` inside `functions/` on Node 24 prints `npm warn EBADENGINE … required: { node: '22' }`. This is expected — the engine pin is for the Firebase production runtime, not the local development environment. The warning is harmless and can be ignored.

**Changelog:** when a meaningful change ships on `master`, append an entry to [docs/CHANGELOG.md](docs/CHANGELOG.md). Skip trivial (typos, comment-only). Keep newest-first.

---

## Development Partner Role

You are a **senior full-stack engineer and game systems designer** co-creating this product. Your job is not to blindly execute — it is to co-create, challenge, and elevate.

### Core Responsibilities

- Always aim for the best long-term solution, not the quickest fix
- Actively challenge assumptions, logic, and design decisions when something could be improved
- Think in terms of scalability, maintainability, and extensibility
- Balance engineering quality with engaging game design

---

## Code Quality Standards (MANDATORY)

- Produce clean, production-ready code — no placeholders or pseudo-code unless explicitly requested
- Follow consistent patterns across the entire codebase (naming, structure, hooks, state management)
- Prefer modular, reusable components and utilities
- Avoid duplication — abstract shared logic when appropriate
- No over-commenting — add a comment only when the WHY is non-obvious
- All code must be complete and directly usable
- When modifying a file, return the FULL updated file

### Naming Conventions

- Components: `PascalCase`
- Hooks: `useXxx`
- Utilities: `camelCase`
- Types/interfaces: `PascalCase`, prefixed with `I` for interfaces where ambiguous
- Zustand stores: `useXxxStore`
- Firebase collections: `camelCase` plural (e.g., `characters`, `activities`)

---

## UI / UX & Design Consistency

- Maintain the fitness + fantasy RPG aesthetic throughout
- Design should feel like a **game**, not a dashboard
- Use clear hierarchy, spacing, and alignment
- Required game UI patterns:
  - Progression feedback: XP bars, level indicators, stat numbers
  - Visual rewards: rarity color system, icons, micro-animations
  - Clear affordances: button states, loading states, feedback toasts
- Rarity color scale: Common (gray) → Uncommon (green) → Rare (blue) → Epic (purple) → Legendary (orange/gold)

---

## Game Design Principles

Think like a game designer, not just a developer. When adding any feature, evaluate:

1. **Player motivation** — why does this feel rewarding?
2. **Progression loops** — short-term (daily) vs long-term (seasonal) goals
3. **Replayability** — does it stay engaging after week 1?
4. **Behavioral alignment** — does it reinforce real fitness habits?

Core game systems to keep internally consistent:

- XP & leveling curve
- Quest difficulty and reward balance
- Gear stat scaling with player level
- Combat encounter scaling

---

## Architecture & Scalability

- Separation of concerns: UI layer → hook layer → store layer → Firebase layer
- Data models must support future features (multiplayer, leaderboards, guilds, seasons)
- Firebase reads/writes go through utility functions in `src/lib/`, never directly from components
- Zustand stores are the single source of truth for game state; Firebase is persistence
- Avoid client-side secrets — all sensitive logic goes in Firebase Security Rules or server actions

---

## Collaboration Style

- **Do NOT blindly agree** — push back when needed
- If an idea is flawed, explain why and offer a better alternative
- When appropriate, offer 2–3 approaches with tradeoffs
- Ask clarifying questions when it improves the outcome

---

## Git Workflow

### Commit messages (imperative prose)

- Subject ≤ 50 characters, imperative mood, no trailing period
  - Good: `Add streak loot multiplier`, `Fix awardMastery stat overflow`
  - Bad: `Added streak system.`, `Updates and fixes`
- Blank line + body for any commit beyond a one-line trivial change
- Body explains _why_, not _what_ (the diff shows what)
- Always include `Co-Authored-By: Claude <model> <noreply@anthropic.com>` when Claude wrote or edited code

### Branching

- Claude worktree branches use auto-generated names — fine, treat them as disposable
- Human-initiated branches: `feat/<topic>`, `fix/<topic>`, `refactor/<topic>`, `chore/<topic>`
- Always branch from latest `master`

### Merging

- **Squash-merge via GitHub PR.** One clean commit per PR on master
- The PR title becomes the squash commit subject — PR titles must follow the commit-message rules above
- After a PR merges: delete the local branch and remove the worktree (`git worktree remove <path>`). Don't let merged branches accumulate

### Git hooks (husky + lint-staged)

- **pre-commit:** runs `lint-staged` (ESLint on staged `.ts`/`.tsx`) + `npm run typecheck` (project-wide) + `npm test` (vitest unit tests). Blocks commits that fail type, lint, or tests
- **pre-push:** blocks direct pushes to `master` (use PRs). Bypass in a true emergency only: `HUSKY=0 git push ...`
- Hooks activate via the `prepare` script — they install on every `npm install`. If a fresh clone's hooks aren't firing, re-run `npm install`

### DO NOT

- Never commit `.env.local` or any file matching `.env*.local`
- Never commit `.claude/settings.local.json` (gitignored — keep it that way)
- Never call Firestore directly from React components — go through `src/lib/` utilities or Zustand store actions
- Never bypass Firestore security rules client-side
- Never use `--no-verify`, `git push --force` to a shared branch, or `git reset --hard` over uncommitted work

---

## Output Format

Every substantive response should end with two sections:

### Next-Level Suggestions

Ideas to improve the feature or system further.

### Potential Risks / Gaps

Things that might break, scale poorly, or reduce player engagement.

---

## Available Sub-Agents (via `/agent`)

| Agent               | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| `game-designer`     | Balance, mechanics, progression, player psychology       |
| `systems-architect` | Data models, Firebase schema, scalability review         |
| `ui-critic`         | Visual consistency, game feel, UX patterns               |
| `code-reviewer`     | Pattern consistency, anti-patterns, refactor suggestions |

## MCP / Tool Usage

Pick the right tool the first time — don't fall back to general-purpose tools when a connector is wired.

| Task                                                | Use this                                       | Don't use                               |
| --------------------------------------------------- | ---------------------------------------------- | --------------------------------------- |
| Library docs (Next.js, Firebase, Zustand, Recharts) | `context7` plugin (`query-docs`)               | WebFetch, training-data recall          |
| Querying live Firestore data / Auth users           | Firebase MCP                                   | `firebase` CLI shell-out                |
| Reading deployed Firestore security rules           | Firebase MCP                                   | `firebase firestore:rules:get`          |
| Ad-hoc UI verification after a code change          | `Claude Preview` (`preview_*`)                 | asking user to "test it in the browser" |
| Authoring E2E / regression tests in `tests/e2e/`    | `playwright` plugin (`browser_*`)              | Claude Preview                          |
| GitHub PR / issue / CI ops                          | `github` plugin / `gh` CLI                     | manual git commands for PR work         |
| Searching past Claude sessions for context          | `ccd_session_mgmt__search_session_transcripts` | rereading old chats by hand             |

**Firestore safety:** Firebase MCP can hit the live `fitness-rpg-claude` project. Default to read-only queries. Confirm before any write/delete against production data — CLAUDE.md's "be intentional about test data" rule applies double here.

## Available Slash Commands

| Command          | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `/game-review`   | Full game design audit of a feature      |
| `/code-audit`    | Code quality + pattern consistency check |
| `/balance-check` | XP/reward/progression balance analysis   |
| `/schema-review` | Firestore data model review              |

# FitQuest Changelog

Append a new entry whenever a feature ships or a meaningful change lands on `master`. Newest first.

**Format:**

```
## YYYY-MM-DD — <short title>
- What changed (1–3 bullets)
- Why (one line, when not obvious)
```

Skip trivial: typo fixes, comment-only changes, dependency bumps without behavior change.

---

## 2026-05-08 — R4-StageC restore migration + CI Firestore rules auto-deploy

- **R4-StageC:** Moved HP/Stamina/Magic restore writes from client into the `logActivity` Cloud Function. Function now computes the formula-derived resource cap (via a minimal `GEAR_STAT_BONUSES` lookup in `functions/src/gameLogic/combat.ts`) and writes `currentHp/Stamina/Magic` atomically with the activity log. Client receives `restored.{resourceType, newValue, amount}` and mirrors it to Zustand via new `applyRestoreLocal` store action — zero client Firestore write for restores.
- **CI:** Added "Deploy Firestore rules" step to `ci.yml` — runs after Build on `master` push only, skipped on PRs. Authenticates via `FIREBASE_TOKEN` secret. `firebase-tools` added as devDependency so no global install is needed in CI.
- Why: closes the last client-honesty gap in activity logging (restore amounts were capped at the Firestore rule ceiling of 2000, not the formula-derived max). Rules drift (merged but not deployed) is now closed automatically.

## 2026-05-08 — Cloud Function activity logging + security hardening

- **R4-StageB:** Introduced `logActivity` Firebase Cloud Function (`functions/src/index.ts`) that owns the authoritative write sequence for all activity submissions — server-side daily-cap aggregate query, `activityLogs` doc write (with `id` + `rewardEligible` fields), and mastery milestone stat award. Eliminates the client-honesty gap where cap enforcement was bypassable.
- **ActivityLogForm migration:** Replaced direct `addDoc` + `awardMastery` calls with a single `httpsCallable`. Quest-progress and streak writes demoted to fire-and-forget; explicit error toast on function failure. `applyMasteryLocal` store action added for zero-roundtrip local state sync.
- **R1:** Victory modal now shows `🔥 ×N.NN streak` below XP when the streak multiplier is active, making the boost composition visible to the player.
- **Infrastructure:** `firestore.indexes.json` added (composite index `(uid, type, loggedAt)` on `activityLogs`); `firebase.json` wired to it; `deploy:prod` npm script enforces index-before-function deploy ordering; `validate-firestore-indexes.mjs` script + CI step catches index schema drift before deploy.
- **CI:** Added "Validate Firestore indexes" and "Typecheck Cloud Functions" steps to `ci.yml`; functions package (`functions/`) is now type-checked on every CI run.
- **Tests:** Added `constants.test.ts` (direct coverage of `isMasteryMilestone` + `nextMasteryMilestone`) and `activityCaps-parity.test.ts` (mechanical drift detection between `src/` and `functions/src/` copies). Suite grows from 248 → 269 passing tests across 14 files.
- **Cleanup:** Removed dead `awardMastery` store action (replaced by the Cloud Function + `applyMasteryLocal`).

## 2026-05-04 — Documentation refresh

- Added `docs/ARCHITECTURE.md` (layered architecture, folder map, route reference, Mermaid data-flow diagram for activity logging)
- Added `docs/FIRESTORE.md` (per-collection schemas + verbatim validation rules from `firestore.rules`, including the why behind each constraint)
- Added `docs/CI.md` (GitHub Actions workflow, husky hooks, Dependabot, action SHA-pinning policy)
- Added `docs/GAME-LOGIC.md` (reference for every export under `src/lib/gameLogic/*.ts`)
- Expanded `docs/SECURITY-SETUP.md` with a Remediations Log linking each shipped hardening to its PR/commit
- Added Documentation index sections to `README.md` and `CLAUDE.md`
- Why: cover the architecture / Firestore / CI / security / game-logic surfaces that were only partially described in `README.md`, so future contributors and Claude sessions can navigate without re-reading source

## 2026-05-03 — Prettier, CI build, repo polish

- Added Prettier (`.prettierrc.json`, `.prettierignore`) and wired `eslint-config-prettier` into `.eslintrc.json` so ESLint/Prettier rules don't conflict
- New `npm run format` / `format:check` scripts; `lint-staged` now runs `prettier --write` on TS/JS/JSON/MD/CSS/YAML before commit
- Baseline `prettier --write .` pass across the repo (formatting-only, no logic changes)
- CI: added `Format check` step (`npm run format:check`) and `Build` step (`npm run build:ci`) — the build catches Next.js issues that typecheck misses
- New `.env.ci` (committed, dummy Firebase values) + `dotenv-cli` + `npm run build:ci` — reusable build env for CI and offline smoke tests; replaces inline env vars in `ci.yml`
- README: added CI status badge
- GitHub-side (no code changes): repo flipped to public, renamed `fitness-rpg-2.0` → `FitQuest`, master branch protection enabled requiring the `Typecheck, Lint, Test` check, repo description set, stale `claude/dreamy-clarke-9297ff` branch deleted
- Why: enforce consistent formatting automatically, surface build-time regressions in CI, and align repo identity with the project name

## 2026-05-03 — Workflow & instructions hardening

- Added `Current Status`, `How to Work`, `Git Workflow` sections to CLAUDE.md
- Created `.github/pull_request_template.md` with verification checklist + Next-Level / Risks sections
- Added `npm run typecheck` script and `husky` + `lint-staged` pre-commit (lint staged files + project-wide typecheck + `vitest run`) and pre-push (block direct push to master)
- Wired the existing vitest suite (3 files, 72 tests) into the local pre-commit gate so broken game logic can't be committed
- Fallout fixes surfaced by the new gate (master had silently broken state):
  - Added missing `.eslintrc.json` (`{ extends: "next/core-web-vitals" }`) — `npm run lint` was prompting interactively without one, which CI's lint step would have failed on too
  - Fixed pre-existing TS error in `combat.test.ts` (test passed `null` for non-nullable `EquippedGear` field — added explicit cast since the function handles null at runtime)
  - Renamed `useConsumable` → `consumeItem` at the inventory page call site to satisfy `react-hooks/rules-of-hooks` (Zustand action whose name collided with the hook-naming rule)
- Added Firebase admin/service-account file patterns to `.gitignore`
- Cleaned up 4 stale merged local branches and pruned remote refs
- Why: established sustainable git/PR conventions and made CLAUDE.md a complete onboarding doc for future Claude sessions

## 2026-05-03 — Type renames + correctness fixes + Firestore rules hardening

- Renamed types: `ItemEffect`→`ConsumableEffect`, `SpellMechanics`→`SpellConfig`, `SpellCombatEffect`→`SpellEffect`, `ABILITIES`→`CLASS_ABILITY_CATALOG`, `WEEKLY_QUESTS`→`WEEKLY_QUEST_POOL`, `attackType`→`attackMode`, `StreakTier.multiplier`→`StreakTier.lootDropMultiplier`
- `resetCharacter` now uses `playerMaxHp()` instead of a hardcoded HP formula
- `awardMastery` now clamps stat gains via `statCap()` to enforce the stat ceiling
- Firestore rules: field-level validation, level 1–100 cap, immutable `uid`/`class`/`createdAt`/`itemDefId`/`acquiredAt`, 10-minute server-time window on `activityLogs` (blocks backdated streak gaming), write-once `completedAt`/`claimedAt` on quests

## 2026-04-17 — Streaks, PRs, Subclasses

- Streak ("Blessing") system: 5 tiers (Focused → Blessed), multiplier on rare+ loot drops only
- Personal Records: per-activity-type all-time bests, 1.5× XP for breaking a PR
- Subclass system: 6 subclasses (2 per class), chosen at level 10, permanent passives wired into combat/spells/escape

## 2026-04-14 — Spells, abilities, MVP completion

- 21-spell catalog with dice-resolution mechanics (sum_gte, exact_value, pair, three_of_a_kind, straight) and effects (damage, heal, restoreStamina, stun, defenseBoost, bypassMonsterDef, lifestealPct)
- 6-dice class ability system (15 abilities across warrior/wizard/rogue)
- Magic resource (`currentMagic`) with persistence and level-up restore
- All 5 MVP phases verified complete

---

## Backlog (not started)

Tracked here so a fresh session can see what's next without cross-referencing CLAUDE.md.

- **Dungeons** — multi-room runs with escalating loot
- **Achievements** — milestone badges, one-time rewards
- **Prestige / Ascension** — reset for permanent bonuses
- **PWA** — installable mobile experience
- **Apple Health integration** — auto-import workouts
- **Leaderboards** — compare with other users
- **Firebase emulators** — local Firestore + Auth for dev (priority bumps once we touch destructive migrations or multiplayer)

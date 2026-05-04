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

## 2026-05-03 — Workflow & instructions hardening
- Added `Current Status`, `How to Work`, `Git Workflow` sections to CLAUDE.md
- Created `.github/pull_request_template.md` with verification checklist + Next-Level / Risks sections
- Added `npm run typecheck` script and `husky` + `lint-staged` pre-commit (lint staged files + project-wide typecheck) and pre-push (block direct push to master)
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

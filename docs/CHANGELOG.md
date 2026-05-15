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

## 2026-05-15 — Weekly rotation purity, UTC boundary fixes, quest staleness

- `getWeeklyPick` now accepts an optional `weekKey` ('YYYY-WW') — same pure/testable pattern as `getDailyPick`. `getWeekSeed()` fallback switched from local to UTC for consistency.
- `rotation.ts`: added `rotationExpiresAt()` returning next UTC midnight. Shop and combat countdown displays now use this (accurate: rotation actually changes at UTC midnight). `dailyExpiresAt()` kept as local-midnight for quest expiry so quests don't expire mid-evening.
- `questStore.fetchAndAssignQuests` now accepts optional `dateKey?` — passes it through to `getDailyPick` for a clock-free daily pick.
- `dashboard/page.tsx`: imports `useTodayKey`; passes `todayKey` to `fetchAndAssignQuests` and adds it to the `useEffect` dep array — quest list re-fetches automatically when the UTC day rolls over and the tab is next focused.
- All `getWeeklyPick` tests rewritten to use explicit `weekKey` — environment-agnostic, no fake timers. (266 tests total, +2 from weekly parity.)

## 2026-05-15 — Rotation purity, SpellCard memo, Firestore index deploy

- `getDailyPick` now accepts an optional `dateKey` ('YYYY-MM-DD') — when passed, the internal clock is never read, making the function pure and testable. Fallback updated to UTC (aligns with server-side `logActivity` day boundary). Existing rotation tests rewritten to pass explicit keys (no fake timers, environment-agnostic).
- `combat/page.tsx` + `shop/page.tsx`: pass `todayKey` directly to `getDailyPick`; `useMemo` dep array is now accurate and `eslint-disable` comments are removed.
- `SpellCard`: wrapped in `React.memo` — prevents re-renders in shop/combat spell lists when unrelated parent state (e.g. `buying`) changes for a different item.
- Firestore `(uid, loggedAt DESC)` index deployed via `firebase deploy --only firestore:indexes`.

## 2026-05-15 — Code quality sweep: Consider items + risks/gaps

**Consider / Next-Level (from code audit — third pass):**

- `ErrorBanner`: Retry button replaced with the shared `Button` component (`variant="danger" size="sm"`); bespoke inline styles removed.
- `SpellCard`: `restoreStamina` effect tag emoji changed from `⚡` (conflict with damage) to `💛`. `buildEffectTags` wrapped in `useMemo` hoisted before the early-return guard.
- `combat/page.tsx` + `shop/page.tsx`: replaced inline `new Date().toISOString().slice(0,10)` + `eslint-disable` comment with `useTodayKey()` — rotation now auto-refreshes on `visibilitychange` after midnight without a hard reload.
- `src/hooks/useTodayKey.ts` (new): stable UTC date-key hook with `visibilitychange` listener; eliminates the stale-rotation risk for tabs left open overnight.
- `CombatEffects.tsx`: removed backward-compat re-export of `useCombatBursts`; `combat/page.tsx` now imports from `@/hooks/useCombatBursts` directly.
- `stats/page.tsx` `ActivityBreakdown`: pre-compute `maxXp` outside `.map` to eliminate O(n²) `Math.max` spread on every row render.
- `dashboard/page.tsx`: `gearBonuses` and `maxStamina` wrapped in `useMemo` and hoisted before early returns.

## 2026-05-15 — Code quality sweep: Must Fix + Should Fix audit items

**Must Fix (from code audit):**

- `useRecentActivity`: replaced full-collection scan with `orderBy('loggedAt', 'desc') + limit(count)` pushed to Firestore; removed client-side sort/slice. Added `(uid, loggedAt DESC)` composite index to `firestore.indexes.json`.
- `stats/page.tsx`: extracted three inline `getDocs` calls into `src/lib/fetchPlayerData.ts` utilities (`fetchActivityLogs`, `fetchActiveQuests`, `fetchInventoryItems`), restoring the architecture contract that Firebase reads never appear directly in components.
- `Modal.tsx`: added focus management on open (first focusable element receives focus); replaced semantically-incorrect `<button>` backdrop with `<div role="presentation" aria-hidden="true">`.
- `inventoryStore.buyItem`: replaced two non-atomic Firestore writes (inventory + gold) with a single `runTransaction` — item and gold deduction are now atomic. Shop page no longer calls `awardGold` separately.

**Should Fix (from code audit):**

- `functions/src/gameLogic/activityCaps.ts`: added `ACTIVITY_AMOUNT_MAX` export; `index.ts` now imports it instead of declaring a local copy.
- `functions/src/index.ts`: `startOfDayMs` now calls `new Date()` once; simplified redundant double-guard in `needsChar`.
- `src/lib/gameLogic/constants.ts`: added `MASTERY_ACTIVITIES` and `RESTORE_ACTIVITIES` exports; `ActivityLogForm` now imports them instead of re-declaring locally.
- `src/types/cloudFunctions.ts` (new): canonical `LogActivityInput`/`LogActivityResult` types; `ActivityLogForm` now imports from here instead of duplicating.
- `src/hooks/useCombatBursts.ts` (new): extracted `useCombatBursts` hook and `DamageBurst` type out of `CombatEffects.tsx`; `CombatEffects` re-exports for backward compat.
- `useInventoryNewMarkers`: `markAllSeen` wrapped in `useCallback` to prevent inventory-page `useEffect` from re-firing every render.
- `dashboard/page.tsx`: replaced `useCharacterStore.getState()` in JSX with a proper selector (`fetchCharacter`).
- `inventory/page.tsx`: replaced three separate `filter→map→filter` passes over `items` with a single `useMemo` partition.
- `combat/page.tsx` + `shop/page.tsx`: `DAILY_MONSTERS`/`DAILY_GEAR` moved from module-level to `useMemo` keyed on current UTC date — rotation now refreshes on the next interaction after midnight instead of requiring a hard refresh.
- `stats/page.tsx`: removed local `ACTIVITY_LABELS` map; now reads `ACTIVITY_DEFINITIONS[type].label` directly.
- Parity tests: added `src/lib/gameLogic/__tests__/constants-parity.test.ts` covering RESTORE rates and GEAR_STAT_BONUSES drift between `src/` and `functions/` copies (6 new tests).

## 2026-05-09 — Dependabot auto-merge + functions/ grouping + smoke-test doc

- **Dependabot grouping:** added `functions/` as a second `npm` ecosystem in `.github/dependabot.yml` so Cloud Functions dep bumps don't share a PR with the root manifest. Same patch+minor grouping + no-major rules as the root config.
- **Auto-merge:** new `.github/workflows/dependabot-auto-merge.yml` enables GitHub's auto-merge on Dependabot PRs that are NOT `version-update:semver-major`. Once the required `Typecheck, Lint, Test` check goes green, GitHub squash-merges automatically. Majors still require manual review (filtered by both the dependabot config and a belt-and-suspenders metadata gate in the workflow).
- **`docs/SMOKE-TEST.md`:** documents the four-step manual smoke pattern that doesn't need test credentials (`/login` renders → invalid creds round-trip Firebase → `/dashboard` redirects → `/register` renders). Used to verify the Next 15 + firebase 12.13 bumps; safe to reuse on any future framework/middleware-affecting bump.
- **`docs/CI.md`:** updated Dependabot section to reflect three ecosystems and document the auto-merge workflow.
- **Prerequisite for auto-merge to actually fire:** Settings → General → Pull Requests → **Allow auto-merge** must be enabled on the repo (one-time toggle).

## 2026-05-09 — Migrate `next lint` → ESLint CLI (ESLint 9 + flat config)

- `next lint` is deprecated in Next.js 15 and removed in Next.js 16. Replaced with the standalone ESLint CLI: `lint` script is now `eslint .` and `lint-staged` calls `eslint --max-warnings=0 --no-warn-ignored`.
- Bumped `eslint` from `^8` to `^9`. Migrated config from `.eslintrc.json` (legacy) to `eslint.config.mjs` (flat config).
- `eslint-config-next@15.5.x` is still a legacy (eslintrc-style) package, so the flat config wraps it via `@eslint/eslintrc`'s `FlatCompat`. When eslint-config-next ships native flat-config support, drop the FlatCompat shim and import directly.
- Added explicit `ignores` block (`.next/`, `node_modules/`, `out/`, `functions/lib|node_modules/`, `coverage/`) since flat config doesn't read `.eslintignore`.
- Why: removes the deprecation warning printed on every `npm run lint`, unblocks the eventual Next 16 upgrade, and aligns with the ESLint 9 ecosystem direction.

## 2026-05-09 — Add non-blocking npm audit step to CI

- Added two `continue-on-error: true` steps to `.github/workflows/ci.yml` that run `npm audit --audit-level=high` against the root and `functions/` manifests after install.
- Why: surfaces newly-published high-severity advisories at PR-check time without waiting for the next Dependabot scan, but doesn't block merges (so a fresh advisory on a transitive dev dep doesn't paralyze unrelated work). When the warning fires, the response workflow lives in `docs/SECURITY-SETUP.md` § 8.

## 2026-05-08 — Pin patched transitive deps via npm overrides

- Added `overrides` block to root `package.json` pinning `tar@^7.5.11`, `glob@^10.5.0`, `@tootallnate/once@^3.0.1`, `postcss@^8.5.10`. Bumped direct `postcss` devDep from `^8` to `^8.5.10` so the override doesn't conflict (npm errors `EOVERRIDE` if a direct-dep range is incompatible).
- Added `overrides` block to `functions/package.json` pinning `@tootallnate/once@^3.0.1` (the one alert in the Cloud Functions tree).
- Closes 9 Dependabot alerts in the firebase-tools and firebase-admin transitive trees: 6× `tar` (GHSA-9ppj-qmqm-q256, GHSA-qffp-2rhf-9h96, GHSA-83g3-92jg-28cx, GHSA-34x7-hfp2-rc4v, GHSA-r6q2-hw4h-h46w, GHSA-8qq5-rm4j-mr97), `glob` (GHSA-5j98-mcp5-4vw2), `postcss` bundled inside next (GHSA-qx2v-qp2m-jg93), `@tootallnate/once` × 2 (GHSA-vpq2-c234-7xj6).
- Why: avoids the firebase-tools 13 → 15 (and firebase-admin 12 → 13) major bumps until those upgrades can be validated independently against the deploy pipeline. All dev-only chains — zero runtime code change. Both `npm audit` outputs (root and `functions/`) now report 0 vulnerabilities. Documented the workflow in `docs/SECURITY-SETUP.md` § 8.

## 2026-05-08 — Next.js 14 → 15 security upgrade

- Bumped `next` and `eslint-config-next` from `^14.2.3` to `^15.5.18`.
- Added `target: "ES2017"` to `tsconfig.json` (required by Next 15 for top-level await support).
- Closes 5 GitHub advisories on `next`: GHSA-h25m-26qc-wcjf (HTTP request deserialization → DoS), GHSA-q4gf-8mx6-v5v3 (DoS via Server Components), GHSA-9g9p-9gw9-jx7f (Image Optimizer remotePatterns DoS), GHSA-ggv3-7p47-pfv8 (HTTP request smuggling in rewrites), GHSA-3x4c-7xq6-9pq8 (next/image disk cache exhaustion).
- Why: the 14.x line is unmaintained for these CVEs; 15.5.x patches all of them. App Router code required no migration — no `cookies()` / `headers()` / `params` / `searchParams` async-API surface in use, no route handlers, no server-side `fetch()`. `next.config.mjs`, `src/middleware.ts`, and CSP headers all unchanged.
- Note: `next lint` is now deprecated in favor of the ESLint CLI; will need a follow-up migration before Next 16.

## 2026-05-08 — Test coverage expansion + post-R4 cleanup

- **Cleanup (PR #22):** Removed 48 lines of dead `restoreHp` / `restoreStamina` / `restoreMagic` store actions from `characterStore.ts` — orphaned after R4-StageC moved restores to the Cloud Function. Added `gearBonuses-parity.test.ts` to prevent drift between `ITEM_CATALOG` (src) and the minimal `GEAR_STAT_BONUSES` lookup (functions). Fixed stale `awardMastery` reference in `docs/GAME-LOGIC.md` and added missing `activityCaps.ts` section.
- **Test coverage (PRs #23 + #24):** Added `abilities.test.ts` (detectPattern precedence + getAbility catalog), `rotation.test.ts` (deterministic seeded picks via `vi.useFakeTimers`), `stats.test.ts` (caps + restore math), and `passives.test.ts` (all 15 exports across 6 subclasses, including Divine Aegis with mocked `Math.random`). Every logic module under `src/lib/gameLogic/` now has tests.
- **Repo hygiene:** Enabled "Automatically delete head branches" on the GitHub repo so future merged PR branches are cleaned up automatically.
- Why: closes the test-coverage and dead-code gaps before Dungeons work begins, so any new monster mechanics that touch existing logic surface as test failures rather than silent regressions.

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

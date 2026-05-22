# FitQuest Changelog

Append a new entry whenever a feature ships or a meaningful change lands on `master`. Newest first.

**Format:**

```markdown
## YYYY-MM-DD — <short title>

- What changed (1–3 bullets)
- Why (one line, when not obvious)
```

Skip trivial: typo fixes, comment-only changes, dependency bumps without behavior change.

---

## 2026-05-22 — Dark mode global (UI pass 4 — first large investment)

- Tailwind `darkMode: 'class'` enabled. Theme toggle (`src/components/ui/ThemeToggle.tsx`) backed by `useTheme` hook (`src/hooks/useTheme.ts`) that persists to `fitquest-theme` localStorage and falls back to `prefers-color-scheme`. No-flash bootstrap script in `<html>` head sets the class before React hydrates.
- Theme toggle wired into the game header (icon variant, hidden on small screens) and a new Appearance section in `/profile` (full label variant).
- Sonner toaster now follows the active theme via `useTheme()`.
- All shared primitives got `dark:` variants: `Card` (default / hero / highlight / legendary / flat — all themed), `Heading`, `EmptyState`, `Skeleton` (light tone now self-themes), `Modal`, `Button`, `XPBar`, `GoldDisplay`.
- Game layout shell: header, sidebar, mobile bottom-nav, avatar pill, sign-out button — all theme-aware with proper backdrop-blur in dark mode.
- Auth layout + login + register: backgrounds, inputs, labels, gradient buttons, links — all `dark:` variants. Login/register submit buttons also got the indigo→violet gradient + active-press scale.
- Every game screen swept: dashboard, character, activities, combat, quests, inventory, shop, stats, profile. Plus character-creation. Used a Python regex sweep that's careful about modifier prefixes (rewrote `hover:text-gray-X dark:text-slate-Y` → `hover:text-gray-X dark:hover:text-slate-Y` where appropriate).
- Recharts in `/stats` is now theme-aware via `useChartColors()` — grid lines, axis ticks, tooltip background/border/text all swap with the theme. Activity colors stay constant (semantic).
- `globals.css` scrollbar styled for dark mode.
- Dungeons keep their always-dark fantasy aesthetic regardless of toggle (their own `bg-slate-900` overrides the layout's themed background).

## 2026-05-22 — UI/UX modernization medium efforts (pass 3 — glass, shimmer, Card sweep)

- Glass / depth pass: top header, sidebar, and mobile bottom-nav now use `backdrop-blur-xl backdrop-saturate-150` over `bg-white/70-80` with subtle shadow. `Card` hero variant got decorative blur orbs (indigo + violet radial gradients) and stronger glass treatment. `BattleResultsModal` got the same orb pattern + `backdrop-blur-md` backdrop. Cinematic `Modal` variant uses a stronger backdrop blur than the default.
- New `Skeleton` primitive (`src/components/ui/Skeleton.tsx`) with `line | block | circle | card` shapes and `light | dark` tones. Uses an absolute `before:` pseudo-element with a translating gradient via the new `shimmer-sweep` keyframe in `globals.css`. `motion-reduce` collapses to a static block. Adopted on dashboard, character, inventory, quests, shop, stats, and dungeons (dark tone). Legendary loot in dungeon-run page also switched from `animate-pulse` to `animate-legendary-glow`.
- `Card` adoption sweep (15 of 22 inline-card sites migrated):
  - `EmptyState` now wraps `Card` internally.
  - Dashboard: hero + 3-column grid panels (Stats / Daily Quests / Recent Activity) + loading skeleton.
  - Activities: `ActivityLogForm` (main panel + result card), `ActivitySidePanel` (mastery + resources).
  - Profile: achievement gallery + settings sections.
  - Character: class bonuses + how-stats-work panels.
  - Inventory: gear loadout + spell loadout + consumable pack.
  - Stats: 5 KPI cards + `ChartCard` wrapper.
  - Combat: rewards-claimed summary card.
  - Remaining 6 combat sites are deeply nested in framer-motion wrappers; left for a follow-up sweep where a wider combat refactor can be more comprehensive.
- `ActivityLogForm` "Log Activity" + "Log Another Activity" buttons got the indigo→violet gradient + active-press scale.

## 2026-05-22 — UI/UX modernization medium efforts (pass 2)

- New `Card` primitive (`src/components/ui/Card.tsx`) with variants `default | hero | highlight | legendary | dark | flat` plus optional `interactive` hover lift. Adopted on dashboard hero + 3-column grid panels. Replaces `bg-white border border-gray-200 rounded-xl` repetition at the most-visible sites; the remaining ~30 inline card surfaces are queued for a follow-up sweep.
- New `fireConfetti(intensity)` helper (`src/lib/confetti.ts`) with `subtle | medium | celebration | legendary` presets — legendary uses a gold-heavy palette and 3 staggered bursts. Wired into level-up, battle victory (intensity scales with best loot rarity: subtle / celebration for epic / legendary for legendary), quest claim (subtle for daily, celebration for weekly), dungeon clear (legendary if legendary-eligible), achievement unlock, streak tier unlock, mastery milestone. All gated by document visibility + `prefers-reduced-motion`.
- `Modal` got a `feel="cinematic"` prop — spring physics with 0.8→1→overshoot for celebratory moments. `LevelUpCelebration` now uses it.
- `BattleResultsModal` loot list now staggers in with framer-motion (per-rarity tinted border + glow per item; legendaries get `animate-legendary-glow`).
- Quest claim button got a chest-opening shimmer-sweep on hover with a gradient + scale-on-press.
- `MonsterCard` got hover lift + scale/rotate on the emoji + gradient Fight button.
- `EmptyState` (previously dead code) now adopted on inventory and quests pages, and inlined on dashboard's recent-activity and daily-quests panels.
- `CharacterCard` rebuilt: class-themed gradient banner (red/violet/emerald for Warrior/Wizard/Rogue), ringed portrait frame, level chip in display font, rarity-tinted gear slot names with icons and empty-slot dashed borders.

## 2026-05-22 — UI/UX modernization quick wins (pass 1)

- Display font: paired Cinzel (headings) + Inter (body) via `next/font`, wired through `--font-cinzel` / `--font-inter` CSS variables and Tailwind's `font-display` / `font-sans`. All page H1s, the FitQuest wordmark, and the combat Victory/Defeat banners use the display face.
- Iconography: replaced OS-emoji nav glyphs in `src/app/(game)/layout.tsx` with Lucide icons (Home / Swords / ClipboardList / Skull / ScrollText / Backpack / Store / BarChart3) — first time `lucide-react` is actually imported in the codebase.
- Mobile bottom nav: all 8 nav items now visible (was `slice(0, 5)` — Inventory, Shop, Stats were unreachable on phones). Active state gets scale + accent bar + thicker stroke.
- Layout: `<main>` content now constrained to `max-w-7xl mx-auto` (stops dashboards stretching across 2560px monitors); `pb-20` on mobile so bottom-nav doesn't overlap content.
- Rarity treatment: `RARITY_CARD.glow` upgraded from barely-visible `shadow-*-100` to `shadow-lg shadow-*-500/40` (legendary gets `shadow-xl shadow-orange-500/50`). Non-spell gear cards in `inventory/page.tsx` and `shop/page.tsx` now respect `RARITY_CARD` border + top accent strip + glow. Legendary gear gets the new `animate-legendary-glow` keyframe.
- New `AnimatedNumber` component (`src/components/ui/AnimatedNumber.tsx`) — vanilla rAF easeOutCubic counter, respects `prefers-reduced-motion`. Used in `BattleResultsModal` and post-modal rewards summary.
- `GoldDisplay` self-tweens between values and pulse-scales on increase. `XPBar` flashes/glows for ~700ms when XP changes, with a one-pass shimmer sweep.
- Hover lifts (`hover:-translate-y-0.5 hover:shadow-lg`) added to dashboard quick-action cards, inventory items, shop gear.
- Cinematic polish: `BattleResultsModal` got gradient backdrop, drop-shadow ⚔️, animated XP/Gold counters, indigo-to-violet gradient claim button with active-press scale. Victory / Defeat / Escape banners use display font + uppercase wide-tracking + rarity-tinted shadows.
- New keyframes in `globals.css`: `fadeIn`, `shimmer`, `legendaryGlow`. All gated by `prefers-reduced-motion: reduce`.
- "NEW" pill upgraded from `animate-pulse` to gradient + ring + colored shadow.
- New roadmap doc: [docs/UI-UX-MODERNIZATION.md](UI-UX-MODERNIZATION.md). Tracks remaining quick wins (Card primitive adoption), medium efforts, and the larger investments (dark-mode global, design-token overhaul, combat scene redesign, sound design).

## 2026-05-21 — Doc accuracy sweep and E2E route coverage

- Fixed "Next.js 14" → "Next.js 15" in CLAUDE.md and ARCHITECTURE.md (package.json has been on v15 since PR #26).
- DEPLOYMENT.md: corrected step references (11 → 15/16), marked indexes as CI auto-deployed, added `--force` to functions deploy commands, fixed FIREBASE_TOKEN description.
- GAME-LOGIC.md: `MONSTER_CATALOG` note clarified — 10 entries but two at level 1 and no level 9 (Lich King is P1-5 backlog).
- E2E smoke suite: added 7 missing protected-route redirect tests (/character, /inventory, /shop, /profile, /combat/dungeons, /combat/dungeons/[tierId], /combat/dungeons/run). Total tests: 21.
- SMOKE-TEST.md: updated coverage claim from "nine" to the actual 12 routes now tested.

## 2026-05-21 — Achievement system hardening and victory screen polish

- Achievement award moved inside the `claimDungeonRun` Firestore transaction — gold and badge stamp are now atomic; a concurrent claim can no longer award the same badge twice.
- `logActivity` CF upgraded to `minInstances: 1` (matching `claimDungeonRun`) — eliminates cold-start delay on first daily log.
- Achievement helpers extracted to `functions/src/gameLogic/achievements.ts`; new `achievements-parity.test.ts` asserts `LEGENDARY_ITEM_IDS`, `ACHIEVEMENT_GOLD`, and `checkNewAchievements` stay in sync with the src copy. Test count: 368.
- `ClaimDungeonRunResult` gains `achievementGold: number`; victory screen Run Summary card shows a "Dungeon Xg + Achievements Yg" breakdown row when badges were earned.
- `deploy:prod` script and CI step 16 updated to pass `--force` for non-interactive `minInstances` billing confirmation.

## 2026-05-21 — Achievement gallery, flee feedback, a11y fixes

- Profile page: 2-col achievement badge grid showing all 6 dungeon badges (unlocked in indigo with gold-earned label; locked dimmed with lock icon). Header strip previews all emojis at a glance.
- Flee button flashes red for 700 ms on a failed attempt; caption below combat actions explains Agility mechanic.
- History row buttons: `aria-label` with tier/date/status/loot count; `aria-expanded` on rows with loot.

## 2026-05-21 — Dungeon polish pass 2: achievements, agility flee, loot preview

- **Achievements system (dungeon):** 6 badges (Initiate, 4 tier clears, Legendary Haul) with gold bonus rewards. Checked post-victory via `checkDungeonAchievements()`; unlocks fire `toastAchievement` toasts and write `achievements[]` to character doc. 11 vitest unit tests.
- **Agility-based flee:** replaced flat 20%-HP flee cost with `rollRunAway()` (existing arena formula — d10 + Agility bonus vs monster d10). Failed flee gives monster a free hit; success escapes with accumulated loot. Boss rooms still disallow flee.
- **Run history loot preview:** rows are now expandable; clicking a row with drops reveals each item with rarity badge.
- **Panel flash fix:** batched `fetchActiveRun` + `getRecentDungeonRuns` into `Promise.all`; resume banner and history section now appear in one render instead of sequentially.

## 2026-05-21 — Dungeon polish: level-up banner, flee, run history, warm CF

- Victory screen shows a LEVEL UP! banner when the claimDungeonRun CF returns `leveledUp: true`, holding before navigating so the player sees the moment.
- Flee button added to non-boss combat rooms: costs 20% max HP, claims all accumulated loot from previously cleared rooms and exits the run.
- Dungeon lobby shows a Recent Runs history panel (last 10 non-active runs).
- `claimDungeonRun` CF set to `minInstances: 1` — eliminates cold-start stall on the claim action.
- Added `uid + startedAt DESC` composite Firestore index for the history query.
- `abandonRun` store action now skips `finalizeDungeonRun` when CF has already closed the run.

## 2026-05-21 — Dungeons system shipped

- Added 4-tier dungeon system (Goblin Caves → Spider Lair → Dark Sanctum → Dragon's Keep) with seeded weekly layouts, stat-check rooms, rest rooms, boss encounters with enrage mechanics, and escalating loot tables.
- 12 dungeon-exclusive items (Epic/Legendary), venom DoT mechanic (Venomfang Bracer), boss enrage states, legendary lockout system.
- `claimDungeonRun` callable Cloud Function for atomic reward disbursement (XP, gold, inventory) with idempotency guard.
- Firestore: `dungeonRuns` collection with full security rules, composite index, XP delta cap raised to 2000 for Dragon's Keep boss rewards.
- New routes: `/combat/dungeons` lobby, `/combat/dungeons/[tierId]` entry, `/combat/dungeons/run` active run. Arena|Dungeons tab switcher with URL persistence on `/combat`.

## 2026-05-18 — Documentation sweep and remaining gap fixes

- `docs/CI.md`: added steps 5b (functions unit tests), 13-14 (Playwright install + E2E), corrected auto-deploy to combined `firestore:rules,indexes`, expanded regression table.
- `docs/ARCHITECTURE.md`: all six new `src/lib/` domain wrappers in folder map; `/stats` route description updated to reflect full analytics dashboard.
- `docs/FIRESTORE.md`: added `combatLogs` collection section; `rewardedXp`/`rewardedGold` and `legendaryDryStreak` in Character/ActiveQuest schemas; all three composite indexes; "Adding a post-MVP schema field" guide. Collection count corrected four→five.
- `docs/SMOKE-TEST.md`: noted Playwright E2E now automates steps 1-4 in CI.
- `CLAUDE.md`: bumped status date and expanded Shipped list.
- Fixed unused `isMasteryMilestone` import in `characterStore.ts`; added `.markdownlint.json` with `siblings_only` to suppress valid cross-section duplicate headings.

## 2026-05-17 — Close all 10/10 gaps: security, functions tests, E2E

- Firestore rules: added `legendaryDryStreak` validation to `isValidCharacterOptionals` (was unvalidated despite being written on every loot roll).
- Added `tests/rules/combatLogs.rules.test.ts`: 11 emulator tests covering read auth, owner create, cross-user deny, timestamp recency, field bounds, and immutability.
- Added `functions/src/__tests__/constants.test.ts`: 11 vitest unit tests for `isMasteryMilestone` and `statCap`; added vitest to functions devDependencies; CI now runs functions tests on every push.
- Added Playwright E2E smoke suite (`tests/e2e/smoke.test.ts`): 14 tests covering unauthenticated redirects for all protected routes, login page structure, a11y attributes, and register page navigation. Runs in CI with placeholder Firebase config via `webServer` integration.

## 2026-05-17 — Quest XP/gold accuracy, stats page improvements

- `questStore.claimReward`: compute scaled XP + gold before writing to Firestore and stamp `rewardedXp` / `rewardedGold` on the `activeQuest` doc. Stats page now reads these for accurate display (previously showed base definition values, undercounting for higher-level + streaking players).
- Stats page: added Battles Won overview card; error state (was silently swallowing Firestore failures leaving infinite loading); "Showing most recent 500 activity logs" note in all-time view.
- Firestore rules: `rewardedXp` / `rewardedGold` only writable during the `claimedAt` null→int transition, preventing post-claim forgery.
- CI: deploy step now includes `firestore:indexes` alongside `firestore:rules` on master push.
- Tests: added 13 unit tests for `normalizeActiveQuest` and `normalizeInventoryItem` normalizers.

## 2026-05-17 — Code-audit follow-up fixes

- Added try/catch/finally to `handleClaimRewards` in combat page; missing error boundary left the claim button permanently disabled on any write failure.
- Fixed Activity Breakdown: sort and bar width now use log count instead of `xpGained` (always 0 post-R4).
- Added `isRecentTimestamp` validation to `combatLogs` Firestore security rule (consistent with `activityLogs`).

## 2026-05-17 — XP chart enrichment and codebase fixes

- Replaced single-line XP chart with stacked BarChart (Quest XP indigo, Combat XP orange); introduced `combatLogs` Firestore collection written at claim-rewards time so combat XP is tracked per-day.
- Fixed post-R4 stats page showing 0 XP: overview card and chart now source XP from quest claims + combat logs instead of `activityLogs.xpGained`.
- Fixed TOCTOU race in `logActivity` Cloud Function: mastery count increment now runs in a `runTransaction` instead of a batch update, preventing two concurrent logs from both awarding the same milestone stat.
- Added `orderBy('loggedAt', 'desc'), limit(500)` to `fetchActivityLogs` to prevent unbounded Firestore reads.
- Added `src/lib/combatData.ts` (new lib wrapper for combatLogs), `src/lib/__tests__/fetchPlayerData.test.ts` (5 unit tests for `normalizeActivityLog`), Firestore security rule and composite index for `combatLogs`.

## 2026-05-17 — Post-MVP feature roadmap design docs

- Created `docs/superpowers/specs/2026-05-17-future-features-roadmap-design.md` — full design for Guilds, Pets, Dungeons, Raids, Champions, Wanted Board/Reputation, Monthly NPCs, and Territory/Map (long-horizon), ordered by dependency chain.
- Created `docs/superpowers/specs/2026-05-17-champions-reputation-streaks-design.md` — supplemental design covering Champion AI behavior (hybrid control, 7 archetypes with cooldowns), full 10-hero roster, 6-NPC roster with dynamic challenge pools, reputation dual-layer economy, raid streak makeup mechanics, cooldown pip-dot visualization, Mage burst UX, NPC gating table, Champion Firestore subcollection schema, and seeded monthly NPC challenge rotation.

---

## 2026-05-16 — Full code-audit sweep to 10/10 (final gaps)

- `src/lib/functions.ts`: extracted `logActivityFn` callable — `ActivityLogForm` no longer holds a Firebase SDK import directly, completing the architecture contract across all three Firebase surfaces (Firestore, Auth, Cloud Functions).
- `fetchPlayerData.ts`: replaced raw `as` casts with `normalizeActiveQuest` / `normalizeInventoryItem` / `normalizeActivityLog` helpers that apply safe field defaults (e.g. `progress ?? 0`, `completedAt ?? null`, `quantity ?? 1`). These normalizers are re-used in `inventoryStore` and `questStore`, eliminating silent `undefined`-as-typed-value bugs in old docs.
- `stats/page.tsx`: store-first reads — quests and inventory are read from the Zustand store snapshot via `getState()` on the stats page, falling back to Firestore only when the stores haven't been populated. Eliminates 2 of 3 Firestore reads on most visits.
- `inventoryStore.awardLoot`: split consumable (sequential, stacking-safe) and equipment (parallel `Promise.all`) paths. Equipment drops now write in one round-trip regardless of count — meaningful for future Dungeons multi-floor loot.
- Auth forms: `id`/`htmlFor` label association + `autoComplete` attributes on login and register pages.
- `characterStore`: 30 s TTL on `fetchCharacter` with `force` bypass; `StatAllocModal` two-click confirmation guard.

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

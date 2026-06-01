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

## 2026-06-01 — CombatControls extraction (3-page combat dedup)

- **`CombatControls`** — new shared component (`src/components/combat/CombatControls.tsx`) that renders the outcome-gated `CombatActionBar` + `CombatOverlays` and maps `encounter.actions.*` → the action-bar `on*` handlers in one place. The arena, dungeon-run, and hunt pages all mount it instead of each spelling out the ~18-prop action bar + the overlays block.
- **Why:** the last two combat PRs each had to wire a new action (`skipStunned`, `interceptFlee`) into all three pages by hand — drift waiting to happen. A new combat action is now a one-file change. Behavior-preserving (pages keep their own per-surface outcome footers); 1072 tests + typecheck + lint green.

## 2026-06-01 — Monster roll fix · monster flee/intercept · heal active · ability cooldown

- **Fix: enemy roll on abilities/spells** — the monster _was_ rolling, but `MonsterCounterPanel` showed a tiny 28px die buried below the ability card. The ability + spell overlays now render the enemy counter die at `lg` (56px) with an "⚔️ Enemy counter roll" header and a longer spin, matching the basic-attack overlay's prominence.
- **Monster flee + intercept** — skittish low-level mobs (Goblin Scout, Giant Rat, Forest Goblin, Mud Imp, Boar Runt, Cave Spider, Dark Wolf) may flee when at/below ~25% HP (RNG). The player gets one **tap-to-intercept** roll (`rollFleeIntercept`: d10 + AGI vs the monster's flee roll) — out-roll it for an instant kill + full rewards, miss and it escapes with **nothing**. New `MonsterDef.flee`, `FightState.monsterFleeing`, `checkMonsterFlee` + `resolveInterceptAction`, an "It's fleeing — strike!" action-bar panel, and the two-die run animation. **Disabled in dungeon rooms** (they require a kill) via a new `monsterFleeDisabled` modifier.
- **Heal active ("second wind")** — a fourth `MonsterActive` (`heal`): a one-time, threshold-triggered HP restore (distinct from the `regen` trickle). Assigned to a mid bruiser (Iron Husk) + a boss (Goblin King "Kingly Resolve"). Surfaced as a "recovers N HP!" log note + folded into the balance model.
- **Ability 1-round cooldown** — abilities can't be rolled two turns running (a basic attack / spell / recovery must come between), light tactical pacing on top of the stamina cost. New `COMBAT.ABILITY_COOLDOWN_ROUNDS` + `FightState.abilityReadyOnRound` + an action-bar "⏳ cooldown" state.
- **Balance** — the cooldown means sustained offense is no longer "ability every turn"; the model's `avgPlayerDamage` is now a 75/25 ability/basic blend (the off-turn is a spell, not a weak basic). That longer-fight reality nudged the gateway/endgame bodies down: Ancient Dragon (HP 240→205, ATK 32→30), Void Revenant (HP 240→205), Dragon King (HP 410→375, ATK 33→30) — all L1–L20 + L13/L15 bands back in band.
- Static catalog + client resolvers only — no Firestore/rules/Cloud Function change. +15 vitest specs (1057 → 1072); functions 44 green.

## 2026-06-01 — Telegraphed specials + player-stun + endgame balance pass

- **Telegraphed specials** — the disruptive specials (`heavy` / `burst` / `stun`) now **wind up a round early** (prime → fire) instead of landing reactively, giving the player a turn to respond (kill or stun the monster to **cancel** the windup). `pierce` / `drain` still fire instantly. New pure `isTelegraphedSpecial` + `resolveCounterSpecial`; a `monsterCharging` slot on `FightState` drives a pulsing "⚡ Winding up" badge on the monster portrait across all three combat surfaces.
- **Player-stun** — a new `stun` special: when a charged stun lands, the player **forfeits their next turn** and the monster gets one undefended free hit (`resolveStunnedSkipAction`; the action bar shows a "😵 Stunned" panel). Assigned at low chance to three endgame carriers (Storm Djinn "Thunderclap", High Necromancer "Paralyzing Hex", Dragon King "Dread Roar"). Surfaced in every overlay, the battle log, and `LastActionSummary`.
- **Balance model expansion + guardrail** — `balanceModel.test.ts` now folds **special-move EV** (heavy/pierce/burst/stun, telegraph-discounted) and **monster self-sustain** (regen/vampiric/drain/summon-add → effective HP) into the model, and adds **L13 / L15 fight bands** (Void Revenant, Dragon King). A new test guards against a `vampiric` + `drain` double-heal stack; a `MONSTER_SELF_HEAL_CAP_FRACTION` caps combined per-counter self-heal as defense-in-depth.
- **Endgame tuning** — the model flagged three over-tuned bodies: Void Revenant (HP 285→240, ATK 34→27, summon 60→40), Storm Djinn (ATK 34→32), Dragon King (ATK 36→33) — now "brutal but winnable" with the affinity identity intact (Warrior fears the magic monsters; Wizard fears the physical Dragon King).
- Static catalog + client resolvers only — no Firestore/rules/Cloud Function change. +21 vitest specs (1036 → 1057); functions 44 green.

## 2026-06-01 — Monster special moves + always-visible enemy roll + combat-audit fixes

- **Monster special moves** — new data-driven `MonsterDef.specialMoves`: chance-based moves rolled on the monster's counter-turn _independent of the player's action_ (`rollMonsterSpecial`, ≤1 per counter). Four effects — **heavy** (×N damage), **pierce** (ignores your armor this hit), **burst** (the counter becomes armor-ignoring magic), **drain** (monster heals from the hit). Routed through an extended `incomingMonsterDamage` + new `monsterSpecialDrainHeal` / `effectiveAttackType`; surfaced in all three overlays, the battle log, `LastActionSummary`, and as planning chips on `MonsterCard`. Assigned to 13 arena monsters (L5+) and all 4 dungeon bosses.
- **Always see the enemy roll** — the ability + spell overlays now animate the monster's d10 counter (spin → settle) via a shared `MonsterCounterPanel`, instead of a tiny static die. Suppressed only on stun/dodge/kill.
- **Combat-audit fixes** — (1) `SpellRollOverlay` now receives `outcome` + `playerDefFailed`, so a spell kill shows "Monster slain!" (not a dead-monster counter) and a DEF-fail reads correctly; (2) Storm Djinn tagged `attackType: 'magic'` (and ATK retuned 40 → 34, since armor-ignoring magic is far deadlier) — its affinity was previously inverted; (3) ability **fizzle** damage now floors at `MIN_DAMAGE` + rolls monster DEF-fail like every other path (no more hard-0 fizzles); (4) balance model's L20 band now exercises the magic path (Warrior 88% / Wizard 40% HP-loss vs the magic Djinn); (5) counter panel shows the numeric DEF value; (6) character sheet surfaces a "Fragile Armor" callout for sub-1 DEF-multiplier classes (Wizard); (7) Dragon King kept physical so its ignore-DEF enrage stays meaningful, given a `burst` special instead.
- Static catalog only — no Firestore schema, rules, or Cloud Function parity change (combat damage is client-side). +21 vitest specs (1015 → 1036); doc-count validator hardened to ignore nested `specialMoves` ids.

## 2026-05-31 — Combat overlay consistency + meditate/attack crit fixes

- **Unified roll overlays across all three combat surfaces** — new `CombatOverlays` dispatch component replaces the copy-pasted action/ability/spell overlay block in the arena, dungeon-run, and wanted-hunt pages, so every surface renders identically and future overlay changes are single-touch.
- **Ability overlay now shows the monster counter-attack** — the `DiceRollOverlay` gained a monster-counter phase (roll, damage, stun/dodge/DEF-fail/crit tags) it never had, so abilities now read with the same dice → result → enemy-strike rhythm as attacks and spells. New shared `MonsterCounterPanel` + `CritFlourish` back the ability and spell overlays.
- **Magic counters display correctly everywhere** — magic monster hits now show `🔮 · ignores armor` (no DEF subtraction) in the action/spell/ability overlays, matching the log and `LastActionSummary`.
- **Meditate uses effective wisdom** — magic restore now scales by `effectiveStat(character, 'wisdom')`, so a Wizard's WIS multiplier finally boosts meditation (it previously used the raw stat — the only combat formula that didn't).
- **Basic attacks can Spirit-crit** — `resolveAttackAction` now rolls `rollSpellCrit` like abilities and spells do; a high-Spirit build sees occasional `✦ Spirit Crit` on basic attacks. Client-only; the balance-model offense now folds in crit EV so it stays an honest mirror.
- **Action-bar formula labels corrected** — Attack/Magic/Run sublabels were computing their stat bonus from raw stats; they now use `effectiveStat`, matching the live damage/escape math post-PR #170.
- Why: a consistency + accuracy pass over combat — the ability overlay hiding the counter and the meditate/label using raw stats were the last places the UI disagreed with the engine.

---

## 2026-05-31 — Combat & class balance pass + physical/magic damage types

- **HP formula flipped to Health-primary** — `HP = 50 + STA×1 + HEALTH×2` (was `STA×2 + HEALTH×1`). Stamina now drives the ability pool and Health is the real max-HP stat, so the Rogue's high Stamina multiplier no longer doubles as tankiness. Mirrored in the Cloud Function pool copy (parity-tested per class).
- **Class multiplier matrix compressed** — extremes pulled toward 1.0 (1.5→1.35–1.4, 0.7→0.8) and the Rogue rebuilt around dodge + abilities with low Health as its real weakness. Closes the "Rogue has no weakness / players outscale monsters" gaps from `/balance-check`.
- **Physical/magic damage types** — new `MonsterDef.attackType` (`'physical' | 'magic'`, default physical); casters/elementals (Dark Mage, Lich King, Frost Wraith, Ashwyrm, Void Revenant, plus the Necromancer boss) tagged magic. New `incomingMonsterDamage` helper centralizes every monster→player hit: physical is reduced by effective DEF, **magic ignores armor** and is scaled by a new per-class `CLASS_DAMAGE_TAKEN` table (Warrior ×1.3 magic = fears casters, Wizard ×0.75 = arcane ward, Rogue neutral). Surfaced as a 🔮/⚔️ tag on the monster card and combat log, and a Weak-to-Magic / Magic-Ward callout on the character sheet.
- **Monsters retuned** to the new player-power baseline (mid/late ATK + HP bumps, magic-type ATK against the no-armor path); economy/XP curves unchanged.
- **New balance-model test** (`balanceModel.test.ts`) — per-class pools + kill-rounds + damage-taken at L1/L10/L20 as a calibration tool and regression guard. Also: Rogue dodge now surfaces in the spell-roll overlay (closes the PR #170 gap).
- Why: the PR #170 multipliers were never play-tested as live mechanics; this tunes them, fixes the Stamina/HP double-dip, and gives the magic axis real texture. Bands are intentionally generous — the model guards against gross breakage, not false precision.

## 2026-05-31 — Class stat multipliers made real + combat affinities + Rogue dodge

- **Class stat multipliers are now applied.** The per-class `statMultipliers` (Warrior STR ×1.5, Wizard DEF ×0.7, Rogue AGI/STA ×1.5, …) shown on the character sheet were pure decoration — nothing consumed them. New `effectiveStat(character, statKey)` in `combat.ts` (`floor(base × multiplier)`) is now the single source of truth, threaded through every combat and resource-pool formula: outgoing damage (STR/WIS), incoming "weak to physical" (DEF), escape (AGI), spell/ability crit (Spirit), and max HP/Stamina/Magic (STA/HEALTH/WIS). Gear bonuses stay flat.
- **Rogue dodge** — new `classDodgeChance` / `rollClassDodge`: a Rogue-only Agility-scaled chance (cap 25%) to fully negate a monster hit. Applied at every incoming-hit chokepoint (`resolveRoundOutcome`, recovery free hit, failed-escape hit); surfaces as a `dodged` round-log field with a "💨 Dodged!" line in the battle log, last-action summary, and action overlay.
- **Character sheet rewrite** — the misleading "×mult" grid became an honest **Class Traits** panel describing what each multiplier does, plus class-only perks (Wizard +10 magic pool, Rogue dodge %, subclass teaser). `CharacterCard` now shows each primary stat's effective in-combat value when the class multiplier changes it.
- **Cloud Function pool parity** — `functions/src/gameLogic/combat.ts` mirrors the class multipliers; `playerMaxHp`/`playerMaxStamina` now take `charClass`. Updated the 3 callers (`claimCombatVictory`, `claimDungeonRun`, `logActivityCore`); the client-vs-functions parity test now cross-checks pools per class.
- Why: the sheet advertised a class scaling/affinity system that didn't exist; this makes it real and gives each class a legible combat identity. **Balance note:** multiplier values were never live — treat as a starting point pending a `/balance-check` tuning pass (esp. Rogue STA ×1.5 and Wizard WIS ×1.5, which now affect both damage and pools).

## 2026-05-31 — Title equip-from-rank-up + combat-banner title

- **Equip from the rank-up modal.** `RankUpCelebration` now offers a one-tap "Equip “{title}”" button (with a "Not now" escape) that sets `activeTitle` inline, so unlocking a title and wearing it is one step instead of a detour to the character sheet.
- **Title on victory banners.** The equipped title (`resolveActiveTitle`) now shows under the player name on the arena and hunt victory banners — the reputation you carry into a fight.
- Pure UI; no schema/rules/logic changes. 958 tests still green.

## 2026-05-31 — Reputation rank-up celebration + title flair

- **Rank-up celebration.** New `RankUpCelebration` component (mirrors `LevelUpCelebration`, mounted in the game layout) pops a violet cinematic modal — Award glyph, confetti, sound — when the player's Reputation rank advances a tier, announcing the newly-unlocked title. Baseline-on-first-observation guard avoids false-triggering on initial load.
- **Title flair.** The equipped title (`resolveActiveTitle`) now shows under the character name on the dashboard hero card.
- No new game-logic exports, schema, or rules; 958 tests still green.

## 2026-05-31 — Reputation progression: ranks ladder, titles, tracking

- **Rank ladder + titles.** Each reputation rank now grants an equippable flavorful **title** (`ReputationRank.title`: Greenhorn → the Named → the Respected → Renowned Hunter → the Legendary). New `ReputationLadder` (all 5 tiers with thresholds, what each unlocks, locked/unlocked/current) and `ReputationTitles` (tap-to-equip locked/unlocked grid → `Character.activeTitle`). New pure helpers `unlockedRanks` / `isRankUnlocked` / `resolveActiveTitle`.
- **Character-sheet tracking.** `/character` gains a Reputation hub card — rank progress, wallet, **bounties-completed** counter, equipped title, and a collapsible ranks/titles section. Surfaced on the Wanted Board (collapsible ladder + title) and profile (title + bounties + link) too.
- **Bounties completed.** New monotonic `Character.bountiesCompleted`, incremented on every bounty claim (loot + hunt) inside the shared grant writer; bounty-collect toasts append a "🏆 Bounty #N" trophy line.
- **Rules:** `bountiesCompleted` (monotonic, ≤10/write) + `activeTitle` (must be a valid rank id) validators added.
- **Tests:** +6 vitest (titles/unlockedRanks/resolveActiveTitle, store increment) + 5 rules specs (958 root tests).

---

## 2026-05-31 — Activity calendar + Profile/Settings split + preset avatars

- **New `/calendar` route** — a read-only month/week calendar of logged activities. Month grid shows per-day activity color-dots (+ a `+N` overflow chip and a ⌚ marker for device-synced logs); week view lists each day's activities; clicking a day opens a detail modal (label, amount/unit, XP, synced badge, time). Reuses the existing `statsStore` 500-log cache — no new store, fetch path, or Firestore index. New pure `src/lib/gameLogic/calendar.ts` (`localDayKey`, `monthMatrix`, `weekDays`, `groupLogsByDay`) — buckets by **local** day. New `Calendar` nav entry (overflow by default).
- **Profile / Settings split.** `/profile` is now identity/account only (avatar, name, email, password, Reputation, Polymath, Collections link). New `/settings` route holds app preferences (theme, sound, navigation customizer, device connections link, install). Shared `SettingsCard` extracted to `src/components/ui/SettingsCard.tsx`; the two pages cross-link.
- **Preset avatar picker.** New `Character.avatarId` (optional) chosen from a curated catalog of heraldic crests (`src/lib/gameLogic/avatars.ts`) rendered via `EntityArt` — no image upload, no Firebase Storage. New `CharacterAvatar` component; shown in the profile header and the layout header button (replaces the bare initial). Persisted via the client-mirrored `applyCharacterPatch`. Rule: `avatarId` validated as a `string ≤ 64 chars`.
- **Refactor:** `ACTIVITY_COLORS` moved from the stats page into `activityIcons.ts` so the stats charts and the calendar share one source of truth.
- **Tests:** +18 vitest specs (calendar date helpers, avatar catalog/resolution). 922 → 940 root tests.

## 2026-05-31 — Wanted Board Hunt bounties (the Fight fork, PR2)

- **Hunt bounties.** Most Wanted Board bounties are now combat **Hunts**: logging the activity _tracks down_ a named, level-scaled target (the unlock), then the player fights it on a new `/wanted/hunt/[bountyId]` route; **winning** collects the Reputation. A thin set of activity-only "standing" bounties stays as the rest-day floor. The daily board is composed as 2 hunts + 1 standing.
- **Combat reuse.** The hunt route mounts the real `useCombatEncounter` and reuses the arena's combat surface (third consumer after arena + dungeon-run). Win → `claimCombatVictory` CF for XP/gold (no item loot) + Reputation via the now-wired `claimBounty(id, { path: 'fight' })`. **Loss is a soft failure** — no character reset; the unlock persists for a free retry. Hunt targets are pinned at assignment via the pure `pickHuntMonster(level, band, seed)`; hunts pay more Reputation than any standing bounty (130/170/220 by difficulty band).
- **Schema/rules.** `BountyDef` gains `kind` + `combat.levelBand`; `ActiveBounty` gains `combatMonsterId` (immutable) + `combatWonAt` (write-once during claim). `activeBounties` rules extended; new `getMonsterById` lookup in `monsters.ts`.
- **Risk noted:** hunt wins route through `claimCombatVictory`, so they count toward the daily combat-XP cap + bestiary (intended — a hunt is combat; the hunt page surfaces the XP-multiplier warning).
- **Tests:** +12 vitest (rank/pool/store/pin) + 5 rules specs (934 root + 127 rules pass).

## 2026-05-31 — Reputation + Wanted Board (foundation slice, PR1)

- **New second currency — Reputation.** Dual-track: a `spendableReputation` wallet + a monotonic `lifetimeReputation` tracker that drives a 5-tier rank (Newcomer → Known → Respected → Renowned → Legendary). New pure `src/lib/gameLogic/reputation.ts` (`REPUTATION_RANKS`, `reputationRank`, `nextReputationRank`, `reputationProgress`). Rank is a visible badge + progress bar for now; the features it gates (vendor, NPCs, raids) arrive in later PRs.
- **New `/wanted` route — the Wanted Board.** Daily-rotating fitness bounties (`src/lib/gameLogic/bounties.ts`) that grant Reputation on completion. New `bountyStore` + `bountyData.ts` + `activeBounties` Firestore collection, all mirroring the quest system (uid-only read, client-side expiry filter, 30 s TTL). Bounties advance off the **same** activity logs quests do — one log feeds both reward tracks (intentional parallel progression).
- **Loot claim path only.** `claimBounty(id, { path })` grants Reputation to both wallets via `characterStore.applyCharacterPatch` (client-mirrored, like quest claims). The **Fight fork** (combat encounter for a bigger payout) and a hardening `claimBounty` Cloud Function are deferred to follow-ups via the typed `path` seam.
- **Surfaces:** Reputation chip on the dashboard (beside gold) + rank card on the profile; `Target` nav entry for `/wanted` (lands in the overflow nav by default); bounty store joins the sign-out flush.
- **Rules:** new `activeBounties` collection validators (clone of `activeQuests`); character `spendableReputation`/`lifetimeReputation` bounded, `lifetimeReputation` monotonic and delta-capped. No new index.
- **Tests:** +38 vitest specs (rank math, bounty pool registration, `bountyData` normalize, `bountyStore` actions incl. dual-wallet grant + deferred-fight seam). 884 → 922 root tests.

---

## 2026-05-31 — Documentation audit & sync

Docs-only pass — no code changes. Resynced every doc whose counts/lists drifted behind the content-scaling sprint (PR1–PR5b) and the health-data integration, and fixed a few internal contradictions.

- **GAME-LOGIC.md** — `monsters.ts` corrected 11 → 21 monsters (levels 1–14) with a new table for the 10 PR2 additions and their `siphon` / `armor-pierce` / `summon-add` mechanics; added the PR1/PR2 `combat.ts` exports (`spellCritChance`, `spellCritDamage`, `rollSpellCrit`, `monsterArmorPierce`, `effectivePlayerDefenseVsMonster`, `monsterSiphonAmount`, `effectiveMonsterMaxHp`); noted the 35-spell catalog + `SpellEffect.dotDamage`; documented the `ConsumableEffect` union + helpers; bumped the achievements parity-test count to 20.
- **ARCHITECTURE.md** — fixed "Five Zustand stores" → "Eight" (the table already listed eight); added the missing hooks (`useGameData`, `useHealthConnections`, `useSound`, `useTheme`); item silhouettes 55 → ~110; reframed the Garmin-only health entries to cover Strava (works-today) + Garmin.
- **DEPLOYMENT.md** — added the 6 health Cloud Functions to the deployed-functions list, a new "Cloud Functions secrets" subsection (Strava/Garmin secrets + `firebase functions:secrets:set`), the `NEXT_PUBLIC_HEALTH_SYNC_ENABLED` env row, and a HEALTH-INTEGRATION cross-ref.
- **README.md** — Spell catalog 21 → 35 (+ `dotDamage` and Spirit-crit notes); quest pools 12/5 → 61/31; combat-XP multiplier breakpoints corrected to 5/15/25; Achievement System reframed to all 31 badges across 6 categories; added HEALTH-INTEGRATION to the docs table.
- **ART-ASSETS.md** — reconciled the "Future work" item/spell counts (55/21 → ~110/35).
- **FIRESTORE.md** — `healthConnections` header Garmin → Strava/Garmin.
- **CLAUDE.md** — added `combat`/`activity` stores + DEPLOYMENT/HEALTH-INTEGRATION/BUGS-ENHANCEMENTS to the key-paths lists; reworded the health "Active focus" (Strava-first, not Terra); bumped the status date.
- **Specs** — marked combat-ui-polish and discord-ops-notifications as **Shipped** (both had stale "Approved" statuses).
- **Accuracy recount** — every headline number re-derived from source rather than carried over. Corrected the item catalog (README's own comment said "146 / 40 / 25 / 30"; actual is **149 items: 41 weapons / 26 armor / 31 accessories / 16 consumables / 35 spells**). Confirmed per-item art coverage is complete (**all 114 non-spell items** have a unique silhouette — 118 `ITEM_SILHOUETTES` keys incl. 4 type fallbacks).
- **GAME-LOGIC.md dungeons section rewritten** — it referenced 8 functions that no longer exist (`DUNGEON_BOSS_DEFS`, `generateDungeonRooms`, `getStatCheckThreshold`, `getStatCheckDamage`, `resolveStatCheck`, `getWeekSeedForDungeon`, `applyBossEnrage`, `isBossEnrageTriggered`). Replaced with the actual 27 `dungeons.ts` exports. Also documented 30+ other previously-missing exports (Spirit-crit + pity constants, `scaleQuestRewards`, activity-cap helpers, `rotationExpiresAt`, mastery/restore sets, `RARITY_CARD`, collection return types).
- **Drift guard (best practice)** — new `scripts/validate-doc-counts.mjs` + `npm run validate:docs`, wired into CI (step 4b). Three classes of check: (1) **counts** (items/spells/monsters/achievements/quest-pools/silhouettes) anchored so historical CHANGELOG entries are never matched; (2) **silhouette coverage** — every non-spell item must have a per-id silhouette; (3) **export coverage** — every `src/lib/gameLogic/*` export must appear in GAME-LOGIC.md or be on an explicit exemption list. This catches renamed/removed/added symbols, the exact drift that had rotted the dungeons section. CLAUDE.md's pre-PR checklist gained ART-ASSETS / DEPLOYMENT rows and a count-guard note.

## 2026-05-30 — Privacy Policy, Terms of Use, and legal footer

- Added `/privacy` and `/terms` pages under a `(legal)` route group with a minimal branded layout (no game nav)
- `LegalFooter` component (`© year · Privacy Policy · Terms of Use`) added to auth, game, and legal layouts
- Register page now includes "By creating an account you agree to our Terms of Use and Privacy Policy" above the submit button
- Connections page disclaimer links to the Privacy Policy — satisfies Strava API review requirement

## 2026-05-30 — Health-data integration scaffold (Strava + Garmin, free)

- **Auto-log real runs & workouts from a connected app** — feature-flagged off (`NEXT_PUBLIC_HEALTH_SYNC_ENABLED`). Two providers share one ingestion core. Full design + runbook in [HEALTH-INTEGRATION.md](HEALTH-INTEGRATION.md).
- **Strava — the works-today path** (free, self-serve, no approval; also pulls Garmin/Apple Watch/Fitbit workouts that the user syncs to Strava). `createStravaAuthUrl` + `stravaOAuthCallback` (OAuth2, no PKCE) + `stravaWebhook` (subscription-validation handshake + notification → `GET /activities/{id}` → map). 6-hour tokens auto-refresh via `stravaApi.getValidAccessToken`. No steps/sleep (Strava has neither).
- **Garmin-direct — coded, gated on enterprise approval** (adds steps + sleep): `createGarminAuthUrl` (OAuth 2.0 PKCE) + `garminOAuthCallback` + `garminWebhook` (Push). Inert until its secrets are set.
- **Shared write core** — extracted `logActivityCore` from the `logActivity` callable so device-synced logs reuse the exact authoritative path (daily caps, mastery, restore, achievements). The `logActivity` onCall is now a thin validation wrapper (no behaviour change; existing tests guard it).
- **New Cloud Functions** — `createGarminAuthUrl` (onCall — OAuth 2.0 PKCE start), `garminOAuthCallback` (onRequest — code→token exchange, stores tokens server-side), and `garminWebhook` (onRequest — Garmin "Push" ingestion). First `onRequest` HTTP functions + first use of Firebase Functions **secrets** (`GARMIN_CLIENT_ID` / `GARMIN_CLIENT_SECRET` / `GARMIN_WEBHOOK_TOKEN`).
- **OAuth tokens held server-side** — new server-only `healthTokens` + `healthOAuthStates` collections (deny all client access). The client-readable `healthConnections` doc holds status only, never tokens.
- **De-dupe** — discrete sessions idempotent by Garmin `summaryId`; cumulative daily steps logged as positive deltas via a `healthDailySnapshots` cursor so the day's logs sum to the latest total without double-counting.
- **Client** — new optional `ActivityLog.source` (`'garmin'`) drives a "⌚ synced" feed badge; new `/profile/connections` Connect-Garmin UI, `lib/health.ts`, `lib/healthData.ts`, `useHealthConnections`. Provider-neutral core leaves the door open for a paid aggregator/second provider as a thin adapter.
- **OAuth tokens held server-side** — provider-neutral `healthTokens` + `healthOAuthStates` collections (deny all client access); the client-readable `healthConnections` holds status only. New optional `ActivityLog.source` (`'strava'`/`'garmin'`) drives a "⌚ synced" feed badge.
- **Tests** — 28 new functions vitest specs (Strava + Garmin payload mapping, daily-delta dedupe, PKCE helpers); functions suite 16 → 44. Apple Health intentionally out of scope (needs a native iOS shell — documented).

## 2026-05-30 — Code-audit fix pass

Closes every finding from the post-sprint code audit (2 Must Fix, 5 Should Fix, 3 Consider). No new product features — purely correctness, code-quality, and small cheap wins. Sets up a clean baseline before the Reputation arc.

- **`useDailyLoginBonus` write-order bug fixed** — `lastLoginGrantedDate` is now stamped via the new `applyCharacterPatch` BEFORE any XP/gold awards. Previously, a tab close between the awards and the date stamp let the next mount replay the bonus. Trade-off: if the date-stamp succeeds and a downstream award throws, the player loses one bonus — accepted vs. duplicate-award risk.
- **`questStore.claimReward` weekly stale-count leak fixed** — `weeklyClaimsThisWeek` is now computed only inside the `isWeekly` branch. Daily claims no longer pick up the prior week's stale weekly count (was harmless re-check no-op, but the logic was wrong and would have misfired if `weekly-perfectionist` is ever re-evaluated).
- **New `characterStore.applyCharacterPatch(patch, opts?)` action** — owns the shared "shallow-merge patch → updateCharacterDoc → functional setState" flow that 3 client-mirrored writers were duplicating. Functional updater is mandatory inside, which eliminates the race where one hook's stale snapshot could clobber another's local-state update. Three callers migrated: `useCollectionAchievementSync`, `useDailyLoginBonus`, `questStore.claimReward` (via a new `applyQuestAchievementSideEffects` private helper).
- **`questStore.claimReward` split** — 107-line god-method now ~30 lines after extracting `applyQuestAchievementSideEffects`. Counter increments / weekly-perfectionist tracking / achievement merge all live in the helper.
- **`useCollectionAchievementSync` short-circuit now covers all 4 collection IDs** — previously omitted `arcane-archive`, so players holding the other three were recomputing sets on every inventory tick.
- **`useDailyLoginBonus` narrowed store subscriptions** — depends on `uid` + `level` + `lastLoginGrantedDate` slices instead of the full character object. Effect no longer fires on every HP/gold/XP write.
- **`inventoryStore.useConsumable` signature refactor** — 7 positional params → 1 options object `{ inventoryItemId, resources: {...} }`. Three callsites updated (inventory page, combat page, dungeon run page, `useCombatEncounter` hook).
- **`characterData.ts` Spirit/Agility backfill** — switched from `??` to an `in` check so a stored zero is preserved rather than silently re-overwritten by the class default. Today's classes don't ship with primary stats at 0, but the regression guard is cheap and future-proof.
- **`achievements-parity.test.ts`** — added `void-revenant` → `slayer-revenant` fixture so all 4 L11–14 slayer monsters are directly parity-asserted.
- **`characterData.test.ts`** — new regression spec: explicit zeros for spirit + agility are preserved (the `??` → `in` switch above is what makes this safe).
- **Tests**: 6 new vitest specs (876 → 882): 5 for `applyCharacterPatch` (no-op / patch-and-merge / functional-updater-race / skipFirestore / error capture) + 1 zero-preservation spec. Functions parity test grew from 19 → 20 assertions.

## 2026-05-30 — Nav polish: bottom-sheet shadow, haptic dismiss, animated badge (PR #151)

- **Bottom-sheet shadow** — composite `box-shadow` on the overflow panel: inset 1 px top highlight (glass edge) + subtle upward glow + stronger directional drop shadow in both light and dark variants. Panel reads clearly as a lifted surface above the nav bar.
- **Haptic dismiss** — `navigator.vibrate(8)` fires on swipe-to-dismiss; guarded by `'vibrate' in navigator` (no-op on iOS / desktop).
- **Animated badge dismiss** — onboarding dot fades + scales out via `AnimatePresence` when `hasSeenCustomizer` flips; `prefers-reduced-motion` gets an opacity-only exit. Ping stops after 3 cycles (`[animation-iteration-count:3]`) so it doesn't drain battery on first-time users who ignore the hint.

## 2026-05-30 — Nav polish: swipe-dismiss, onboarding badge, deep-link chips (PR #150)

- **Shared `navConfig.ts`** — `src/lib/navConfig.ts` exports `NAV_ITEMS` and `ALL_NAV_HREFS` as the single source of truth; both `layout.tsx` and `navPreferenceStore` import from it, eliminating the manual-sync drift risk. 4 unit tests validate shape + no-duplicate invariant.
- **Swipe-to-dismiss** — framer-motion `drag="y"` with `dragElastic=0.4` and `onDragEnd` threshold (60 px offset or 400 px/s velocity); drag handle pill at panel top as a visual affordance; drag disabled under `prefers-reduced-motion`.
- **Onboarding badge** — pulsing orange dot on the More (⋯) button until first customizer open; persisted via `hasSeenCustomizer` in `navPreferenceStore` (set to `true` on `openCustomizer`).
- **Deep-link chips** — the 3 progress chips on `/collections` (Achievements / Bestiary / Items) are now `Link` components with hover states, jumping directly to the corresponding tab.

## 2026-05-30 — /collections page: Achievements, Bestiary, Collection tabs (PRs #147–148)

- **New `/collections` route** — dedicated area for the player's catalog (achievements, monsters, gear), separate from `/profile` and `/stats`. New `CollectionsTabs` switcher (Achievements / Bestiary / Collection) above all three views.
- **Achievements tab** (`/collections`) — full 30-achievement catalog with locked/unlocked states (badge portraits, descriptions, gold-earned badges). 3-column progress summary strip at top (Achievements X/Y · Bestiary X/Y · Items X/Y) with deep-link chips. Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- **Bestiary + Collection tabs** moved from `/stats/bestiary` and `/stats/collection`; old routes redirect to new locations. `StatsTabs` component deleted as dead code.
- **Mobile nav: 5 primary + "More" overflow** — Dashboard / Character / Activities / Combat / Quests always visible; Inventory / Shop / Stats / Collections behind a `MoreHorizontal` button. 2×2 grid panel slides up above the nav bar with icon + label, auto-closes on navigation or backdrop tap, `aria-expanded` wired.
- **Nav customizer** — drag-to-reorder pinned items via framer-motion `Reorder.Group`; toggle to add/remove; accessible from the More panel's "Customize nav" shortcut and from Profile settings. `navPreferenceStore` (Zustand persist) tracks order with stale-href backfill on rehydration.
- **Profile** — Achievement Gallery removed; replaced with an indigo link to `/collections` and a Navigation settings card.

## 2026-05-30 — Post-content-scaling balance pass

After the 5-PR content-scaling drop, the `/balance-check` audit surfaced five tuning issues + three polish gaps. Single PR addresses all eight.

- **Combat XP daily cap tightened** — `combatXpDailyMultiplier` 1.0× tier moved from 0–9 wins to **0–4 wins** (and matching 0.5×/0.25×/0.1× breaks shifted to 5–14 / 15–24 / 25+). Daily combat-farm ceiling drops from ~7 500 XP to ~3 500 XP — closer parity with activity-logging ceiling. Server parity test fixtures and the combat-page badge title copy updated in lockstep.
- **Quest reroll cost scales with level** — flat 100 g replaced by `questRerollCost(level) = 100 * max(1, floor(level/5))`. Effective tiers: L1–9 = 100 g, L10–14 = 200 g, L15+ = 300 g. Low-level players see no change; high-level cherry-pickers pay proportionally more across the 61-quest pool.
- **`MAX_STREAK_SHIELDS` raised 1 → 3** — returning players get up to three single-day-miss shields per ISO week instead of one. Dashboard shield badge now shows count when > 1 (`"🛡️ 3 shields"`).
- **Shop-buyable legendaries** — three new legendary items with `lootOnly: false`: **Merchant's Codex** (weapon, 4 000 g, +15 WIS / +5 STA), **Champion's Sigil** (accessory, 3 500 g, +5 each to STR / WIS / AGI / SPR), **Gilded Bulwark** (armor, 5 000 g, +18 DEF / +8 HP). Stat budgets deliberately under loot-only legendaries so the loot grind remains the BIS path; these are alternates, not upgrades. Functions-side `LEGENDARY_ITEM_IDS` extended in parity; `GEAR_STAT_BONUSES` updated for resource-max math.
- **Welcome-back ephemeral session boost** — when a player returns after a 14+ day absence with no active streak tier, they get **+30 % loot drops + +10 % XP** for the session, surfaced via a top-of-page banner. Pure derivation from `streakData.lastLogDate` — no schema change. New `useWelcomeBackActive` hook, new `WelcomeBackBanner` component, combat XP + loot multipliers `Math.max` against streak baseline.
- **Polymath progress widget on profile** — 4 pip-rows showing mastery progress toward the `polymath` achievement (5 mastery on every primary stat). Hidden if already unlocked — surfaces all-emerald pips in that case.
- **`arcane-archive` achievement (31st)** — own every spell in the catalog. 800 g reward, 📚 emoji. Client-mirrored via the existing `useCollectionAchievementSync` hook (matches `legendary-hoarder`).
- **Daily login bonus** — first dashboard mount each UTC day grants `min(75, 25 + 5 × level)` gold + `min(150, 10 × level)` XP, surfaced via toast. Tracked on character via new `lastLoginGrantedDate` field. Client-mirrored optimistic write (matches PR5b quest + collection pattern).
- **Tests** — 16 new vitest specs (846 → 862): `questRerollCost` brackets + monotonicity, `daysSinceLastLog` edge cases, `shouldOfferWelcomeBack` thresholds + fresh-account gating, `checkCollectionAchievements` arcane-archive spec. Existing combat XP unit tests + parity test fixtures updated for the tier shift.

## 2026-05-30 — 24 new achievements (content-scaling PR5b)

- **24 new achievements** across 5 categories grow the catalog from 6 → 30:
  - **Combat (7)** — `first-blood` (1st win), `centurion` (100 wins), `slayer-obsidian` / `slayer-ashwyrm` / `slayer-revenant` / `slayer-djinn` (5 kills of each L11–14 monster), `untouched` (win without taking damage).
  - **Activity (6)** — `iron-body` / `marathoner` / `well-fed` / `well-rested` (100 logs each), `hydration-streak` (7-day water streak), `enlightened` (50 meditations).
  - **Mastery (4)** — `apprentice` / `journeyman` / `master` (hit mastery level 5 / 15 / 25 on any primary stat), `polymath` (level 5 on STR + WIS + AGI + SPR).
  - **Quest (4)** — `quest-novice` / `quest-veteran` / `quest-legend` (50 / 250 / 1000 quests claimed), `weekly-perfectionist` (all 3 weeklies claimed in one ISO week).
  - **Collection (3)** — `bestiary-complete` (every monster + boss discovered), `legendary-hoarder` (every legendary item owned), `armory` (15 unique gear pieces owned at once).
- **Server-authoritative** for combat / activity / mastery (17 IDs):
  - `claimCombatVictory` CF gains a `flawless: boolean` input and, inside its existing transaction, increments `character.totalCombatWins` + `character.monstersKilled[monsterId].killCount`, evaluates combat achievements against the AFTER values, and merges new IDs + their gold reward atomically. Result type now returns `newAchievements: string[]` and `achievementGold: number`.
  - `logActivity` CF folds achievement evaluation into its mastery transaction, now also tracking `character.activityLogCounts[type]` (lifetime per-activity counter, distinct from `masteryCounts`). For water logs it pre-queries the past 7 days of water docs to compute the streak before the transaction.
- **Client-authoritative** for quest + collection (7 IDs) — `questStore.claimReward` writes quest achievement IDs directly; new `useCollectionAchievementSync` hook (mounted in `(game)/layout.tsx`) computes collection achievements from inventory + bestiary state and persists them. These are optimistic client writes; the existing CF transactions do NOT re-check them. Worst-case tamper is a few hundred gold per fabricated unlock — harden via a CF re-check when competitive scoring (leaderboards) ships.
- **Parity** — `functions/src/gameLogic/achievements.ts` mirrors all 24 gold values + thresholds + checker functions. `achievements-parity.test.ts` extended from 11 → 19 assertions covering every new constant + every new checker on equivalent fixtures.
- **Tests** — 35 new vitest specs (35 in `achievementsPR5b.test.ts` covering catalog sanity + every checker + every threshold + non-tracked-monster edge cases). 846 total tests pass (was 811). Suite still under 15 s.
- **UI** — achievement-unlock toasts surface in three places: combat victory claim, activity log result, quest claim. Each toast shows emoji + name + description + gold. Existing profile badge gallery already renders from `ACHIEVEMENTS`, so the new 24 IDs appear there automatically.
- **Normalization** — new `Character` fields (`totalCombatWins`, `activityLogCounts`, `totalQuestsClaimed`, `weeklyQuestsClaimed`) default in `normalizeCharacter`. Legacy character docs see the defaults on the very next fetch.

## 2026-05-29 — Bestiary + Collection + quest expansion (content-scaling PR5a)

- **Bestiary surface** — new `/stats/bestiary` route. Card grid of all `MONSTER_CATALOG` monsters (sorted by level) plus the 4 dungeon bosses. Slain monsters show portrait + level + kill count + first-killed date (from `character.monstersKilled`, written since PR2); undiscovered ones show a greyed silhouette + "???". Bosses are not tracked in `monstersKilled` (that map is pruned to catalog ids), so boss-defeated state is derived from the 1:1 tier-clear achievement (`goblin-slayer` → Goblin King, etc.). Header shows total discovered / total.
- **Collection surface** — new `/stats/collection` route. Owned-vs-total item grid grouped by type (weapons / armor / accessories / consumables / spells), each sorted common → legendary, with an overall completion % bar. Owned items render full art; unowned show greyed silhouettes. Spells render their effect-school silhouette (`SPELL_SILHOUETTES` via `spellEffectKey`) rather than a per-id item silhouette.
- **Tab switcher** — new `src/components/stats/StatsTabs.tsx` (Link-based segmented control) added above all three stats surfaces (Overview / Bestiary / Collection).
- **Testable derivations** — new `src/lib/gameLogic/collections.ts` exports `bestiaryProgress(character)`, `collectionProgress(ownedIds)`, `BOSS_TIER_ACHIEVEMENT`, and `tierName(tierId)`; both pages consume these so the completion math is unit-tested rather than living inline in JSX.
- **Quest pool expansion** — `DAILY_QUEST_POOL` 34 → **61** (+27: 14 single-activity + 13 cross-habit combos, including 5 new Spirit-building meditation combos); `WEEKLY_QUEST_POOL` 17 → **31** (+14: 7 single + 7 combos). All combos pair distinct activities (no overlapping progress tracking). Existing pool-size floors raised to ≥60 daily / ≥30 weekly.
- **OG epic spells now obtainable** — the three previously-orphaned loot-only epic spells (Titan's Fury / Void Collapse / Phantom Assault had no drop source) now drop from dungeon bosses: Phantom Assault → Broodmother (12%), Void Collapse → High Necromancer (12%), Titan's Fury → Dragon King (12%).
- 14 new vitest specs (797 → **811**): bestiary progress (discovered/boss-defeated/catalog-prune), boss→achievement map validity, monster + item silhouette render-coverage, collection progress (0%/100%/per-type sum/all-types), quest reward positivity + requirement validity.

## 2026-05-29 — Spells + bleed/burn DoT (content-scaling PR4)

- **14 new spells** in `src/lib/gameLogic/items.ts` — grows the catalog 21 → 35. 6 generic (Cinder Spark, Soothing Light, Emberstorm, Radiant Bulwark, Cataclysm, Divine Sanctuary), 2 Warrior (Rending Cleave, Seismic Slam), 2 Wizard (Incinerate, Glacial Prison), 1 Rogue (Rupture), and **3 legendary class spells** (Worldbreaker / Stellar Collapse / Thousand Cuts).
- **New `SpellEffect.dotDamage` field** — `{ perRound, rounds }` bleed/burn applied to the monster on a successful cast. Ticks at the start of each of the player's subsequent offensive rounds (attack / magic / ability / spell), bypassing defense, until the timer expires. New `FightState.monsterDots` array tracks active DoTs keyed by spell id: re-casting the same spell refreshes its stack, different spells (and dungeon venom) stack independently. Ticked in `runPreAction` after monster regen, so it works in **both arena and dungeon** with no modifier plumbing. A DoT tick that empties monster HP ends the fight as a win (the dead monster does not counter-attack). New `RoundEntry.monsterDotDamage` field + a "suffers N bleed damage" modifier-note surface it in the combat log. (`cleanseSelf` from the original plan was deferred — there is no monster mechanic that applies player DoT yet, so it would be untested dead code; revisit when a monster bleed/poison-the-player mechanic ships.)
- **Spell-school routing** — `spellEffectKey` now maps any `dotDamage` spell to the `fire` school, so burn/bleed casts get the crackling-fire impact sound + orange screen flash + flame silhouette without new sound synths. Stun and lifesteal still take precedence (they remain the headline effect for spells like Seismic Slam and Thousand Cuts).
- **Legendary spells are loot-only and actually obtainable** — unlike the orphaned older epic loot-only spells, the 3 new legendaries drop from the Ancient Dragon King boss (`dragons-keep` bossLootTable, 8% each) and the matching L11–14 arena monster (Storm Djinn → Worldbreaker, Ashwyrm → Stellar Collapse, Void Revenant → Thousand Cuts, 3% each). The 11 buyable spells (uncommon/rare/epic, not loot-only) grow the weekly shop rotation pool.
- **5d6 dice requirement** — Stellar Collapse uses a 5d6 three-of-a-kind. The `SpellRollOverlay` dice row already wraps (`flex-wrap`), so 5 dice render cleanly; the `SpellDiceRequirement.diceCount` doc comment updated to note 2–5.
- **Functions parity** — `LEGENDARY_ITEM_IDS` extended with the 3 legendary spell ids; the `achievements-parity` test (derived from `ITEM_CATALOG` legendaries) stays green. No server-side spell resolution exists, so `dotDamage` needs no other functions copy.
- 17 new vitest specs (780 → **797**): DoT application timing (no tick on cast round), per-round ticking + timer decrement, expiry, same-spell refresh vs different-spell stacking, combined multi-DoT tick damage, DoT-kill win, fizzle applies no DoT, `spellEffectKey` fire routing, catalog registration + buyable/loot-only/legendary-parity assertions.

## 2026-05-26 — Items + art (content-scaling PR3)

- **56 new items** in `src/lib/gameLogic/items.ts` — 22 weapons / 12 armor / 16 accessories / 6 consumables. Doubles the catalog and fills out the L11–14 progression gap that the new monsters now drop into.
  - Weapons (22): common Wooden Club / Apprentice Wand / Leather Sling / Novice Charm; uncommon Steel Mace / Crystal Staff / Shortbow / Spirit Totem / Kris Blade; rare Flameblade / Lightning Rod / Silver Rapier / Moonstaff / Starfall Bow; epic Soulreaver / Astral Tome / Thunderclaws / Spirit Channeler; legendary World-Ender / Cosmic Codex / Shadowblade Zenith / Crown of Mind (all loot-only).
  - Armor (12): common Cloth Shirt / Studded Jerkin; uncommon Scale Mail / Mage Vestments / Reflex Leathers; rare Mithril Mail / Oracle Robes / Silent Cloak; epic Aegis of Light / Shadowstep Coat; legendary Guardian Bulwark / Starfire Vestments.
  - Accessories (16): includes **7 new Agility items** (speed-anklet, agility-band, thief-gloves, wind-walker-boots, rogues-talisman, storm-stride, eye-of-eternity) and **7 new Spirit items** (novice-charm weapon, spirit-totem weapon, spirit-channeler weapon, crown-of-mind weapon, aegis-of-light armor, starfire-vestments armor, spirit-pendant / silver-chalice / rune-bracelet / sage-circlet / phoenix-feather / sigil-of-clarity / eye-of-eternity accessories) — repairs the previously-flagged AGI and Spirit gear gaps.
  - Consumables (6): epic single-resource Arcane Elixir (+120 magic) and Titan Elixir (+200 stamina); legendary loot-only Phoenix Draught (+350 HP); utility multi-restore Battle Stim / Spirit Tea / Sage's Brew.
- **New `ConsumableEffect` variant** — `{ type: 'multi'; restores: Array<{resource; amount}> }` for combo elixirs. `ConsumableEffect` is now a discriminated union; `inventoryStore.useConsumable` applies multi-step restores in one pass (one Firestore write per touched resource, not three). Shared formatting helpers `describeConsumableEffect`, `consumableEffectColorClass`, and `consumableEffectColorHex` live in `items.ts` and back both the inventory page and the in-combat action bar so future effect variants surface uniformly.
- **L11–14 monster loot tables extended** — Obsidian Golem now drops Guardian Bulwark / Titan Elixir; Ashwyrm drops World-Ender / Phoenix Feather; Void Revenant drops Cosmic Codex / Eye of Eternity / Arcane Elixir; Storm Djinn drops Shadowblade Zenith / Twin Suns Pendant / Storm Stride / Phoenix Draught. Boss-grade drops now actually exist in the catalog instead of pointing at older tier-4 fillers.
- **Functions parity** — `LEGENDARY_ITEM_IDS` in `functions/src/gameLogic/achievements.ts` gains all 9 new legendaries (8 gear + Phoenix Draught) so `legendary-haul` achievement awards stay consistent with the client. `GEAR_STAT_BONUSES` in `functions/src/gameLogic/items.ts` adds the four PR3 items with stamina/health bonuses (cloth-shirt, tortoise-charm, guardian-bulwark, twin-suns-pendant) so server-side `playerMaxHp` / `playerMaxStamina` stay accurate. Both parity vitests still green.
- **Art** — 56 new SVG silhouettes in `src/components/art/item-silhouettes.tsx` (one per item ID) registered in `ITEM_SILHOUETTES`. Reuses the existing `currentColor` + Tailwind-class vocabulary; each silhouette occupies the central 60×60 area of the 100×100 viewBox so shop / inventory / combat surfaces render at-a-glance without bundle bloat outside the lazy-loaded art module.
- 20 new vitest specs (760 → **780**): catalog registration assertions per item type, legendary parity, silhouette coverage for every new id, AGI / Spirit gear-coverage assertions, multi-effect shape spot-checks, helper output coverage for all four resource colors and label variants. Suite still under 14 s.
- **Security:** added `tmp: ^0.2.6` to the root `overrides` block to patch GHSA-ph9p-34f9-6g65 (HIGH — path traversal in `tmp <0.2.6`, pulled transitively by `firebase-tools`). npm audit's `dev` flag mislabels overridden transitives as production, so `scripts/audit-check.mjs` was failing CI; the override resolves `tmp` to 0.2.7 and clears the advisory. Same surgical-override pattern already used for `tar` / `glob` / `uuid`.

---

## 2026-05-26 — Monster roster + new mechanics (content-scaling PR2)

- **10 new monsters** filling out levels 1–10 variety and the L11–14 progression gap between Ancient Dragon (10) and Dragon King boss (15). Mud Imp / Boar Runt / Bog Lurker / Iron Husk / Frost Wraith / Gloom Knight (L1–8 variety) plus Obsidian Golem / Ashwyrm / Void Revenant / Storm Djinn (L11–14 bridge). Daily arena rotation (`getDailyPick(MONSTER_CATALOG, 4)`) auto-picks the new entries — no rotation code change needed.
- **2 new monster passives + 1 new active**:
  - `siphon` — drains flat stamina from the player every round the monster lands a hit. Helper `monsterSiphonAmount`; integrated post-`roundResult` in all three resolvers (`resolveAttackAction`, `resolveAbilityAction`, `resolveSpellAction`); surfaces in the round log as `monsterSiphon`.
  - `armor-pierce` — flat reduction to player effective defense for this monster's attacks. New helpers `monsterArmorPierce` + `effectivePlayerDefenseVsMonster` in `src/lib/gameLogic/combat.ts`; wired through `calculateRound` and `rollRunAway`, plus parallel pierce-aware effective-def math in `spells.ts` (counter-attack) and `abilities.ts` (`rollMonsterAttack`). Surfaces as `monsterArmorPierce` in the round log.
  - `summon-add` — one-time HP bonus added to both current monster HP AND the cap when the trigger threshold is crossed. New `FightState.monsterBonusHp`; regen/vampiric caps now use `effectiveMonsterMaxHp(state)` instead of `state.monster.hp` so reinforcements stick. `checkMonsterActive` gains a `bonusHp` return field; surfaces as `monsterSummonAddHp` in the round log.
- **Dungeon pool extension** — `dark-sanctum` gains `iron-husk` + `gloom-knight`; `dragons-keep` gains all four L11–14 monsters (`obsidian-golem`, `ashwyrm`, `void-revenant`, `storm-djinn`).
- **Bestiary backend** — new `Character.monstersKilled?: Record<string, { killCount; firstKilledAt }>` schema field, defaulted by `normalizeCharacter`. `characterStore.updateMonsterPity` now writes both `legendaryDryStreak` and `monstersKilled` in the same Firestore update so every kill stamps the bestiary tally. Pruned by `MONSTER_CATALOG` ids. Ready for the PR5 bestiary surface.
- **Monster art** — 10 new monster portraits in `src/components/art/silhouettes.tsx` (Mud Imp through Storm Djinn) registered in `MONSTER_SILHOUETTES`. Reuses the existing `currentColor` + Tailwind-class pattern; no new theming hooks needed.
- **Types** — extended `MonsterPassiveId` and `MonsterActiveId` unions; both `MonsterPassive` and `MonsterActive` doc comments updated to cover the new values.
- 16 new vitest specs (744 → **760**): `armor-pierce` math + `calculateRound` integration, `siphon` value reads, catalog/pool registration, summon-add catalog assertion. Suite still under 13 s.

## 2026-05-26 — Spirit stat + Meditation activity (content-scaling PR1)

- **New primary stat: Spirit** (cap 50, joins Strength/Wisdom/Agility). `Stats.spirit?: number` added to `src/types/index.ts`; class definitions extended with starting values (Warrior 3, Wizard 7, Rogue 3) and stat multipliers (0.9× / 1.2× / 1.1×). Spirit is backfilled to legacy character docs on next fetch via the existing agility-migration pattern in `characterStore.fetchCharacter`.
- **Spell/ability crit math** — `spellCritChance(spirit)` and `spellCritDamage(spirit)` helpers in `src/lib/gameLogic/combat.ts` (+1% chance per point, cap 40%; +0.5% multiplier per point, cap +25%). Integrated into `resolveAbilityAction` and `resolveSpellAction` in `combatActions.ts` — fires only on a successful (non-fizzle / requirement-met) action that deals damage. New `spiritCrit` and `spiritCritMultiplier` flags on `RoundEntry`.
- **New activity: Meditation** (7th activity type). Daily cap 60 min, single-session ceiling 120 min. **First activity in both `MASTERY_ACTIVITIES` and `RESTORE_ACTIVITIES`** — grants Spirit mastery (milestones at 5/15/25/… logs) AND restores Magic at 0.2 per minute (stacks with water). New `meditation` tab in `ActivityLogForm`, lotus-pose SVG in `action-icons.tsx`, 🧘 emoji in `ACTIVITY_ICONS`, `#a78bfa` color in stats-page chart legend.
- **Cloud Function parity** — `functions/src/index.ts` `validTypes` includes `meditation`; `RESTORE_MAP` adds the `meditation → currentMagic` entry. `functions/src/gameLogic/constants.ts` adds `MAGIC_PER_MEDITATION_MINUTE`, extends `MasteryActivityType`/`MASTERY_CONFIG`/`MASTERY_ACTIVITIES`/`RESTORE_ACTIVITIES`/`statCap` for the spirit primary stat.
- **Quest pool expansion** — 5 new daily meditation quests + 2 weekly + 1 daily combo (`daily-combo-meditation-workout`) + 1 weekly combo (`weekly-combo-meditation-steps`). DAILY_QUEST_POOL grows 28 → 34; WEEKLY_QUEST_POOL grows 14 → 17.
- **Stat allocation UI** — `StatAllocModal` adds a Spirit option (violet ✨, "Increases spell/ability crit chance and damage") alongside the existing 4 stats. `allocateStatPoint` signature accepts `'spirit'`.
- 24 new vitest specs (720 → 744): full coverage for `spellCritChance`/`spellCritDamage`/`rollSpellCrit` and end-to-end meditation surface (activity registration, daily caps, magic restore, Spirit mastery mapping).
- First slice of the 5-PR content-scaling drop. Doubles the foundation (new stat + new activity) so PR2's monster expansion has Spirit-aware combat to land on.

## 2026-05-26 — Fix Discord notify action manifest load error

- Removed a `${{ job.status }}` expression from inside the `status` input's description in `.github/actions/discord-notify/action.yml`. GitHub parses every `${{ ... }}` expression in an action manifest at load time (even inside string descriptions), and the `job` context isn't available there — caused the first scheduled-e2e run to fail with `Unrecognized named-value: 'job'`. Description rewritten to plain text.
- No behavior change to the notify itself — the runtime step already reads `${{ inputs.status }}`, which is valid composite-action context.

## 2026-05-25 — Service-account E2E automation + scheduled runs + Discord alerts

- New `authenticated-flows` Playwright project exercises real user actions against the emulator-seeded `e2e@test.local` test user: `flows/log-activity.test.ts`, `flows/quest-claim.test.ts`, `flows/combat-victory.test.ts`, `flows/shop-buy-equip.test.ts`, `flows/dungeon-flee.test.ts`. Per-test `resetCharacter` via the emulator `owner` admin token; seeded `Math.random` (mulberry32) for deterministic combat/spell/loot rolls.
- New `tests/e2e/helpers/` directory: `seed.ts` (createTestUser, seedCharacter, resetCharacter, seedClaimableQuest, seedEquippedWeapon, clearCollectionForUid), `actions.ts` (UI flow helpers), `rng.ts` (seeded `Math.random` installer for `page.addInitScript`).
- New composite GitHub Actions: `.github/actions/run-e2e-suite/action.yml` boots auth+firestore+functions emulators, builds Cloud Functions (with `functions/lib/` cache keyed on `functions/src/**`), installs Playwright browsers, runs tests, uploads report artifact. `.github/actions/discord-notify/action.yml` reads the Playwright JSON report and posts a colored embed (pass/fail counts, top 10 truncated failures, run URL) to a `DISCORD_WEBHOOK_URL` secret; swallows network errors so notifier glitches never fail the job.
- New `.github/workflows/scheduled-e2e.yml` cron at 08:00 UTC daily + `workflow_dispatch`. Concurrency group prevents overlapping runs. `--trace=on` flag passed for post-mortem on scheduled failures.
- `ci.yml` swapped the inline emulator + Playwright steps for `uses: ./.github/actions/run-e2e-suite`; added a failure-only Discord notify step on master pushes.
- Playwright reporter now emits `test-results/results.json` (consumed by `notify.mjs`); third Playwright project `authenticated-flows` added with shared `storageState`.
- Added `data-testid` attributes to interactive elements used by flow tests: activity submit + tabs, quest claim button + cards + claimed badge, ActionButton (Attack/Magic/Flee), BattleResultsModal, MonsterCard fight button, shop buy + owned indicator, inventory equip + equipped badge, dungeon enter button. Pure-additive; no visual or behavior change.

## 2026-05-25 — Documentation audit and sync

- Updated 6 docs to close gaps between shipped features and recorded state: ARCHITECTURE.md (2 new stores, `components/art/` folder, 4 new lib entries, 2 new hooks), CI.md (test count 653→720), GAME-LOGIC.md (quest pool sizes 12/5→28/14, `resolveStatCheckFlavor` export), FIRESTORE.md (`InventoryItem.charges` field), BUGS-ENHANCEMENTS.md (SHIPPED markers for E2/E4/E6/E7), README.md (SMOKE-TEST.md entry, PWA status corrected), BACKLOG.md (resolved SMOKE-TEST item).

## 2026-05-25 — Spell charge polish (per-rarity + UI surfacing)

- `getSpellMaxCharges(rarity)` in `src/lib/gameLogic/spells.ts` replaces the flat `COMBAT.SPELL_MAX_CHARGES` constant on live combat paths. Per-rarity scaling: common 2, uncommon 3, rare 3, epic 4, legendary 5. Acquisition (not per-cast) gates power.
- Inventory loadout + spell tab cards now display the charge meter inside the card body via `SpellCard.chargesRemaining` / `maxCharges` props (small "Charges" label + violet/grey dots).
- Dungeon rest site UI shows a "+N Spell(s) ✨" badge alongside Stamina/Magic restore amounts. Toast "✨ N spells replenished" fires on rest only when at least one spell was actually depleted (no noise when full).
- `persistSpellChargeDecrements` now writes per-spell remaining charges based on each spell's rarity (not the old flat MAX). Same for `useCombatEncounter.castSpell` charge gate.
- 5 new vitest specs covering `getSpellMaxCharges` per-rarity output and the undefined fallback (715 → 720 passing).

## 2026-05-25 — Spell charge "top card" mechanic (E5)

- Each equipped spell now has 3 charges (flat, all rarities). In arena, charges reset after every fight (win/loss/flee). In dungeons, charges persist across rooms and only replenish at rest sites.
- `InventoryItem.charges?: number` added (`undefined` = full). `normalizeInventoryItem` passes the field through. `COMBAT.SPELL_MAX_CHARGES = 3` constant added.
- `useCombatEncounter` tracks `spellChargesUsed: Record<string, number>` per invItemId; `castSpell(spellDef, invItemId)` gates and increments charges. Charges reset when the monster changes (new fight) via `useEffect` + `useRef`.
- `CombatActionBar` renders violet/grey dot meters under each spell card; "Cast Spell" button and individual spell cast buttons are disabled when exhausted. "All spells exhausted" sublabel when every spell is depleted.
- `inventoryStore` gains `persistSpellChargeDecrements(decrements)` (dungeon room carry-forward) and `replenishSpellCharges()` (arena fight end + dungeon rest site + dungeon run end).
- 12 new vitest specs cover charge normalization, persistDecrements, and replenish.

## 2026-05-25 — Monster passives + actives (E9)

- Added `MonsterPassive` (thorns/regen/vampiric) and `MonsterActive` (enrage/harden) types to `MonsterDef`. All 11 MONSTER_CATALOG entries now have passive or active assignments (L1–L10).
- Passive resolution in `combatActions.ts`: regen heals monster before each offensive round; thorns reflect a % of player damage back; vampiric heals monster from its own counter-attack damage.
- Active fires once when monster HP crosses `triggerPct`; enrage boosts ATK permanently, harden boosts DEF. `FightState` tracks `activeUsed` / `monsterBonusAtk` / `monsterBonusDef`. Active label displayed as a pulsing orange badge in `CombatArena`. Passive shown as a color-coded chip (rose/emerald/purple). Boss rooms suppress passive/active badges (bosses have their own dungeon-modifier mechanics).

## 2026-05-25 — Spell school sounds + screen flash (E7)

- Eight new synthesized spell school sounds: `spellDamage`, `spellFire`, `spellMagicDamage`, `spellHeal`, `spellStun`, `spellDefense`, `spellLifesteal`, `spellStamina` — all added to `sounds.ts` + `useSound.ts` `PLAY_FUNCS`.
- `SpellRollOverlay` plays the matching school sound when the result phase begins (via `spellEffectKey()` → `SPELL_SOUND` map); fizzles play `'fail'`.
- Full-screen colored flash overlay (18% opacity, 500ms CSS fade) uses school-themed colors: rose/orange/violet/emerald/amber/sky/purple.

## 2026-05-25 — Weekly spell rotation + out-of-combat consumable Use (E4/E6)

- **E4** — Shop spells now rotate weekly (5 featured, seeded by ISO week). New `shopRotation.ts` + `getWeeklySpells()`. Rotation notice shows both daily gear and weekly spell countdowns. Non-featured spells accessible via collapsible "Browse all spells" section.
- **E6** — Inventory consumable cards now show a "Use" button that consumes the item out of combat. Button shows "In dungeon" when `activeRun !== null` (disabled). Uses separate `using` state so it doesn't block equip/unequip actions.

## 2026-05-25 — Emoji → SVG icon components (E2)

- New `src/components/art/stat-icons.tsx` (StrengthIcon/WisdomIcon/AgilityIcon/StaminaIcon/HealthIcon/DefenseIcon) and `src/components/art/action-icons.tsx` (quick-action + activity-type SVGs). All use stroke-based Lucide-style 24px viewport.
- `StatBar` now accepts `React.ReactNode` for `icon` prop. `CharacterCard` and dashboard `STAT_CONFIG` use SVG stat icons.
- Dashboard `QUICK_ACTIONS` use SVG icons; `ActivityFeedItem` calls `getActivityIconSvg()`. Character page "How Stats Work" section adds inline SVG icons beside each stat.
- `activityIcons.ts` gains `getActivityIconSvg()` using `createElement` (no JSX in .ts file) — existing string exports unchanged.

## 2026-05-25 — Dungeon stat-check flavor, spell shimmer light-mode, ability formula (E1/E3/E8)

- **E1** — Added `STAT_CHECK_SCENARIOS` (3–4 per tier) + `resolveStatCheckFlavor` to `dungeons.ts`. Dungeon run page renders 2-line flavor above stat-check options.
- **E3** — `PremiumSpellCard` shimmer now uses `mix-blend-mode: overlay` in light mode and `screen` in dark mode (detected on mousemove via classList).
- **E8** — `AbilityResolution.formulaBreakdown` exposes `avgRoll/statBonus/gearBonus/baseHit/damageMultiplier/rawDamage/monsterDef`. `DiceRollOverlay` renders a compact "Damage formula" panel on ability hit.

## 2026-05-25 — Mobile responsiveness sweep (E10)

- Mobile bottom nav touch targets raised to `min-h-[44px]` (py-3 instead of py-2).
- Main content bottom padding bumped to `pb-24 sm:pb-20 md:pb-6` for breathing room at 320px.
- Stats page range-filter buttons: `py-2.5 min-h-[40px]`; chart left margins `-10` (was `-20`).
- Inventory NEW badge: `text-[11px]` (was `text-[10px]` — unreadable at 320px).
- Dungeon progress chain nodes: `w-8 h-8 sm:w-7 sm:h-7` (mobile-friendly upscale).
- Combat post-fight button grid: `gap-2 sm:gap-3`, buttons `py-3 sm:py-2.5`.

## 2026-05-25 — SpellRollOverlay shows monster counter-attack panel (B8)

- Added `monsterRoll: number` to `SpellResolution` in `spells.ts` (was computed internally but discarded).
- Threaded `monsterRoll`, `monsterStunned`, `monsterDamage` through `resolveSpellAction` pending payload → `PendingSpell` type → `SpellRollOverlay` props.
- Overlay now renders a compact "Monster strikes back" panel (rose d10 + HP damage) below the spell result. Shows "Monster stunned — no counter" when the spell stuns. Both arena and dungeon pages updated.

## 2026-05-25 — Quest page Daily/Weekly tab switcher (B7)

- Replaced `grid grid-cols-1 md:grid-cols-2` two-column layout with a `📅 Daily | 📆 Weekly` pill tab on all viewports.
- One section visible at a time — eliminates the card-height misalignment on desktop and improves mobile legibility.

## 2026-05-25 — Gear equip only changes max HP/Stamina; unequip clamps current (B5/B6)

- `computeGearDelta` in `inventoryStore.ts` now applies DQ1/DQ2: equipping leaves `currentHp`/`currentStamina` unchanged (max rises only); unequipping clamps current down if it would exceed the reduced max.
- Eliminates the confusing "+5 current stamina" display on equip (B6) — only the max changes now.

## 2026-05-25 — refreshPlayerState helper + shop gold desync fix (B4)

- New `src/lib/refreshPlayerState.ts` — canonical `Promise.all([fetchCharacter(uid, true), fetchInventory(uid)])` helper.
- `inventoryStore.buyItem` now calls `refreshPlayerState` after the Firestore transaction instead of applying a local gold delta — eliminates the stale-gold display discrepancy.
- All 4 dungeon claim call sites in `dungeons/run/page.tsx` migrated to `refreshPlayerState` (removed direct `useCharacterStore` import).

## 2026-05-25 — Combat nav lock + beforeunload guard (B9)

- New `src/store/combatStore.ts` — single `combatActive` boolean with `setCombatActive` / `clear`.
- Arena page sets the flag while a monster is active (cleared on victory modal, flee, defeat, unmount). Dungeon run page sets it during `combat` and `boss` phases.
- Both pages register a `beforeunload` handler while the flag is true so the browser "Leave page?" dialog fires on tab close or URL-bar navigation.
- `CombatSafeLink` component in `layout.tsx` wraps all desktop sidebar + mobile bottom-nav links and shows a toast instead of navigating when `combatActive`.
- `handleSignOut` flushes `combatStore` alongside the other 5 stores.

## 2026-05-25 — Dungeon claim handlers surface errors; CF unhandled exceptions now diagnosable (B2/B3)

Previously all three dungeon claim handlers (`handleClaimVictory`, `handleRetreat`, defeat button) used `try…finally` with no `catch`. Any Cloud Function failure silently re-enabled the button with no user feedback. Added `catch` blocks with `toast.error(…)` to all three so failures are always visible to the player.

Also added a top-level `try/catch` inside the `logActivity` and `claimDungeonRun` Cloud Functions. Unhandled exceptions previously surfaced to clients as an opaque `functions/internal` with a blank message, making the root cause invisible in the browser console. They now re-throw as `HttpsError('internal', err.message)` so the actual error detail is visible in DevTools — critical for diagnosing B2's "internal" error until Firebase log access is available.

- `src/app/(game)/combat/dungeons/run/page.tsx` — catch + `toast.error` added to `handleRetreat`, `handleClaimVictory`, and the defeat inline handler.
- `functions/src/index.ts` — `logActivity` body wrapped in try/catch; unhandled errors re-throw with message.
- `functions/src/claimDungeonRun.ts` — same pattern applied to `claimDungeonRun`.

---

## 2026-05-25 — Quest reroll no longer crashes when rolling into a single-target quest (B1)

Rerolling an active quest now succeeds in every branch. Previously, rerolling into a quest with no `extraTargets` crashed with `FirebaseError: Function updateDoc() called with invalid data. Unsupported field value: undefined (found in field extraProgress …)` because the Firestore payload was sending `extraProgress: undefined` to clear the field. Firestore's `updateDoc` rejects `undefined` field values entirely.

- **Fix** — `src/store/questStore.ts` now imports `deleteField` from `firebase/firestore` and uses `extraProgress: pick.extraTargets ? {} : deleteField()` in the `updateActiveQuestDoc` payload. The local Zustand store update keeps `undefined` (valid JS) so the in-memory shape is unchanged.
- **Regression tests** — `src/store/__tests__/questStore.test.ts` adds two specs covering both branches of `rerollQuest`: the `deleteField` path (rolling into a quest with no extra targets) and the `{}` path (rolling into a quest with extra targets). Pool is constrained to a single deterministic candidate via the `heldDefIds` exclusion, no `Math.random` stub needed.
- 684 vitest specs pass (was 674; +2 new specs, plus 8 picked up from earlier merges).

---

## 2026-05-24 — Spell cards get an MTG-style flippable front/back

Spell cards now have two faces: the existing rarity-themed front (image, title, description, effects) and a uniform "FitQuest Spellbook" back inspired by Magic: The Gathering's iconic shared card back. Players click the card body to flip; the action button (Buy / Equip / Cast) stays on the front and never triggers a flip.

- **New `SpellCardBack` component** (`src/components/ui/SpellCardBack.tsx`) — rarity-tinted shell that matches the front's silhouette (header band, body, footer plate), with a central `HeraldicFrame` sigil bearing a sword-and-spark mark and five colored magic-school orbs (heal / defense / stun / damage / lifesteal) arranged in an MTG-pentagon ring.
- **`PremiumSpellCard` becomes the flip host** — adds CSS 3D-flip (`perspective` + `transform-style: preserve-3d` + `backface-visibility: hidden`) composed with the existing hover-tilt math on a single inner element, so tilt and shimmer survive the refactor. Public API unchanged — all 4 callsites (shop, inventory loadout × 2, combat selector) get the flip for free.
- **A11y + reduced motion** — wrapper is `role="button"` with `aria-pressed` reflecting flip state and an `aria-label` that announces the visible face. Enter/Space toggle the flip when the card is focused. `useReducedMotion` from framer-motion disables the 600 ms flip transition for users who prefer reduced motion.
- **`SpellCard` action button** stops click propagation so Buy / Equip / Cast can never accidentally trigger a flip.
- **8 new vitest specs** in `PremiumSpellCard.test.tsx` cover the default front face, click flip, second-click un-flip, action-button isolation, Enter/Space keyboard flip, back-face content, and `aria-hidden` toggling per face.

---

## 2026-05-24 — Dungeon combat parity with arena via shared combat layer

Dungeon rooms now expose the full arena action set — Attack, Magic, Roll Ability (6d6 patterns), Cast Spell, Rest, Meditate, Use Item, Flee — with full integration of subclass passives, crit, lifesteal, execute, momentum, and per-round restores. Previously, dungeon combat was attack-and-flee only, and even basic attacks skipped `applyOutgoingPassives`, `resolveLifesteal`, and `checkExecute`, leaving subclass builds effectively inert inside dungeons.

- **New shared combat layer.** `src/components/combat/` now owns the overlays (`ActionRollOverlay`, `DiceRollOverlay`, `SpellRollOverlay`), the action bar (`CombatActionBar`), and presentational components (`MonsterCard`, `AbilityReference`, `HpBar`, `LastActionSummary`, `BattleLogEntry`, `BattleResultsModal`). The 3,356-line arena page consumes them via `useCombatEncounter` and shrank by ~1,000 lines.
- **New pure resolver layer.** `src/lib/gameLogic/combatActions.ts` exposes `resolveAttackAction`, `resolveAbilityAction`, `resolveSpellAction`, `resolveMeditateAction`, `resolveRestAction`, `resolveFleeAction`, `resolveUseItemAction` — pure functions that wrap the existing `combat.ts` / `abilities.ts` / `spells.ts` / `passives.ts` exports, plus a `CombatModifiers` seam for dungeon-only mechanics.
- **`useCombatEncounter` hook** (`src/hooks/useCombatEncounter.ts`) owns `FightState`, pending-overlay state, and the `actions.*` API. Both arena and dungeon mount the hook. The hook never touches Firestore or Cloud Functions — the page wires `onVictory` / `onDefeat` / `onFlee` to whichever claim path it needs.
- **Dungeon mechanics preserved** via `CombatModifiers`: Venom DoT (Venomfang Bracer), Necro Shield (Dark Sanctum boss), Dragon ignore-DEF (Dragon's Keep boss), Broodmother +5 ATK, plus `fleeDisabled` on boss rooms — all delegate to the unchanged helpers in `src/lib/gameLogic/dungeons.ts`.
- **Boss Flee remains disabled** — UX framing unchanged. Stat-check and Rest rooms are still rendered by the dungeon page (the hook only mounts during combat/boss phases).
- **15 new unit tests** in `combatActions.test.ts` cover each resolver and every modifier hook slot, including an arena-equivalence check that confirms `modifiers: undefined` produces identical state deltas to the legacy inline handlers.

---

## 2026-05-23 — Fix Cloud Function failures + harden Firebase infrastructure

Fixes two production outages (logActivity CORS, claimCombatVictory 500) and closes several infrastructure gaps identified in a Firebase setup audit.

- **logActivity CORS:** Cloud Run lost the `allUsers → roles/run.invoker` IAM binding during a failed May-17 deployment, so OPTIONS preflight was rejected before the function ran. Fix: redeploy (resets binding) + weekly `scheduled-firebase-sync.yml` workflow so IAM drift self-heals.
- **claimCombatVictory 500:** daily-wins query (`combatLogs where uid == X and loggedAt >= today`) needs `(uid ASC, loggedAt ASC)`. Only the DESC variant existed. Added the ASC index to `firestore.indexes.json`.
- **claimDungeonRun inventory recovery:** if the CF crashed after the transaction committed but before the inventory write completed, a retry hit `already-exists` and items were permanently lost. The already-claimed path now recovers unawarded items from `allDroppedItems` on the run doc before rethrowing.
- **combatLogs rule tightened:** create rule changed to `if false` — all writes come from the admin SDK; client create was an unnecessary attack surface.
- **Dead code removed:** `addCombatLogDoc` (pre-CF client write path, no longer called anywhere) removed from `combatData.ts`.
- **Index coverage validation:** `validate-firestore-indexes.mjs` now checks 6 required indexes by query coverage, not just file structure. CI catches a missing composite index before it reaches production.

---

## 2026-05-23 — Test coverage expansion: stores, hooks, lib helpers, components

Adds 24 new vitest files (215 new tests, 438 → 653 total) covering the runtime-critical code that previously had no unit coverage. Suite still runs in ~12 s.

- **Stores (3 new files, 70 tests):** `characterStore` (41 — fetch TTL, level-up bonuses, stat-allocation caps, subclass gating, monster pity, mastery local-apply, restore local-apply, name updates), `dungeonStore` (19 — fetchActiveRun legacy-claim cleanup, startRun gating on HP/gold/daily limit, advanceRoom accumulation, completeRun CF-finalized fast-path, abandonRun), `statsStore` (10 — TTL cache, retry flag, error capture).
- **Hooks (4 new files, 23 tests):** `useCharacter` (auth gating + clear-on-logout), `useOnlineStatus` (initial nav.onLine read, online/offline event handlers, listener cleanup on unmount), `useCombatBursts` (round-key dedup, crit/block/heal aggregation, expire by id), `useRecentActivity` (store passthrough).
- **Lib helpers (7 new files, 56 tests):** `characterData.normalizeCharacter` (required-field validation, post-MVP field defaults), `questData.normalizeActiveQuest`, `inventoryData.normalizeInventoryItem`, `combatData` (addCombatLogDoc + fetchRecentCombatLogs query shape), `dungeonData` (all 7 exports — collection name, doc lifecycle, claim stamp), `auth` (signIn / signUp / logOut / verifyBeforeUpdateEmail / updatePassword / updateProfile no-op when not signed in), `functions.claimDungeonRunCF` (functions/already-exists idempotent no-op vs. propagate other errors), `errors.captureError`.
- **Components (9 new files, 66 tests):** `InputField`, `Button`, `XPBar`, `EmptyState`, `ErrorBanner`, `OfflineBanner`, `Heading`, `Card`, `Modal` — variant classes, a11y attrs (`role`, `aria-busy`, `aria-modal`, `aria-live`), keyboard behaviour (Escape closes Modal), body-scroll lock, CTA link vs. button branching.
- **Coverage scope broadened:** `vitest.config.ts` `coverage.include` now covers `src/lib/**`, `src/store/**`, `src/hooks/**`, `src/components/**/*.{ts,tsx}` instead of only `src/lib/gameLogic/**`. Thresholds remain gated only on `src/lib/gameLogic/**` (80/80/70/80) so new files become visible in `npm run test:coverage` without blocking PRs on coverage of any specific subtree.
- **JSX in tests:** added `@vitejs/plugin-react` as a devDependency and registered it in `vitest.config.ts` (vitest 4 / rolldown doesn't parse JSX without an explicit plugin).

---

## 2026-05-23 — Stability-to-A: offline UX, authenticated E2E, audit script, bundle split

Closes four scorecard gaps (Offline UX B+ → A, E2E B → A, Vulnerabilities B- → A, Bundle B → A) tracked in `docs/superpowers/plans/2026-05-23-stability-to-a.md`.

- **Offline UX:** `OfflineBanner` now reads "queued changes will sync automatically when you reconnect" — Firestore's `persistentLocalCache` queues writes and replays them on reconnect, so the previous "may not save" wording understated the guarantees.
- **Authenticated E2E coverage:** Added `tests/e2e/global-setup.ts` that seeds a test user + character document via the Auth and Firestore emulator REST APIs, drives the login form, and saves Playwright `storageState`. New `tests/e2e/authenticated.test.ts` smoke-tests dashboard, shop, inventory, quests, character, combat, stats, profile, and dungeons. `playwright.config.ts` gained a `globalSetup` pointer and a second `authenticated` project that applies the saved storage state. CI now starts the auth + firestore emulators (with a 60 s readiness poll) before the E2E step and passes `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`. Task 2 from the plan (firebase.ts emulator wiring) was already shipped in the prior sprint and was confirmed in place — no change required.
- **Vulnerability audit:** `scripts/audit-check.mjs` parses `npm audit --json` and exits non-zero on any high/critical advisory; moderates are logged as warnings. Replaces the two `continue-on-error: true` audit steps so a genuine high-severity advisory now blocks the build. Known devDep advisories (firebase-tools transitive uuid<9 chain) are documented in `docs/SECURITY-SETUP.md § Known devDependency vulnerabilities`.
- **Bundle / code-split:** `@next/bundle-analyzer` wired up behind `npm run analyze` (`ANALYZE=true`). The 55-entry `ITEM_SILHOUETTES` map plus its 55 SVG functions moved out of `src/components/art/silhouettes.tsx` into a new `src/components/art/item-silhouettes.tsx` (1,043 lines), and `EntityArt.tsx` imports it from the new file. Non-item routes (combat, character, dashboard) should no longer pay the item-silhouette cost in their shared chunk.

---

## 2026-05-23 — CSP fix, Die3D unification, Firebase emulator complete

- **Fix: CSP `connect-src` blocked all Cloud Functions** — `https://*.cloudfunctions.net` was missing from the allowlist in `next.config.mjs`; every call to `claimCombatVictory` and `logActivity` was rejected by the browser before reaching the network, causing the "Couldn't reach the server" toast on reward claims, "Failed to log activity" errors, and the daily-XP badge being stuck at 0 wins. Also added `worker-src blob:` to clear the canvas-confetti web-worker CSP violation on victory screens.
- **`Die3D` unified for all combat dice** — extended `Die3D` with `format='number'` (large numeral on every cube face, supports d10 values 1–10), `size='xl'` (80 px), and a `color` prop (indigo/sky/slate/amber/rose/gray/violet per action type). `ActionRollOverlay` migrated from the removed flat `D10Face` to `Die3D` — basic attack, rest, meditate, and run-away rolls now use the same 3D tumbling cube animation as spells and abilities.
- **Firebase emulator support complete** — `src/lib/firebase.ts` now connects Auth (9099), Firestore (8080), and Functions (5001) to local emulators when `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`. Enables authenticated E2E tests to exercise the full Cloud Function path without touching production data.

---

## 2026-05-23 — Full per-item art system + docs sync

### chore/docs — Documentation sync (PR #104)

Updated `docs/ART-ASSETS.md`, `docs/UI-UX-MODERNIZATION.md`, and `docs/ARCHITECTURE.md` to reflect the PremiumSpellCard and per-item silhouette work shipped in PRs #101–103. Fixed stale item-category row in ART-ASSETS (now shows per-id keying + frame split), marked Per-item art as ✅ shipped, corrected stroke guidance, added PremiumSpellCard to ARCHITECTURE key primitives and UI-UX Bonus polish section.

### feat/per-item-silhouettes — Unique per-item SVG silhouettes for all 55 items (PR #103)

**Pass 1:** Authored 45 unique SVG silhouettes (18 weapons, 13 armor, 14 accessories) keyed by `item.id` in `ITEM_SILHOUETTES`. Every weapon and armor renders in a `'shield'` heraldic frame; accessories use `'medallion'`. Callsites in shop and inventory updated from `id={item.type}` to `id={item.id}` with explicit `variant` per type. Emoji fallbacks removed entirely.

**Pass 2 (next-level suggestions):** Authored 10 additional consumable silhouettes (MinorHealthPotion through GreaterStaminaPotion) — HP potions as round bulbs, magic potions as angular crystals, stamina potions as cylinders/barrels, differentiated by size and detail per tier. Legendary item cards gain `ribbon="Legendary"`; loot-only inventory cards gain `ribbon="Loot Only"`. Dev-time `console.warn` added to `EntityArt` for any item id with no registered silhouette, catching catalog additions early.

### feat/item-silhouettes — V4 item silhouette portraits (PR #102)

Added heraldic-framed silhouette portraits to all gear and consumable item cards in the shop and inventory. `EntityArt category="item"` called with `tint={rarityTint(item.rarity)}` so the frame colour matches item rarity.

---

## [Unreleased] — 2026-05-22

### feat/premium-spell-cards — PremiumSpellCard with depth and shimmer

**V3 — PremiumSpellCard:** New `src/components/ui/PremiumSpellCard.tsx` wraps `SpellCard` with three layered visual effects — rarity-tuned depth box-shadow at rest (unique RGB tint per rarity: gray/green/blue/purple/gold), hover lift (`translateY(-4px)` + deeper shadow), and a mouse-tracking radial-gradient shimmer overlay (`mix-blend-mode: screen`). All three effects implemented via direct DOM style mutation on `useRef` (zero `useState` re-renders on `mousemove`). `willChange: transform` is set on `mouseenter` and cleared on `mouseleave` so compositor layers are promoted only while the user is hovering. Props type is `ComponentProps<typeof SpellCard>` to eliminate manual duplication and auto-inherit future SpellCard props. All 4 callsites (combat spell panel, inventory loadout ×2, shop) swapped to `PremiumSpellCard`.

---

### feat/3d-dice — 3D tumbling dice + phased roll sounds

**V1 — Die3D component:** Replaced flat `DieFace` with a true CSS 3D cube (`src/components/ui/Die3D.tsx`). Six faces with correct pip layouts; internal `useEffect` drives spin animation (75ms interval, random rotations) and settles to the correct face via `FACE_ROTATIONS` with a 500ms CSS transition. Props identical to the removed `DieFace` — drop-in replacement at all 7 callsites in `combat/page.tsx`.

**V2 — Phased dice sounds:** Split the single `playDiceRoll` sound into two: `playDiceRolling` (1.125s rolling rattle, fires when any roll overlay opens) and `playDiceSettle` (sharp clack, fires when the first die locks in). Both are Web Audio synth — no audio files added.

---

## 2026-05-22 — Combat bug fixes: claim flow, spell button, dark mode

- **B1 — Claim reward isolation** — `handleClaimRewards` now uses per-step try/catch; modal closes immediately after the Cloud Function succeeds, eliminating the retry→double-XP/gold window; loot-only failures surface a warning toast instead of keeping the modal open
- **B2 — Spell button light mode** — disabled spell action buttons now use explicit slate colours instead of `opacity-40` on the rarity header; common-rarity spells are visible again in light mode
- **B3 — Dark mode modal** — `BattleResultsModal` and the in-battle victory banner had white-gradient backgrounds with no `dark:` variants; fixed alongside the "Drop Only" badge, "Victory!" heading, and `BattleLogEntry` left border

## 2026-05-22 — Dark mode polish across all pages and inputs

- **`InputField` component** — canonical themed input (`dark:bg-slate-950`, consistent focus ring, `sm`/`md`/`lg` size variants) that owns all dark-mode input styling in one place; all 14 raw `<input>` elements across login, register, profile, character-creation, and ActivityLogForm migrated to it, including 3 ChangePasswordForm inputs that were previously missing `dark:bg` entirely.
- **`dark:` variant patches on 16 files** — tinted surfaces use `950/40` opacity, card bodies use `slate-900`; covers stat alloc modal, spell cards, subclass/class selectors, combat dice faces, shop/inventory/quest/stats highlights, and level-up celebration.
- **E2E guard** — `tests/e2e/dark-mode.test.ts` added; verifies `dark` class on `<html>` and non-white input backgrounds on `/login` and `/register` via `addInitScript`.

---

## 2026-05-22 — Firestore IndexedDB offline persistence

- **IndexedDB persistence enabled in `src/lib/firebase.ts`.** Uses `initializeFirestore` with `persistentLocalCache` + `persistentMultipleTabManager` so Firestore reads are served from the local cache when the device is offline or on a flaky connection. SSR/Node environments (including vitest) fall back to the memory-only default via a `typeof window` guard; hot-reload re-initialization is caught and falls through to `getFirestore`. No store or component changes required — the `db` export is a drop-in replacement.

## 2026-05-22 — retry.ts hardening, sign-out store flush, dependency fixes

- **`isRetryable` classifier in `retry.ts`.** Non-retryable Firebase error codes (`permission-denied`, `unauthenticated`, `invalid-argument`, `not-found`, `failed-precondition`, and 4 others) now rethrow immediately without sleeping through delays. Unknown/network errors (no `.code`) default to retryable. 9 new unit tests cover the classifier and the fast-path behaviour.
- **`STORE_RETRY_DELAYS` constant exported from `retry.ts`.** Replaces the four hardcoded `[1_000, 3_000]` literals across all store call sites and `ActivityLogForm.refreshTodayTotal`. Single place to tune retry timing app-wide.
- **`refreshTodayTotal` now retries on transient failure.** Cap meter fetch is consistent with all other Firestore reads; on a network blip it retries before falling back to the stale value.
- **`characterStore.clear()` added to sign-out flush.** `GameLayout.handleSignOut` was clearing 4 stores but not `characterStore`; stale character data could briefly persist in memory between sessions.
- **Dependency audit: 4 of 11 moderate vulnerabilities resolved** via `npm audit fix` (`brace-expansion` in `@typescript-eslint`, `qs` in `express`). Remaining 7 are `uuid` inside `firebase-tools` transitive deps — the only fix requires downgrading `firebase-tools` to 1.2.0 (breaking); deferred.

## 2026-05-22 — questStore read retry, stale spinner on error resolved

- **`fetchWithRetry` on `questStore.fetchAndAssignQuests` read path.** Only the initial `fetchActiveQuests` call is retried; the conditional `addActiveQuestDoc` writes that follow are intentionally excluded — partial quest assignments can't be safely rolled back.
- **Stale cap-meter spinner resolves on persistent fetch failure.** Previously, if `refreshTodayTotal` failed (e.g., no connection), the stale spinner ran indefinitely. The catch block now clears the stale flag so the last known value shows without a spinner. The next submit re-invalidates if needed.

## 2026-05-22 — Retry breadth, stale cap meter, utcDayStartMs test seam

- **`fetchWithRetry` wired into `characterStore.fetchCharacter` and `inventoryStore.fetchInventory`.** Both were single-attempt Firestore reads with no resilience; they now get the same `[1 s, 3 s]` back-off as `statsStore`.
- **Stale cap-meter indicator in `ActivityLogForm`.** After an activity is submitted, the cap meter now stays visible (dimmed, with a spinner) while the usage count re-fetches, instead of disappearing for 1–2 s. State shape changed from `Map<string, number>` to `Map<string, {value, stale}>`.
- **`utcDayStartMs` extracted to `src/lib/gameLogic/streaks.ts`.** Pure helper (no Firebase deps) alongside `todayUTC()`; 4 unit tests cover the UTC midnight boundary including the 23:59:59 / 00:00:00 rollover edge case.

## 2026-05-22 — Shared retry utility, statsStore retrying indicator, cap-meter caching

- **`fetchWithRetry` extracted to `src/lib/retry.ts`.** Previously an inline function in `statsStore`; now a typed, tested utility (5 unit tests) with an optional `onRetry` callback and configurable delays. Any store can now use it without copy-pasting the pattern.
- **`statsStore` gains a `retrying` flag.** Set to `true` during the back-off window between attempts. The stats page renders a spinner + "Retrying…" amber strip so users understand why the skeleton is persisting past the expected load time.
- **`statsStore` uses the shared utility.** Inline `fetchWithRetry` and `RETRY_DELAYS_MS` constant removed; now imports from `@/lib/retry`.
- **Cap-meter tab caching.** `ActivityLogForm` stores per-type today totals in a `Map<string, number>` instead of a single value. Switching back to a previously-viewed tab shows the cached value instantly — no Firestore re-read. The cache entry is invalidated on successful submit so the meter re-fetches the authoritative post-submit total.

## 2026-05-22 — statsStore retry-with-backoff and OfflineBanner positioning fix

- **Retry-with-backoff on `statsStore.fetchStatsData`.** Added a local `fetchWithRetry` helper (2 retries, exponential: 1 s → 3 s) wrapping the `Promise.all([fetchActivityLogs, fetchRecentCombatLogs])` call. Transient Firestore errors (network blip, cold-start timeout) now recover silently; only persistent failures surface the error banner.
- **`OfflineBanner` positioning fixed.** Removed `fixed top-14 left-0 right-0 z-30` — the banner now renders in document flow between the sticky header and the main body in `GameLayout`. This eliminates the hardcoded 56px offset that would have broken on any header-height change. The banner still stretches full-width via the flex-column parent.

## 2026-05-22 — Cap indicator, game loading skeleton, vitest fix

- **P2-3 cap proximity indicator redesigned and restored.** `ActivityLogForm` now fires a one-time `getDocs` query (`fetchTodayLogsForType`) on mount and after each successful submit, using the existing `(uid, type, loggedAt ASC)` Firestore composite index. `CapMeter` component shows an emerald → amber → rose progress bar with "X remaining" or "Cap reached" label. No permanent listener; no midnight-rollover bug.
- **Game loading skeleton added.** `src/app/(game)/loading.tsx` provides a Suspense-compatible shimmer skeleton (using the existing `Skeleton` component) for all game-segment pages — shown while Next.js streams or suspends a page.
- **Fix vitest `setupFiles` path breaking functions tests.** Relative `'src/test-setup.ts'` in root `vitest.config.ts` resolved against CWD when vitest walked up from `functions/`, causing CI to fail with a missing-file error. Changed to `path.resolve(__dirname, 'src/test-setup.ts')`.

## 2026-05-22 — Test infrastructure, statsStore cache, error boundaries, offline detection

- **Test infrastructure.** Installed `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom`. Added 24 new unit tests: `activityStore` subscription idempotency and uid-change teardown, `questStore` and `inventoryStore` TTL skip / `_fetching` guard / `force` bypass, and `useTodayKey` date-roll and `visibilitychange` behaviour. Per-file `// @vitest-environment jsdom` convention documented for future hook/component tests.
- **Stats page performance.** Extracted `fetchActivityLogs` (500 docs) and `fetchRecentCombatLogs` (1000 docs) into a new `statsStore` with 30-second TTL — same pattern as `questStore` / `inventoryStore`. Navigating away from /stats and back no longer re-fetches 1500 docs. `statsStore.clear()` wired into `handleSignOut`.
- **Error boundaries.** Added `src/app/(game)/error.tsx` (game segment) and `src/app/error.tsx` (root) using Next.js App Router convention. Both log via `captureError` so crashes are tracked. Recovery UI provides "Try again" and "Go to Dashboard" actions.
- **Offline detection.** Added `useOnlineStatus` hook wrapping `navigator.onLine` + browser `online`/`offline` events. `OfflineBanner` renders a sticky amber strip with a user-facing message whenever the browser loses connectivity; disappears automatically on reconnection. Mounted in `GameLayout`.

## 2026-05-22 — Tab navigation performance + theme stability

- **Instant tab switching.** Firestore `onSnapshot` subscription for recent activity logs is now held in a persistent Zustand store (`activityStore`) started once in `GameLayout`. Previously torn down and rebuilt on every page navigation, causing a visible loading flash on each tab switch. Inventory and quest stores gained a 30-second TTL cache matching the character store, so navigating back to a recently-visited tab skips redundant Firestore reads entirely.
- **Dark mode race condition fixed.** `useTheme` refactored into a single React context (`ThemeProvider`) with one shared state and one `MutationObserver`. Multiple independent hook instances were racing each other and causing toggles not to persist across component re-renders. SSR hydration mismatches in `ThemeToggle` and `SoundToggle` fixed with mounted-guard pattern.
- **Store cleanup on sign-out.** `useActivityStore`, `useQuestStore`, and `useInventoryStore` are now explicitly cleared on sign-out so no stale subscription or cached data leaks into a subsequent login session.
- **P2-3 cap indicator temporarily removed.** The daily-cap progress bar on the activity log form depended on `useRecentActivity(uid, 50)` — incompatible with the new store-backed hook that caps at 5 entries. Removed to unblock the architecture change; P2-3 remains in the backlog for a redesign using server-side daily totals.

## 2026-05-22 — Balance & engine fixes pass 4 (P0-3 daily combat XP cap — backlog cleared)

Closes **P0-3** and clears the final outstanding item from the post-MVP balance backlog. After today, the "Balance & engine fixes" section in CLAUDE.md is complete — focus shifts to the feature backlog (Achievements page → Reputation/Wanted Board → Champions → …).

- **P0-3 — Daily combat XP diminishing returns.** New `claimCombatVictory` Cloud Function in `functions/src/claimCombatVictory.ts` is now the authoritative path for awarding combat-win XP and gold. The CF counts the player's combat wins so far today (UTC day) via an aggregate query on `combatLogs` and applies a tiered multiplier to the XP before it lands on the character:
  - wins 1–9: **1.0×** (no penalty)
  - wins 10–19: **0.5×**
  - wins 20–29: **0.25×**
  - wins 30+: **0.1×** (floor)
- Gold is **never** diminished — only XP. Farming the same monster for gold to fund quest rerolls / dungeon entry fees stays viable; what gets nerfed is XP grinding through one-shot encounters.
- The CF reads + writes the character doc inside a single Firestore transaction (XP application, level-up bookkeeping, resource refill on level-up, `pendingStatPoints` stamping) and writes the combat log doc after the transaction with the final XP, multiplier, and `winsTodayAfter`. The combat log doc id is `${uid}_${idempotencyKey}` so network retries are safe — the second call either no-ops on the doc write or re-fetches the existing doc and returns the same result.
- Client wiring: `src/lib/functions.ts` gets a `claimCombatVictoryCF` wrapper; `src/types/cloudFunctions.ts` carries the shared input/output interfaces. The combat page (`src/app/(game)/combat/page.tsx`) calls the CF from `handleClaimRewards`, replacing the direct `addCombatLogDoc` + local `awardXpAndStats(xpReward)` sequence. `awardXpAndStats(finalXp, {})` runs after the CF returns so the in-memory store still mirrors the authoritative server award.
- **Player-facing transparency:** the combat page now fetches today's wins on mount (`fetchRecentCombatLogs` filtered by UTC day) and shows a "Daily combat XP" badge next to the Today's Encounters block — tinted emerald (no penalty), amber (within 5 wins of the next penalty), or rose (already at a reduced multiplier). On every claimed win the badge updates to the server-authoritative `winsTodayAfter`. When `multiplier < 1.0`, a toast warns "Daily combat XP at {N}% — win #{N} today".
- Two new pure helpers in `src/lib/gameLogic/combat.ts`:
  - `combatXpDailyMultiplier(winsToday)` — returns `1.0 | 0.5 | 0.25 | 0.1`
  - `combatWinsUntilNextPenalty(winsToday)` — returns `{ remaining, nextMultiplier } | null` for the badge copy
- **Parity safety.** The CF can't import client-side TypeScript path aliases, so `combatXpDailyMultiplier` is duplicated into `functions/src/gameLogic/combat.ts` with a prominent "PARITY" comment. A new test (`functions/src/__tests__/combatXp.test.ts`) imports both copies and asserts they agree for win counts 0–100. Pattern matches the existing `activityCaps-parity` and `achievements-parity` tests.
- Tests: 9 new client unit tests (5 cases for `combatXpDailyMultiplier`, 4 cases for `combatWinsUntilNextPenalty`) + 5 new function tests (CF logic + parity loop). 388 client tests + 21 function tests pass.
- CI: the existing CI step 16 deploys `claimCombatVictory` alongside `logActivity` and `claimDungeonRun` on master push when `functions/` files change — no workflow edit required.

## 2026-05-22 — Balance & engine fixes pass 3 (daily cap indicator)

- **P2-3 — Activity cap proximity indicator.** `ActivityLogForm` now subscribes to the last 50 activity logs (via `useRecentActivity`, count bumped from default 5 specifically for accurate same-day aggregation), computes today's total for the active tab via UTC-day filter, and shows a coloured cap meter above the input. Reads "Today: X / Y unit" + percentage; progress bar tints emerald → amber at 70% → rose when exhausted. When the cap is reached, the meter reads "⚠️ Daily cap reached for {activity}". Display-only — the Cloud Function still enforces the cap server-side.
- Two new helpers in `src/lib/gameLogic/activityCaps.ts`: `remainingCapacityForActivity(type, alreadyLogged)` and `dailyCapUsageFraction(type, alreadyLogged)`. Both pure functions, clamped to safe ranges. 7 new unit tests covering edge cases (no logs, mid-cap, exactly at cap, over-cap, negative inputs).
- **P1-6 — verified already complete.** Audit framing was outdated. `DungeonRun` already carries `currentHp` / `currentStamina` / `currentMagic` fields; `dungeonStore.advanceRoom()` persists them after each room; `bootstrap()` on the run page restores them from the persisted run; `enterRoom()` does **not** reset player resources. The "rooms reset HP" complaint is no longer accurate — resources carry over correctly.
- CLAUDE.md backlog updated: P1-6 and P2-3 closed. Only P0-3 (daily combat XP cap, requires a Cloud Function) remains in the balance backlog.

## 2026-05-22 — Balance & engine fixes pass 2 (quest reroll + mastery hint)

- **P1-3 / P2-4 — Quest reroll mechanic.** New `QUEST_REROLL_COST = 100` gold constant. `questStore.rerollQuest(questId)` validates the quest is active (not complete, not claimed), validates gold, picks a new quest from the appropriate pool excluding the player's currently-held questDefIds (no rolling back into the same quest or any other quest you already hold), and writes the replacement + gold deduction atomically. Each `QuestCard` now shows a "🎲 Reroll · 100 💰" button on active quests; disabled when the player can't afford it. Toast confirms the new quest name + gold spent. Plays the dice-roll sound from `useSound`.
- **P1-3 (dungeon entry fees)** — verified already deducted server-side via `dungeonStore.startRun()`. No change.
- **P2-1 — Mastery linked-stat hint.** ActivityLogForm now shows an inline indigo callout on workout/run/steps tabs: "Builds {Strength | Agility | Wisdom} mastery — every 5 → 15 → 25 logs grants +1 {stat}." Surfaces the activity → stat mapping right at the log site instead of only on the side panel.
- CLAUDE.md backlog updated with strike-throughs.

## 2026-05-22 — Balance & engine fixes pass 1

Knocks out the highest-leverage items from the post-MVP balance backlog (CLAUDE.md "Next priorities"). All changes are surgical — pure game-logic edits plus targeted unit tests.

- **P0-1 (verified, no change needed):** Audited monster counter-attack math. Already flat damage (`monster.attack − effectivePlayerDef`), uniform across all monsters. The audit's framing was outdated.
- **P0-2 / Monster XP scaling cliff:** New `monsterXpScaling(playerLevel, monsterLevel)` in `combat.ts` — top-tier monsters (level ≥ 8) give +8% XP per player-level over the monster, capped at 2.0×. Low-level mobs stay at base XP so grinding the Goblin Scout at level 20 never becomes optimal. Wired through `getStreakBoost` so the same multiplier reaches modal/toast/award call sites. Closes the cliff where the Ancient Dragon used to give flat 320 XP regardless of player level.
- **P1-1 / Quest XP scaler:** Swapped the coefficients on `scaleQuestRewards` from `0.6 + 0.4·√l` to `0.4 + 0.6·√l`. Anchor stays 1.0× at level 1; level-10 quest XP lifts from 1.86× → 2.30×, level-25 from 2.6× → 3.4×. Quests no longer fall behind combat XP at high levels.
- **P1-2 / Blessed streak XP:** Raised the Blessed-tier (30+ day streak) `xpMultiplier` from 1.25 → 1.5. The habit reward is now meaningfully larger than mid-tier streaks.
- **P1-4 / Fizzle stamina refund:** New `COMBAT.FIZZLE_STAMINA_REFUND = 5` constant. When an ability roll fizzles (no dice pattern matched), the player gets half the cost back instead of paying the full 10. Encourages tactical ability use without making abilities disposable.
- **P1-5 / Lich King:** New level-9 monster filling the gap between Dark Mage (L8) and Ancient Dragon (L10). HP 150, attack 28, defense 9, xp 220, gold 110. Necromancer-themed loot table (staff-of-ages, void-tome, necrotic-staff, specter-shroud, ring-of-wisdom, greater-magic-potion). Hand-authored silhouette in `silhouettes.tsx` (crowned skull with violet wisps), purple frame tint via the art system. ☠️ fallback emoji.
- **P2-2 / Wizard starting stats:** +2 starting health (6 → 8). The lowest-defense class needed a small HP cushion so early-game encounters aren't one-shot reset tickets.

Tests: 4 new `monsterXpScaling` cases + 2 updated existing tests (quest scaler at level 10, streak XP cap). 372 total tests pass.

## 2026-05-22 — Custom art system (heraldic crests + brand refresh)

- New `EntityArt` primitive (`src/components/art/EntityArt.tsx`) — single render path for every game-entity portrait. Renders a hand-authored SVG silhouette inside a `HeraldicFrame`, falling back to the supplied emoji if no silhouette is registered. Supports `monster | class | subclass | ability | spell | activity | achievement | dungeon | item` categories, `xs | sm | md | lg | xl` sizes, and per-category default tints + frame shapes.
- `HeraldicFrame` (`src/components/art/HeraldicFrame.tsx`) — shield / sigil / medallion shapes with twelve tint variants and matched light + dark gradients. Inner figure paints via `currentColor`, so silhouettes auto-tint with the theme.
- Hand-authored silhouettes (`src/components/art/silhouettes.tsx`) cover the full catalog: 10 monsters, 3 classes, 6 subclasses, 15 abilities, 9 effect-tier spells, 6 activities, 6 achievements, 4 dungeon tiers, and 4 item-type defaults. Zero third-party assets — all SVG primitives in code.
- Helpers (`src/lib/entityArt.ts`): `spellEffectKey(effect)` maps a SpellEffect to the right effect-tier silhouette; `rarityTint(rarity)` maps loot rarity to frame tint.
- `BrandMark` (`src/components/ui/BrandMark.tsx`) — FitQuest crest + Cinzel wordmark used in the game header (`size={28}`) and auth screens (`size={56}`). Replaces the text-only "FitQuest" anchors.
- PWA icons refreshed: the placeholder sword on a flat indigo→violet square is now a proper shield-with-sword crest. Master SVG at `public/icons/icon.svg`; PNG variants (16 / 32 / 180 / 192 / 512 + maskable 192 / 512) regenerated from it.
- Wired into high-visibility callsites: combat arena (player class portrait + monster portrait), monster select cards, `BattleResultsModal`, `SpellCard` (effect-tier sigil), profile achievement gallery, dungeon lobby tier cards, stats page personal-record cards, `CharacterCard` (class portrait with level badge overlay), `LevelUpCelebration`, `ClassSelector` (character-creation), `SubclassModal`. Every callsite passes `fallbackEmoji` so no UI ever shows a broken slot.
- New doc: [docs/ART-ASSETS.md](ART-ASSETS.md) — how to add silhouettes, replace with commissioned art, regenerate PWA PNGs, and the future-work plan for animated assets.

## 2026-05-22 — Design token overhaul (UI pass 9 — last roadmap item)

- CSS variable-backed semantic color tokens in `src/app/globals.css`:
  - `--surface`, `--surface-elevated`, `--surface-muted`, `--surface-inverse`
  - `--border-subtle`, `--border-default`, `--border-strong`
  - `--text-primary`, `--text-secondary`, `--text-muted`, `--text-faint`, `--text-disabled`
  - `--accent-primary`, `--accent-primary-hover`, `--accent-secondary`
  - Defined twice (light in `:root`, dark in `.dark`) so the entire palette swaps automatically with the theme toggle.
- Exposed in `tailwind.config.ts` via `theme.extend.colors` so every utility (`bg-*`, `text-*`, `border-*`) reaches the tokens by name.
- Custom shadow scale: `shadow-card`, `shadow-card-hover`, `shadow-elevated`, `shadow-glow-uncommon`, `shadow-glow-rare`, `shadow-glow-epic`, `shadow-glow-legendary`. Named radii: `rounded-card` (xl), `rounded-cinematic` (2xl).
- Foundational primitives migrated to the new tokens — one edit to the variable now cascades through every consumer:
  - `Card` — `default` and `flat` variants use `bg-surface border-border-default shadow-card`. Hover state uses `shadow-card-hover`. Legendary variant uses `shadow-glow-legendary`. Outer radius uses `rounded-card`.
  - `Heading` — all four levels use `text-text-primary` / `text-text-muted` (no more paired `dark:` literals).
  - `EmptyState` — title/description/CTA use `text-text-secondary` / `text-text-muted` / `text-accent-primary`.
  - `Button` — `secondary` and `ghost` variants use `bg-surface`, `text-text-primary`, `border-border-strong`, `text-text-secondary`. `primary` keeps its bespoke indigo gradient so the action affordance reads as branded.
- The four primitives now drive the look of every game screen through composition — `Card` alone is mounted at 16+ sites. Inline `bg-white dark:bg-slate-900` etc. still exist on legacy markup; they'll migrate naturally as features touch each file. The token system is the contract for new work.
- This was the last item on `docs/UI-UX-MODERNIZATION.md`. Every item from the original ui-critic audit is now ✅.

## 2026-05-22 — Combat scene redesign (UI pass 8)

- New `CombatArena` component (`src/components/combat/CombatArena.tsx`) — side-by-side player vs monster portraits with HP bars under each. Replaces the 3-stacked-HP-bars block in `combat/page.tsx` that read like an admin form.
- Player avatar: class emoji (Warrior ⚔️ / Wizard 🧙 / Rogue 🗡️) in an indigo→violet ring frame on the left, with HP + defense readout below.
- Monster avatar: monster emoji in a rose ring frame on the right, mirrored to face the player. Pity / hunting tracker sits as a sub-line under the HP bar.
- Per-side hit shake — when fresh damage arrives, the player or monster portrait rocks via framer-motion with a re-keyed animation. HP bars use a spring tween (200/26) instead of the previous linear `transition-all`. Low-HP (≤30%) portraits gently pulse; fainted portraits grayscale.
- `CombatEffects` floating damage numbers (already positioned to left/right per `burst.target`) now overlay the appropriate side of the new arena view.
- Stamina + Magic stay in a smaller secondary card below the arena so the arena view is the unmistakable focal point.
- Monster select cards: difficulty-tiered borders + glow (emerald = easy, amber = fair, rose = hard). Hard fights now visibly pop instead of looking identical to easy fights.
- This was the last large-scope item from `docs/UI-UX-MODERNIZATION.md`. Only the design-token overhaul remains.

## 2026-05-22 — Illustrated route backgrounds (UI pass 7)

- New `RouteBackground` component (`src/components/ui/RouteBackground.tsx`) reads the current pathname and paints a per-route gradient + inline SVG pattern behind all content. Mount lives in `(game)/layout.tsx`; game layout's outer div dropped its solid `bg-gray-50` / `dark:bg-slate-950` so the gradient is visible (body keeps the fallback color).
- Nine themed schemes:
  - **Dashboard** — indigo→violet gradient + compass-rose pattern (town-square feel)
  - **Character** — amber/stone gradient + scroll pattern (sigil sheet feel)
  - **Activities** — sky→emerald gradient + sunburst rays (dawn / morning workout)
  - **Combat** — rose→slate gradient + colosseum-arch pattern + radial vignette darkening (arena feel)
  - **Quests** — amber/yellow gradient + scroll pattern (parchment ledger)
  - **Inventory** — stone→amber gradient + crosshatch pattern (leather satchel)
  - **Shop** — amber→orange gradient + wood-grain pattern (warm shopkeeper feel)
  - **Stats** — slate→indigo gradient + grid pattern (graph paper)
  - **Profile** — indigo gradient + sigil pattern (player crest)
- Theme-aware via Tailwind `currentColor` — patterns swap stroke color with the light/dark toggle and gradient stops have explicit light + dark variants.
- New `bg-radial-vignette` utility in `globals.css` (light + dark variants) — used only on combat for the boss-room feel.
- Zero asset pipeline: pure CSS gradients + inline SVG with `patternUnits="userSpaceOnUse"` tiling. No bundle bloat, no image requests, fully scalable.
- Dungeons keep their dedicated `bg-slate-900` aesthetic — RouteBackground no-ops on `/combat/dungeons*`.

## 2026-05-22 — Sound design (UI pass 6)

- `src/lib/sounds.ts` — Web Audio API synth functions (zero bundle cost, no licensing). Generates retro-RPG audio on the fly via oscillators + noise buffers + ADSR envelopes. 15 recipes: `playClick`, `playDiceRoll`, `playAttack`, `playMagic`, `playHit`, `playCrit`, `playFail`, `playClaim`, `playLoot`, `playLevelUp`, `playVictory`, `playLegendary`, `playAchievement`, `playStreak`, `playPersonalRecord`.
- `useSound` hook (`src/hooks/useSound.ts`) — manages enabled state in localStorage (`fitquest-sound-enabled`), defaults OFF so first-time visitors aren't ambushed. Unlocks Web Audio on the user gesture that turns sound on (satisfies Chrome/Safari autoplay policy). Vanilla `playSound(key)` export lets non-hook code (toast helpers) fire sounds without a React tree.
- `SoundToggle` (`src/components/ui/SoundToggle.tsx`) — icon + full label variants, sits next to the theme toggle in `/profile`. Plays a confirmation chime on enable so the user knows it's wired up.
- Sounds wired across the game:
  - Combat: dice-rattle on every roll overlay open (attack/magic/ability/spell), defeat sting on `outcome === 'loss'`, victory fanfare on pending rewards (escalates to legendary fanfare when legendary loot dropped), claim chime on rewards-claim button.
  - Dungeon clear: victory or legendary fanfare based on legendary eligibility.
  - Level-up celebration: heroic arpeggio.
  - Quest claim: chime + scaled confetti.
  - Toast helpers (now auto-play): `toastLoot` (loot or legendary), `toastAchievement`, `toastStreakTier`, `toastPersonalRecord`, `toastMasteryMilestone`.

## 2026-05-22 — PWA install support (UI pass 5)

- `src/app/manifest.ts` declares the web app manifest via Next.js's metadata API. Stand-alone display, indigo→violet theme colors, dark `background_color` matching the new dark-mode shell.
- Icon set in `public/icons/`: 192/512 `any` variants, 192/512 `maskable` variants (content scaled to 80% safe zone for Android adaptive icons), Apple touch icon (180×180), 16/32 favicons, and a vector source for resolution-independent display. Initial art is a placeholder sword on the brand gradient — easy to replace with bespoke icons later.
- Root layout: light/dark `theme-color` meta tags via the Next.js `Viewport` export so the browser chrome (URL bar / iOS status bar) matches the active theme.
- Apple PWA meta: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, custom title.
- `useInstallPrompt` hook (`src/hooks/useInstallPrompt.ts`) abstracts the `beforeinstallprompt` event, detects iOS (where the event doesn't fire), and detects already-installed standalone mode. Returns `available | ios | installed | unsupported`.
- `InstallAppButton` (`src/components/ui/InstallAppButton.tsx`) renders the right affordance per platform — native install button on Chrome/Android, Share→Add-to-Home-Screen hint on iOS, "Installed" badge once on home screen, nothing on unsupported. Wired into a new Install App card on `/profile`.
- `InstallBanner` (`src/components/ui/InstallBanner.tsx`) is a dismissible bottom-of-screen prompt that appears 12 s after the player loads the game layout if their browser supports install. Dismissal is persisted to localStorage so it doesn't nag.
- Service-worker offline caching + push notifications still TODO — see `docs/UI-UX-MODERNIZATION.md` for the next-step plan.

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

<!-- CI trigger -->

<!-- CI trigger -->

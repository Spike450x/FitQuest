# FitQuest — Bugs & Enhancements Backlog

> Sourced from player report (2026-05-24). Root causes identified where code was inspectable.
> Items are grouped by category and prioritized: **Critical** → **High** → **Medium** → **Enhancement**.

---

## Bugs

### B1 — Quest Reroll: `extraProgress: undefined` causes Firestore crash

**Status:** SHIPPED 2026-05-25. `src/store/questStore.ts` now uses `deleteField()` in the Firestore payload; local Zustand state still uses `undefined`. Regression tests in `src/store/__tests__/questStore.test.ts` cover both branches.

**Severity:** Critical — rerolling any quest that transitions to one without `extraTargets` is broken.

**Symptoms:** Console shows `FirebaseError: Function updateDoc() called with invalid data. Unsupported field value: undefined (found in field extraProgress in document activeQuests/<id>)`.

**Root cause (confirmed):** `src/store/questStore.ts:343,360` — when the newly-rolled quest has no `extraTargets`, the code assigns `extraProgress: undefined` to the Firestore payload. Firestore's `updateDoc` rejects `undefined` field values entirely.

```ts
// Current (broken for no-extraTargets quests):
extraProgress: pick.extraTargets ? {} : undefined,

// Fix: use deleteField() to explicitly remove the field
import { deleteField } from 'firebase/firestore';
extraProgress: pick.extraTargets ? {} : deleteField(),
```

**Files to change:** `src/store/questStore.ts` (two call sites: the `updateActiveQuestDoc` payload at line 343, and the local store `set()` update at line 360 — the latter can stay `undefined` for the local Zustand state since that's valid JS, only the Firestore payload needs `deleteField()`).

---

### B2 — Log Activity: FirebaseError "internal" on all submissions

**Status:** PARTIALLY ADDRESSED 2026-05-25. The Cloud Function now wraps its body in try/catch and re-throws unhandled errors as `HttpsError('internal', err.message)`, making the actual failure visible in the browser console. Root cause of the original "internal" error (deploy/IAM/index/server crash) still requires `firebase functions:log --only logActivity` to diagnose definitively — code inspection found no obvious crash path.

**Severity:** Critical — players cannot log any workout, run, steps, nutrition, sleep, or water.

**Symptoms:** Clicking submit on the Activity Log form results in a `FirebaseError: internal` in the console. No activity is saved.

**Root cause (suspected):** The `logActivity` Cloud Function exists in source (`functions/src/index.ts:77`) and was previously listed as shipped, but the "internal" error code from Firebase Functions typically indicates one of:

1. **Function not deployed** — the Cloud Function is not live in the `fitness-rpg-claude` project (most common cause if this has never worked).
2. **IAM / invoker permissions** — the function requires `invoker: 'public'` in its config but the `allUsers` Cloud Run invoker binding may be missing (a similar issue was fixed for `logActivity` CORS in a previous sprint).
3. **Server-side crash** — an unhandled exception inside the function body returns a generic "internal" error to the client.

**Investigation steps:**

- Check the Firebase console → Functions → `logActivity` to confirm it exists and its last deployment date.
- Run `firebase functions:log --only logActivity` to see server-side error detail.
- Confirm `allUsers` has the `roles/run.invoker` binding on the `logActivity` function (same as the fix applied in commit `93572cd`).
- Confirm the CSP `connect-src` includes `https://*.cloudfunctions.net` (fixed in a prior sprint — verify it wasn't reverted).

**Files likely involved:** `functions/src/index.ts`, `.github/workflows/` (CI deploy step for functions), `next.config.ts` (CSP headers).

---

### B3 — Dungeon Victory: "Claim Rewards" button does nothing

**Status:** SHIPPED 2026-05-25. All three dungeon claim handlers now have `catch` blocks that show `toast.error(…)` when the Cloud Function call fails. Previously the missing catch caused errors to be swallowed silently, re-enabling the button with no feedback.

**Severity:** High — completing a dungeon boss does not advance to reward screen.

**Symptoms:** After defeating the final boss, the victory screen renders with the "Claim Rewards" button. Clicking produces no visible response — no loading indicator, no navigation, no error toast. No console errors observed.

**Root cause (suspected):** `handleClaimVictory` (`src/app/(game)/combat/dungeons/run/page.tsx:781`) calls `claimDungeonRunCF`. If that Cloud Function fails silently (e.g., same deployment / IAM issue as B2), the `try` block throws, the `finally` resets `claiming` to `false`, but no toast surfaces the error and the route never changes — leaving the button visually re-enabled but functionally broken. The user can only leave via the browser back button, which surfaces loot already accumulated from earlier rooms.

**Note:** This may be fully explained by B2 (functions not deployed / IAM issue). Fixing B2's deployment should be the first step before further investigation here.

**Files to check:** `src/app/(game)/combat/dungeons/run/page.tsx:781–813`, `src/lib/functions.ts`, Cloud Function deployment.

---

### B4 — Shop Overcharge: item costs more gold than displayed price

**Status:** SHIPPED 2026-05-25. `inventoryStore.buyItem` now calls `refreshPlayerState(uid)` (new `src/lib/refreshPlayerState.ts`) after the transaction instead of applying a local gold delta. All 4 dungeon claim call sites in `src/app/(game)/combat/dungeons/run/page.tsx` also migrated to `refreshPlayerState`. `useCharacterStore` import removed from the dungeon run page (no longer needed directly).

**Severity:** High — players lose more gold than the listed price implies.

**Symptoms:** Player buys an item; the gold deducted visually after purchase is larger than the item's displayed price.

**Root cause (suspected):** `src/lib/inventoryData.ts:60` — `runBuyItemTransaction` is a Firestore transaction that reads the _server-side_ gold balance and deducts `price` from it. The client-side gold update after the transaction uses `character.gold - def.price` against the _local store's_ (potentially stale) gold snapshot:

```ts
// inventoryStore.ts:164 — deducts from possibly-stale local gold
useCharacterStore.setState((state) => ({
  character: state.character
    ? { ...state.character, gold: state.character.gold - def.price }
    : null,
}));
```

If the local gold is stale (higher than the real Firestore balance), the displayed post-purchase gold drops more than `def.price`. The transaction itself charges the correct price — the bug is a _display_ discrepancy, not an actual overcharge. A force-refresh of the character doc after purchase would resolve the UI desync.

**Fix:** After `runBuyItemTransaction` resolves, call `fetchCharacter(uid, true)` to pull the authoritative balance instead of relying on the local delta.

**Files to change:** `src/store/inventoryStore.ts:149–175`.

---

### B5 — Stat Item: equipping a +HP item also raises current HP

**Status:** SHIPPED 2026-05-25. `computeGearDelta` in `src/store/inventoryStore.ts` now applies DQ1/DQ2: equipping gear leaves `currentHp`/`currentStamina` unchanged (only max rises); unequipping clamps current down to the new lower max if needed.

**Severity:** Medium — design inconsistency / player confusion.

**Symptoms:** Equipping gear with a health bonus raises both `currentHp` and `maxHp` by the item's HP delta. Most RPGs only raise `maxHp` when equipping gear.

**Root cause (confirmed):** `src/store/inventoryStore.ts:99–104` — `computeGearDelta` intentionally applies the HP delta to `currentHp`:

```ts
newCurrentHp = Math.max(1, Math.min((character.currentHp ?? oldMaxHp) + hpDelta, newMaxHp));
```

**Design resolution needed:** Two valid options —

- **Option A (current behavior):** Equipping gear "fills" HP by the bonus amount (feels like a quick heal; common in some ARPGs). The user finds this unintuitive.
- **Option B (proposed):** Equipping gear only raises `maxHp`; `currentHp` is unchanged. Unequipping lowers `maxHp` and _clamps_ `currentHp` to the new lower max if necessary. This is the standard RPG expectation.

**Recommendation:** Go with Option B for health. For stamina and magic the current behavior (delta applied to current) is less objectionable since those resources regenerate freely between combat — but it should be consistent.

**Files to change:** `src/store/inventoryStore.ts:80–118` (`computeGearDelta`).

---

### B6 — Stamina Item: +1 stamina stat reads as +5 current stamina

**Status:** SHIPPED 2026-05-25 (resolved by B5 fix). B5's `computeGearDelta` change means `currentStamina` no longer jumps on equip; only `maxStamina` changes. The +5 delta is the correct formula output for +1 stamina stat (STAMINA_PER_STAT = 5) — now displayed only as a max increase, not a current-resource jump, so the confusion is eliminated.

**Severity:** Low / likely not a bug.

**Symptoms:** Equipping a +1 stamina item appears to give +5 stamina points instead of +1.

**Root cause (expected formula behavior):** `playerMaxStamina` applies a multiplier to the stamina stat (formula is `base + stat * STAMINA_PER_STAT`). If `STAMINA_PER_STAT = 5`, a +1 stat item legitimately yields +5 max stamina — which is correct and intentional. The issue is the same B5 mechanic: `currentStamina` also increases by the full delta (+5), making it _look_ like +5 points were added rather than +1 stat.

**Recommendation:** Verify the stamina formula constant is correct, then add a tooltip or item card annotation that shows "**+1 Stamina** _(+5 max Stamina)_" so the stat-to-resource conversion is transparent to the player. If B5's fix (Option B) is applied to stamina, this display confusion goes away entirely since `currentStamina` would no longer jump on equip.

**Files to check:** `src/lib/gameLogic/combat.ts` (`playerMaxStamina`, `STAMINA_PER_STAT`), `src/store/inventoryStore.ts:106–114`.

---

### B7 — Quest Page: daily and weekly card columns misalign

**Severity:** Medium — visual polish issue on desktop.

**Symptoms:** On the quests page (≥ md breakpoint), daily and weekly quests are shown side-by-side in a two-column grid. Weekly quests that have multiple progress criteria (`extraTargets`) render taller cards than single-bar daily quests. Because each column stacks cards independently (`space-y-3`), the vertical positions of cards in each column drift apart as you scroll — the layout looks misaligned.

**Root cause (confirmed):** `src/app/(game)/quests/page.tsx:380` — the outer container uses `grid grid-cols-1 md:grid-cols-2 gap-6`. There's no cross-column card alignment mechanism; each `QuestSection` is a free-standing flex column so card heights are entirely independent.

**Fix options:**

- **Option A (recommended) — tab switcher:** Replace the two-column grid with a `Daily | Weekly` tab UI on all viewports. Each tab shows its quest list at full width. Eliminates the alignment problem entirely, improves mobile legibility, and is the standard pattern for this type of content. Side-by-side columns in a narrow single-pane app feel cramped; tabs feel intentional.
- **Option B — CSS Subgrid:** Keep the two-column layout but use `display: subgrid` on the inner cards so card rows snap to a shared row track. Requires the parent grid to define explicit row tracks, which is complex given variable card heights.
- **Option C — equal-height stretch:** Add `items-stretch` to the grid and `h-full` to each `QuestSection`. Cards within each column won't align to each other, but the two column boxes will at least be the same height. Doesn't fix individual card misalignment.

**Files to change:** `src/app/(game)/quests/page.tsx:358–406`.

---

### B8 — Spell Overlay: monster counter-attack dice not shown

**Severity:** Medium — creates inconsistency with regular and ability attack flows.

**Symptoms:** When casting a spell, the `SpellRollOverlay` shows the spell's dice roll and announces Hit or Fizzle. The player then taps "Continue" and monster damage is silently applied — there are no dice shown for the monster's attack, no roll animation, no moment of tension. In contrast, a regular Attack shows the monster's `monsterRoll` (d10) visibly in the `ActionRollOverlay`. The spell flow feels abrupt and opaque.

**Root cause (confirmed):** `src/lib/gameLogic/spells.ts:146` — `resolveSpell` calls `rollD10()` internally for the monster counter-attack, and the result is buried in `SpellResolution.monsterDamage`. `SpellRollOverlay` (`src/components/combat/overlays/SpellRollOverlay.tsx`) receives `dice` (spell dice only) and `requirementMet` but never receives the monster's roll value. The monster dice are not passed through the overlay pipeline.

**Fix:** Thread the monster roll value through `SpellResolution` → `ActionResolution` → `SpellRollOverlay` props, then render a compact "Monster strikes back" panel below the spell result — mirroring how `ActionRollOverlay` renders the enemy counter-attack section. If the spell stuns the monster, show "Monster stunned — no counter" instead.

**Files to change:** `src/lib/gameLogic/spells.ts` (expose `monsterRoll` in `SpellResolution`), `src/lib/gameLogic/combatActions.ts` (thread it into `ActionResolution`), `src/components/combat/overlays/SpellRollOverlay.tsx` (add monster attack panel), both combat pages that render the overlay.

---

### B9 — Combat: nav menu allows escape from active fight

**Status:** SHIPPED 2026-05-25. New `src/store/combatStore.ts` (`combatActive` boolean + `setCombatActive`/`clear`). Arena page sets the flag when `activeMonster !== null && !pendingRewards`; dungeon run page sets it when `phase === 'combat' || phase === 'boss'`. Both pages register a `beforeunload` guard while the flag is true. Layout's `CombatSafeLink` wraps both desktop sidebar and mobile bottom-nav links — fires a toast instead of navigating when `combatActive`. `handleSignOut` now flushes `combatStore`.

**Severity:** High — players can abandon a fight mid-round with no consequence by tapping any nav item, and dungeon runs are left in an orphaned `active` state in Firestore.

**Symptoms:** During an active arena or dungeon combat encounter, all sidebar links (desktop) and all bottom nav items (mobile) remain fully clickable. Navigating away mid-fight causes:

- Arena: fight state is discarded silently (no XP loss, but also no death penalty — fight just disappears).
- Dungeon: `dungeonStore.activeRun` persists with `status: 'active'` in Firestore. On return the run resumes, but any in-round state (buffs, queued actions, rolling overlays) is gone and the player may find themselves mid-round with an inconsistent UI.

**Root cause (confirmed):** `src/app/(game)/layout.tsx:196–219` (sidebar) and `layout.tsx:235–259` (mobile bottom nav) render plain Next.js `<Link>` components with no combat-awareness. No `beforeunload` handler, no route guard, no combat-active signal exists anywhere in the layout or the combat pages.

**Fix — two-part:**

**Part 1 — nav lock during combat:**

- Add a `combatActive` flag to a small Zustand slice (or extend `dungeonStore`). Arena combat page sets `combatActive = true` on mount, `false` on unmount or after a final outcome (win/lose/flee). Dungeon run page uses `activeRun !== null` as its source of truth (already available in `dungeonStore`).
- In the layout, read `combatActive`. When true, replace each nav `<Link>` with a `<button>` that fires a toast: _"You're in combat — win, lose, or flee first."_ Keep the active route link functional (so the player can still interact with the current combat page).
- The sidebar collapse toggle and the sign-out button are fine to leave functional.

**Part 2 — tab/window close guard:**

- In both combat pages, add a `beforeunload` event listener when a fight is active. This triggers the browser's native "Leave page?" dialog if the player closes the tab or navigates via the URL bar, catching the case the nav lock doesn't cover.

```ts
useEffect(() => {
  if (!fightInProgress) return;
  const handler = (e: BeforeUnloadEvent) => {
    e.preventDefault();
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [fightInProgress]);
```

**Files to change:** `src/app/(game)/layout.tsx` (read combat flag, conditional nav rendering), `src/store/` (new `combatActive` flag — either a new `combatStore.ts` or extend `dungeonStore.ts`), `src/app/(game)/combat/page.tsx` (set flag on mount/unmount + `beforeunload`), `src/app/(game)/combat/dungeons/run/page.tsx` (set flag + `beforeunload`).

---

## Enhancements

### E1 — Dungeon Stat Check: add RPG narrative flavor before options

**Priority:** High — missing player immersion context.

**Current state:** When a stat-check room is entered, the UI immediately renders three button options ("Force the door — STR · Need 12 · You have 9", etc.) with only a generic header: _"Choose your path. Passing requires meeting the stat threshold."_

**Desired state:** Before showing the options, display a short RPG narrative prompt that contextualizes _why_ a stat check is happening. Examples:

- A locked iron gate with a warning inscription → STR check to force it, WIS check to read the runes for a clue
- A narrow ledge over a chasm → AGI check to cross, STR check to climb
- A magical ward blocking passage → WIS check to dispel it

**Design spec:**

- Each dungeon tier (Goblin Caves, Spider Lair, Dark Sanctum, Dragon's Keep) should have a thematic flavor pool — 2–4 scenarios per tier.
- Scenario is seeded deterministically from `run.currentRoom * 100 + run.weekSeed` (same seed already used for `resolveStatCheckOptions`).
- Display: a short 2–3 sentence description paragraph above the choice buttons; optionally a small icon/color for the scenario type.
- The scenario description should hint at which stat is likely useful without spelling it out (the player sees the options below).

**Files to change:** `src/lib/gameLogic/dungeons.ts` (add `STAT_CHECK_SCENARIOS` data and a `resolveStatCheckFlavor()` helper), `src/app/(game)/combat/dungeons/run/page.tsx:1050–1116` (render flavor text above option buttons).

---

### E2 — Emoji → Custom Art: dashboard, character sheet, and activity icons

**Priority:** High — visual consistency with the rest of the UI.

**Current state:** Several locations still use emoji as visual anchors:

- `src/app/(game)/dashboard/page.tsx:26–30` — quick action buttons: `📋` `🐉` `📜` `🏪`
- `src/app/(game)/dashboard/page.tsx:33–36` — stat bars: `⚔️` `🧠` `🌬️`
- Character sheet stat display (same icons as dashboard)
- Activity type chips in the activity log and recent activity feed

**Approach:** Each use case needs a different treatment:

| Location                 | Recommended replacement                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Dashboard action buttons | Small SVG icons in a consistent style (sword, skull, scroll, coin-pouch). Keep 24×24, add to `src/components/art/`  |
| Stat icons (STR/WIS/AGI) | Per-stat SVG glyphs — sword blade (STR), open eye (WIS), wind spiral (AGI). Should look like a game HUD             |
| Activity type icons      | Reuse or extend `getActivityIcon()` in `src/lib/activityIcons.ts` to return SVG components instead of emoji strings |

**Note:** The `EntityArt` heraldic system (portraits, item silhouettes) is for cards and large-format displays; stat/action icons are a separate, smaller-format need. Purpose-built 20–24px SVG glyphs are the right choice here.

**Files to change:** `src/lib/activityIcons.ts`, `src/app/(game)/dashboard/page.tsx`, `src/app/(game)/character/page.tsx`, new `src/components/art/stat-icons.tsx` and `src/components/art/action-icons.tsx`.

---

### E3 — Spells: fix light-mode readability and hover shimmer artifact

**Priority:** Medium — cosmetic regression in light mode.

**Issues:**

1. Some spell cards have text or elements that are unreadable in light mode (insufficient contrast on card surfaces / borders).
2. The `PremiumSpellCard` hover-tilt shimmer (`mix-blend-mode: screen`) produces a slight white/light background artifact in light mode — the screen blend mode bleaches against light surfaces. Works correctly on dark backgrounds.

**Fix for shimmer:**

- Detect color scheme and switch `mix-blend-mode` to `overlay` in light mode (preserves the rainbow shimmer while avoiding bleaching).
- Or gate the shimmer overlay with `dark:block hidden` / `dark:hidden block` class pairs, using a `multiply` blend for light mode.

**Files to change:** `src/components/spells/PremiumSpellCard.tsx`, spell card CSS/Tailwind variants.

---

### E4 — Shop: rotate/paginate spells instead of displaying all

**Priority:** Medium — UX parity with how gear items are shown.

**Current state:** The spell section of the shop renders the entire spell catalog at once (all 21 spells listed).

**Desired state:** Show a rotating subset of spells — similar to how the gear shop rotates items. Suggested behavior:

- Display 3–5 spells at a time, seeded weekly (same week-seed pattern used elsewhere in the game).
- "Refresh" / "Restock" mechanic possible in a future update (ties into the Reputation / Wanted Board roadmap).
- Remaining spells should still be discoverable — a "Browse All" collapsed section or a separate Spellbook/Arcanist NPC page would work.

**Files to change:** `src/app/(game)/shop/page.tsx`, possibly a new `src/lib/gameLogic/shopRotation.ts` helper.

---

### E5 — Spell Casting: "top card" mechanic with charge-based consumption

**Priority:** Medium — significant game-feel and risk/reward change.

**Design spec (confirmed with player):**

- Spells have a charge count (e.g., 3 charges per spell by default; higher-rarity spells could have more).
- When casting in combat, the spell cast is **randomly selected** from the player's equipped spell loadout (not player-chosen) — simulates drawing from the top of a deck.
- Each cast consumes one charge from that spell. When all charges are spent, the spell is removed from the active loadout for that session.
- Charges replenish on some trigger (e.g., rest at a dungeon Rest Site, end of a combat session, or a new day — TBD; see Design Questions below).
- The "Cast Spell" action button should communicate: which spell will be drawn (unknown until cast), how many charges remain per spell, and that the outcome is random.

**Design questions to resolve before implementing:**

1. **When do charges replenish?** Options: (a) after every combat encounter, (b) at dungeon Rest Sites only, (c) daily reset, (d) never (must re-equip from inventory). Recommendation: (a) restores after every fight for the arena, (b) only at rest sites during dungeon runs — this makes dungeons meaningfully riskier without making arena unplayable.
2. **Charge count per spell:** Fixed (3 per spell) or tied to rarity (Common=2, Uncommon=3, Rare=4, Epic=5, Legendary=6)?
3. **"Draw" UX:** Should the player see a brief card-flip animation revealing which spell was drawn before it resolves? Or is the spell revealed only via the spell name in the battle log?

**Data model impact:**

- Add `charges: number` and `maxCharges: number` to `InventoryItem` (spells only) — or store as a transient combat state (preferred if charges always reset between fights in arena).
- If charges persist across fights in dungeons, they need to live on `DungeonRun` state.

**Files to change:** `src/types/index.ts`, `src/hooks/useCombatEncounter.ts`, `src/components/combat/CombatActionBar.tsx`, `src/app/(game)/combat/dungeons/run/page.tsx`, `src/lib/gameLogic/spells.ts`.

---

### E6 — Inventory: use consumables (potions) outside of combat

**Priority:** Medium — QoL for pre-combat preparation.

**Current state:** Consumable items (health potions, stamina potions, etc.) can only be used during active combat via the "Use Item" action.

**Desired state:** From the Inventory page, a consumable card should show a "Use" button that applies the item's effect immediately to the player's current HP/Stamina/Magic. The item is consumed (quantity decremented or item removed from inventory).

**Rules:**

- Cannot use consumables during an active dungeon run from the inventory page (would bypass dungeon resource risk). Block with a toast: _"You can't use items outside the dungeon from here during an active run."_
- Arena combat pages already support in-combat use — this adds only the out-of-combat case.

**Data model:** No schema change needed — consumable use just calls the existing `updateCharacterDoc` + `updateInventoryDoc` pattern.

**Files to change:** `src/app/(game)/inventory/page.tsx`, `src/store/inventoryStore.ts` (add `useConsumable` action), `src/lib/gameLogic/items.ts` (ensure consumable effect resolver is accessible outside the combat hook).

---

### E7 — Spell Casting: visual impact animation and school-based sound

**Priority:** High — casting a spell should feel meaningfully different from a normal attack; currently it resolves identically to a basic hit with only text changing.

**Confirmed desired additions (player):** (1) a visual impact effect when the spell lands, and (2) school-themed sound effects per spell type.

**Visual impact spec:**

- On a successful cast, trigger a brief school-tinted flash overlay on the monster portrait (or the full combat arena): fire/lightning/damage spells → red-orange burst; ice/stun → blue-white pulse; heal → green ripple; lifesteal → purple drain shimmer.
- A subtle screen shake (2–3 px, ~150 ms) on high-damage or Legendary rarity casts would add weight.
- The overlay can be CSS-only — a `div` with a tinted background that fades out via `opacity: 0` transition in ~300 ms. No canvas or third-party animation library needed.
- On a fizzle, play a quiet "poof" dissipation effect (grey fade-out).

**Sound spec — school mapping:**

| Spell effect                        | Sound                                                      |
| ----------------------------------- | ---------------------------------------------------------- |
| Damage (fire / lightning / generic) | Sharp crack / crackle — distinct from the diceSettle sound |
| Damage + bypass DEF                 | Heavy impact thud                                          |
| Heal                                | Soft ascending chime                                       |
| Stun                                | Metallic clang / disruption chord                          |
| Lifesteal                           | Low "drain" pulse                                          |
| Defense boost                       | Brief shield-ring                                          |
| Fizzle                              | Soft poof / dissipation                                    |

**Data model:** No schema change needed. The existing `spellEffectKey()` function in `src/lib/entityArt.ts:10` already maps spell effects to visual categories — reuse it as the routing key for both flash color and sound ID.

**Files to change:** `src/hooks/useSound.ts` (add spell-sound IDs), `public/sounds/` (add audio files), `src/components/combat/overlays/SpellRollOverlay.tsx` (trigger flash + sound on result reveal), `src/components/combat/CombatArena.tsx` or similar (flash overlay layer).

---

### E8 — Combat Abilities: expose damage formula breakdown in UI

**Priority:** Medium — players can't evaluate ability choices without knowing what the multiplier acts on.

**The actual formula (for reference and in-game display):**

Regular attack:

```text
playerDamage = max(1, d10_roll + statBonus + gearBonus − monster.defense)
  where statBonus = floor(STR × 1.0) for warrior/ranger
                  = floor(WIS × 1.0) for wizard
        gearBonus = equipped weapon attack bonus
```

Ability roll (Roll Ability — 6d6):

```text
baseHit      = round(avg of 6d6) + statBonus + gearBonus
rawDamage    = round(baseHit × abilityMultiplier × extraMultiplier)
playerDamage = max(1, rawDamage − monster.defense)    ← unless bypassMonsterDef
  where abilityMultiplier = e.g. 1.5× for Power Strike, 2.5× for Time Warp
        extraMultiplier   = 1.0 normally; 2.0 for Assassin Lethal Opener (first ability)
```

So "1.5× damage" means the multiplier is applied to **the sum of your dice average + stat bonus + weapon bonus**, then monster DEF is subtracted. A warrior with STR 15, a +6 weapon, and an avg roll of 3.5 has a `baseHit` of 24.5 → `round(24.5 × 1.5)` = 37 raw → 37 − monster.defense = final damage.

**Desired UX — two options:**

- **Option A (tooltip on ability card):** A small `ℹ` icon on each ability card that expands: _"Power Strike: avg 6d6 (3.5) + STR 15 + weapon 6 = 24.5 base → ×1.5 = 36 raw → −8 DEF = 28 damage"_.
- **Option B (overlay breakdown, recommended):** After the ability dice settle in the `ActionRollOverlay`, show the formula steps below the damage number. Shown at the moment of maximum player interest — no persistent UI changes needed to ability cards.

**Files to change:** `src/lib/gameLogic/abilities.ts` (expose `baseHit`, `rawDamage`, and intermediate values in `AbilityResolution`), `src/components/combat/overlays/ActionRollOverlay.tsx` (render breakdown panel).

---

### E9 — Monster Abilities: passives for all, active specials for level 5+

**Priority:** Medium-high — this is a significant new system and one of the highest-impact engagement improvements. Every fight currently plays identically regardless of monster type.

**Confirmed scope (player):** All monsters get 1 passive trait. Monsters level 5 and above (and all dungeon bosses) also get one active ability.

**Passive traits (1 per monster, static field on `MonsterDef`):**

| Passive           | Effect                                                                     | Example monsters         |
| ----------------- | -------------------------------------------------------------------------- | ------------------------ |
| Regeneration      | +3 HP per round before player damage resolves                              | Troll, Werewolf          |
| Tough Hide        | Player can never ignore monster DEF (counters bypassMonsterDef abilities)  | Stone Golem, Armored Orc |
| Dodge             | 20% chance to negate incoming player damage entirely                       | Goblin Rogue, Shadow     |
| Lifesteal         | Monster heals 25% of damage it deals each round                            | Vampire, Blood Witch     |
| Arcane Resistance | Spell damage reduced by 50%                                                | Magic Golem, Lich        |
| Stun Immunity     | Cannot be stunned by any player ability or spell                           | Iron Colossus            |
| Enrage Threshold  | On reaching 30% HP, monster ATK increases by 50% for the rest of the fight | Berserker, Cave Bear     |

**Active abilities (level 5+ monsters; trigger once per fight when HP drops below 40%, or 25% chance per round — see DQ below):**

| Active      | Effect                                                                          |
| ----------- | ------------------------------------------------------------------------------- |
| Curse       | Halves player DEF for 2 rounds                                                  |
| Frenzy      | Monster attacks twice this round                                                |
| Shield Wall | Monster gains +10 DEF for 1 round                                               |
| Venom Bite  | Applies DoT: 5 damage/round for 3 rounds (extends existing dungeon venom logic) |
| Drain       | Steals 10 stamina from player                                                   |
| Execute     | If player HP < 30%, monster deals 3× damage this hit                            |
| Berserk     | Both sides deal 2× damage this round                                            |

**Implementation notes:**

- Dungeon bosses already have hardcoded custom mechanics (venom, Necro Shield, Dragon ignore-DEF). Those remain as-is; this system targets the arena monster catalog and non-boss dungeon rooms.
- Passives: static field `passive?: MonsterPassive` on `MonsterDef`. Applied in round resolution inside `combatActions.ts`.
- Active abilities: field `activeAbility?: MonsterActive` on `MonsterDef`. Trigger checked at the start of each round in `useCombatEncounter.ts`. Fires at most once per fight (`activeUsed` flag in `FightState`).
- Active ability firing should append a special entry to the battle log and optionally trigger a monster portrait flash (same tech as E7 monster portrait layer).

**Design questions to resolve before implementing:**

1. Should passive traits be shown on the monster portrait card in combat (player can see and strategize), or hidden until discovery?
2. Should active abilities trigger on a HP threshold (learnable, tactical) or random % chance per round (tense, unpredictable)? Recommendation: HP threshold is better for first implementation — easier to test and reason about.
3. Which existing arena monsters (levels 1–9 in `src/lib/gameLogic/monsters.ts`) get which passive?

**Files to change:** `src/types/index.ts` (add `MonsterPassive`, `MonsterActive` types), `src/lib/gameLogic/monsters.ts` (add passive/active fields to catalog), `src/lib/gameLogic/combatActions.ts` (apply passive modifiers), `src/hooks/useCombatEncounter.ts` (active trigger check + `activeUsed` flag), `src/components/combat/CombatArena.tsx` (render passive trait badge on monster card).

---

### E10 — Mobile & Tablet Responsiveness Sweep

**Priority:** High — the shell layout (sidebar, bottom nav, `pb-20 md:pb-6` content padding) is solid, but individual pages have not been audited for mobile and tablet breakpoints.

**Known solid foundations:**

- `src/app/(game)/layout.tsx` — collapsible sidebar on `md+`, bottom nav on `<md`, correct main-content bottom-padding for nav clearance.
- Tailwind responsive prefix system (`sm:`, `md:`, `lg:`) is in use throughout.

**Audit categories and known or likely issues:**

| Category              | Issue                                                                                                                                                                                                                 | Affected pages                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Horizontal overflow   | Cards or stat grids that are too wide for 375px (iPhone SE) viewports — no `overflow-hidden` safety net                                                                                                               | Shop, Inventory, Character sheet |
| Touch targets         | Buttons < 44×44 px — Tailwind `py-1 px-2` buttons on spell cards and reroll/claim quest buttons may be too small                                                                                                      | Quests, Inventory, Combat        |
| Chart overflow        | Recharts charts on the Stats page use fixed or percentage widths — may not respond correctly to narrow containers without a `ResponsiveContainer` wrapper with explicit height                                        | Stats                            |
| Combat overlays       | `SpellRollOverlay` and `ActionRollOverlay` use `max-w-xs` — fine on phone; verify on tablet landscape where centered modals can feel too narrow                                                                       | Combat (arena + dungeon)         |
| Dungeon run page      | Multi-panel layout (HP bars, action bar, log) — needs visual stack verification at 375 px and 768 px (iPad portrait)                                                                                                  | Dungeon run                      |
| Text truncation       | Long item names, monster names, quest titles — verify `truncate` or `line-clamp` is applied at narrow widths so text doesn't overflow cards                                                                           | Shop, Inventory, Quests          |
| Header stats row      | The `hidden sm:flex` HP/DEF stats strip in the top bar disappears on mobile — confirm the information is accessible elsewhere (character page) or add it to a mobile-friendly location                                | Dashboard / Layout               |
| Bottom nav icon count | 8 nav items in the mobile bottom nav at `justify-around` — on a 375px screen each item is ~47px wide with a 10px label, tight but workable. Verify on 320px (iPhone SE 1st gen) — may need icon-only mode below `sm:` | Layout                           |
| Landscape orientation | Combat and dungeon pages use `min-h-screen` full-height layouts — on mobile landscape (667 × 375 px) the bottom nav + content may not scroll correctly                                                                | Combat, Dungeon run              |
| Tablet (768 px)       | iPad portrait sits exactly at the `md:` breakpoint — sidebar appears, bottom nav disappears. Verify sidebar doesn't feel too wide or content too narrow at this exact breakpoint                                      | All game pages                   |

**Recommended approach:** Do a single dedicated mobile audit pass using browser DevTools responsive mode at three sizes: 375 px (iPhone base), 414 px (iPhone Plus), 768 px (iPad portrait). Capture screenshots at each breakpoint for all 9 game routes. Fix overflow, touch target, and truncation issues in one PR rather than page-by-page.

**No schema changes.** All fixes are CSS/Tailwind class adjustments and responsive variant additions.

**Files most likely to need changes:** `src/app/(game)/layout.tsx`, `src/app/(game)/stats/page.tsx` (chart ResponsiveContainer), `src/app/(game)/shop/page.tsx`, `src/app/(game)/inventory/page.tsx`, `src/app/(game)/combat/dungeons/run/page.tsx`, `src/components/combat/overlays/*.tsx`.

---

## Design Questions (no code change yet — needs decision)

| #   | Question                                                                                     | Context                                                               |
| --- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| DQ1 | Should equipping gear only raise max HP (not current HP)?                                    | See B5. Recommendation: yes — Option B.                               |
| DQ2 | Should stamina follow the same rule as HP (equip only changes max, not current)?             | See B5/B6. Recommendation: yes, for consistency.                      |
| DQ3 | Spell charge replenishment trigger — after each combat, at rest sites only, or daily?        | See E5.                                                               |
| DQ4 | Spell charges per rarity or flat 3?                                                          | See E5.                                                               |
| DQ5 | When all spells in loadout are depleted mid-dungeon, can the player re-equip from inventory? | See E5.                                                               |
| DQ6 | Quest page: tab switcher vs. two-column grid — which layout?                                 | See B7. Recommendation: tab switcher (simpler, no alignment problem). |
| DQ7 | Should monster passive traits be visible to the player before/during combat?                 | See E9. Recommendation: visible — rewards learning and strategy.      |
| DQ8 | Monster active abilities: HP-threshold trigger or % chance per round?                        | See E9. Recommendation: HP threshold for first ship.                  |
| DQ9 | Which formula display option for ability damage — tooltip on card or overlay breakdown?      | See E8. Recommendation: overlay breakdown (Option B).                 |

---

## Next-Level Suggestions

- **Spell charges + dungeon Rest Sites** — Tying charge replenishment to Rest Sites (rather than after every combat) is the highest-leverage design move here. It turns each Rest Site into a meaningful decision: heal resources vs. preserve a strategic retreat option. Arena players get full resets between fights and never feel punished; dungeon players manage a finite spell economy across the whole run.

- **Stat check flavor as lore delivery** — The scenario pool for E1 doesn't need to be generic. Each dungeon tier's flavor text can carry setting-specific lore: Goblin Caves could have crude goblin traps and riddles, Spider Lair a web-bridge and poisoned air, Dark Sanctum magical wards and collapsed masonry, Dragon's Keep molten rock and draconic runes. 3–4 seeded scenarios per tier gives 12–16 distinct room descriptions with zero additional implementation cost beyond writing the text.

- **Charge count by rarity** — Flat 3 charges per spell is fine to ship first, but tying charges to rarity (Common 2 → Legendary 6) gives the rarity system a second dimension beyond stat bonuses and creates a clear upgrade incentive: higher-rarity spells aren't just stronger, they're more reliable mid-dungeon.

- **Inventory consumable use as pre-dungeon ritual** — E6 (out-of-combat consumable use) pairs naturally with a "prepare for the run" pre-entry screen. Before entering a dungeon, the player could see their current HP/Stamina/Magic and have one last chance to use potions. This avoids the mid-game flow interruption of navigating to Inventory → back to Dungeon.

- **Shop gold desync (B4) is a signal** — The stale-gold display issue shows the character store can drift from Firestore. A post-write force-refresh (`fetchCharacter(uid, true)`) on any gold-mutating operation (buy, reroll quest, dungeon entry fee) would eliminate this class of desync entirely, not just for shop purchases.

- **Monster abilities + spell effects create a compounding feedback loop** — E9 monster actives and E7 spell impact visuals would naturally combine: when a monster fires its active ability, give it the same flash treatment as player spells. This makes monster specials feel dramatic and teaches the player that "something unusual just happened" — critical for HUD-less mobile play where a battle log entry alone is easily missed.

- **Formula transparency (E8) reduces support burden** — Every time a player doesn't understand why a powerful ability did less damage than expected (monster DEF, failed DEF roll, already near-dead monster), they think it's a bug. The overlay breakdown converts that confusion into a learning moment. Worth shipping before the monster ability system (E9) makes damage calculation even more complex.

---

## Potential Risks & Gaps

- **B2/B3 deployment fragility** — If the root cause of the logActivity and claimDungeonRunCF failures is a missing IAM binding, it will re-break every time CI deploys functions without the binding repair step. The fix needs to land in the CI workflow itself (`.github/workflows/`) with an explicit `gcloud run services add-iam-policy-binding` step per function — not just applied manually in the console — otherwise the next deploy will regress it.

- **E5 schema risk** — The spell charge mechanic touches `InventoryItem`, `DungeonRun`, `useCombatEncounter`, and the dungeon run page simultaneously. If charges are stored on `InventoryItem` (Firestore) rather than as transient in-memory combat state, existing items in players' inventories will have no `charges` field and need a normalizer default. The `normalizeInventoryItem` function in `src/lib/inventoryData.ts` would need updating before the charge UI renders, or you'll get rendering errors on existing spell items.

- **Spell "random draw" UX legibility** — Removing player choice from spell casting is a significant risk to player agency. Players who have built spell loadouts around a specific strategy (e.g., always open with a stun) will find the random draw frustrating unless the UI clearly sets expectations before the first cast. A "your next draw is unknown" affordance on the Cast Spell button and a visible per-spell charge meter in the loadout panel are non-negotiable UX requirements before shipping this.

- **E2 icon scope creep** — "Emoji → custom art" sounds simple but involves at least 3 distinct icon contexts (action buttons, stat bars, activity type chips) across multiple pages and components. Without a single source-of-truth icon component (`StatIcon`, `ActionIcon`) introduced first, each page will solve it differently and introduce new inconsistency. Define the icon components before replacing any emoji.

- **B5 gear-equip behavior change** — Changing `computeGearDelta` so equipping gear no longer heals current HP is a silent behavior change that may surprise players who've relied on the "equip to heal" pattern (intentionally or not). A one-time in-game tooltip or patch note on the Inventory page ("Equipping gear no longer restores HP") would soften the change.

- **E9 monster abilities + existing dungeon boss mechanics collision** — Dungeon bosses (Spider Broodmother, Lich King, Dragon) already have bespoke hardcoded traits. If E9 also adds passives to the `MonsterDef` schema, the boss entries need to be explicitly excluded from the new passive system or their behavior will double-stack (e.g., the Lich already has a Necro Shield mechanic; adding an Arcane Resistance passive on top would make it nearly invulnerable to spells). Keep boss logic in the dungeon-specific `CombatModifiers` seam and out of the shared `MonsterDef` passive field.

- **B8 spell overlay latency** — Threading the monster roll through `SpellResolution` → `ActionResolution` → the overlay requires a small refactor across 4 files. Low risk but easy to miss the dungeon run page's separate `SpellRollOverlay` wiring at `run/page.tsx:473` — both combat pages must be updated, not just `combat/page.tsx`.

- **B9 combat-active flag placement** — The nav lock requires a shared signal between combat pages and the layout. A Zustand store is the right place, but if `combatActive` is stored in `dungeonStore` only, arena combat won't be covered. A dedicated tiny `combatStore` (a single boolean + setters) is cleaner than polluting an existing store, and is the only new store the codebase would need. Make sure the flag is cleared on sign-out (add to the sign-out flush in `layout.tsx:handleSignOut`) or a crash during combat would permanently lock the nav.

- **E10 mobile audit scope** — "Mobile-friendly sweep" is easy to underestimate. The 8-item bottom nav is borderline at 320 px; if any label wraps to two lines the nav height changes and the `pb-20` offset in main content becomes wrong. Test at 320 px explicitly, not just 375 px, before closing this item.

---

## Implementation Order (suggested)

| #   | Item                                                                                                   | Effort | Impact                                             |
| --- | ------------------------------------------------------------------------------------------------------ | ------ | -------------------------------------------------- |
| 1   | B1 — Quest reroll `deleteField()` fix                                                                  | XS     | Unblocks quest variety for all players             |
| 2   | B2/B3 — Investigate & fix logActivity + dungeon claim (likely same root: functions not deployed / IAM) | M      | Unblocks core game loop                            |
| 3   | B9 — Combat nav lock + `beforeunload` guard                                                            | S      | Prevents fight abandonment + orphaned dungeon runs |
| 4   | B4 — Shop gold display: force-refresh after purchase                                                   | S      | Fixes confusing gold display                       |
| 5   | B5/B6 — Gear equip: only change max HP/Stamina, clamp current                                          | S      | Design consistency + player trust                  |
| 6   | B7 — Quest layout: tab switcher (resolve DQ6 first)                                                    | S      | Visual polish / UX                                 |
| 7   | B8 — Spell overlay: add monster counter-attack dice panel                                              | S      | Combat flow consistency                            |
| 8   | E10 — Mobile & tablet responsiveness sweep                                                             | M      | Covers entire player base on phone/tablet          |
| 9   | E1 — Dungeon stat check flavor text                                                                    | S      | Immersion / RPG feel                               |
| 10  | E3 — Spell light-mode + shimmer fix                                                                    | S      | Polish                                             |
| 11  | E7 — Spell visual impact + school-based sounds                                                         | M      | Game feel / juice                                  |
| 12  | E8 — Ability damage formula breakdown in overlay (resolve DQ9 first)                                   | S      | Transparency / player trust                        |
| 13  | E2 — Emoji → SVG art icons                                                                             | M      | Visual consistency                                 |
| 14  | E4 — Shop spell rotation                                                                               | S      | UX parity                                          |
| 15  | E6 — Inventory consumable use (out of combat)                                                          | M      | QoL                                                |
| 16  | E9 — Monster abilities (resolve DQ7–DQ8 first; assign passives per monster)                            | L      | Major engagement / replayability gain              |
| 17  | E5 — Spell charge mechanic (resolve DQ3–DQ5 first)                                                     | L      | Major game mechanic change                         |

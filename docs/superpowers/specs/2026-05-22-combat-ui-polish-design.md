# Combat UI Polish & Bug Fix Design

**Date:** 2026-05-22  
**Status:** Approved for implementation  
**Scope:** Two bug fixes (Phase 1) + five visual enhancements (Phase 2)

---

## Overview

Seven issues identified during manual combat testing and visual review:

**Phase 1 — Bugs (ship first):**

- B1: Item reward claim error (toast on victory claim)
- B2: Spell action button invisible in light mode
- B3: Dark mode text audit pass

**Phase 2 — Visual Polish:**

- V1: 3D tumbling CSS dice
- V2: Dice sound timing improvement
- V3: Premium spell cards (shimmer + depth)
- V4: SVG item silhouettes per item archetype
- V5: Full SVG icon pass (dashboard, character sheet, activities, stats)

---

## Phase 1 — Bug Fixes

### B1: Item Reward Claim Error

**Root cause hypothesis:** `handleClaimRewards` wraps the entire claim chain in a single try/catch. If `claimCombatVictoryCF` succeeds (XP/gold written to Firestore) but a subsequent step (`awardLoot`, `updateMonsterPity`) throws, the catch fires the generic toast and leaves `pendingRewards` non-null. The modal stays open, and a retry re-runs the Cloud Function → double XP/gold award.

**Fix: per-step isolation**

```
Step 1 — claimCombatVictoryCF      → if throws: show "server unreachable, safe to retry" toast, keep modal open
Step 2 — awardXpAndStats + awardGold → if throws: log error, continue (best-effort local sync)
Step 3 — awardLoot                 → if throws: log error, mark inventory stale, continue
Step 4 — updateMonsterPity         → if throws: log silently, continue
Step 5 — setPendingRewards(null)   → always called after step 1 succeeds
```

**Toast messaging by scenario:**

- CF fails (network/rate-limit): `"Couldn't reach the server — tap Claim Rewards again"` (modal stays open, retry is safe)
- CF succeeds, loot sync fails: `"Rewards claimed · inventory sync failed — refresh inventory to see your drop"` (modal closes, no retry risk)
- Full success: existing `toastReward` flow unchanged

**Files affected:** `src/app/(game)/combat/page.tsx` — `handleClaimRewards` function only.

---

### B2: Spell Action Button — Light Mode Visibility

**Root cause:** The `SpellCard` action button uses `${scheme.header} text-white` (e.g. `bg-gray-500 text-white` for common rarity). At `disabled:opacity-40` a `bg-gray-500` button on a white card body becomes nearly invisible — light gray on white with near-transparent text. Dark mode is fine because the card body is `bg-slate-900`, so even a faded gray has contrast.

**Fix:** Add explicit disabled styling that maintains contrast in both modes. For common rarity specifically, darken the button background slightly or use a border-based fallback when disabled. Non-destructive change — only affects the disabled state styling in `SpellCard`.

**Files affected:** `src/components/ui/SpellCard.tsx` — button `className` only.

---

### B3: Dark Mode Text Audit

**Scope:** Targeted pass for text that blends into dark backgrounds. Known problem areas from review:

| Location                                    | Issue                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| Victory/defeat banners in `combat/page.tsx` | `text-gray-500` subtext on light gradient — works in light, may wash in dark |
| `BattleResultsModal` loot section           | `text-gray-800` item name without `dark:` equivalent                         |
| `LastActionSummary` / `BattleLogEntry`      | Several inline `text-gray-X` labels without dark counterparts                |
| Stat allocation modal                       | Form labels using `text-gray-600` without dark variant                       |

**Fix:** Audit all `text-gray-X` usages in combat page and components; add `dark:text-slate-Y` counterparts where missing. Run in dark mode in the browser to visually confirm before marking done.

**Files affected:** `src/app/(game)/combat/page.tsx`, `src/components/character/StatAllocModal.tsx`, potentially `src/app/(game)/inventory/page.tsx`.

---

## Phase 2 — Visual Enhancements

### V1: 3D Tumbling CSS Dice

**Decision:** True CSS 3D cube (Option A). No external libraries.

**Architecture:**

Replace the existing `DieFace` (flat pip grid) with a `Die3D` component:

```
Die3D
  └── .scene  (perspective container, ~80px)
       └── .cube  (transform-style: preserve-3d)
            ├── .face.face-1  (translateZ + pip layout)
            ├── .face.face-2
            ├── .face.face-3
            ├── .face.face-4
            ├── .face.face-5
            └── .face.face-6
```

**Face positioning (cube half-size = S/2):**

- Face 1 (front): `translateZ(S/2)`
- Face 6 (back): `rotateY(180deg) translateZ(S/2)`
- Face 2 (right): `rotateY(90deg) translateZ(S/2)`
- Face 5 (left): `rotateY(-90deg) translateZ(S/2)`
- Face 4 (top): `rotateX(-90deg) translateZ(S/2)`
- Face 3 (bottom): `rotateX(90deg) translateZ(S/2)`

**Target rotation to show face N (applied to `.cube`):**

- Show 1: `rotateX(0deg) rotateY(0deg)`
- Show 2: `rotateY(-90deg)`
- Show 3: `rotateX(90deg)`
- Show 4: `rotateX(-90deg)`
- Show 5: `rotateY(90deg)`
- Show 6: `rotateX(180deg)`

**Animation phases (mirrors current `DiceRollOverlay` logic):**

1. **Spinning** (1.1s): rapid random rotations via JS interval — cube parent gets inline `transform` updated every 75ms
2. **Settling** (staggered 130ms per die): each die animates to its final target rotation via CSS transition `duration-500 ease-out`
3. **Landing flash**: on settle, a brief `drop-shadow` glow pulses then fades (CSS `@keyframes`, 0.4s)

**Sizes:**

- `sm` (ability roll, 6 dice): 40px cube
- `lg` (single d10 action roll): keep existing `D10Face` number display — d10 is not a cube, so no change needed there

**Stagger:** 6 dice stagger settle by `i * 130ms`, same timing as current flat implementation. No other behaviour changes.

**Pip layouts** (reuse existing `DIE_PIPS` record, rendered as `rounded-full` divs on each face).

**Files:** New `src/components/ui/Die3D.tsx`. Replace `<DieFace>` with `<Die3D>` in `combat/page.tsx`. Existing `DieFace` can be deleted once replaced.

---

### V2: Dice Sound Timing

**Current:** `playSound('diceRoll')` fires once when the overlay opens. Single short clip.

**Improved timing:**

- On overlay open (spinning phase starts): play a rolling/tumbling sound (new `diceRolling` sound key, looped or longer clip)
- On first die settle: stop rolling sound, play a sharp `diceSettle` crack/clack
- On pattern match confirmed: play the existing ability-match success sound or a new `diceMatch` chime

**Sound files:** Add 2 new audio assets (`diceRolling`, `diceSettle`) to `public/sounds/`. Update `useSound.ts` to register the new keys.

**Files:** `src/hooks/useSound.ts`, `src/app/(game)/combat/page.tsx` (pass timing callbacks into `DiceRollOverlay`).

---

### V3: Premium Spell Cards

**Decision:** Full shimmer + depth (Option C). Degrades gracefully to depth-only on touch.

**Implementation: `PremiumSpellCard` wrapper**

Wrap `SpellCard` in a new `PremiumSpellCard` component that handles the visual effects without touching `SpellCard`'s data props:

```tsx
// Usage stays the same at callsites — just swap the import
<PremiumSpellCard def={def} ... />
```

**Effects:**

1. **Card depth (always-on):**
   - Layered `box-shadow`: 3-pixel stacked edge shadows in the rarity's dark tone + ambient lift shadow
   - `::before` top-edge highlight (`rgba(255,255,255,0.12)` diagonal gradient) — simulates light source from top-left
   - Existing `border-2` kept

2. **Hover lift:** `translateY(-4px)` + deeper ambient shadow — `transition-transform duration-150`

3. **Mouse-tracking shimmer (pointer devices only):**
   - `onMouseMove` reads `(x,y)` relative to card bounds → drives CSS custom properties `--rotateX`, `--rotateY`, `--shimmerX`, `--shimmerY`
   - Card parent: `perspective(600px) rotateX(var(--rotateX)) rotateY(var(--rotateY))` (±10deg max)
   - Overlay `div` with `radial-gradient` centred at `--shimmerX/Y` + diagonal stripe gradient — `mix-blend-mode: screen`
   - `onMouseLeave`: reset transforms, clear custom properties

4. **Touch fallback:** `@media (hover: none)` disables the mousemove listener; depth + lift remain via `:active` state

**Rarity-specific shimmer tint:**

- Common → silver/white shimmer
- Uncommon → green shimmer tint
- Rare → blue shimmer tint
- Epic → purple shimmer tint
- Legendary → gold shimmer tint (`rgba(255,215,0,0.2)`)

**Files:** New `src/components/ui/PremiumSpellCard.tsx`. Update imports in `src/app/(game)/combat/page.tsx` and `src/app/(game)/inventory/page.tsx`.

---

### V4: SVG Item Silhouettes

**Current state:** `ITEM_SILHOUETTES` has 3 generic entries (`weapon`, `armor`, `accessory`). All items fall back to these.

**Approach:** Add per-archetype silhouettes and map item IDs to the correct shape. Not every item gets a unique silhouette — items sharing a visual archetype share one (e.g. all sword-type weapons share `ItemSword`).

**Weapon archetypes (5 shapes):**

| Silhouette key | Item IDs                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `item-sword`   | worn-sword, iron-sword, dragonbone-blade, stormcleaver, godslayer, oblivion-edge, flintsteel-dagger |
| `item-staff`   | oak-staff, staff-of-ages, necrotic-staff                                                            |
| `item-bow`     | hunters-bow                                                                                         |
| `item-tome`    | arcane-tome, void-tome, spiderspun-tome, the-eternal-grimoire                                       |
| `item-daggers` | twin-daggers, shadowfang, phantom-blades                                                            |

**Armor archetypes (4 shapes):**

| Silhouette key     | Item IDs                                                                         |
| ------------------ | -------------------------------------------------------------------------------- |
| `item-light-armor` | leather-vest, padded-robe, shadowweave-cloak, arachnoweave-cloak, specter-shroud |
| `item-chain`       | chain-shirt, scavengers-chain, bone-lattice-armor                                |
| `item-plate`       | battle-plate, titan-plate, emberclaw-gauntlets                                   |
| `item-scale`       | dragonscale-armor, celestial-aegis, scale-dragon-king                            |

**Accessory archetypes (4 shapes):**

| Silhouette key | Item IDs                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `item-ring`    | health-charm, stamina-band, ring-of-wisdom, ring-of-dominance, goblin-king-signet, wraithbound-ring |
| `item-amulet`  | warriors-pendant, amulet-of-the-champion, lifestone, heart-of-the-cosmos, venomfang-bracer          |
| `item-emblem`  | emblem-of-valor, emblem-of-valor, draconic-sigil                                                    |
| `item-cloak`   | — (merged into light-armor above)                                                                   |

**Each silhouette:** SVG path drawn at 100×100 viewBox, `fill="currentColor"`, styled per the existing silhouette conventions in `silhouettes.tsx`. Bold, readable at 32×32 minimum.

**Mapping:** Add a helper `getItemSilhouetteKey(itemId: string): string` in `src/lib/entityArt.ts` (or inline in `silhouettes.tsx`). Called by `EntityArt` when `category="item"`.

**Character sheet:** Update `CharacterCard` equipped slots to render `<EntityArt category="item" id={getItemSilhouetteKey(equippedId)} size="sm" />` instead of the `SLOT_ICON` emoji. Rarity tint applied via existing `rarityTint()` helper.

**Files:** `src/components/art/silhouettes.tsx` (new silhouette functions + ITEM_SILHOUETTES expansion), `src/lib/entityArt.ts` (add `getItemSilhouetteKey`), `src/components/character/CharacterCard.tsx`.

---

### V5: Full SVG Icon Pass

**Dashboard quick actions:**

Currently hardcoded emoji (`📋`, `🐉`, `📜`, `🏪`) in the `QUICK_ACTIONS` array. Replace with `EntityArt` components using existing or new silhouettes:

| Action          | Entity                    | Category | ID             |
| --------------- | ------------------------- | -------- | -------------- |
| Log Activity    | workout silhouette        | activity | `workout`      |
| Fight a Monster | goblin-scout silhouette   | monster  | `goblin-scout` |
| View Quests     | new scroll silhouette     | activity | `quest`        |
| Visit Shop      | new coin/pouch silhouette | activity | `shop`         |

`quest` and `shop` are new `ACTIVITY_SILHOUETTES` entries.

**Character sheet equipment slot icons:**

Already covered by V4 — `EntityArt` with item silhouette replaces the `SLOT_ICON` emoji row.

**Activity icons site-wide:**

`ACTIVITY_ICONS` record (emoji) is used in dashboard recent logs, stats page, quest cards, personal records. These callsites already support a swap to `EntityArt`:

- All 5 existing `ACTIVITY_SILHOUETTES` entries (run, workout, steps, sleep, water) are already drawn.
- Add `nutrition` silhouette to complete the set.
- Update callsites that use `getActivityIcon()` to instead render `<EntityArt category="activity" id={type} size="xs" fallbackEmoji={...} />`.

**Stat icons:**

`STAT_CONFIG` arrays in `dashboard/page.tsx` and `CharacterCard.tsx` use emoji (⚔️, 🧠, 🌬️). Add stat silhouettes to a new `STAT_SILHOUETTES` record:

| Stat     | Silhouette                 |
| -------- | -------------------------- |
| strength | sword/fist                 |
| wisdom   | open book / eye            |
| agility  | wind gust / running figure |
| stamina  | lightning bolt             |
| health   | shield / heart             |
| defense  | tower shield               |

These register as a new `EntityCategory` `"stat"` in `EntityArt` (new `STAT_SILHOUETTES` record, `defaultTint` returns `amber`, `defaultVariant` returns `sigil`). Adding a proper category is cleaner than overloading `activity` with stat IDs.

**Files:** `src/components/art/silhouettes.tsx`, `src/lib/entityArt.ts`, `src/lib/activityIcons.ts`, `src/app/(game)/dashboard/page.tsx`, `src/components/character/CharacterCard.tsx`, `src/components/character/StatBar.tsx`.

---

## Sequencing

```
Phase 1 (bugs — ship first, independent):
  B1 → B2 → B3   (all independent, can be one PR)

Phase 2 (polish — each independent):
  V4 (silhouettes) must land before V5 (icon pass uses the new silhouettes)
  V1, V2, V3, V5 are otherwise independent of each other
```

**Suggested PR structure:**

1. `fix/combat-claim-bugs` — B1 + B2 + B3
2. `feat/3d-dice` — V1 + V2
3. `feat/premium-spell-cards` — V3
4. `feat/item-silhouettes` — V4
5. `feat/icon-pass` — V5

---

## Out of Scope

- "Monetisation option" for cool looking dice (noted, deferred — revisit after Reputation system ships)
- Sounds beyond the two new dice clips (existing sound system unchanged)
- Per-item unique silhouettes for every individual item ID (archetype approach is the right balance)
- Any backend/Cloud Function changes (this spec is purely frontend)

# FitQuest Art Asset System

> All visual identity (monsters, classes, items, spells, abilities, achievements, activities, dungeons, brand) flows through one component: `<EntityArt>`. This doc explains how to add, replace, or extend the art.

## Overview

Every game entity has a slot in the art system. `EntityArt` looks up the silhouette by `(category, id)`, drops it inside a `HeraldicFrame`, and renders the framed crest. If no silhouette is registered for that id, the supplied `fallbackEmoji` renders instead — so the UI never breaks while new art is added. For `category="item"` specifically, a dev-time `console.warn` fires when an item id has no registered silhouette, catching catalog additions early.

```tsx
<EntityArt
  category="monster"
  id="ancient-dragon"
  size="lg"
  fallbackEmoji="🐉"
  ariaLabel="Ancient Dragon"
/>
```

## File map

| Path                                      | Purpose                                                                                                                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/art/EntityArt.tsx`        | The render primitive. Routes `(category, id)` to the right silhouette + frame.                                                                                                                                                                                     |
| `src/components/art/HeraldicFrame.tsx`    | Shield / sigil / medallion frame shapes with light + dark gradients and tint variants.                                                                                                                                                                             |
| `src/components/art/silhouettes.tsx`      | Hand-authored SVG silhouettes for monsters, classes, subclasses, abilities, spells, activities, achievements, and dungeons.                                                                                                                                        |
| `src/components/art/item-silhouettes.tsx` | Hand-authored SVG silhouettes in `ITEM_SILHOUETTES` — 105 unique per-`id` silhouettes plus 4 type-level fallbacks (`weapon`/`armor`/`accessory`/`consumable`). Covers 105 of the 114 non-spell items; the remaining 9 fall back to their type silhouette. Split out so non-item routes (combat / character / dashboard) don't pay the cost in their shared chunk. |
| `src/lib/entityArt.ts`                    | Helpers: `spellEffectKey(effect)`, `rarityTint(rarity)`.                                                                                                                                                                                                           |
| `src/components/ui/BrandMark.tsx`         | FitQuest crest + wordmark used in header and auth screens.                                                                                                                                                                                                         |
| `public/icons/icon.svg`                   | PWA icon master — regenerate PNGs from this with `rsvg-convert`.                                                                                                                                                                                                   |

## Categories

| `category`    | Source map                                                                                       | Default frame                                                | Default tint                                      |
| ------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------- |
| `monster`     | `MONSTER_SILHOUETTES`                                                                            | medallion                                                    | tier-based (green / blue / purple / rose / slate) |
| `class`       | `CLASS_SILHOUETTES`                                                                              | shield                                                       | rose / violet / emerald (per class)               |
| `subclass`    | `SUBCLASS_SILHOUETTES`                                                                           | shield                                                       | rose / violet / emerald (per parent class)        |
| `ability`     | `ABILITY_SILHOUETTES`                                                                            | sigil                                                        | amber                                             |
| `spell`       | `SPELL_SILHOUETTES` (effect-tier)                                                                | sigil                                                        | violet — usually overridden by `rarityTint`       |
| `activity`    | `ACTIVITY_SILHOUETTES`                                                                           | medallion                                                    | sky                                               |
| `achievement` | `ACHIEVEMENT_SILHOUETTES`                                                                        | medallion                                                    | amber                                             |
| `dungeon`     | `DUNGEON_SILHOUETTES`                                                                            | shield                                                       | green / blue / purple / orange (per tier)         |
| `item`        | `ITEM_SILHOUETTES` (by item id; type-level fallbacks: `weapon`/`armor`/`accessory`/`consumable`) | shield (weapons/armor) / medallion (accessories/consumables) | caller-provided rarity tint                       |

## Adding a new silhouette

1. Open `src/components/art/silhouettes.tsx` for non-item categories, or `src/components/art/item-silhouettes.tsx` for items.
2. Add a new `function MyEntity()` returning JSX with `<g fill="currentColor">` and SVG primitives inside the `0–100` viewBox. Aim for the silhouette to fill the central 60×60 area so it reads at all sizes.
3. Register it in the appropriate map (e.g. `MONSTER_SILHOUETTES['new-id'] = MyEntity`, or `ITEM_SILHOUETTES['new-item-id'] = MyEntity`).
4. Done — every site already using `<EntityArt category="monster" id="new-id" />` lights up automatically.

### Style guide

- Use `fill="currentColor"` on the parent `<g>` — the heraldic frame's `color` is set to the tint's text-color, so silhouettes auto-tint with the theme.
- Sparingly add explicit colors via Tailwind utility classes (`className="fill-amber-300"` etc.) for highlights.
- Prefer filled shapes; use strokes sparingly and only for internal detail (e.g., web lines, potion ridges). The frame ring is the only structural outline.
- Keep paths simple. Each silhouette ships as inline JSX, so complex artwork bloats the bundle.

## Replacing an icon

Three options:

1. **Edit the silhouette function in `silhouettes.tsx` (or `item-silhouettes.tsx` for items)** — fastest, ships in a normal PR.
2. **Replace with a static SVG file** — drop it under `public/art/{category}/` and update `EntityArt.tsx` to render an `<img>` for that id. Useful when a designer hands over polished art.
3. **Replace with a raster image** — same as (2) but using `next/image`. Recommended only when the art is photographic.

## Brand mark

The wordmark + crest lives in `src/components/ui/BrandMark.tsx`. It renders inline SVG so it stays sharp at any size and tints with the theme via the parent's text color. Two slots use it today: game header (`size={28}`) and auth screens (`size={56}`).

PWA / favicon variants are PNG renders of `public/icons/icon.svg`. To regenerate them:

```bash
cd public/icons
rsvg-convert -w 192 -h 192 icon.svg -o icon-192.png
rsvg-convert -w 512 -h 512 icon.svg -o icon-512.png
rsvg-convert -w 180 -h 180 icon.svg -o apple-touch-icon.png
rsvg-convert -w 32  -h 32  icon.svg -o favicon-32.png
rsvg-convert -w 16  -h 16  icon.svg -o favicon-16.png
rsvg-convert -w 192 -h 192 icon-maskable.svg -o icon-maskable-192.png
rsvg-convert -w 512 -h 512 icon-maskable.svg -o icon-maskable-512.png
```

## Nav icon set

Navigation icons come from [lucide-react](https://lucide.dev/) and are declared in `src/lib/navConfig.ts` — the single source of truth for both the bottom nav bar (`(game)/layout.tsx`) and the `useNavPreferenceStore` default-pin list.

| Route          | Icon (lucide-react) | Rationale                          |
| -------------- | ------------------- | ---------------------------------- |
| `/dashboard`   | `Home`              | Standard home metaphor             |
| `/character`   | `Swords`            | Combat/warrior identity            |
| `/activities`  | `ClipboardList`     | Workout log / checklist            |
| `/combat`      | `Skull`             | Danger / enemy confrontation       |
| `/quests`      | `ScrollText`        | Fantasy quest parchment            |
| `/inventory`   | `Backpack`          | Gear storage                       |
| `/shop`        | `Store`             | Merchant / marketplace             |
| `/stats`       | `BarChart3`         | Analytics / progress charts        |
| `/collections` | `Trophy`            | Achievement / completion milestone |

The overflow panel and customizer also use `MoreHorizontal` (overflow trigger), `X` (panel close), `GripVertical` (drag handle in the reorder list), and `ChevronDown` (swipe-hint affordance) — all from lucide-react, imported directly in `layout.tsx`.

To swap a nav icon, update the `Icon` field for the relevant entry in `src/lib/navConfig.ts`. No other files need changing.

## Attribution

All silhouettes in this pass are hand-authored, no third-party assets used. When commissioned art lands, list the artist and license here:

| Asset path   | Artist | License |
| ------------ | ------ | ------- |
| _(none yet)_ |        |         |

## Future work

- **Commissioned art** — replace the geometric silhouettes with bespoke painted portraits. The system supports drop-in replacement: change one function or swap to a `<img>` route, no callsite changes.
- **Per-item art** 🔶 — 105 of the 114 non-spell items have unique per-`id` silhouettes; **9 still fall back to their type-level silhouette** (`flameblade`, `godslayer`, `lifestone`, `moonstaff`, `shadowfang`, `shortbow`, `soulreaver`, `stormcleaver`, `thunderclaws` — mostly early-tier weapons). Authoring these 9 closes the gap to 100 % per-id coverage. The dev-time `console.warn` in `EntityArt` flags any item id missing a dedicated silhouette. The 35 spells use the `SPELL_SILHOUETTES` map by spell effect key. Type-level fallbacks (`weapon`/`armor`/`accessory`/`consumable`) remain in `ITEM_SILHOUETTES` as safety nets for catalog additions before a dedicated silhouette is authored.
- **Animated assets** — Lottie / SMIL animations for legendary loot reveals and boss intros. `EntityArt` would gain an optional `motion` prop pointing to a Lottie file.

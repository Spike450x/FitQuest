# V4 Item Silhouettes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add heraldic-framed silhouette art to non-spell item cards in the shop and inventory, giving every gear and consumable item a visual portrait that matches the RPG aesthetic already present on spell cards.

**Architecture:** The silhouettes are already authored in `silhouettes.tsx` (weapon/armor/accessory/consumable SVGs, keyed by `item.type` in `ITEM_SILHOUETTES`). `EntityArt` already supports `category="item"`. `rarityTint()` already maps item rarities to frame tints. The only work is adding the `EntityArt` import and a centered portrait div to the gear/consumable card JSX in two pages — no new files, no new types, no store changes.

**Tech Stack:** Next.js 15 App Router · React 18 · TypeScript 5 · Tailwind CSS

---

## File Map

| File                                | Change                                                     |
| ----------------------------------- | ---------------------------------------------------------- |
| `src/app/(game)/shop/page.tsx`      | Add imports + centered `EntityArt` to gear/consumable card |
| `src/app/(game)/inventory/page.tsx` | Add imports + centered `EntityArt` to gear/consumable card |

---

## Background: how the art system works

- `ITEM_SILHOUETTES` in `src/components/art/silhouettes.tsx` (line 1195) is a `Record<string, () => React.ReactNode>` with keys `'weapon'`, `'armor'`, `'accessory'`, `'consumable'` — exactly matching `ItemDef.type`.
- `EntityArt` (`src/components/art/EntityArt.tsx`) renders the silhouette inside a heraldic frame when a matching function is found, otherwise renders the `fallbackEmoji`.
- `rarityTint(rarity)` (`src/lib/entityArt.ts`) returns the correct `FrameTint` for the item's rarity: common→gray, uncommon→green, rare→blue, epic→purple, legendary→orange.
- Default `variant` for `category="item"` falls through to `'medallion'` — the right shape for gear (same as monsters and activities).
- Spell items are excluded from both card sections below — they already use `PremiumSpellCard` which renders `EntityArt` via `SpellCard`.

---

## Task 1 — Shop page: add silhouette to gear/consumable cards

**Files:**

- Modify: `src/app/(game)/shop/page.tsx`

**Context:**

The gear/consumable card JSX starts around line 188 with:

```tsx
// ── Gear / consumable items ──────────────────────────────────────────
const rarityScheme = RARITY_CARD[item.rarity];
const isLegendary = item.rarity === 'legendary';
return (
  <div
    key={item.id}
    className={`relative bg-white dark:bg-slate-900 border-2 ${rarityScheme.border} ${rarityScheme.glow} rounded-xl p-4 space-y-3 transition-all hover:-translate-y-0.5 hover:shadow-xl ${
      isLegendary ? 'animate-legendary-glow' : ''
    }`}
  >
    {/* Rarity accent strip */}
    <div
      className={`absolute top-0 left-0 right-0 h-1 rounded-t-[10px] ${rarityScheme.header}`}
      aria-hidden="true"
    />
    <div className="flex items-start justify-between gap-2">
      ...
    </div>
```

The art goes in a new centered `div` between the accent strip and the name row (`flex items-start justify-between`).

The file currently imports from `@/lib/gameLogic/items` and `@/components/ui/PremiumSpellCard`. Two new imports are needed: `EntityArt` and `rarityTint`.

A per-type fallback emoji map needs to be added at module level (near the other module-level constants at the top of the file):

```tsx
const ITEM_TYPE_EMOJI: Partial<Record<ItemType, string>> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💍',
  consumable: '🧪',
};
```

- [ ] **Step 1: Add the two new imports**

Open `src/app/(game)/shop/page.tsx`. Find the existing import block at the top. Add these two lines after the existing imports (before the module-level constants):

```tsx
import { EntityArt } from '@/components/art/EntityArt';
import { rarityTint } from '@/lib/entityArt';
```

- [ ] **Step 2: Add the fallback emoji map**

After the existing module-level constants (near lines 16–20 where `GEAR_SHOP_COUNT`, `PURCHASABLE_GEAR`, and `PURCHASABLE_SPELLS` are defined), add:

```tsx
const ITEM_TYPE_EMOJI: Partial<Record<ItemType, string>> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💍',
  consumable: '🧪',
};
```

- [ ] **Step 3: Insert the centered art into the gear/consumable card**

Find the gear/consumable card JSX section (after `// ── Gear / consumable items ──`). Find the existing `{/* Rarity accent strip */}` comment and the `<div className="flex items-start justify-between">` name row that comes right after it. Insert a new centered portrait div between them:

```tsx
{/* Rarity accent strip */}
<div
  className={`absolute top-0 left-0 right-0 h-1 rounded-t-[10px] ${rarityScheme.header}`}
  aria-hidden="true"
/>

{/* Item silhouette portrait */}
<div className="flex justify-center pt-1">
  <EntityArt
    category="item"
    id={item.type}
    size="md"
    tint={rarityTint(item.rarity)}
    fallbackEmoji={ITEM_TYPE_EMOJI[item.type]}
    ariaLabel={item.name}
  />
</div>

<div className="flex items-start justify-between gap-2">
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. `item.type` is `ItemType` (`'weapon' | 'armor' | 'accessory' | 'consumable' | 'spell'`) but in this code path `item.type !== 'spell'` is already guaranteed by how the shop renders spells separately via `PremiumSpellCard`. TypeScript won't narrow this automatically, but `EntityArt` accepts `id: string` so no type error.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(game)/shop/page.tsx"
git commit -m "Add item silhouette portrait to shop gear/consumable cards"
```

---

## Task 2 — Inventory page: add silhouette to gear/consumable cards

**Files:**

- Modify: `src/app/(game)/inventory/page.tsx`

**Context:**

The non-spell inventory card JSX starts around line 484 inside the `/* Non-spell tabs: 2-col grid */` section:

```tsx
<div
  key={invItem.id}
  className={`relative bg-white dark:bg-slate-900 border-2 rounded-xl p-4 space-y-2 transition-all hover:-translate-y-0.5 hover:shadow-lg ${rarityScheme.glow} ${
    isEquipped ? ... : rarityScheme.border
  } ${isLegendary && !isEquipped ? 'animate-legendary-glow' : ''}`}
>
  {/* Rarity accent strip */}
  <div
    className={`absolute top-0 left-0 right-0 h-1 rounded-t-[10px] ${rarityScheme.header}`}
    aria-hidden="true"
  />
  <div className="flex items-start justify-between gap-2">
    ...
  </div>
```

Same pattern: insert the portrait div between the accent strip and the name row.

- [ ] **Step 1: Add the two new imports**

Open `src/app/(game)/inventory/page.tsx`. Find the existing import block at the top. Add after the existing imports:

```tsx
import { EntityArt } from '@/components/art/EntityArt';
import { rarityTint } from '@/lib/entityArt';
```

- [ ] **Step 2: Add the fallback emoji map**

Near the top module-level constants (after the `TYPE_TABS` array or similar), add:

```tsx
const ITEM_TYPE_EMOJI: Partial<Record<ItemType, string>> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💍',
  consumable: '🧪',
};
```

- [ ] **Step 3: Insert the centered art into the inventory card**

Find the non-spell card JSX in the `/* Non-spell tabs: 2-col grid */` section. Find the `{/* Rarity accent strip */}` comment and the `<div className="flex items-start justify-between">` row after it. Insert between them:

```tsx
{/* Rarity accent strip */}
<div
  className={`absolute top-0 left-0 right-0 h-1 rounded-t-[10px] ${rarityScheme.header}`}
  aria-hidden="true"
/>

{/* Item silhouette portrait */}
<div className="flex justify-center pt-1">
  <EntityArt
    category="item"
    id={def.type}
    size="md"
    tint={rarityTint(def.rarity)}
    fallbackEmoji={ITEM_TYPE_EMOJI[def.type]}
    ariaLabel={def.name}
  />
</div>

<div className="flex items-start justify-between gap-2">
```

Note: the inventory uses `def` (not `item`) as the local variable name for `ItemDef`. Verify the variable name by reading the local scope before editing.

- [ ] **Step 4: Typecheck + lint**

```bash
npm run typecheck && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(game)/inventory/page.tsx"
git commit -m "Add item silhouette portrait to inventory gear/consumable cards"
```

---

## PR Checklist

Before opening the PR:

- [ ] `npm run typecheck` — passes
- [ ] `npm run lint` — passes
- [ ] `npm test` — passes (no game-logic tests touched)
- [ ] Manual verify — see smoke test below
- [ ] Update `CLAUDE.md` — add to Shipped: `V4 item silhouettes (EntityArt portraits on gear/consumable cards in shop and inventory)`
- [ ] Update `docs/CHANGELOG.md` — prepend entry

**Manual smoke test:**

1. Start dev server (`npm run dev`)
2. Navigate to `/shop` — in the daily rotation, hover over a gear/consumable item card (any non-spell item). You should see a centered heraldic silhouette portrait below the top accent strip: sword icon for weapons, shield for armor, ring for accessories, potion bottle for consumables. The frame tint should match the rarity (gray/green/blue/purple/orange)
3. Switch between different rarity items and confirm the tint changes correctly
4. Navigate to `/inventory` — any owned gear/consumable tab — same portraits should appear
5. Confirm in **dark mode** — the silhouettes use `currentColor` which adapts to dark mode automatically via Tailwind's `dark:` cascade
6. Legendary items should retain the `animate-legendary-glow` pulsing border alongside the portrait

**PR title:** `Add item silhouette portraits to gear and consumable cards`
**Branch:** `feat/item-silhouettes`

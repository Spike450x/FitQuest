# Premium Spell Cards — Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap `SpellCard` in a new `PremiumSpellCard` component that adds rarity-depth box-shadows, hover lift, and a mouse-tracking shimmer overlay — then swap all 4 call-sites to use it.

**Architecture:** A single new file `src/components/ui/PremiumSpellCard.tsx` wraps `SpellCard` transparently (same props, identical output at rest). A `position: relative; overflow: hidden; rounded-2xl` outer div clips the shimmer to the card edge and owns the `perspective` tilt. DOM style is mutated directly in `onMouseMove` / `onMouseLeave` handlers (no `useState`, no re-renders on every frame). Four call-sites swap their import/JSX tag; `SpellCard.tsx` itself is untouched.

**Tech Stack:** Next.js 15 App Router · React 18 · TypeScript 5 · Tailwind CSS

---

## File Map

| File                                     | Change                                     |
| ---------------------------------------- | ------------------------------------------ |
| `src/components/ui/PremiumSpellCard.tsx` | Create — new wrapper component             |
| `src/app/(game)/combat/page.tsx`         | Line ~90 import + line ~1478 JSX tag       |
| `src/app/(game)/inventory/page.tsx`      | Line ~9 import + lines ~288, ~456 JSX tags |
| `src/app/(game)/shop/page.tsx`           | Line ~9 import + line ~171 JSX tag         |

---

## Task 1 — Create `PremiumSpellCard.tsx`

**Files:**

- Create: `src/components/ui/PremiumSpellCard.tsx`

**Context:**

`SpellCard` renders a card with:

- Outer div: `flex flex-col rounded-2xl border-2 ${scheme.border} shadow-md overflow-hidden bg-white dark:bg-slate-900`
- Header: coloured by `RARITY_CARD[def.rarity].header`
- Body + action button area

`PremiumSpellCard` adds, via a parent wrapper:

1. **Rarity depth shadow** at rest — a coloured box-shadow tuned per rarity
2. **Hover lift** — `translateY(-4px)` + deeper shadow on any pointer hover
3. **Mouse-tracking 3D tilt** — `perspective(600px) rotateX/Y(±10deg)` following cursor position within the card
4. **Shimmer overlay** — a `position: absolute; inset: 0` div with a `radial-gradient` centred on cursor position, using `mix-blend-mode: screen`, coloured by rarity

The wrapper handles:

- `onMouseMove` — mutates `wrapperRef.current.style.transform`, `wrapperRef.current.style.boxShadow`, `shimmerRef.current.style.background` directly (zero re-renders)
- `onMouseLeave` — resets all three, restoring a smooth `transition: 300ms ease-out`

Mouse tracking is disabled automatically on touch devices because `mousemove` doesn't fire from finger taps.

**Rarity tint values (R, G, B strings for rgba()):**

| Rarity    | Shimmer tint    | Depth shadow    |
| --------- | --------------- | --------------- |
| common    | `180, 180, 190` | `100, 100, 110` |
| uncommon  | `80, 180, 110`  | `50, 140, 80`   |
| rare      | `90, 140, 220`  | `60, 100, 200`  |
| epic      | `170, 90, 220`  | `130, 50, 200`  |
| legendary | `220, 170, 50`  | `200, 140, 30`  |

- [ ] **Step 1: Create the file**

Create `src/components/ui/PremiumSpellCard.tsx` with the following content:

```tsx
'use client';

import { useRef } from 'react';
import { SpellCard } from './SpellCard';
import type { ItemDef } from '@/types';

const SHIMMER_TINT: Record<string, string> = {
  common: '180, 180, 190',
  uncommon: '80, 180, 110',
  rare: '90, 140, 220',
  epic: '170, 90, 220',
  legendary: '220, 170, 50',
};

const DEPTH_SHADOW: Record<string, string> = {
  common: '100, 100, 110',
  uncommon: '50, 140, 80',
  rare: '60, 100, 200',
  epic: '130, 50, 200',
  legendary: '200, 140, 30',
};

interface PremiumSpellCardProps {
  def: ItemDef;
  wisdomValue?: number;
  isEquipped?: boolean;
  affordable?: boolean;
  disabled?: boolean;
  acting?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function PremiumSpellCard({ def, className = '', ...rest }: PremiumSpellCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);

  const tint = SHIMMER_TINT[def.rarity] ?? SHIMMER_TINT.common;
  const depth = DEPTH_SHADOW[def.rarity] ?? DEPTH_SHADOW.common;
  const restShadow = `0 4px 12px -2px rgba(${depth}, 0.35), 0 2px 4px rgba(0,0,0,0.1)`;
  const hoverShadow = `0 12px 28px -4px rgba(${depth}, 0.55), 0 4px 8px rgba(0,0,0,0.2)`;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = wrapperRef.current;
    const sh = shimmerRef.current;
    if (!el || !sh) return;
    el.style.transition = 'none';
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotY = (x - 0.5) * 20;
    const rotX = -(y - 0.5) * 20;
    el.style.transform = `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
    el.style.boxShadow = hoverShadow;
    sh.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(${tint}, 0.35) 0%, transparent 60%)`;
  }

  function handleMouseLeave() {
    const el = wrapperRef.current;
    const sh = shimmerRef.current;
    if (!el || !sh) return;
    el.style.transition = 'transform 300ms ease-out, box-shadow 300ms ease-out';
    el.style.transform = 'translateY(0px)';
    el.style.boxShadow = restShadow;
    sh.style.background = 'none';
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{ boxShadow: restShadow, willChange: 'transform' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <SpellCard def={def} {...rest} />
      <div
        ref={shimmerRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ mixBlendMode: 'screen' }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. The `PremiumSpellCardProps` interface exactly mirrors `SpellCardProps`; the spread `{...rest}` passes all fields through.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PremiumSpellCard.tsx
git commit -m "Add PremiumSpellCard with shimmer and depth effects"
```

---

## Task 2 — Update all 4 call-sites

**Files:**

- Modify: `src/app/(game)/combat/page.tsx` — import line ~90, JSX line ~1478
- Modify: `src/app/(game)/inventory/page.tsx` — import line ~9, JSX lines ~288 and ~456
- Modify: `src/app/(game)/shop/page.tsx` — import line ~9, JSX line ~171

**Context:**

Each file imports `SpellCard` from `@/components/ui/SpellCard` and renders `<SpellCard .../>` with the same props interface that `PremiumSpellCard` accepts. The swap is import + tag only — no prop changes.

Current callsite snapshots (verify line numbers before editing — they may have shifted):

**combat/page.tsx (1 callsite)**

```tsx
import { SpellCard } from '@/components/ui/SpellCard';
// ...
<SpellCard
  key={invItem.id}
  def={def}
  wisdomValue={character.stats.wisdom}
  affordable={affordable || bloodPactAvail}
  disabled={!canCast || isRolling}
  actionLabel={actionLabel}
  onAction={() => canCast && handleCastSpell(def)}
/>;
```

**inventory/page.tsx (2 callsites)**

```tsx
import { SpellCard } from '@/components/ui/SpellCard';
// Callsite 1 (~line 288):
<SpellCard
  key={invItem.id}
  def={def}
  wisdomValue={character.stats.wisdom}
  isEquipped
  disabled={!!acting}
  acting={isActing}
  actionLabel={isActing ? 'Removing…' : 'Remove'}
  onAction={() => handleUnequipSpell(invItem.id)}
/>
// Callsite 2 (~line 456):
<SpellCard
  def={def}
  wisdomValue={character.stats.wisdom}
  isEquipped={isEquipped}
  disabled={!!acting}
  acting={isActing}
  actionLabel={actionLabel}
  onAction={() =>
    isEquipped ? handleUnequipSpell(invItem.id) : handleEquipSpell(invItem.id)
  }
/>
```

**shop/page.tsx (1 callsite)**

```tsx
import { SpellCard } from '@/components/ui/SpellCard';
// ...
<SpellCard
  key={item.id}
  def={item}
  wisdomValue={character.stats.wisdom}
  affordable={canAfford}
  disabled={owned || !canAfford || !!buying}
  acting={isBuying}
  actionLabel={actionLabel}
  onAction={() => !owned && handleBuy(item)}
/>;
```

- [ ] **Step 1: Update `combat/page.tsx`**

Replace:

```tsx
import { SpellCard } from '@/components/ui/SpellCard';
```

With:

```tsx
import { PremiumSpellCard } from '@/components/ui/PremiumSpellCard';
```

Then find the single `<SpellCard` in the spell panel section and replace the opening tag:

```tsx
<SpellCard
  key={invItem.id}
```

With:

```tsx
<PremiumSpellCard
  key={invItem.id}
```

And its closing tag `/>` — it's a self-closing tag so just change the one opening line. Note: if the tag uses `<SpellCard` as its closing form (it's a self-closing JSX element), you only need to change the one occurrence.

- [ ] **Step 2: Update `inventory/page.tsx`**

Replace:

```tsx
import { SpellCard } from '@/components/ui/SpellCard';
```

With:

```tsx
import { PremiumSpellCard } from '@/components/ui/PremiumSpellCard';
```

Then replace both `<SpellCard` occurrences with `<PremiumSpellCard` (both are self-closing elements).

- [ ] **Step 3: Update `shop/page.tsx`**

Replace:

```tsx
import { SpellCard } from '@/components/ui/SpellCard';
```

With:

```tsx
import { PremiumSpellCard } from '@/components/ui/PremiumSpellCard';
```

Then replace the single `<SpellCard` with `<PremiumSpellCard`.

- [ ] **Step 4: Typecheck + lint**

```bash
npm run typecheck && npm run lint
```

Expected: no errors. If `SpellCard` is no longer imported directly in any of these files, the unused-import rule will surface it — which is correct; the import should already be removed in the steps above.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(game\)/combat/page.tsx src/app/\(game\)/inventory/page.tsx src/app/\(game\)/shop/page.tsx
git commit -m "Swap SpellCard to PremiumSpellCard across all call-sites"
```

---

## PR Checklist

Before opening the PR:

- [ ] `npm run typecheck` — passes
- [ ] `npm run lint` — passes
- [ ] `npm test` — passes (no game-logic tests touched)
- [ ] Manual browser verify — see smoke test below
- [ ] Update `CLAUDE.md` — add to Shipped section: `Premium spell cards (PremiumSpellCard with depth shadow, hover lift, mouse-tracking shimmer)`
- [ ] Update `docs/CHANGELOG.md` — prepend entry for this PR

**Manual smoke test:**

1. Start dev server (`npm run dev`), navigate to `/combat`
2. Pick a monster and open the spell panel
3. Hover slowly over a spell card — you should see:
   - Card lifts slightly (`translateY(-4px)`)
   - Shadow deepens in the rarity's colour
   - A soft shimmer follows your cursor across the card face
   - Moving cursor to card corners tilts the card (subtle ±10° perspective tilt)
4. Move cursor off the card — it returns to flat smoothly (300ms ease-out)
5. Test in **dark mode** — shimmer should still be visible (mix-blend-mode: screen is additive)
6. Repeat on `/inventory` spell loadout section and `/shop` spell items — all should have the same premium effect
7. On a touch device (or Chrome DevTools → toggle device toolbar) — cards should render identically but the shimmer does not activate (expected)

**PR title:** `Add PremiumSpellCard with depth shadows and shimmer`
**Branch:** `feat/premium-spell-cards`

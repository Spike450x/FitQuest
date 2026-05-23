# Combat UI Polish — Phase 1 Bug Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three combat bugs: reward claim error isolation, spell button invisible in light mode, and BattleResultsModal/BattleLogEntry dark mode rendering.

**Architecture:** All changes are purely presentational or async-flow fixes in existing files — no new files, no Firebase writes, no store changes. B1 replaces a single try/catch with per-step isolation. B2 replaces an opacity-based disabled style with an explicit colour class. B3 patches four missing `dark:` class variants in `BattleResultsModal` and `BattleLogEntry`.

**Tech Stack:** Next.js 15 App Router · React 18 · Tailwind CSS · TypeScript 5

---

## File Map

| File                              | Change                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `src/app/(game)/combat/page.tsx`  | B1: `handleClaimRewards` function · B3: `BattleResultsModal` + `BattleLogEntry` |
| `src/components/ui/SpellCard.tsx` | B2: action button `className` only                                              |

---

## Task 1 — B1: Per-step claim isolation

**Files:**

- Modify: `src/app/(game)/combat/page.tsx` — `handleClaimRewards` only (~line 903)

**Context:** The current function wraps the entire claim chain (CF call → awardXpAndStats → awardGold → awardLoot → updateMonsterPity) in one try/catch. If `awardLoot` throws after the Cloud Function has already succeeded, the generic toast fires, `setPendingRewards(null)` never runs, the modal stays open, and a retry re-runs the CF → double XP/gold.

**Fix:** Per-step isolation. `setPendingRewards(null)` is called immediately after the CF succeeds (not at the end), so the modal closes and retry is impossible regardless of what the later steps do.

- [ ] **Step 1: Read the current function**

Open `src/app/(game)/combat/page.tsx` and find `handleClaimRewards` (around line 903). Read it fully so you understand the existing flow before editing.

- [ ] **Step 2: Replace `handleClaimRewards`**

Find and replace the entire `handleClaimRewards` function (from `async function handleClaimRewards()` to its closing `}`). The new version:

```tsx
async function handleClaimRewards() {
  if (!pendingRewards) return;
  playSound('claim');
  setClaiming(true);

  const { xpReward, goldReward, droppedItems, monster: defeated, uid } = pendingRewards;
  const gotLegendary = droppedItems.some((id) => {
    const def = getItemById(id);
    return def?.rarity === 'legendary';
  });

  // Step 1 — server-authoritative claim (idempotent CF — safe to retry if this throws)
  let claim: Awaited<ReturnType<typeof claimCombatVictoryCF>>;
  try {
    claim = await claimCombatVictoryCF({
      xpReward,
      goldReward,
      monsterId: defeated.id,
      monsterName: defeated.name,
      idempotencyKey: crypto.randomUUID(),
    });
  } catch {
    toast.error("Couldn't reach the server — tap Claim Rewards again", {
      description: 'Nothing was awarded yet. Your rewards are waiting.',
    });
    setClaiming(false);
    return; // keep modal open — retry is safe
  }

  const { finalXp, multiplier, winsTodayAfter } = claim;
  setWinsToday(winsTodayAfter);

  // CF succeeded — dismiss modal now. No double-award possible from here on.
  setPendingRewards(null);

  let lootSyncFailed = false;

  // Step 2 — local store sync (best-effort; CF already persisted to Firestore)
  try {
    await awardXpAndStats(finalXp, {});
    await awardGold(goldReward);
  } catch (err) {
    console.error('[handleClaimRewards] local stat sync failed:', err);
  }

  // Step 3 — loot (best-effort; flag failure so inventory reconciles on next load)
  try {
    await awardLoot(uid, droppedItems);
  } catch (err) {
    console.error('[handleClaimRewards] loot sync failed:', err);
    lootSyncFailed = true;
  }

  // Step 4 — pity bookkeeping (silent; non-critical)
  try {
    await updateMonsterPity(defeated.id, gotLegendary);
  } catch (err) {
    console.error('[handleClaimRewards] pity update failed:', err);
  }

  // Surface result
  if (lootSyncFailed) {
    toast.warning('Rewards claimed · inventory sync failed — refresh inventory to see your drop', {
      description: 'Your XP and gold were awarded.',
      duration: 8000,
    });
  } else {
    toastReward({
      emoji: '⚔️',
      title: `Defeated ${defeated.name}!`,
      xp: finalXp,
      gold: goldReward,
    });
  }

  if (multiplier < 1.0) {
    toast.warning(
      `Daily combat XP at ${Math.round(multiplier * 100)}% — win #${winsTodayAfter} today`,
      {
        description: 'Take a break or log activities to keep XP gains meaningful.',
        duration: 6000,
      },
    );
  }

  for (const itemId of droppedItems) {
    const def = getItemById(itemId);
    if (def && (def.rarity === 'epic' || def.rarity === 'legendary')) {
      toastLoot(def.name, def.rarity);
    }
  }

  setClaiming(false);
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. If TypeScript complains about `uid` not being on `PendingRewards`, find the `PendingRewards` type definition (search for `type PendingRewards` or `interface PendingRewards` in `combat/page.tsx`) and add `uid: string` to it.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(game\)/combat/page.tsx
git commit -m "Fix claim reward double-award on loot sync failure"
```

---

## Task 2 — B2: Spell button invisible in light mode

**Files:**

- Modify: `src/components/ui/SpellCard.tsx` — button `className` only (~line 248)

**Context:** The action button uses `${scheme.header} text-white disabled:opacity-40`. For common rarity (`bg-gray-500`), 40% opacity on a white card body = near-invisible gray on white in light mode. Dark mode is fine because the card body is dark. Fix: replace the opacity fallback with explicit disabled colours that work in both modes.

- [ ] **Step 1: Find the button**

In `src/components/ui/SpellCard.tsx`, find the `<button>` element in the action button section (around line 248). It currently reads:

```tsx
className={`w-full py-2 text-xs font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed
  ${scheme.header} text-white hover:opacity-90`}
```

- [ ] **Step 2: Replace the button className**

Replace that `className` with:

```tsx
className={`w-full py-2 text-xs font-semibold rounded-xl transition-colors
  ${disabled || acting
    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
    : `${scheme.header} text-white hover:opacity-90 cursor-pointer`
  }`}
```

Note: `disabled` and `acting` are already in scope (they're props destructured at the top of `SpellCard`).

- [ ] **Step 3: Typecheck + lint**

```bash
npm run typecheck && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Manual verify**

Start the dev server (`npm run dev`). Navigate to `/combat`, pick any monster, open the spell panel. In **light mode**:

- A spell you can't afford (magic cost > current magic): button should show as a visible gray/muted style, not near-invisible
- A spell you can afford: button should show in the rarity's colour (purple for rare, etc.)

Toggle to **dark mode** and confirm both states still look correct.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/SpellCard.tsx
git commit -m "Fix spell button invisible at disabled state in light mode"
```

---

## Task 3 — B3: Dark mode fixes in BattleResultsModal and BattleLogEntry

**Files:**

- Modify: `src/app/(game)/combat/page.tsx` — two components: `BattleResultsModal` (~line 3345) and `BattleLogEntry` (~line 2014)

**Context:** `BattleResultsModal` renders a white gradient background with no dark: variant, so it appears as a blinding white modal in dark mode. `BattleLogEntry` has a left border with `border-indigo-100` (light colour) and no dark variant. The "Drop Only" badge inside `BattleResultsModal` also lacks dark mode colours. All are precise, minimal class additions — no structural changes.

- [ ] **Step 1: Fix BattleResultsModal container gradient**

Find the `BattleResultsModal` function (~line 3345). Inside it, find the inner `<div>` with `bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/60`. It currently reads:

```tsx
<div className="relative bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/60 backdrop-blur-sm border border-indigo-100 rounded-2xl shadow-2xl shadow-indigo-500/30 w-full max-w-sm p-6 animate-[fadeIn_0.3s_ease-out] overflow-hidden">
```

Replace with:

```tsx
<div className="relative bg-gradient-to-br from-white dark:from-slate-900 via-indigo-50/40 dark:via-indigo-950/30 to-violet-50/60 dark:to-violet-950/20 backdrop-blur-sm border border-indigo-100 dark:border-indigo-900 rounded-2xl shadow-2xl shadow-indigo-500/30 w-full max-w-sm p-6 animate-[fadeIn_0.3s_ease-out] overflow-hidden">
```

- [ ] **Step 2: Fix "Victory!" title contrast in dark mode**

Find the `<p>` with `text-indigo-700` (the "Victory!" heading):

```tsx
<p className="font-display text-4xl font-bold text-indigo-700 tracking-wider uppercase drop-shadow-sm">
```

Replace with:

```tsx
<p className="font-display text-4xl font-bold text-indigo-700 dark:text-indigo-300 tracking-wider uppercase drop-shadow-sm">
```

- [ ] **Step 3: Fix "Drop Only" badge**

Find the "Drop Only" span (around line 3442):

```tsx
<span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600">
  ✦ Drop Only
</span>
```

Replace with:

```tsx
<span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
  ✦ Drop Only
</span>
```

- [ ] **Step 4: Fix BattleLogEntry left border**

Find the `BattleLogEntry` function (~line 2014). Find the `<li>` with `border-indigo-100`:

```tsx
<li className="text-sm border-l-2 border-indigo-100 pl-3 space-y-0.5">
```

Replace with:

```tsx
<li className="text-sm border-l-2 border-indigo-100 dark:border-indigo-900 pl-3 space-y-0.5">
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors (these are className string changes only).

- [ ] **Step 6: Visual verify in dark mode**

Start dev server. Open `/combat` in dark mode (use OS dark mode or browser DevTools → Rendering → Emulate dark mode).

Check:

- Start a fight and win a battle. The "Claim Rewards" modal must have a **dark background** (slate-900 base), not white
- The "Victory!" text must be clearly readable (indigo-300) against the dark background
- If any items dropped: "Drop Only" badge must use orange-tinted dark background
- Open the Battle Log section — the left border on each round entry must be a dark indigo, not white

- [ ] **Step 7: Commit**

```bash
git add src/app/\(game\)/combat/page.tsx
git commit -m "Fix dark mode rendering in BattleResultsModal and BattleLogEntry"
```

---

## PR Checklist

Before opening the PR:

- [ ] `npm run typecheck` — passes
- [ ] `npm run lint` — passes
- [ ] `npm test` — passes (no game-logic tests touched; this is a sanity check)
- [ ] Manual browser verify: all three fixes confirmed in both light and dark mode
- [ ] Update `CLAUDE.md` — add to Shipped section: `Combat bug fixes (B1 claim isolation, B2 spell button, B3 dark mode)`
- [ ] Update `docs/CHANGELOG.md` — prepend entry for this PR

**PR title:** `Fix combat claim flow, spell button, and dark mode modal`
**Branch:** `fix/combat-claim-bugs`

# Code Quality 10/10 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all Must Fix / Should Fix findings from the May 2026 code audit and implement the highest-value Next-Level Suggestions, raising the codebase readiness score from 8/10 to 10/10 before starting the Dungeons feature.

**Architecture:** Fixes are grouped from smallest/safest to largest/most structural. Tasks 1–5 are independent one-file changes that can be committed in a single wave. Tasks 6–12 are larger single-system changes. Task 13 is the biggest structural refactor (combat resolver).

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript 5, Zustand, Firebase Firestore, Tailwind CSS, Vitest

---

## File Map

| File                                            | Change                                           |
| ----------------------------------------------- | ------------------------------------------------ |
| `src/hooks/useRecentActivity.ts`                | Add `'use client'`                               |
| `src/store/characterStore.ts`                   | Fix falsy agility backfill guard                 |
| `src/app/(game)/dashboard/page.tsx`             | Fix `log.data.amount` unsafe cast                |
| `src/components/activities/ActivityLogForm.tsx` | Add `id`/`htmlFor` a11y                          |
| `src/lib/gameLogic/items.ts`                    | `getItemById` → Map lookup                       |
| `src/lib/gameLogic/passives.ts`                 | `getSubclassDef` → flat record                   |
| `src/hooks/useTodayKey.ts`                      | Add midnight setTimeout                          |
| `src/middleware.ts`                             | Invert to secure-by-default                      |
| `src/store/characterStore.ts`                   | Wire `captureError`                              |
| `src/store/questStore.ts`                       | Wire `captureError`                              |
| `src/store/inventoryStore.ts`                   | Wire `captureError`                              |
| `src/store/questStore.ts`                       | Move `fetching` flag inside Zustand state        |
| `src/store/inventoryStore.ts`                   | Extract `computeGearDelta` helper                |
| `src/lib/fetchPlayerData.ts`                    | Consolidate into `activityData.ts`               |
| `src/lib/activityData.ts`                       | Accept all activity-log operations               |
| `src/app/(game)/dashboard/page.tsx`             | Per-slice Zustand selectors                      |
| `src/app/(game)/quests/page.tsx`                | Per-slice Zustand selectors + XP display fix     |
| `src/app/(game)/shop/page.tsx`                  | Per-slice Zustand selectors                      |
| `src/app/(game)/inventory/page.tsx`             | Per-slice Zustand selectors                      |
| `src/lib/gameLogic/combat.ts`                   | Add `resolveRoundOutcome` utility                |
| `src/app/(game)/combat/page.tsx`                | Refactor 3 handlers to use `resolveRoundOutcome` |
| `src/hooks/useGameData.ts`                      | New facade hook (create)                         |

---

## Task 1: Quick wins — a11y, type safety, 'use client'

Four isolated single-line fixes. No tests needed; TypeScript and lint catch them.

**Files:**

- Modify: `src/hooks/useRecentActivity.ts:1`
- Modify: `src/store/characterStore.ts:119`
- Modify: `src/app/(game)/dashboard/page.tsx:266`
- Modify: `src/components/activities/ActivityLogForm.tsx` (label + input)

- [ ] **Step 1: Add `'use client'` to `useRecentActivity.ts`**

Open `src/hooks/useRecentActivity.ts`. Add as the first line:

```ts
'use client';
```

Result: file now starts with `'use client';` then a blank line, then `import { useEffect, useState } from 'react';`.

- [ ] **Step 2: Fix agility backfill guard in `characterStore.ts`**

In `src/store/characterStore.ts` around line 119, the current guard is:

```ts
if (!data.stats?.agility) {
```

Change it to:

```ts
if (data.stats?.agility === undefined) {
```

This prevents the backfill from firing (and writing to Firestore) on every load for characters whose agility is legitimately 0.

- [ ] **Step 3: Fix unsafe `log.data.amount` cast in `dashboard/page.tsx`**

In `src/app/(game)/dashboard/page.tsx`, line 266 currently reads:

```ts
const amount = (log.data as Record<string, number>).amount;
```

Change it to:

```ts
const amount = Number(log.data.amount);
```

`ActivityLog.data` is typed `Record<string, number | string>` so `log.data.amount` is already accessible; `Number()` safely coerces either to a numeric display value.

- [ ] **Step 4: Fix `ActivityLogForm` a11y — associate label with input**

In `src/components/activities/ActivityLogForm.tsx`, find the label element around line 273. Change:

```tsx
<label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
  {def.unit}
</label>
<input
  type="number"
  value={amount}
```

to:

```tsx
<label htmlFor="activity-amount" className="block text-sm font-medium text-gray-700 mb-1 capitalize">
  {def.unit}
</label>
<input
  id="activity-amount"
  type="number"
  value={amount}
```

- [ ] **Step 5: Verify**

```
npm run typecheck && npm run lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add src/hooks/useRecentActivity.ts src/store/characterStore.ts src/app/\(game\)/dashboard/page.tsx src/components/activities/ActivityLogForm.tsx
git commit -m "Fix a11y, type safety, and use client gaps from audit"
```

---

## Task 2: Performance — O(1) catalog lookups

`getItemById` and `getSubclassDef` are currently O(N) linear scans called inside render loops and combat resolution. Convert both to pre-built Maps.

**Files:**

- Modify: `src/lib/gameLogic/items.ts` (end of file)
- Modify: `src/lib/gameLogic/passives.ts` (around line 133)

- [ ] **Step 1: Convert `getItemById` to a Map in `items.ts`**

Find the bottom of `src/lib/gameLogic/items.ts`. The current implementation is:

```ts
export function getItemById(id: string): ItemDef | undefined {
  return ITEM_CATALOG.find((item) => item.id === id);
}
```

Replace with:

```ts
const ITEM_MAP = new Map(ITEM_CATALOG.map((item) => [item.id, item]));

export function getItemById(id: string): ItemDef | undefined {
  return ITEM_MAP.get(id);
}
```

The Map is initialized once at module load. All call sites are unchanged — `getItemById` signature is identical.

- [ ] **Step 2: Convert `getSubclassDef` to a flat record in `passives.ts`**

In `src/lib/gameLogic/passives.ts`, the current implementation around line 133:

```ts
export function getSubclassDef(subclass: CharacterSubclass): SubclassDef | undefined {
  for (const [a, b] of Object.values(SUBCLASS_CATALOG)) {
    if (a.id === subclass) return a;
    if (b.id === subclass) return b;
  }
  return undefined;
}
```

Replace with (insert the record just before the function):

```ts
const SUBCLASS_MAP: Record<string, SubclassDef> = Object.fromEntries(
  Object.values(SUBCLASS_CATALOG).flatMap(([a, b]) => [
    [a.id, a],
    [b.id, b],
  ]),
);

export function getSubclassDef(subclass: CharacterSubclass): SubclassDef | undefined {
  return SUBCLASS_MAP[subclass];
}
```

- [ ] **Step 3: Verify**

```
npm run typecheck && npm test
```

Expected: all pass — existing callers are unaffected.

- [ ] **Step 4: Commit**

```
git add src/lib/gameLogic/items.ts src/lib/gameLogic/passives.ts
git commit -m "Convert getItemById and getSubclassDef to O(1) Map lookups"
```

---

## Task 3: useTodayKey — add midnight fallback timer

A tab left open past midnight UTC will use yesterday's key until the user switches tabs. Add a setTimeout that fires at the next UTC midnight.

**Files:**

- Modify: `src/hooks/useTodayKey.ts`

- [ ] **Step 1: Add midnight setTimeout**

Replace the full contents of `src/hooks/useTodayKey.ts` with:

```ts
'use client';

import { useEffect, useState } from 'react';

export function useTodayKey(): string {
  const [key, setKey] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        const today = new Date().toISOString().slice(0, 10);
        setKey((prev) => (prev !== today ? today : prev));
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Fire at the next UTC midnight so a tab left open overnight auto-refreshes
  // the daily rotation without requiring a visibility event.
  useEffect(() => {
    const now = new Date();
    const msToMidnight =
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - Date.now();
    const t = setTimeout(() => {
      setKey(new Date().toISOString().slice(0, 10));
    }, msToMidnight);
    return () => clearTimeout(t);
  }, [key]); // re-schedule after each update so it always targets the *next* midnight

  return key;
}
```

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add src/hooks/useTodayKey.ts
git commit -m "Add midnight auto-refresh to useTodayKey"
```

---

## Task 4: Middleware — invert to secure-by-default

New routes (e.g., `/dungeons`) will be publicly accessible until manually added to `AUTH_PATHS`. Invert the logic: protect everything except explicitly public paths.

**Files:**

- Modify: `src/middleware.ts`

- [ ] **Step 1: Replace middleware implementation**

Replace the full contents of `src/middleware.ts` with:

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that do NOT require authentication
const PUBLIC_PATHS = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('__session')?.value;
  const isAuthed = Boolean(token);

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Every route is protected by default — no AUTH_PATHS allowlist to maintain.
  if (!isAuthed && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthed && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).+)'],
};
```

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Manual smoke check**

Start `npm run dev`. Confirm:

- `/login` is accessible without a session cookie
- `/dashboard` redirects to `/login` without a session
- After login, visiting `/login` redirects to `/dashboard`

- [ ] **Step 4: Commit**

```
git add src/middleware.ts
git commit -m "Invert middleware to secure-by-default (no AUTH_PATHS allowlist)"
```

---

## Task 5: Wire `captureError` into all store catch blocks

`src/lib/errors.ts` has a `captureError` stub ready for Sentry/equivalent. Currently, all store catch blocks call `set({ error: ... })` but never surface the error to any monitoring layer.

**Files:**

- Modify: `src/store/characterStore.ts`
- Modify: `src/store/questStore.ts`
- Modify: `src/store/inventoryStore.ts`

- [ ] **Step 1: Add import to each store**

In each of the three store files, add the import at the top of the file (after existing imports):

```ts
import { captureError } from '@/lib/errors';
```

- [ ] **Step 2: Wire into `characterStore.ts` catch blocks**

In `src/store/characterStore.ts`, find every `catch (e)` block. Each currently does:

```ts
} catch (e) {
  set({ error: (e as Error).message, loading: false });
}
```

Change each to:

```ts
} catch (e) {
  captureError('characterStore', e);
  set({ error: (e as Error).message, loading: false });
}
```

There are catch blocks in: `fetchCharacter`, `createCharacter`, `awardXpAndStats` (no loading — just add `captureError`), `awardGold`, `updateCurrentHp`, `updateCurrentStamina`, `updateCurrentMagic`, `allocateStatPoint`, `resetCharacter`, `persistStreakAndRecord`, `chooseSubclass`, `updateMonsterPity`, `updateName`.

For actions that don't call `set({ error })` (they silently fail), add a `try/catch` wrapper and call `captureError` only — do not add an `error` field to state for fire-and-forget writes.

- [ ] **Step 3: Wire into `questStore.ts` catch block**

In `src/store/questStore.ts`, find the single catch in `fetchAndAssignQuests`:

```ts
} catch (e) {
  set({ error: (e as Error).message, loading: false });
}
```

Change to:

```ts
} catch (e) {
  captureError('questStore.fetchAndAssignQuests', e);
  set({ error: (e as Error).message, loading: false });
}
```

Also add to `updateQuestProgress` and `claimReward` (which don't currently have try/catch — wrap their bodies and call `captureError`):

```ts
// updateQuestProgress — wrap existing body:
try {
  // ... existing body
} catch (e) {
  captureError('questStore.updateQuestProgress', e);
}

// claimReward — wrap existing body:
try {
  // ... existing body
} catch (e) {
  captureError('questStore.claimReward', e);
  return false;
}
```

- [ ] **Step 4: Wire into `inventoryStore.ts` catch blocks**

In `src/store/inventoryStore.ts`, add `captureError` to `fetchInventory` and `buyItem` catch blocks:

```ts
// fetchInventory:
} catch (e) {
  captureError('inventoryStore.fetchInventory', e);
  set({ error: (e as Error).message, loading: false });
}

// buyItem:
} catch (e) {
  captureError('inventoryStore.buyItem', e);
  set({ error: (e as Error).message });
  return false;
}
```

- [ ] **Step 5: Verify**

```
npm run typecheck && npm run lint && npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```
git add src/store/characterStore.ts src/store/questStore.ts src/store/inventoryStore.ts
git commit -m "Wire captureError into all store catch blocks"
```

---

## Task 6: Fix questStore module-level `fetching` flag (Must Fix)

The module-level `let fetching = false` is shared across all sessions in the same module instance. If a user signs out and back in, a residual `fetching = true` from the previous session can permanently block quest fetch until the page is reloaded.

**Files:**

- Modify: `src/store/questStore.ts`

- [ ] **Step 1: Move `fetching` into Zustand state**

The current code has a module-level variable:

```ts
let fetching = false; // module-level guard — prevents concurrent double-assignment
```

And uses it as:

```ts
fetchAndAssignQuests: async (uid, dateKey) => {
  if (fetching) return;
  fetching = true;
  ...
  } finally {
    fetching = false;
  }
},

clear: () => {
  fetching = false;
  set({ quests: [], loading: false, error: null });
},
```

Remove the module-level variable. Add `_fetching: boolean` to the `QuestStore` interface (internal, no JSDoc needed) and initialize it in state:

**Updated `QuestStore` interface** — add one field after `error`:

```ts
interface QuestStore {
  quests: ActiveQuest[];
  loading: boolean;
  error: string | null;
  _fetching: boolean;
  fetchAndAssignQuests: (uid: string, dateKey?: string) => Promise<void>;
  updateQuestProgress: (uid: string, activityType: ActivityType, amount: number) => Promise<void>;
  claimReward: (questId: string) => Promise<{ xpAwarded: number; goldAwarded: number } | false>;
  clear: () => void;
}
```

**Updated initial state** — add `_fetching: false`:

```ts
export const useQuestStore = create<QuestStore>((set, get) => ({
  quests: [],
  loading: false,
  error: null,
  _fetching: false,
```

**Updated `fetchAndAssignQuests`** — replace module-level flag with state reads/writes:

```ts
fetchAndAssignQuests: async (uid, dateKey) => {
  if (get()._fetching) return;
  set({ _fetching: true, loading: true, error: null });
  try {
    // ... rest of body unchanged ...
    set({ quests: [...existing, ...dailyAssigned, ...weeklyAssigned], loading: false });
  } catch (e) {
    captureError('questStore.fetchAndAssignQuests', e);
    set({ error: (e as Error).message, loading: false });
  } finally {
    set({ _fetching: false });
  }
},
```

**Updated `clear`** — include `_fetching` reset:

```ts
clear: () => set({ quests: [], loading: false, error: null, _fetching: false }),
```

Delete the `let fetching = false;` line.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint && npm test
```

Expected: all pass.

- [ ] **Step 3: Commit**

```
git add src/store/questStore.ts
git commit -m "Move questStore fetching guard into Zustand state (was session-persistent bug)"
```

---

## Task 7: Extract `computeGearDelta` from `inventoryStore`

`equipItem` and `unequipItem` each contain an identical ~25-line block computing `oldMaxHp`, `newMaxHp`, `hpDelta`, `staminaDelta`, `charUpdate`, `newCurrentHp`, and `newCurrentStamina`. Extract it.

**Files:**

- Modify: `src/store/inventoryStore.ts`

- [ ] **Step 1: Define the helper above the store**

In `src/store/inventoryStore.ts`, insert this function _before_ the `export const useInventoryStore = create(...)` line:

```ts
interface GearDeltaResult {
  charUpdate: Record<string, unknown>;
  newCurrentHp?: number;
  newCurrentStamina?: number;
}

function computeGearDelta(
  character: ReturnType<typeof useCharacterStore.getState>['character'],
  slot: 'weapon' | 'armor' | 'accessory',
  newItemDefId: string | null,
): GearDeltaResult {
  if (!character) return { charUpdate: { [`equippedGear.${slot}`]: newItemDefId } };

  const newEquippedGear: EquippedGear = { ...character.equippedGear, [slot]: newItemDefId };
  const oldMaxHp = playerMaxHp(character);
  const oldMaxStamina = playerMaxStamina(character);
  const newMaxHp = playerMaxHp({ stats: character.stats, equippedGear: newEquippedGear });
  const newMaxStamina = playerMaxStamina({ stats: character.stats, equippedGear: newEquippedGear });
  const hpDelta = newMaxHp - oldMaxHp;
  const staminaDelta = newMaxStamina - oldMaxStamina;

  const charUpdate: Record<string, unknown> = { [`equippedGear.${slot}`]: newItemDefId };
  let newCurrentHp: number | undefined;
  let newCurrentStamina: number | undefined;

  if (hpDelta !== 0) {
    newCurrentHp =
      newItemDefId !== null
        ? Math.max(1, Math.min((character.currentHp ?? oldMaxHp) + hpDelta, newMaxHp))
        : Math.max(1, (character.currentHp ?? oldMaxHp) + hpDelta);
    charUpdate.currentHp = newCurrentHp;
  }
  if (staminaDelta !== 0) {
    newCurrentStamina =
      newItemDefId !== null
        ? Math.max(
            0,
            Math.min((character.currentStamina ?? oldMaxStamina) + staminaDelta, newMaxStamina),
          )
        : Math.max(0, (character.currentStamina ?? oldMaxStamina) + staminaDelta);
    charUpdate.currentStamina = newCurrentStamina;
  }

  return { charUpdate, newCurrentHp, newCurrentStamina };
}
```

Note: `newItemDefId !== null` distinguishes equip (clamp to new max) from unequip (just subtract, no upper clamp needed).

You will also need to import `EquippedGear` — it's already imported via `@/types` in the file.

- [ ] **Step 2: Refactor `equipItem` to use the helper**

Replace the entire delta calculation block in `equipItem` (the block from "Compute HP/stamina delta" through `charUpdate.currentStamina = newCurrentStamina`) with:

```ts
const character = useCharacterStore.getState().character;
const { charUpdate, newCurrentHp, newCurrentStamina } = computeGearDelta(
  character,
  slot,
  target.itemDefId,
);
```

The `await Promise.all(...)` and `useCharacterStore.setState(...)` blocks below it remain unchanged.

- [ ] **Step 3: Refactor `unequipItem` to use the helper**

Replace the delta calculation block in `unequipItem` with:

```ts
const character = useCharacterStore.getState().character;
const { charUpdate, newCurrentHp, newCurrentStamina } = computeGearDelta(character, slot, null);
```

The `await Promise.all(...)` and `useCharacterStore.setState(...)` blocks below it remain unchanged.

- [ ] **Step 4: Verify**

```
npm run typecheck && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Manual verification**

Start `npm run dev`. Go to the inventory page. Equip an item and confirm the HP/stamina bar updates correctly. Unequip it and confirm it reverts. Equip a different item in the same slot and confirm the old one is unequipped.

- [ ] **Step 6: Commit**

```
git add src/store/inventoryStore.ts
git commit -m "Extract computeGearDelta helper to remove duplication in equipItem/unequipItem"
```

---

## Task 8: Consolidate `fetchPlayerData.ts` → `activityData.ts`

`fetchPlayerData.ts` contains functions that belong to three different collections. `activityData.ts` was started as the correct home for activity-log operations but the migration stalled. Complete it.

**Files:**

- Modify: `src/lib/activityData.ts` (accept all activity-log operations)
- Modify: `src/lib/fetchPlayerData.ts` (strip to re-exports only, leave normalizers)
- No callers change — they import from the same paths.

- [ ] **Step 1: Move activity-log functions into `activityData.ts`**

Replace the full contents of `src/lib/activityData.ts` with:

```ts
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ActivityLog } from '@/types';

export const ACTIVITY_LOGS_COLLECTION = 'activityLogs';

// ─── Normalizer ───────────────────────────────────────────────────────────────
// CONTRACT: whenever a new optional field is added to ActivityLog, add a safe
// default here. See "Adding a post-MVP schema field" in docs/FIRESTORE.md.

export function normalizeActivityLog(id: string, data: Record<string, unknown>): ActivityLog {
  return {
    ...data,
    id,
    rewardEligible: (data.rewardEligible as boolean | undefined) ?? true,
  } as ActivityLog;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

export async function fetchActivityLogs(uid: string): Promise<ActivityLog[]> {
  const snap = await getDocs(
    query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      where('uid', '==', uid),
      orderBy('loggedAt', 'desc'),
      limit(500),
    ),
  );
  return snap.docs.map((d) => normalizeActivityLog(d.id, d.data()));
}

export async function fetchRecentActivityLogs(uid: string, count: number): Promise<ActivityLog[]> {
  const snap = await getDocs(
    query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      where('uid', '==', uid),
      orderBy('loggedAt', 'desc'),
      limit(count),
    ),
  );
  return snap.docs.map((d) => normalizeActivityLog(d.id, d.data()));
}

export function subscribeToRecentActivity(
  uid: string,
  count: number,
  onData: (logs: ActivityLog[]) => void,
  onError: () => void,
): () => void {
  const q = query(
    collection(db, ACTIVITY_LOGS_COLLECTION),
    where('uid', '==', uid),
    orderBy('loggedAt', 'desc'),
    limit(count),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => normalizeActivityLog(d.id, d.data())));
    },
    onError,
  );
}
```

- [ ] **Step 2: Update `fetchPlayerData.ts` to re-export from `activityData.ts`**

Replace the full contents of `src/lib/fetchPlayerData.ts` with:

```ts
/**
 * @deprecated Activity-log operations have moved to activityData.ts.
 * Quest operations are in questData.ts. Inventory operations are in inventoryData.ts.
 * This file re-exports for backwards compatibility — update callers to import directly.
 */
export {
  normalizeActivityLog,
  fetchActivityLogs,
  subscribeToRecentActivity,
} from '@/lib/activityData';
export { normalizeActiveQuest, fetchActiveQuests } from '@/lib/questData';
export { normalizeInventoryItem, fetchInventoryItems } from '@/lib/inventoryData';
```

- [ ] **Step 3: Verify the re-exports exist in `questData.ts` and `inventoryData.ts`**

Run:

```
grep -n "export.*normalizeActiveQuest\|export.*fetchActiveQuests" src/lib/questData.ts
grep -n "export.*normalizeInventoryItem\|export.*fetchInventoryItems" src/lib/inventoryData.ts
```

If any are missing, add the missing exports to those files (copy the normalize function + fetch function from `fetchPlayerData.ts`).

- [ ] **Step 4: Update `useRecentActivity.ts` to import from `activityData`**

In `src/hooks/useRecentActivity.ts`, change:

```ts
import { subscribeToRecentActivity } from '@/lib/fetchPlayerData';
```

to:

```ts
import { subscribeToRecentActivity } from '@/lib/activityData';
```

- [ ] **Step 5: Update `activityData.ts` internal import**

In the new `src/lib/activityData.ts`, there is no longer an import of `normalizeActivityLog` from `fetchPlayerData` (it's now defined here). The old `activityData.ts` imported it — the new version defines it directly, so no import is needed.

- [ ] **Step 6: Verify**

```
npm run typecheck && npm run lint && npm test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```
git add src/lib/activityData.ts src/lib/fetchPlayerData.ts src/hooks/useRecentActivity.ts
git commit -m "Complete fetchPlayerData migration — activity ops now live in activityData.ts"
```

---

## Task 9: Fix Zustand selector pattern across game pages

Pages that destructure the full store (`const { quests, loading } = useQuestStore()`) subscribe to every store change — any `set()` anywhere in the store triggers a re-render. The correct pattern uses per-slice selectors.

**Files:**

- Modify: `src/app/(game)/dashboard/page.tsx`
- Modify: `src/app/(game)/quests/page.tsx`
- Modify: `src/app/(game)/shop/page.tsx`
- Modify: `src/app/(game)/inventory/page.tsx`

- [ ] **Step 1: Fix `dashboard/page.tsx` questStore subscription**

Current code (~lines 44–49):

```ts
const {
  quests,
  loading: questsLoading,
  error: questsError,
  fetchAndAssignQuests,
} = useQuestStore();
```

Replace with per-slice selectors:

```ts
const quests = useQuestStore((s) => s.quests);
const questsLoading = useQuestStore((s) => s.loading);
const questsError = useQuestStore((s) => s.error);
const fetchAndAssignQuests = useQuestStore((s) => s.fetchAndAssignQuests);
```

- [ ] **Step 2: Fix `quests/page.tsx` questStore subscription**

Find the `useQuestStore()` destructuring (around line 15–25 of that file). Replace with per-slice selectors:

```ts
const quests = useQuestStore((s) => s.quests);
const loading = useQuestStore((s) => s.loading);
const error = useQuestStore((s) => s.error);
const fetchAndAssignQuests = useQuestStore((s) => s.fetchAndAssignQuests);
const claimReward = useQuestStore((s) => s.claimReward);
```

- [ ] **Step 3: Fix `shop/page.tsx` inventoryStore subscription**

Current code (~lines 32–38):

```ts
const {
  items,
  loading: inventoryLoading,
  error: inventoryError,
  fetchInventory,
  buyItem,
} = useInventoryStore();
```

Replace with:

```ts
const items = useInventoryStore((s) => s.items);
const inventoryLoading = useInventoryStore((s) => s.loading);
const inventoryError = useInventoryStore((s) => s.error);
const fetchInventory = useInventoryStore((s) => s.fetchInventory);
const buyItem = useInventoryStore((s) => s.buyItem);
```

- [ ] **Step 4: Fix `inventory/page.tsx` inventoryStore subscription**

Current code (~lines 33–45):

```ts
const {
  items,
  loading,
  error: storeError,
  fetchInventory,
  equipItem,
  unequipItem,
  useConsumable: consumeItem,
  equipConsumable,
  unequipConsumable,
  equipSpell,
  unequipSpell,
} = useInventoryStore();
```

Replace with:

```ts
const items = useInventoryStore((s) => s.items);
const loading = useInventoryStore((s) => s.loading);
const storeError = useInventoryStore((s) => s.error);
const fetchInventory = useInventoryStore((s) => s.fetchInventory);
const equipItem = useInventoryStore((s) => s.equipItem);
const unequipItem = useInventoryStore((s) => s.unequipItem);
const consumeItem = useInventoryStore((s) => s.useConsumable);
const equipConsumable = useInventoryStore((s) => s.equipConsumable);
const unequipConsumable = useInventoryStore((s) => s.unequipConsumable);
const equipSpell = useInventoryStore((s) => s.equipSpell);
const unequipSpell = useInventoryStore((s) => s.unequipSpell);
```

- [ ] **Step 5: Verify**

```
npm run typecheck && npm run lint
```

Expected: no errors.

- [ ] **Step 6: Manual smoke check**

Start `npm run dev`. Visit dashboard, quests, shop, and inventory pages. Confirm all data loads and interactions (buy, equip, claim quest) still work.

- [ ] **Step 7: Commit**

```
git add src/app/\(game\)/dashboard/page.tsx src/app/\(game\)/quests/page.tsx src/app/\(game\)/shop/page.tsx src/app/\(game\)/inventory/page.tsx
git commit -m "Apply per-slice Zustand selectors across all game pages"
```

---

## Task 10: Fix quest card XP display (show scaled hint)

Quest cards show `def.rewards.xp` (base, unscaled) as the XP preview, but the actual awarded amount is level-scaled and streak-multiplied. A level-20 player sees "+50 XP" on the card but receives ~145 XP. Add a `~` prefix to signal scaling.

**Files:**

- Modify: `src/app/(game)/quests/page.tsx`

- [ ] **Step 1: Update the XP display in `QuestCard`**

In `src/app/(game)/quests/page.tsx`, find the XP span inside `QuestCard` (line ~113):

```tsx
<span className="text-xs text-indigo-600 font-semibold">+{def.rewards.xp} XP</span>
```

Replace with (use `rewardedXp` when available on a claimed quest, otherwise show the base with a `~` to indicate scaling applies):

```tsx
<span className="text-xs text-indigo-600 font-semibold" title="Scales with level and streak">
  {isClaimed && quest.rewardedXp != null ? `+${quest.rewardedXp} XP` : `~${def.rewards.xp}+ XP`}
</span>
```

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add src/app/\(game\)/quests/page.tsx
git commit -m "Show scaled XP hint on quest cards instead of raw base value"
```

---

## Task 11: Extract `resolveRoundOutcome` utility and refactor combat handlers

The three combat handlers (`handleAction`, `handleAbility`, `handleCastSpell`) each independently implement the same post-damage pipeline: incoming passives → per-round passives → final HP/Magic calc → outcome → loot roll. This ~50-line block must currently be fixed in 3 places for any logic change. Extract it to a shared utility.

**Files:**

- Modify: `src/lib/gameLogic/combat.ts` (add `resolveRoundOutcome` at the end)
- Modify: `src/app/(game)/combat/page.tsx` (refactor all 3 handlers)

- [ ] **Step 1: Write a failing test for `resolveRoundOutcome`**

In `src/lib/gameLogic/__tests__/combat.test.ts` (or the existing combat test file), add:

```ts
describe('resolveRoundOutcome', () => {
  it('returns win when monster hp reaches 0', () => {
    const result = resolveRoundOutcome({
      newMonsterHp: 0,
      preIncomingPlayerHp: 50,
      playerMagicBeforeBarrier: 10,
      passiveCtx: { currentHpPct: 1, currentMagic: 10, isFirstAbility: false, executeUsed: false },
      snapshot: { monster: { hp: 100, defense: 5, attack: 10 } } as any,
      character: { subclass: undefined, stats: { defense: 5 } } as any,
      maxHp: 100,
      maxMagic: 20,
      streakMultiplier: 1,
      getPityFor: () => 0,
    });
    expect(result.outcome).toBe('win');
    expect(result.killedMonster).toBe(true);
    expect(result.finalPlayerHp).toBe(50); // no incoming damage on a kill
  });

  it('returns loss when player hp reaches 0', () => {
    const result = resolveRoundOutcome({
      newMonsterHp: 10,
      preIncomingPlayerHp: 5, // monster will kill player
      playerMagicBeforeBarrier: 10,
      passiveCtx: {
        currentHpPct: 0.05,
        currentMagic: 10,
        isFirstAbility: false,
        executeUsed: false,
      },
      snapshot: { monster: { hp: 100, defense: 5, attack: 100 } } as any,
      character: { subclass: undefined, stats: { defense: 0 } } as any,
      maxHp: 100,
      maxMagic: 20,
      streakMultiplier: 1,
      getPityFor: () => 0,
    });
    expect(result.outcome).toBe('loss');
  });

  it('returns null outcome mid-fight', () => {
    const result = resolveRoundOutcome({
      newMonsterHp: 50,
      preIncomingPlayerHp: 80,
      playerMagicBeforeBarrier: 10,
      passiveCtx: {
        currentHpPct: 0.8,
        currentMagic: 10,
        isFirstAbility: false,
        executeUsed: false,
      },
      snapshot: { monster: { hp: 100, defense: 5, attack: 5 } } as any,
      character: { subclass: undefined, stats: { defense: 10 } } as any,
      maxHp: 100,
      maxMagic: 20,
      streakMultiplier: 1,
      getPityFor: () => 0,
    });
    expect(result.outcome).toBeNull();
    expect(result.killedMonster).toBe(false);
  });
});
```

Run: `npm test -- --reporter=verbose combat`

Expected: FAIL (function not defined yet).

- [ ] **Step 2: Implement `resolveRoundOutcome` in `combat.ts`**

At the end of `src/lib/gameLogic/combat.ts`, add:

```ts
export interface RoundOutcomeInput {
  /** Monster HP after player damage is applied (pre-passives). */
  newMonsterHp: number;
  /** Player HP after lifesteal/heals but before incoming monster damage. */
  preIncomingPlayerHp: number;
  /** Player magic after spell cost but before Mana Barrier drain. */
  playerMagicBeforeBarrier: number;
  passiveCtx: Parameters<typeof applyIncomingPassives>[2];
  snapshot: { monster: MonsterDef; droppedItems: string[] };
  character: Character;
  maxHp: number;
  maxMagic: number;
  streakMultiplier: number;
  getPityFor: (monsterId: string) => number;
}

export interface RoundOutcomeResult {
  killedMonster: boolean;
  incoming: ReturnType<typeof applyIncomingPassives>;
  perRound: ReturnType<typeof getPerRoundPassives>;
  finalPlayerHp: number;
  finalPlayerMagic: number;
  outcome: 'win' | 'loss' | null;
  droppedItems: string[];
}

export function resolveRoundOutcome(input: RoundOutcomeInput): RoundOutcomeResult {
  const {
    newMonsterHp,
    preIncomingPlayerHp,
    playerMagicBeforeBarrier,
    passiveCtx,
    snapshot,
    character,
    maxHp,
    maxMagic,
    streakMultiplier,
    getPityFor,
  } = input;

  const killedMonster = newMonsterHp === 0;

  const incoming = killedMonster
    ? { damage: 0, magicDrained: 0, divineAegisBlocked: false, ironWillActive: false }
    : applyIncomingPassives(character, snapshot.monster.attack /* raw */, passiveCtx);

  const perRound = getPerRoundPassives(character);

  const newPlayerHpRaw = Math.max(0, preIncomingPlayerHp - incoming.damage);
  const outcome: 'win' | 'loss' | null =
    newPlayerHpRaw === 0 ? 'loss' : killedMonster ? 'win' : null;

  const finalPlayerHp =
    outcome === null ? Math.min(newPlayerHpRaw + perRound.hpRestore, maxHp) : newPlayerHpRaw;

  const magicAfterBarrier = Math.max(0, playerMagicBeforeBarrier - incoming.magicDrained);
  const finalPlayerMagic =
    outcome === null
      ? Math.min(magicAfterBarrier + perRound.magicRestore, maxMagic)
      : magicAfterBarrier;

  const droppedItems = killedMonster
    ? rollLoot(snapshot.monster.lootTable, streakMultiplier, getPityFor(snapshot.monster.id))
    : snapshot.droppedItems;

  return {
    killedMonster,
    incoming,
    perRound,
    finalPlayerHp,
    finalPlayerMagic,
    outcome,
    droppedItems,
  };
}
```

**Important:** `applyIncomingPassives` takes the raw monster damage as its second argument — in `handleAction` that is `baseMonsterDamage`; in `handleAbility` it is `resolution.monsterDamage`; in `handleCastSpell` it is `resolution.monsterDamage`. The page handlers still compute the raw damage — they pass it as `preIncomingPlayerHp` context is already handled in the input. You will need to look at the exact second argument each handler currently passes to `applyIncomingPassives` and keep that in the handler, passing the _already-applied_ result (i.e. `incoming`) through the existing call rather than through `resolveRoundOutcome`.

**Correction:** Since each handler needs `incoming` for different reasons (it produces `divineAegisBlocked`, `magicDrained` for the `RoundEntry`), the cleanest approach is to make `resolveRoundOutcome` take the **raw monster damage** and compute `applyIncomingPassives` internally. This means:

```ts
/** Raw monster counter-attack damage before passives. 0 if monster is dead. */
rawMonsterDamage: number;
```

Add `rawMonsterDamage: number` to `RoundOutcomeInput` and replace the `incoming` line:

```ts
const incoming = killedMonster
  ? { damage: 0, magicDrained: 0, divineAegisBlocked: false, ironWillActive: false }
  : applyIncomingPassives(character, input.rawMonsterDamage, passiveCtx);
```

Remove the `snapshot.monster.attack` reference.

- [ ] **Step 3: Run the test**

```
npm test -- --reporter=verbose combat
```

Expected: PASS for the three new tests.

- [ ] **Step 4: Refactor `handleAction` in `combat/page.tsx`**

In `handleAction`, the shared block currently runs from "Incoming passives" through "droppedItems = killedMonster ? rollLoot..." (~lines 400–427). Replace it with:

```ts
const roundResult = resolveRoundOutcome({
  newMonsterHp,
  preIncomingPlayerHp: Math.min(snapshot.playerHp + attackSoulDrain, maxHp),
  playerMagicBeforeBarrier: snapshot.playerMagic,
  rawMonsterDamage: killedMonster ? 0 : baseMonsterDamage,
  passiveCtx,
  snapshot,
  character,
  maxHp,
  maxMagic,
  streakMultiplier,
  getPityFor,
});
const { incoming, perRound, finalPlayerHp, finalPlayerMagic, outcome, droppedItems } = roundResult;
```

Keep the `entry` construction below — it still needs the individual fields from `incoming` and `perRound` for the round log. Update references: `actualMonsterDamage` → `incoming.damage`, etc.

- [ ] **Step 5: Refactor `handleAbility` in `combat/page.tsx`**

Same pattern. Replace the duplicate incoming/perRound/outcome block with:

```ts
const roundResult = resolveRoundOutcome({
  newMonsterHp,
  preIncomingPlayerHp: Math.min(fightState.playerHp + totalHeal, maxHp),
  playerMagicBeforeBarrier: fightState.playerMagic,
  rawMonsterDamage: killedMonster ? 0 : resolution.monsterDamage,
  passiveCtx: abilityCtx,
  snapshot,
  character,
  maxHp,
  maxMagic,
  streakMultiplier,
  getPityFor,
});
const { incoming, perRound, finalPlayerHp, finalPlayerMagic, outcome, droppedItems } = roundResult;
```

- [ ] **Step 6: Refactor `handleCastSpell` in `combat/page.tsx`**

```ts
const roundResult = resolveRoundOutcome({
  newMonsterHp,
  preIncomingPlayerHp: Math.min(
    snapshot.playerHp + resolution.healAmount + spellSoulDrain - bloodPactHpCost,
    maxHp,
  ),
  playerMagicBeforeBarrier: newMagic,
  rawMonsterDamage: killedMonster ? 0 : resolution.monsterDamage,
  passiveCtx: spellCtx,
  snapshot,
  character,
  maxHp,
  maxMagic,
  streakMultiplier,
  getPityFor,
});
const { incoming, perRound, finalPlayerHp, finalPlayerMagic, outcome, droppedItems } = roundResult;
```

- [ ] **Step 7: Add `resolveRoundOutcome` import to `combat/page.tsx`**

Update the import from `@/lib/gameLogic/combat`:

```ts
import {
  playerMaxHp,
  playerMaxStamina,
  playerMaxMagic,
  calculateRound,
  rollRunAway,
  rollLoot,
  gearAttackBonus,
  gearDefenseBonus,
  LEGENDARY_PITY_THRESHOLD,
  resolveRoundOutcome,
} from '@/lib/gameLogic/combat';
```

- [ ] **Step 8: Verify**

```
npm run typecheck && npm run lint && npm test
```

Expected: all pass.

- [ ] **Step 9: Manual combat test**

Start `npm run dev`. Complete at least one fight using:

- A normal attack
- A class ability
- A spell

Confirm damage numbers, round log entries, win/loss screens, and reward claims all work correctly.

- [ ] **Step 10: Commit**

```
git add src/lib/gameLogic/combat.ts src/app/\(game\)/combat/page.tsx src/lib/gameLogic/__tests__/combat.test.ts
git commit -m "Extract resolveRoundOutcome utility — combat handlers share one post-damage pipeline"
```

---

## Task 12: Add `useGameData` facade hook

`dashboard/page.tsx` uses 5+ hooks to assemble game state. The same pattern is repeated on every page. A single `useGameData()` hook centralizes this and simplifies per-page boilerplate.

**Files:**

- Create: `src/hooks/useGameData.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useGameData.ts`:

```ts
'use client';

import { useCharacter } from './useCharacter';
import { useRecentActivity } from './useRecentActivity';
import { useTodayKey } from './useTodayKey';
import { useQuestStore } from '@/store/questStore';
import { useInventoryStore } from '@/store/inventoryStore';
import type { Character } from '@/types';

export interface GameData {
  character: Character | null;
  user: ReturnType<typeof useCharacter>['user'];
  loading: boolean;
  error: string | null;
  quests: ReturnType<typeof useQuestStore.getState>['quests'];
  questsLoading: boolean;
  questsError: string | null;
  recentLogs: ReturnType<typeof useRecentActivity>['logs'];
  logsLoading: boolean;
  inventoryItems: ReturnType<typeof useInventoryStore.getState>['items'];
  todayKey: string;
}

/**
 * Aggregates the data most game pages need into a single hook call.
 * All loading flags are OR'd together into a single `loading` boolean.
 */
export function useGameData(): GameData {
  const { character, loading: charLoading, error: charError, user } = useCharacter();
  const { logs: recentLogs, loading: logsLoading } = useRecentActivity(character?.uid);
  const todayKey = useTodayKey();
  const quests = useQuestStore((s) => s.quests);
  const questsLoading = useQuestStore((s) => s.loading);
  const questsError = useQuestStore((s) => s.error);
  const inventoryItems = useInventoryStore((s) => s.items);

  return {
    character,
    user,
    loading: charLoading || logsLoading,
    error: charError,
    quests,
    questsLoading,
    questsError,
    recentLogs,
    logsLoading,
    inventoryItems,
    todayKey,
  };
}
```

- [ ] **Step 2: Verify the hook compiles**

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: (Optional) Adopt in dashboard page**

Update `src/app/(game)/dashboard/page.tsx` to use `useGameData`:

```ts
import { useGameData } from '@/hooks/useGameData';

// Replace the multiple hook calls at the top of DashboardPage with:
const {
  character,
  user,
  loading,
  error: characterError,
  quests,
  questsLoading,
  questsError,
  recentLogs: logs,
  logsLoading,
  todayKey,
} = useGameData();
// Remove: const { logs, loading: logsLoading } = useRecentActivity(character?.uid);
// Remove: const todayKey = useTodayKey();
// Remove: const { quests, questsLoading, questsError, fetchAndAssignQuests } = useQuestStore lines
// Keep: const fetchCharacter = useCharacterStore((s) => s.fetchCharacter);
// Keep: const fetchAndAssignQuests = useQuestStore((s) => s.fetchAndAssignQuests);
```

- [ ] **Step 4: Verify**

```
npm run typecheck && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```
git add src/hooks/useGameData.ts src/app/\(game\)/dashboard/page.tsx
git commit -m "Add useGameData facade hook to reduce per-page hook boilerplate"
```

---

## Final Verification

- [ ] **Full verification pass**

```
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all pass, build succeeds with no errors or warnings.

- [ ] **Manual golden-path smoke test**

Run `npm run dev` and verify:

1. Log in → redirect to dashboard
2. Dashboard loads character, quests, recent activity
3. Log an activity → quest progress updates → streak shows
4. Fight a monster using attack, ability, and spell → win → claim rewards
5. Equip/unequip gear from inventory → HP/stamina bars update
6. Buy an item from shop
7. Claim a completed quest → XP awarded matches toast
8. Visit `/dungeons` (route doesn't exist yet) → redirects to `/login` (not a 404, thanks to secure-by-default middleware)

---

## Self-Review Checklist

Spec items checked against tasks:

| Finding                                     | Task    |
| ------------------------------------------- | ------- |
| useRecentActivity missing 'use client'      | Task 1  |
| Agility backfill falsy guard                | Task 1  |
| log.data.amount unsafe cast                 | Task 1  |
| ActivityLogForm a11y                        | Task 1  |
| getItemById O(N)                            | Task 2  |
| getSubclassDef O(N)                         | Task 2  |
| useTodayKey midnight timer                  | Task 3  |
| Middleware whitelist → secure-by-default    | Task 4  |
| captureError unwired                        | Task 5  |
| questStore module-level fetching (Must Fix) | Task 6  |
| inventoryStore gear delta duplication       | Task 7  |
| fetchPlayerData consolidation               | Task 8  |
| Zustand selector pattern                    | Task 9  |
| Quest card XP display                       | Task 10 |
| Combat resolution triplication              | Task 11 |
| useGameData facade                          | Task 12 |

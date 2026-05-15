'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Tracks which inventory items the current user has not yet seen since their
 * `acquiredAt` timestamp. State is persisted in localStorage so a refresh
 * doesn't re-mark every item as new.
 *
 * Usage:
 *   const { isNew, markAllSeen } = useInventoryNewMarkers(uid, items);
 *   isNew(item.id) → boolean
 *   markAllSeen() → call when the user navigates to the inventory page
 */
export function useInventoryNewMarkers(
  uid: string | undefined,
  items: Array<{ id: string; acquiredAt: number }>,
) {
  const storageKey = uid ? `fq:inventory:lastSeen:${uid}` : null;
  const [lastSeen, setLastSeen] = useState<number>(0);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      setLastSeen(raw ? Number(raw) : 0);
    } catch {
      setLastSeen(0);
    }
  }, [storageKey]);

  const newIds = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      if (it.acquiredAt > lastSeen) set.add(it.id);
    }
    return set;
  }, [items, lastSeen]);

  const markAllSeen = useCallback(() => {
    if (!storageKey) return;
    const now = Date.now();
    try {
      window.localStorage.setItem(storageKey, String(now));
    } catch {
      // ignore quota / privacy mode errors
    }
    setLastSeen(now);
  }, [storageKey]);

  return {
    isNew: (id: string) => newIds.has(id),
    newCount: newIds.size,
    markAllSeen,
  };
}

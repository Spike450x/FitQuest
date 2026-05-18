'use client';

import { useEffect, useState } from 'react';

/**
 * Returns a stable UTC date string ('YYYY-MM-DD') that updates automatically
 * when the tab becomes visible after midnight, or at midnight if the tab stays open.
 * Use as a useMemo dependency for anything that rotates daily.
 */
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
  }, [key]); // re-schedule after each key update so it always targets the *next* midnight

  return key;
}

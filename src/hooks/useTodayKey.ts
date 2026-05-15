'use client';

import { useEffect, useState } from 'react';

/**
 * Returns a stable UTC date string ('YYYY-MM-DD') that updates automatically
 * when the tab becomes visible after midnight. Use as a useMemo dependency for
 * anything that rotates daily so the rotation refreshes on the next interaction
 * after midnight without requiring a hard page reload.
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

  return key;
}

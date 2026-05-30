'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'fitquest:nav:pinned';
export const MAX_PINNED = 5;
const MIN_PINNED = 1;

/**
 * Persists which nav hrefs are pinned in the primary mobile bar.
 * Reads from localStorage on mount; writes on every toggle.
 */
export function useNavPreference(validHrefs: readonly string[], defaultPinned: readonly string[]) {
  // Stable refs so the mount effect doesn't re-fire on re-render.
  const validRef = useRef(validHrefs);
  const [pinnedHrefs, setPinnedHrefs] = useState<string[]>(() => [...defaultPinned]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const valid = (parsed as unknown[])
        .filter((h): h is string => typeof h === 'string' && validRef.current.includes(h))
        .slice(0, MAX_PINNED);
      if (valid.length >= MIN_PINNED) setPinnedHrefs(valid);
    } catch {
      // Ignore malformed localStorage data.
    }
  }, []); // Intentionally mount-only — validRef is stable.

  const togglePin = useCallback((href: string) => {
    setPinnedHrefs((prev) => {
      let next: string[];
      if (prev.includes(href)) {
        if (prev.length <= MIN_PINNED) return prev; // Must keep at least one.
        next = prev.filter((h) => h !== href);
      } else {
        if (prev.length >= MAX_PINNED) return prev; // Already at cap.
        next = [...prev, href];
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors (private browsing, quota, etc.)
      }
      return next;
    });
  }, []);

  return { pinnedHrefs, togglePin };
}

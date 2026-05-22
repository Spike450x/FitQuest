'use client';

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'fitquest-theme';

function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Theme controller. The actual class on `<html>` is set pre-hydration by the
 * bootstrap script in `src/app/layout.tsx`, so the only job here is to keep
 * the class + localStorage in sync with the user's explicit choice and to
 * notify any other component that's watching.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  // Subscribe to cross-tab + manual changes (the toggle could be elsewhere)
  useEffect(() => {
    function syncFromDom() {
      setThemeState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    }
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) syncFromDom();
    }
    window.addEventListener('storage', onStorage);
    // MutationObserver catches changes from other parts of the app
    const observer = new MutationObserver(syncFromDom);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('storage', onStorage);
      observer.disconnect();
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore quota / privacy-mode errors — class is still set in the DOM.
    }
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme };
}

'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ThemeContext, type Theme } from '@/hooks/useTheme';

const STORAGE_KEY = 'fitquest-theme';

/**
 * Single source of truth for the app theme. Mounts once in the root layout
 * and manages ONE piece of React state + ONE MutationObserver, so all
 * consumers always see the same value and there are no race conditions between
 * independent useTheme() instances.
 *
 * Initialises as 'light' (matching SSR) then syncs to the real DOM value
 * after mount — the no-flash bootstrap script in layout.tsx may have already
 * applied 'dark' before React hydrated.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Sync to whatever the bootstrap script already applied to <html>.
    setThemeState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    setMounted(true);

    // Cross-tab sync: another tab changed the stored preference.
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      const next: Theme = e.newValue === 'dark' ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', next === 'dark');
      setThemeState(next);
    }
    window.addEventListener('storage', onStorage);

    // Catch direct DOM changes (browser extensions, devtools).
    const observer = new MutationObserver(() => {
      setThemeState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
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

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

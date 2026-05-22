'use client';

import { createContext, useContext } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggleTheme: () => void;
  /** False until the provider has read the real theme from the DOM after mount. */
  mounted: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Reads the current theme from ThemeProvider. Must be rendered inside
 * ThemeProvider (wired in the root layout).
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

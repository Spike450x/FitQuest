'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  /** When 'icon' (default) only the bulb shows; 'full' adds a label. */
  variant?: 'icon' | 'full';
  className?: string;
}

/**
 * Light/dark theme switcher. Reads + writes localStorage via `useTheme`.
 * Renders a Sun in dark mode (to suggest the action) and a Moon in light mode.
 */
export function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={[
        'inline-flex items-center gap-2 rounded-lg transition-colors',
        'border',
        variant === 'icon' ? 'p-2' : 'px-3 py-1.5 text-sm font-medium',
        // Light mode
        'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900',
        // Dark mode
        'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon className="w-4 h-4" aria-hidden="true" strokeWidth={2} />
      {variant === 'full' && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  );
}

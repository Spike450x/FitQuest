'use client';

import { useEffect, useState } from 'react';
import { useWelcomeBackActive } from '@/hooks/useWelcomeBackBoost';

const STORAGE_KEY = 'fitquest:welcomeback:dismissedAt';
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // re-show after 24h if still eligible

/**
 * Top-of-page banner shown when the player qualifies for the welcome-back
 * boost (absent ≥ 14 days, no active streak tier). Surfaces +30% loot and
 * +10% XP boost copy, plus a one-tap dismiss that hides the banner for 24h.
 *
 * The boost itself is applied by `useWelcomeBackActive` consumers (combat
 * XP calc + loot rolls). This component is purely the player-facing nudge.
 */
export function WelcomeBackBanner() {
  const active = useWelcomeBackActive();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!active) {
      setDismissed(true);
      return;
    }
    try {
      const lastDismissedRaw = localStorage.getItem(STORAGE_KEY);
      const lastDismissed = lastDismissedRaw ? Number(lastDismissedRaw) : 0;
      setDismissed(Date.now() - lastDismissed < DISMISS_TTL_MS);
    } catch {
      setDismissed(false);
    }
  }, [active]);

  function handleDismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  if (!active || dismissed) return null;

  return (
    <div
      role="status"
      data-testid="welcome-back-banner"
      className="px-4 py-3 bg-gradient-to-r from-amber-50 via-rose-50 to-violet-50 dark:from-amber-950/40 dark:via-rose-950/40 dark:to-violet-950/40 border-b border-amber-200/80 dark:border-amber-800/60"
    >
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <span className="text-xl shrink-0">🎁</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-slate-100">
            Welcome back! Your next session has{' '}
            <span className="font-semibold text-amber-700 dark:text-amber-300">+30% loot</span>
            {' & '}
            <span className="font-semibold text-violet-700 dark:text-violet-300">+10% XP</span>.
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Log any activity to start rebuilding your streak.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors shrink-0 px-2 py-1"
          aria-label="Dismiss welcome-back banner"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Award } from 'lucide-react';
import { reputationProgress, reputationRank } from '@/lib/gameLogic/reputation';

interface ReputationChipProps {
  /** Lifetime reputation — drives the rank label. */
  lifetime: number;
  /** Spendable balance shown as the number. Defaults to `lifetime` (pre-spend). */
  spendable?: number;
  size?: 'sm' | 'md' | 'lg';
  /** When true, show the rank label beside the number. */
  showRank?: boolean;
  /** When true, tween between value changes; defaults to true. */
  animate?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<ReputationChipProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl font-bold',
};

const ICON_SIZE: Record<NonNullable<ReputationChipProps['size']>, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function ReputationChip({
  lifetime,
  spendable,
  size = 'md',
  showRank = false,
  animate = true,
}: ReputationChipProps) {
  const amount = spendable ?? lifetime;
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(amount);
  const fromRef = useRef(amount);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (reduce || !animate) {
      setDisplay(amount);
      fromRef.current = amount;
      return;
    }
    const from = fromRef.current;
    if (from === amount) return;

    setPulse(true);
    const start = performance.now();
    const duration = 700;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (amount - from) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = amount;
        setTimeout(() => setPulse(false), 250);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [amount, animate, reduce]);

  const rank = reputationRank(lifetime);

  return (
    <span
      title={`${rank.label} · ${amount.toLocaleString()} reputation`}
      className={`inline-flex items-center gap-1 text-violet-500 dark:text-violet-300 tabular-nums transition-transform ${SIZE_CLASSES[size]} ${
        pulse ? 'scale-110 text-violet-600 dark:text-violet-200' : ''
      }`}
    >
      <Award className={ICON_SIZE[size]} aria-hidden="true" />
      {display.toLocaleString()}
      {showRank && (
        <span className="text-xs font-semibold text-violet-400 dark:text-violet-400/80">
          {rank.label}
        </span>
      )}
    </span>
  );
}

// ─── Rank progress bar ────────────────────────────────────────────────────────
// Fuller display for the profile page: current rank, progress to the next, and
// the lifetime remaining. Pure derivation from `reputationProgress`.

export function ReputationRankBar({ lifetime }: { lifetime: number }) {
  const { rank, next, pctToNext, remaining, atMax } = reputationProgress(lifetime);

  return (
    <div data-testid="reputation-rank-bar" className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-violet-500 dark:text-violet-300" aria-hidden="true" />
          <span className="font-semibold text-sm text-gray-900 dark:text-slate-100">
            {rank.label}
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-slate-400 tabular-nums">
          {lifetime.toLocaleString()} lifetime
        </span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
          style={{ width: `${pctToNext}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 dark:text-slate-500">
        {atMax
          ? 'Top rank reached — Legendary.'
          : `${remaining.toLocaleString()} to ${next?.label}`}
      </p>
    </div>
  );
}

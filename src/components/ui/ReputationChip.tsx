'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Award, Check, Lock } from 'lucide-react';
import {
  REPUTATION_RANKS,
  reputationProgress,
  reputationRank,
  isRankUnlocked,
  resolveActiveTitle,
} from '@/lib/gameLogic/reputation';
import { useCharacterStore } from '@/store/characterStore';
import type { ReputationRankId } from '@/types';

// What each rank unlocks — UI copy (mostly "coming soon" until those systems ship).
const RANK_UNLOCKS: Record<ReputationRankId, string> = {
  newcomer: 'Wanted Board access',
  known: 'Reputation vendor (coming soon)',
  respected: 'Monthly NPCs · tier-2 champions (coming soon)',
  renowned: 'Raids · guild switching (coming soon)',
  legendary: 'God-tier vendor & cosmetics (coming soon)',
};

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

// ─── Rank ladder ──────────────────────────────────────────────────────────────
// The full 5-tier ladder: every rank's title, threshold, what it unlocks, and the
// player's unlocked/current/locked state. Pure display from `lifetime`.

export function ReputationLadder({ lifetime }: { lifetime: number }) {
  const current = reputationRank(lifetime);
  return (
    <ul data-testid="reputation-ladder" className="space-y-1.5">
      {REPUTATION_RANKS.map((rank) => {
        const unlocked = isRankUnlocked(lifetime, rank.id);
        const isCurrent = rank.id === current.id;
        return (
          <li
            key={rank.id}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
              isCurrent
                ? 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/40'
                : unlocked
                  ? 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                  : 'border-gray-100 bg-gray-50 dark:border-slate-800 dark:bg-slate-900/40 opacity-70'
            }`}
          >
            <span
              className={`shrink-0 ${unlocked ? 'text-violet-500 dark:text-violet-300' : 'text-gray-300 dark:text-slate-600'}`}
            >
              {unlocked ? <Award className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {rank.label}
                </span>
                <span className="text-xs italic text-violet-600 dark:text-violet-300">
                  “{rank.title}”
                </span>
                {isCurrent && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/50 rounded-full px-1.5 py-0.5">
                    You
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 truncate">
                {RANK_UNLOCKS[rank.id]}
              </p>
            </div>
            <span className="shrink-0 text-xs text-gray-400 dark:text-slate-500 tabular-nums">
              {rank.threshold.toLocaleString()}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Titles selector ────────────────────────────────────────────────────────────
// Locked/unlocked title ladder. The player equips any UNLOCKED title; the choice
// persists to `character.activeTitle` via the shared applyCharacterPatch writer.

export function ReputationTitles({
  lifetime,
  activeTitle,
}: {
  lifetime: number;
  activeTitle?: ReputationRankId;
}) {
  const applyCharacterPatch = useCharacterStore((s) => s.applyCharacterPatch);
  const current = reputationRank(lifetime);
  // The title actually shown today (equipped-if-unlocked, else current rank).
  const shownTitle = resolveActiveTitle(lifetime, activeTitle);

  function equip(id: ReputationRankId) {
    if (!isRankUnlocked(lifetime, id)) return;
    applyCharacterPatch({ activeTitle: id });
  }

  return (
    <div data-testid="reputation-titles" className="space-y-2">
      <p className="text-xs text-gray-500 dark:text-slate-400">
        Equipped title:{' '}
        <span className="font-semibold text-violet-600 dark:text-violet-300">“{shownTitle}”</span>
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {REPUTATION_RANKS.map((rank) => {
          const unlocked = isRankUnlocked(lifetime, rank.id);
          const equipped =
            unlocked && (activeTitle ? activeTitle === rank.id : rank.id === current.id);
          return (
            <li key={rank.id}>
              <button
                type="button"
                disabled={!unlocked}
                onClick={() => equip(rank.id)}
                aria-pressed={equipped}
                className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                  equipped
                    ? 'border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/50'
                    : unlocked
                      ? 'border-gray-200 bg-white hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-700'
                      : 'border-gray-100 bg-gray-50 dark:border-slate-800 dark:bg-slate-900/40 opacity-60 cursor-not-allowed'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                    “{rank.title}”
                  </span>
                  <span className="block text-[11px] text-gray-400 dark:text-slate-500">
                    {rank.label} · {rank.threshold.toLocaleString()} rep
                  </span>
                </span>
                {equipped ? (
                  <Check className="w-4 h-4 shrink-0 text-violet-600 dark:text-violet-300" />
                ) : unlocked ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-500 shrink-0">
                    Equip
                  </span>
                ) : (
                  <Lock className="w-3.5 h-3.5 shrink-0 text-gray-300 dark:text-slate-600" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

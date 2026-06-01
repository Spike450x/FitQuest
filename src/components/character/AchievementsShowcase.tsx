'use client';

import Link from 'next/link';
import { ACHIEVEMENTS } from '@/lib/gameLogic/achievements';
import type { Character } from '@/types';

const TOTAL = Object.keys(ACHIEVEMENTS).length;
/** How many badges to surface in the compact strip (most recent unlocks). */
const PREVIEW_COUNT = 8;

/**
 * Compact achievements strip — unlock count, a preview row of the most-recently
 * earned badges, and a deep link to the full Collections gallery. Keeps the
 * character sheet's progression block self-contained without re-implementing
 * the full grid that already lives at `/collections`.
 */
export function AchievementsShowcase({ character }: { character: Character }) {
  const unlocked = character.achievements ?? [];
  // `achievements` is appended in unlock order, so the tail is the freshest.
  const preview = unlocked.slice(-PREVIEW_COUNT).reverse();
  const pct = Math.round((unlocked.length / TOTAL) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-600 dark:text-slate-300">
          <span className="font-bold text-gray-900 dark:text-slate-100 tabular-nums">
            {unlocked.length}
          </span>{' '}
          <span className="text-gray-400 dark:text-slate-500">/ {TOTAL} unlocked</span>
        </p>
        <Link
          href="/collections"
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
        >
          View all →
        </Link>
      </div>

      <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {preview.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-slate-500">
          No badges yet — clear dungeons, win fights, and master activities to earn them.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {preview.map((id) => {
            const def = ACHIEVEMENTS[id];
            if (!def) return null;
            return (
              <span
                key={id}
                title={`${def.name} — ${def.description}`}
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-lg cursor-default"
                aria-label={def.name}
              >
                {def.emoji}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

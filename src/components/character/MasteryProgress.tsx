'use client';

import { Card } from '@/components/ui/Card';
import { POLYMATH_THRESHOLD } from '@/lib/gameLogic/achievements';
import type { Character } from '@/types';

const POLYMATH_TRACKS: Array<{
  activity: 'workout' | 'run' | 'steps' | 'meditation';
  label: string;
  colorClass: string;
}> = [
  { activity: 'workout', label: 'Strength', colorClass: 'bg-red-400 dark:bg-red-500' },
  { activity: 'steps', label: 'Wisdom', colorClass: 'bg-blue-400 dark:bg-blue-500' },
  { activity: 'run', label: 'Agility', colorClass: 'bg-teal-400 dark:bg-teal-500' },
  { activity: 'meditation', label: 'Spirit', colorClass: 'bg-violet-400 dark:bg-violet-500' },
];

/**
 * Polymath / mastery progress — pip-rows showing how close each primary stat is
 * to the mastery threshold. Shared by the profile and the character sheet so the
 * progression read is identical on both. Keeps the `polymath-progress` testid
 * the e2e suite relies on.
 */
export function MasteryProgress({ character }: { character: Character }) {
  const unlocked = (character.achievements ?? []).includes('polymath');
  const counts = character.masteryCounts ?? {};

  return (
    <Card variant="default" padding="lg" data-testid="polymath-progress">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
            🎓 Polymath progress
          </h3>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            {unlocked
              ? 'Unlocked — all 4 primary stats mastered.'
              : `Hit mastery ${POLYMATH_THRESHOLD} on every primary stat.`}
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {POLYMATH_TRACKS.map(({ activity, label, colorClass }) => {
          const count = Math.min(POLYMATH_THRESHOLD, counts[activity] ?? 0);
          const done = (counts[activity] ?? 0) >= POLYMATH_THRESHOLD;
          return (
            <li key={activity} className="flex items-center gap-3">
              <span
                className={`text-xs font-medium w-20 ${
                  done
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-600 dark:text-slate-300'
                }`}
              >
                {label}
              </span>
              <div className="flex gap-1 flex-1">
                {Array.from({ length: POLYMATH_THRESHOLD }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      i < count
                        ? unlocked
                          ? 'bg-emerald-400 dark:bg-emerald-500'
                          : colorClass
                        : 'bg-gray-200 dark:bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400 dark:text-slate-500 tabular-nums w-8 text-right">
                {done ? '✓' : `${count}/${POLYMATH_THRESHOLD}`}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

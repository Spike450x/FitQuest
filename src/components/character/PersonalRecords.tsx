'use client';

import { EntityArt } from '@/components/art/EntityArt';
import { ACTIVITY_ICONS, ACTIVITY_ORDER } from '@/lib/activityIcons';
import { ACTIVITY_DEFINITIONS } from '@/lib/gameLogic/constants';
import type { Character } from '@/types';

/**
 * Personal-best grid — the player's highest logged value per activity. Shared
 * by the stats page and the character sheet so a "best" reads identically on
 * both. Renders the grid only (no card chrome) so each caller can wrap it.
 */
export function PersonalRecords({ character }: { character: Character }) {
  const records = character.personalRecords ?? {};
  const hasAny = ACTIVITY_ORDER.some((t) => records[t]);

  if (!hasAny) {
    return (
      <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
        No personal records yet — log activities to set your bests!
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {ACTIVITY_ORDER.map((type) => {
        const pr = records[type];
        const def = ACTIVITY_DEFINITIONS[type];
        return (
          <div
            key={type}
            className={`rounded-xl p-3 border text-center ${
              pr
                ? 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                : 'bg-gray-50 dark:bg-slate-900 border-gray-100 dark:border-slate-800 opacity-50'
            }`}
          >
            <div className="flex justify-center mb-1">
              <EntityArt
                category="activity"
                id={type}
                size="sm"
                fallbackEmoji={ACTIVITY_ICONS[type]}
                ariaLabel={def.label}
              />
            </div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {def.label}
            </p>
            {pr ? (
              <>
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {pr.value % 1 === 0 ? pr.value : pr.value.toFixed(1)}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{pr.unit}</p>
                <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">
                  {new Date(pr.loggedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-300 dark:text-slate-600 font-medium">—</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

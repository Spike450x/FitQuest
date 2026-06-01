'use client';

import type { Character } from '@/types';

interface Tile {
  label: string;
  value: string;
  icon: string;
}

function daysSince(ms: number): number {
  return Math.max(1, Math.floor((Date.now() - ms) / 86_400_000) + 1);
}

/**
 * Career snapshot — the lifetime tallies the game already tracks but never
 * showcased on a single surface. A "look how far you've come" moment that
 * reinforces long-term progression.
 */
export function LifetimeTotals({ character }: { character: Character }) {
  const monstersSlain = Object.values(character.monstersKilled ?? {}).reduce(
    (sum, m) => sum + (m.killCount ?? 0),
    0,
  );

  const tiles: Tile[] = [
    { label: 'Battles Won', value: (character.totalCombatWins ?? 0).toLocaleString(), icon: '⚔️' },
    { label: 'Monsters Slain', value: monstersSlain.toLocaleString(), icon: '💀' },
    {
      label: 'Quests Claimed',
      value: (character.totalQuestsClaimed ?? 0).toLocaleString(),
      icon: '📜',
    },
    {
      label: 'Bounties Done',
      value: (character.bountiesCompleted ?? 0).toLocaleString(),
      icon: '🎯',
    },
    {
      label: 'Longest Streak',
      value: `${character.streakData?.longestStreak ?? 0} d`,
      icon: '🔥',
    },
    { label: 'Days Adventuring', value: `${daysSince(character.createdAt)} d`, icon: '🗓️' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {tiles.map(({ label, value, icon }) => (
        <div
          key={label}
          className="rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 px-3 py-3 text-center"
        >
          <div className="text-lg leading-none mb-1" aria-hidden="true">
            {icon}
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100 tabular-nums">
            {value}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

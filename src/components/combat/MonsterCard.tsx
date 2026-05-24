'use client';

import { LEGENDARY_PITY_THRESHOLD } from '@/lib/gameLogic/combat';
import { EntityArt } from '@/components/art/EntityArt';
import type { MonsterDef } from '@/types';

// Arena-only emoji map. Dungeon monster portraits are handled separately.
export const MONSTER_EMOJI: Record<string, string> = {
  'goblin-scout': '👺',
  'giant-rat': '🐀',
  'forest-goblin': '👹',
  'orc-grunt': '👊',
  'cave-spider': '🕷️',
  'skeleton-warrior': '💀',
  'dark-wolf': '🐺',
  'stone-troll': '🗿',
  'dark-mage': '🧙',
  'lich-king': '☠️',
  'ancient-dragon': '🐉',
};

export function MonsterCard({
  monster,
  playerLevel,
  dryStreak = 0,
  onFight,
}: {
  monster: MonsterDef;
  playerLevel: number;
  dryStreak?: number;
  onFight: (m: MonsterDef) => void;
}) {
  const emoji = MONSTER_EMOJI[monster.id] ?? '👾';
  const levelDiff = monster.level - playerLevel;
  const diffLabel = levelDiff <= -2 ? 'Easy' : levelDiff <= 1 ? 'Fair' : 'Hard';
  const diffColor =
    levelDiff <= -2 ? 'text-emerald-500' : levelDiff <= 1 ? 'text-amber-500' : 'text-red-500';
  const pityActive = dryStreak >= LEGENDARY_PITY_THRESHOLD;
  const pityBoostPct = pityActive
    ? Math.min(
        Math.round((dryStreak - LEGENDARY_PITY_THRESHOLD) * 0.02 * 100),
        Math.round((0.95 - 0.1) * 100),
      )
    : 0;
  const tierClass =
    levelDiff <= -2
      ? 'border-emerald-200/70 dark:border-emerald-900/60 hover:shadow-emerald-500/20'
      : levelDiff <= 1
        ? 'border-amber-200/70 dark:border-amber-900/60 hover:shadow-amber-500/20'
        : 'border-rose-300/70 dark:border-rose-800/70 hover:shadow-rose-500/30 shadow-rose-500/10';

  return (
    <div
      className={`bg-white dark:bg-slate-900 border-2 rounded-xl p-4 shadow-sm space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg group ${tierClass}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="transition-transform group-hover:scale-110 group-hover:-rotate-3">
            <EntityArt
              category="monster"
              id={monster.id}
              size="md"
              fallbackEmoji={emoji}
              ariaLabel={monster.name}
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">{monster.name}</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Level {monster.level} ·{' '}
              <span className={`font-medium ${diffColor}`}>{diffLabel}</span>
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-indigo-600 font-semibold">+{monster.xpReward} XP</p>
          <p className="text-xs text-amber-500 font-semibold">+{monster.goldReward} 💰</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-slate-400">{monster.description}</p>
      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-slate-500">
        <span>❤️ {monster.hp} HP</span>
        <span>⚔️ {monster.attack} ATK</span>
        <span>🛡️ {monster.defense} DEF</span>
      </div>
      {dryStreak > 0 && (
        <div
          className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 border ${
            pityActive
              ? 'bg-orange-50 border-orange-200 text-orange-700'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
          title={
            pityActive
              ? `Legendary drop chance is boosted +${pityBoostPct}% after ${dryStreak} dry kills`
              : `${LEGENDARY_PITY_THRESHOLD - dryStreak} more kills until legendary pity kicks in`
          }
        >
          <span>{pityActive ? '🔥' : '🎯'}</span>
          <span>
            Hunting · {dryStreak} kill{dryStreak !== 1 ? 's' : ''}
          </span>
          {pityActive && (
            <span className="ml-auto font-semibold text-orange-600">
              +{pityBoostPct}% legendary
            </span>
          )}
        </div>
      )}
      <button
        onClick={() => onFight(monster)}
        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:shadow-md hover:shadow-indigo-500/40 text-white text-sm font-bold py-2 rounded-lg transition-all active:scale-[0.98]"
      >
        Fight!
      </button>
    </div>
  );
}

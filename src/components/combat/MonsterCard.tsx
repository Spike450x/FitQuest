'use client';

import { LEGENDARY_PITY_THRESHOLD } from '@/lib/gameLogic/combat';
import { EntityArt } from '@/components/art/EntityArt';
import type { MonsterDef, MonsterSpecialEffect } from '@/types';

/** One-line hint describing what a monster special move does, for the chip tooltip. */
function specialMoveHint(effect: MonsterSpecialEffect): string {
  switch (effect.kind) {
    case 'heavy':
      return `Can hit for ${effect.multiplier}× damage`;
    case 'pierce':
      return 'Can ignore your armor on a hit';
    case 'burst':
      return 'Can unleash a magic blast that ignores armor';
    case 'drain':
      return `Can heal itself for ${effect.pct}% of the damage dealt`;
    case 'stun':
      return 'Winds up a stun — land it and you lose a turn';
  }
}

export const MONSTER_EMOJI: Record<string, string> = {
  // Original roster (L1–10)
  'goblin-scout': '👺',
  'giant-rat': '🐀',
  'mud-imp': '😈',
  'forest-goblin': '👹',
  'boar-runt': '🐗',
  'orc-grunt': '👊',
  'cave-spider': '🕷️',
  'bog-lurker': '🐊',
  'skeleton-warrior': '💀',
  'iron-husk': '🤖',
  'dark-wolf': '🐺',
  'frost-wraith': '👻',
  'stone-troll': '🗿',
  'dark-mage': '🧙',
  'gloom-knight': '🛡️',
  'lich-king': '☠️',
  'ancient-dragon': '🐉',
  // Endgame roster (L11–14)
  'obsidian-golem': '🪨',
  ashwyrm: '🐍',
  'void-revenant': '👁️',
  'storm-djinn': '⚡',
  // Dungeon bosses
  'boss-goblin-king': '👑',
  'boss-broodmother': '🕸️',
  'boss-necromancer': '🧟',
  'boss-dragon-king': '🐲',
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
        {monster.attackType === 'magic' && (
          <span className="text-violet-500 font-semibold" title="Magic attacks ignore your armor">
            🔮 Magic
          </span>
        )}
      </div>
      {monster.specialMoves && monster.specialMoves.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {monster.specialMoves.map((sp) => (
            <span
              key={sp.id}
              className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/60"
              title={specialMoveHint(sp.effect)}
            >
              {sp.emoji} {sp.name}
            </span>
          ))}
        </div>
      )}
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
        data-testid={`monster-fight-${monster.id}`}
        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:shadow-md hover:shadow-indigo-500/40 text-white text-sm font-bold py-2 rounded-lg transition-all active:scale-[0.98]"
      >
        Fight!
      </button>
    </div>
  );
}

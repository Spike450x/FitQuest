'use client';

import { XPBar } from '@/components/ui/XPBar';
import { GoldDisplay } from '@/components/ui/GoldDisplay';
import { EntityArt } from '@/components/art/EntityArt';
import { StatBar } from './StatBar';
import { ResourceBars } from './ResourceBars';
import { STAT_BAR_CONFIG, STAT_BAR_MAX } from './statConfig';
import { CLASS_DEFINITIONS } from '@/lib/gameLogic/constants';
import { effectiveStat, totalGearBonuses } from '@/lib/gameLogic/combat';
import { getItemById, RARITY_TEXT } from '@/lib/gameLogic/items';
import type { Character, CharacterClass } from '@/types';

// Class-themed portrait frame palette. Keeps identity moments distinct per
// class without commissioning per-class character art.
const CLASS_THEME: Record<CharacterClass, { gradient: string; ring: string; accent: string }> = {
  warrior: {
    gradient: 'from-red-100 via-orange-50 to-amber-50',
    ring: 'ring-red-300',
    accent: 'text-red-600',
  },
  wizard: {
    gradient: 'from-violet-100 via-indigo-50 to-blue-50',
    ring: 'ring-violet-300',
    accent: 'text-violet-600',
  },
  rogue: {
    gradient: 'from-emerald-100 via-teal-50 to-slate-50',
    ring: 'ring-emerald-300',
    accent: 'text-emerald-600',
  },
};

const SLOT_ICON: Record<'weapon' | 'armor' | 'accessory', string> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💍',
};

interface CharacterCardProps {
  character: Character;
}

export function CharacterCard({ character }: CharacterCardProps) {
  const classDef = CLASS_DEFINITIONS[character.class];
  const theme = CLASS_THEME[character.class];
  const gearBonuses = totalGearBonuses(character.equippedGear);

  return (
    <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
      {/* Themed top banner */}
      <div
        className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${theme.gradient} opacity-80`}
        aria-hidden="true"
      />
      <div
        className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/40 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative p-6 space-y-5">
        {/* Header — portrait + name + class */}
        <div className="flex items-start gap-4">
          {/* Portrait frame */}
          <div className="relative shrink-0">
            <EntityArt
              category="class"
              id={character.class}
              size="lg"
              fallbackEmoji={classDef.emoji}
              ariaLabel={`${classDef.label} portrait`}
            />
            <span
              className={`absolute -bottom-1 right-0 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-full px-1.5 py-0.5 text-[10px] font-display font-bold tabular-nums shadow-sm ${theme.accent}`}
            >
              Lv {character.level}
            </span>
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight truncate">
              {character.name}
            </h2>
            <p className={`text-sm mt-0.5 font-semibold ${theme.accent}`}>{classDef.label}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {classDef.description.split('.')[0]}.
            </p>
          </div>

          <GoldDisplay amount={character.gold} size="md" />
        </div>

        {/* XP Bar */}
        <XPBar xp={character.xp} level={character.level} xpToNextLevel={character.xpToNextLevel} />

        {/* Combat resources — HP / Stamina / Magic */}
        <ResourceBars character={character} />

        {/* Primary stat bars */}
        <div className="space-y-3 pt-1 border-t border-gray-100 dark:border-slate-800">
          <p className="text-xs text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider pt-1">
            Stats
          </p>
          {STAT_BAR_CONFIG.map(({ key, label, icon, color }) => {
            const base = character.stats[key] ?? 0;
            const bonus = gearBonuses[key] ?? 0;
            // Effective combat value = class-scaled base + flat gear. Surfaced
            // when the class multiplier changes it, so the bar (allocation) and
            // the real in-combat number are both visible.
            const combatValue = effectiveStat(character, key) + bonus;
            const gearNote = bonus > 0 ? `+${bonus} gear` : undefined;
            const combatNote =
              classDef.statMultipliers[key] !== 1 ? `⚔ ${combatValue} in combat` : undefined;
            const suffix = [gearNote, combatNote].filter(Boolean).join(' · ') || undefined;
            return (
              <StatBar
                key={key}
                label={label}
                value={base + bonus}
                max={STAT_BAR_MAX}
                color={color}
                icon={icon}
                suffix={suffix}
              />
            );
          })}
        </div>

        {/* Equipped gear summary */}
        <div className="pt-1 border-t border-gray-100 dark:border-slate-800">
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-2 font-semibold uppercase tracking-wider">
            Equipped
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {(['weapon', 'armor', 'accessory'] as const).map((slot) => {
              const equippedId = character.equippedGear[slot];
              const equipped = equippedId ? getItemById(equippedId) : null;
              return (
                <div
                  key={slot}
                  className={`rounded-lg p-2 border transition-colors ${
                    equipped
                      ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 shadow-sm'
                      : 'bg-gray-50 dark:bg-slate-900 border-dashed border-gray-300 dark:border-slate-700'
                  }`}
                >
                  <div className="text-lg leading-none" aria-hidden="true">
                    {SLOT_ICON[slot]}
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 capitalize mt-1">
                    {slot}
                  </p>
                  <p
                    className={`text-xs mt-0.5 truncate font-medium ${
                      equipped
                        ? RARITY_TEXT[equipped.rarity]
                        : 'text-gray-400 dark:text-slate-500 italic'
                    }`}
                    title={equipped?.name ?? 'empty'}
                  >
                    {equipped?.name ?? 'empty'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { XPBar } from '@/components/ui/XPBar';
import { GoldDisplay } from '@/components/ui/GoldDisplay';
import { EntityArt } from '@/components/art/EntityArt';
import { StatBar } from './StatBar';
import { CLASS_DEFINITIONS } from '@/lib/gameLogic/constants';
import { effectiveStat, playerMaxStamina, totalGearBonuses } from '@/lib/gameLogic/combat';
import { getItemById, RARITY_TEXT } from '@/lib/gameLogic/items';
import { StrengthIcon, WisdomIcon, AgilityIcon, SpiritIcon } from '@/components/art/stat-icons';
import type { Character, CharacterClass } from '@/types';

// The four primary combat stats shown as bars
const STAT_CONFIG = [
  {
    key: 'strength' as const,
    label: 'Strength',
    icon: <StrengthIcon className="w-4 h-4 text-red-500" />,
    color: 'bg-red-400',
  },
  {
    key: 'wisdom' as const,
    label: 'Wisdom',
    icon: <WisdomIcon className="w-4 h-4 text-blue-500" />,
    color: 'bg-blue-400',
  },
  {
    key: 'agility' as const,
    label: 'Agility',
    icon: <AgilityIcon className="w-4 h-4 text-teal-500" />,
    color: 'bg-teal-400',
  },
  {
    key: 'spirit' as const,
    label: 'Spirit',
    icon: <SpiritIcon className="w-4 h-4 text-violet-500" />,
    color: 'bg-violet-400',
  },
];

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
  const maxStamina = playerMaxStamina(character);
  const currentStamina = character.currentStamina ?? maxStamina;

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

        {/* Stamina bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-1.5 text-gray-700 dark:text-slate-200">
              <span>⚡</span>
              <span className="font-medium">Stamina</span>
            </span>
            <span className="text-gray-700 dark:text-slate-200 font-semibold text-sm tabular-nums">
              {currentStamina}
              <span className="text-gray-400 dark:text-slate-500 font-normal text-xs">
                {' '}
                / {maxStamina}
              </span>
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-400 to-amber-500"
              style={{ width: `${Math.min((currentStamina / maxStamina) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Primary stat bars */}
        <div className="space-y-3 pt-1 border-t border-gray-100 dark:border-slate-800">
          <p className="text-xs text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider pt-1">
            Stats
          </p>
          {STAT_CONFIG.map(({ key, label, icon, color }) => {
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
                max={50}
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

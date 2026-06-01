'use client';

import type { Character } from '@/types';
import { playerMaxHp, playerMaxMagic, playerMaxStamina } from '@/lib/gameLogic/combat';

interface ResourceBarsProps {
  character: Character;
  /** `full` shows HP, Stamina and Magic. `staminaOnly` keeps the legacy single bar. */
  variant?: 'full';
  className?: string;
}

interface ResourceRow {
  label: string;
  icon: string;
  current: number;
  max: number;
  /** Tailwind gradient classes for the fill. */
  fill: string;
  hint: string;
}

/**
 * The player's live combat resources. HP / Stamina / Magic are the three pools
 * that govern a fight, so surfacing them together (rather than Stamina alone)
 * is the player's real "combat readiness" at a glance. Pulls every value from
 * the same `combat.ts` helpers the battle engine uses, so the dashboard, the
 * character card, and the arena can never disagree.
 */
export function ResourceBars({ character, className = '' }: ResourceBarsProps) {
  const maxHp = playerMaxHp(character);
  const maxStamina = playerMaxStamina(character);
  const maxMagic = playerMaxMagic(character);

  const rows: ResourceRow[] = [
    {
      label: 'Health',
      icon: '❤️',
      current: character.currentHp ?? maxHp,
      max: maxHp,
      fill: 'bg-gradient-to-r from-rose-400 to-red-500',
      hint: 'Survive monster hits',
    },
    {
      label: 'Stamina',
      icon: '⚡',
      current: character.currentStamina ?? maxStamina,
      max: maxStamina,
      fill: 'bg-gradient-to-r from-amber-400 to-amber-500',
      hint: 'Fuels abilities',
    },
    {
      label: 'Magic',
      icon: '🔮',
      current: character.currentMagic ?? maxMagic,
      max: maxMagic,
      fill: 'bg-gradient-to-r from-sky-400 to-indigo-500',
      hint: 'Powers spells',
    },
  ];

  return (
    <div className={`space-y-2.5 ${className}`}>
      {rows.map(({ label, icon, current, max, fill, hint }) => {
        const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
        return (
          <div key={label} className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span
                className="flex items-center gap-1.5 text-gray-700 dark:text-slate-200"
                title={hint}
              >
                <span aria-hidden="true">{icon}</span>
                <span className="font-medium">{label}</span>
              </span>
              <span className="text-gray-700 dark:text-slate-200 font-semibold text-sm tabular-nums">
                {current}
                <span className="text-gray-400 dark:text-slate-500 font-normal text-xs">
                  {' '}
                  / {max}
                </span>
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${fill}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

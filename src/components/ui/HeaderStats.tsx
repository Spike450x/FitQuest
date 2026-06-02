'use client';

import type { Character } from '@/types';
import { playerMaxHp, totalGearBonuses } from '@/lib/gameLogic/combat';
import { ReputationChip } from './ReputationChip';

/**
 * Compact stat cluster for the sticky top bar — Health and Reputation stay
 * visible on every page, mobile included (gold sits beside this in the header).
 * Defense remains desktop-only to keep the mobile bar uncluttered.
 */
export function HeaderStats({ character }: { character: Character }) {
  const maxHp = playerMaxHp(character);
  const hp = character.currentHp ?? maxHp;
  const defense =
    (character.stats.defense ?? 0) + (totalGearBonuses(character.equippedGear).defense ?? 0);

  return (
    <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 dark:text-slate-400">
      <span className="whitespace-nowrap" title="Health">
        ❤️{' '}
        <span className="font-semibold text-gray-700 dark:text-slate-200 tabular-nums">{hp}</span>
        <span className="hidden sm:inline text-gray-400 dark:text-slate-500 tabular-nums">
          /{maxHp}
        </span>
      </span>

      <span className="hidden sm:inline text-gray-300 dark:text-slate-600">·</span>
      <span className="hidden sm:flex items-center whitespace-nowrap" title="Defense">
        🛡️{' '}
        <span className="ml-1 font-semibold text-gray-700 dark:text-slate-200 tabular-nums">
          {defense}
        </span>
      </span>

      <ReputationChip
        lifetime={character.lifetimeReputation ?? 0}
        spendable={character.spendableReputation ?? 0}
        size="sm"
      />
    </div>
  );
}

'use client';

import { CLASS_DEFINITIONS } from '@/lib/gameLogic/constants';
import { EntityArt } from '@/components/art/EntityArt';
import type { CharacterClass } from '@/types';

interface ClassSelectorProps {
  selected: CharacterClass | null;
  onSelect: (c: CharacterClass) => void;
}

const CLASSES: CharacterClass[] = ['warrior', 'wizard', 'rogue'];

export function ClassSelector({ selected, onSelect }: ClassSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {CLASSES.map((cls) => {
        const def = CLASS_DEFINITIONS[cls];
        const isSelected = selected === cls;

        return (
          <button
            key={cls}
            type="button"
            onClick={() => onSelect(cls)}
            className={`
              text-left rounded-xl p-4 border-2 transition-all duration-150
              ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 shadow-sm'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300 hover:shadow-sm'
              }
            `}
          >
            <div className="mb-2">
              <EntityArt
                category="class"
                id={cls}
                size="md"
                fallbackEmoji={def.emoji}
                ariaLabel={def.label}
              />
            </div>
            <div className="font-bold text-gray-900 dark:text-slate-100 mb-1">{def.label}</div>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              {def.description}
            </p>

            {/* Starting stats preview */}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 grid grid-cols-2 gap-1">
              {(
                [
                  ['STR', def.startingStats.strength],
                  ['WIS', def.startingStats.wisdom],
                  ['AGI', def.startingStats.agility],
                  ['SPR', def.startingStats.spirit],
                  ['STA', def.startingStats.stamina],
                  ['HP', def.startingStats.health],
                ] as [string, number][]
              ).map(([label, val]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-400 dark:text-slate-500">{label}</span>
                  <span className="text-gray-700 dark:text-slate-200 font-mono font-medium">
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useCharacterStore } from '@/store/characterStore';
import { SUBCLASS_CATALOG } from '@/lib/gameLogic/passives';
import { EntityArt } from '@/components/art/EntityArt';
import type { Character, CharacterSubclass } from '@/types';

interface SubclassModalProps {
  character: Character;
}

export function SubclassModal({ character }: SubclassModalProps) {
  const chooseSubclass = useCharacterStore((s) => s.chooseSubclass);
  const [choosing, setChoosing] = useState<CharacterSubclass | null>(null);
  const [confirmed, setConfirmed] = useState<CharacterSubclass | null>(null);

  // Should not render if subclass already chosen or level < 10
  if (character.subclass || character.level < 10) return null;

  const [optionA, optionB] = SUBCLASS_CATALOG[character.class];

  async function handleChoose(subclass: CharacterSubclass) {
    if (choosing) return;
    setChoosing(subclass);
    await chooseSubclass(subclass);
    setConfirmed(subclass);
    setChoosing(null);
  }

  if (confirmed) {
    const chosen = confirmed === optionA.id ? optionA : optionB;
    return (
      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border-2 border-violet-300 rounded-xl p-6 shadow-sm text-center">
        <div className="text-4xl mb-2">{chosen.emoji}</div>
        <h3 className="text-xl font-bold text-violet-800">{chosen.name} Unlocked!</h3>
        <p className="text-sm text-violet-600 mt-1">{chosen.tagline}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border-2 border-violet-300 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">🌟</span>
        <h3 className="font-bold text-violet-800 text-lg">Choose Your Subclass</h3>
        <span className="ml-auto text-xs bg-violet-500 text-white font-bold px-2.5 py-0.5 rounded-full">
          Level 10
        </span>
      </div>
      <p className="text-sm text-violet-700 mb-5">
        This is a permanent choice. Your subclass grants unique passive abilities and modifies your
        class skills.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[optionA, optionB].map((sub) => (
          <button
            key={sub.id}
            onClick={() => handleChoose(sub.id)}
            disabled={!!choosing}
            className="flex flex-col items-start gap-2 border-2 border-violet-200 bg-white hover:border-violet-400 hover:bg-violet-50 rounded-xl p-4 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {/* Header */}
            <div className="flex items-center gap-2 w-full">
              <EntityArt
                category="subclass"
                id={sub.id}
                size="sm"
                fallbackEmoji={sub.emoji}
                ariaLabel={sub.name}
              />
              <span className="font-bold text-gray-900 dark:text-slate-100 text-base group-hover:text-violet-700 transition-colors">
                {sub.name}
              </span>
              {choosing === sub.id && (
                <span className="ml-auto text-xs text-violet-500 font-medium animate-pulse">
                  Choosing…
                </span>
              )}
            </div>

            {/* Tagline */}
            <p className="text-xs text-violet-600 font-medium leading-snug">{sub.tagline}</p>

            {/* Passives */}
            <div className="w-full">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Passives
              </p>
              <ul className="space-y-0.5">
                {sub.passives.map((p) => {
                  const [name, ...rest] = p.split(' — ');
                  return (
                    <li key={p} className="text-xs text-gray-700 dark:text-slate-200 flex gap-1">
                      <span className="text-violet-400 shrink-0">•</span>
                      <span>
                        <span className="font-semibold">{name}</span>
                        {rest.length > 0 && (
                          <span className="text-gray-500 dark:text-slate-400">
                            {' '}
                            — {rest.join(' — ')}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Ability changes */}
            {sub.abilityChanges.length > 0 && (
              <div className="w-full">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Ability Upgrades
                </p>
                <ul className="space-y-0.5">
                  {sub.abilityChanges.map((c) => (
                    <li key={c} className="text-xs text-gray-700 dark:text-slate-200 flex gap-1">
                      <span className="text-amber-400 shrink-0">⬆</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

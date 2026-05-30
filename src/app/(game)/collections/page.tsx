'use client';

import { useCharacter } from '@/hooks/useCharacter';
import { ACHIEVEMENTS } from '@/lib/gameLogic/achievements';
import { EntityArt } from '@/components/art/EntityArt';
import { Card } from '@/components/ui/Card';
import { CollectionsTabs } from '@/components/collections/CollectionsTabs';

export default function AchievementsPage() {
  const { character } = useCharacter();
  if (!character) return null;

  const unlocked = new Set(character.achievements ?? []);
  const all = Object.values(ACHIEVEMENTS);
  const unlockedCount = all.filter((a) => unlocked.has(a.id)).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
          Collections
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {unlockedCount} / {all.length} achievements unlocked
        </p>
      </div>

      <CollectionsTabs />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {all.map((def) => {
          const isUnlocked = unlocked.has(def.id);
          return (
            <Card
              key={def.id}
              padding="sm"
              className={`flex gap-3 items-start ${
                isUnlocked
                  ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30'
                  : 'opacity-50'
              }`}
            >
              {isUnlocked ? (
                <EntityArt
                  category="achievement"
                  id={def.id}
                  size="md"
                  fallbackEmoji={def.emoji}
                  ariaLabel={def.name}
                />
              ) : (
                <div
                  className="text-2xl w-14 h-14 flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  🔒
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-bold leading-tight ${
                    isUnlocked
                      ? 'text-indigo-900 dark:text-indigo-200'
                      : 'text-gray-400 dark:text-slate-500'
                  }`}
                >
                  {def.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 leading-snug">
                  {def.description}
                </p>
                {isUnlocked && (
                  <span className="inline-block mt-2 text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded font-medium">
                    +{def.goldReward}g earned
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

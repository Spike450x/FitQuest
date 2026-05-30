'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useCharacter } from '@/hooks/useCharacter';
import { useInventoryStore } from '@/store/inventoryStore';
import { ACHIEVEMENTS } from '@/lib/gameLogic/achievements';
import { MONSTER_CATALOG } from '@/lib/gameLogic/monsters';
import { DUNGEON_BOSSES } from '@/lib/gameLogic/dungeons';
import { bestiaryProgress, collectionProgress } from '@/lib/gameLogic/collections';
import { EntityArt } from '@/components/art/EntityArt';
import { Card } from '@/components/ui/Card';
import { CollectionsTabs } from '@/components/collections/CollectionsTabs';

export default function AchievementsPage() {
  const { character } = useCharacter();
  const items = useInventoryStore((s) => s.items);
  const fetchInventory = useInventoryStore((s) => s.fetchInventory);

  useEffect(() => {
    if (character?.uid) fetchInventory(character.uid);
  }, [character?.uid, fetchInventory]);

  const ownedIds = useMemo(() => new Set(items.map((i) => i.itemDefId)), [items]);
  const overall = useMemo(() => collectionProgress(ownedIds), [ownedIds]);

  if (!character) return null;

  const unlocked = new Set(character.achievements ?? []);
  const all = Object.values(ACHIEVEMENTS);
  const unlockedCount = all.filter((a) => unlocked.has(a.id)).length;

  const bprogress = bestiaryProgress(character);
  const bossTotal = Object.keys(DUNGEON_BOSSES).length;
  const bestiaryFound = bprogress.monstersDiscovered + bprogress.bossesDefeated;
  const bestiaryTotal = MONSTER_CATALOG.length + bossTotal;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
          Collections
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Your discoveries across achievements, monsters, and gear
        </p>
      </div>

      {/* Cross-tab progress summary — each chip is a jump-link to its tab */}
      <div className="grid grid-cols-3 gap-2">
        <Link
          href="/collections"
          className="rounded-xl p-3 text-center bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors"
        >
          <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">
            {unlockedCount}
            <span className="text-sm font-normal text-indigo-400 dark:text-indigo-500">
              /{all.length}
            </span>
          </p>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">Achievements</p>
        </Link>
        <Link
          href="/collections/bestiary"
          className="rounded-xl p-3 text-center bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors"
        >
          <p className="text-xl font-bold text-rose-700 dark:text-rose-300 tabular-nums">
            {bestiaryFound}
            <span className="text-sm font-normal text-rose-400 dark:text-rose-500">
              /{bestiaryTotal}
            </span>
          </p>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">Bestiary</p>
        </Link>
        <Link
          href="/collections/collection"
          className="rounded-xl p-3 text-center bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 hover:bg-violet-100 dark:hover:bg-violet-950/50 transition-colors"
        >
          <p className="text-xl font-bold text-violet-700 dark:text-violet-300 tabular-nums">
            {overall.owned}
            <span className="text-sm font-normal text-violet-400 dark:text-violet-500">
              /{overall.total}
            </span>
          </p>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">Items</p>
        </Link>
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

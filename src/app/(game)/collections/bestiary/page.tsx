'use client';

import { useCharacter } from '@/hooks/useCharacter';
import { MONSTER_CATALOG } from '@/lib/gameLogic/monsters';
import { DUNGEON_BOSSES } from '@/lib/gameLogic/dungeons';
import { BOSS_TIER_ACHIEVEMENT, bestiaryProgress, tierName } from '@/lib/gameLogic/collections';
import { EntityArt } from '@/components/art/EntityArt';
import { Card } from '@/components/ui/Card';
import { CollectionsTabs } from '@/components/collections/CollectionsTabs';
import type { DungeonTierId, MonsterDef } from '@/types';

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function BestiaryPage() {
  const { character } = useCharacter();
  if (!character) return null;

  const killed = character.monstersKilled ?? {};
  const achievements = new Set(character.achievements ?? []);

  const progress = bestiaryProgress(character);
  const totalEntries = progress.totalMonsters + progress.totalBosses;
  const totalFound = progress.monstersDiscovered + progress.bossesDefeated;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
          Collections
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {totalFound} of {totalEntries} foes discovered
        </p>
      </div>

      <CollectionsTabs />

      {/* Arena monsters */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
          Monsters · {progress.monstersDiscovered}/{progress.totalMonsters}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...MONSTER_CATALOG]
            .sort((a, b) => a.level - b.level)
            .map((monster) => (
              <MonsterCard key={monster.id} monster={monster} kill={killed[monster.id]} />
            ))}
        </div>
      </section>

      {/* Dungeon bosses */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
          Bosses · {progress.bossesDefeated}/{progress.totalBosses}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(
            Object.entries(DUNGEON_BOSSES) as [
              DungeonTierId,
              (typeof DUNGEON_BOSSES)[DungeonTierId],
            ][]
          ).map(([tierId, boss]) => (
            <BossCard
              key={boss.id}
              name={boss.name}
              level={boss.level}
              tierLabel={tierName(tierId)}
              defeated={achievements.has(BOSS_TIER_ACHIEVEMENT[tierId])}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function MonsterCard({
  monster,
  kill,
}: {
  monster: MonsterDef;
  kill?: { killCount: number; firstKilledAt: number };
}) {
  const discovered = !!kill;

  return (
    <Card className="flex flex-col items-center text-center gap-2 p-3">
      <div className={discovered ? '' : 'opacity-25 grayscale'}>
        <EntityArt category="monster" id={monster.id} size="lg" />
      </div>
      {discovered ? (
        <>
          <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 leading-tight">
            {monster.name}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500">Lv {monster.level}</p>
          <div className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">
            <span className="font-semibold text-rose-600 dark:text-rose-400">{kill.killCount}</span>{' '}
            slain
          </div>
          <p className="text-[10px] text-gray-400 dark:text-slate-500">
            First: {formatDate(kill.firstKilledAt)}
          </p>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500">???</p>
          <p className="text-[11px] text-gray-300 dark:text-slate-600">Undiscovered</p>
        </>
      )}
    </Card>
  );
}

function BossCard({
  name,
  level,
  tierLabel,
  defeated,
}: {
  name: string;
  level: number;
  tierLabel: string;
  defeated: boolean;
}) {
  return (
    <Card
      className={`flex flex-col items-center text-center gap-2 p-3 ${
        defeated ? 'border-amber-300 dark:border-amber-700' : ''
      }`}
    >
      <div
        className={`text-4xl ${defeated ? '' : 'opacity-25 grayscale'}`}
        role="img"
        aria-label={defeated ? name : 'Undiscovered boss'}
      >
        👑
      </div>
      {defeated ? (
        <>
          <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 leading-tight">
            {name}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500">Lv {level}</p>
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">✓ Defeated</p>
          <p className="text-[10px] text-gray-400 dark:text-slate-500">{tierLabel}</p>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500">???</p>
          <p className="text-[11px] text-gray-300 dark:text-slate-600">{tierLabel}</p>
        </>
      )}
    </Card>
  );
}

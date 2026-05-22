'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCharacter } from '@/hooks/useCharacter';
import { useDungeonStore } from '@/store/dungeonStore';
import { DUNGEON_TIERS } from '@/lib/gameLogic/dungeons';
import { playerMaxHp } from '@/lib/gameLogic/combat';
import { getRecentDungeonRuns } from '@/lib/dungeonData';
import { getItemById, RARITY_BADGE } from '@/lib/gameLogic/items';
import { Skeleton } from '@/components/ui/Skeleton';
import type { DungeonTierId, DungeonRunsToday, DungeonRun } from '@/types';

const TIER_ORDER: DungeonTierId[] = ['goblin-caves', 'spider-lair', 'dark-sanctum', 'dragons-keep'];

const TIER_STYLE: Record<
  DungeonTierId,
  { gradient: string; border: string; nameColor: string; emoji: string }
> = {
  'goblin-caves': {
    gradient: 'from-green-950 to-slate-900',
    border: 'border-green-800',
    nameColor: 'text-green-400',
    emoji: '👺',
  },
  'spider-lair': {
    gradient: 'from-blue-950 to-slate-900',
    border: 'border-blue-800',
    nameColor: 'text-blue-400',
    emoji: '🕷',
  },
  'dark-sanctum': {
    gradient: 'from-purple-950 to-slate-900',
    border: 'border-purple-800',
    nameColor: 'text-purple-400',
    emoji: '💀',
  },
  'dragons-keep': {
    gradient: 'from-orange-950 to-slate-900',
    border: 'border-orange-900',
    nameColor: 'text-orange-400',
    emoji: '🔥',
  },
};

const TIER_TOP_RARITY: Record<DungeonTierId, string> = {
  'goblin-caves': 'Epic',
  'spider-lair': 'Epic',
  'dark-sanctum': 'Legendary',
  'dragons-keep': 'Legendary',
};

function weeklyResetLabel(): string {
  const now = new Date();
  const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
  const reset = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday),
  );
  const diff = reset.getTime() - now.getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return `${days}d ${hours}h`;
}

function runsRemainingToday(dungeonRunsToday: DungeonRunsToday | undefined): number {
  const today = new Date().toISOString().slice(0, 10);
  if (!dungeonRunsToday || dungeonRunsToday.date !== today) return 2;
  return Math.max(0, 2 - dungeonRunsToday.count);
}

function formatRunDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function RunHistoryRow({ run }: { run: DungeonRun }) {
  const [expanded, setExpanded] = useState(false);
  const tier = DUNGEON_TIERS[run.tierId];
  const style = TIER_STYLE[run.tierId];
  const isCompleted = run.status === 'completed';
  const hasLoot = run.allDroppedItems.length > 0;
  return (
    <div className="border-b border-slate-700 last:border-0">
      <button
        onClick={() => hasLoot && setExpanded((e) => !e)}
        aria-label={`${tier.name} run — ${isCompleted ? 'Cleared' : 'Abandoned'} on ${formatRunDate(run.startedAt)}${hasLoot ? `. ${expanded ? 'Hide' : 'Show'} loot (${run.allDroppedItems.length} item${run.allDroppedItems.length > 1 ? 's' : ''})` : ''}`}
        aria-expanded={hasLoot ? expanded : undefined}
        className="w-full flex items-center gap-3 py-2 text-left"
      >
        <span className="text-base w-6 text-center shrink-0">{style.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-semibold truncate ${style.nameColor}`}>{tier.name}</div>
          <div className="text-slate-500 text-xs">
            {formatRunDate(run.startedAt)} · {run.currentRoom}/{run.rooms.length} rooms
            {hasLoot
              ? ` · ${run.allDroppedItems.length} item${run.allDroppedItems.length > 1 ? 's' : ''}`
              : ''}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-xs font-bold ${isCompleted ? 'text-green-400' : 'text-red-400'}`}>
            {isCompleted ? 'Cleared' : 'Abandoned'}
          </div>
          <div className="text-slate-500 text-xs">{run.cumulativeXp} XP</div>
        </div>
        {hasLoot && (
          <span className="text-slate-600 text-xs ml-1 shrink-0">{expanded ? '▲' : '▼'}</span>
        )}
      </button>
      {expanded && hasLoot && (
        <div className="pl-9 pb-2 space-y-1">
          {run.allDroppedItems.map((itemId, i) => {
            const def = getItemById(itemId);
            if (!def) return null;
            return (
              <div key={`${itemId}-${i}`} className="flex items-center gap-2">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${RARITY_BADGE[def.rarity]}`}
                >
                  {def.rarity[0].toUpperCase()}
                </span>
                <span className="text-xs text-slate-300">{def.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DungeonLobbyPage() {
  const { character } = useCharacter();
  const { activeRun, fetchActiveRun } = useDungeonStore();
  const [pageReady, setPageReady] = useState(false);
  const [recentRuns, setRecentRuns] = useState<DungeonRun[]>([]);

  useEffect(() => {
    if (!character) return;
    Promise.all([fetchActiveRun(character.uid), getRecentDungeonRuns(character.uid, 10)]).then(
      ([, runs]) => {
        setRecentRuns(runs.filter((r) => r.status !== 'active'));
        setPageReady(true);
      },
    );
  }, [character, fetchActiveRun]);

  if (!character) return null;

  const maxHp = playerMaxHp(character);

  return (
    <div className="min-h-screen bg-slate-900 p-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/combat" className="text-slate-400 text-sm">
          ← Combat
        </Link>
      </div>
      <h1 className="text-xl font-bold text-white mb-4">🏰 Dungeons</h1>

      {/* Resume banner or skeleton */}
      {!pageReady ? (
        <Skeleton shape="card" tone="dark" height="h-16" className="mb-4" />
      ) : activeRun ? (
        <div className="bg-blue-950 border border-blue-700 rounded-xl p-4 mb-4 flex items-center justify-between">
          <div>
            <div className="text-blue-300 text-xs font-bold uppercase tracking-wide">
              ⚔ Run in Progress
            </div>
            <div className="text-blue-200 text-sm mt-0.5">
              {DUNGEON_TIERS[activeRun.tierId].name} · Room {activeRun.currentRoom + 1} of{' '}
              {activeRun.rooms.length} · {activeRun.currentHp} HP
            </div>
          </div>
          <Link
            href="/combat/dungeons/run"
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Resume
          </Link>
        </div>
      ) : null}

      {/* Weekly reset */}
      <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
        This Week&apos;s Dungeons · Resets in {weeklyResetLabel()} (UTC)
      </div>

      {/* Tier cards */}
      <div className="flex flex-col gap-3">
        {TIER_ORDER.map((tierId) => {
          const tier = DUNGEON_TIERS[tierId];
          const style = TIER_STYLE[tierId];
          const runsLeft = runsRemainingToday(character.dungeonRunsToday);
          return (
            <Link key={tierId} href={`/combat/dungeons/${tierId}`}>
              <div
                className={`bg-gradient-to-br ${style.gradient} border ${style.border} rounded-xl p-4`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className={`font-bold text-base ${style.nameColor}`}>
                      {style.emoji} {tier.name}
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">
                      Lv. {tier.recLevelMin}
                      {tier.recLevelMax ? `–${tier.recLevelMax}` : '+'} · {tier.minRooms}–
                      {tier.maxRooms} rooms + boss
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold text-sm ${style.nameColor}`}>
                      {tier.entryFee} 🪙
                    </div>
                    <div className="text-slate-500 text-xs">{runsLeft}/2 runs today</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-slate-400 text-xs">Loot:</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      TIER_TOP_RARITY[tierId] === 'Legendary'
                        ? 'bg-orange-900 text-orange-300'
                        : 'bg-purple-900 text-purple-300'
                    }`}
                  >
                    {TIER_TOP_RARITY[tierId]}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* HP reminder if low */}
      {(character.currentHp ?? maxHp) < maxHp * 0.5 && (
        <div className="mt-4 bg-red-950 border border-red-800 rounded-xl p-3 text-center">
          <p className="text-red-400 text-xs font-semibold">
            ⚠ HP below 50% — log meals or sleep to restore HP before entering a dungeon.
          </p>
        </div>
      )}

      {/* Recent run history */}
      <div className="mt-6">
        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
          Recent Runs
        </div>
        {!pageReady ? (
          <Skeleton shape="card" tone="dark" height="h-24" />
        ) : recentRuns.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-4 text-center text-slate-500 text-sm">
            No completed runs yet. Enter a dungeon to begin.
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl p-4">
            {recentRuns.map((run) => (
              <RunHistoryRow key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

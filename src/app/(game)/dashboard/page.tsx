'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGameData } from '@/hooks/useGameData';
import { XPBar } from '@/components/ui/XPBar';
import { GoldDisplay } from '@/components/ui/GoldDisplay';
import { ReputationChip } from '@/components/ui/ReputationChip';
import { resolveActiveTitle } from '@/lib/gameLogic/reputation';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { StatBar } from '@/components/character/StatBar';
import { ResourceBars } from '@/components/character/ResourceBars';
import { STAT_BAR_CONFIG, STAT_BAR_MAX } from '@/components/character/statConfig';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { CLASS_DEFINITIONS, ACTIVITY_DEFINITIONS } from '@/lib/gameLogic/constants';
import { totalGearBonuses } from '@/lib/gameLogic/combat';
import { getStreakTier } from '@/lib/gameLogic/streaks';
import { useCharacterStore } from '@/store/characterStore';
import { useQuestStore } from '@/store/questStore';
import { useBountyStore } from '@/store/bountyStore';
import { getActivityIconSvg } from '@/lib/activityIcons';
import { getQuestDef } from '@/lib/gameLogic/quests';
import { getBountyDef } from '@/lib/gameLogic/bounties';
import { StatAllocModal } from '@/components/character/StatAllocModal';
import { SubclassModal } from '@/components/character/SubclassModal';
import { getSubclassDef } from '@/lib/gameLogic/passives';
import type { ActivityLog, ActiveQuest, ActiveBounty, ActivityType } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const {
    character,
    loading,
    error: characterError,
    user,
    recentLogs: logs,
    logsLoading,
    todayKey,
    quests,
    questsLoading,
    questsError,
    bounties,
    bountiesLoading,
  } = useGameData();
  const fetchCharacter = useCharacterStore((s) => s.fetchCharacter);
  const fetchAndAssignQuests = useQuestStore((s) => s.fetchAndAssignQuests);
  const fetchAndAssignBounties = useBountyStore((s) => s.fetchAndAssignBounties);

  useEffect(() => {
    if (!loading && !character && !characterError) {
      router.replace('/character-creation');
    }
  }, [character, loading, characterError, router]);

  useEffect(() => {
    if (character?.uid) fetchAndAssignQuests(character.uid, todayKey);
  }, [character?.uid, fetchAndAssignQuests, todayKey]);

  useEffect(() => {
    if (character?.uid) fetchAndAssignBounties(character.uid, todayKey);
  }, [character?.uid, fetchAndAssignBounties, todayKey]);

  const gearBonuses = useMemo(
    () => (character ? totalGearBonuses(character.equippedGear) : {}),
    [character],
  );

  if (loading) return <LoadingSkeleton />;

  if (!character) {
    if (characterError && user) {
      return (
        <ErrorBanner
          title="Couldn't load your character."
          message={characterError}
          onRetry={() => fetchCharacter(user.uid, true)}
        />
      );
    }
    return <LoadingSkeleton />;
  }

  const classDef = CLASS_DEFINITIONS[character.class];
  const dailyQuests = quests.filter((q) => getQuestDef(q.questDefId)?.type === 'daily');
  const currentStreak = character.streakData?.currentStreak ?? 0;
  const streakTier = getStreakTier(currentStreak);
  const subclassDef = character.subclass ? getSubclassDef(character.subclass) : undefined;

  return (
    <div className="space-y-6">
      {/* Level-up stat allocation — shown when pending points exist */}
      {(character.pendingStatPoints ?? 0) > 0 && <StatAllocModal character={character} />}

      {/* Subclass picker — shown at level 10 before subclass is chosen */}
      {character.level >= 10 && !character.subclass && <SubclassModal character={character} />}

      {/* Quest fetch error (non-fatal — character still rendered) */}
      {questsError && (
        <ErrorBanner
          title="Couldn't load your quests."
          message={questsError}
          onRetry={() => fetchAndAssignQuests(character.uid)}
        />
      )}

      {/* Hero banner */}
      <Card variant="hero" padding="lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-indigo-400 text-sm font-medium">
              {classDef.emoji} {classDef.label}
            </p>
            <h2 className="font-display text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
              {character.name}
            </h2>
            <p className="text-indigo-600 text-sm mt-0.5 font-medium">
              Level {character.level} {subclassDef ? subclassDef.name : 'Adventurer'}
              {subclassDef && <span className="ml-1.5 text-violet-500">{subclassDef.emoji}</span>}
            </p>
            <p className="text-violet-600 dark:text-violet-300 text-xs mt-0.5 font-semibold italic">
              “{resolveActiveTitle(character.lifetimeReputation ?? 0, character.activeTitle)}”
            </p>
            {/* Streak badge */}
            {currentStreak > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-base">🔥</span>
                <span className={`text-sm font-semibold ${streakTier.color}`}>
                  Day {currentStreak}
                  {streakTier.label ? ` · ${streakTier.label}` : ''}
                </span>
                {streakTier.lootDropMultiplier > 1 && (
                  <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">
                    +{Math.round((streakTier.lootDropMultiplier - 1) * 100)}% rare drops
                  </span>
                )}
                {(character.streakData?.shields ?? 0) > 0 && (
                  <span
                    title="A missed day consumes one shield instead of resetting your streak. Shields refill each ISO week."
                    className="text-xs font-medium text-sky-600 bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5 cursor-default"
                  >
                    🛡️{' '}
                    {(character.streakData?.shields ?? 0) === 1
                      ? 'Shield ready'
                      : `${character.streakData?.shields} shields`}
                  </span>
                )}
              </div>
            )}
            {/* Shield hint when streak exists but no shield is held */}
            {currentStreak > 0 && (character.streakData?.shields ?? 0) === 0 && (
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                🛡️ No shield — refills next week
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <GoldDisplay amount={character.gold} size="lg" />
            <ReputationChip
              lifetime={character.lifetimeReputation ?? 0}
              spendable={character.spendableReputation ?? 0}
              size="sm"
              showRank
            />
          </div>
        </div>
        <XPBar xp={character.xp} level={character.level} xpToNextLevel={character.xpToNextLevel} />

        {/* Combat resources — HP / Stamina / Magic */}
        <div className="mt-3">
          <ResourceBars character={character} />
        </div>
      </Card>

      {/* Customizable quick actions */}
      <QuickActions />

      {/* Lower three-column grid of collapsible sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {/* Stats overview — all seven */}
        <CollapsibleSection id="dash-stats" title="Stats">
          <div className="space-y-3">
            {STAT_BAR_CONFIG.map(({ key, label, icon, color }) => {
              const base = character.stats[key] ?? 0;
              const bonus = gearBonuses[key] ?? 0;
              return (
                <StatBar
                  key={key}
                  label={label}
                  value={base + bonus}
                  max={STAT_BAR_MAX}
                  color={color}
                  icon={icon}
                  suffix={bonus > 0 ? `+${bonus} gear` : undefined}
                />
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Active quests widget */}
        <CollapsibleSection
          id="dash-quests"
          title="Daily Quests"
          right={
            <Link href="/quests" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all →
            </Link>
          }
        >
          <QuestList quests={dailyQuests} loading={questsLoading} />
        </CollapsibleSection>

        {/* Today's bounties — Reputation track, mirrors Daily Quests */}
        <CollapsibleSection
          id="dash-bounties"
          title="Today's Bounties"
          right={
            <Link href="/wanted" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all →
            </Link>
          }
        >
          <BountyList bounties={bounties} loading={bountiesLoading} />
        </CollapsibleSection>

        {/* Recent activity feed with filter + sort */}
        <CollapsibleSection id="dash-activity" title="Recent Activity">
          <RecentActivityFeed logs={logs} loading={logsLoading} />
        </CollapsibleSection>
      </div>
    </div>
  );
}

// ─── Recent Activity Feed ─────────────────────────────────────────────────────

function timeAgo(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function RecentActivityFeed({ logs, loading }: { logs: ActivityLog[]; loading: boolean }) {
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');

  // Activity types actually present, for a tidy filter dropdown.
  const presentTypes = useMemo(() => {
    const set = new Set<ActivityType>();
    logs.forEach((l) => set.add(l.type));
    return Array.from(set);
  }, [logs]);

  const visible = useMemo(() => {
    const filtered = filter === 'all' ? logs : logs.filter((l) => l.type === filter);
    return [...filtered].sort((a, b) =>
      sort === 'newest' ? b.loggedAt - a.loggedAt : a.loggedAt - b.loggedAt,
    );
  }, [logs, filter, sort]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height="h-10" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="text-2xl mb-1" aria-hidden="true">
          📭
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-slate-300">No activities yet</p>
        <Link
          href="/activities"
          className="inline-block mt-1 text-xs font-semibold text-indigo-600 hover:underline"
        >
          Log your first one →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter + sort controls */}
      <div className="flex items-center gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as ActivityType | 'all')}
          aria-label="Filter activities by type"
          className="flex-1 min-w-0 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-200 px-2 py-1.5"
        >
          <option value="all">All activities</option>
          {presentTypes.map((t) => (
            <option key={t} value={t}>
              {ACTIVITY_DEFINITIONS[t].label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSort((s) => (s === 'newest' ? 'oldest' : 'newest'))}
          className="shrink-0 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-600 dark:text-slate-300 px-2.5 py-1.5 hover:border-indigo-300 transition-colors"
          title="Toggle sort order"
        >
          {sort === 'newest' ? '↓ Newest' : '↑ Oldest'}
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-2">
          No {filter === 'all' ? '' : ACTIVITY_DEFINITIONS[filter as ActivityType].label} activities
          in this range.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((log) => (
            <ActivityFeedItem key={log.id} log={log} />
          ))}
        </ul>
      )}

      {/* The feed is a recent window, not full history — make that explicit so
          the type filter can't be mistaken for an all-time search. */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-slate-800">
        <span className="text-xs text-gray-400 dark:text-slate-500">Most recent activity</span>
        <Link
          href="/calendar"
          className="text-xs font-semibold text-indigo-600 hover:underline shrink-0"
        >
          Full history →
        </Link>
      </div>
    </div>
  );
}

function ActivityFeedItem({ log }: { log: ActivityLog }) {
  const def = ACTIVITY_DEFINITIONS[log.type];
  const icon = getActivityIconSvg(log.type, 'w-5 h-5');
  const amount = Number(log.data.amount);

  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="w-7 flex items-center justify-center text-gray-500 dark:text-slate-400 shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-gray-800 dark:text-slate-100 capitalize">
          {def.label}
        </span>
        <span className="text-gray-400 dark:text-slate-500 ml-1.5">
          {amount} {def.unit}
        </span>
        {log.source && (
          <span
            className="ml-1.5 inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-semibold align-middle"
            title="Auto-synced from your connected device"
          >
            ⌚ synced
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {log.xpGained > 0 && (
          <>
            <span className="text-indigo-600 font-semibold">+{log.xpGained} XP</span>
            <span className="text-gray-300 dark:text-slate-600">·</span>
          </>
        )}
        <span className="text-gray-400 dark:text-slate-500 text-xs">{timeAgo(log.loggedAt)}</span>
      </div>
    </li>
  );
}

// ─── Daily Quests list ────────────────────────────────────────────────────────

function QuestList({ quests, loading }: { quests: ActiveQuest[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton shape="line" width="w-3/4" />
            <Skeleton shape="line" height="h-1.5" />
          </div>
        ))}
      </div>
    );
  }

  if (quests.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="text-2xl mb-1" aria-hidden="true">
          🗺️
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-slate-300">No active quests</p>
        <Link
          href="/quests"
          className="inline-block mt-1 text-xs font-semibold text-indigo-600 hover:underline"
        >
          Visit the quest board →
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {quests.map((q) => (
        <QuestProgressRow key={q.id} quest={q} />
      ))}
    </ul>
  );
}

function QuestProgressRow({ quest }: { quest: ActiveQuest }) {
  const def = getQuestDef(quest.questDefId);
  if (!def) return null;

  const pct = Math.min(100, Math.round((quest.progress / def.requirement.target) * 100));
  const isComplete = quest.completedAt !== null;
  const isClaimed = quest.claimedAt !== null;
  const isMultiTarget = (def.extraTargets?.length ?? 0) > 0;

  // For the compact dashboard widget, a multi-target quest shows the overall
  // completion status: "N/M done" to keep the row from getting too tall.
  const totalTargets = 1 + (def.extraTargets?.length ?? 0);
  const doneTargets =
    (quest.progress >= def.requirement.target ? 1 : 0) +
    (def.extraTargets?.filter((et) => (quest.extraProgress?.[et.activityType] ?? 0) >= et.target)
      .length ?? 0);

  // Pick the least-progressed target for the main bar (shows the bottleneck)
  const bottleneckPct = isMultiTarget
    ? Math.min(
        pct,
        ...(def.extraTargets?.map((et) =>
          Math.min(
            100,
            Math.round(((quest.extraProgress?.[et.activityType] ?? 0) / et.target) * 100),
          ),
        ) ?? []),
      )
    : pct;

  return (
    <li className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-700 dark:text-slate-200 truncate">
          {def.name}
        </span>
        {isClaimed ? (
          <span className="text-xs text-emerald-600 font-medium shrink-0">Claimed</span>
        ) : isComplete ? (
          <Link
            href="/quests"
            className="text-xs text-amber-600 font-semibold shrink-0 hover:underline"
          >
            Claim! →
          </Link>
        ) : isMultiTarget ? (
          <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">
            {doneTargets}/{totalTargets} done
          </span>
        ) : (
          <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">{pct}%</span>
        )}
      </div>
      <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            isClaimed ? 'bg-emerald-400' : isComplete ? 'bg-amber-400' : 'bg-indigo-500'
          }`}
          style={{ width: `${bottleneckPct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 dark:text-slate-500">
        {isMultiTarget && (
          <span className="font-medium capitalize">{def.requirement.activityType}: </span>
        )}
        {quest.progress.toLocaleString()} / {def.requirement.target.toLocaleString()}{' '}
        {def.requirement.unit}
        {def.extraTargets?.map((et) => (
          <span key={et.activityType}>
            {' · '}
            <span className="font-medium capitalize">{et.activityType}: </span>
            {(quest.extraProgress?.[et.activityType] ?? 0).toLocaleString()} /{' '}
            {et.target.toLocaleString()} {et.unit}
          </span>
        ))}
      </span>
    </li>
  );
}

// ─── Today's Bounties list ────────────────────────────────────────────────────
// Mirrors the Daily Quests widget for the Reputation track. Standing bounties
// claim loot on the Wanted Board; hunt bounties route to a fight once tracked.

function BountyList({ bounties, loading }: { bounties: ActiveBounty[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton shape="line" width="w-3/4" />
            <Skeleton shape="line" height="h-1.5" />
          </div>
        ))}
      </div>
    );
  }

  if (bounties.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="text-2xl mb-1" aria-hidden="true">
          🎯
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-slate-300">No active bounties</p>
        <Link
          href="/wanted"
          className="inline-block mt-1 text-xs font-semibold text-indigo-600 hover:underline"
        >
          Visit the Wanted Board →
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {bounties.map((b) => (
        <BountyProgressRow key={b.id} bounty={b} />
      ))}
    </ul>
  );
}

function BountyProgressRow({ bounty }: { bounty: ActiveBounty }) {
  const def = getBountyDef(bounty.bountyDefId);
  if (!def) return null;

  const pct = Math.min(100, Math.round((bounty.progress / def.requirement.target) * 100));
  const isComplete = bounty.completedAt !== null;
  const isClaimed = bounty.claimedAt !== null;
  const isHunt = def.kind === 'hunt';
  const isMultiTarget = (def.extraTargets?.length ?? 0) > 0;

  const totalTargets = 1 + (def.extraTargets?.length ?? 0);
  const doneTargets =
    (bounty.progress >= def.requirement.target ? 1 : 0) +
    (def.extraTargets?.filter((et) => (bounty.extraProgress?.[et.activityType] ?? 0) >= et.target)
      .length ?? 0);

  const bottleneckPct = isMultiTarget
    ? Math.min(
        pct,
        ...(def.extraTargets?.map((et) =>
          Math.min(
            100,
            Math.round(((bounty.extraProgress?.[et.activityType] ?? 0) / et.target) * 100),
          ),
        ) ?? []),
      )
    : pct;

  return (
    <li className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-700 dark:text-slate-200 truncate">
          {isHunt && <span aria-hidden="true">⚔️ </span>}
          {def.name}
        </span>
        {isClaimed ? (
          <span className="text-xs text-emerald-600 font-medium shrink-0">Collected</span>
        ) : isComplete && isHunt ? (
          <Link
            href={`/wanted/hunt/${bounty.id}`}
            className="text-xs text-amber-600 font-semibold shrink-0 hover:underline"
          >
            Hunt! →
          </Link>
        ) : isComplete ? (
          <Link
            href="/wanted"
            className="text-xs text-amber-600 font-semibold shrink-0 hover:underline"
          >
            Claim! →
          </Link>
        ) : isMultiTarget ? (
          <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">
            {doneTargets}/{totalTargets} done
          </span>
        ) : (
          <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">{pct}%</span>
        )}
      </div>
      <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            isClaimed ? 'bg-emerald-400' : isComplete ? 'bg-amber-400' : 'bg-violet-500'
          }`}
          style={{ width: `${bottleneckPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-400 dark:text-slate-500">
          {bounty.progress.toLocaleString()} / {def.requirement.target.toLocaleString()}{' '}
          {def.requirement.unit}
        </span>
        <span className="text-xs font-semibold text-violet-600 dark:text-violet-300 shrink-0">
          +{def.rewards.reputation} Rep
        </span>
      </div>
    </li>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card variant="default" padding="lg">
        <div className="space-y-4">
          <Skeleton shape="line" height="h-7" width="w-40" />
          <Skeleton shape="line" height="h-2.5" />
        </div>
      </Card>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} shape="card" height="h-24" />
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGameData } from '@/hooks/useGameData';
import { XPBar } from '@/components/ui/XPBar';
import { GoldDisplay } from '@/components/ui/GoldDisplay';
import { ReputationChip } from '@/components/ui/ReputationChip';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatBar } from '@/components/character/StatBar';
import { CLASS_DEFINITIONS, ACTIVITY_DEFINITIONS } from '@/lib/gameLogic/constants';
import { playerMaxStamina, totalGearBonuses } from '@/lib/gameLogic/combat';
import { getStreakTier } from '@/lib/gameLogic/streaks';
import { useCharacterStore } from '@/store/characterStore';
import { useQuestStore } from '@/store/questStore';
import { getActivityIconSvg } from '@/lib/activityIcons';
import { LogActivityIcon, CombatIcon, QuestIcon, ShopIcon } from '@/components/art/action-icons';
import { StrengthIcon, WisdomIcon, AgilityIcon, SpiritIcon } from '@/components/art/stat-icons';
import { getQuestDef } from '@/lib/gameLogic/quests';
import { StatAllocModal } from '@/components/character/StatAllocModal';
import { SubclassModal } from '@/components/character/SubclassModal';
import { getSubclassDef } from '@/lib/gameLogic/passives';
import type { ActivityLog, ActiveQuest } from '@/types';

const QUICK_ACTIONS = [
  {
    href: '/activities',
    label: 'Log Activity',
    icon: <LogActivityIcon className="w-8 h-8" />,
    desc: 'Earn XP & stats',
  },
  {
    href: '/combat',
    label: 'Fight a Monster',
    icon: <CombatIcon className="w-8 h-8" />,
    desc: 'Win gold & loot',
  },
  {
    href: '/quests',
    label: 'View Quests',
    icon: <QuestIcon className="w-8 h-8" />,
    desc: 'Track your goals',
  },
  {
    href: '/shop',
    label: 'Visit Shop',
    icon: <ShopIcon className="w-8 h-8" />,
    desc: 'Spend your gold',
  },
];

const STAT_CONFIG = [
  {
    key: 'strength' as const,
    label: 'Strength',
    icon: <StrengthIcon className="w-4 h-4 text-red-500" />,
    color: 'bg-red-400',
    max: 50,
  },
  {
    key: 'wisdom' as const,
    label: 'Wisdom',
    icon: <WisdomIcon className="w-4 h-4 text-blue-500" />,
    color: 'bg-blue-400',
    max: 50,
  },
  {
    key: 'agility' as const,
    label: 'Agility',
    icon: <AgilityIcon className="w-4 h-4 text-teal-500" />,
    color: 'bg-teal-400',
    max: 50,
  },
  {
    key: 'spirit' as const,
    label: 'Spirit',
    icon: <SpiritIcon className="w-4 h-4 text-violet-500" />,
    color: 'bg-violet-400',
    max: 50,
  },
];

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
  } = useGameData();
  const fetchCharacter = useCharacterStore((s) => s.fetchCharacter);
  const fetchAndAssignQuests = useQuestStore((s) => s.fetchAndAssignQuests);

  useEffect(() => {
    if (!loading && !character && !characterError) {
      router.replace('/character-creation');
    }
  }, [character, loading, characterError, router]);

  useEffect(() => {
    if (character?.uid) fetchAndAssignQuests(character.uid, todayKey);
  }, [character?.uid, fetchAndAssignQuests, todayKey]);

  const gearBonuses = useMemo(
    () => (character ? totalGearBonuses(character.equippedGear) : {}),
    [character],
  );
  const maxStamina = useMemo(() => (character ? playerMaxStamina(character) : 0), [character]);

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
  const currentStamina = character.currentStamina ?? maxStamina;
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

        {/* Stamina bar */}
        <div className="space-y-1 mt-3">
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-1.5 text-gray-700 dark:text-slate-200">
              <span>⚡</span>
              <span className="font-medium text-sm">Stamina</span>
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
      </Card>

      {/* Quick actions */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 mb-3 uppercase tracking-wider">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ href, label, icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02] rounded-xl p-4 text-center transition-all duration-200 group"
            >
              <div className="text-2xl mb-2 transition-transform group-hover:scale-110">{icon}</div>
              <p className="text-sm font-medium text-gray-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                {label}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Lower three-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stats overview */}
        <Card variant="default" padding="lg">
          <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 mb-4 uppercase tracking-wider">
            Stats
          </h3>
          <div className="space-y-3">
            {STAT_CONFIG.map(({ key, label, icon, color, max }) => {
              const base = character.stats[key] ?? 0;
              const bonus = gearBonuses[key] ?? 0;
              return (
                <StatBar
                  key={key}
                  label={label}
                  value={base + bonus}
                  max={max}
                  color={color}
                  icon={icon}
                  suffix={bonus > 0 ? `+${bonus} gear` : undefined}
                />
              );
            })}
          </div>
        </Card>

        {/* Active quests widget */}
        <ActiveQuestsWidget quests={dailyQuests} loading={questsLoading} />

        {/* Recent activity feed */}
        <Card variant="default" padding="lg">
          <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 mb-3 uppercase tracking-wider">
            Recent Activity
          </h3>
          {logsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height="h-10" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-2xl mb-1" aria-hidden="true">
                📭
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-300">
                No activities yet
              </p>
              <Link
                href="/activities"
                className="inline-block mt-1 text-xs font-semibold text-indigo-600 hover:underline"
              >
                Log your first one →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <ActivityFeedItem key={log.id} log={log} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Activity Feed Item ───────────────────────────────────────────────────────

function timeAgo(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
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

// ─── Active Quests Widget ─────────────────────────────────────────────────────

function ActiveQuestsWidget({ quests, loading }: { quests: ActiveQuest[]; loading: boolean }) {
  return (
    <Card variant="default" padding="lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
          Daily Quests
        </h3>
        <Link href="/quests" className="text-xs font-semibold text-indigo-600 hover:underline">
          View all →
        </Link>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton shape="line" width="w-3/4" />
              <Skeleton shape="line" height="h-1.5" />
            </div>
          ))}
        </div>
      ) : quests.length === 0 ? (
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
      ) : (
        <ul className="space-y-3">
          {quests.map((q) => (
            <QuestProgressRow key={q.id} quest={q} />
          ))}
        </ul>
      )}
    </Card>
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

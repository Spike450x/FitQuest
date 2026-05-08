'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCharacter } from '@/hooks/useCharacter';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { XPBar } from '@/components/ui/XPBar';
import { GoldDisplay } from '@/components/ui/GoldDisplay';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { StatBar } from '@/components/character/StatBar';
import { CLASS_DEFINITIONS, ACTIVITY_DEFINITIONS } from '@/lib/gameLogic/constants';
import { playerMaxStamina, totalGearBonuses } from '@/lib/gameLogic/combat';
import { getStreakTier } from '@/lib/gameLogic/streaks';
import { useCharacterStore } from '@/store/characterStore';
import { useQuestStore } from '@/store/questStore';
import { getActivityIcon } from '@/lib/activityIcons';
import { getQuestDef } from '@/lib/gameLogic/quests';
import { StatAllocModal } from '@/components/character/StatAllocModal';
import { SubclassModal } from '@/components/character/SubclassModal';
import { getSubclassDef } from '@/lib/gameLogic/passives';
import type { ActivityLog, ActiveQuest } from '@/types';

const QUICK_ACTIONS = [
  { href: '/activities', label: 'Log Activity', icon: '📋', desc: 'Earn XP & stats' },
  { href: '/combat', label: 'Fight a Monster', icon: '🐉', desc: 'Win gold & loot' },
  { href: '/quests', label: 'View Quests', icon: '📜', desc: 'Track your goals' },
  { href: '/shop', label: 'Visit Shop', icon: '🏪', desc: 'Spend your gold' },
];

const STAT_CONFIG = [
  { key: 'strength' as const, label: 'Strength', icon: '⚔️', color: 'bg-red-400', max: 50 },
  { key: 'wisdom' as const, label: 'Wisdom', icon: '🧠', color: 'bg-blue-400', max: 50 },
  { key: 'agility' as const, label: 'Agility', icon: '🌬️', color: 'bg-teal-400', max: 50 },
];

export default function DashboardPage() {
  const router = useRouter();
  const { character, loading, error: characterError, user } = useCharacter();
  const { logs, loading: logsLoading } = useRecentActivity(character?.uid);
  const {
    quests,
    loading: questsLoading,
    error: questsError,
    fetchAndAssignQuests,
  } = useQuestStore();

  useEffect(() => {
    if (!loading && !character && !characterError) {
      router.replace('/character-creation');
    }
  }, [character, loading, characterError, router]);

  useEffect(() => {
    if (character?.uid) fetchAndAssignQuests(character.uid);
  }, [character?.uid, fetchAndAssignQuests]);

  if (loading) return <LoadingSkeleton />;

  if (!character) {
    if (characterError && user) {
      return (
        <ErrorBanner
          title="Couldn't load your character."
          message={characterError}
          onRetry={() => useCharacterStore.getState().fetchCharacter(user.uid)}
        />
      );
    }
    return <LoadingSkeleton />;
  }

  const classDef = CLASS_DEFINITIONS[character.class];
  const gearBonuses = totalGearBonuses(character.equippedGear);
  const maxStamina = playerMaxStamina(character);
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
      <div className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-indigo-400 text-sm font-medium">
              {classDef.emoji} {classDef.label}
            </p>
            <h2 className="text-2xl font-bold text-gray-900">{character.name}</h2>
            <p className="text-indigo-600 text-sm mt-0.5 font-medium">
              Level {character.level} {subclassDef ? subclassDef.name : 'Adventurer'}
              {subclassDef && <span className="ml-1.5 text-violet-500">{subclassDef.emoji}</span>}
            </p>
            {/* Streak badge */}
            {currentStreak > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-base">🔥</span>
                <span className={`text-sm font-semibold ${streakTier.color}`}>
                  Day {currentStreak}
                  {streakTier.label ? ` · ${streakTier.label}` : ''}
                </span>
                {streakTier.lootDropMultiplier > 1 && (
                  <span className="text-xs text-gray-400 font-medium">
                    +{Math.round((streakTier.lootDropMultiplier - 1) * 100)}% rare drops
                  </span>
                )}
              </div>
            )}
          </div>
          <GoldDisplay amount={character.gold} size="lg" />
        </div>
        <XPBar xp={character.xp} level={character.level} xpToNextLevel={character.xpToNextLevel} />

        {/* Stamina bar */}
        <div className="space-y-1 mt-3">
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-1.5 text-gray-700">
              <span>⚡</span>
              <span className="font-medium text-sm">Stamina</span>
            </span>
            <span className="text-gray-700 font-semibold text-sm tabular-nums">
              {currentStamina}
              <span className="text-gray-400 font-normal text-xs"> / {maxStamina}</span>
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-amber-400"
              style={{ width: `${Math.min((currentStamina / maxStamina) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ href, label, icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-md rounded-xl p-4 text-center transition-all group"
            >
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">
                {label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Lower three-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stats overview */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">
            Stats
          </h3>
          <div className="space-y-3">
            {STAT_CONFIG.map(({ key, label, icon, color, max }) => {
              const base = character.stats[key];
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
        </div>

        {/* Active quests widget */}
        <ActiveQuestsWidget quests={dailyQuests} loading={questsLoading} />

        {/* Recent activity feed */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-medium text-gray-700 mb-3">📋 Recent Activity</h3>
          {logsLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-400">
              No activities logged yet.{' '}
              <Link href="/activities" className="text-indigo-500 hover:underline">
                Log your first one!
              </Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <ActivityFeedItem key={log.id} log={log} />
              ))}
            </ul>
          )}
        </div>
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
  const icon = getActivityIcon(log.type);
  const amount = (log.data as Record<string, number>).amount;

  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="text-lg w-7 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-gray-800 capitalize">{def.label}</span>
        <span className="text-gray-400 ml-1.5">
          {amount} {def.unit}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {log.xpGained > 0 && (
          <>
            <span className="text-indigo-600 font-semibold">+{log.xpGained} XP</span>
            <span className="text-gray-300">·</span>
          </>
        )}
        <span className="text-gray-400 text-xs">{timeAgo(log.loggedAt)}</span>
      </div>
    </li>
  );
}

// ─── Active Quests Widget ─────────────────────────────────────────────────────

function ActiveQuestsWidget({ quests, loading }: { quests: ActiveQuest[]; loading: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-700">📜 Daily Quests</h3>
        <Link href="/quests" className="text-xs text-indigo-500 hover:underline">
          View all →
        </Link>
      </div>
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 bg-gray-100 rounded w-3/4" />
              <div className="h-1.5 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : quests.length === 0 ? (
        <p className="text-sm text-gray-400">
          <Link href="/quests" className="text-indigo-500 hover:underline">
            Visit quests
          </Link>{' '}
          to get today&apos;s goals.
        </p>
      ) : (
        <ul className="space-y-3">
          {quests.map((q) => (
            <QuestProgressRow key={q.id} quest={q} />
          ))}
        </ul>
      )}
    </div>
  );
}

function QuestProgressRow({ quest }: { quest: ActiveQuest }) {
  const def = getQuestDef(quest.questDefId);
  if (!def) return null;

  const pct = Math.min(100, Math.round((quest.progress / def.requirement.target) * 100));
  const isComplete = quest.completedAt !== null;
  const isClaimed = quest.claimedAt !== null;

  return (
    <li className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-700 truncate">{def.name}</span>
        {isClaimed ? (
          <span className="text-xs text-emerald-600 font-medium shrink-0">Claimed</span>
        ) : isComplete ? (
          <Link
            href="/quests"
            className="text-xs text-amber-600 font-semibold shrink-0 hover:underline"
          >
            Claim! →
          </Link>
        ) : (
          <span className="text-xs text-gray-400 shrink-0">{pct}%</span>
        )}
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            isClaimed ? 'bg-emerald-400' : isComplete ? 'bg-amber-400' : 'bg-indigo-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400">
        {quest.progress.toLocaleString()} / {def.requirement.target.toLocaleString()}{' '}
        {def.requirement.unit}
      </span>
    </li>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="h-7 bg-gray-100 rounded w-40" />
        <div className="h-2.5 bg-gray-100 rounded w-full" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 h-24" />
        ))}
      </div>
    </div>
  );
}

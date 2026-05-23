'use client';

import { useEffect, useState } from 'react';
import { useGameData } from '@/hooks/useGameData';
import { useQuestStore } from '@/store/questStore';
import { getQuestDef } from '@/lib/gameLogic/quests';
import { QUEST_REROLL_COST } from '@/lib/gameLogic/constants';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast, toastReward } from '@/components/ui/Toaster';
import { fireConfetti } from '@/lib/confetti';
import { playSound } from '@/hooks/useSound';
import type { ActiveQuest } from '@/types';

function timeUntilExpiry(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours >= 48) return `${Math.floor(hours / 24)}d remaining`;
  if (hours >= 1) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({
  label,
  current,
  target,
  unit,
  pct,
  variant,
}: {
  label?: string;
  current: number;
  target: number;
  unit: string;
  pct: number;
  variant: 'active' | 'complete' | 'claimed';
}) {
  const barColor =
    variant === 'claimed'
      ? 'bg-emerald-400'
      : variant === 'complete'
        ? 'bg-amber-400'
        : 'bg-indigo-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
        <span className="capitalize">
          {label && (
            <span className="font-medium text-gray-600 dark:text-slate-300 mr-1">{label}:</span>
          )}
          {current.toLocaleString()} / {target.toLocaleString()} {unit}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Quest Card ───────────────────────────────────────────────────────────────

function QuestCard({
  quest,
  claiming,
  rerolling,
  canAffordReroll,
  rerollCost,
  onClaim,
  onReroll,
}: {
  quest: ActiveQuest;
  claiming: string | null;
  rerolling: string | null;
  canAffordReroll: boolean;
  rerollCost: number;
  onClaim: (id: string) => void;
  onReroll: (id: string) => void;
}) {
  const def = getQuestDef(quest.questDefId);
  if (!def) return null;

  const pct = Math.min(100, Math.round((quest.progress / def.requirement.target) * 100));
  const isComplete = quest.completedAt !== null;
  const isClaimed = quest.claimedAt !== null;
  const isClaiming = claiming === quest.id;
  const isRerolling = rerolling === quest.id;
  // Reroll is only offered on active (un-complete, un-claimed) quests so players
  // can swap a quest they can't realistically finish today, but can't dodge the
  // claim step on already-completed quests.
  const canReroll = !isComplete && !isClaimed;
  const isMultiTarget = (def.extraTargets?.length ?? 0) > 0;

  return (
    <div
      className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm space-y-3 transition-colors ${
        isClaimed
          ? 'border-emerald-200 opacity-60'
          : isComplete
            ? 'border-amber-300 bg-amber-50/30 dark:bg-amber-950/20'
            : 'border-gray-200 dark:border-slate-700'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{def.name}</h3>
            {isClaimed && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                Claimed
              </span>
            )}
            {isComplete && !isClaimed && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                Complete!
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{def.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs text-indigo-600 font-semibold"
              title="Scales with level and streak"
            >
              {isClaimed && quest.rewardedXp != null
                ? `+${quest.rewardedXp} XP`
                : `~${def.rewards.xp}+ XP`}
            </span>
            <span className="text-xs text-amber-500 font-semibold">+{def.rewards.gold} 💰</span>
          </div>
          {!isClaimed && (
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {timeUntilExpiry(quest.expiresAt)}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar(s) */}
      <div className="space-y-2">
        {/* Primary target */}
        <ProgressBar
          label={isMultiTarget ? `${def.requirement.activityType}` : undefined}
          current={quest.progress}
          target={def.requirement.target}
          unit={def.requirement.unit}
          pct={pct}
          variant={isClaimed ? 'claimed' : isComplete ? 'complete' : 'active'}
        />
        {/* Extra targets */}
        {def.extraTargets?.map((et) => {
          const extraCurrent = quest.extraProgress?.[et.activityType] ?? 0;
          const extraPct = Math.min(100, Math.round((extraCurrent / et.target) * 100));
          const extraDone = extraCurrent >= et.target;
          return (
            <ProgressBar
              key={et.activityType}
              label={et.activityType}
              current={extraCurrent}
              target={et.target}
              unit={et.unit}
              pct={extraPct}
              variant={isClaimed ? 'claimed' : extraDone ? 'complete' : 'active'}
            />
          );
        })}
      </div>

      {/* Claim button */}
      {isComplete && !isClaimed && (
        <button
          onClick={() => onClaim(quest.id)}
          disabled={!!claiming}
          className="relative w-full overflow-hidden bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-amber-500/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none text-white text-xs font-bold py-2 rounded-lg transition-all active:scale-[0.98] group"
        >
          {/* Shimmer sweep */}
          <span
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700"
            aria-hidden="true"
          />
          <span className="relative">
            {isClaiming ? 'Claiming…' : `Claim +${def.rewards.xp} XP & +${def.rewards.gold} 💰`}
          </span>
        </button>
      )}

      {/* Reroll button — only on active (incomplete, unclaimed) quests */}
      {canReroll && (
        <button
          type="button"
          onClick={() => onReroll(quest.id)}
          disabled={!canAffordReroll || isRerolling || !!rerolling}
          title={
            canAffordReroll
              ? `Spend ${rerollCost} gold for a new quest`
              : `Need ${rerollCost} gold to reroll`
          }
          className="w-full inline-flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 dark:text-slate-300 text-xs font-semibold py-1.5 rounded-lg transition-colors"
        >
          <span aria-hidden="true">🎲</span>
          <span>{isRerolling ? 'Rerolling…' : `Reroll · ${rerollCost} 💰`}</span>
        </button>
      )}
    </div>
  );
}

// ─── Quest Section ────────────────────────────────────────────────────────────

function QuestSection({
  title,
  icon,
  quests,
  claiming,
  rerolling,
  canAffordReroll,
  rerollCost,
  onClaim,
  onReroll,
}: {
  title: string;
  icon: string;
  quests: ActiveQuest[];
  claiming: string | null;
  rerolling: string | null;
  canAffordReroll: boolean;
  rerollCost: number;
  onClaim: (id: string) => void;
  onReroll: (id: string) => void;
}) {
  const completed = quests.filter((q) => q.claimedAt !== null).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h2 className="text-sm font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
            {title}
          </h2>
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500">
          {completed}/{quests.length} claimed
        </p>
      </div>
      {quests.length === 0 ? (
        <EmptyState
          icon="📜"
          title="No quests available"
          description="New quests roll in daily and weekly — check back soon, adventurer."
        />
      ) : (
        <div className="space-y-3">
          {quests.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              claiming={claiming}
              rerolling={rerolling}
              canAffordReroll={canAffordReroll}
              rerollCost={rerollCost}
              onClaim={onClaim}
              onReroll={onReroll}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[3, 5].map((count, i) => (
        <div key={i} className="space-y-3">
          <Skeleton shape="line" height="h-5" width="w-32" />
          {Array.from({ length: count }).map((_, j) => (
            <Skeleton key={j} shape="card" height="h-28" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuestsPage() {
  const { character, quests, questsLoading: loading, questsError: error } = useGameData();
  const fetchAndAssignQuests = useQuestStore((s) => s.fetchAndAssignQuests);
  const claimReward = useQuestStore((s) => s.claimReward);
  const rerollQuest = useQuestStore((s) => s.rerollQuest);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [rerolling, setRerolling] = useState<string | null>(null);

  useEffect(() => {
    if (character?.uid) fetchAndAssignQuests(character.uid);
  }, [character?.uid, fetchAndAssignQuests]);

  if (!character) return null;

  const dailyQuests = quests.filter((q) => getQuestDef(q.questDefId)?.type === 'daily');
  const weeklyQuests = quests.filter((q) => getQuestDef(q.questDefId)?.type === 'weekly');
  const canAffordReroll = character.gold >= QUEST_REROLL_COST;

  async function handleClaim(questId: string) {
    if (claiming) return;
    const quest = quests.find((q) => q.id === questId);
    const def = quest ? getQuestDef(quest.questDefId) : null;
    setClaiming(questId);
    const result = await claimReward(questId);
    setClaiming(null);
    if (result && def) {
      fireConfetti(def.type === 'weekly' ? 'celebration' : 'subtle');
      playSound('claim');
      toastReward({
        emoji: '📜',
        title: `${def.name} claimed!`,
        xp: result.xpAwarded,
        gold: result.goldAwarded,
      });
    } else if (!result) {
      toast.error('Could not claim that quest. Try again.');
    }
  }

  async function handleReroll(questId: string) {
    if (rerolling) return;
    setRerolling(questId);
    const result = await rerollQuest(questId);
    setRerolling(null);
    if (result) {
      playSound('diceRolling');
      const newDef = getQuestDef(result.newQuestDefId);
      toast.success(`Quest rerolled — ${newDef?.name ?? 'new quest assigned'}`, {
        description: `−${result.cost} gold`,
      });
    } else {
      toast.error('Could not reroll that quest. Check your gold balance.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
          Quests
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Complete fitness goals to earn bonus XP and gold. Log activities to make progress.
        </p>
      </div>

      {error && (
        <ErrorBanner
          title="Couldn't load your quests."
          message={error}
          onRetry={() => fetchAndAssignQuests(character.uid)}
        />
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QuestSection
            title="Daily Quests"
            icon="📅"
            quests={dailyQuests}
            claiming={claiming}
            rerolling={rerolling}
            canAffordReroll={canAffordReroll}
            rerollCost={QUEST_REROLL_COST}
            onClaim={handleClaim}
            onReroll={handleReroll}
          />
          <QuestSection
            title="Weekly Quests"
            icon="📆"
            quests={weeklyQuests}
            claiming={claiming}
            rerolling={rerolling}
            canAffordReroll={canAffordReroll}
            rerollCost={QUEST_REROLL_COST}
            onClaim={handleClaim}
            onReroll={handleReroll}
          />
        </div>
      )}
    </div>
  );
}

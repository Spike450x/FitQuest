'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGameData } from '@/hooks/useGameData';
import { useBountyStore } from '@/store/bountyStore';
import { useCharacterStore } from '@/store/characterStore';
import { getBountyDef } from '@/lib/gameLogic/bounties';
import { getMonsterById } from '@/lib/gameLogic/monsters';
import { formatCountdown, rotationExpiresAt } from '@/lib/gameLogic/rotation';
import { MONSTER_EMOJI } from '@/components/combat/MonsterCard';
import { reputationProgress, resolveActiveTitle } from '@/lib/gameLogic/reputation';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ReputationRankBar, ReputationLadder } from '@/components/ui/ReputationChip';
import { toast } from '@/components/ui/Toaster';
import { fireConfetti } from '@/lib/confetti';
import { playSound } from '@/hooks/useSound';
import type { ActiveBounty } from '@/types';

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
        : 'bg-violet-500';
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

// ─── Reward summary chip ──────────────────────────────────────────────────────

function RewardSummary({ bounty, claimed }: { bounty: ActiveBounty; claimed: boolean }) {
  const rep =
    claimed && bounty.rewardedReputation != null
      ? bounty.rewardedReputation
      : bounty.rewards.reputation;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="font-semibold text-violet-600 dark:text-violet-300">+{rep} Rep</span>
      {bounty.rewards.xp ? (
        <span className="font-semibold text-indigo-600 dark:text-indigo-300">
          +{bounty.rewards.xp} XP
        </span>
      ) : null}
      {bounty.rewards.gold ? (
        <span className="font-semibold text-amber-500">+{bounty.rewards.gold} 💰</span>
      ) : null}
    </div>
  );
}

// ─── Bounty Card ──────────────────────────────────────────────────────────────

function BountyCard({
  bounty,
  claiming,
  onClaim,
}: {
  bounty: ActiveBounty;
  claiming: string | null;
  onClaim: (id: string) => void;
}) {
  const def = getBountyDef(bounty.bountyDefId);
  if (!def) return null;

  const pct = Math.min(100, Math.round((bounty.progress / def.requirement.target) * 100));
  const isComplete = bounty.completedAt !== null;
  const isClaimed = bounty.claimedAt !== null;
  const isClaiming = claiming === bounty.id;
  const isMultiTarget = (def.extraTargets?.length ?? 0) > 0;
  const isHunt = def.kind === 'hunt';
  const quarry = isHunt && bounty.combatMonsterId ? getMonsterById(bounty.combatMonsterId) : null;
  const quarryEmoji = quarry ? (MONSTER_EMOJI[quarry.id] ?? '👾') : '';

  return (
    <div
      data-testid={`bounty-card-${bounty.id}`}
      data-claimed={isClaimed ? 'true' : 'false'}
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
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
              {quarry ? `Wanted: ${quarryEmoji} ${quarry.name}` : def.name}
            </h3>
            {isHunt && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                Hunt
              </span>
            )}
            {isClaimed && (
              <span
                data-testid={`bounty-claimed-badge-${bounty.id}`}
                className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700"
              >
                Collected
              </span>
            )}
            {isComplete && !isClaimed && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                {isHunt ? 'Tracked!' : 'Complete!'}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            {quarry ? `${def.description} (Lv ${quarry.level})` : def.description}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <RewardSummary bounty={bounty} claimed={isClaimed} />
          <p className="text-xs text-gray-400 dark:text-slate-500">
            {isClaimed
              ? `Resets in ${formatCountdown(rotationExpiresAt())}`
              : timeUntilExpiry(bounty.expiresAt)}
          </p>
        </div>
      </div>

      {/* Progress bar(s) */}
      <div className="space-y-2">
        <ProgressBar
          label={isMultiTarget ? `${def.requirement.activityType}` : undefined}
          current={bounty.progress}
          target={def.requirement.target}
          unit={def.requirement.unit}
          pct={pct}
          variant={isClaimed ? 'claimed' : isComplete ? 'complete' : 'active'}
        />
        {def.extraTargets?.map((et) => {
          const extraCurrent = bounty.extraProgress?.[et.activityType] ?? 0;
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

      {/* Hunt: route to the fight once tracked. Standing: claim the loot inline. */}
      {isComplete &&
        !isClaimed &&
        (isHunt ? (
          <Link
            href={`/wanted/hunt/${bounty.id}`}
            data-testid={`bounty-hunt-btn-${bounty.id}`}
            className="relative block w-full overflow-hidden text-center bg-gradient-to-r from-violet-600 via-violet-500 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-lg hover:shadow-violet-500/40 text-white text-xs font-bold py-2 rounded-lg transition-all active:scale-[0.98] group"
          >
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700"
              aria-hidden="true"
            />
            <span className="relative">
              ⚔️ Hunt {quarry ? quarry.name : 'target'} · +{def.rewards.reputation} Rep
            </span>
          </Link>
        ) : (
          <button
            onClick={() => onClaim(bounty.id)}
            disabled={!!claiming}
            data-testid={`bounty-claim-btn-${bounty.id}`}
            className="relative w-full overflow-hidden bg-gradient-to-r from-violet-500 via-violet-400 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 hover:shadow-lg hover:shadow-violet-500/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none text-white text-xs font-bold py-2 rounded-lg transition-all active:scale-[0.98] group"
          >
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700"
              aria-hidden="true"
            />
            <span className="relative">
              {isClaiming ? 'Collecting…' : `Take the loot · +${def.rewards.reputation} Rep`}
            </span>
          </button>
        ))}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton shape="line" height="h-5" width="w-40" />
      {Array.from({ length: 3 }).map((_, j) => (
        <Skeleton key={j} shape="card" height="h-28" />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WantedBoardPage() {
  const { character, bounties, bountiesLoading: loading, bountiesError: error } = useGameData();
  const fetchAndAssignBounties = useBountyStore((s) => s.fetchAndAssignBounties);
  const claimBounty = useBountyStore((s) => s.claimBounty);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [showLadder, setShowLadder] = useState(false);

  useEffect(() => {
    if (character?.uid) fetchAndAssignBounties(character.uid);
  }, [character?.uid, fetchAndAssignBounties]);

  if (!character) return null;

  const collected = bounties.filter((b) => b.claimedAt !== null).length;
  const progress = reputationProgress(character.lifetimeReputation ?? 0);

  async function handleClaim(bountyId: string) {
    if (claiming) return;
    const bounty = bounties.find((b) => b.id === bountyId);
    const def = bounty ? getBountyDef(bounty.bountyDefId) : null;
    setClaiming(bountyId);
    const result = await claimBounty(bountyId, { path: 'loot' });
    setClaiming(null);
    if (result && def) {
      fireConfetti('subtle');
      playSound('claim');
      const extras: string[] = [];
      if (result.xpAwarded) extras.push(`+${result.xpAwarded} XP`);
      if (result.goldAwarded) extras.push(`+${result.goldAwarded} gold`);
      const done = useCharacterStore.getState().character?.bountiesCompleted;
      const trophy = done ? ` · 🏆 Bounty #${done}` : '';
      toast.success(`🎖️ ${def.name} — bounty collected!`, {
        description: [`+${result.reputationAwarded} Reputation`, ...extras].join(' · ') + trophy,
      });
    } else if (!result) {
      toast.error('Could not collect that bounty. Try again.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
          Wanted Board
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Take on bounties to earn Reputation. Log activities to make progress, then collect your
          reward.
        </p>
      </div>

      {/* Reputation rank summary */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
        <ReputationRankBar lifetime={character.lifetimeReputation ?? 0} />
        <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
          Title{' '}
          <span className="font-semibold text-violet-600 dark:text-violet-300">
            “{resolveActiveTitle(character.lifetimeReputation ?? 0, character.activeTitle)}”
          </span>{' '}
          · Wallet{' '}
          <span className="font-semibold text-violet-600 dark:text-violet-300">
            {(character.spendableReputation ?? 0).toLocaleString()} Rep
          </span>
          {!progress.atMax && ' · spend it as vendors and champions arrive.'}
        </p>
        <button
          type="button"
          onClick={() => setShowLadder((v) => !v)}
          aria-expanded={showLadder}
          className="mt-2 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
        >
          {showLadder ? '▲ Hide all ranks' : '▼ View all ranks'}
        </button>
        {showLadder && (
          <div className="mt-3">
            <ReputationLadder lifetime={character.lifetimeReputation ?? 0} />
          </div>
        )}
      </div>

      {error && (
        <ErrorBanner
          title="Couldn't load the Wanted Board."
          message={error}
          onRetry={() => fetchAndAssignBounties(character.uid)}
        />
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h2 className="text-sm font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                Today&apos;s Bounties
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-slate-500">
                {collected}/{bounties.length} collected
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-500">·</span>
              <span className="text-xs text-gray-400 dark:text-slate-500">
                Resets in {formatCountdown(rotationExpiresAt())}
              </span>
            </div>
          </div>
          {bounties.length === 0 ? (
            <EmptyState
              icon="🎯"
              title="The board is empty"
              description="New bounties are posted daily — check back soon, hunter."
            />
          ) : (
            <div className="space-y-3">
              {bounties.map((b) => (
                <BountyCard key={b.id} bounty={b} claiming={claiming} onClaim={handleClaim} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

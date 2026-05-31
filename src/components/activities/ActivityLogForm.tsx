'use client';
import { useState, useEffect, useCallback } from 'react';
import { logActivityFn } from '@/lib/functions';
import { captureError } from '@/lib/errors';
import { fetchTodayLogsForType } from '@/lib/activityData';
import { fetchWithRetry, STORE_RETRY_DELAYS } from '@/lib/retry';
import { dailyCapUsageFraction, DAILY_ACTIVITY_CAPS } from '@/lib/gameLogic/activityCaps';
import { useCharacter } from '@/hooks/useCharacter';
import { useCharacterStore } from '@/store/characterStore';
import { useQuestStore } from '@/store/questStore';
import { useBountyStore } from '@/store/bountyStore';
import { calculateResourceRestore } from '@/lib/gameLogic/stats';
import {
  ACTIVITY_DEFINITIONS,
  MASTERY_ACTIVITIES,
  RESTORE_ACTIVITIES,
  MASTERY_CONFIG,
  nextMasteryMilestone,
  type MasteryActivityType,
} from '@/lib/gameLogic/constants';
import { playerMaxHp, playerMaxStamina, playerMaxMagic } from '@/lib/gameLogic/combat';
import { computeNewStreak, getStreakTier, todayUTC } from '@/lib/gameLogic/streaks';
import { ACHIEVEMENTS } from '@/lib/gameLogic/achievements';
import {
  toast,
  toastPersonalRecord,
  toastStreakTier,
  toastMasteryMilestone,
} from '@/components/ui/Toaster';
import { Card } from '@/components/ui/Card';
import { InputField } from '@/components/ui/InputField';
import type { ActivityType, Character } from '@/types';

const TABS: { type: ActivityType; icon: string; label: string }[] = [
  { type: 'workout', icon: '🏋️', label: 'Workout' },
  { type: 'run', icon: '🏃', label: 'Run' },
  { type: 'steps', icon: '👟', label: 'Steps' },
  { type: 'sleep', icon: '😴', label: 'Sleep' },
  { type: 'water', icon: '💧', label: 'Water' },
  { type: 'nutrition', icon: '🥗', label: 'Nutrition' },
  { type: 'meditation', icon: '🧘', label: 'Meditate' },
];

const INPUT_CONFIG: Record<
  ActivityType,
  { min: number; max: number; step: number; placeholder: string }
> = {
  workout: { min: 1, max: 300, step: 1, placeholder: 'e.g. 45' },
  run: { min: 0.1, max: 50, step: 0.1, placeholder: 'e.g. 2.0' },
  steps: { min: 100, max: 50000, step: 100, placeholder: 'e.g. 8000' },
  sleep: { min: 0.5, max: 12, step: 0.5, placeholder: 'e.g. 7.5' },
  water: { min: 1, max: 20, step: 1, placeholder: 'e.g. 8' },
  nutrition: { min: 1, max: 10, step: 1, placeholder: 'e.g. 3' },
  meditation: { min: 1, max: 120, step: 1, placeholder: 'e.g. 20' },
};

const RESOURCE_LABEL: Record<
  'hp' | 'stamina' | 'magic',
  { label: string; icon: string; color: string }
> = {
  hp: {
    label: 'HP',
    icon: '❤️',
    color:
      'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40',
  },
  stamina: {
    label: 'Stamina',
    icon: '⚡',
    color:
      'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40',
  },
  magic: {
    label: 'Magic',
    icon: '✨',
    color:
      'text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/40',
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type MasteryResult = {
  kind: 'mastery';
  activityType: MasteryActivityType;
  activityLabel: string;
  newCount: number;
  milestoneHit: boolean;
  linkedStatLabel: string;
  nextMilestone: number;
  isNewRecord: boolean;
};

type RestoreResult = {
  kind: 'restore';
  activityType: 'nutrition' | 'sleep' | 'water';
  activityLabel: string;
  resourceType: 'hp' | 'stamina' | 'magic';
  restored: number;
  alreadyFull: boolean;
};

type LogResult = MasteryResult | RestoreResult;

// ─── Main Component ───────────────────────────────────────────────────────────

export function ActivityLogForm() {
  const { character } = useCharacter();
  const applyMasteryLocal = useCharacterStore((s) => s.applyMasteryLocal);
  const applyRestoreLocal = useCharacterStore((s) => s.applyRestoreLocal);
  const persistStreakAndRecord = useCharacterStore((s) => s.persistStreakAndRecord);
  const updateQuestProgress = useQuestStore((s) => s.updateQuestProgress);
  const updateBountyProgress = useBountyStore((s) => s.updateBountyProgress);

  const [activeTab, setActiveTab] = useState<ActivityType>('workout');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<LogResult | null>(null);
  // Per-type cache: avoids re-querying Firestore when switching back to a
  // previously-viewed tab during the same form session. `stale: true` means
  // the entry exists but needs a refresh (e.g. after a submit) — the meter
  // stays visible (dimmed) while the re-fetch is in flight.
  const [todayTotals, setTodayTotals] = useState<Map<string, { value: number; stale: boolean }>>(
    new Map(),
  );

  const refreshTodayTotal = useCallback(async (uid: string, type: string) => {
    try {
      const logs = await fetchWithRetry(() => fetchTodayLogsForType(uid, type), STORE_RETRY_DELAYS);
      const total = logs.reduce((sum, l) => sum + ((l.data.amount as number) ?? 0), 0);
      setTodayTotals((prev) => new Map(prev).set(type, { value: total, stale: false }));
    } catch {
      // On failure, clear the stale flag so the last known value shows without
      // a persistent spinner. The next submit will re-invalidate if needed.
      // If there was no prior entry (first fetch), state is unchanged — meter stays hidden.
      setTodayTotals((prev) => {
        const existing = prev.get(type);
        if (!existing?.stale) return prev;
        const m = new Map(prev);
        m.set(type, { ...existing, stale: false });
        return m;
      });
    }
  }, []);

  const characterUid = character?.uid;
  useEffect(() => {
    if (!characterUid) return;
    const entry = todayTotals.get(activeTab);
    if (!entry || entry.stale) {
      void refreshTodayTotal(characterUid, activeTab);
    }
  }, [characterUid, activeTab, todayTotals, refreshTodayTotal]);

  if (!character) return null;

  const def = ACTIVITY_DEFINITIONS[activeTab];
  const inputCfg = INPUT_CONFIG[activeTab];
  const parsedAmount = parseFloat(amount);
  const amountValid = !isNaN(parsedAmount) && parsedAmount > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!character || submitting || !amountValid) return;

    // Snapshot the streak tier *before* persisting so we can detect a tier-up.
    const beforeStreak = character.streakData?.currentStreak ?? 0;
    const beforeTier = getStreakTier(beforeStreak);
    const projectedStreak = computeNewStreak(character.streakData, todayUTC()).currentStreak;
    const afterTier = getStreakTier(projectedStreak);
    const tierUpgraded =
      afterTier.minDays > beforeTier.minDays && afterTier.label !== beforeTier.label;

    // Snapshot PR state before any writes — used for the result card and toast.
    const currentPr = character.personalRecords?.[activeTab];
    const isNewRecord = !currentPr || parsedAmount > currentPr.value;

    // Generate idempotency key before the try block so retries reuse the same key.
    const idempotencyKey = crypto.randomUUID();
    setSubmitting(true);
    try {
      // ── Call logActivity Cloud Function ───────────────────────────────────────
      // The function owns the authoritative aggregate query + activityLog write +
      // mastery milestone stat award. It returns `eligibleAmount` for us to use
      // in quest-progress and restore calls below.
      const { data: fnResult } = await logActivityFn({
        activityType: activeTab,
        amount: parsedAmount,
        unit: def.unit,
        idempotencyKey,
      });
      const {
        rewardEligible,
        eligibleAmount,
        justHitCap,
        masteryHit,
        linkedStatLabel,
        newMasteryCount,
        newAchievements,
      } = fnResult;
      const capReached = !rewardEligible;

      // Meditation is in BOTH sets — it grants Spirit mastery AND restores Magic.
      // Apply restore first so the magic bar reflects the new value, then prefer
      // the mastery result card (mastery is the more meaningful long-term reward).
      const isMastery = MASTERY_ACTIVITIES.has(activeTab);
      const isRestore = RESTORE_ACTIVITIES.has(activeTab);

      // ── Restore branch (nutrition / sleep / water / meditation) ─────────────
      if (isRestore && fnResult.restored && fnResult.restored.amount > 0) {
        applyRestoreLocal(fnResult.restored.resourceType, fnResult.restored.newValue);
      }

      // ── Mastery branch (run / workout / steps / meditation) ─────────────────
      if (isMastery) {
        const type = activeTab as MasteryActivityType;
        const config = MASTERY_CONFIG[type];

        // Prefer the server-authoritative count; fall back to client estimate only
        // if the function somehow omits it (future-proofing against old deploys).
        const newCount =
          newMasteryCount ??
          (rewardEligible
            ? (character.masteryCounts?.[type] ?? 0) + 1
            : (character.masteryCounts?.[type] ?? 0));
        applyMasteryLocal(type, newCount, masteryHit);

        setResult({
          kind: 'mastery',
          activityType: type,
          activityLabel: def.label,
          newCount,
          milestoneHit: masteryHit,
          linkedStatLabel: linkedStatLabel ?? config.linkedStatLabel,
          nextMilestone: nextMasteryMilestone(newCount),
          isNewRecord,
        });
      } else if (isRestore) {
        const type = activeTab as 'nutrition' | 'sleep' | 'water';
        const restored = fnResult.restored;
        const actualRestored = restored?.amount ?? 0;
        const alreadyFull = restored ? restored.amount === 0 : false;

        setResult({
          kind: 'restore',
          activityType: type,
          activityLabel: def.label,
          resourceType: restored?.resourceType ?? 'hp',
          restored: actualRestored,
          alreadyFull,
        });
      }

      // ── Celebrations (PR + streak tier-up + cap notice) ──────────────────────
      if (isNewRecord) {
        toastPersonalRecord(def.label, parsedAmount, def.unit);
      }
      if (tierUpgraded && afterTier.label) {
        toastStreakTier(afterTier.label, projectedStreak);
      } else if (projectedStreak === 1 && beforeStreak === 0) {
        toast(`🔥 Streak started! Day 1`, { description: 'Log tomorrow to keep it going.' });
      }
      if (capReached) {
        toast(`📒 Daily reward cap reached`, {
          description: `Logged for your records — rewards reset tomorrow.`,
        });
      } else if (justHitCap) {
        toast(`✅ Daily ${def.label.toLowerCase()} cap reached`, {
          description: `Future logs today will record but won't grant rewards.`,
        });
      }
      if (masteryHit && linkedStatLabel) {
        toastMasteryMilestone(linkedStatLabel, def.label);
      }

      if (newAchievements && newAchievements.length > 0) {
        for (const id of newAchievements) {
          const ach = ACHIEVEMENTS[id as keyof typeof ACHIEVEMENTS];
          if (ach) {
            toast.success(`Achievement unlocked: ${ach.name}`, {
              description: `${ach.emoji} +${ach.goldReward}g — ${ach.description}`,
              duration: 7000,
            });
          }
        }
      }

      setAmount('');

      // ── Quest progress + streak — fire-and-forget ─────────────────────────────
      // These are secondary writes: the result card is already visible. A failure
      // here doesn't roll back the activity log. Both stores reconcile with
      // Firestore on the next mount (fetchAndAssignQuests / fetchCharacter), so
      // the stale window is at most the current navigation session.
      if (eligibleAmount > 0) {
        // One log feeds both reward tracks — quests (XP/gold) and Wanted Board
        // bounties (Reputation). The double-advance is intentional: bounties are
        // a parallel earning surface, not a replacement for quests.
        updateQuestProgress(character.uid, activeTab, eligibleAmount).catch((e) =>
          captureError('ActivityLogForm:questProgress', e),
        );
        updateBountyProgress(character.uid, activeTab, eligibleAmount).catch((e) =>
          captureError('ActivityLogForm:bountyProgress', e),
        );
      }
      persistStreakAndRecord(activeTab, parsedAmount, def.unit).catch((e) =>
        captureError('ActivityLogForm:streak', e),
      );
      // Mark cache entry as stale — keeps the old value visible (dimmed) while
      // the useEffect re-fetches on the next render.
      setTodayTotals((prev) => {
        const m = new Map(prev);
        const existing = m.get(activeTab);
        if (existing) m.set(activeTab, { ...existing, stale: true });
        return m;
      });
    } catch (err) {
      // logActivity function call failed — activity was NOT logged.
      toast('Failed to log activity', {
        description: 'Please check your connection and try again.',
      });
      captureError('ActivityLogForm:logActivity', err);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <ResultCard result={result} onReset={() => setResult(null)} />;
  }

  return (
    <Card variant="default" padding="none" className="overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-slate-800">
        {TABS.map(({ type, icon, label }) => (
          <button
            key={type}
            type="button"
            data-testid={`activity-tab-${type}`}
            onClick={() => {
              setActiveTab(type);
              setAmount('');
            }}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              activeTab === type
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-500'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-900'
            }`}
          >
            <span className="block text-xl mb-0.5">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Form body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <p className="text-sm text-gray-500 dark:text-slate-400">{def.description}</p>

        {/* Linked-stat hint — surfaces the activity → stat mapping at log time
            so players understand why they're picking this activity. P2-1. */}
        {(() => {
          // Set.has() doesn't narrow the type — pull the config via the typed
          // MASTERY_CONFIG record and bail out if this activity isn't a mastery
          // type. Done inline to keep the JSX flat.
          const masteryCfg = (
            MASTERY_CONFIG as Record<
              string,
              { linkedStat: string; linkedStatLabel: string } | undefined
            >
          )[activeTab];
          if (!masteryCfg) return null;
          return (
            <div className="flex items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 px-3 py-2 text-xs">
              <span aria-hidden="true">⬆️</span>
              <span className="text-indigo-700 dark:text-indigo-200">
                Builds <span className="font-semibold">{masteryCfg.linkedStatLabel}</span> mastery —
                every 5 → 15 → 25 logs grants +1 {masteryCfg.linkedStatLabel}.
              </span>
            </div>
          );
        })()}

        <div>
          <label
            htmlFor="activity-amount"
            className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1 capitalize"
          >
            {def.unit}
          </label>
          <InputField
            id="activity-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={inputCfg.min}
            max={inputCfg.max}
            step={inputCfg.step}
            placeholder={inputCfg.placeholder}
            required
          />
        </div>

        {/* Preview */}
        {amountValid && (
          <ActivityPreview activityType={activeTab} amount={parsedAmount} character={character} />
        )}

        {/* Daily cap proximity meter — shows once today's total is loaded */}
        {todayTotals.has(activeTab) && (
          <CapMeter
            activityType={activeTab}
            todayTotal={todayTotals.get(activeTab)!.value}
            stale={todayTotals.get(activeTab)!.stale}
          />
        )}

        <button
          type="submit"
          disabled={!amountValid || submitting}
          data-testid="log-activity-submit"
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:shadow-md hover:shadow-indigo-500/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none text-white font-semibold py-2.5 rounded-lg transition-all active:scale-[0.98]"
        >
          {submitting ? 'Logging…' : 'Log Activity'}
        </button>
      </form>
    </Card>
  );
}

// ─── Daily Cap Meter ──────────────────────────────────────────────────────────

function CapMeter({
  activityType,
  todayTotal,
  stale,
}: {
  activityType: ActivityType;
  todayTotal: number;
  stale?: boolean;
}) {
  const fraction = dailyCapUsageFraction(activityType, todayTotal);
  const cap = DAILY_ACTIVITY_CAPS[activityType];
  const unit = ACTIVITY_DEFINITIONS[activityType].unit;
  const remaining = Math.max(0, cap - todayTotal);
  const exhausted = fraction >= 1;

  const barColor = exhausted ? 'bg-rose-500' : fraction >= 0.7 ? 'bg-amber-400' : 'bg-emerald-500';
  const textColor = exhausted
    ? 'text-rose-700 dark:text-rose-300'
    : fraction >= 0.7
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-emerald-700 dark:text-emerald-300';

  return (
    <div className={`space-y-1 transition-opacity ${stale ? 'opacity-50' : ''}`}>
      <div className="flex justify-between text-xs">
        <span className="text-gray-500 dark:text-slate-400 flex items-center gap-1">
          Today&apos;s cap
          {stale && (
            <span
              className="inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
          )}
        </span>
        <span className={textColor}>
          {exhausted ? 'Cap reached — streaks & PRs only' : `${remaining} ${unit} remaining`}
        </span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, fraction * 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Activity Preview ─────────────────────────────────────────────────────────

function ActivityPreview({
  activityType,
  amount,
  character,
}: {
  activityType: ActivityType;
  amount: number;
  character: Character;
}) {
  if (MASTERY_ACTIVITIES.has(activityType)) {
    const type = activityType as MasteryActivityType;
    const config = MASTERY_CONFIG[type];
    const currentCount = character.masteryCounts?.[type] ?? 0;
    const nextMilestone = nextMasteryMilestone(currentCount);
    const logsUntil = nextMilestone - currentCount;

    return (
      <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-lg px-4 py-3 space-y-1">
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">
          Mastery Progress
        </p>
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          <span className="font-bold">{currentCount}</span> {config.linkedStatLabel.toLowerCase()}{' '}
          logs so far
        </p>
        <p className="text-xs text-indigo-500 dark:text-indigo-400">
          {logsUntil} more to +1 {config.linkedStatLabel}
        </p>
      </div>
    );
  }

  if (RESTORE_ACTIVITIES.has(activityType)) {
    const restore = calculateResourceRestore(activityType, amount);
    if (!restore) return null;
    const rl = RESOURCE_LABEL[restore.resourceType];

    const maxHp = playerMaxHp(character);
    const maxStamina = playerMaxStamina(character);
    const maxMagic = playerMaxMagic(character);
    const currentVal =
      restore.resourceType === 'hp'
        ? (character.currentHp ?? maxHp)
        : restore.resourceType === 'stamina'
          ? (character.currentStamina ?? maxStamina)
          : restore.resourceType === 'magic'
            ? (character.currentMagic ?? maxMagic)
            : 0;
    const maxVal =
      restore.resourceType === 'hp'
        ? maxHp
        : restore.resourceType === 'stamina'
          ? maxStamina
          : maxMagic;
    const alreadyFull = currentVal >= maxVal;
    const actual = alreadyFull ? 0 : Math.min(restore.amount, maxVal - currentVal);

    return (
      <div className={`border rounded-lg px-4 py-3 ${rl.color}`}>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Preview</p>
        {alreadyFull ? (
          <p className="text-sm font-semibold">
            {rl.icon} Already at full {rl.label} — nothing to restore
          </p>
        ) : (
          <p className="text-sm font-semibold">
            {rl.icon} +{actual} {rl.label}
            <span className="font-normal text-xs ml-1.5 opacity-70">
              ({currentVal} → {Math.min(currentVal + restore.amount, maxVal)} / {maxVal})
            </span>
          </p>
        )}
      </div>
    );
  }

  return null;
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ result, onReset }: { result: LogResult; onReset: () => void }) {
  return (
    <Card variant="default" padding="none" className="p-8 text-center space-y-5">
      {result.kind === 'mastery' ? (
        <MasteryResult result={result} />
      ) : (
        <RestoreResult result={result} />
      )}
      <button
        onClick={onReset}
        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:shadow-md hover:shadow-indigo-500/40 text-white font-semibold py-2.5 rounded-lg transition-all active:scale-[0.98]"
      >
        Log Another Activity
      </button>
    </Card>
  );
}

function MasteryResult({ result }: { result: MasteryResult }) {
  const config = MASTERY_CONFIG[result.activityType];
  return (
    <>
      {/* Milestone banner */}
      {result.milestoneHit && (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
          <p className="text-3xl mb-1">⬆️</p>
          <p className="text-lg font-bold text-violet-700 dark:text-violet-300">
            Mastery Milestone!
          </p>
          <p className="text-sm text-violet-600 dark:text-violet-400">
            +1 {result.linkedStatLabel} — earned through consistency
          </p>
        </div>
      )}

      {/* Personal Record banner */}
      {result.isNewRecord && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <p className="text-3xl mb-1">🏆</p>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
            New Personal Record!
          </p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Best {result.activityLabel} yet — noted for raid access.
          </p>
        </div>
      )}

      {/* Mastery count */}
      <div>
        <p className="text-5xl font-bold text-indigo-600">{result.newCount}</p>
        <p className="text-gray-400 dark:text-slate-500 text-sm mt-1">
          {result.activityLabel} sessions logged
        </p>
      </div>

      {/* Progress to next milestone */}
      <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-lg px-4 py-3">
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">
          Next Milestone
        </p>
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          <span className="font-bold">{result.nextMilestone - result.newCount}</span> more{' '}
          {result.activityLabel.toLowerCase()} sessions → +1 {config.linkedStatLabel}
        </p>
      </div>
    </>
  );
}

function RestoreResult({ result }: { result: RestoreResult }) {
  const rl = RESOURCE_LABEL[result.resourceType];
  return (
    <>
      {result.alreadyFull ? (
        <div className="space-y-3">
          <p className="text-4xl">✅</p>
          <p className="text-lg font-semibold text-gray-700 dark:text-slate-200">
            {result.activityLabel} Logged
          </p>
          <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {rl.icon} {rl.label} was already full — nothing restored.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-4xl">{rl.icon}</p>
          <div>
            <p
              className="text-5xl font-bold"
              style={{
                color:
                  result.resourceType === 'hp'
                    ? '#e11d48'
                    : result.resourceType === 'stamina'
                      ? '#d97706'
                      : '#7c3aed',
              }}
            >
              +{result.restored}
            </p>
            <p className="text-gray-400 dark:text-slate-500 text-sm mt-1">{rl.label} restored</p>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Logged {result.restored} {rl.label.toLowerCase()} from{' '}
            {result.activityLabel.toLowerCase()}.
          </p>
        </div>
      )}
    </>
  );
}

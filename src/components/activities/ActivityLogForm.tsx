'use client';
import { useState } from 'react';
import { logActivityFn } from '@/lib/functions';
import { captureError } from '@/lib/errors';
import { useCharacter } from '@/hooks/useCharacter';
import { useCharacterStore } from '@/store/characterStore';
import { useQuestStore } from '@/store/questStore';
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
import {
  toast,
  toastPersonalRecord,
  toastStreakTier,
  toastMasteryMilestone,
} from '@/components/ui/Toaster';
import type { ActivityType, Character } from '@/types';

const TABS: { type: ActivityType; icon: string; label: string }[] = [
  { type: 'workout', icon: '🏋️', label: 'Workout' },
  { type: 'run', icon: '🏃', label: 'Run' },
  { type: 'steps', icon: '👟', label: 'Steps' },
  { type: 'sleep', icon: '😴', label: 'Sleep' },
  { type: 'water', icon: '💧', label: 'Water' },
  { type: 'nutrition', icon: '🥗', label: 'Nutrition' },
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
};

const RESOURCE_LABEL: Record<
  'hp' | 'stamina' | 'magic',
  { label: string; icon: string; color: string }
> = {
  hp: { label: 'HP', icon: '❤️', color: 'text-rose-600 border-rose-200 bg-rose-50' },
  stamina: { label: 'Stamina', icon: '⚡', color: 'text-amber-600 border-amber-200 bg-amber-50' },
  magic: { label: 'Magic', icon: '✨', color: 'text-violet-600 border-violet-200 bg-violet-50' },
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

  const [activeTab, setActiveTab] = useState<ActivityType>('workout');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<LogResult | null>(null);

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
      } = fnResult;
      const capReached = !rewardEligible;

      // ── Mastery activities (run / workout / steps) ──────────────────────────
      if (MASTERY_ACTIVITIES.has(activeTab)) {
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

        // ── Restoration activities (nutrition / sleep / water) ──────────────────
      } else if (RESTORE_ACTIVITIES.has(activeTab)) {
        const type = activeTab as 'nutrition' | 'sleep' | 'water';
        // The function computed the capped restore amount server-side and already
        // wrote the new value to Firestore. We just mirror it to local state.
        const restored = fnResult.restored;
        const actualRestored = restored?.amount ?? 0;
        const alreadyFull = restored ? restored.amount === 0 : false;

        if (restored && restored.amount > 0) {
          applyRestoreLocal(restored.resourceType, restored.newValue);
        }

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

      setAmount('');

      // ── Quest progress + streak — fire-and-forget ─────────────────────────────
      // These are secondary writes: the result card is already visible. A failure
      // here doesn't roll back the activity log. Both stores reconcile with
      // Firestore on the next mount (fetchAndAssignQuests / fetchCharacter), so
      // the stale window is at most the current navigation session.
      if (eligibleAmount > 0) {
        updateQuestProgress(character.uid, activeTab, eligibleAmount).catch((e) =>
          captureError('ActivityLogForm:questProgress', e),
        );
      }
      persistStreakAndRecord(activeTab, parsedAmount, def.unit).catch((e) =>
        captureError('ActivityLogForm:streak', e),
      );
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
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {TABS.map(({ type, icon, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setActiveTab(type);
              setAmount('');
            }}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              activeTab === type
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="block text-xl mb-0.5">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Form body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <p className="text-sm text-gray-500">{def.description}</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
            {def.unit}
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={inputCfg.min}
            max={inputCfg.max}
            step={inputCfg.step}
            placeholder={inputCfg.placeholder}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Preview */}
        {amountValid && (
          <ActivityPreview activityType={activeTab} amount={parsedAmount} character={character} />
        )}

        <button
          type="submit"
          disabled={!amountValid || submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {submitting ? 'Logging…' : 'Log Activity'}
        </button>
      </form>
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
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 space-y-1">
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">
          Mastery Progress
        </p>
        <p className="text-sm text-indigo-700">
          <span className="font-bold">{currentCount}</span> {config.linkedStatLabel.toLowerCase()}{' '}
          logs so far
        </p>
        <p className="text-xs text-indigo-500">
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
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center space-y-5">
      {result.kind === 'mastery' ? (
        <MasteryResult result={result} />
      ) : (
        <RestoreResult result={result} />
      )}
      <button
        onClick={onReset}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        Log Another Activity
      </button>
    </div>
  );
}

function MasteryResult({ result }: { result: MasteryResult }) {
  const config = MASTERY_CONFIG[result.activityType];
  return (
    <>
      {/* Milestone banner */}
      {result.milestoneHit && (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4">
          <p className="text-3xl mb-1">⬆️</p>
          <p className="text-lg font-bold text-violet-700">Mastery Milestone!</p>
          <p className="text-sm text-violet-600">
            +1 {result.linkedStatLabel} — earned through consistency
          </p>
        </div>
      )}

      {/* Personal Record banner */}
      {result.isNewRecord && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-3xl mb-1">🏆</p>
          <p className="text-lg font-bold text-emerald-700">New Personal Record!</p>
          <p className="text-sm text-emerald-600">
            Best {result.activityLabel} yet — noted for raid access.
          </p>
        </div>
      )}

      {/* Mastery count */}
      <div>
        <p className="text-5xl font-bold text-indigo-600">{result.newCount}</p>
        <p className="text-gray-400 text-sm mt-1">{result.activityLabel} sessions logged</p>
      </div>

      {/* Progress to next milestone */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">
          Next Milestone
        </p>
        <p className="text-sm text-indigo-700">
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
          <p className="text-lg font-semibold text-gray-700">{result.activityLabel} Logged</p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-sm text-gray-500">
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
            <p className="text-gray-400 text-sm mt-1">{rl.label} restored</p>
          </div>
          <p className="text-sm text-gray-500">
            Logged {result.restored} {rl.label.toLowerCase()} from{' '}
            {result.activityLabel.toLowerCase()}.
          </p>
        </div>
      )}
    </>
  );
}

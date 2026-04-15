"use client";
import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCharacter } from "@/hooks/useCharacter";
import { useCharacterStore } from "@/store/characterStore";
import { useQuestStore } from "@/store/questStore";
import { calculateActivityGains, calculateStaminaRestore } from "@/lib/gameLogic/stats";
import { ACTIVITY_DEFINITIONS } from "@/lib/gameLogic/constants";
import type { ActivityType, Stats } from "@/types";

// ─── Config ──────────────────────────────────────────────────────────────────

const TABS: { type: ActivityType; icon: string; label: string }[] = [
  { type: "workout", icon: "🏋️", label: "Workout" },
  { type: "run", icon: "🏃", label: "Run" },
  { type: "steps", icon: "👟", label: "Steps" },
  { type: "sleep", icon: "😴", label: "Sleep" },
  { type: "water", icon: "💧", label: "Water" },
  { type: "nutrition", icon: "🥗", label: "Nutrition" },
];

const INPUT_CONFIG: Record<
  ActivityType,
  { min: number; max: number; step: number; placeholder: string }
> = {
  workout: { min: 1, max: 300, step: 1, placeholder: "e.g. 45" },
  run: { min: 0.1, max: 50, step: 0.1, placeholder: "e.g. 2.0" },
  steps: { min: 100, max: 50000, step: 100, placeholder: "e.g. 8000" },
  sleep: { min: 0.5, max: 12, step: 0.5, placeholder: "e.g. 7.5" },
  water: { min: 1, max: 20, step: 1, placeholder: "e.g. 8" },
  nutrition: { min: 1, max: 10, step: 1, placeholder: "e.g. 3" },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type LogResult = {
  xpGained: number;
  statGains: Partial<Stats>;
  staminaRestored: number;
  levelsGained: number;
  newLevel: number;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ActivityLogForm() {
  const { character } = useCharacter();
  const awardXpAndStats = useCharacterStore((s) => s.awardXpAndStats);
  const restoreStamina = useCharacterStore((s) => s.restoreStamina);
  const updateQuestProgress = useQuestStore((s) => s.updateQuestProgress);
  const [activeTab, setActiveTab] = useState<ActivityType>("workout");
  const [amount, setAmount] = useState("");
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

    setSubmitting(true);
    try {
      const { statGains, xpGained } = calculateActivityGains(
        activeTab,
        parsedAmount,
        character.class,
        character.level
      );

      const staminaRestored = calculateStaminaRestore(activeTab, parsedAmount);

      const levelsGained = await awardXpAndStats(xpGained, statGains);

      if (staminaRestored > 0) {
        await restoreStamina(staminaRestored);
      }

      await addDoc(collection(db, "activityLogs"), {
        uid: character.uid,
        type: activeTab,
        data: { amount: parsedAmount, unit: def.unit },
        statGains,
        xpGained,
        loggedAt: Date.now(),
      });

      await updateQuestProgress(character.uid, activeTab, parsedAmount);

      setResult({
        xpGained,
        statGains,
        staminaRestored,
        levelsGained,
        newLevel: character.level + levelsGained,
      });
      setAmount("");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <ResultCard
        result={result}
        onReset={() => setResult(null)}
      />
    );
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
              setAmount("");
            }}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              activeTab === type
                ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span className="block text-xl mb-0.5">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Form body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <p className="text-sm text-gray-500">{def.description}</p>
        </div>

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

        {/* XP preview */}
        {amountValid && (
          <XpPreview
            activityType={activeTab}
            amount={parsedAmount}
            characterClass={character.class}
            characterLevel={character.level}
          />
        )}

        <button
          type="submit"
          disabled={!amountValid || submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {submitting ? "Logging…" : "Log Activity"}
        </button>
      </form>
    </div>
  );
}

// ─── XP Preview ───────────────────────────────────────────────────────────────

function XpPreview({
  activityType,
  amount,
  characterClass,
  characterLevel,
}: {
  activityType: ActivityType;
  amount: number;
  characterClass: import("@/types").CharacterClass;
  characterLevel: number;
}) {
  const { statGains, xpGained } = calculateActivityGains(
    activityType,
    amount,
    characterClass,
    characterLevel
  );
  const staminaRestored = calculateStaminaRestore(activityType, amount);
  const statEntries = Object.entries(statGains).filter(([, v]) => (v ?? 0) > 0);

  if (xpGained === 0 && statEntries.length === 0 && staminaRestored === 0) return null;

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
      <p className="text-xs font-semibold text-indigo-500 mb-2 uppercase tracking-wider">
        Preview
      </p>
      <div className="flex flex-wrap gap-2">
        {xpGained > 0 && (
          <span className="text-xs bg-white border border-indigo-200 text-indigo-700 font-semibold rounded-full px-3 py-1">
            +{xpGained} XP
          </span>
        )}
        {staminaRestored > 0 && (
          <span className="text-xs bg-white border border-amber-200 text-amber-700 font-semibold rounded-full px-3 py-1">
            +{staminaRestored} Stamina
          </span>
        )}
        {statEntries.map(([key, val]) => (
          <span
            key={key}
            className="text-xs bg-white border border-gray-200 text-gray-700 rounded-full px-3 py-1 capitalize"
          >
            +{val} {key}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({
  result,
  onReset,
}: {
  result: LogResult;
  onReset: () => void;
}) {
  const statEntries = Object.entries(result.statGains).filter(
    ([, v]) => (v ?? 0) > 0
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center space-y-5">
      {/* Level-up banner */}
      {result.levelsGained > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
          <p className="text-3xl mb-1">⬆️</p>
          <p className="text-lg font-bold text-amber-700">Level Up!</p>
          <p className="text-sm text-amber-600">
            You are now Level {result.newLevel} — HP &amp; Stamina fully restored!
          </p>
          <p className="text-xs text-amber-500 mt-1 font-medium">
            Head to your Dashboard to spend your stat point.
          </p>
        </div>
      )}

      {/* XP earned */}
      <div>
        <p className="text-5xl font-bold text-indigo-600">+{result.xpGained}</p>
        <p className="text-gray-400 text-sm mt-1">XP earned</p>
      </div>

      {/* Stamina restored */}
      {result.staminaRestored > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-2">
          <p className="text-sm font-semibold text-amber-700">
            ⚡ +{result.staminaRestored} Stamina restored
          </p>
        </div>
      )}

      {/* Stat gains */}
      {statEntries.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
            Stats Gained
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {statEntries.map(([key, val]) => (
              <span
                key={key}
                className="bg-indigo-50 text-indigo-700 text-sm font-semibold px-4 py-1.5 rounded-full capitalize"
              >
                +{val} {key}
              </span>
            ))}
          </div>
        </div>
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

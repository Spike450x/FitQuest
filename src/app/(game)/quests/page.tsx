"use client";

import { useEffect, useState } from "react";
import { useCharacter } from "@/hooks/useCharacter";
import { useQuestStore } from "@/store/questStore";
import { getQuestDef } from "@/lib/gameLogic/quests";
import type { ActiveQuest } from "@/types";

function timeUntilExpiry(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours >= 48) return `${Math.floor(hours / 24)}d remaining`;
  if (hours >= 1) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

// ─── Quest Card ───────────────────────────────────────────────────────────────

function QuestCard({
  quest,
  claiming,
  onClaim,
}: {
  quest: ActiveQuest;
  claiming: string | null;
  onClaim: (id: string) => void;
}) {
  const def = getQuestDef(quest.questDefId);
  if (!def) return null;

  const pct = Math.min(100, Math.round((quest.progress / def.requirement.target) * 100));
  const isComplete = quest.completedAt !== null;
  const isClaimed = quest.claimedAt !== null;
  const isClaiming = claiming === quest.id;

  return (
    <div
      className={`bg-white border rounded-xl p-4 shadow-sm space-y-3 transition-colors ${
        isClaimed
          ? "border-emerald-200 opacity-60"
          : isComplete
          ? "border-amber-300 bg-amber-50/30"
          : "border-gray-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm">{def.name}</h3>
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
          <p className="text-xs text-gray-400 mt-0.5">{def.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-indigo-600 font-semibold">+{def.rewards.xp} XP</span>
            <span className="text-xs text-amber-500 font-semibold">+{def.rewards.gold} 💰</span>
          </div>
          {!isClaimed && (
            <p className="text-xs text-gray-400">{timeUntilExpiry(quest.expiresAt)}</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            {quest.progress.toLocaleString()} / {def.requirement.target.toLocaleString()}{" "}
            {def.requirement.unit}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              isClaimed ? "bg-emerald-400" : isComplete ? "bg-amber-400" : "bg-indigo-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Claim button */}
      {isComplete && !isClaimed && (
        <button
          onClick={() => onClaim(quest.id)}
          disabled={!!claiming}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold py-2 rounded-lg transition-colors"
        >
          {isClaiming
            ? "Claiming…"
            : `Claim +${def.rewards.xp} XP & +${def.rewards.gold} 💰`}
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
  onClaim,
}: {
  title: string;
  icon: string;
  quests: ActiveQuest[];
  claiming: string | null;
  onClaim: (id: string) => void;
}) {
  const completed = quests.filter((q) => q.claimedAt !== null).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{title}</h2>
        </div>
        <p className="text-xs text-gray-400">
          {completed}/{quests.length} claimed
        </p>
      </div>
      {quests.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No quests available.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quests.map((q) => (
            <QuestCard key={q.id} quest={q} claiming={claiming} onClaim={onClaim} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[3, 5].map((count, i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          {Array.from({ length: count }).map((_, j) => (
            <div key={j} className="bg-white border border-gray-200 rounded-xl p-4 h-28" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuestsPage() {
  const { character } = useCharacter();
  const { quests, loading, fetchAndAssignQuests, claimReward } = useQuestStore();
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    if (character?.uid) fetchAndAssignQuests(character.uid);
  }, [character?.uid, fetchAndAssignQuests]);

  if (!character) return null;

  const dailyQuests = quests.filter((q) => getQuestDef(q.questDefId)?.type === "daily");
  const weeklyQuests = quests.filter((q) => getQuestDef(q.questDefId)?.type === "weekly");

  async function handleClaim(questId: string) {
    if (claiming) return;
    setClaiming(questId);
    await claimReward(questId);
    setClaiming(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quests</h1>
        <p className="text-sm text-gray-500 mt-1">
          Complete fitness goals to earn bonus XP and gold. Log activities to make progress.
        </p>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <QuestSection
            title="Daily Quests"
            icon="📅"
            quests={dailyQuests}
            claiming={claiming}
            onClaim={handleClaim}
          />
          <QuestSection
            title="Weekly Quests"
            icon="📆"
            quests={weeklyQuests}
            claiming={claiming}
            onClaim={handleClaim}
          />
        </>
      )}
    </div>
  );
}

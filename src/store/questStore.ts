import { create } from 'zustand';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  DAILY_QUEST_POOL,
  WEEKLY_QUEST_POOL,
  getQuestDef,
  scaleQuestRewards,
} from '@/lib/gameLogic/quests';
import {
  getDailyPick,
  getWeeklyPick,
  dailyExpiresAt,
  weeklyExpiresAt,
  deriveWeekKey,
} from '@/lib/gameLogic/rotation';
import { getStreakXpMultiplier } from '@/lib/gameLogic/streaks';
import { useCharacterStore } from './characterStore';
import { normalizeActiveQuest } from '@/lib/fetchPlayerData';
import type { ActiveQuest, ActivityType } from '@/types';

const DAILY_QUEST_COUNT = 3;
const WEEKLY_QUEST_COUNT = 3;

interface QuestStore {
  quests: ActiveQuest[];
  loading: boolean;
  error: string | null;
  /**
   * Loads active (non-expired) quests for the user.
   * Automatically assigns 3 daily quests and 3 weekly quests (picked from the
   * 5-quest weekly pool) if the current set has fully expired or is empty.
   * Pass `dateKey` ('YYYY-MM-DD' UTC) to make the daily pick deterministic
   * without reading the internal clock — useful when re-triggering at midnight.
   */
  fetchAndAssignQuests: (uid: string, dateKey?: string) => Promise<void>;
  /**
   * Called after each activity log submission.
   * Advances progress on any matching, incomplete, non-expired quests.
   */
  updateQuestProgress: (uid: string, activityType: ActivityType, amount: number) => Promise<void>;
  /**
   * Awards XP + gold for a completed, unclaimed quest.
   * Returns the actual scaled amounts awarded on success (use for toast display),
   * or false if the quest is not claimable.
   */
  claimReward: (questId: string) => Promise<{ xpAwarded: number; goldAwarded: number } | false>;
  clear: () => void;
}

let fetching = false; // module-level guard — prevents concurrent double-assignment

export const useQuestStore = create<QuestStore>((set, get) => ({
  quests: [],
  loading: false,
  error: null,

  fetchAndAssignQuests: async (uid, dateKey) => {
    if (fetching) return;
    fetching = true;
    set({ loading: true, error: null });
    try {
      const now = Date.now();

      // Query by uid only — a compound (uid + expiresAt) query would require a
      // Firestore composite index. Filter the expiry check client-side instead.
      const q = query(collection(db, 'activeQuests'), where('uid', '==', uid));
      const snap = await getDocs(q);
      const existing = snap.docs
        .map((d) => normalizeActiveQuest(d.id, d.data()))
        .filter((q) => q.expiresAt > now);

      const weekKey = dateKey ? deriveWeekKey(dateKey) : undefined;

      // Assign daily quests if none are active for today.
      // Uses a day-seeded deterministic pick so the same 3 quests appear for everyone today.
      const hasDailies = existing.some((q) => getQuestDef(q.questDefId)?.type === 'daily');
      const dailyAssigned: ActiveQuest[] = [];
      if (!hasDailies) {
        const picked = getDailyPick(DAILY_QUEST_POOL, DAILY_QUEST_COUNT, dateKey);
        const expiry = dailyExpiresAt();
        const refs = await Promise.all(
          picked.map((def) =>
            addDoc(collection(db, 'activeQuests'), {
              uid,
              questDefId: def.id,
              progress: 0,
              completedAt: null,
              claimedAt: null,
              expiresAt: expiry,
              rewards: def.rewards,
            }),
          ),
        );
        refs.forEach((ref, i) =>
          dailyAssigned.push({
            id: ref.id,
            uid,
            questDefId: picked[i].id,
            progress: 0,
            completedAt: null,
            claimedAt: null,
            expiresAt: expiry,
            rewards: picked[i].rewards,
          }),
        );
      }

      // Assign weekly quests if none are active for this week.
      // Uses a week-seeded deterministic pick so the same 3 quests appear all week.
      const hasWeeklies = existing.some((q) => getQuestDef(q.questDefId)?.type === 'weekly');
      const weeklyAssigned: ActiveQuest[] = [];
      if (!hasWeeklies) {
        const picked = getWeeklyPick(WEEKLY_QUEST_POOL, WEEKLY_QUEST_COUNT, weekKey);
        const expiry = weeklyExpiresAt();
        const refs = await Promise.all(
          picked.map((def) =>
            addDoc(collection(db, 'activeQuests'), {
              uid,
              questDefId: def.id,
              progress: 0,
              completedAt: null,
              claimedAt: null,
              expiresAt: expiry,
              rewards: def.rewards,
            }),
          ),
        );
        refs.forEach((ref, i) =>
          weeklyAssigned.push({
            id: ref.id,
            uid,
            questDefId: picked[i].id,
            progress: 0,
            completedAt: null,
            claimedAt: null,
            expiresAt: expiry,
            rewards: picked[i].rewards,
          }),
        );
      }

      set({ quests: [...existing, ...dailyAssigned, ...weeklyAssigned], loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    } finally {
      fetching = false;
    }
  },

  updateQuestProgress: async (uid, activityType, amount) => {
    const { quests } = get();
    const now = Date.now();

    // A quest is eligible for progress if it's incomplete, unexpired, and has
    // at least one target (primary or extra) matching the logged activity type.
    const eligible = quests.filter((q) => {
      if (q.completedAt !== null) return false;
      if (q.expiresAt <= now) return false;
      const def = getQuestDef(q.questDefId);
      if (!def) return false;
      return (
        def.requirement.activityType === activityType ||
        def.extraTargets?.some((t) => t.activityType === activityType)
      );
    });

    if (eligible.length === 0) return;

    const dbUpdates: Promise<void>[] = [];
    const nextQuests = quests.map((q) => {
      if (!eligible.find((e) => e.id === q.id)) return q;

      const def = getQuestDef(q.questDefId)!;

      // ── Primary target ───────────────────────────────────────────────────────
      const newProgress =
        def.requirement.activityType === activityType
          ? Math.min(q.progress + amount, def.requirement.target)
          : q.progress;

      // ── Extra targets ────────────────────────────────────────────────────────
      let newExtraProgress = q.extraProgress ? { ...q.extraProgress } : undefined;
      if (def.extraTargets) {
        // Dev guard (R6): duplicate activityType across extraTargets would cause key
        // collision — progress for the second target overwrites the first at the same key.
        // The quest pool test catches this at definition time; this assertion catches it
        // at runtime during development so a bad definition is immediately visible.
        if (process.env.NODE_ENV !== 'production') {
          const seen = new Set<string>();
          for (const et of def.extraTargets) {
            if (seen.has(et.activityType)) {
              console.error(
                `[questStore] Quest "${def.id}" has duplicate extraTarget activityType "${et.activityType}". Progress tracking will be incorrect.`,
              );
            }
            seen.add(et.activityType);
          }
        }
        newExtraProgress = newExtraProgress ?? {};
        for (const et of def.extraTargets) {
          if (et.activityType === activityType) {
            const prev = newExtraProgress[activityType] ?? 0;
            newExtraProgress[activityType] = Math.min(prev + amount, et.target);
          }
        }
      }

      // ── Completion check — ALL targets must be met ───────────────────────────
      const primaryMet = newProgress >= def.requirement.target;
      const extrasMet =
        !def.extraTargets ||
        def.extraTargets.every((et) => (newExtraProgress?.[et.activityType] ?? 0) >= et.target);
      const completedAt = primaryMet && extrasMet ? now : null;

      const dbPayload: Record<string, unknown> = { progress: newProgress, completedAt };
      if (newExtraProgress !== undefined) dbPayload.extraProgress = newExtraProgress;

      dbUpdates.push(updateDoc(doc(db, 'activeQuests', q.id), dbPayload));

      return { ...q, progress: newProgress, extraProgress: newExtraProgress, completedAt };
    });

    await Promise.all(dbUpdates);
    set({ quests: nextQuests });
  },

  claimReward: async (questId) => {
    const { quests } = get();
    const quest = quests.find((q) => q.id === questId);

    if (!quest || quest.completedAt === null || quest.claimedAt !== null) return false;

    const now = Date.now();
    await updateDoc(doc(db, 'activeQuests', questId), { claimedAt: now });

    // ── Reward scaling ────────────────────────────────────────────────────────
    // Two multipliers stack:
    //   1. Level scaler — daily/weekly quest base values were balanced for ~lv 1–5;
    //      the sqrt curve keeps quests relevant past level 10.
    //   2. Streak XP bonus — gentle reward for consistency (caps at ×1.25).
    // Gold is only level-scaled; streak rewards live in loot rates, not currency.
    const { awardXpAndStats, awardGold, character } = useCharacterStore.getState();
    const level = character?.level ?? 1;
    const streak = character?.streakData?.currentStreak ?? 0;

    const scaled = scaleQuestRewards(quest.rewards, level);
    const xpToAward = Math.round(scaled.xp * getStreakXpMultiplier(streak));

    await Promise.all([awardXpAndStats(xpToAward, {}), awardGold(scaled.gold)]);

    set((state) => ({
      quests: state.quests.map((q) => (q.id === questId ? { ...q, claimedAt: now } : q)),
    }));

    return { xpAwarded: xpToAward, goldAwarded: scaled.gold };
  },

  clear: () => set({ quests: [], error: null }),
}));

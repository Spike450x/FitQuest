import { create } from "zustand";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DAILY_QUEST_POOL, WEEKLY_QUESTS, getQuestDef } from "@/lib/gameLogic/quests";
import { getDailyPick, getWeeklyPick, dailyExpiresAt, weeklyExpiresAt } from "@/lib/gameLogic/rotation";
import { useCharacterStore } from "./characterStore";
import type { ActiveQuest, ActivityType } from "@/types";

const DAILY_QUEST_COUNT = 3;
const WEEKLY_QUEST_COUNT = 3;

interface QuestStore {
  quests: ActiveQuest[];
  loading: boolean;
  /**
   * Loads active (non-expired) quests for the user.
   * Automatically assigns 3 daily quests and all 5 weekly quests if
   * the current set has fully expired or is empty.
   */
  fetchAndAssignQuests: (uid: string) => Promise<void>;
  /**
   * Called after each activity log submission.
   * Advances progress on any matching, incomplete, non-expired quests.
   */
  updateQuestProgress: (uid: string, activityType: ActivityType, amount: number) => Promise<void>;
  /**
   * Awards XP + gold for a completed, unclaimed quest.
   * Returns true on success, false if the quest is not claimable.
   */
  claimReward: (questId: string) => Promise<boolean>;
  clear: () => void;
}

export const useQuestStore = create<QuestStore>((set, get) => ({
  quests: [],
  loading: false,

  fetchAndAssignQuests: async (uid) => {
    set({ loading: true });
    try {
      const now = Date.now();

      // Query by uid only — a compound (uid + expiresAt) query would require a
      // Firestore composite index. Filter the expiry check client-side instead.
      const q = query(
        collection(db, "activeQuests"),
        where("uid", "==", uid)
      );
      const snap = await getDocs(q);
      const existing = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as ActiveQuest))
        .filter((q) => q.expiresAt > now);

      const assigned: ActiveQuest[] = [];

      // Assign daily quests if none are active for today
      // Uses a day-seeded deterministic pick so the same 3 quests appear for everyone today.
      const hasDailies = existing.some((q) => getQuestDef(q.questDefId)?.type === "daily");
      if (!hasDailies) {
        const picked = getDailyPick(DAILY_QUEST_POOL, DAILY_QUEST_COUNT);
        const expiry = dailyExpiresAt();
        for (const def of picked) {
          const questData = {
            uid,
            questDefId: def.id,
            progress: 0,
            completedAt: null,
            claimedAt: null,
            expiresAt: expiry,
            rewards: def.rewards,
          };
          const ref = await addDoc(collection(db, "activeQuests"), questData);
          assigned.push({ id: ref.id, ...questData });
        }
      }

      // Assign weekly quests if none are active for this week
      // Uses a week-seeded deterministic pick so the same 3 quests appear all week.
      const hasWeeklies = existing.some((q) => getQuestDef(q.questDefId)?.type === "weekly");
      if (!hasWeeklies) {
        const picked = getWeeklyPick(WEEKLY_QUESTS, WEEKLY_QUEST_COUNT);
        const expiry = weeklyExpiresAt();
        for (const def of picked) {
          const questData = {
            uid,
            questDefId: def.id,
            progress: 0,
            completedAt: null,
            claimedAt: null,
            expiresAt: expiry,
            rewards: def.rewards,
          };
          const ref = await addDoc(collection(db, "activeQuests"), questData);
          assigned.push({ id: ref.id, ...questData });
        }
      }

      set({ quests: [...existing, ...assigned], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateQuestProgress: async (uid, activityType, amount) => {
    const { quests } = get();
    const now = Date.now();

    // Find quests that match the activity type and are not yet complete/expired
    const targets = quests.filter((q) => {
      if (q.completedAt !== null) return false;
      if (q.expiresAt <= now) return false;
      const def = getQuestDef(q.questDefId);
      return def?.requirement.activityType === activityType;
    });

    if (targets.length === 0) return;

    const dbUpdates: Promise<void>[] = [];
    const nextQuests = quests.map((q) => {
      if (!targets.find((t) => t.id === q.id)) return q;

      const def = getQuestDef(q.questDefId)!;
      const newProgress = Math.min(q.progress + amount, def.requirement.target);
      const completedAt = newProgress >= def.requirement.target ? now : null;

      dbUpdates.push(
        updateDoc(doc(db, "activeQuests", q.id), { progress: newProgress, completedAt })
      );

      return { ...q, progress: newProgress, completedAt };
    });

    await Promise.all(dbUpdates);
    set({ quests: nextQuests });
  },

  claimReward: async (questId) => {
    const { quests } = get();
    const quest = quests.find((q) => q.id === questId);

    if (!quest || quest.completedAt === null || quest.claimedAt !== null) return false;

    const now = Date.now();
    await updateDoc(doc(db, "activeQuests", questId), { claimedAt: now });

    // Award rewards through character store
    const { awardXpAndStats, awardGold } = useCharacterStore.getState();
    await Promise.all([
      awardXpAndStats(quest.rewards.xp, {}),
      awardGold(quest.rewards.gold),
    ]);

    set((state) => ({
      quests: state.quests.map((q) =>
        q.id === questId ? { ...q, claimedAt: now } : q
      ),
    }));

    return true;
  },

  clear: () => set({ quests: [] }),
}));

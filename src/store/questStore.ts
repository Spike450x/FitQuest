import { create } from 'zustand';
import { deleteField } from 'firebase/firestore';
import { captureError } from '@/lib/errors';
import { fetchWithRetry, STORE_RETRY_DELAYS } from '@/lib/retry';
import { fetchActiveQuests } from '@/lib/fetchPlayerData';
import { addActiveQuestDoc, updateActiveQuestDoc } from '@/lib/questData';
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
import { questRerollCost } from '@/lib/gameLogic/constants';
import { checkQuestAchievements, sumAchievementGold } from '@/lib/gameLogic/achievements';
import { updateCharacterDoc } from '@/lib/characterData';
import { useCharacterStore } from './characterStore';
import type { AchievementId, ActiveQuest, ActivityType, QuestDef } from '@/types';

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Post-claim side-effect: increments the lifetime / weekly counters, evaluates
 * quest-category achievements, merges new IDs + their gold reward into the
 * character doc via the shared `applyCharacterPatch` action.
 *
 * Returns the newly-unlocked IDs + their summed gold so the caller can surface
 * them in toast. Read-modify-write happens against a fresh `getState()`
 * snapshot — the patch action handles the functional setState so a concurrent
 * write from another hook cannot clobber this one's local-state update.
 *
 * Client-authoritative: no CF re-validation today. Worst-case tamper is a few
 * hundred gold per fabricated unlock; harden via a CF re-check when leaderboards
 * arrive.
 */
async function applyQuestAchievementSideEffects(
  quest: ActiveQuest,
  def: QuestDef,
): Promise<{ newAchievements: AchievementId[]; achievementGold: number }> {
  const { character, applyCharacterPatch } = useCharacterStore.getState();
  if (!character) return { newAchievements: [], achievementGold: 0 };

  const totalAfter = (character.totalQuestsClaimed ?? 0) + 1;

  // Weekly-quest tracking — counter only matters when the claim is itself a
  // weekly quest. For daily claims we do NOT recompute weeklyClaimsThisWeek
  // (the prior week's stale value would falsely trigger `weekly-perfectionist`
  // re-check; the patch would be a no-op since the achievement is already held,
  // but the logic was wrong).
  const weekKey = deriveWeekKey(todayDateKey());
  const prior = character.weeklyQuestsClaimed;
  const sameWeek = prior?.weekKey === weekKey;
  const priorIds = sameWeek ? (prior?.questDefIds ?? []) : [];
  const isWeekly = def.type === 'weekly';
  let updatedWeeklyIds = priorIds;
  let weeklyClaimsThisWeek = 0;
  if (isWeekly) {
    updatedWeeklyIds = !priorIds.includes(quest.questDefId)
      ? [...priorIds, quest.questDefId]
      : priorIds;
    weeklyClaimsThisWeek = updatedWeeklyIds.length;
  }

  const newAchievements = checkQuestAchievements({
    existing: new Set(character.achievements ?? []),
    totalQuestsClaimedAfter: totalAfter,
    weeklyClaimsThisWeek,
  });
  const achievementGold = sumAchievementGold(newAchievements);

  const patch: Partial<typeof character> = {
    totalQuestsClaimed: totalAfter,
  };
  if (isWeekly) {
    patch.weeklyQuestsClaimed = { weekKey, questDefIds: updatedWeeklyIds };
  }
  if (newAchievements.length > 0) {
    patch.achievements = [...(character.achievements ?? []), ...newAchievements];
    patch.gold = (character.gold ?? 0) + achievementGold;
  }

  await applyCharacterPatch(patch);
  return { newAchievements, achievementGold };
}

const DAILY_QUEST_COUNT = 3;
const WEEKLY_QUEST_COUNT = 3;

interface QuestStore {
  quests: ActiveQuest[];
  loading: boolean;
  error: string | null;
  _fetching: boolean;
  lastFetchedAt: number | null;
  lastFetchedUid: string | null;
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
  claimReward: (questId: string) => Promise<
    | {
        xpAwarded: number;
        goldAwarded: number;
        newAchievements: AchievementId[];
        achievementGold: number;
      }
    | false
  >;
  /**
   * Replaces an active (not-yet-complete, not-yet-claimed) quest with a new
   * pick from the appropriate pool. Costs `questRerollCost(level)` gold. Excludes
   * the player's currently-active questDefIds so they get a genuinely new
   * quest. Returns `{ newQuestDefId, cost }` on success or `false` if the
   * reroll wasn't possible (not enough gold, quest claimed, quest completed,
   * or no other quest in the pool).
   */
  rerollQuest: (questId: string) => Promise<{ newQuestDefId: string; cost: number } | false>;
  clear: () => void;
}

const FETCH_TTL_MS = 30_000;

export const useQuestStore = create<QuestStore>((set, get) => ({
  quests: [],
  loading: false,
  error: null,
  _fetching: false,
  lastFetchedAt: null,
  lastFetchedUid: null,

  fetchAndAssignQuests: async (uid, dateKey) => {
    const { _fetching, lastFetchedAt, lastFetchedUid } = get();
    if (_fetching) return;
    if (
      lastFetchedUid === uid &&
      lastFetchedAt !== null &&
      Date.now() - lastFetchedAt < FETCH_TTL_MS
    ) {
      return;
    }
    set({ _fetching: true, loading: true, error: null });
    try {
      const now = Date.now();

      // Query by uid only — a compound (uid + expiresAt) query would require a
      // Firestore composite index. Filter the expiry check client-side instead.
      // Retry the read only — the conditional writes below must not be retried
      // blindly because partial quest assignments can't be safely rolled back.
      // While retrying (up to ~4 s), _fetching stays true: concurrent callers
      // return early and correctly wait for this attempt to settle.
      const all = await fetchWithRetry(() => fetchActiveQuests(uid), STORE_RETRY_DELAYS);
      const existing = all.filter((q) => q.expiresAt > now);

      const weekKey = dateKey ? deriveWeekKey(dateKey) : undefined;

      // Assign daily quests if none are active for today.
      // Uses a day-seeded deterministic pick so the same 3 quests appear for everyone today.
      const hasDailies = existing.some((q) => getQuestDef(q.questDefId)?.type === 'daily');
      const dailyAssigned: ActiveQuest[] = [];
      if (!hasDailies) {
        const picked = getDailyPick(DAILY_QUEST_POOL, DAILY_QUEST_COUNT, dateKey);
        const expiry = dailyExpiresAt();
        const newIds = await Promise.all(
          picked.map((def) =>
            addActiveQuestDoc({
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
        newIds.forEach((id, i) =>
          dailyAssigned.push({
            id,
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
        const newIds = await Promise.all(
          picked.map((def) =>
            addActiveQuestDoc({
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
        newIds.forEach((id, i) =>
          weeklyAssigned.push({
            id,
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

      set({
        quests: [...existing, ...dailyAssigned, ...weeklyAssigned],
        loading: false,
        _fetching: false,
        lastFetchedAt: Date.now(),
        lastFetchedUid: uid,
      });
    } catch (e) {
      captureError('questStore.fetchAndAssignQuests', e);
      set({ error: (e as Error).message, loading: false, _fetching: false });
    }
  },

  updateQuestProgress: async (uid, activityType, amount) => {
    try {
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

        dbUpdates.push(updateActiveQuestDoc(q.id, dbPayload));

        return { ...q, progress: newProgress, extraProgress: newExtraProgress, completedAt };
      });

      await Promise.all(dbUpdates);
      set({ quests: nextQuests });
    } catch (e) {
      captureError('questStore.updateQuestProgress', e);
    }
  },

  claimReward: async (questId) => {
    try {
      const { quests } = get();
      const quest = quests.find((q) => q.id === questId);

      if (!quest || quest.completedAt === null || quest.claimedAt !== null) return false;

      // ── Reward scaling ────────────────────────────────────────────────────────
      // Two multipliers stack:
      //   1. Level scaler — daily/weekly quest base values were balanced for ~lv 1–5;
      //      the sqrt curve keeps quests relevant past level 10.
      //   2. Streak XP bonus — gentle reward for consistency (caps at ×1.25).
      // Gold is only level-scaled; streak rewards live in loot rates, not currency.
      // Compute before the write so we can stamp the actual awarded values on the
      // doc (rewardedXp / rewardedGold) — stats page reads these for accurate display.
      const { awardXpAndStats, awardGold, character } = useCharacterStore.getState();
      const level = character?.level ?? 1;
      const streak = character?.streakData?.currentStreak ?? 0;
      const scaled = scaleQuestRewards(quest.rewards, level);
      const xpToAward = Math.round(scaled.xp * getStreakXpMultiplier(streak));

      const now = Date.now();
      await updateActiveQuestDoc(questId, {
        claimedAt: now,
        rewardedXp: xpToAward,
        rewardedGold: scaled.gold,
      });

      await Promise.all([awardXpAndStats(xpToAward, {}), awardGold(scaled.gold)]);

      // ── Achievement side-effects (extracted helper) ─────────────────────────
      // Counter increments, weekly-perfectionist tracking, and any quest
      // achievement unlocks merge atomically via `applyCharacterPatch`.
      const def = getQuestDef(quest.questDefId);
      const { newAchievements, achievementGold } = def
        ? await applyQuestAchievementSideEffects(quest, def)
        : { newAchievements: [] as AchievementId[], achievementGold: 0 };

      set((state) => ({
        quests: state.quests.map((q) =>
          q.id === questId
            ? { ...q, claimedAt: now, rewardedXp: xpToAward, rewardedGold: scaled.gold }
            : q,
        ),
      }));

      return {
        xpAwarded: xpToAward,
        goldAwarded: scaled.gold,
        newAchievements,
        achievementGold,
      };
    } catch (e) {
      captureError('questStore.claimReward', e);
      return false;
    }
  },

  rerollQuest: async (questId) => {
    try {
      const { quests } = get();
      const quest = quests.find((q) => q.id === questId);
      if (!quest) return false;
      // Only active quests (not complete, not claimed) can be rerolled.
      if (quest.completedAt !== null || quest.claimedAt !== null) return false;

      const def = getQuestDef(quest.questDefId);
      if (!def) return false;

      // Affordability check using the latest character snapshot.
      const { character } = useCharacterStore.getState();
      if (!character) return false;
      const cost = questRerollCost(character.level);
      if (character.gold < cost) return false;

      // Pool by quest type. Exclude defIds the player currently holds so the
      // reroll always gives genuine variety (no rolling back into the same
      // quest or one already held).
      const pool: QuestDef[] = def.type === 'daily' ? DAILY_QUEST_POOL : WEEKLY_QUEST_POOL;
      const heldDefIds = new Set(quests.map((q) => q.questDefId));
      const candidates = pool.filter((d) => !heldDefIds.has(d.id));
      if (candidates.length === 0) return false;

      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      const expiry = def.type === 'daily' ? dailyExpiresAt() : weeklyExpiresAt();

      // Persist the replacement + the gold deduction. Two writes (quest doc,
      // character doc) — we accept the brief client-side window between them
      // because Firestore rules already cap any further gold delta at the
      // matching write, and the reroll is rare/explicit.
      const newGold = character.gold - cost;
      // Use deleteField() (not undefined) for the no-extraTargets branch:
      // Firestore's updateDoc rejects undefined values entirely, so a bare
      // `extraProgress: undefined` payload crashes the reroll. deleteField()
      // explicitly removes the field, which is what we want when the new
      // quest has no extra targets to track.
      await Promise.all([
        updateActiveQuestDoc(questId, {
          questDefId: pick.id,
          progress: 0,
          extraProgress: pick.extraTargets ? {} : deleteField(),
          completedAt: null,
          rewards: pick.rewards,
          expiresAt: expiry,
        }),
        updateCharacterDoc(character.uid, { gold: newGold }),
      ]);

      // Update local stores together so UI re-renders in one frame.
      useCharacterStore.setState({ character: { ...character, gold: newGold } });
      set((state) => ({
        quests: state.quests.map((q) =>
          q.id === questId
            ? {
                ...q,
                questDefId: pick.id,
                progress: 0,
                extraProgress: pick.extraTargets ? {} : undefined,
                completedAt: null,
                rewards: pick.rewards,
                expiresAt: expiry,
              }
            : q,
        ),
      }));

      return { newQuestDefId: pick.id, cost };
    } catch (e) {
      captureError('questStore.rerollQuest', e);
      return false;
    }
  },

  clear: () =>
    set({
      quests: [],
      loading: false,
      error: null,
      _fetching: false,
      lastFetchedAt: null,
      lastFetchedUid: null,
    }),
}));

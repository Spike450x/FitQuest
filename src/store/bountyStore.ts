import { create } from 'zustand';
import { captureError } from '@/lib/errors';
import { fetchWithRetry, STORE_RETRY_DELAYS } from '@/lib/retry';
import { fetchActiveBounties } from '@/lib/fetchPlayerData';
import { addActiveBountyDoc, updateActiveBountyDoc } from '@/lib/bountyData';
import { BOUNTY_POOL, getBountyDef } from '@/lib/gameLogic/bounties';
import { getDailyPick, dailyExpiresAt } from '@/lib/gameLogic/rotation';
import { useCharacterStore } from './characterStore';
import type { ActiveBounty, ActivityType } from '@/types';

const BOUNTY_COUNT = 3;
const FETCH_TTL_MS = 30_000;

/**
 * Grants Reputation to BOTH wallets — the spendable balance and the lifetime
 * tracker — in a single character write. The single earn point for PR1, called
 * from `claimBounty`'s loot path. Mirrors the read-modify-write discipline of
 * `applyQuestAchievementSideEffects`: `applyCharacterPatch` owns the Firestore
 * write + functional setState, so a concurrent gold/quest write can't clobber it.
 *
 * Client-authoritative — no CF re-validation today. Harden via a `claimBounty`
 * Cloud Function when leaderboards arrive.
 */
async function grantReputation(amount: number): Promise<void> {
  const { character, applyCharacterPatch } = useCharacterStore.getState();
  if (!character) return;
  await applyCharacterPatch({
    spendableReputation: (character.spendableReputation ?? 0) + amount,
    lifetimeReputation: (character.lifetimeReputation ?? 0) + amount,
  });
}

interface BountyStore {
  bounties: ActiveBounty[];
  loading: boolean;
  error: string | null;
  _fetching: boolean;
  lastFetchedAt: number | null;
  lastFetchedUid: string | null;
  /**
   * Loads active (non-expired) bounties for the user, assigning a fresh daily
   * set from the deterministic rotation if none are active. Pass `dateKey`
   * ('YYYY-MM-DD' UTC) to make the pick pure/testable.
   */
  fetchAndAssignBounties: (uid: string, dateKey?: string) => Promise<void>;
  /**
   * Called after each activity log — advances progress on any matching,
   * incomplete, non-expired bounty. Shares the ActivityLogForm callsite with
   * `questStore.updateQuestProgress`, so one log feeds both surfaces.
   */
  updateBountyProgress: (uid: string, activityType: ActivityType, amount: number) => Promise<void>;
  /**
   * Claims a completed, unclaimed bounty. The `loot` path (default) grants
   * Reputation immediately. The `fight` path is the deferred combat-encounter
   * fork — it returns false in PR1 (a follow-up wires it to combat).
   * Returns the awarded amounts on success, or false if not claimable.
   */
  claimBounty: (
    bountyId: string,
    opts?: { path?: 'loot' | 'fight' },
  ) => Promise<{ reputationAwarded: number; xpAwarded: number; goldAwarded: number } | false>;
  clear: () => void;
}

export const useBountyStore = create<BountyStore>((set, get) => ({
  bounties: [],
  loading: false,
  error: null,
  _fetching: false,
  lastFetchedAt: null,
  lastFetchedUid: null,

  fetchAndAssignBounties: async (uid, dateKey) => {
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

      // Query by uid only — client-side expiry filter avoids a composite index,
      // mirroring the activeQuests pattern. Retry the read only.
      const all = await fetchWithRetry(() => fetchActiveBounties(uid), STORE_RETRY_DELAYS);
      const existing = all.filter((b) => b.expiresAt > now);

      const assigned: ActiveBounty[] = [];
      if (existing.length === 0) {
        const picked = getDailyPick(BOUNTY_POOL, BOUNTY_COUNT, dateKey);
        const expiry = dailyExpiresAt();
        const newIds = await Promise.all(
          picked.map((def) =>
            addActiveBountyDoc({
              uid,
              bountyDefId: def.id,
              progress: 0,
              completedAt: null,
              claimedAt: null,
              expiresAt: expiry,
              rewards: def.rewards,
            }),
          ),
        );
        newIds.forEach((id, i) =>
          assigned.push({
            id,
            uid,
            bountyDefId: picked[i].id,
            progress: 0,
            completedAt: null,
            claimedAt: null,
            expiresAt: expiry,
            rewards: picked[i].rewards,
          }),
        );
      }

      set({
        bounties: [...existing, ...assigned],
        loading: false,
        _fetching: false,
        lastFetchedAt: Date.now(),
        lastFetchedUid: uid,
      });
    } catch (e) {
      captureError('bountyStore.fetchAndAssignBounties', e);
      set({ error: (e as Error).message, loading: false, _fetching: false });
    }
  },

  updateBountyProgress: async (uid, activityType, amount) => {
    try {
      const { bounties } = get();
      const now = Date.now();

      const eligible = bounties.filter((b) => {
        if (b.completedAt !== null) return false;
        if (b.expiresAt <= now) return false;
        const def = getBountyDef(b.bountyDefId);
        if (!def) return false;
        return (
          def.requirement.activityType === activityType ||
          def.extraTargets?.some((t) => t.activityType === activityType)
        );
      });

      if (eligible.length === 0) return;

      const dbUpdates: Promise<void>[] = [];
      const nextBounties = bounties.map((b) => {
        if (!eligible.find((e) => e.id === b.id)) return b;

        const def = getBountyDef(b.bountyDefId)!;

        const newProgress =
          def.requirement.activityType === activityType
            ? Math.min(b.progress + amount, def.requirement.target)
            : b.progress;

        let newExtraProgress = b.extraProgress ? { ...b.extraProgress } : undefined;
        if (def.extraTargets) {
          newExtraProgress = newExtraProgress ?? {};
          for (const et of def.extraTargets) {
            if (et.activityType === activityType) {
              const prev = newExtraProgress[activityType] ?? 0;
              newExtraProgress[activityType] = Math.min(prev + amount, et.target);
            }
          }
        }

        const primaryMet = newProgress >= def.requirement.target;
        const extrasMet =
          !def.extraTargets ||
          def.extraTargets.every((et) => (newExtraProgress?.[et.activityType] ?? 0) >= et.target);
        const completedAt = primaryMet && extrasMet ? now : null;

        const dbPayload: Record<string, unknown> = { progress: newProgress, completedAt };
        if (newExtraProgress !== undefined) dbPayload.extraProgress = newExtraProgress;

        dbUpdates.push(updateActiveBountyDoc(b.id, dbPayload));

        return { ...b, progress: newProgress, extraProgress: newExtraProgress, completedAt };
      });

      await Promise.all(dbUpdates);
      set({ bounties: nextBounties });
    } catch (e) {
      captureError('bountyStore.updateBountyProgress', e);
    }
  },

  claimBounty: async (bountyId, opts) => {
    const path = opts?.path ?? 'loot';
    try {
      const { bounties } = get();
      const bounty = bounties.find((b) => b.id === bountyId);
      if (!bounty || bounty.completedAt === null || bounty.claimedAt !== null) return false;

      // ── Fight fork (deferred) ───────────────────────────────────────────────
      // The combat-encounter path that yields a larger payout slots in here:
      // hand off to useCombatEncounter and only stamp claimedAt + grant the
      // scaled reward on victory. Returns false in PR1 so the seam is explicit.
      if (path === 'fight') return false;

      // ── Loot path ───────────────────────────────────────────────────────────
      const repAwarded = bounty.rewards.reputation;
      const xpAward = bounty.rewards.xp ?? 0;
      const goldAward = bounty.rewards.gold ?? 0;

      const now = Date.now();
      await updateActiveBountyDoc(bountyId, {
        claimedAt: now,
        rewardedReputation: repAwarded,
      });

      // Reputation first (single character write), then the optional xp/gold
      // sweetener via the character store's own award actions. Sequenced so each
      // functional setState reads the prior result — no clobber.
      await grantReputation(repAwarded);
      if (xpAward > 0 || goldAward > 0) {
        const { awardXpAndStats, awardGold } = useCharacterStore.getState();
        if (xpAward > 0) await awardXpAndStats(xpAward, {});
        if (goldAward > 0) await awardGold(goldAward);
      }

      set((state) => ({
        bounties: state.bounties.map((b) =>
          b.id === bountyId ? { ...b, claimedAt: now, rewardedReputation: repAwarded } : b,
        ),
      }));

      return { reputationAwarded: repAwarded, xpAwarded: xpAward, goldAwarded: goldAward };
    } catch (e) {
      captureError('bountyStore.claimBounty', e);
      return false;
    }
  },

  clear: () =>
    set({
      bounties: [],
      loading: false,
      error: null,
      _fetching: false,
      lastFetchedAt: null,
      lastFetchedUid: null,
    }),
}));

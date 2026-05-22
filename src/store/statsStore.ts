import { create } from 'zustand';
import { captureError } from '@/lib/errors';
import { fetchActivityLogs } from '@/lib/activityData';
import { fetchRecentCombatLogs, type CombatLog } from '@/lib/combatData';
import type { ActivityLog } from '@/types';

const FETCH_TTL_MS = 30_000;
const COMBAT_LOG_LIMIT = 1000;

interface StatsStore {
  activityLogs: ActivityLog[];
  combatLogs: CombatLog[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  lastFetchedUid: string | null;

  /** Fetches activity + combat logs for the given uid, with 30 s TTL caching. */
  fetchStatsData: (uid: string, force?: boolean) => Promise<void>;
  clear: () => void;
}

export const useStatsStore = create<StatsStore>((set, get) => ({
  activityLogs: [],
  combatLogs: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
  lastFetchedUid: null,

  fetchStatsData: async (uid, force = false) => {
    const { lastFetchedAt, lastFetchedUid } = get();
    if (
      !force &&
      lastFetchedUid === uid &&
      lastFetchedAt !== null &&
      Date.now() - lastFetchedAt < FETCH_TTL_MS
    ) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const [activityLogs, combatLogs] = await Promise.all([
        fetchActivityLogs(uid),
        fetchRecentCombatLogs(uid, COMBAT_LOG_LIMIT),
      ]);
      set({
        activityLogs,
        combatLogs,
        loading: false,
        lastFetchedAt: Date.now(),
        lastFetchedUid: uid,
      });
    } catch (e) {
      captureError('statsStore.fetchStatsData', e);
      set({ error: (e as Error).message, loading: false });
    }
  },

  clear: () =>
    set({
      activityLogs: [],
      combatLogs: [],
      loading: false,
      error: null,
      lastFetchedAt: null,
      lastFetchedUid: null,
    }),
}));

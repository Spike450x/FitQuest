import { create } from 'zustand';
import { captureError } from '@/lib/errors';
import { fetchWithRetry } from '@/lib/retry';
import { fetchActivityLogs } from '@/lib/activityData';
import { fetchRecentCombatLogs, type CombatLog } from '@/lib/combatData';
import type { ActivityLog } from '@/types';

const FETCH_TTL_MS = 30_000;
const COMBAT_LOG_LIMIT = 1000;

interface StatsStore {
  activityLogs: ActivityLog[];
  combatLogs: CombatLog[];
  loading: boolean;
  /** True while a failed attempt is waiting before its next retry. */
  retrying: boolean;
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
  retrying: false,
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
    set({ loading: true, retrying: false, error: null });
    try {
      let attempt = 0;
      const [activityLogs, combatLogs] = await fetchWithRetry(
        () => Promise.all([fetchActivityLogs(uid), fetchRecentCombatLogs(uid, COMBAT_LOG_LIMIT)]),
        [1_000, 3_000],
        () => {
          attempt++;
          if (attempt === 1) set({ retrying: true });
        },
      );
      set({
        activityLogs,
        combatLogs,
        loading: false,
        retrying: false,
        lastFetchedAt: Date.now(),
        lastFetchedUid: uid,
      });
    } catch (e) {
      captureError('statsStore.fetchStatsData', e);
      set({ error: (e as Error).message, loading: false, retrying: false });
    }
  },

  clear: () =>
    set({
      activityLogs: [],
      combatLogs: [],
      loading: false,
      retrying: false,
      error: null,
      lastFetchedAt: null,
      lastFetchedUid: null,
    }),
}));

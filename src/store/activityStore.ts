import { create } from 'zustand';
import { subscribeToRecentActivity } from '@/lib/activityData';
import type { ActivityLog } from '@/types';

// Feeds the dashboard activity list. Kept a touch larger than the visible
// default so the in-feed type filter / sort has something to work with.
const RECENT_COUNT = 12;

interface ActivityStore {
  recentLogs: ActivityLog[];
  loading: boolean;
  _uid: string | null;
  _unsubscribe: (() => void) | null;

  /**
   * Starts (or reuses) a Firestore real-time subscription for the given uid.
   * Calling with the same uid is a no-op so it's safe to call from effects
   * that re-run on every render. Calling with a new uid tears down the old
   * subscription first.
   */
  subscribe: (uid: string) => void;
  unsubscribe: () => void;
  clear: () => void;
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  recentLogs: [],
  loading: true,
  _uid: null,
  _unsubscribe: null,

  subscribe: (uid) => {
    if (get()._uid === uid) return;

    // Tear down previous subscription before starting a new one.
    get()._unsubscribe?.();

    set({ loading: true, _uid: uid });

    const unsubscribe = subscribeToRecentActivity(
      uid,
      RECENT_COUNT,
      (logs) => set({ recentLogs: logs, loading: false }),
      () => set({ loading: false }),
    );

    set({ _unsubscribe: unsubscribe });
  },

  unsubscribe: () => {
    get()._unsubscribe?.();
    set({ _uid: null, _unsubscribe: null });
  },

  clear: () => {
    get()._unsubscribe?.();
    set({ recentLogs: [], loading: true, _uid: null, _unsubscribe: null });
  },
}));

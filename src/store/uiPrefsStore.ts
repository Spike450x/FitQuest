import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ALL_QUICK_ACTION_IDS,
  DEFAULT_PINNED_ACTIONS,
  MAX_PINNED_ACTIONS,
  MIN_PINNED_ACTIONS,
} from '@/lib/quickActions';

/**
 * Device-level UI preferences for the dashboard / character pages: which
 * Quick-Action tiles are pinned and which collapsible sections are open.
 * Persisted to localStorage (not Firestore) — these are per-device cosmetic
 * choices, so they intentionally survive sign-out (no store flush).
 */
interface UiPrefsState {
  /** Ordered pinned quick-action ids shown on the dashboard. */
  pinnedActions: string[];
  /** Per-section collapsed state, keyed by a stable section id. */
  collapsed: Record<string, boolean>;
  togglePinnedAction: (id: string) => void;
  resetPinnedActions: () => void;
  toggleCollapsed: (id: string) => void;
  setCollapsed: (id: string, value: boolean) => void;
}

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set, get) => ({
      pinnedActions: [...DEFAULT_PINNED_ACTIONS],
      collapsed: {},

      togglePinnedAction: (id) => {
        const { pinnedActions } = get();
        if (pinnedActions.includes(id)) {
          if (pinnedActions.length <= MIN_PINNED_ACTIONS) return;
          set({ pinnedActions: pinnedActions.filter((a) => a !== id) });
        } else {
          if (pinnedActions.length >= MAX_PINNED_ACTIONS) return;
          // Append so the newest pin lands at the end of the grid (stable order).
          set({ pinnedActions: [...pinnedActions, id] });
        }
      },

      resetPinnedActions: () => set({ pinnedActions: [...DEFAULT_PINNED_ACTIONS] }),

      toggleCollapsed: (id) =>
        set((s) => ({ collapsed: { ...s.collapsed, [id]: !s.collapsed[id] } })),

      setCollapsed: (id, value) => set((s) => ({ collapsed: { ...s.collapsed, [id]: value } })),
    }),
    {
      name: 'fitquest:ui',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Drop any pinned ids that no longer exist in the catalog, then ensure
        // the bar never falls below the minimum (reset to defaults if it does).
        const valid = state.pinnedActions.filter((id) =>
          (ALL_QUICK_ACTION_IDS as readonly string[]).includes(id),
        );
        state.pinnedActions =
          valid.length >= MIN_PINNED_ACTIONS ? valid : [...DEFAULT_PINNED_ACTIONS];
      },
    },
  ),
);

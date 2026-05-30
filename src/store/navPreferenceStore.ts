import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ALL_NAV_HREFS } from '@/lib/navConfig';

export const MAX_PINNED = 5;
const MIN_PINNED = 1;

const DEFAULT_PINNED = ALL_NAV_HREFS.slice(0, MAX_PINNED);

interface NavPreferenceState {
  pinnedHrefs: string[];
  customizerOpen: boolean;
  /** Persisted — cleared once the user opens the customizer for the first time. */
  hasSeenCustomizer: boolean;
  togglePin: (href: string) => void;
  reorderPinned: (newOrder: string[]) => void;
  openCustomizer: () => void;
  closeCustomizer: () => void;
}

export const useNavPreferenceStore = create<NavPreferenceState>()(
  persist(
    (set, get) => ({
      pinnedHrefs: [...DEFAULT_PINNED],
      customizerOpen: false,
      hasSeenCustomizer: false,
      togglePin: (href) => {
        const { pinnedHrefs } = get();
        if (pinnedHrefs.includes(href)) {
          if (pinnedHrefs.length <= MIN_PINNED) return;
          set({ pinnedHrefs: pinnedHrefs.filter((h) => h !== href) });
        } else {
          if (pinnedHrefs.length >= MAX_PINNED) return;
          set({ pinnedHrefs: [...pinnedHrefs, href] });
        }
      },
      reorderPinned: (newOrder) => set({ pinnedHrefs: newOrder }),
      // Mark seen so the onboarding badge disappears after first open.
      openCustomizer: () => set({ customizerOpen: true, hasSeenCustomizer: true }),
      closeCustomizer: () => set({ customizerOpen: false }),
    }),
    {
      name: 'fitquest:nav',
      partialize: (state) => ({
        pinnedHrefs: state.pinnedHrefs,
        hasSeenCustomizer: state.hasSeenCustomizer,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const valid = state.pinnedHrefs.filter((h) =>
          (ALL_NAV_HREFS as readonly string[]).includes(h),
        );
        const dropped = state.pinnedHrefs.length - valid.length;
        if (valid.length < MIN_PINNED) {
          // All hrefs were stale — reset to defaults.
          state.pinnedHrefs = [...DEFAULT_PINNED];
        } else if (dropped > 0) {
          // Backfill dropped slots from defaults so the bar stays full.
          const backfill = DEFAULT_PINNED.filter((h) => !valid.includes(h)).slice(0, dropped);
          state.pinnedHrefs = [...valid, ...backfill].slice(0, MAX_PINNED);
        } else {
          state.pinnedHrefs = valid;
        }
      },
    },
  ),
);

import { describe, it, expect, beforeEach } from 'vitest';
import { useNavPreferenceStore, MAX_PINNED } from '@/store/navPreferenceStore';
import { ALL_NAV_HREFS } from '@/lib/navConfig';

const DEFAULTS = ALL_NAV_HREFS.slice(0, MAX_PINNED) as string[];

function reset() {
  useNavPreferenceStore.setState({
    pinnedHrefs: [...DEFAULTS],
    customizerOpen: false,
    hasSeenCustomizer: false,
  });
}

describe('navPreferenceStore', () => {
  beforeEach(reset);

  // ── hasSeenCustomizer ──────────────────────────────────────────────────────

  describe('hasSeenCustomizer', () => {
    it('starts false', () => {
      expect(useNavPreferenceStore.getState().hasSeenCustomizer).toBe(false);
    });

    it('becomes true when openCustomizer is called', () => {
      useNavPreferenceStore.getState().openCustomizer();
      expect(useNavPreferenceStore.getState().hasSeenCustomizer).toBe(true);
    });

    it('stays true after closeCustomizer', () => {
      useNavPreferenceStore.getState().openCustomizer();
      useNavPreferenceStore.getState().closeCustomizer();
      expect(useNavPreferenceStore.getState().hasSeenCustomizer).toBe(true);
    });

    it('openCustomizer also sets customizerOpen true', () => {
      useNavPreferenceStore.getState().openCustomizer();
      expect(useNavPreferenceStore.getState().customizerOpen).toBe(true);
    });

    it('closeCustomizer sets customizerOpen false without resetting hasSeenCustomizer', () => {
      useNavPreferenceStore.getState().openCustomizer();
      useNavPreferenceStore.getState().closeCustomizer();
      const { customizerOpen, hasSeenCustomizer } = useNavPreferenceStore.getState();
      expect(customizerOpen).toBe(false);
      expect(hasSeenCustomizer).toBe(true);
    });
  });

  // ── togglePin ──────────────────────────────────────────────────────────────

  describe('togglePin', () => {
    it('removes a pinned href', () => {
      const { togglePin } = useNavPreferenceStore.getState();
      const before = useNavPreferenceStore.getState().pinnedHrefs;
      togglePin(before[before.length - 1]);
      expect(useNavPreferenceStore.getState().pinnedHrefs).toHaveLength(before.length - 1);
    });

    it('adds an unpinned href when below max', () => {
      // Drop one to make room, then add a different one.
      useNavPreferenceStore.setState({ pinnedHrefs: DEFAULTS.slice(0, MAX_PINNED - 1) });
      const unpinned = ALL_NAV_HREFS.find(
        (h) => !useNavPreferenceStore.getState().pinnedHrefs.includes(h as string),
      ) as string;
      useNavPreferenceStore.getState().togglePin(unpinned);
      expect(useNavPreferenceStore.getState().pinnedHrefs).toContain(unpinned);
    });

    it('does not exceed MAX_PINNED when bar is full', () => {
      // Default state is already at MAX_PINNED — adding should be a no-op.
      expect(useNavPreferenceStore.getState().pinnedHrefs).toHaveLength(MAX_PINNED);
      const unpinned = ALL_NAV_HREFS.find(
        (h) => !useNavPreferenceStore.getState().pinnedHrefs.includes(h as string),
      ) as string;
      useNavPreferenceStore.getState().togglePin(unpinned);
      expect(useNavPreferenceStore.getState().pinnedHrefs).toHaveLength(MAX_PINNED);
    });

    it('does not go below 1 pinned item', () => {
      useNavPreferenceStore.setState({ pinnedHrefs: [DEFAULTS[0]] });
      useNavPreferenceStore.getState().togglePin(DEFAULTS[0]);
      expect(useNavPreferenceStore.getState().pinnedHrefs).toHaveLength(1);
    });
  });

  // ── reorderPinned ──────────────────────────────────────────────────────────

  describe('reorderPinned', () => {
    it('replaces pinnedHrefs with the new order', () => {
      const reversed = [...DEFAULTS].reverse();
      useNavPreferenceStore.getState().reorderPinned(reversed);
      expect(useNavPreferenceStore.getState().pinnedHrefs).toEqual(reversed);
    });
  });
});

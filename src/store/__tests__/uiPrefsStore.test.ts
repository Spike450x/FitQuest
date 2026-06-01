import { describe, it, expect, beforeEach } from 'vitest';
import { useUiPrefsStore } from '@/store/uiPrefsStore';
import { DEFAULT_PINNED_ACTIONS, MAX_PINNED_ACTIONS, MIN_PINNED_ACTIONS } from '@/lib/quickActions';

function reset() {
  useUiPrefsStore.setState({ pinnedActions: [...DEFAULT_PINNED_ACTIONS], collapsed: {} });
}

describe('uiPrefsStore — pinned actions', () => {
  beforeEach(reset);

  it('starts with the default pins', () => {
    expect(useUiPrefsStore.getState().pinnedActions).toEqual(DEFAULT_PINNED_ACTIONS);
  });

  it('unpins an existing action', () => {
    useUiPrefsStore.getState().togglePinnedAction('shop');
    expect(useUiPrefsStore.getState().pinnedActions).not.toContain('shop');
  });

  it('pins a new action at the end', () => {
    useUiPrefsStore.getState().togglePinnedAction('stats');
    const { pinnedActions } = useUiPrefsStore.getState();
    expect(pinnedActions[pinnedActions.length - 1]).toBe('stats');
  });

  it('refuses to drop below the minimum', () => {
    useUiPrefsStore.setState({ pinnedActions: ['log', 'combat'] });
    useUiPrefsStore.getState().togglePinnedAction('combat');
    expect(useUiPrefsStore.getState().pinnedActions).toEqual(['log', 'combat']);
    expect(useUiPrefsStore.getState().pinnedActions.length).toBe(MIN_PINNED_ACTIONS);
  });

  it('refuses to exceed the maximum', () => {
    const full = ['log', 'combat', 'quests', 'shop', 'wanted', 'inventory'];
    expect(full.length).toBe(MAX_PINNED_ACTIONS);
    useUiPrefsStore.setState({ pinnedActions: full });
    useUiPrefsStore.getState().togglePinnedAction('stats');
    expect(useUiPrefsStore.getState().pinnedActions).toEqual(full);
  });

  it('resets to defaults', () => {
    useUiPrefsStore.setState({ pinnedActions: ['stats', 'calendar'] });
    useUiPrefsStore.getState().resetPinnedActions();
    expect(useUiPrefsStore.getState().pinnedActions).toEqual(DEFAULT_PINNED_ACTIONS);
  });
});

describe('uiPrefsStore — collapsed sections', () => {
  beforeEach(reset);

  it('toggles a section id', () => {
    useUiPrefsStore.getState().toggleCollapsed('dash-stats');
    expect(useUiPrefsStore.getState().collapsed['dash-stats']).toBe(true);
    useUiPrefsStore.getState().toggleCollapsed('dash-stats');
    expect(useUiPrefsStore.getState().collapsed['dash-stats']).toBe(false);
  });

  it('sets an explicit value', () => {
    useUiPrefsStore.getState().setCollapsed('char-records', true);
    expect(useUiPrefsStore.getState().collapsed['char-records']).toBe(true);
  });
});

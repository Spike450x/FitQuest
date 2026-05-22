import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));

const mockUnsubscribe = vi.fn();
vi.mock('@/lib/activityData', () => ({
  subscribeToRecentActivity: vi.fn(() => mockUnsubscribe),
}));

import { subscribeToRecentActivity } from '@/lib/activityData';
import { useActivityStore } from '@/store/activityStore';

const subscribeToRecentActivityMock = vi.mocked(subscribeToRecentActivity);

beforeEach(() => {
  // Reset state directly so we don't call the mock unsubscribe during setup,
  // which would corrupt call counts for the test body.
  useActivityStore.setState({ recentLogs: [], loading: true, _uid: null, _unsubscribe: null });
  vi.clearAllMocks();
  mockUnsubscribe.mockImplementation(() => undefined);
});

describe('activityStore.subscribe', () => {
  it('starts a Firestore subscription on first call', () => {
    useActivityStore.getState().subscribe('uid1');
    expect(subscribeToRecentActivityMock).toHaveBeenCalledTimes(1);
    expect(subscribeToRecentActivityMock).toHaveBeenCalledWith(
      'uid1',
      5,
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('is idempotent — calling with the same uid does not create a new subscription', () => {
    useActivityStore.getState().subscribe('uid1');
    useActivityStore.getState().subscribe('uid1');
    useActivityStore.getState().subscribe('uid1');
    expect(subscribeToRecentActivityMock).toHaveBeenCalledTimes(1);
  });

  it('tears down the old subscription before creating a new one when uid changes', () => {
    useActivityStore.getState().subscribe('uid1');
    useActivityStore.getState().subscribe('uid2');
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(subscribeToRecentActivityMock).toHaveBeenCalledTimes(2);
    expect(useActivityStore.getState()._uid).toBe('uid2');
  });

  it('sets loading: true immediately, then resolves when the snapshot fires', () => {
    let onNext: ((logs: []) => void) | null = null;
    subscribeToRecentActivityMock.mockImplementation((_uid, _count, next) => {
      onNext = next;
      return mockUnsubscribe;
    });

    useActivityStore.getState().subscribe('uid1');
    expect(useActivityStore.getState().loading).toBe(true);

    onNext!([]);
    expect(useActivityStore.getState().loading).toBe(false);
    expect(useActivityStore.getState().recentLogs).toEqual([]);
  });
});

describe('activityStore.unsubscribe', () => {
  it('calls the Firestore unsubscribe and clears internal uid', () => {
    useActivityStore.getState().subscribe('uid1');
    useActivityStore.getState().unsubscribe();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(useActivityStore.getState()._uid).toBeNull();
  });
});

describe('activityStore.clear', () => {
  it('calls the Firestore unsubscribe', () => {
    useActivityStore.getState().subscribe('uid1');
    useActivityStore.getState().clear();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('resets all state to initial values', () => {
    useActivityStore.getState().subscribe('uid1');
    useActivityStore.getState().clear();
    const state = useActivityStore.getState();
    expect(state.recentLogs).toEqual([]);
    expect(state.loading).toBe(true);
    expect(state._uid).toBeNull();
    expect(state._unsubscribe).toBeNull();
  });

  it('allows re-subscribing after clear', () => {
    useActivityStore.getState().subscribe('uid1');
    useActivityStore.getState().clear();
    useActivityStore.getState().subscribe('uid1');
    expect(subscribeToRecentActivityMock).toHaveBeenCalledTimes(2);
  });
});

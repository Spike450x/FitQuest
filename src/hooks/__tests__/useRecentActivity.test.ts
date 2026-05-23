// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
vi.mock('@/lib/activityData', () => ({ subscribeToRecentActivity: vi.fn(() => () => undefined) }));

import { useActivityStore } from '@/store/activityStore';
import { useRecentActivity } from '../useRecentActivity';
import type { ActivityLog } from '@/types';

beforeEach(() => {
  useActivityStore.setState({
    recentLogs: [],
    loading: true,
    _uid: null,
    _unsubscribe: null,
  });
});

describe('useRecentActivity', () => {
  it('returns the store logs and loading flag', () => {
    const logs = [{ id: 'a1' } as ActivityLog];
    useActivityStore.setState({ recentLogs: logs, loading: false });
    const { result } = renderHook(() => useRecentActivity());
    expect(result.current.logs).toEqual(logs);
    expect(result.current.loading).toBe(false);
  });

  it('reflects loading: true while the subscription is pending', () => {
    useActivityStore.setState({ recentLogs: [], loading: true });
    const { result } = renderHook(() => useRecentActivity());
    expect(result.current.loading).toBe(true);
    expect(result.current.logs).toEqual([]);
  });

  it('returns the same reference when called repeatedly with no state change', () => {
    const logs = [{ id: 'a1' } as ActivityLog];
    useActivityStore.setState({ recentLogs: logs, loading: false });
    const { result, rerender } = renderHook(() => useRecentActivity());
    const first = result.current.logs;
    rerender();
    expect(result.current.logs).toBe(first);
  });
});

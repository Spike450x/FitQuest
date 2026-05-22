// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTodayKey } from '../useTodayKey';

afterEach(() => {
  vi.useRealTimers();
});

describe('useTodayKey', () => {
  it('returns a YYYY-MM-DD string matching today', () => {
    const { result } = renderHook(() => useTodayKey());
    expect(result.current).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current).toBe(new Date().toISOString().slice(0, 10));
  });

  it('updates when the tab becomes visible on a new day', () => {
    vi.useFakeTimers();
    // Pin today to 2026-01-01
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));

    const { result } = renderHook(() => useTodayKey());
    expect(result.current).toBe('2026-01-01');

    // Advance to the next day
    vi.setSystemTime(new Date('2026-01-02T00:01:00Z'));

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current).toBe('2026-01-02');
  });

  it('does NOT update on visibilitychange when still the same day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T08:00:00Z'));

    const { result } = renderHook(() => useTodayKey());
    const initial = result.current;

    vi.setSystemTime(new Date('2026-01-01T20:00:00Z'));

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current).toBe(initial);
  });

  it('advances automatically at UTC midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T23:59:59Z'));

    const { result } = renderHook(() => useTodayKey());
    expect(result.current).toBe('2026-01-01');

    act(() => {
      vi.setSystemTime(new Date('2026-01-02T00:00:01Z'));
      vi.runAllTimers();
    });

    expect(result.current).toBe('2026-01-02');
  });
});

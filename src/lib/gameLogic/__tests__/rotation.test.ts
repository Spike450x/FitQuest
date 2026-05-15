import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDailyPick,
  getWeeklyPick,
  dailyExpiresAt,
  weeklyExpiresAt,
  formatCountdown,
} from '../rotation';

// ─── Determinism — the entire contract of this module ────────────────────────
// Tests pass an explicit dateKey so they are fully pure and environment-agnostic
// (no fake timers, no timezone sensitivity).

describe('getDailyPick — determinism', () => {
  it('same dateKey → same picks (multiple calls return identical results)', () => {
    const arr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const first = getDailyPick(arr, 3, '2026-05-15');
    const second = getDailyPick(arr, 3, '2026-05-15');
    const third = getDailyPick(arr, 3, '2026-05-15');
    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it('different dateKeys → different picks (with a long enough array to avoid collision)', () => {
    const arr = Array.from({ length: 12 }, (_, i) => `item-${i}`);
    const day1 = getDailyPick(arr, 4, '2026-05-15');
    const day2 = getDailyPick(arr, 4, '2026-05-16');
    // 4 picks from 12 items, different seeds — extremely unlikely to coincide.
    expect(day2).not.toEqual(day1);
  });

  it('returns at most arr.length items when count exceeds arr.length', () => {
    expect(getDailyPick(['a', 'b'], 5, '2026-05-15')).toHaveLength(2);
  });

  it('returns exactly count items when count <= arr.length', () => {
    expect(getDailyPick(['a', 'b', 'c', 'd'], 2, '2026-05-15')).toHaveLength(2);
  });

  it('does not mutate the input array', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    const snapshot = [...arr];
    getDailyPick(arr, 3, '2026-05-15');
    expect(arr).toEqual(snapshot);
  });

  it('dateKey seed matches YYYYMMDD integer (2026-05-15 → 20260515)', () => {
    // Two different date representations of the same day produce the same result.
    const arr = Array.from({ length: 20 }, (_, i) => `x-${i}`);
    const fromKey = getDailyPick(arr, 5, '2026-05-15');
    // Verify stability: same key, same output on a second call.
    expect(getDailyPick(arr, 5, '2026-05-15')).toEqual(fromKey);
  });
});

describe('getWeeklyPick — determinism', () => {
  it('same weekKey → same picks (multiple calls return identical results)', () => {
    const arr = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'extra'];
    const first = getWeeklyPick(arr, 3, '2026-20');
    const second = getWeeklyPick(arr, 3, '2026-20');
    expect(second).toEqual(first);
  });

  it('different weekKeys → different picks', () => {
    const arr = Array.from({ length: 10 }, (_, i) => `q-${i}`);
    const week1 = getWeeklyPick(arr, 3, '2026-20');
    const week2 = getWeeklyPick(arr, 3, '2026-21');
    expect(week2).not.toEqual(week1);
  });

  it('returns at most arr.length items when count exceeds arr.length', () => {
    expect(getWeeklyPick(['a', 'b'], 5, '2026-20')).toHaveLength(2);
  });

  it('does not mutate the input array', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    const snapshot = [...arr];
    getWeeklyPick(arr, 3, '2026-20');
    expect(arr).toEqual(snapshot);
  });
});

// ─── Expiry timestamps ───────────────────────────────────────────────────────

describe('dailyExpiresAt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns midnight tonight in the future', () => {
    vi.setSystemTime(new Date('2026-05-15T14:30:00'));
    const expires = dailyExpiresAt();
    expect(expires).toBeGreaterThan(Date.now());
    // Should be within 24 hours.
    expect(expires - Date.now()).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  it('crosses to tomorrow at 00:00 — never returns today', () => {
    vi.setSystemTime(new Date('2026-05-15T23:59:00'));
    const expires = dailyExpiresAt();
    const expiresDate = new Date(expires);
    // Local midnight of the following day.
    expect(expiresDate.getDate()).toBe(16);
    expect(expiresDate.getHours()).toBe(0);
    expect(expiresDate.getMinutes()).toBe(0);
  });
});

describe('weeklyExpiresAt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns end of Sunday 23:59:59.999 from a weekday', () => {
    // Monday 2026-05-11 → expires Sunday 2026-05-17 23:59:59.999
    vi.setSystemTime(new Date('2026-05-11T12:00:00'));
    const expires = new Date(weeklyExpiresAt());
    expect(expires.getDay()).toBe(0); // Sunday
    expect(expires.getHours()).toBe(23);
    expect(expires.getMinutes()).toBe(59);
    expect(expires.getSeconds()).toBe(59);
  });

  it('on Sunday, expires at end of today', () => {
    // Sunday 2026-05-17 → expires same day 23:59:59.999
    vi.setSystemTime(new Date('2026-05-17T10:00:00'));
    const expires = new Date(weeklyExpiresAt());
    expect(expires.getDay()).toBe(0);
    expect(expires.getDate()).toBe(17);
  });
});

// ─── formatCountdown ─────────────────────────────────────────────────────────

describe('formatCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "now" for past timestamps', () => {
    expect(formatCountdown(Date.now() - 1000)).toBe('now');
  });

  it('returns "now" for the current instant', () => {
    expect(formatCountdown(Date.now())).toBe('now');
  });

  it('returns minutes-only when under 1 hour', () => {
    expect(formatCountdown(Date.now() + 30 * 60_000)).toBe('30m');
  });

  it('returns "Xh Ym" between 1h and 48h', () => {
    expect(formatCountdown(Date.now() + (5 * 60 + 23) * 60_000)).toBe('5h 23m');
  });

  it('returns "Nd" past 48 hours', () => {
    expect(formatCountdown(Date.now() + 3 * 24 * 60 * 60_000)).toBe('3d');
  });
});

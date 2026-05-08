import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDailyPick,
  getWeeklyPick,
  dailyExpiresAt,
  weeklyExpiresAt,
  formatCountdown,
} from '../rotation';

// ─── Determinism — the entire contract of this module ────────────────────────

describe('getDailyPick — determinism', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('same day → same picks (multiple calls return identical results)', () => {
    vi.setSystemTime(new Date('2026-05-15T08:00:00'));
    const arr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const first = getDailyPick(arr, 3);
    const second = getDailyPick(arr, 3);
    const third = getDailyPick(arr, 3);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it('same day, different times → same picks (seed is YYYYMMDD only)', () => {
    const arr = Array.from({ length: 12 }, (_, i) => `item-${i}`);

    vi.setSystemTime(new Date('2026-05-15T00:01:00'));
    const earlyMorning = getDailyPick(arr, 4);

    vi.setSystemTime(new Date('2026-05-15T23:59:00'));
    const lateNight = getDailyPick(arr, 4);

    expect(lateNight).toEqual(earlyMorning);
  });

  it('different days → different picks (with a long enough array to avoid collision)', () => {
    const arr = Array.from({ length: 12 }, (_, i) => `item-${i}`);

    vi.setSystemTime(new Date('2026-05-15T12:00:00'));
    const day1 = getDailyPick(arr, 4);

    vi.setSystemTime(new Date('2026-05-16T12:00:00'));
    const day2 = getDailyPick(arr, 4);

    // 4 picks from 12 items, different seeds — extremely unlikely to coincide.
    expect(day2).not.toEqual(day1);
  });

  it('returns at most arr.length items when count exceeds arr.length', () => {
    vi.setSystemTime(new Date('2026-05-15T12:00:00'));
    expect(getDailyPick(['a', 'b'], 5)).toHaveLength(2);
  });

  it('returns exactly count items when count <= arr.length', () => {
    vi.setSystemTime(new Date('2026-05-15T12:00:00'));
    expect(getDailyPick(['a', 'b', 'c', 'd'], 2)).toHaveLength(2);
  });

  it('does not mutate the input array', () => {
    vi.setSystemTime(new Date('2026-05-15T12:00:00'));
    const arr = ['a', 'b', 'c', 'd', 'e'];
    const snapshot = [...arr];
    getDailyPick(arr, 3);
    expect(arr).toEqual(snapshot);
  });
});

describe('getWeeklyPick — determinism', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('same week → same picks', () => {
    const arr = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'extra'];

    // Both Monday and Friday of the same ISO week.
    vi.setSystemTime(new Date('2026-05-11T12:00:00')); // Monday
    const mon = getWeeklyPick(arr, 3);

    vi.setSystemTime(new Date('2026-05-15T12:00:00')); // Friday, same week
    const fri = getWeeklyPick(arr, 3);

    expect(fri).toEqual(mon);
  });

  it('different weeks → different picks', () => {
    const arr = Array.from({ length: 10 }, (_, i) => `q-${i}`);

    vi.setSystemTime(new Date('2026-05-11T12:00:00')); // ISO week N
    const week1 = getWeeklyPick(arr, 3);

    vi.setSystemTime(new Date('2026-05-18T12:00:00')); // ISO week N+1
    const week2 = getWeeklyPick(arr, 3);

    expect(week2).not.toEqual(week1);
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

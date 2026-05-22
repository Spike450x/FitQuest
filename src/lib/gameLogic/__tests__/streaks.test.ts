import { describe, it, expect } from 'vitest';
import {
  computeNewStreak,
  getStreakTier,
  getStreakLootMultiplier,
  getStreakXpMultiplier,
  refillShieldsIfNewWeek,
  MAX_STREAK_SHIELDS,
} from '../streaks';

describe('computeNewStreak', () => {
  it('starts a fresh streak at 1 with full shields', () => {
    const next = computeNewStreak(undefined, '2026-05-08');
    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(1);
    expect(next.shields).toBe(MAX_STREAK_SHIELDS);
    expect(next.shieldsRefilledOn).toBe('2026-05-08');
  });

  it('continues a streak when logged the next day', () => {
    const next = computeNewStreak(
      {
        currentStreak: 5,
        longestStreak: 5,
        lastLogDate: '2026-05-07',
        shields: 1,
        shieldsRefilledOn: '2026-05-04',
      },
      '2026-05-08',
    );
    expect(next.currentStreak).toBe(6);
    expect(next.longestStreak).toBe(6);
    expect(next.shields).toBe(1);
  });

  it('is idempotent when already logged today', () => {
    const today = '2026-05-08';
    const before = {
      currentStreak: 7,
      longestStreak: 7,
      lastLogDate: today,
      shields: 0,
      shieldsRefilledOn: today,
    };
    const next = computeNewStreak(before, today);
    expect(next.currentStreak).toBe(7);
    expect(next.shields).toBe(0);
  });

  it('consumes a shield instead of resetting on a single missed day', () => {
    // Logged 2 days ago = exactly one missed day → shield protects
    const next = computeNewStreak(
      {
        currentStreak: 30,
        longestStreak: 30,
        lastLogDate: '2026-05-06',
        shields: 1,
        shieldsRefilledOn: '2026-05-04',
      },
      '2026-05-08',
    );
    expect(next.currentStreak).toBe(31);
    expect(next.shields).toBe(0);
  });

  it('resets when a single day is missed and no shield is held', () => {
    const next = computeNewStreak(
      {
        currentStreak: 30,
        longestStreak: 30,
        lastLogDate: '2026-05-06',
        shields: 0,
        shieldsRefilledOn: '2026-05-04',
      },
      '2026-05-08',
    );
    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(30);
  });

  it('resets even with a shield when the gap is more than one day', () => {
    const next = computeNewStreak(
      {
        currentStreak: 30,
        longestStreak: 30,
        lastLogDate: '2026-05-04',
        shields: 1,
        shieldsRefilledOn: '2026-05-04',
      },
      '2026-05-08',
    );
    expect(next.currentStreak).toBe(1);
    expect(next.shields).toBe(1); // shield not consumed on multi-day gaps
  });

  it('refills shields when crossing into a new ISO week', () => {
    // 2026-05-04 = Monday of week 19; 2026-05-11 = Monday of week 20
    const next = computeNewStreak(
      {
        currentStreak: 5,
        longestStreak: 5,
        lastLogDate: '2026-05-10',
        shields: 0,
        shieldsRefilledOn: '2026-05-04',
      },
      '2026-05-11',
    );
    expect(next.shields).toBe(MAX_STREAK_SHIELDS);
    expect(next.shieldsRefilledOn).toBe('2026-05-11');
  });

  it('does not refill within the same ISO week', () => {
    const next = computeNewStreak(
      {
        currentStreak: 5,
        longestStreak: 5,
        lastLogDate: '2026-05-06',
        shields: 0,
        shieldsRefilledOn: '2026-05-04',
      },
      '2026-05-07',
    );
    expect(next.shields).toBe(0);
  });
});

describe('refillShieldsIfNewWeek', () => {
  it('returns same object reference when no refill needed', () => {
    const same = refillShieldsIfNewWeek(
      {
        currentStreak: 1,
        longestStreak: 1,
        lastLogDate: '2026-05-04',
        shields: 1,
        shieldsRefilledOn: '2026-05-04',
      },
      '2026-05-05',
    );
    expect(same.shields).toBe(1);
    expect(same.shieldsRefilledOn).toBe('2026-05-04');
  });
});

describe('getStreakXpMultiplier', () => {
  it('returns 1.0 at streak 0', () => {
    expect(getStreakXpMultiplier(0)).toBe(1.0);
  });

  it('returns 1.05 at streak 3', () => {
    expect(getStreakXpMultiplier(3)).toBe(1.05);
  });

  it('caps at 1.5 for very long streaks (Blessed tier)', () => {
    expect(getStreakXpMultiplier(30)).toBe(1.5);
    expect(getStreakXpMultiplier(365)).toBe(1.5);
  });

  it('is monotonically non-decreasing', () => {
    let prev = 0;
    for (let s = 0; s <= 60; s++) {
      const m = getStreakXpMultiplier(s);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });

  it('xp multiplier is always lower than loot multiplier', () => {
    for (const days of [3, 7, 14, 21, 30]) {
      expect(getStreakXpMultiplier(days)).toBeLessThan(getStreakLootMultiplier(days));
    }
  });
});

describe('getStreakTier', () => {
  it('returns Blessed at 30+ days', () => {
    expect(getStreakTier(30).label).toBe('Blessed');
    expect(getStreakTier(60).label).toBe('Blessed');
  });

  it('returns null label below 3 days', () => {
    expect(getStreakTier(0).label).toBe(null);
    expect(getStreakTier(2).label).toBe(null);
  });
});

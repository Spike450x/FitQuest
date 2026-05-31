import { describe, it, expect } from 'vitest';
import { localDayKey, monthMatrix, weekDays, groupLogsByDay } from '../calendar';
import type { ActivityLog } from '@/types';

function makeLog(loggedAt: number, type: ActivityLog['type'] = 'workout'): ActivityLog {
  return {
    id: `log-${loggedAt}`,
    uid: 'u1',
    type,
    data: { amount: 10 },
    statGains: {},
    xpGained: 5,
    loggedAt,
    rewardEligible: true,
  };
}

describe('localDayKey', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    const d = new Date(2026, 0, 5, 14, 30); // 5 Jan 2026, local
    expect(localDayKey(d)).toBe('2026-01-05');
    expect(localDayKey(d.getTime())).toBe('2026-01-05');
  });

  it('zero-pads month and day', () => {
    expect(localDayKey(new Date(2026, 8, 9))).toBe('2026-09-09');
  });
});

describe('monthMatrix', () => {
  it('returns full Sunday→Saturday weeks', () => {
    const weeks = monthMatrix(2026, 4); // May 2026
    for (const week of weeks) {
      expect(week).toHaveLength(7);
      expect(week[0].getDay()).toBe(0); // Sunday
      expect(week[6].getDay()).toBe(6); // Saturday
    }
  });

  it('pads the leading days from the previous month', () => {
    // May 2026: the 1st is a Friday, so the first row starts on Sun Apr 26.
    const weeks = monthMatrix(2026, 4);
    const first = weeks[0][0];
    expect(localDayKey(first)).toBe('2026-04-26');
  });

  it('covers the last day of the month', () => {
    const weeks = monthMatrix(2026, 1); // Feb 2026 (28 days)
    const flat = weeks.flat();
    expect(flat.some((d) => localDayKey(d) === '2026-02-28')).toBe(true);
  });

  it('spans 6 rows for a 31-day month starting on Saturday', () => {
    // Aug 2026: the 1st is a Saturday → needs 6 rows.
    const weeks = monthMatrix(2026, 7);
    expect(weeks).toHaveLength(6);
  });

  it('handles a leap-year February', () => {
    const weeks = monthMatrix(2028, 1); // Feb 2028, leap year
    const flat = weeks.flat();
    expect(flat.some((d) => localDayKey(d) === '2028-02-29')).toBe(true);
  });
});

describe('weekDays', () => {
  it('returns 7 days from Sunday to Saturday', () => {
    const days = weekDays(new Date(2026, 4, 13)); // Wed 13 May 2026
    expect(days).toHaveLength(7);
    expect(localDayKey(days[0])).toBe('2026-05-10'); // Sunday
    expect(localDayKey(days[6])).toBe('2026-05-16'); // Saturday
  });

  it('returns the same week for any day within it', () => {
    const a = weekDays(new Date(2026, 4, 10)); // Sunday
    const b = weekDays(new Date(2026, 4, 16)); // Saturday
    expect(localDayKey(a[0])).toBe(localDayKey(b[0]));
  });
});

describe('groupLogsByDay', () => {
  it('buckets logs by their local day key', () => {
    const t1 = new Date(2026, 4, 10, 8, 0).getTime();
    const t2 = new Date(2026, 4, 10, 20, 0).getTime();
    const t3 = new Date(2026, 4, 11, 6, 0).getTime();
    const grouped = groupLogsByDay([makeLog(t1), makeLog(t2, 'run'), makeLog(t3)]);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped['2026-05-10']).toHaveLength(2);
    expect(grouped['2026-05-11']).toHaveLength(1);
  });

  it('returns an empty map for no logs', () => {
    expect(groupLogsByDay([])).toEqual({});
  });
});

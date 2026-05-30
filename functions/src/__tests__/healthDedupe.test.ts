import { describe, it, expect } from 'vitest';
import {
  computeDailyDelta,
  dailyDeltaDedupeKey,
  dailySnapshotId,
  eventDedupeKey,
  utcDayKey,
} from '../gameLogic/healthDedupe';

describe('computeDailyDelta', () => {
  it('returns the full value on first ingest', () => {
    expect(computeDailyDelta(0, 5000)).toBe(5000);
  });

  it('returns only the growth between redeliveries', () => {
    expect(computeDailyDelta(5000, 8000)).toBe(3000);
  });

  it('returns 0 when the cumulative total is unchanged (redelivery)', () => {
    expect(computeDailyDelta(8000, 8000)).toBe(0);
  });

  it('never returns a negative delta when a provider corrects downward', () => {
    expect(computeDailyDelta(8000, 7500)).toBe(0);
  });

  it('treats a non-finite last value as zero', () => {
    expect(computeDailyDelta(NaN, 1000)).toBe(1000);
  });

  it('summed deltas across a day equal the final cumulative total', () => {
    const reports = [3000, 7000, 7000, 12000];
    let last = 0;
    let summed = 0;
    for (const r of reports) {
      summed += computeDailyDelta(last, r);
      last = Math.max(last, r);
    }
    expect(summed).toBe(12000);
  });
});

describe('dedupe keys', () => {
  it('derives a stable event key from a provider summary id', () => {
    expect(eventDedupeKey('abc-123')).toBe('terra_abc-123');
  });

  it('sanitizes unsafe characters out of ids', () => {
    expect(eventDedupeKey('a/b#c.d')).toBe('terra_a_b_c_d');
  });

  it('keys daily deltas by the new cumulative value so growth makes a fresh id', () => {
    expect(dailyDeltaDedupeKey('steps', '2026-05-30', 7000)).toBe('terra_steps_2026-05-30_7000');
    expect(dailyDeltaDedupeKey('steps', '2026-05-30', 12000)).toBe('terra_steps_2026-05-30_12000');
  });

  it('builds a per-user/provider/day/metric snapshot id', () => {
    expect(dailySnapshotId('u1', 'GARMIN', '2026-05-30', 'steps')).toBe(
      'u1_GARMIN_2026-05-30_steps',
    );
  });

  it('computes the UTC day key for a timestamp', () => {
    expect(utcDayKey(Date.parse('2026-05-30T23:59:00Z'))).toBe('2026-05-30');
  });
});

import { describe, it, expect } from 'vitest';
import { utcDayStartMs } from '../gameLogic/streaks';

describe('utcDayStartMs', () => {
  it('returns UTC midnight for a date in the middle of the day', () => {
    const noon = new Date('2026-05-22T12:34:56.789Z');
    expect(utcDayStartMs(noon)).toBe(new Date('2026-05-22T00:00:00.000Z').getTime());
  });

  it('returns UTC midnight for a date already at midnight', () => {
    const midnight = new Date('2026-05-22T00:00:00.000Z');
    expect(utcDayStartMs(midnight)).toBe(midnight.getTime());
  });

  it('correctly rolls over at the UTC boundary — 23:59:59 and 00:00:00 are different days', () => {
    const beforeMidnight = new Date('2026-05-22T23:59:59.999Z');
    const afterMidnight = new Date('2026-05-23T00:00:00.000Z');
    const startOfMay22 = new Date('2026-05-22T00:00:00.000Z').getTime();
    const startOfMay23 = new Date('2026-05-23T00:00:00.000Z').getTime();
    expect(utcDayStartMs(beforeMidnight)).toBe(startOfMay22);
    expect(utcDayStartMs(afterMidnight)).toBe(startOfMay23);
  });

  it('does not mutate the input date', () => {
    const input = new Date('2026-05-22T15:00:00.000Z');
    const originalTime = input.getTime();
    utcDayStartMs(input);
    expect(input.getTime()).toBe(originalTime);
  });
});

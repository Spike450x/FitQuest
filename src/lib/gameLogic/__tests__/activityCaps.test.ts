import { describe, it, expect } from 'vitest';
import {
  eligibleAmountForRewards,
  remainingCapacityForActivity,
  dailyCapUsageFraction,
  DAILY_ACTIVITY_CAPS,
} from '../activityCaps';

describe('eligibleAmountForRewards', () => {
  it('returns full amount when far below cap', () => {
    expect(eligibleAmountForRewards('workout', 0, 30)).toBe(30);
  });

  it('returns partial amount when crossing the cap', () => {
    const cap = DAILY_ACTIVITY_CAPS.workout; // 120
    expect(eligibleAmountForRewards('workout', cap - 10, 30)).toBe(10);
  });

  it('returns 0 when already at cap', () => {
    expect(eligibleAmountForRewards('workout', DAILY_ACTIVITY_CAPS.workout, 30)).toBe(0);
  });

  it('returns 0 when over cap', () => {
    expect(eligibleAmountForRewards('workout', DAILY_ACTIVITY_CAPS.workout + 50, 30)).toBe(0);
  });

  it('respects per-activity cap differences', () => {
    expect(eligibleAmountForRewards('run', 0, 100)).toBe(DAILY_ACTIVITY_CAPS.run);
    expect(eligibleAmountForRewards('water', 0, 100)).toBe(DAILY_ACTIVITY_CAPS.water);
  });
});

describe('remainingCapacityForActivity', () => {
  it('returns full cap when nothing logged today', () => {
    expect(remainingCapacityForActivity('workout', 0)).toBe(DAILY_ACTIVITY_CAPS.workout);
    expect(remainingCapacityForActivity('run', 0)).toBe(DAILY_ACTIVITY_CAPS.run);
  });

  it('subtracts what is already logged', () => {
    expect(remainingCapacityForActivity('workout', 50)).toBe(70);
    expect(remainingCapacityForActivity('steps', 12_000)).toBe(18_000);
  });

  it('clamps at 0 when over the cap', () => {
    expect(remainingCapacityForActivity('workout', DAILY_ACTIVITY_CAPS.workout)).toBe(0);
    expect(remainingCapacityForActivity('water', 50)).toBe(0);
  });
});

describe('dailyCapUsageFraction', () => {
  it('returns 0 at start of day', () => {
    expect(dailyCapUsageFraction('workout', 0)).toBe(0);
  });

  it('returns the linear fraction below cap', () => {
    expect(dailyCapUsageFraction('workout', 60)).toBeCloseTo(0.5, 5);
    expect(dailyCapUsageFraction('steps', 15_000)).toBeCloseTo(0.5, 5);
  });

  it('clamps to 1 when at or over cap', () => {
    expect(dailyCapUsageFraction('workout', DAILY_ACTIVITY_CAPS.workout)).toBe(1);
    expect(dailyCapUsageFraction('water', 50)).toBe(1);
  });

  it('clamps to 0 for negative inputs', () => {
    expect(dailyCapUsageFraction('workout', -10)).toBe(0);
  });
});

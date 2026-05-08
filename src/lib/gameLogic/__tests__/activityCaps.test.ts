import { describe, it, expect } from 'vitest';
import { eligibleAmountForRewards, DAILY_ACTIVITY_CAPS } from '../activityCaps';

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

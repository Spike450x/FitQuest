import { describe, it, expect } from 'vitest';
import { calculateResourceRestore } from '../stats';
import {
  ACTIVITY_DEFINITIONS,
  MASTERY_ACTIVITIES,
  RESTORE_ACTIVITIES,
  MASTERY_CONFIG,
  RESTORE,
} from '../constants';
import {
  DAILY_ACTIVITY_CAPS,
  eligibleAmountForRewards,
  remainingCapacityForActivity,
} from '../activityCaps';

// ─── Activity registration ────────────────────────────────────────────────────

describe('Meditation activity registration', () => {
  it('appears in ACTIVITY_DEFINITIONS with minutes unit', () => {
    expect(ACTIVITY_DEFINITIONS.meditation).toEqual(
      expect.objectContaining({ label: 'Meditation', unit: 'minutes' }),
    );
  });

  it('is in both MASTERY_ACTIVITIES and RESTORE_ACTIVITIES', () => {
    // Meditation is the first activity to belong to both sets — builds Spirit
    // AND restores Magic on the same log. The Cloud Function and form must
    // handle both effects in the same submission.
    expect(MASTERY_ACTIVITIES.has('meditation')).toBe(true);
    expect(RESTORE_ACTIVITIES.has('meditation')).toBe(true);
  });

  it('maps to the Spirit stat via MASTERY_CONFIG', () => {
    expect(MASTERY_CONFIG.meditation).toEqual({
      linkedStat: 'spirit',
      linkedStatLabel: 'Spirit',
    });
  });
});

// ─── Daily caps ───────────────────────────────────────────────────────────────

describe('Meditation daily caps', () => {
  it('caps at 60 minutes per day', () => {
    expect(DAILY_ACTIVITY_CAPS.meditation).toBe(60);
  });

  it('returns full eligibility under the cap', () => {
    expect(eligibleAmountForRewards('meditation', 0, 30)).toBe(30);
    expect(eligibleAmountForRewards('meditation', 30, 20)).toBe(20);
  });

  it('clips to remaining capacity once the cap nears', () => {
    expect(eligibleAmountForRewards('meditation', 45, 30)).toBe(15);
    expect(eligibleAmountForRewards('meditation', 60, 30)).toBe(0);
    expect(eligibleAmountForRewards('meditation', 70, 30)).toBe(0);
  });

  it('reports remaining capacity correctly for the meter', () => {
    expect(remainingCapacityForActivity('meditation', 0)).toBe(60);
    expect(remainingCapacityForActivity('meditation', 25)).toBe(35);
    expect(remainingCapacityForActivity('meditation', 60)).toBe(0);
    expect(remainingCapacityForActivity('meditation', 90)).toBe(0);
  });
});

// ─── Magic restore ────────────────────────────────────────────────────────────

describe('Meditation magic restore', () => {
  it('restores 0.2 magic per minute', () => {
    expect(RESTORE.MAGIC_PER_MEDITATION_MINUTE).toBe(0.2);
  });

  it('yields +6 magic for a 30-minute session', () => {
    expect(calculateResourceRestore('meditation', 30)).toEqual({
      resourceType: 'magic',
      amount: 6,
    });
  });

  it('floors fractional minutes (8 minutes → +1 magic)', () => {
    expect(calculateResourceRestore('meditation', 8)).toEqual({
      resourceType: 'magic',
      amount: Math.floor(8 * 0.2),
    });
  });

  it('caps at the daily 60-minute eligibility → 12 magic max from one day of meditation', () => {
    // Even if a user logs 90 min in a single submission, only 60 min are
    // eligible (cap kicks in earlier sessions). 60 × 0.2 = 12 magic max.
    const eligible = eligibleAmountForRewards('meditation', 0, 90);
    expect(eligible).toBe(60);
    expect(calculateResourceRestore('meditation', eligible)).toEqual({
      resourceType: 'magic',
      amount: 12,
    });
  });
});

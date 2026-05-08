import type { ActivityType } from '@/types';

/**
 * Daily soft caps on activity *amount* eligible for XP, stat gains, mastery
 * counts, and quest progress. All activity is self-reported with no validation,
 * so caps remove the incentive to inflate logs to extreme values.
 *
 * Excess logging is still recorded in `activityLogs` for streak/PR purposes —
 * the user just stops earning rewards beyond the cap. This keeps honest power
 * users from feeling artificially blocked while neutering grinding-as-cheat.
 *
 * Thresholds chosen as the upper edge of plausible single-day output for an
 * extremely active player. Adjust here only — every consumer reads from this
 * module.
 */
export const DAILY_ACTIVITY_CAPS: Record<ActivityType, number> = {
  workout: 120, // minutes
  run: 20, // miles
  steps: 30000, // steps
  sleep: 12, // hours
  water: 16, // glasses
  nutrition: 6, // meals
};

/**
 * Returns the portion of `amount` that is still eligible for rewards given
 * `alreadyLoggedToday`. Capped at the per-activity daily limit.
 *
 * Examples (workout, cap 120):
 *   logged 0,   amount 60  → eligible 60  (under cap)
 *   logged 90,  amount 60  → eligible 30  (partial)
 *   logged 120, amount 30  → eligible 0   (over cap)
 */
export function eligibleAmountForRewards(
  activityType: ActivityType,
  alreadyLoggedToday: number,
  amount: number,
): number {
  const cap = DAILY_ACTIVITY_CAPS[activityType];
  if (cap === undefined) return amount;
  const remaining = Math.max(0, cap - alreadyLoggedToday);
  return Math.min(amount, remaining);
}

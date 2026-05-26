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
  meditation: 60, // minutes — low-impact volume; half of workout cap
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

/**
 * Returns the remaining daily-cap headroom for an activity given how much has
 * already been logged today. Display-only — the server still enforces the cap
 * at submit time via the `logActivity` Cloud Function.
 *
 *   logged 0   → remaining = cap
 *   logged cap → remaining = 0  (cap reached, further amount earns nothing)
 *   logged > cap → remaining = 0 (clamped)
 */
export function remainingCapacityForActivity(
  activityType: ActivityType,
  alreadyLoggedToday: number,
): number {
  const cap = DAILY_ACTIVITY_CAPS[activityType];
  if (cap === undefined) return 0;
  return Math.max(0, cap - alreadyLoggedToday);
}

/**
 * Returns `alreadyLoggedToday / cap` as a 0–1 fraction, clamped to [0, 1].
 * Useful for progress-bar widths and "X% of cap used" labels.
 */
export function dailyCapUsageFraction(
  activityType: ActivityType,
  alreadyLoggedToday: number,
): number {
  const cap = DAILY_ACTIVITY_CAPS[activityType];
  if (!cap) return 0;
  return Math.min(1, Math.max(0, alreadyLoggedToday / cap));
}

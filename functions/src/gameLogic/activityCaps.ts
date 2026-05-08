// Copied from src/lib/gameLogic/activityCaps.ts
// Keep in sync when caps change. No @/ path aliases — plain Node imports only.

export type ActivityType = 'workout' | 'run' | 'steps' | 'sleep' | 'water' | 'nutrition';

/**
 * Daily soft caps on activity *amount* eligible for XP, stat gains, mastery
 * counts, and quest progress. All activity is self-reported with no validation,
 * so caps remove the incentive to inflate logs to extreme values.
 *
 * Excess logging is still recorded for streak/PR purposes — the user just
 * stops earning rewards beyond the cap.
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
 * Returns the portion of `amount` still eligible for rewards given
 * `alreadyLoggedToday`. Capped at the per-activity daily limit.
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

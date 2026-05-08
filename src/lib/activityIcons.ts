import type { ActivityType } from '@/types';

/**
 * Single source of truth for activity-type emoji used across dashboard, stats,
 * personal records, and any future activity feed component.
 *
 * Keep this in sync with the activity types defined in `@/types`.
 */
export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  run: '🏃',
  workout: '🏋️',
  steps: '👟',
  sleep: '😴',
  water: '💧',
  nutrition: '🥗',
};

/** Fallback used when a string-keyed lookup misses (defensive). */
export const ACTIVITY_ICON_FALLBACK = '📋';

export function getActivityIcon(type: ActivityType | string): string {
  return (ACTIVITY_ICONS as Record<string, string>)[type] ?? ACTIVITY_ICON_FALLBACK;
}

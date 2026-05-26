import { createElement, type ReactNode } from 'react';
import type { ActivityType } from '@/types';
import {
  RunIcon,
  WorkoutIcon,
  StepsIcon,
  SleepIcon,
  WaterIcon,
  NutritionIcon,
  MeditationIcon,
} from '@/components/art/action-icons';

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
  meditation: '🧘',
};

/** Fallback used when a string-keyed lookup misses (defensive). */
export const ACTIVITY_ICON_FALLBACK = '📋';

export function getActivityIcon(type: ActivityType | string): string {
  return (ACTIVITY_ICONS as Record<string, string>)[type] ?? ACTIVITY_ICON_FALLBACK;
}

// ─── SVG icon variants ────────────────────────────────────────────────────────

type ActivityIconFC = React.FC<{ className?: string }>;

const ACTIVITY_SVG_MAP: Record<ActivityType, ActivityIconFC> = {
  run: RunIcon,
  workout: WorkoutIcon,
  steps: StepsIcon,
  sleep: SleepIcon,
  water: WaterIcon,
  nutrition: NutritionIcon,
  meditation: MeditationIcon,
};

/** Returns an SVG icon element for the given activity type. */
export function getActivityIconSvg(type: ActivityType | string, className?: string): ReactNode {
  const Icon = (ACTIVITY_SVG_MAP as Record<string, ActivityIconFC>)[type];
  if (!Icon) return createElement('span', { 'aria-hidden': true }, ACTIVITY_ICON_FALLBACK);
  return createElement(Icon, { className: className ?? 'w-5 h-5' });
}

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

/**
 * Canonical display order for activity types. Shared by the personal-records
 * grid and any other surface that iterates all activities, so the ordering is
 * consistent everywhere (and never silently drops `meditation`).
 */
export const ACTIVITY_ORDER: ActivityType[] = [
  'workout',
  'run',
  'steps',
  'sleep',
  'water',
  'nutrition',
  'meditation',
];

/**
 * Brand color per activity type. Single source of truth shared by the stats
 * charts and the activity calendar so the two surfaces never drift.
 */
export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  workout: '#6366f1',
  run: '#f97316',
  steps: '#10b981',
  sleep: '#8b5cf6',
  water: '#3b82f6',
  nutrition: '#22c55e',
  meditation: '#a78bfa',
};

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

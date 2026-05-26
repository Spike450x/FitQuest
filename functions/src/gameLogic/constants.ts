// Copied subset from src/lib/gameLogic/constants.ts
// Only mastery-related constants needed by the logActivity function.
// Keep in sync with the source when mastery config changes.

import type { ActivityType } from './activityCaps';

export type MasteryActivityType = 'run' | 'workout' | 'steps' | 'meditation';

export const MASTERY_ACTIVITIES = new Set<ActivityType>(['run', 'workout', 'steps', 'meditation']);

export const MASTERY_CONFIG: Record<
  MasteryActivityType,
  { linkedStat: 'agility' | 'strength' | 'wisdom' | 'spirit'; linkedStatLabel: string }
> = {
  run: { linkedStat: 'agility', linkedStatLabel: 'Agility' },
  workout: { linkedStat: 'strength', linkedStatLabel: 'Strength' },
  steps: { linkedStat: 'wisdom', linkedStatLabel: 'Wisdom' },
  meditation: { linkedStat: 'spirit', linkedStatLabel: 'Spirit' },
};

/** Flat cap for primary combat stats: Strength, Wisdom, Agility, Spirit. */
const PRIMARY_STAT_CAP = 50;

function maxStatForLevel(level: number): number {
  return level * 5 + 10;
}

/**
 * Returns the stat cap for a given stat key at the character's current level.
 * Accepts `string` rather than `keyof Stats` because this file has no access to
 * `@/types` — the functions package is isolated from the Next.js source tree.
 * The only caller passes hardcoded `MASTERY_CONFIG[type].linkedStat` values,
 * so the wider type is safe in practice.
 */
export function statCap(stat: string, level: number): number {
  if (stat === 'strength' || stat === 'wisdom' || stat === 'agility' || stat === 'spirit')
    return PRIMARY_STAT_CAP;
  return maxStatForLevel(level);
}

/** Returns true if this log count hits a mastery milestone (5, 15, 25, 35, …). */
export function isMasteryMilestone(count: number): boolean {
  return count === 5 || (count > 5 && (count - 5) % 10 === 0);
}

// ─── Resource Restore ─────────────────────────────────────────────────────────
// Copied from src/lib/gameLogic/constants.ts RESTORE object.
// Keep in sync when restore rates change.

export const RESTORE = {
  /** HP restored per healthy meal logged. */
  HP_PER_MEAL: 20,
  /** Stamina restored per hour of sleep. */
  STAMINA_PER_SLEEP_HOUR: 5,
  /** Magic restored per glass of water. */
  MAGIC_PER_WATER_GLASS: 5,
  /** Magic restored per minute of meditation. */
  MAGIC_PER_MEDITATION_MINUTE: 0.2,
} as const;

export const RESTORE_ACTIVITIES = new Set<ActivityType>([
  'nutrition',
  'sleep',
  'water',
  'meditation',
]);

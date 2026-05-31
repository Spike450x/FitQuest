// Provider-neutral shapes shared by every device-sync adapter (Garmin today;
// Terra/Fitbit/etc. could plug in later). Kept dependency-free so the per-
// provider mapping modules stay pure and unit-testable.

import { type ActivityType, ACTIVITY_AMOUNT_MAX } from './activityCaps';

export const METERS_PER_MILE = 1609.344;

/** A distance below this in a session reads as a non-distance workout. */
export const DISTANCE_SPORT_MIN_METERS = 400;

/**
 * dedupeMode tells the webhook how to make the write idempotent:
 *   'event' — a unique discrete session; idempotent on `sourceId`.
 *   'daily' — a cumulative daily counter (steps); the caller diffs against the
 *             last-ingested value before logging the positive delta.
 */
export interface MappedActivity {
  activityType: ActivityType;
  amount: number;
  unit: string;
  loggedAt: number;
  dedupeMode: 'event' | 'daily';
  sourceId: string;
}

export function clampAmount(activityType: ActivityType, amount: number): number {
  return Math.min(amount, ACTIVITY_AMOUNT_MAX[activityType]);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

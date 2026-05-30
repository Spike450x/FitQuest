// Pure de-duplication helpers for synced health data.
//
// Two idempotency models, matching the two `dedupeMode`s in healthMapping:
//
//   • 'event'  — a discrete session (a run, a workout, a sleep). The provider's
//     summary id is stable across redeliveries, so the activityLog doc id
//     `${uid}_${eventDedupeKey(sourceId)}` makes a redelivered webhook a no-op
//     Firestore `set`.
//
//   • 'daily'  — a cumulative counter (steps) that the provider re-sends with a
//     growing total all day. We keep the last-ingested cumulative value in a
//     `healthDailySnapshots` doc and log only the positive delta, so the day's
//     summed activityLogs equal the latest cumulative total (no double-count,
//     and the existing daily cap still clamps rewards).
//
// All functions here are pure; the snapshot read/write lives in terraWebhook.

import type { ActivityType } from './activityCaps';

export const HEALTH_SNAPSHOTS_COLLECTION = 'healthDailySnapshots';

/** Firestore doc ids can't contain '/'; keep keys to a safe alphanumeric set. */
function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

/** UTC calendar day (YYYY-MM-DD) for a timestamp — the daily snapshot bucket. */
export function utcDayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Idempotent doc-id suffix for a discrete session. */
export function eventDedupeKey(sourceId: string): string {
  return `terra_${sanitize(sourceId)}`;
}

/**
 * Idempotent doc-id suffix for one daily delta. Keyed by the *new cumulative*
 * value so a redelivered identical total maps to an already-written doc (delta
 * already logged), while a grown total produces a fresh doc for its delta.
 */
export function dailyDeltaDedupeKey(
  activityType: ActivityType,
  day: string,
  newCumulative: number,
): string {
  return `terra_${activityType}_${sanitize(day)}_${Math.round(newCumulative)}`;
}

/** Snapshot doc id holding the last cumulative value per user/source/day/metric. */
export function dailySnapshotId(
  uid: string,
  source: string,
  day: string,
  metric: ActivityType,
): string {
  return `${uid}_${sanitize(source)}_${sanitize(day)}_${metric}`;
}

/**
 * Positive delta to log given the previously-ingested cumulative value and the
 * newly-reported one. Returns 0 when the total didn't grow (redelivery, or a
 * provider correction that lowered the count — never log negatives).
 */
export function computeDailyDelta(lastValue: number, newCumulative: number): number {
  const last = Number.isFinite(lastValue) ? lastValue : 0;
  return Math.max(0, Math.round(newCumulative) - Math.round(last));
}

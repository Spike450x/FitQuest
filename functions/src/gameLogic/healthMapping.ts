// Pure mapping from Terra (aggregator) webhook payloads → FitQuest activities.
//
// Terra normalizes 50+ providers (Garmin, Fitbit, Oura, WHOOP, Strava, Google
// Fit, …) into a single schema, so this one mapper covers every connected
// device. It is intentionally dependency-free and side-effect-free so the full
// payload→activity decision table is unit-testable without Firestore or network.
//
// v1 maps three event families; body / nutrition / menstruation are ignored
// until their game surfaces exist (documented in docs/HEALTH-INTEGRATION.md).

import { type ActivityType, ACTIVITY_AMOUNT_MAX } from './activityCaps';

const METERS_PER_MILE = 1609.344;

/** A distance below this in an activity session reads as a non-distance workout. */
const DISTANCE_SPORT_MIN_METERS = 400;

export type TerraWebhookType = 'activity' | 'daily' | 'sleep' | 'body' | 'nutrition';

// Permissive payload shapes — providers populate different subsets, so every
// nested field is optional and read defensively.
export interface TerraMetadata {
  summary_id?: string;
  start_time?: string;
  end_time?: string;
}

export interface TerraActivitySession {
  metadata?: TerraMetadata;
  distance_data?: { summary?: { distance_meters?: number } };
  active_durations_data?: { activity_seconds?: number };
}

export interface TerraDailySummary {
  metadata?: TerraMetadata;
  distance_data?: { steps?: number };
}

export interface TerraSleepSession {
  metadata?: TerraMetadata;
  sleep_durations_data?: { asleep?: { duration_asleep_state_seconds?: number } };
}

export interface TerraPayload {
  type?: TerraWebhookType | string;
  user?: { user_id?: string; reference_id?: string; provider?: string };
  data?: unknown[];
}

/**
 * dedupeMode tells the webhook how to make the write idempotent:
 *   'event' — a unique discrete session; idempotent on `sourceId`.
 *   'daily' — a cumulative daily counter (steps); the caller must diff against
 *             the last-ingested value before logging the positive delta.
 */
export interface MappedActivity {
  activityType: ActivityType;
  amount: number;
  unit: string;
  loggedAt: number;
  dedupeMode: 'event' | 'daily';
  sourceId: string;
}

function parseTime(meta: TerraMetadata | undefined): number {
  const iso = meta?.end_time ?? meta?.start_time;
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : Date.now();
}

function clamp(activityType: ActivityType, amount: number): number {
  return Math.min(amount, ACTIVITY_AMOUNT_MAX[activityType]);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mapActivitySession(s: TerraActivitySession): MappedActivity | null {
  const sourceId = s.metadata?.summary_id;
  if (!sourceId) return null;
  const loggedAt = parseTime(s.metadata);
  const meters = s.distance_data?.summary?.distance_meters ?? 0;

  // A meaningful distance reads as a run (Agility mastery); otherwise it is a
  // general workout scored by active minutes (Strength mastery).
  if (meters >= DISTANCE_SPORT_MIN_METERS) {
    const miles = round2(meters / METERS_PER_MILE);
    if (miles <= 0) return null;
    return {
      activityType: 'run',
      amount: clamp('run', miles),
      unit: 'miles',
      loggedAt,
      dedupeMode: 'event',
      sourceId,
    };
  }

  const seconds = s.active_durations_data?.activity_seconds ?? 0;
  const minutes = Math.round(seconds / 60);
  if (minutes <= 0) return null;
  return {
    activityType: 'workout',
    amount: clamp('workout', minutes),
    unit: 'minutes',
    loggedAt,
    dedupeMode: 'event',
    sourceId,
  };
}

function mapDailySummary(d: TerraDailySummary): MappedActivity | null {
  const steps = d.distance_data?.steps ?? 0;
  if (steps <= 0) return null;
  const loggedAt = parseTime(d.metadata);
  // sourceId is the day itself — daily summaries arrive repeatedly with a
  // growing cumulative step count, deduped by delta rather than by id.
  const sourceId = new Date(loggedAt).toISOString().slice(0, 10);
  return {
    activityType: 'steps',
    amount: clamp('steps', steps),
    unit: 'steps',
    loggedAt,
    dedupeMode: 'daily',
    sourceId,
  };
}

function mapSleepSession(s: TerraSleepSession): MappedActivity | null {
  const sourceId = s.metadata?.summary_id;
  if (!sourceId) return null;
  const seconds = s.sleep_durations_data?.asleep?.duration_asleep_state_seconds ?? 0;
  const hours = round2(seconds / 3600);
  if (hours <= 0) return null;
  return {
    activityType: 'sleep',
    amount: clamp('sleep', hours),
    unit: 'hours',
    loggedAt: parseTime(s.metadata),
    dedupeMode: 'event',
    sourceId,
  };
}

/**
 * Maps a single Terra webhook payload to zero or more FitQuest activities.
 * Unknown event types and empty/incomplete records yield an empty array.
 */
export function mapTerraPayload(payload: TerraPayload): MappedActivity[] {
  const data = Array.isArray(payload.data) ? payload.data : [];
  switch (payload.type) {
    case 'activity':
      return data
        .map((d) => mapActivitySession(d as TerraActivitySession))
        .filter((m): m is MappedActivity => m !== null);
    case 'daily':
      return data
        .map((d) => mapDailySummary(d as TerraDailySummary))
        .filter((m): m is MappedActivity => m !== null);
    case 'sleep':
      return data
        .map((d) => mapSleepSession(d as TerraSleepSession))
        .filter((m): m is MappedActivity => m !== null);
    default:
      return [];
  }
}

// Pure mapping from Garmin Health API "Push" payloads → FitQuest activities.
//
// Garmin posts type-keyed arrays to the registered callback URL(s), e.g.
//   { "activities": [ { summaryId, activityType, distanceInMeters, ... } ] }
//   { "dailies":    [ { summaryId, calendarDate, steps, ... } ] }
//   { "sleeps":     [ { summaryId, durationInSeconds, ... } ] }
// Every record carries `userId` + `userAccessToken` identifying the Garmin
// user; we surface that on each mapped record so the webhook can attribute the
// data to a FitQuest uid via the stored connection.
//
// Field names follow the Garmin Health API spec (stable across the wellness-api
// REST surface). The distance/duration split + sleep depth are deliberately
// simple v1 heuristics — see docs/HEALTH-INTEGRATION.md.

import {
  type MappedActivity,
  METERS_PER_MILE,
  DISTANCE_SPORT_MIN_METERS,
  clampAmount,
  round2,
} from './healthShared';

export interface GarminSummary {
  summaryId?: string;
  userId?: string;
  userAccessToken?: string;
  startTimeInSeconds?: number;
  durationInSeconds?: number;
  distanceInMeters?: number;
  steps?: number;
  activityType?: string;
  calendarDate?: string;
}

/** Garmin push body — one or more type-keyed arrays. All keys optional. */
export interface GarminPushBody {
  activities?: GarminSummary[];
  dailies?: GarminSummary[];
  sleeps?: GarminSummary[];
}

/** A mapped activity plus the Garmin identifiers used to resolve the owner. */
export interface MappedGarminActivity {
  garminUserId?: string;
  userAccessToken?: string;
  activity: MappedActivity;
}

function loggedAtMs(s: GarminSummary): number {
  const sec = s.startTimeInSeconds;
  return typeof sec === 'number' && Number.isFinite(sec) ? sec * 1000 : Date.now();
}

function mapActivity(s: GarminSummary): MappedActivity | null {
  if (!s.summaryId) return null;
  const meters = s.distanceInMeters ?? 0;

  // A meaningful distance reads as a run (Agility mastery); otherwise it is a
  // general workout scored by active minutes (Strength mastery).
  if (meters >= DISTANCE_SPORT_MIN_METERS) {
    const miles = round2(meters / METERS_PER_MILE);
    if (miles <= 0) return null;
    return {
      activityType: 'run',
      amount: clampAmount('run', miles),
      unit: 'miles',
      loggedAt: loggedAtMs(s),
      dedupeMode: 'event',
      sourceId: s.summaryId,
    };
  }

  const minutes = Math.round((s.durationInSeconds ?? 0) / 60);
  if (minutes <= 0) return null;
  return {
    activityType: 'workout',
    amount: clampAmount('workout', minutes),
    unit: 'minutes',
    loggedAt: loggedAtMs(s),
    dedupeMode: 'event',
    sourceId: s.summaryId,
  };
}

function mapDaily(s: GarminSummary): MappedActivity | null {
  const steps = s.steps ?? 0;
  if (steps <= 0) return null;
  const at = loggedAtMs(s);
  // Daily summaries arrive repeatedly with a growing cumulative step count;
  // deduped by delta (see healthDedupe), keyed by the calendar day.
  const sourceId = s.calendarDate ?? new Date(at).toISOString().slice(0, 10);
  return {
    activityType: 'steps',
    amount: clampAmount('steps', steps),
    unit: 'steps',
    loggedAt: at,
    dedupeMode: 'daily',
    sourceId,
  };
}

function mapSleep(s: GarminSummary): MappedActivity | null {
  if (!s.summaryId) return null;
  const hours = round2((s.durationInSeconds ?? 0) / 3600);
  if (hours <= 0) return null;
  return {
    activityType: 'sleep',
    amount: clampAmount('sleep', hours),
    unit: 'hours',
    loggedAt: loggedAtMs(s),
    dedupeMode: 'event',
    sourceId: s.summaryId,
  };
}

function withOwner(s: GarminSummary, activity: MappedActivity | null): MappedGarminActivity | null {
  if (!activity) return null;
  return { garminUserId: s.userId, userAccessToken: s.userAccessToken, activity };
}

/**
 * Maps a Garmin push body to zero or more owner-tagged FitQuest activities.
 * Unknown/empty records yield nothing.
 */
export function mapGarminPayload(body: GarminPushBody): MappedGarminActivity[] {
  const out: MappedGarminActivity[] = [];
  for (const s of body.activities ?? []) out.push(withOwner(s, mapActivity(s))!);
  for (const s of body.dailies ?? []) out.push(withOwner(s, mapDaily(s))!);
  for (const s of body.sleeps ?? []) out.push(withOwner(s, mapSleep(s))!);
  return out.filter((m): m is MappedGarminActivity => m !== null);
}

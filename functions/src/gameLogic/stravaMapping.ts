// Pure mapping from a Strava activity detail → a FitQuest activity.
//
// Strava webhooks only send a notification (object id); the webhook then fetches
// the full activity via GET /activities/{id} and maps THAT here. Strava has no
// steps or sleep, so v1 maps just the activity (run vs. workout). Garmin users
// who auto-sync to Strava get their workouts/runs through this path too.

import {
  type MappedActivity,
  METERS_PER_MILE,
  DISTANCE_SPORT_MIN_METERS,
  clampAmount,
  round2,
} from './healthShared';

export interface StravaActivity {
  id?: number;
  type?: string;
  sport_type?: string;
  /** metres */
  distance?: number;
  /** seconds */
  moving_time?: number;
  elapsed_time?: number;
  /** ISO 8601 UTC start, e.g. "2026-05-30T08:00:00Z" */
  start_date?: string;
}

function loggedAtMs(a: StravaActivity): number {
  const t = a.start_date ? Date.parse(a.start_date) : NaN;
  return Number.isFinite(t) ? t : Date.now();
}

/** Maps one Strava activity to a FitQuest activity, or null if not loggable. */
export function mapStravaActivity(a: StravaActivity): MappedActivity | null {
  if (a.id === undefined || a.id === null) return null;
  const sourceId = String(a.id);
  const meters = a.distance ?? 0;

  // A meaningful distance reads as a run (Agility mastery); otherwise it is a
  // general workout scored by active minutes (Strength mastery).
  if (meters >= DISTANCE_SPORT_MIN_METERS) {
    const miles = round2(meters / METERS_PER_MILE);
    if (miles <= 0) return null;
    return {
      activityType: 'run',
      amount: clampAmount('run', miles),
      unit: 'miles',
      loggedAt: loggedAtMs(a),
      dedupeMode: 'event',
      sourceId,
    };
  }

  const seconds = a.moving_time ?? a.elapsed_time ?? 0;
  const minutes = Math.round(seconds / 60);
  if (minutes <= 0) return null;
  return {
    activityType: 'workout',
    amount: clampAmount('workout', minutes),
    unit: 'minutes',
    loggedAt: loggedAtMs(a),
    dedupeMode: 'event',
    sourceId,
  };
}

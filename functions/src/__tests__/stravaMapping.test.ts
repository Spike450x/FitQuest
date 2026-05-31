import { describe, it, expect } from 'vitest';
import { mapStravaActivity } from '../gameLogic/stravaMapping';

const START = '2026-05-30T08:00:00Z';

describe('mapStravaActivity', () => {
  it('maps a distance activity to a run in miles', () => {
    const m = mapStravaActivity({
      id: 123,
      type: 'Run',
      distance: 8046.72, // 5 miles
      moving_time: 1800,
      start_date: START,
    })!;
    expect(m.activityType).toBe('run');
    expect(m.amount).toBe(5);
    expect(m.unit).toBe('miles');
    expect(m.dedupeMode).toBe('event');
    expect(m.sourceId).toBe('123');
    expect(m.loggedAt).toBe(Date.parse(START));
  });

  it('maps a low/zero-distance activity to a workout in minutes', () => {
    const m = mapStravaActivity({ id: 9, type: 'Workout', distance: 0, moving_time: 1800 })!;
    expect(m.activityType).toBe('workout');
    expect(m.amount).toBe(30);
  });

  it('falls back to elapsed_time when moving_time is absent', () => {
    const m = mapStravaActivity({ id: 9, distance: 0, elapsed_time: 600 })!;
    expect(m.activityType).toBe('workout');
    expect(m.amount).toBe(10);
  });

  it('clamps a run to the activity max', () => {
    expect(mapStravaActivity({ id: 1, distance: 1_000_000 })!.amount).toBe(50);
  });

  it('returns null without an id, and for zero-duration workouts', () => {
    expect(mapStravaActivity({ distance: 5000 })).toBeNull();
    expect(mapStravaActivity({ id: 2, distance: 0, moving_time: 20 })).toBeNull();
  });
});

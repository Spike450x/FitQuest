import { describe, it, expect } from 'vitest';
import { mapTerraPayload, type TerraPayload } from '../gameLogic/healthMapping';

describe('mapTerraPayload — activity sessions', () => {
  it('maps a distance session to a run in miles', () => {
    const payload: TerraPayload = {
      type: 'activity',
      user: { reference_id: 'u1', provider: 'GARMIN' },
      data: [
        {
          metadata: { summary_id: 'act-1', end_time: '2026-05-30T08:00:00Z' },
          distance_data: { summary: { distance_meters: 8046.72 } }, // 5 miles
        },
      ],
    };
    const [m] = mapTerraPayload(payload);
    expect(m.activityType).toBe('run');
    expect(m.amount).toBe(5);
    expect(m.unit).toBe('miles');
    expect(m.dedupeMode).toBe('event');
    expect(m.sourceId).toBe('act-1');
    expect(m.loggedAt).toBe(Date.parse('2026-05-30T08:00:00Z'));
  });

  it('maps a low-distance session to a workout in minutes', () => {
    const payload: TerraPayload = {
      type: 'activity',
      data: [
        {
          metadata: { summary_id: 'act-2', start_time: '2026-05-30T08:00:00Z' },
          distance_data: { summary: { distance_meters: 0 } },
          active_durations_data: { activity_seconds: 1800 }, // 30 min
        },
      ],
    };
    const [m] = mapTerraPayload(payload);
    expect(m.activityType).toBe('workout');
    expect(m.amount).toBe(30);
    expect(m.unit).toBe('minutes');
  });

  it('clamps run distance to the activity max', () => {
    const payload: TerraPayload = {
      type: 'activity',
      data: [
        {
          metadata: { summary_id: 'ultra' },
          distance_data: { summary: { distance_meters: 1_000_000 } },
        },
      ],
    };
    const [m] = mapTerraPayload(payload);
    expect(m.amount).toBe(50); // ACTIVITY_AMOUNT_MAX.run
  });

  it('skips sessions without a summary_id', () => {
    const payload: TerraPayload = {
      type: 'activity',
      data: [{ distance_data: { summary: { distance_meters: 5000 } } }],
    };
    expect(mapTerraPayload(payload)).toEqual([]);
  });

  it('skips zero-duration workouts', () => {
    const payload: TerraPayload = {
      type: 'activity',
      data: [{ metadata: { summary_id: 'z' }, active_durations_data: { activity_seconds: 20 } }],
    };
    expect(mapTerraPayload(payload)).toEqual([]); // rounds to 0 minutes
  });
});

describe('mapTerraPayload — daily summaries', () => {
  it('maps daily steps to a cumulative steps activity', () => {
    const payload: TerraPayload = {
      type: 'daily',
      data: [
        {
          metadata: { start_time: '2026-05-30T00:00:00Z' },
          distance_data: { steps: 12000 },
        },
      ],
    };
    const [m] = mapTerraPayload(payload);
    expect(m.activityType).toBe('steps');
    expect(m.amount).toBe(12000);
    expect(m.dedupeMode).toBe('daily');
    expect(m.sourceId).toBe('2026-05-30');
  });

  it('clamps steps to the activity max', () => {
    const payload: TerraPayload = {
      type: 'daily',
      data: [{ metadata: { start_time: '2026-05-30T00:00:00Z' }, distance_data: { steps: 99999 } }],
    };
    expect(mapTerraPayload(payload)[0].amount).toBe(50000);
  });

  it('skips zero-step days', () => {
    const payload: TerraPayload = {
      type: 'daily',
      data: [{ metadata: { start_time: '2026-05-30T00:00:00Z' }, distance_data: { steps: 0 } }],
    };
    expect(mapTerraPayload(payload)).toEqual([]);
  });
});

describe('mapTerraPayload — sleep + unknown', () => {
  it('maps a sleep session to hours', () => {
    const payload: TerraPayload = {
      type: 'sleep',
      data: [
        {
          metadata: { summary_id: 'sl-1' },
          sleep_durations_data: { asleep: { duration_asleep_state_seconds: 28800 } }, // 8h
        },
      ],
    };
    const [m] = mapTerraPayload(payload);
    expect(m.activityType).toBe('sleep');
    expect(m.amount).toBe(8);
    expect(m.unit).toBe('hours');
  });

  it('returns an empty array for unmapped event types', () => {
    expect(mapTerraPayload({ type: 'body', data: [{}] })).toEqual([]);
    expect(mapTerraPayload({ type: 'auth', data: [] })).toEqual([]);
    expect(mapTerraPayload({})).toEqual([]);
  });
});

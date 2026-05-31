import { describe, it, expect } from 'vitest';
import { mapGarminPayload } from '../gameLogic/garminMapping';

const T = 1748592000; // 2026-05-30T08:00:00Z in seconds

describe('mapGarminPayload — activities', () => {
  it('maps a distance activity to a run in miles', () => {
    const [m] = mapGarminPayload({
      activities: [
        {
          summaryId: 'a1',
          userId: 'g1',
          userAccessToken: 'tok',
          startTimeInSeconds: T,
          distanceInMeters: 8046.72, // 5 miles
          durationInSeconds: 1800,
        },
      ],
    });
    expect(m.garminUserId).toBe('g1');
    expect(m.userAccessToken).toBe('tok');
    expect(m.activity.activityType).toBe('run');
    expect(m.activity.amount).toBe(5);
    expect(m.activity.unit).toBe('miles');
    expect(m.activity.dedupeMode).toBe('event');
    expect(m.activity.sourceId).toBe('a1');
    expect(m.activity.loggedAt).toBe(T * 1000);
  });

  it('maps a low-distance activity to a workout in minutes', () => {
    const [m] = mapGarminPayload({
      activities: [{ summaryId: 'a2', distanceInMeters: 0, durationInSeconds: 1800 }],
    });
    expect(m.activity.activityType).toBe('workout');
    expect(m.activity.amount).toBe(30);
  });

  it('clamps a run to the activity max', () => {
    const [m] = mapGarminPayload({
      activities: [{ summaryId: 'ultra', distanceInMeters: 1_000_000 }],
    });
    expect(m.activity.amount).toBe(50);
  });

  it('skips activities without a summaryId', () => {
    expect(mapGarminPayload({ activities: [{ distanceInMeters: 5000 }] })).toEqual([]);
  });
});

describe('mapGarminPayload — dailies + sleeps', () => {
  it('maps daily steps to a cumulative steps activity', () => {
    const [m] = mapGarminPayload({
      dailies: [{ summaryId: 'd1', calendarDate: '2026-05-30', steps: 12000 }],
    });
    expect(m.activity.activityType).toBe('steps');
    expect(m.activity.amount).toBe(12000);
    expect(m.activity.dedupeMode).toBe('daily');
    expect(m.activity.sourceId).toBe('2026-05-30');
  });

  it('clamps steps to the activity max and skips zero-step days', () => {
    expect(
      mapGarminPayload({
        dailies: [{ summaryId: 'd2', calendarDate: '2026-05-30', steps: 99999 }],
      })[0].activity.amount,
    ).toBe(50000);
    expect(mapGarminPayload({ dailies: [{ summaryId: 'd3', steps: 0 }] })).toEqual([]);
  });

  it('maps a sleep summary to hours', () => {
    const [m] = mapGarminPayload({
      sleeps: [{ summaryId: 's1', durationInSeconds: 28800 }], // 8h
    });
    expect(m.activity.activityType).toBe('sleep');
    expect(m.activity.amount).toBe(8);
    expect(m.activity.unit).toBe('hours');
  });

  it('handles a combined body and an empty body', () => {
    const out = mapGarminPayload({
      activities: [{ summaryId: 'a', distanceInMeters: 2000 }],
      dailies: [{ summaryId: 'd', calendarDate: '2026-05-30', steps: 500 }],
    });
    expect(out).toHaveLength(2);
    expect(mapGarminPayload({})).toEqual([]);
  });
});

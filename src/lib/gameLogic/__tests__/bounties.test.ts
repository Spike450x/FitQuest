import { describe, it, expect } from 'vitest';
import { BOUNTY_POOL, getBountyDef } from '../bounties';
import type { ActivityType } from '@/types';

const VALID_ACTIVITY_TYPES: ActivityType[] = [
  'workout',
  'run',
  'steps',
  'sleep',
  'water',
  'nutrition',
  'meditation',
];

describe('BOUNTY_POOL — registration', () => {
  it('has a non-empty pool', () => {
    expect(BOUNTY_POOL.length).toBeGreaterThan(0);
  });

  it('every bounty id is unique', () => {
    const ids = BOUNTY_POOL.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every bounty id starts with the "bounty-" prefix', () => {
    for (const b of BOUNTY_POOL) expect(b.id).toMatch(/^bounty-/);
  });

  it('getBountyDef round-trips every id', () => {
    for (const b of BOUNTY_POOL) expect(getBountyDef(b.id)).toBe(b);
  });

  it('getBountyDef returns undefined for an unknown id', () => {
    expect(getBountyDef('not-a-real-bounty')).toBeUndefined();
  });
});

describe('BOUNTY_POOL — shape validity', () => {
  it('every requirement uses a valid ActivityType with a positive target', () => {
    for (const b of BOUNTY_POOL) {
      expect(VALID_ACTIVITY_TYPES).toContain(b.requirement.activityType);
      expect(b.requirement.target).toBeGreaterThan(0);
      expect(b.requirement.unit.length).toBeGreaterThan(0);
    }
  });

  it('every reward grants positive reputation', () => {
    for (const b of BOUNTY_POOL) {
      expect(b.rewards.reputation).toBeGreaterThan(0);
    }
  });

  it('extra targets use valid activity types and never duplicate the activity key', () => {
    // A duplicate activityType across requirement+extraTargets would collide in
    // the extraProgress map — the store relies on each key being distinct.
    for (const b of BOUNTY_POOL) {
      if (!b.extraTargets) continue;
      const keys = [b.requirement.activityType, ...b.extraTargets.map((t) => t.activityType)];
      expect(new Set(keys).size).toBe(keys.length);
      for (const et of b.extraTargets) {
        expect(VALID_ACTIVITY_TYPES).toContain(et.activityType);
        expect(et.target).toBeGreaterThan(0);
      }
    }
  });
});

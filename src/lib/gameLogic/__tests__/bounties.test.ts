import { describe, it, expect } from 'vitest';
import { BOUNTY_POOL, getBountyDef, pickHuntMonster } from '../bounties';
import { MONSTER_CATALOG } from '../monsters';
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

  it('every bounty id starts with a known prefix (bounty- or hunt-)', () => {
    for (const b of BOUNTY_POOL) expect(b.id).toMatch(/^(bounty|hunt)-/);
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

describe('BOUNTY_POOL — hunt vs standing', () => {
  const hunts = BOUNTY_POOL.filter((b) => b.kind === 'hunt');
  const standing = BOUNTY_POOL.filter((b) => (b.kind ?? 'standing') === 'standing');

  it('contains both hunt and standing bounties', () => {
    expect(hunts.length).toBeGreaterThan(0);
    expect(standing.length).toBeGreaterThan(0);
  });

  it('every hunt def carries a combat levelBand', () => {
    for (const h of hunts) {
      expect(h.combat).toBeDefined();
      expect(typeof h.combat!.levelBand.min).toBe('number');
      expect(typeof h.combat!.levelBand.max).toBe('number');
      expect(h.combat!.levelBand.max).toBeGreaterThanOrEqual(h.combat!.levelBand.min);
    }
  });

  it('standing defs never carry a combat block', () => {
    for (const s of standing) expect(s.combat).toBeUndefined();
  });

  it('hunts pay more reputation than the richest standing bounty (fight = bigger payout)', () => {
    const maxStanding = Math.max(...standing.map((s) => s.rewards.reputation));
    const minHunt = Math.min(...hunts.map((h) => h.rewards.reputation));
    expect(minHunt).toBeGreaterThan(maxStanding);
  });
});

describe('pickHuntMonster', () => {
  const band = { min: -1, max: 1 };

  it('is deterministic for the same (level, band, seed)', () => {
    const a = pickHuntMonster(5, band, 12345);
    const b = pickHuntMonster(5, band, 12345);
    expect(a.id).toBe(b.id);
  });

  it('picks a monster within the relative band when the band is populated', () => {
    for (let level = 3; level <= 12; level++) {
      for (let seed = 0; seed < 8; seed++) {
        const m = pickHuntMonster(level, band, seed);
        expect(m.level).toBeGreaterThanOrEqual(level + band.min);
        expect(m.level).toBeLessThanOrEqual(level + band.max);
      }
    }
  });

  it('widens the window and still returns a monster for out-of-range levels', () => {
    const high = pickHuntMonster(50, { min: -1, max: 1 }, 1);
    expect(MONSTER_CATALOG).toContainEqual(high);
    const low = pickHuntMonster(-5, { min: -1, max: 1 }, 1);
    expect(MONSTER_CATALOG).toContainEqual(low);
  });

  it('a tougher band targets higher-level monsters than a standard band', () => {
    // Averaged over seeds, the elite band should not pick below the standard band's floor.
    const eliteFloor = 8 + 1; // playerLevel 8, band.min +1
    for (let seed = 0; seed < 8; seed++) {
      const elite = pickHuntMonster(8, { min: 1, max: 3 }, seed);
      expect(elite.level).toBeGreaterThanOrEqual(eliteFloor);
    }
  });
});

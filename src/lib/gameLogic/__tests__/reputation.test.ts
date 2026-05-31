import { describe, it, expect } from 'vitest';
import {
  REPUTATION_RANKS,
  reputationRank,
  nextReputationRank,
  reputationProgress,
} from '../reputation';

describe('reputationRank — tier boundaries', () => {
  it('clamps negative lifetime to Newcomer', () => {
    expect(reputationRank(-100).id).toBe('newcomer');
  });

  it('returns Newcomer at 0 and just below the next threshold', () => {
    expect(reputationRank(0).id).toBe('newcomer');
    expect(reputationRank(499).id).toBe('newcomer');
  });

  it('returns Known exactly at 500 and up to just below 1500', () => {
    expect(reputationRank(500).id).toBe('known');
    expect(reputationRank(1499).id).toBe('known');
  });

  it('returns Respected at 1500, Renowned at 4000', () => {
    expect(reputationRank(1500).id).toBe('respected');
    expect(reputationRank(3999).id).toBe('respected');
    expect(reputationRank(4000).id).toBe('renowned');
    expect(reputationRank(9999).id).toBe('renowned');
  });

  it('returns Legendary at 10000 and far above', () => {
    expect(reputationRank(10000).id).toBe('legendary');
    expect(reputationRank(1_000_000).id).toBe('legendary');
  });

  it('REPUTATION_RANKS is ordered by ascending threshold', () => {
    for (let i = 1; i < REPUTATION_RANKS.length; i++) {
      expect(REPUTATION_RANKS[i].threshold).toBeGreaterThan(REPUTATION_RANKS[i - 1].threshold);
    }
  });
});

describe('nextReputationRank', () => {
  it('returns the next tier up at each rank', () => {
    expect(nextReputationRank(0)?.id).toBe('known');
    expect(nextReputationRank(500)?.id).toBe('respected');
    expect(nextReputationRank(1500)?.id).toBe('renowned');
    expect(nextReputationRank(4000)?.id).toBe('legendary');
  });

  it('returns null at the top rank', () => {
    expect(nextReputationRank(10000)).toBeNull();
    expect(nextReputationRank(50000)).toBeNull();
  });
});

describe('reputationProgress', () => {
  it('is 0% at the start of a tier', () => {
    const p = reputationProgress(500);
    expect(p.rank.id).toBe('known');
    expect(p.pctToNext).toBe(0);
    expect(p.remaining).toBe(1000); // 1500 - 500
    expect(p.atMax).toBe(false);
  });

  it('is near 100% just below the next threshold', () => {
    const p = reputationProgress(1499);
    expect(p.rank.id).toBe('known');
    expect(p.pctToNext).toBeGreaterThanOrEqual(99);
    expect(p.remaining).toBe(1);
  });

  it('reports atMax with 100% and 0 remaining at Legendary', () => {
    const p = reputationProgress(12000);
    expect(p.atMax).toBe(true);
    expect(p.next).toBeNull();
    expect(p.pctToNext).toBe(100);
    expect(p.remaining).toBe(0);
  });

  it('computes a sensible midpoint percentage', () => {
    // Halfway from Respected(1500) to Renowned(4000) is 2750.
    const p = reputationProgress(2750);
    expect(p.rank.id).toBe('respected');
    expect(p.pctToNext).toBe(50);
  });
});

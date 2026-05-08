import { describe, it, expect } from 'vitest';
import { detectPattern, getAbility, type DicePattern } from '../abilities';

// ─── detectPattern ────────────────────────────────────────────────────────────
//
// Pattern precedence (highest first):
//   four_of_a_kind > full_house > large_straight > small_straight > three_of_a_kind > null
//
// These tests pin down the exact precedence so a refactor can't silently
// promote/demote a pattern.

describe('detectPattern', () => {
  describe('four_of_a_kind', () => {
    it('detects four matching dice', () => {
      expect(detectPattern([3, 3, 3, 3, 1, 2])).toBe('four_of_a_kind');
    });

    it('detects five matching dice (still four_of_a_kind, the highest matchable rank)', () => {
      expect(detectPattern([5, 5, 5, 5, 5, 1])).toBe('four_of_a_kind');
    });

    it('detects six matching dice', () => {
      expect(detectPattern([2, 2, 2, 2, 2, 2])).toBe('four_of_a_kind');
    });

    it('takes precedence over full_house', () => {
      // Four 4s + two 1s — could read as full_house but four_of_a_kind wins.
      expect(detectPattern([4, 4, 4, 4, 1, 1])).toBe('four_of_a_kind');
    });
  });

  describe('full_house', () => {
    it('detects 3+2 split', () => {
      expect(detectPattern([2, 2, 2, 5, 5, 1])).toBe('full_house');
    });

    it('detects 3+3 split (3+2 condition still satisfied by either triple)', () => {
      expect(detectPattern([4, 4, 4, 6, 6, 6])).toBe('full_house');
    });

    it('takes precedence over large_straight', () => {
      // 1-2-3-4-5 is a large straight, but only one of each — no triple.
      // To force a conflict: triple value paired with another double, where the
      // remaining die would make a straight if it were different. Hard to
      // construct unambiguously; instead verify a triple+pair returns full_house
      // even when remaining die could be in a straight.
      expect(detectPattern([3, 3, 3, 5, 5, 4])).toBe('full_house');
    });
  });

  describe('large_straight', () => {
    it('detects 1-2-3-4-5', () => {
      expect(detectPattern([1, 2, 3, 4, 5, 1])).toBe('large_straight');
    });

    it('detects 2-3-4-5-6', () => {
      expect(detectPattern([2, 3, 4, 5, 6, 6])).toBe('large_straight');
    });

    it('does not detect non-consecutive five distinct values (1, 2, 3, 4, 6)', () => {
      const result = detectPattern([1, 2, 3, 4, 6, 6]);
      // Has a small_straight (1-2-3-4) and a pair (6,6) — small_straight wins.
      expect(result).toBe('small_straight');
    });

    it('takes precedence over small_straight', () => {
      // 1-2-3-4-5 contains a small straight 1-2-3-4 — large should win.
      expect(detectPattern([1, 2, 3, 4, 5, 5])).toBe('large_straight');
    });
  });

  describe('small_straight', () => {
    it('detects 1-2-3-4', () => {
      expect(detectPattern([1, 2, 3, 4, 1, 1])).toBe('small_straight');
    });

    it('detects 2-3-4-5', () => {
      expect(detectPattern([2, 3, 4, 5, 2, 2])).toBe('small_straight');
    });

    it('detects 3-4-5-6 alone', () => {
      expect(detectPattern([3, 4, 5, 6, 1, 1])).toBe('small_straight');
    });

    it('3-4-5-6 + triple sixes still resolves to small_straight (precedence)', () => {
      // [3, 4, 5, 6, 6, 6] contains both 3-4-5-6 and three sixes.
      // Precedence: small_straight > three_of_a_kind.
      expect(detectPattern([3, 4, 5, 6, 6, 6])).toBe('small_straight');
    });

    it('takes precedence over three_of_a_kind', () => {
      expect(detectPattern([1, 2, 3, 4, 6, 6])).toBe('small_straight');
    });
  });

  describe('three_of_a_kind', () => {
    it('detects three matching dice with no other pattern', () => {
      expect(detectPattern([5, 5, 5, 1, 2, 6])).toBe('three_of_a_kind');
    });

    it('does not match if only a pair (no triple, no straight)', () => {
      // [5, 5, 1, 2, 3, 6] — pair of 5s + scattered values. Distinct values are
      // {1,2,3,5,6} — no 4 consecutive, so no small_straight either.
      expect(detectPattern([5, 5, 1, 2, 3, 6])).toBeNull();
    });
  });

  describe('null (no pattern)', () => {
    it('returns null for unmatched dice', () => {
      expect(detectPattern([1, 1, 2, 4, 6, 6])).toBe(null);
    });

    it('returns null for two pairs without a triple or straight', () => {
      expect(detectPattern([1, 1, 3, 3, 5, 6])).toBe(null);
    });
  });
});

// ─── getAbility ───────────────────────────────────────────────────────────────

describe('getAbility', () => {
  const patterns: DicePattern[] = [
    'three_of_a_kind',
    'four_of_a_kind',
    'full_house',
    'small_straight',
    'large_straight',
  ];

  it.each(['warrior', 'wizard', 'rogue'])('returns an ability for every pattern (%s)', (cls) => {
    for (const pattern of patterns) {
      const ability = getAbility(cls, pattern);
      expect(ability).not.toBeNull();
      expect(ability?.pattern).toBe(pattern);
    }
  });

  it('returns null for unknown class', () => {
    expect(getAbility('necromancer', 'three_of_a_kind')).toBeNull();
  });

  it('catalog covers exactly 5 patterns × 3 classes = 15 abilities (no duplicates)', () => {
    const ids = new Set<string>();
    for (const cls of ['warrior', 'wizard', 'rogue']) {
      for (const pattern of patterns) {
        const ability = getAbility(cls, pattern);
        if (ability) ids.add(ability.id);
      }
    }
    expect(ids.size).toBe(15);
  });
});

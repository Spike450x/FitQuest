import { describe, it, expect } from 'vitest';
import {
  STAT_MULT_MAX_DEVIATION,
  statMultiplierDelta,
  formatMultiplierPct,
} from '@/lib/classTraits';

describe('STAT_MULT_MAX_DEVIATION', () => {
  it('matches the widest deviation in the current matrix (0.8 / 1.4 → 0.4)', () => {
    expect(STAT_MULT_MAX_DEVIATION).toBeCloseTo(0.4, 5);
  });
});

describe('statMultiplierDelta', () => {
  it('classifies a buff with a positive pct', () => {
    const d = statMultiplierDelta(1.4);
    expect(d.kind).toBe('buff');
    expect(d.pct).toBe(40);
  });

  it('classifies a debuff with a negative pct', () => {
    const d = statMultiplierDelta(0.8);
    expect(d.kind).toBe('debuff');
    expect(d.pct).toBe(-20);
  });

  it('classifies exactly 1.0 as neutral with no fill', () => {
    const d = statMultiplierDelta(1.0);
    expect(d.kind).toBe('neutral');
    expect(d.pct).toBe(0);
    expect(d.fillFraction).toBe(0);
  });

  it('fills the full track at the matrix extreme', () => {
    expect(statMultiplierDelta(1.4).fillFraction).toBeCloseTo(1, 5);
    expect(statMultiplierDelta(0.6).fillFraction).toBe(1); // clamped beyond the matrix
  });

  it('fills proportionally for a mid value', () => {
    // |0.9 - 1| / 0.4 = 0.25
    expect(statMultiplierDelta(0.9).fillFraction).toBeCloseTo(0.25, 5);
  });
});

describe('formatMultiplierPct', () => {
  it('formats positive, negative, and zero', () => {
    expect(formatMultiplierPct(40)).toBe('+40%');
    expect(formatMultiplierPct(-20)).toBe('−20%');
    expect(formatMultiplierPct(0)).toBe('±0%');
  });
});

import { describe, it, expect } from 'vitest';
import {
  spellCritChance,
  spellCritDamage,
  rollSpellCrit,
  MAX_SPELL_CRIT_CHANCE,
  MAX_SPELL_CRIT_DAMAGE_MULT,
} from '../combat';

describe('spellCritChance', () => {
  it('returns 0 at zero spirit', () => {
    expect(spellCritChance(0)).toBe(0);
  });

  it('returns 1% per point of Spirit', () => {
    expect(spellCritChance(10)).toBeCloseTo(0.1, 5);
    expect(spellCritChance(25)).toBeCloseTo(0.25, 5);
  });

  it('caps at 40% chance', () => {
    expect(spellCritChance(40)).toBeCloseTo(MAX_SPELL_CRIT_CHANCE, 5);
    expect(spellCritChance(50)).toBe(MAX_SPELL_CRIT_CHANCE);
    expect(spellCritChance(999)).toBe(MAX_SPELL_CRIT_CHANCE);
  });

  it('clamps negative spirit to zero', () => {
    expect(spellCritChance(-10)).toBe(0);
  });
});

describe('spellCritDamage', () => {
  it('returns 1.0× at zero spirit', () => {
    expect(spellCritDamage(0)).toBe(1);
  });

  it('adds 0.5% per point of Spirit', () => {
    expect(spellCritDamage(10)).toBeCloseTo(1.05, 5);
    expect(spellCritDamage(20)).toBeCloseTo(1.1, 5);
  });

  it('caps at +25% damage', () => {
    expect(spellCritDamage(50)).toBeCloseTo(MAX_SPELL_CRIT_DAMAGE_MULT, 5);
    expect(spellCritDamage(999)).toBe(MAX_SPELL_CRIT_DAMAGE_MULT);
  });
});

describe('rollSpellCrit', () => {
  it('does not crit when the RNG draws above the crit chance', () => {
    // spirit=20 → 20% chance. rng returns 0.5 → no crit.
    const result = rollSpellCrit(20, 100, () => 0.5);
    expect(result.crit).toBe(false);
    expect(result.damage).toBe(100);
    expect(result.multiplier).toBe(1);
  });

  it('crits when the RNG draws below the crit chance', () => {
    // spirit=20 → 20% chance, +10% damage. rng returns 0.05 → crit.
    const result = rollSpellCrit(20, 100, () => 0.05);
    expect(result.crit).toBe(true);
    expect(result.damage).toBe(110);
    expect(result.multiplier).toBeCloseTo(1.1, 5);
  });

  it('never crits at zero spirit even with rng=0', () => {
    const result = rollSpellCrit(0, 100, () => 0);
    expect(result.crit).toBe(false);
  });

  it('passes zero-damage hits through without rolling', () => {
    // Heal-only spells and stun-only effects must never trigger crit damage.
    const result = rollSpellCrit(40, 0, () => 0);
    expect(result.crit).toBe(false);
    expect(result.damage).toBe(0);
  });

  it('rounds damage to integers', () => {
    // 23 × 1.07 = 24.61 → 25
    const result = rollSpellCrit(14, 23, () => 0);
    expect(result.crit).toBe(true);
    expect(Number.isInteger(result.damage)).toBe(true);
  });
});

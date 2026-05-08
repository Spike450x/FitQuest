import { describe, it, expect } from 'vitest';
import { calculateResourceRestore, applyStatGains } from '../stats';
import { RESTORE } from '../constants';
import type { Stats } from '@/types';

// ─── calculateResourceRestore ────────────────────────────────────────────────

describe('calculateResourceRestore', () => {
  it('nutrition → HP at HP_PER_MEAL rate', () => {
    expect(calculateResourceRestore('nutrition', 3)).toEqual({
      resourceType: 'hp',
      amount: 3 * RESTORE.HP_PER_MEAL,
    });
  });

  it('sleep → stamina at STAMINA_PER_SLEEP_HOUR rate', () => {
    expect(calculateResourceRestore('sleep', 8)).toEqual({
      resourceType: 'stamina',
      amount: 8 * RESTORE.STAMINA_PER_SLEEP_HOUR,
    });
  });

  it('water → magic at MAGIC_PER_WATER_GLASS rate', () => {
    expect(calculateResourceRestore('water', 6)).toEqual({
      resourceType: 'magic',
      amount: 6 * RESTORE.MAGIC_PER_WATER_GLASS,
    });
  });

  it('floors fractional amounts (e.g. 7.5 hours of sleep)', () => {
    // 7.5 × 5 = 37.5 → floor → 37
    expect(calculateResourceRestore('sleep', 7.5)).toEqual({
      resourceType: 'stamina',
      amount: Math.floor(7.5 * RESTORE.STAMINA_PER_SLEEP_HOUR),
    });
  });

  it('returns null for mastery activities (workout/run/steps)', () => {
    expect(calculateResourceRestore('workout', 60)).toBeNull();
    expect(calculateResourceRestore('run', 5)).toBeNull();
    expect(calculateResourceRestore('steps', 10000)).toBeNull();
  });

  it('handles zero-amount input cleanly', () => {
    expect(calculateResourceRestore('nutrition', 0)).toEqual({
      resourceType: 'hp',
      amount: 0,
    });
  });
});

// ─── applyStatGains ──────────────────────────────────────────────────────────
//
// Caps:
//   strength / wisdom / agility — flat 50 (PRIMARY_STAT_CAP)
//   stamina / health / defense  — level × 5 + 10

describe('applyStatGains', () => {
  const baseStats = (): Stats => ({
    strength: 5,
    wisdom: 5,
    agility: 5,
    stamina: 5,
    health: 5,
    defense: 5,
  });

  it('adds gains to each stat without exceeding caps', () => {
    const result = applyStatGains(baseStats(), { strength: 3, wisdom: 2 }, 1);
    expect(result.strength).toBe(8);
    expect(result.wisdom).toBe(7);
    expect(result.agility).toBe(5);
  });

  it('caps primary stats at PRIMARY_STAT_CAP (50)', () => {
    const high: Stats = { ...baseStats(), strength: 49, wisdom: 49, agility: 49 };
    const result = applyStatGains(high, { strength: 5, wisdom: 5, agility: 5 }, 1);
    expect(result.strength).toBe(50);
    expect(result.wisdom).toBe(50);
    expect(result.agility).toBe(50);
  });

  it('caps secondary stats at level × 5 + 10', () => {
    // Level 5 cap = 5 × 5 + 10 = 35
    const high: Stats = { ...baseStats(), stamina: 34, health: 34, defense: 34 };
    const result = applyStatGains(high, { stamina: 10, health: 10, defense: 10 }, 5);
    expect(result.stamina).toBe(35);
    expect(result.health).toBe(35);
    expect(result.defense).toBe(35);
  });

  it('applies a partial gain map (other stats unchanged)', () => {
    const result = applyStatGains(baseStats(), { strength: 1 }, 1);
    expect(result.strength).toBe(6);
    expect(result.wisdom).toBe(5);
    expect(result.stamina).toBe(5);
    expect(result.health).toBe(5);
    expect(result.agility).toBe(5);
    expect(result.defense).toBe(5);
  });

  it('handles undefined agility/defense (legacy character docs)', () => {
    // Old docs may not have agility or defense initialized.
    const legacy = {
      strength: 5,
      wisdom: 5,
      stamina: 5,
      health: 5,
    } as unknown as Stats;
    const result = applyStatGains(legacy, { agility: 3, defense: 3 }, 1);
    expect(result.agility).toBe(3);
    expect(result.defense).toBe(3);
  });

  it('does not mutate the input stats object', () => {
    const stats = baseStats();
    const snapshot = { ...stats };
    applyStatGains(stats, { strength: 5 }, 1);
    expect(stats).toEqual(snapshot);
  });

  it('zero-gain map returns the same values', () => {
    const stats = baseStats();
    const result = applyStatGains(stats, {}, 1);
    expect(result).toEqual(stats);
  });
});

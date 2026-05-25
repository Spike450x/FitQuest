import { describe, it, expect } from 'vitest';
import { getWeeklySpells, WEEKLY_SPELL_COUNT } from '../shopRotation';
import type { ItemDef } from '@/types';

// Minimal fake spell items — enough to test pick logic without importing the full catalog.
function makeSpell(id: string): ItemDef {
  return {
    id,
    name: id,
    type: 'spell',
    rarity: 'common',
    tier: 1,
    price: 50,
    description: '',
    statBonuses: {},
    lootOnly: false,
  } as unknown as ItemDef;
}

const POOL = Array.from({ length: 12 }, (_, i) => makeSpell(`spell-${i}`));

describe('getWeeklySpells', () => {
  it('returns exactly WEEKLY_SPELL_COUNT spells when pool is large enough', () => {
    const result = getWeeklySpells(POOL, '2026-20');
    expect(result).toHaveLength(WEEKLY_SPELL_COUNT);
  });

  it('returns all spells when pool is smaller than WEEKLY_SPELL_COUNT', () => {
    const small = POOL.slice(0, 3);
    const result = getWeeklySpells(small, '2026-20');
    expect(result).toHaveLength(3);
  });

  it('same weekKey → same picks (deterministic)', () => {
    const a = getWeeklySpells(POOL, '2026-20');
    const b = getWeeklySpells(POOL, '2026-20');
    expect(b).toEqual(a);
  });

  it('different weekKeys → different picks', () => {
    const w1 = getWeeklySpells(POOL, '2026-20');
    const w2 = getWeeklySpells(POOL, '2026-21');
    // With 12 items and 5 picks the probability of identical results is negligible.
    expect(w2).not.toEqual(w1);
  });

  it('returned spells are a subset of the input pool', () => {
    const result = getWeeklySpells(POOL, '2026-20');
    const ids = new Set(POOL.map((s) => s.id));
    result.forEach((s) => expect(ids.has(s.id)).toBe(true));
  });

  it('no duplicates in the returned set', () => {
    const result = getWeeklySpells(POOL, '2026-20');
    const seen = new Set(result.map((s) => s.id));
    expect(seen.size).toBe(result.length);
  });
});

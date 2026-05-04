import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  checkRequirement,
  describeRequirement,
  getHighlightedSpellDiceIndices,
  resolveSpell,
} from '../spells';
import type { SpellDiceRequirement, SpellEffect } from '@/types';
import type { Character, MonsterDef } from '@/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeChar(overrides: Partial<Character> = {}): Character {
  return {
    uid: 'test',
    name: 'Tester',
    class: 'warrior',
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    gold: 0,
    stats: { strength: 10, stamina: 10, agility: 10, health: 10, wisdom: 10, defense: 5 },
    equippedGear: { weapon: null, armor: null, accessory: null },
    createdAt: 0,
    ...overrides,
  };
}

function makeMonster(overrides: Partial<MonsterDef> = {}): MonsterDef {
  return {
    id: 'rat',
    name: 'Rat',
    level: 1,
    hp: 30,
    attack: 10,
    defense: 5,
    xpReward: 20,
    goldReward: 5,
    lootTable: [],
    description: '',
    ...overrides,
  };
}

afterEach(() => vi.restoreAllMocks());

// ── checkRequirement ──────────────────────────────────────────────────────────

describe('checkRequirement — sum_gte', () => {
  const req: SpellDiceRequirement = { type: 'sum_gte', diceCount: 3, value: 12 };

  it('passes when sum meets threshold exactly', () => {
    expect(checkRequirement(req, [4, 4, 4])).toBe(true);
  });

  it('passes when sum exceeds threshold', () => {
    expect(checkRequirement(req, [6, 6, 6])).toBe(true);
  });

  it('fails when sum is below threshold', () => {
    expect(checkRequirement(req, [1, 2, 3])).toBe(false); // sum = 6
  });
});

describe('checkRequirement — exact_value', () => {
  const req: SpellDiceRequirement = { type: 'exact_value', diceCount: 3, value: 6 };

  it('passes when at least one die shows the target value', () => {
    expect(checkRequirement(req, [1, 3, 6])).toBe(true);
  });

  it('passes when multiple dice show the value', () => {
    expect(checkRequirement(req, [6, 6, 6])).toBe(true);
  });

  it('fails when no die matches the value', () => {
    expect(checkRequirement(req, [1, 2, 3])).toBe(false);
  });
});

describe('checkRequirement — pair', () => {
  const req: SpellDiceRequirement = { type: 'pair', diceCount: 3 };

  it('passes with exactly one pair', () => {
    expect(checkRequirement(req, [2, 2, 5])).toBe(true);
  });

  it('passes with three of a kind (counts as a pair)', () => {
    expect(checkRequirement(req, [4, 4, 4])).toBe(true);
  });

  it('fails with all different values', () => {
    expect(checkRequirement(req, [1, 2, 3])).toBe(false);
  });
});

describe('checkRequirement — three_of_a_kind', () => {
  const req: SpellDiceRequirement = { type: 'three_of_a_kind', diceCount: 3 };

  it('passes with exactly three matching', () => {
    expect(checkRequirement(req, [5, 5, 5])).toBe(true);
  });

  it('fails with only a pair', () => {
    expect(checkRequirement(req, [3, 3, 6])).toBe(false);
  });
});

describe('checkRequirement — straight', () => {
  const req3: SpellDiceRequirement = { type: 'straight', diceCount: 3, length: 3 };
  const req4: SpellDiceRequirement = { type: 'straight', diceCount: 4, length: 4 };

  it('detects a 3-length straight', () => {
    expect(checkRequirement(req3, [1, 2, 3])).toBe(true);
    expect(checkRequirement(req3, [2, 3, 4])).toBe(true);
    expect(checkRequirement(req3, [4, 5, 6])).toBe(true);
  });

  it('detects a straight even when dice are unordered', () => {
    expect(checkRequirement(req3, [3, 1, 2])).toBe(true);
  });

  it('fails when no 3 consecutive values exist', () => {
    expect(checkRequirement(req3, [1, 3, 5])).toBe(false);
    expect(checkRequirement(req3, [2, 2, 4])).toBe(false);
  });

  it('detects a 4-length straight', () => {
    expect(checkRequirement(req4, [1, 2, 3, 4])).toBe(true);
    expect(checkRequirement(req4, [3, 4, 5, 6])).toBe(true);
  });

  it('fails a 4-straight requirement with only 3 consecutive', () => {
    expect(checkRequirement(req4, [1, 2, 3, 1])).toBe(false);
  });
});

// ── describeRequirement ───────────────────────────────────────────────────────

describe('describeRequirement', () => {
  it('formats sum_gte correctly', () => {
    const req: SpellDiceRequirement = { type: 'sum_gte', diceCount: 3, value: 12 };
    expect(describeRequirement(req)).toBe('Roll 3d6 — total ≥ 12');
  });

  it('formats exact_value correctly', () => {
    const req: SpellDiceRequirement = { type: 'exact_value', diceCount: 2, value: 6 };
    expect(describeRequirement(req)).toBe('Roll 2d6 — get at least one 6');
  });

  it('formats pair correctly', () => {
    const req: SpellDiceRequirement = { type: 'pair', diceCount: 3 };
    expect(describeRequirement(req)).toBe('Roll 3d6 — get any pair');
  });

  it('formats three_of_a_kind correctly', () => {
    const req: SpellDiceRequirement = { type: 'three_of_a_kind', diceCount: 3 };
    expect(describeRequirement(req)).toBe('Roll 3d6 — get three of a kind');
  });

  it('formats straight correctly with length', () => {
    const req: SpellDiceRequirement = { type: 'straight', diceCount: 4, length: 4 };
    expect(describeRequirement(req)).toBe('Roll 4d6 — get a straight of 4');
  });
});

// ── getHighlightedSpellDiceIndices ────────────────────────────────────────────

describe('getHighlightedSpellDiceIndices', () => {
  it('returns empty array when requirement is not met', () => {
    const req: SpellDiceRequirement = { type: 'sum_gte', diceCount: 3, value: 18 };
    expect(getHighlightedSpellDiceIndices([1, 1, 1], req)).toEqual([]);
  });

  it('sum_gte highlights all dice', () => {
    const req: SpellDiceRequirement = { type: 'sum_gte', diceCount: 3, value: 10 };
    const indices = getHighlightedSpellDiceIndices([4, 3, 5], req);
    expect(indices).toEqual([0, 1, 2]);
  });

  it('exact_value highlights only matching dice', () => {
    const req: SpellDiceRequirement = { type: 'exact_value', diceCount: 3, value: 6 };
    const indices = getHighlightedSpellDiceIndices([1, 6, 6], req);
    expect(indices).toContain(1);
    expect(indices).toContain(2);
    expect(indices).not.toContain(0);
  });

  it('pair highlights exactly two matching indices', () => {
    const req: SpellDiceRequirement = { type: 'pair', diceCount: 3 };
    const indices = getHighlightedSpellDiceIndices([3, 3, 5], req);
    expect(indices).toHaveLength(2);
    expect(indices).toContain(0);
    expect(indices).toContain(1);
  });

  it('three_of_a_kind highlights exactly three matching indices', () => {
    const req: SpellDiceRequirement = { type: 'three_of_a_kind', diceCount: 3 };
    const indices = getHighlightedSpellDiceIndices([4, 4, 4], req);
    expect(indices).toHaveLength(3);
  });

  it('straight highlights one die per value in the run', () => {
    const req: SpellDiceRequirement = { type: 'straight', diceCount: 3, length: 3 };
    const indices = getHighlightedSpellDiceIndices([1, 2, 3], req);
    expect(indices).toHaveLength(3);
  });
});

// ── resolveSpell ──────────────────────────────────────────────────────────────

describe('resolveSpell', () => {
  const damageEffect: SpellEffect = { damage: 20 };
  const healEffect: SpellEffect = { heal: 15 };
  const stunEffect: SpellEffect = { stun: true, damage: 10 };

  // Requirement that always passes: sum_gte 3 with value 3 (minimum roll on 3d6 is 3)
  const alwaysPass: SpellDiceRequirement = { type: 'sum_gte', diceCount: 3, value: 3 };
  // Requirement that always fails: exact_value 6 on 1d6 forced to roll 1
  const alwaysFail: SpellDiceRequirement = { type: 'exact_value', diceCount: 1, value: 6 };

  it('deals damage after defense when requirement is met', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // dice rolls + def checks all use 0.5

    const char = makeChar();
    const monster = makeMonster({ defense: 5 });
    const result = resolveSpell(damageEffect, alwaysPass, char, monster);

    expect(result.requirementMet).toBe(true);
    expect(result.playerDamage).toBe(Math.max(1, 20 - 5)); // 20 damage - 5 defense
  });

  it('bypasses monster defense when bypassMonsterDef is true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const effect: SpellEffect = { damage: 20, bypassMonsterDef: true };
    const result = resolveSpell(effect, alwaysPass, makeChar(), makeMonster({ defense: 999 }));
    expect(result.playerDamage).toBe(20);
  });

  it('scales damage with wisdom when damageScalesWithWisdom is true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const effect: SpellEffect = {
      damage: 10,
      damageScalesWithWisdom: true,
      bypassMonsterDef: true,
    };
    const char = makeChar({
      stats: { strength: 10, stamina: 10, agility: 10, health: 10, wisdom: 15, defense: 5 },
    });
    const result = resolveSpell(effect, alwaysPass, char, makeMonster({ defense: 0 }));
    expect(result.playerDamage).toBe(10 + 15); // base + wisdom
  });

  it('restores HP via heal effect', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = resolveSpell(healEffect, alwaysPass, makeChar(), makeMonster());
    expect(result.healAmount).toBe(15);
  });

  it('stuns monster, preventing counter-attack', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = resolveSpell(stunEffect, alwaysPass, makeChar(), makeMonster());
    expect(result.monsterStunned).toBe(true);
    expect(result.monsterDamage).toBe(0);
  });

  it('fizzles with no effect when requirement is not met', () => {
    // force dice roll to 1 so exact_value 6 always fails
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0) // rollSpellDice → rolls a 1
      .mockReturnValue(0.5); // remaining calls (monster retaliation)

    const result = resolveSpell(damageEffect, alwaysFail, makeChar(), makeMonster());
    expect(result.requirementMet).toBe(false);
    expect(result.playerDamage).toBe(0);
    expect(result.healAmount).toBe(0);
  });

  it('monster still retaliates when spell fizzles', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0) // dice → 1 (fails exact 6)
      .mockReturnValue(0.5); // monster roll + def check

    const result = resolveSpell(damageEffect, alwaysFail, makeChar(), makeMonster({ attack: 15 }));
    expect(result.monsterDamage).toBeGreaterThanOrEqual(1);
  });
});

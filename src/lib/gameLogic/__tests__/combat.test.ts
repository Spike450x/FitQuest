import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  playerMaxHp,
  playerMaxStamina,
  playerMaxMagic,
  totalGearBonuses,
  gearAttackBonus,
  gearDefenseBonus,
  calculateRound,
  rollLoot,
  rollRunAway,
} from '../combat';
import { COMBAT } from '../constants';
import type { Character, EquippedGear, MonsterDef } from '@/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_STATS = {
  strength: 10,
  stamina: 10,
  agility: 10,
  health: 10,
  wisdom: 10,
  defense: 10,
};

function makeChar(overrides: Partial<Character> = {}): Character {
  return {
    uid: 'test',
    name: 'Tester',
    class: 'warrior',
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    gold: 0,
    stats: { ...BASE_STATS },
    equippedGear: { weapon: null, armor: null, accessory: null },
    createdAt: 0,
    ...overrides,
  };
}

function makeMonster(overrides: Partial<MonsterDef> = {}): MonsterDef {
  return {
    id: 'rat',
    name: 'Giant Rat',
    level: 1,
    hp: 30,
    attack: 8,
    defense: 3,
    xpReward: 20,
    goldReward: 5,
    lootTable: [],
    description: '',
    ...overrides,
  };
}

afterEach(() => vi.restoreAllMocks());

// ── playerMaxHp ───────────────────────────────────────────────────────────────

describe('playerMaxHp', () => {
  it('matches BASE_HP + stamina*HP_PER_STAMINA + health*HP_PER_HEALTH', () => {
    const char = makeChar();
    const expected = COMBAT.BASE_HP + 10 * COMBAT.HP_PER_STAMINA + 10 * COMBAT.HP_PER_HEALTH;
    expect(playerMaxHp(char)).toBe(expected);
  });

  it('scales linearly with stamina', () => {
    const low = makeChar({ stats: { ...BASE_STATS, stamina: 5 } });
    const high = makeChar({ stats: { ...BASE_STATS, stamina: 15 } });
    expect(playerMaxHp(high) - playerMaxHp(low)).toBe(10 * COMBAT.HP_PER_STAMINA);
  });

  it('returns same result for null and empty gear', () => {
    const withNull = playerMaxHp({
      stats: BASE_STATS,
      equippedGear: null as unknown as EquippedGear,
    });
    const withEmpty = playerMaxHp({
      stats: BASE_STATS,
      equippedGear: { weapon: null, armor: null, accessory: null },
    });
    expect(withNull).toBe(withEmpty);
  });
});

// ── playerMaxStamina ──────────────────────────────────────────────────────────

describe('playerMaxStamina', () => {
  it('matches BASE_STAMINA + stamina*STAMINA_PER_STAT', () => {
    const char = makeChar();
    const expected = COMBAT.BASE_STAMINA + 10 * COMBAT.STAMINA_PER_STAT;
    expect(playerMaxStamina(char)).toBe(expected);
  });
});

// ── playerMaxMagic ────────────────────────────────────────────────────────────

describe('playerMaxMagic', () => {
  it('wizards get WIZARD_MAGIC_BONUS on top of warrior baseline', () => {
    const warrior = makeChar({ class: 'warrior' });
    const wizard = makeChar({ class: 'wizard' });
    expect(playerMaxMagic(wizard) - playerMaxMagic(warrior)).toBe(COMBAT.WIZARD_MAGIC_BONUS);
  });

  it('scales with wisdom via MAGIC_PER_WISDOM', () => {
    const low = makeChar({ stats: { ...BASE_STATS, wisdom: 5 } });
    const high = makeChar({ stats: { ...BASE_STATS, wisdom: 15 } });
    expect(playerMaxMagic(high) - playerMaxMagic(low)).toBe(10 * COMBAT.MAGIC_PER_WISDOM);
  });
});

// ── totalGearBonuses ──────────────────────────────────────────────────────────

describe('totalGearBonuses', () => {
  it('returns empty object for null gear', () => {
    expect(totalGearBonuses(null)).toEqual({});
  });

  it('returns empty object when all slots are null', () => {
    expect(totalGearBonuses({ weapon: null, armor: null, accessory: null })).toEqual({});
  });

  it('returns stat bonuses from a real catalog weapon', () => {
    // worn-sword: common, +2 STR
    const bonuses = totalGearBonuses({ weapon: 'worn-sword', armor: null, accessory: null });
    expect(bonuses.strength).toBe(2);
  });

  it('stacks bonuses from multiple slots', () => {
    // worn-sword: +2 STR, oak-staff has WIS — use two known common items
    const bonuses = totalGearBonuses({
      weapon: 'worn-sword',
      armor: 'leather-vest',
      accessory: null,
    });
    expect(bonuses.strength).toBeGreaterThan(0);
  });
});

// ── gearAttackBonus / gearDefenseBonus ────────────────────────────────────────

describe('gearAttackBonus', () => {
  it('returns STR bonus for attack mode', () => {
    const char = makeChar({ equippedGear: { weapon: 'worn-sword', armor: null, accessory: null } });
    expect(gearAttackBonus(char, 'attack')).toBe(2); // worn-sword: +2 STR
  });

  it('returns WIS bonus for magic mode', () => {
    const char = makeChar({ equippedGear: { weapon: 'oak-staff', armor: null, accessory: null } });
    expect(gearAttackBonus(char, 'magic')).toBe(2); // oak-staff: +2 WIS
  });

  it('returns 0 when no relevant gear', () => {
    const char = makeChar();
    expect(gearAttackBonus(char, 'attack')).toBe(0);
    expect(gearAttackBonus(char, 'magic')).toBe(0);
  });
});

describe('gearDefenseBonus', () => {
  it('returns 0 when no armor equipped', () => {
    expect(gearDefenseBonus(makeChar())).toBe(0);
  });
});

// ── calculateRound ────────────────────────────────────────────────────────────

describe('calculateRound', () => {
  it('returns at least MIN_DAMAGE for both player and monster', () => {
    // Mock Math.random: all defense checks hold, all rolls return minimum
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0) // player d10 → 1 (min roll)
      .mockReturnValueOnce(1) // monster def check → holds (1 > DEFENSE_FAIL_CHANCE)
      .mockReturnValueOnce(0) // monster d10 counter → 1
      .mockReturnValueOnce(1); // player def check → holds

    const char = makeChar({ stats: { ...BASE_STATS, strength: 1, defense: 50 } });
    const monster = makeMonster({ attack: 5, defense: 50 });
    const result = calculateRound(char, monster, 'attack');

    expect(result.playerDamage).toBeGreaterThanOrEqual(COMBAT.MIN_DAMAGE);
    expect(result.monsterDamage).toBeGreaterThanOrEqual(COMBAT.MIN_DAMAGE);
  });

  it('uses WIS and labels bonus as WIS in magic mode', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const char = makeChar({ stats: { ...BASE_STATS, wisdom: 20 } });
    const result = calculateRound(char, makeMonster(), 'magic');
    expect(result.attackBonusLabel).toBe('WIS');
    expect(result.attackBonus).toBe(20); // wisdom * 1.0 factor
  });

  it('uses STR and labels bonus as STR in attack mode', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const char = makeChar({ stats: { ...BASE_STATS, strength: 15 } });
    const result = calculateRound(char, makeMonster(), 'attack');
    expect(result.attackBonusLabel).toBe('STR');
    expect(result.attackBonus).toBe(15);
  });

  it('bypasses monster defense when monsterDefFailed is true', () => {
    // Force monster def to fail, player roll = max
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9) // player d10 → 10
      .mockReturnValueOnce(0) // monster def check → 0 < DEFENSE_FAIL_CHANCE → fails
      .mockReturnValueOnce(0.5) // monster d10
      .mockReturnValueOnce(1); // player def holds

    const char = makeChar({ stats: { ...BASE_STATS, strength: 5 } });
    const monster = makeMonster({ defense: 999 }); // impossible to beat normally
    const result = calculateRound(char, monster, 'attack');

    expect(result.monsterDefFailed).toBe(true);
    expect(result.playerDamage).toBeGreaterThan(COMBAT.MIN_DAMAGE);
  });
});

// ── rollLoot ──────────────────────────────────────────────────────────────────

describe('rollLoot', () => {
  it('returns no items when all rolls are above chance', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999);
    const table = [
      { itemId: 'worn-sword', chance: 0.5 },
      { itemId: 'leather-vest', chance: 0.3 },
    ];
    expect(rollLoot(table)).toEqual([]);
  });

  it('returns all items when all rolls are 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const table = [
      { itemId: 'worn-sword', chance: 0.5 },
      { itemId: 'leather-vest', chance: 0.3 },
    ];
    expect(rollLoot(table)).toEqual(['worn-sword', 'leather-vest']);
  });

  it('does not modify common item chance with streak multiplier', () => {
    // worn-sword is common — streak should not affect it
    vi.spyOn(Math, 'random').mockReturnValue(0.6); // above 0.5 base chance
    const table = [{ itemId: 'worn-sword', chance: 0.5 }];
    // Even with 10× streak, common item chance stays at 0.5 — roll 0.6 should miss
    expect(rollLoot(table, 10)).toEqual([]);
  });

  it('applies streak multiplier to rare items but caps at 0.95', () => {
    // dragonbone-blade is rare — streak multiplies its chance, capped at 0.95
    // roll 0.94: below 0.95 cap → should drop with any streak ≥ 1
    vi.spyOn(Math, 'random').mockReturnValue(0.94);
    const table = [{ itemId: 'dragonbone-blade', chance: 0.1 }];
    // Without streak: 0.94 > 0.10 → no drop
    expect(rollLoot(table, 1)).toEqual([]);
    // With high streak (cap = 0.95): 0.94 < 0.95 → drops
    vi.restoreAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0.94);
    expect(rollLoot(table, 99)).toEqual(['dragonbone-blade']);
  });

  it('returns empty array for empty loot table', () => {
    expect(rollLoot([])).toEqual([]);
  });
});

// ── rollRunAway ───────────────────────────────────────────────────────────────

describe('rollRunAway', () => {
  it('escapes successfully when player roll + agility beats monster roll', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9) // player d10 → 10
      .mockReturnValueOnce(0); // monster d10 → 1

    const char = makeChar({ stats: { ...BASE_STATS, agility: 20 } });
    const result = rollRunAway(char, makeMonster());

    expect(result.escaped).toBe(true);
    expect(result.monsterDamage).toBe(0);
  });

  it('fails escape when monster roll beats player total', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0) // player d10 → 1
      .mockReturnValueOnce(0.9) // monster d10 → 10
      .mockReturnValueOnce(1); // player def check → holds

    const char = makeChar({ stats: { ...BASE_STATS, agility: 0, defense: 10 } });
    const result = rollRunAway(char, makeMonster({ attack: 5 }));

    expect(result.escaped).toBe(false);
    expect(result.monsterDamage).toBeGreaterThanOrEqual(COMBAT.MIN_DAMAGE);
  });
});

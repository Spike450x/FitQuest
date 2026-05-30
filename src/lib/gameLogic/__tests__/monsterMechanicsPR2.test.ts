import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  effectivePlayerDefenseVsMonster,
  monsterArmorPierce,
  monsterSiphonAmount,
  calculateRound,
} from '../combat';
import { MONSTER_CATALOG } from '../monsters';
import { DUNGEON_TIERS } from '../dungeons';
import type { Character, MonsterDef } from '@/types';

const BASE_STATS = {
  strength: 10,
  stamina: 10,
  agility: 10,
  health: 10,
  wisdom: 10,
  defense: 10,
  spirit: 0,
};

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    uid: 'test',
    name: 'T',
    class: 'warrior',
    level: 5,
    xp: 0,
    xpToNextLevel: 100,
    gold: 0,
    stats: BASE_STATS,
    equippedGear: { weapon: null, armor: null, accessory: null },
    createdAt: 0,
    ...overrides,
  } as Character;
}

function buildMonster(overrides: Partial<MonsterDef> = {}): MonsterDef {
  return {
    id: 'test-mon',
    name: 'Test Monster',
    level: 1,
    hp: 50,
    attack: 12,
    defense: 4,
    xpReward: 20,
    goldReward: 10,
    lootTable: [],
    description: '',
    ...overrides,
  };
}

afterEach(() => vi.restoreAllMocks());

// ─── armor-pierce ─────────────────────────────────────────────────────────────

describe('monsterArmorPierce', () => {
  it('returns the passive value when monster has armor-pierce', () => {
    const m = buildMonster({ passive: { id: 'armor-pierce', label: 'Sundering', value: 3 } });
    expect(monsterArmorPierce(m)).toBe(3);
  });

  it('returns 0 when the monster has a different passive', () => {
    const m = buildMonster({ passive: { id: 'thorns', label: 'Spikes', value: 10 } });
    expect(monsterArmorPierce(m)).toBe(0);
  });

  it('returns 0 when the monster has no passive', () => {
    expect(monsterArmorPierce(buildMonster())).toBe(0);
  });
});

describe('effectivePlayerDefenseVsMonster', () => {
  it('subtracts armor-pierce from the total def', () => {
    const ch = buildCharacter();
    const m = buildMonster({ passive: { id: 'armor-pierce', label: 'P', value: 4 } });
    expect(effectivePlayerDefenseVsMonster(ch, m, false)).toBe(10 - 4);
  });

  it('floors at 0 when pierce exceeds def', () => {
    const ch = buildCharacter({ stats: { ...BASE_STATS, defense: 2 } });
    const m = buildMonster({ passive: { id: 'armor-pierce', label: 'P', value: 10 } });
    expect(effectivePlayerDefenseVsMonster(ch, m, false)).toBe(0);
  });

  it('returns 0 when defense failed (short-circuit)', () => {
    const ch = buildCharacter();
    const m = buildMonster({ passive: { id: 'armor-pierce', label: 'P', value: 4 } });
    expect(effectivePlayerDefenseVsMonster(ch, m, true)).toBe(0);
  });

  it('ignores other passives', () => {
    const ch = buildCharacter();
    const m = buildMonster({ passive: { id: 'thorns', label: 'T', value: 20 } });
    expect(effectivePlayerDefenseVsMonster(ch, m, false)).toBe(10);
  });
});

describe('calculateRound applies armor-pierce', () => {
  it('lets a piercing monster do more damage than a plain attacker with same ATK', () => {
    // Force both defenses to NOT fail and both d10s to roll 5.
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const ch = buildCharacter();
    const plain = buildMonster({ attack: 20, defense: 0 });
    const pierce = buildMonster({
      attack: 20,
      defense: 0,
      passive: { id: 'armor-pierce', label: 'P', value: 5 },
    });

    const a = calculateRound(ch, plain, 'attack');
    const b = calculateRound(ch, pierce, 'attack');
    // Pierce monster bypasses 5 DEF → +5 monster damage on the player.
    expect(b.monsterDamage - a.monsterDamage).toBe(5);
  });
});

// ─── siphon ───────────────────────────────────────────────────────────────────

describe('monsterSiphonAmount', () => {
  it('returns the passive value when monster has siphon', () => {
    const m = buildMonster({ passive: { id: 'siphon', label: 'Grip', value: 2 } });
    expect(monsterSiphonAmount(m)).toBe(2);
  });

  it('returns 0 when the monster has a different passive', () => {
    const m = buildMonster({ passive: { id: 'regen', label: 'Heal', value: 5 } });
    expect(monsterSiphonAmount(m)).toBe(0);
  });
});

// ─── catalog + dungeon pool integration ───────────────────────────────────────

describe('PR2 monster catalog', () => {
  it('adds the 10 new monsters to MONSTER_CATALOG', () => {
    const ids = new Set(MONSTER_CATALOG.map((m) => m.id));
    for (const id of [
      'mud-imp',
      'boar-runt',
      'bog-lurker',
      'iron-husk',
      'frost-wraith',
      'gloom-knight',
      'obsidian-golem',
      'ashwyrm',
      'void-revenant',
      'storm-djinn',
    ]) {
      expect(ids.has(id), `${id} missing from catalog`).toBe(true);
    }
  });

  it('covers levels 11–14 (the bridge to Dragon King boss at 15)', () => {
    const levels = new Set(MONSTER_CATALOG.map((m) => m.level));
    expect(levels.has(11)).toBe(true);
    expect(levels.has(12)).toBe(true);
    expect(levels.has(13)).toBe(true);
    expect(levels.has(14)).toBe(true);
  });

  it('storm-djinn carries BOTH a passive and an active', () => {
    const m = MONSTER_CATALOG.find((mon) => mon.id === 'storm-djinn')!;
    expect(m.passive?.id).toBe('vampiric');
    expect(m.active?.id).toBe('enrage');
  });

  it('void-revenant uses summon-add active', () => {
    const m = MONSTER_CATALOG.find((mon) => mon.id === 'void-revenant')!;
    expect(m.active).toEqual({
      id: 'summon-add',
      triggerPct: 0.5,
      label: 'Echo Reinforcements',
      value: 60,
    });
  });
});

describe('Dungeon monsterPool extension', () => {
  it('dark-sanctum pool includes iron-husk and gloom-knight', () => {
    const pool = DUNGEON_TIERS['dark-sanctum'].monsterPool;
    expect(pool).toContain('iron-husk');
    expect(pool).toContain('gloom-knight');
  });

  it('dragons-keep pool includes all four L11–14 monsters', () => {
    const pool = DUNGEON_TIERS['dragons-keep'].monsterPool;
    for (const id of ['obsidian-golem', 'ashwyrm', 'void-revenant', 'storm-djinn']) {
      expect(pool).toContain(id);
    }
  });
});

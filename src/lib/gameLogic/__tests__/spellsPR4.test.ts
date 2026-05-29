import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveSpellAction, resolveAttackAction, type ActionInput } from '../combatActions';
import { getItemById, ITEM_CATALOG } from '../items';
import { spellEffectKey } from '@/lib/entityArt';
import { LEGENDARY_ITEM_IDS } from '../../../../functions/src/gameLogic/achievements';
import type { FightState } from '@/components/combat/types';
import type { Character, ItemDef, MonsterDef } from '@/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_STATS = {
  strength: 10,
  stamina: 10,
  agility: 10,
  health: 10,
  wisdom: 10,
  defense: 10,
  spirit: 0,
};

function makeChar(overrides: Partial<Character> = {}): Character {
  return {
    uid: 'test',
    name: 'Tester',
    class: 'wizard',
    level: 5,
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
    id: 'dummy',
    name: 'Training Dummy',
    level: 1,
    hp: 500,
    attack: 8,
    defense: 3,
    xpReward: 20,
    goldReward: 5,
    lootTable: [],
    description: '',
    ...overrides,
  };
}

function makeFightState(overrides: Partial<FightState> = {}): FightState {
  const monster = overrides.monster ?? makeMonster();
  return {
    monster,
    playerHp: 200,
    playerStartHp: 200,
    playerStamina: 50,
    playerMagic: 60,
    monsterHp: monster.hp,
    log: [],
    outcome: null,
    droppedItems: [],
    isFirstAbility: true,
    executeUsed: false,
    ...overrides,
  };
}

function makeInput(overrides: Partial<ActionInput> = {}): ActionInput {
  return {
    state: makeFightState(),
    character: makeChar(),
    maxHp: 200,
    maxStamina: 50,
    maxMagic: 60,
    streakMultiplier: 1.0,
    getPityFor: () => 0,
    modifiers: undefined,
    ...overrides,
  };
}

/** A test spell that always meets its requirement (sum ≥ 2) and applies a DoT. */
function makeBleedSpell(id: string, perRound: number, rounds: number): ItemDef {
  return {
    id,
    name: `Test Bleed ${id}`,
    type: 'spell',
    rarity: 'rare',
    tier: 3,
    price: 100,
    statBonuses: {},
    description: '',
    spellMechanics: {
      requirement: { type: 'sum_gte', diceCount: 2, value: 2 },
      effect: { damage: 0, dotDamage: { perRound, rounds } },
      magicCost: 2,
      classRestriction: 'all',
    },
  };
}

afterEach(() => vi.restoreAllMocks());

// ── DoT application + ticking ───────────────────────────────────────────────────

describe('dotDamage — application and ticking', () => {
  it('a successful bleed cast applies a DoT to monsterDots', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const spell = makeBleedSpell('test-bleed', 10, 3);
    const res = resolveSpellAction(makeInput(), spell);
    expect(res.nextState.monsterDots).toEqual([
      { key: 'test-bleed', label: spell.name, perRound: 10, roundsRemaining: 3 },
    ]);
  });

  it('the DoT does NOT tick on the round it is applied', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const spell = makeBleedSpell('test-bleed', 10, 3);
    const start = makeFightState({ monsterHp: 500 });
    const res = resolveSpellAction(makeInput({ state: start }), spell);
    // Spell deals 0 direct damage; no DoT tick yet → monster HP unchanged.
    expect(res.nextState.monsterHp).toBe(500);
    expect(res.nextState.log[0].monsterDotDamage).toBeUndefined();
  });

  it('ticks bleed damage at the start of the next offensive action and decrements the timer', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // high def-fail avoidance + max roll
    const spell = makeBleedSpell('test-bleed', 10, 3);
    const afterCast = resolveSpellAction(makeInput(), spell).nextState;

    const hpBefore = afterCast.monsterHp;
    const afterAttack = resolveAttackAction(makeInput({ state: afterCast }), 'attack');
    // Monster lost the 10 bleed PLUS the attack damage — assert the bleed slice.
    expect(afterAttack.nextState.log.at(-1)?.monsterDotDamage).toBe(10);
    expect(afterAttack.nextState.monsterHp).toBeLessThanOrEqual(hpBefore - 10);
    // Timer ticked 3 → 2.
    expect(afterAttack.nextState.monsterDots?.[0].roundsRemaining).toBe(2);
  });

  it('expires the DoT after `rounds` ticks', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const spell = makeBleedSpell('test-bleed', 8, 2);
    let state = resolveSpellAction(makeInput(), spell).nextState;
    // Tick 1
    state = resolveAttackAction(makeInput({ state }), 'attack').nextState;
    expect(state.monsterDots?.[0].roundsRemaining).toBe(1);
    // Tick 2 — last tick, then dropped
    state = resolveAttackAction(makeInput({ state }), 'attack').nextState;
    expect(state.monsterDots).toEqual([]);
    // Tick 3 — nothing left to bleed
    const after = resolveAttackAction(makeInput({ state }), 'attack');
    expect(after.nextState.log.at(-1)?.monsterDotDamage).toBeUndefined();
  });

  it('re-casting the same spell refreshes its stack (no double entry)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const spell = makeBleedSpell('test-bleed', 10, 3);
    const first = resolveSpellAction(makeInput(), spell).nextState;
    // Cast again: runPreAction ticks it (3→2), then re-application refreshes to 3.
    const second = resolveSpellAction(makeInput({ state: first }), spell).nextState;
    expect(second.monsterDots).toHaveLength(1);
    expect(second.monsterDots?.[0].roundsRemaining).toBe(3);
  });

  it('different bleed spells stack as separate entries', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const a = makeBleedSpell('bleed-a', 10, 3);
    const b = makeBleedSpell('bleed-b', 5, 2);
    const afterA = resolveSpellAction(makeInput(), a).nextState;
    const afterB = resolveSpellAction(makeInput({ state: afterA }), b).nextState;
    const keys = (afterB.monsterDots ?? []).map((d) => d.key).sort();
    expect(keys).toEqual(['bleed-a', 'bleed-b']);
  });

  it('two stacked DoTs tick their combined damage in one round', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const a = makeBleedSpell('bleed-a', 10, 3);
    const b = makeBleedSpell('bleed-b', 5, 3);
    let state = resolveSpellAction(makeInput(), a).nextState;
    state = resolveSpellAction(makeInput({ state }), b).nextState;
    // Next offensive action ticks both: 10 + 5 = 15 (bleed-a already had 1 tick
    // pending from the b-cast round). Assert the most recent tick is 15.
    const after = resolveAttackAction(makeInput({ state }), 'attack');
    expect(after.nextState.log.at(-1)?.monsterDotDamage).toBe(15);
  });

  it('a bleed tick that empties monster HP ends the fight as a win', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const spell = makeBleedSpell('test-bleed', 40, 3);
    // Monster at 30 HP, bleed 40 → dies on the next tick.
    const lowMonster = makeMonster({ hp: 500 });
    const start = makeFightState({ monster: lowMonster, monsterHp: 30 });
    const afterCast = resolveSpellAction(makeInput({ state: start }), spell).nextState;
    expect(afterCast.monsterHp).toBe(30); // not yet ticked

    const afterTick = resolveAttackAction(makeInput({ state: afterCast }), 'attack');
    expect(afterTick.nextState.monsterHp).toBe(0);
    expect(afterTick.nextState.outcome).toBe('win');
  });

  it('a fizzled cast (requirement not met) applies no DoT', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const spell: ItemDef = {
      ...makeBleedSpell('test-bleed', 10, 3),
      spellMechanics: {
        requirement: { type: 'sum_gte', diceCount: 2, value: 13 }, // impossible (max 12)
        effect: { damage: 0, dotDamage: { perRound: 10, rounds: 3 } },
        magicCost: 2,
        classRestriction: 'all',
      },
    };
    const res = resolveSpellAction(makeInput(), spell);
    expect(res.nextState.monsterDots ?? []).toEqual([]);
  });
});

// ── spellEffectKey routing ──────────────────────────────────────────────────────

describe('spellEffectKey — DoT spells route to the fire school', () => {
  it('a damage+dot spell maps to fire', () => {
    expect(spellEffectKey({ damage: 18, dotDamage: { perRound: 8, rounds: 3 } })).toBe('fire');
  });

  it('a stun spell still wins over dot (stun is the headline)', () => {
    expect(spellEffectKey({ damage: 38, stun: true, dotDamage: { perRound: 9, rounds: 2 } })).toBe(
      'magic-damage',
    );
  });

  it('a lifesteal+dot spell still routes to lifesteal', () => {
    expect(
      spellEffectKey({ damage: 35, lifestealPct: 0.6, dotDamage: { perRound: 8, rounds: 3 } }),
    ).toBe('lifesteal');
  });
});

// ── Catalog registration ────────────────────────────────────────────────────────

const PR4_BUYABLE_SPELLS = [
  'spell-cinder-spark',
  'spell-soothing-light',
  'spell-emberstorm',
  'spell-radiant-bulwark',
  'spell-cataclysm',
  'spell-divine-sanctuary',
  'spell-rending-cleave',
  'spell-seismic-slam',
  'spell-incinerate',
  'spell-glacial-prison',
  'spell-rupture',
];

const PR4_LEGENDARY_SPELLS = [
  'spell-worldbreaker',
  'spell-stellar-collapse',
  'spell-thousand-cuts',
];

describe('PR4 spell catalog — 14 new spells', () => {
  it('grows the spell catalog to 35', () => {
    const spells = ITEM_CATALOG.filter((i) => i.type === 'spell');
    expect(spells).toHaveLength(35);
  });

  it('registers 11 buyable + 3 legendary new spells', () => {
    expect(PR4_BUYABLE_SPELLS).toHaveLength(11);
    expect(PR4_LEGENDARY_SPELLS).toHaveLength(3);
    for (const id of [...PR4_BUYABLE_SPELLS, ...PR4_LEGENDARY_SPELLS]) {
      const def = getItemById(id);
      expect(def, `${id} missing`).toBeDefined();
      expect(def?.type).toBe('spell');
      expect(def?.spellMechanics).toBeDefined();
    }
  });

  it('the 11 buyable spells are NOT loot-only (they grow the shop rotation)', () => {
    for (const id of PR4_BUYABLE_SPELLS) {
      expect(getItemById(id)?.lootOnly ?? false, `${id} should be buyable`).toBe(false);
    }
  });

  it('the 3 legendary spells are loot-only and in LEGENDARY_ITEM_IDS', () => {
    for (const id of PR4_LEGENDARY_SPELLS) {
      const def = getItemById(id);
      expect(def?.rarity).toBe('legendary');
      expect(def?.lootOnly).toBe(true);
      expect(LEGENDARY_ITEM_IDS.has(id), `${id} missing from LEGENDARY_ITEM_IDS`).toBe(true);
    }
  });

  it('the wizard legendary uses a 5d6 three-of-a-kind requirement', () => {
    const sm = getItemById('spell-stellar-collapse')?.spellMechanics;
    expect(sm?.requirement.diceCount).toBe(5);
    expect(sm?.requirement.type).toBe('three_of_a_kind');
    expect(sm?.effect.dotDamage).toEqual({ perRound: 10, rounds: 3 });
  });
});

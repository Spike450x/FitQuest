import { describe, it, expect } from 'vitest';
import { effectiveStat, classDodgeChance, rollClassDodge, resolveRoundOutcome } from '../combat';
import { CLASS_DEFINITIONS, COMBAT } from '../constants';
import type { Character, CharacterClass, MonsterDef, Stats } from '@/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_STATS: Stats = {
  strength: 10,
  stamina: 10,
  agility: 10,
  health: 10,
  wisdom: 10,
  defense: 10,
  spirit: 10,
};

function makeChar(charClass: CharacterClass, overrides: Partial<Stats> = {}): Character {
  return {
    uid: 'test',
    name: 'Tester',
    class: charClass,
    level: 10,
    xp: 0,
    xpToNextLevel: 100,
    gold: 0,
    stats: { ...BASE_STATS, ...overrides },
    equippedGear: { weapon: null, armor: null, accessory: null },
    createdAt: 0,
  } as Character;
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

// ── effectiveStat ───────────────────────────────────────────────────────────

describe('effectiveStat', () => {
  it('scales a stat by the class multiplier and floors', () => {
    for (const charClass of ['warrior', 'wizard', 'rogue'] as CharacterClass[]) {
      const char = makeChar(charClass);
      const mults = CLASS_DEFINITIONS[charClass].statMultipliers;
      for (const key of Object.keys(BASE_STATS) as (keyof Stats)[]) {
        expect(effectiveStat(char, key)).toBe(Math.floor(BASE_STATS[key] * mults[key]));
      }
    }
  });

  it('makes the advertised affinities real (Warrior STR up, Wizard DEF down)', () => {
    const warrior = makeChar('warrior');
    const wizard = makeChar('wizard');
    // Warrior hits harder physically than a Wizard at equal base STR.
    expect(effectiveStat(warrior, 'strength')).toBeGreaterThan(effectiveStat(wizard, 'strength'));
    // Wizard is squishier — lower effective DEF at equal base DEF.
    expect(effectiveStat(wizard, 'defense')).toBeLessThan(effectiveStat(warrior, 'defense'));
    // Wizard out-casts the Warrior at equal base WIS.
    expect(effectiveStat(wizard, 'wisdom')).toBeGreaterThan(effectiveStat(warrior, 'wisdom'));
  });

  it('floors negative/zero base stats at 0', () => {
    const char = makeChar('warrior', { strength: 0 });
    expect(effectiveStat(char, 'strength')).toBe(0);
  });
});

// ── classDodgeChance / rollClassDodge ─────────────────────────────────────────

describe('classDodgeChance', () => {
  it('is zero for non-rogue classes', () => {
    expect(classDodgeChance(makeChar('warrior'))).toBe(0);
    expect(classDodgeChance(makeChar('wizard'))).toBe(0);
  });

  it('scales with the rogue effective agility', () => {
    const lowAgi = makeChar('rogue', { agility: 4 });
    const highAgi = makeChar('rogue', { agility: 20 });
    expect(classDodgeChance(highAgi)).toBeGreaterThan(classDodgeChance(lowAgi));
    const expected = effectiveStat(lowAgi, 'agility') * COMBAT.ROGUE_DODGE_PER_AGILITY;
    expect(classDodgeChance(lowAgi)).toBeCloseTo(expected, 6);
  });

  it('never exceeds the cap', () => {
    const maxedAgi = makeChar('rogue', { agility: 50 });
    expect(classDodgeChance(maxedAgi)).toBe(COMBAT.ROGUE_DODGE_CAP);
  });
});

describe('rollClassDodge', () => {
  it('dodges when the roll lands under the chance', () => {
    const rogue = makeChar('rogue', { agility: 20 });
    expect(rollClassDodge(rogue, () => 0)).toBe(true);
  });

  it('does not dodge when the roll is above the chance', () => {
    const rogue = makeChar('rogue', { agility: 20 });
    expect(rollClassDodge(rogue, () => 0.999)).toBe(false);
  });

  it('never dodges for a non-rogue regardless of roll', () => {
    expect(rollClassDodge(makeChar('warrior'), () => 0)).toBe(false);
  });
});

// ── dodge wiring in resolveRoundOutcome ───────────────────────────────────────

describe('resolveRoundOutcome dodge', () => {
  const baseInput = (character: Character, dodgeRng: () => number) => ({
    newMonsterHp: 20, // monster survives → incoming hit lands
    preIncomingPlayerHp: 100,
    playerMagicBeforeBarrier: 30,
    rawMonsterDamage: 15,
    passiveCtx: {
      currentHpPct: 1,
      currentMagic: 30,
      isFirstAbility: false,
      executeUsed: false,
      roll: 5,
    },
    snapshot: { monster: makeMonster(), droppedItems: [] as string[] },
    character,
    maxHp: 100,
    maxMagic: 30,
    streakMultiplier: 1,
    getPityFor: () => 0,
    dodgeRng,
  });

  it('fully negates the incoming hit for a dodging rogue', () => {
    const rogue = makeChar('rogue', { agility: 20 });
    const result = resolveRoundOutcome(baseInput(rogue, () => 0));
    expect(result.dodged).toBe(true);
    expect(result.incoming.damage).toBe(0);
    expect(result.finalPlayerHp).toBe(100);
  });

  it('takes damage when the rogue fails the dodge roll', () => {
    const rogue = makeChar('rogue', { agility: 20 });
    const result = resolveRoundOutcome(baseInput(rogue, () => 0.999));
    expect(result.dodged).toBe(false);
    expect(result.incoming.damage).toBe(15);
    expect(result.finalPlayerHp).toBe(85);
  });

  it('never dodges for a non-rogue', () => {
    const warrior = makeChar('warrior');
    const result = resolveRoundOutcome(baseInput(warrior, () => 0));
    expect(result.dodged).toBe(false);
    expect(result.finalPlayerHp).toBe(85);
  });
});

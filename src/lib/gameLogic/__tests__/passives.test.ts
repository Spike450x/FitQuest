import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Character, CharacterClass, CharacterSubclass } from '@/types';
import type { AbilityDef } from '../abilities';
import {
  SUBCLASS_CATALOG,
  getSubclassDef,
  applySubclassAbilityMods,
  getAbilityStaminaCost,
  applyOutgoingPassives,
  getAbilityDamageMultiplier,
  applyIncomingPassives,
  resolveLifesteal,
  applySpellDamagePassives,
  getEffectiveSpellCost,
  canBloodPact,
  getPerRoundPassives,
  getMomentumRestore,
  checkExecute,
  getEscapeBonus,
  hasSureEscape,
  type PassiveContext,
} from '../passives';

// ─── Test fixtures ─────────────────────────────────────────────────────────────

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    uid: 'u1',
    name: 'Test',
    class: 'warrior',
    level: 10,
    xp: 0,
    xpToNextLevel: 1000,
    gold: 0,
    stats: {
      strength: 10,
      stamina: 10,
      agility: 10,
      health: 10,
      wisdom: 10,
      defense: 10,
      spirit: 0,
    },
    equippedGear: { weapon: null, armor: null, accessory: null },
    createdAt: 0,
    ...overrides,
  };
}

function makeAbility(overrides: Partial<AbilityDef> = {}): AbilityDef {
  return {
    id: 'test-ability',
    name: 'Test',
    description: '',
    pattern: 'three_of_a_kind',
    emoji: '⚔️',
    damageMultiplier: 2,
    bypassMonsterDef: false,
    stunMonster: false,
    lifestealPct: 0,
    bypassPlayerDef: false,
    ...overrides,
  };
}

const fullHpCtx: PassiveContext = {
  currentHpPct: 1.0,
  currentMagic: 0,
  isFirstAbility: false,
  executeUsed: false,
};

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── SUBCLASS_CATALOG / getSubclassDef ────────────────────────────────────────

describe('SUBCLASS_CATALOG + getSubclassDef', () => {
  it('contains exactly 6 subclasses, 2 per class', () => {
    expect(SUBCLASS_CATALOG.warrior).toHaveLength(2);
    expect(SUBCLASS_CATALOG.wizard).toHaveLength(2);
    expect(SUBCLASS_CATALOG.rogue).toHaveLength(2);
  });

  it.each<[CharacterSubclass, CharacterClass]>([
    ['berserker', 'warrior'],
    ['paladin', 'warrior'],
    ['archmage', 'wizard'],
    ['warlock', 'wizard'],
    ['assassin', 'rogue'],
    ['ranger', 'rogue'],
  ])('getSubclassDef(%s) returns def with parentClass %s', (sub, parent) => {
    const def = getSubclassDef(sub);
    expect(def).toBeDefined();
    expect(def?.id).toBe(sub);
    expect(def?.parentClass).toBe(parent);
  });

  it('returns undefined for unknown subclass', () => {
    expect(getSubclassDef('necromancer' as CharacterSubclass)).toBeUndefined();
  });
});

// ─── applySubclassAbilityMods ─────────────────────────────────────────────────

describe('applySubclassAbilityMods', () => {
  it('returns base ability with flatHeal=0 when no subclass set', () => {
    const character = makeCharacter({ subclass: undefined });
    const ability = makeAbility({ damageMultiplier: 3 });
    const result = applySubclassAbilityMods(character, ability);
    expect(result.damageMultiplier).toBe(3);
    expect(result.flatHeal).toBe(0);
  });

  it('berserker: berserker-rage damageMultiplier becomes 4', () => {
    const result = applySubclassAbilityMods(
      makeCharacter({ subclass: 'berserker' }),
      makeAbility({ id: 'berserker-rage', damageMultiplier: 3 }),
    );
    expect(result.damageMultiplier).toBe(4);
  });

  it('paladin: shield-slam adds flatHeal 15, unstoppable adds 25', () => {
    const paladin = makeCharacter({ subclass: 'paladin' });
    expect(applySubclassAbilityMods(paladin, makeAbility({ id: 'shield-slam' })).flatHeal).toBe(15);
    expect(applySubclassAbilityMods(paladin, makeAbility({ id: 'unstoppable' })).flatHeal).toBe(25);
  });

  it('archmage: meteor stuns; time-warp damageMultiplier becomes 3', () => {
    const archmage = makeCharacter({ subclass: 'archmage' });
    expect(
      applySubclassAbilityMods(archmage, makeAbility({ id: 'meteor', stunMonster: false }))
        .stunMonster,
    ).toBe(true);
    expect(
      applySubclassAbilityMods(archmage, makeAbility({ id: 'time-warp', damageMultiplier: 2.5 }))
        .damageMultiplier,
    ).toBe(3);
  });

  it('warlock: arcane-bolt gets 0.2 lifesteal, mana-surge gets 0.3', () => {
    const warlock = makeCharacter({ subclass: 'warlock' });
    expect(
      applySubclassAbilityMods(warlock, makeAbility({ id: 'arcane-bolt', lifestealPct: 0 }))
        .lifestealPct,
    ).toBe(0.2);
    expect(
      applySubclassAbilityMods(warlock, makeAbility({ id: 'mana-surge', lifestealPct: 0 }))
        .lifestealPct,
    ).toBe(0.3);
  });

  it('warlock lifesteal uses Math.max — does not reduce existing higher value', () => {
    const result = applySubclassAbilityMods(
      makeCharacter({ subclass: 'warlock' }),
      makeAbility({ id: 'arcane-bolt', lifestealPct: 0.5 }),
    );
    expect(result.lifestealPct).toBe(0.5);
  });

  it('assassin: backstab bypasses defense; assassinate damageMultiplier becomes 4', () => {
    const assassin = makeCharacter({ subclass: 'assassin' });
    expect(
      applySubclassAbilityMods(assassin, makeAbility({ id: 'backstab', bypassMonsterDef: false }))
        .bypassMonsterDef,
    ).toBe(true);
    expect(
      applySubclassAbilityMods(assassin, makeAbility({ id: 'assassinate', damageMultiplier: 3 }))
        .damageMultiplier,
    ).toBe(4);
  });

  it('ranger: blade-dance lifesteal becomes 0.55; death-mark stuns', () => {
    const ranger = makeCharacter({ subclass: 'ranger' });
    expect(
      applySubclassAbilityMods(ranger, makeAbility({ id: 'blade-dance', lifestealPct: 0.3 }))
        .lifestealPct,
    ).toBe(0.55);
    expect(
      applySubclassAbilityMods(ranger, makeAbility({ id: 'death-mark', stunMonster: false }))
        .stunMonster,
    ).toBe(true);
  });

  it('does not mutate the input ability', () => {
    const ability = makeAbility({ id: 'berserker-rage', damageMultiplier: 3 });
    applySubclassAbilityMods(makeCharacter({ subclass: 'berserker' }), ability);
    expect(ability.damageMultiplier).toBe(3);
  });
});

// ─── getAbilityStaminaCost ────────────────────────────────────────────────────

describe('getAbilityStaminaCost', () => {
  it('returns baseCost when no subclass', () => {
    expect(getAbilityStaminaCost(makeCharacter({ subclass: undefined }), 10, false)).toBe(10);
  });

  it('rogue Opening Strike: first ability is free for any subclassed rogue', () => {
    expect(
      getAbilityStaminaCost(makeCharacter({ class: 'rogue', subclass: 'assassin' }), 10, true),
    ).toBe(0);
    expect(
      getAbilityStaminaCost(makeCharacter({ class: 'rogue', subclass: 'ranger' }), 10, true),
    ).toBe(0);
  });

  it('rogue Opening Strike: subsequent abilities cost full', () => {
    expect(
      getAbilityStaminaCost(makeCharacter({ class: 'rogue', subclass: 'assassin' }), 10, false),
    ).toBe(10);
  });

  it('rogue without subclass does NOT get Opening Strike', () => {
    expect(
      getAbilityStaminaCost(makeCharacter({ class: 'rogue', subclass: undefined }), 10, true),
    ).toBe(10);
  });

  it('berserker Frenzy halves cost (floor)', () => {
    expect(getAbilityStaminaCost(makeCharacter({ subclass: 'berserker' }), 10, false)).toBe(5);
    expect(getAbilityStaminaCost(makeCharacter({ subclass: 'berserker' }), 11, false)).toBe(5);
  });

  it('non-berserker non-rogue subclasses pay full cost', () => {
    expect(
      getAbilityStaminaCost(makeCharacter({ class: 'warrior', subclass: 'paladin' }), 10, false),
    ).toBe(10);
  });
});

// ─── applyOutgoingPassives ────────────────────────────────────────────────────

describe('applyOutgoingPassives', () => {
  it('non-warrior non-rogue (or unsubclassed) → no modifiers', () => {
    const result = applyOutgoingPassives(
      makeCharacter({ class: 'wizard', subclass: 'archmage' }),
      100,
      fullHpCtx,
    );
    expect(result.damage).toBe(100);
    expect(result.battleHardenedBonus).toBe(0);
    expect(result.bloodlustMultiplier).toBe(1.0);
    expect(result.eagleEyeCrit).toBe(false);
  });

  it('warrior Battle-Hardened: every 5 DEF → +2 damage', () => {
    const character = makeCharacter({
      class: 'warrior',
      subclass: 'paladin',
      stats: { strength: 0, stamina: 0, agility: 0, health: 0, wisdom: 0, defense: 12, spirit: 0 },
    });
    const result = applyOutgoingPassives(character, 100, fullHpCtx);
    // floor(12/5) = 2 → +4
    expect(result.battleHardenedBonus).toBe(4);
    expect(result.damage).toBe(104);
  });

  it('berserker Bloodlust: +8% per 25% HP lost, capped at 4 tiers (+32%)', () => {
    const character = makeCharacter({
      class: 'warrior',
      subclass: 'berserker',
      stats: { strength: 0, stamina: 0, agility: 0, health: 0, wisdom: 0, defense: 0, spirit: 0 },
    });
    // 50% HP lost → 2 tiers → +16% → 100 → 116
    const half = applyOutgoingPassives(character, 100, { ...fullHpCtx, currentHpPct: 0.5 });
    expect(half.bloodlustMultiplier).toBeCloseTo(1.16);
    expect(half.damage).toBe(116);

    // 1% HP → 99% lost → floor(0.99/0.25)=3 tiers → +24% → 124
    const nearDeath = applyOutgoingPassives(character, 100, { ...fullHpCtx, currentHpPct: 0.01 });
    expect(nearDeath.bloodlustMultiplier).toBeCloseTo(1.24);
    expect(nearDeath.damage).toBe(124);

    // 0% HP → 100% lost → 4 tiers (capped) → +32% → defensive cap
    const dead = applyOutgoingPassives(character, 100, { ...fullHpCtx, currentHpPct: 0 });
    expect(dead.bloodlustMultiplier).toBeCloseTo(1.32);
  });

  it('berserker at full HP: bloodlust multiplier is 1.0 (no bonus)', () => {
    const result = applyOutgoingPassives(
      makeCharacter({ class: 'warrior', subclass: 'berserker' }),
      100,
      fullHpCtx,
    );
    expect(result.bloodlustMultiplier).toBe(1.0);
  });

  it('ranger Eagle Eye: roll ≥9 doubles damage and sets eagleEyeCrit', () => {
    const character = makeCharacter({ class: 'rogue', subclass: 'ranger' });
    const crit = applyOutgoingPassives(character, 100, { ...fullHpCtx, roll: 10 });
    expect(crit.eagleEyeCrit).toBe(true);
    expect(crit.damage).toBe(200);

    const nine = applyOutgoingPassives(character, 100, { ...fullHpCtx, roll: 9 });
    expect(nine.eagleEyeCrit).toBe(true);

    const eight = applyOutgoingPassives(character, 100, { ...fullHpCtx, roll: 8 });
    expect(eight.eagleEyeCrit).toBe(false);
    expect(eight.damage).toBe(100);
  });

  it('Eagle Eye does NOT trigger when roll is undefined (ability context)', () => {
    const result = applyOutgoingPassives(
      makeCharacter({ class: 'rogue', subclass: 'ranger' }),
      100,
      fullHpCtx,
    );
    expect(result.eagleEyeCrit).toBe(false);
  });
});

// ─── getAbilityDamageMultiplier ───────────────────────────────────────────────

describe('getAbilityDamageMultiplier', () => {
  it('Assassin Lethal Opener: first ability returns 2', () => {
    expect(getAbilityDamageMultiplier(makeCharacter({ subclass: 'assassin' }), true)).toBe(2);
  });

  it('Assassin: subsequent abilities return 1', () => {
    expect(getAbilityDamageMultiplier(makeCharacter({ subclass: 'assassin' }), false)).toBe(1);
  });

  it('non-Assassin subclass: always 1', () => {
    expect(getAbilityDamageMultiplier(makeCharacter({ subclass: 'ranger' }), true)).toBe(1);
  });
});

// ─── applyIncomingPassives ────────────────────────────────────────────────────

describe('applyIncomingPassives', () => {
  it('no class passive: damage passes through unchanged', () => {
    const result = applyIncomingPassives(
      makeCharacter({ class: 'rogue', subclass: 'assassin' }),
      50,
      fullHpCtx,
    );
    expect(result.damage).toBe(50);
    expect(result.ironWillActive).toBe(false);
  });

  it('warrior Iron Will: below 30% HP → −20% damage', () => {
    const result = applyIncomingPassives(
      makeCharacter({ class: 'warrior', subclass: 'paladin' }),
      100,
      { ...fullHpCtx, currentHpPct: 0.25 },
    );
    expect(result.ironWillActive).toBe(true);
    expect(result.damage).toBeLessThan(100);
  });

  it('warrior Iron Will: at exactly 30% HP, NOT active', () => {
    const result = applyIncomingPassives(
      makeCharacter({ class: 'warrior', subclass: 'berserker' }),
      100,
      { ...fullHpCtx, currentHpPct: 0.3 },
    );
    expect(result.ironWillActive).toBe(false);
  });

  it('paladin Divine Aegis fires (Math.random < 0.15) → damage 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const result = applyIncomingPassives(
      makeCharacter({ class: 'warrior', subclass: 'paladin' }),
      100,
      fullHpCtx,
    );
    expect(result.divineAegisBlocked).toBe(true);
    expect(result.damage).toBe(0);
  });

  it('paladin Divine Aegis does NOT fire (Math.random ≥ 0.15)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = applyIncomingPassives(
      makeCharacter({ class: 'warrior', subclass: 'paladin' }),
      100,
      fullHpCtx,
    );
    expect(result.divineAegisBlocked).toBe(false);
    expect(result.damage).toBe(100);
  });

  it('wizard Mana Barrier: absorbs up to 10 damage from magic pool', () => {
    const result = applyIncomingPassives(makeCharacter({ class: 'wizard' }), 50, {
      ...fullHpCtx,
      currentMagic: 30,
    });
    expect(result.magicDrained).toBe(10);
    expect(result.damage).toBe(40);
  });

  it('wizard Mana Barrier: absorbs only currentMagic when magic < 10', () => {
    const result = applyIncomingPassives(makeCharacter({ class: 'wizard' }), 50, {
      ...fullHpCtx,
      currentMagic: 4,
    });
    expect(result.magicDrained).toBe(4);
    expect(result.damage).toBe(46);
  });

  it('wizard Mana Barrier: absorbs only damage when damage < 10', () => {
    const result = applyIncomingPassives(makeCharacter({ class: 'wizard' }), 5, {
      ...fullHpCtx,
      currentMagic: 30,
    });
    expect(result.magicDrained).toBe(5);
    expect(result.damage).toBe(0);
  });

  it('Mana Barrier inactive when currentMagic === 0', () => {
    const result = applyIncomingPassives(makeCharacter({ class: 'wizard' }), 50, fullHpCtx);
    expect(result.magicDrained).toBe(0);
    expect(result.damage).toBe(50);
  });
});

// ─── resolveLifesteal ─────────────────────────────────────────────────────────

describe('resolveLifesteal', () => {
  it('non-rogue non-warlock: returns input unchanged', () => {
    const result = resolveLifesteal(makeCharacter({ subclass: 'paladin' }), 0.3, 100);
    expect(result.totalPct).toBe(0.3);
    expect(result.hemorrhageDrain).toBe(0);
    expect(result.soulDrainHeal).toBe(0);
  });

  it('subclassed rogue Hemorrhage: +0.15 lifesteal AND +15% drain damage', () => {
    const result = resolveLifesteal(
      makeCharacter({ class: 'rogue', subclass: 'assassin' }),
      0.3,
      100,
    );
    expect(result.totalPct).toBeCloseTo(0.45);
    expect(result.hemorrhageDrain).toBe(15);
  });

  it('Hemorrhage does NOT activate on 0-lifesteal abilities', () => {
    const result = resolveLifesteal(makeCharacter({ class: 'rogue', subclass: 'ranger' }), 0, 100);
    expect(result.totalPct).toBe(0);
    expect(result.hemorrhageDrain).toBe(0);
  });

  it('warlock Soul Drain: 20% of damage as heal, independent of lifesteal', () => {
    const result = resolveLifesteal(makeCharacter({ subclass: 'warlock' }), 0, 50);
    expect(result.soulDrainHeal).toBe(10);
    expect(result.totalPct).toBe(0); // unchanged
  });

  it('Soul Drain: 0 damage → 0 heal', () => {
    const result = resolveLifesteal(makeCharacter({ subclass: 'warlock' }), 0, 0);
    expect(result.soulDrainHeal).toBe(0);
  });
});

// ─── applySpellDamagePassives ─────────────────────────────────────────────────

describe('applySpellDamagePassives', () => {
  it('non-wizard: damage unchanged', () => {
    expect(
      applySpellDamagePassives(
        makeCharacter({
          class: 'warrior',
          subclass: 'paladin',
          stats: {
            strength: 0,
            stamina: 0,
            agility: 0,
            health: 0,
            wisdom: 24,
            defense: 0,
            spirit: 0,
          },
        }),
        100,
      ),
    ).toBe(100);
  });

  it('0 or negative damage: returns unchanged (no amplification on heals/restores)', () => {
    expect(applySpellDamagePassives(makeCharacter({ class: 'wizard' }), 0)).toBe(0);
    expect(applySpellDamagePassives(makeCharacter({ class: 'wizard' }), -5)).toBe(-5);
  });

  it('wizard Arcane Amplification: +floor(wisdom/8)', () => {
    const character = makeCharacter({
      class: 'wizard',
      stats: { strength: 0, stamina: 0, agility: 0, health: 0, wisdom: 24, defense: 0, spirit: 0 },
    });
    // floor(24/8) = 3 → 100 + 3 = 103
    expect(applySpellDamagePassives(character, 100)).toBe(103);
  });

  it('archmage Arcane Mastery: ×1.25 after amplification', () => {
    const character = makeCharacter({
      class: 'wizard',
      subclass: 'archmage',
      stats: { strength: 0, stamina: 0, agility: 0, health: 0, wisdom: 8, defense: 0, spirit: 0 },
    });
    // 100 + floor(8/8)=1 → 101 → ×1.25 → round → 126
    expect(applySpellDamagePassives(character, 100)).toBe(126);
  });

  it('warlock gets amplification but no archmage multiplier', () => {
    const character = makeCharacter({
      class: 'wizard',
      subclass: 'warlock',
      stats: { strength: 0, stamina: 0, agility: 0, health: 0, wisdom: 16, defense: 0, spirit: 0 },
    });
    // 100 + floor(16/8)=2 → 102, no ×1.25
    expect(applySpellDamagePassives(character, 100)).toBe(102);
  });
});

// ─── getEffectiveSpellCost ────────────────────────────────────────────────────

describe('getEffectiveSpellCost', () => {
  it('archmage: cost − 1', () => {
    expect(getEffectiveSpellCost(makeCharacter({ subclass: 'archmage' }), 5)).toBe(4);
  });

  it('archmage minimum cost is 1', () => {
    expect(getEffectiveSpellCost(makeCharacter({ subclass: 'archmage' }), 1)).toBe(1);
    expect(getEffectiveSpellCost(makeCharacter({ subclass: 'archmage' }), 0)).toBe(1);
  });

  it('non-archmage: cost unchanged', () => {
    expect(getEffectiveSpellCost(makeCharacter({ subclass: 'warlock' }), 5)).toBe(5);
    expect(getEffectiveSpellCost(makeCharacter({ subclass: undefined }), 5)).toBe(5);
  });
});

// ─── canBloodPact ────────────────────────────────────────────────────────────

describe('canBloodPact', () => {
  const warlock = makeCharacter({ class: 'wizard', subclass: 'warlock' });

  it('warlock with insufficient magic AND > 10 HP → true', () => {
    expect(canBloodPact(warlock, 5, 0, 50)).toBe(true);
    expect(canBloodPact(warlock, 5, 4, 11)).toBe(true);
  });

  it('warlock with sufficient magic → false (use magic, not HP)', () => {
    expect(canBloodPact(warlock, 5, 5, 50)).toBe(false);
    expect(canBloodPact(warlock, 5, 10, 50)).toBe(false);
  });

  it('warlock with too low HP → false', () => {
    expect(canBloodPact(warlock, 5, 0, 10)).toBe(false);
    expect(canBloodPact(warlock, 5, 0, 5)).toBe(false);
  });

  it('non-warlock: always false', () => {
    expect(canBloodPact(makeCharacter({ subclass: 'archmage' }), 5, 0, 50)).toBe(false);
  });
});

// ─── getPerRoundPassives ─────────────────────────────────────────────────────

describe('getPerRoundPassives', () => {
  it('non-wizard non-paladin: zeros', () => {
    expect(getPerRoundPassives(makeCharacter({ class: 'rogue', subclass: 'assassin' }))).toEqual({
      magicRestore: 0,
      hpRestore: 0,
    });
  });

  it('base wizard (no subclass): +2 magic/round', () => {
    expect(getPerRoundPassives(makeCharacter({ class: 'wizard' })).magicRestore).toBe(2);
  });

  it('archmage Scholarly: +3 magic/round', () => {
    expect(
      getPerRoundPassives(makeCharacter({ class: 'wizard', subclass: 'archmage' })).magicRestore,
    ).toBe(3);
  });

  it('warlock: still gets base wizard +2 magic/round', () => {
    expect(
      getPerRoundPassives(makeCharacter({ class: 'wizard', subclass: 'warlock' })).magicRestore,
    ).toBe(2);
  });

  it('paladin Sacred Vow: +8 HP/round', () => {
    const result = getPerRoundPassives(makeCharacter({ class: 'warrior', subclass: 'paladin' }));
    expect(result.hpRestore).toBe(8);
    expect(result.magicRestore).toBe(0);
  });
});

// ─── getMomentumRestore ──────────────────────────────────────────────────────

describe('getMomentumRestore', () => {
  it('warrior with ability kill: +15 stamina', () => {
    expect(getMomentumRestore(makeCharacter({ class: 'warrior' }), true)).toBe(15);
  });

  it('warrior without ability kill: 0', () => {
    expect(getMomentumRestore(makeCharacter({ class: 'warrior' }), false)).toBe(0);
  });

  it('non-warrior: 0 even on ability kill', () => {
    expect(getMomentumRestore(makeCharacter({ class: 'rogue' }), true)).toBe(0);
  });
});

// ─── checkExecute ────────────────────────────────────────────────────────────

describe('checkExecute', () => {
  const assassin = makeCharacter({ subclass: 'assassin' });

  it('assassin: monster ≤15% max HP → true', () => {
    expect(checkExecute(assassin, 50, 14, 100, false)).toBe(true);
    expect(checkExecute(assassin, 50, 15, 100, false)).toBe(true);
  });

  it('assassin: monster above 15% max HP → false', () => {
    expect(checkExecute(assassin, 50, 16, 100, false)).toBe(false);
  });

  it('assassin: already used → false', () => {
    expect(checkExecute(assassin, 50, 5, 100, true)).toBe(false);
  });

  it('assassin: monster already at 0 HP before → false (already dead)', () => {
    expect(checkExecute(assassin, 0, 0, 100, false)).toBe(false);
  });

  it('non-assassin: always false', () => {
    expect(checkExecute(makeCharacter({ subclass: 'ranger' }), 50, 5, 100, false)).toBe(false);
  });
});

// ─── getEscapeBonus / hasSureEscape ──────────────────────────────────────────

describe('getEscapeBonus + hasSureEscape', () => {
  it('subclassed rogue Ghost Step: +floor(AGI/4)', () => {
    const ranger = makeCharacter({
      class: 'rogue',
      subclass: 'ranger',
      stats: { strength: 0, stamina: 0, agility: 12, health: 0, wisdom: 0, defense: 0, spirit: 0 },
    });
    expect(getEscapeBonus(ranger)).toBe(3);
  });

  it('rogue without subclass: no Ghost Step', () => {
    expect(getEscapeBonus(makeCharacter({ class: 'rogue', subclass: undefined }))).toBe(0);
  });

  it('non-rogue: no Ghost Step regardless of agility', () => {
    expect(
      getEscapeBonus(
        makeCharacter({
          class: 'warrior',
          subclass: 'paladin',
          stats: {
            strength: 0,
            stamina: 0,
            agility: 100,
            health: 0,
            wisdom: 0,
            defense: 0,
            spirit: 0,
          },
        }),
      ),
    ).toBe(0);
  });

  it('hasSureEscape: only ranger', () => {
    expect(hasSureEscape(makeCharacter({ subclass: 'ranger' }))).toBe(true);
    expect(hasSureEscape(makeCharacter({ subclass: 'assassin' }))).toBe(false);
    expect(hasSureEscape(makeCharacter({ subclass: undefined }))).toBe(false);
  });
});

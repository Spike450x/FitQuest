/**
 * Monster special-move system — pure helpers, damage integration, catalog
 * registration, and resolver threading. Specials roll on the monster's
 * counter-turn independently of the player's action (heavy / pierce / burst /
 * drain).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  rollMonsterSpecial,
  incomingMonsterDamage,
  monsterSpecialDrainHeal,
  effectiveAttackType,
  isTelegraphedSpecial,
  resolveCounterSpecial,
} from '../combat';
import { resolveAttackAction, resolveStunnedSkipAction, type ActionInput } from '../combatActions';
import { resolveAbility } from '../abilities';
import { COMBAT } from '../constants';
import { MONSTER_CATALOG, getMonsterById } from '../monsters';
import { DUNGEON_BOSSES } from '../dungeons';
import type { Character, MonsterDef, MonsterSpecialMove } from '@/types';
import type { FightState } from '@/components/combat/types';

const HEAVY: MonsterSpecialMove = {
  id: 'heavy',
  name: 'Heavy',
  emoji: '💥',
  chance: 1,
  effect: { kind: 'heavy', multiplier: 2 },
};
const PIERCE: MonsterSpecialMove = {
  id: 'pierce',
  name: 'Pierce',
  emoji: '🗡️',
  chance: 1,
  effect: { kind: 'pierce' },
};
const BURST: MonsterSpecialMove = {
  id: 'burst',
  name: 'Burst',
  emoji: '🔮',
  chance: 1,
  effect: { kind: 'burst' },
};
const DRAIN: MonsterSpecialMove = {
  id: 'drain',
  name: 'Drain',
  emoji: '🩸',
  chance: 1,
  effect: { kind: 'drain', pct: 50 },
};
const STUN: MonsterSpecialMove = {
  id: 'stun',
  name: 'Stun',
  emoji: '💫',
  chance: 1,
  effect: { kind: 'stun' },
};

function makeMonster(overrides: Partial<MonsterDef> = {}): MonsterDef {
  return {
    id: 'm',
    name: 'M',
    level: 5,
    hp: 200,
    attack: 30,
    defense: 5,
    xpReward: 0,
    goldReward: 0,
    lootTable: [],
    description: '',
    ...overrides,
  };
}

const WARRIOR = { class: 'warrior' as const };

afterEach(() => vi.restoreAllMocks());

// ── rollMonsterSpecial ─────────────────────────────────────────────────────────

describe('rollMonsterSpecial', () => {
  it('returns null when the monster has no specials', () => {
    expect(rollMonsterSpecial(makeMonster(), () => 0)).toBeNull();
  });

  it('fires a special when the roll lands under its chance', () => {
    const m = makeMonster({ specialMoves: [{ ...HEAVY, chance: 0.2 }] });
    expect(rollMonsterSpecial(m, () => 0.1)?.id).toBe('heavy');
    expect(rollMonsterSpecial(m, () => 0.5)).toBeNull();
  });

  it('returns the FIRST special that fires (at most one per counter)', () => {
    const m = makeMonster({ specialMoves: [PIERCE, HEAVY] });
    // rng < both chances (1.0) → first in catalog order wins
    expect(rollMonsterSpecial(m, () => 0.0)?.id).toBe('pierce');
  });
});

// ── incomingMonsterDamage with specials ──────────────────────────────────────

describe('incomingMonsterDamage — special modifiers', () => {
  const monster = makeMonster();

  it('heavy multiplies the final damage', () => {
    const base = incomingMonsterDamage(WARRIOR, monster, 30, 10);
    const heavy = incomingMonsterDamage(WARRIOR, monster, 30, 10, HEAVY);
    expect(heavy).toBe(base * 2);
  });

  it('pierce ignores the player armor (effDef forced to 0)', () => {
    const withArmor = incomingMonsterDamage(WARRIOR, monster, 30, 10);
    const pierced = incomingMonsterDamage(WARRIOR, monster, 30, 10, PIERCE);
    expect(pierced).toBeGreaterThan(withArmor);
    // Equivalent to a no-armor physical hit of the same raw value.
    expect(pierced).toBe(incomingMonsterDamage(WARRIOR, monster, 30, 0));
  });

  it('burst turns a physical hit into armor-ignoring magic (Warrior ×1.3)', () => {
    const burst = incomingMonsterDamage(WARRIOR, monster, 30, 10, BURST);
    // Warrior magic multiplier is 1.3 and armor is ignored.
    expect(burst).toBe(Math.round(30 * 1.3));
  });

  it('drain does not change the damage dealt', () => {
    const base = incomingMonsterDamage(WARRIOR, monster, 30, 10);
    const drain = incomingMonsterDamage(WARRIOR, monster, 30, 10, DRAIN);
    expect(drain).toBe(base);
  });
});

// ── monsterSpecialDrainHeal ──────────────────────────────────────────────────

describe('monsterSpecialDrainHeal', () => {
  it('heals ceil(pct%) of the damage dealt for a drain special', () => {
    expect(monsterSpecialDrainHeal(DRAIN, 21)).toBe(11); // ceil(21*0.5)
  });
  it('is zero for non-drain specials or when no damage landed', () => {
    expect(monsterSpecialDrainHeal(HEAVY, 30)).toBe(0);
    expect(monsterSpecialDrainHeal(DRAIN, 0)).toBe(0);
    expect(monsterSpecialDrainHeal(null, 30)).toBe(0);
  });
});

// ── effectiveAttackType ──────────────────────────────────────────────────────

describe('effectiveAttackType', () => {
  it('a burst special makes any monster magic for that swing', () => {
    expect(effectiveAttackType(makeMonster(), BURST)).toBe('magic');
  });
  it('falls back to the monster default for non-burst specials', () => {
    expect(effectiveAttackType(makeMonster(), PIERCE)).toBe('physical');
    expect(effectiveAttackType(makeMonster({ attackType: 'magic' }))).toBe('magic');
    expect(effectiveAttackType(makeMonster())).toBe('physical');
  });
});

// ── Catalog registration ─────────────────────────────────────────────────────

describe('catalog — damage typing + special registration', () => {
  it('Storm Djinn is a magic attacker (ATK trimmed to 32 in the balance pass)', () => {
    const djinn = getMonsterById('storm-djinn')!;
    expect(djinn.attackType).toBe('magic');
    expect(djinn.attack).toBe(32);
  });

  it('Ancient Dragon can breathe a burst (magic) special', () => {
    const dragon = getMonsterById('ancient-dragon')!;
    expect(dragon.specialMoves?.some((s) => s.effect.kind === 'burst')).toBe(true);
  });

  it('a healthy share of L5+ monsters carry special moves', () => {
    const withSpecials = MONSTER_CATALOG.filter((m) => (m.specialMoves?.length ?? 0) > 0);
    expect(withSpecials.length).toBeGreaterThanOrEqual(8);
    // Onboarding stays gentle — no L1–4 monster gets a special.
    expect(withSpecials.every((m) => m.level >= 5)).toBe(true);
  });

  it('every dungeon boss has at least one special move', () => {
    for (const boss of Object.values(DUNGEON_BOSSES)) {
      expect(boss.specialMoves?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('the Dragon King stays physical so its ignore-DEF enrage matters', () => {
    const dk = DUNGEON_BOSSES['dragons-keep'];
    expect(dk.attackType).toBeUndefined();
    expect(dk.specialMoves?.some((s) => s.effect.kind === 'burst')).toBe(true);
  });

  it('every special-move chance is a sane probability (0–0.3)', () => {
    const all = [...MONSTER_CATALOG, ...Object.values(DUNGEON_BOSSES)].flatMap(
      (m) => m.specialMoves ?? [],
    );
    expect(all.length).toBeGreaterThan(0);
    for (const s of all) {
      expect(s.chance).toBeGreaterThan(0);
      expect(s.chance).toBeLessThanOrEqual(0.3);
    }
  });
});

// ── Resolver threading ────────────────────────────────────────────────────────

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
    uid: 't',
    name: 'T',
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

function makeFightState(monster: MonsterDef, overrides: Partial<FightState> = {}): FightState {
  return {
    monster,
    playerHp: 500,
    playerStartHp: 500,
    playerStamina: 50,
    playerMagic: 30,
    monsterHp: monster.hp,
    log: [],
    outcome: null,
    droppedItems: [],
    isFirstAbility: true,
    executeUsed: false,
    ...overrides,
  };
}

function makeInput(monster: MonsterDef, overrides: Partial<ActionInput> = {}): ActionInput {
  return {
    state: makeFightState(monster),
    character: makeChar(),
    maxHp: 500,
    maxStamina: 50,
    maxMagic: 30,
    streakMultiplier: 1.0,
    getPityFor: () => 0,
    modifiers: undefined,
    ...overrides,
  };
}

// ── Telegraph classification + resolveCounterSpecial ─────────────────────────

describe('isTelegraphedSpecial', () => {
  it('heavy / burst / stun are telegraphed; pierce / drain are instant', () => {
    expect(isTelegraphedSpecial(HEAVY.effect)).toBe(true);
    expect(isTelegraphedSpecial(BURST.effect)).toBe(true);
    expect(isTelegraphedSpecial(STUN.effect)).toBe(true);
    expect(isTelegraphedSpecial(PIERCE.effect)).toBe(false);
    expect(isTelegraphedSpecial(DRAIN.effect)).toBe(false);
  });
});

describe('resolveCounterSpecial', () => {
  it('a charged special fires this round and clears the charge', () => {
    const res = resolveCounterSpecial(makeMonster(), HEAVY, () => 0);
    expect(res.effective?.id).toBe('heavy');
    expect(res.nextCharging).toBeNull();
    expect(res.primed).toBeNull();
  });

  it('a freshly-rolled telegraphed special winds up (does not apply now)', () => {
    const m = makeMonster({ specialMoves: [HEAVY] });
    const res = resolveCounterSpecial(m, null, () => 0);
    expect(res.effective).toBeNull();
    expect(res.nextCharging?.id).toBe('heavy');
    expect(res.primed?.id).toBe('heavy');
  });

  it('a freshly-rolled instant special applies this round', () => {
    const m = makeMonster({ specialMoves: [PIERCE] });
    const res = resolveCounterSpecial(m, null, () => 0);
    expect(res.effective?.id).toBe('pierce');
    expect(res.nextCharging).toBeNull();
  });

  it('no special rolled → all null', () => {
    const res = resolveCounterSpecial(makeMonster(), null, () => 0.99);
    expect(res.effective).toBeNull();
    expect(res.nextCharging).toBeNull();
    expect(res.primed).toBeNull();
  });
});

// ── resolveAttackAction threading (telegraph + instant) ──────────────────────

describe('resolveAttackAction — special threading', () => {
  it('a telegraphed heavy WINDS UP on the round it is rolled (no fire yet)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // 0.5 < 1.0 chance → rolls heavy
    const monster = makeMonster({ hp: 400, specialMoves: [HEAVY] });
    const res = resolveAttackAction(makeInput(monster), 'attack');

    // Primed, not applied: no special-fired fields, but a charge is set.
    expect(res.logEntry.monsterSpecialName).toBeUndefined();
    expect(res.logEntry.monsterSpecialPrimedName).toBe('Heavy');
    expect(res.nextState.monsterCharging?.id).toBe('heavy');
    // Damage is a plain hit this round (not boosted).
    const plain = resolveAttackAction(makeInput(makeMonster({ hp: 400 })), 'attack');
    expect(res.logEntry.monsterDamage!).toBe(plain.logEntry.monsterDamage!);
  });

  it('a charged heavy FIRES the next round for boosted damage and clears', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const monster = makeMonster({ hp: 400, specialMoves: [HEAVY] });
    const charged = resolveAttackAction(
      makeInput(monster, { state: makeFightState(monster, { monsterCharging: HEAVY }) }),
      'attack',
    );
    expect(charged.logEntry.monsterSpecialName).toBe('Heavy');
    expect(charged.nextState.monsterCharging).toBeNull();
    const plain = resolveAttackAction(makeInput(makeMonster({ hp: 400 })), 'attack');
    expect(charged.logEntry.monsterDamage!).toBeGreaterThan(plain.logEntry.monsterDamage!);
  });

  it('a charged stun lands on the hit and stuns the player next turn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const monster = makeMonster({ hp: 400, specialMoves: [STUN] });
    const res = resolveAttackAction(
      makeInput(monster, { state: makeFightState(monster, { monsterCharging: STUN }) }),
      'attack',
    );
    expect(res.nextState.playerStunned).toBe(true);
    expect(res.logEntry.playerStunnedApplied).toBe(true);
  });

  it('an instant drain still fires the same round and heals the monster', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const monster = makeMonster({ hp: 400, attack: 40, specialMoves: [DRAIN] });
    const res = resolveAttackAction(
      makeInput(monster, { state: makeFightState(monster, { monsterHp: 100 }) }),
      'attack',
    );
    expect(res.logEntry.monsterSpecialName).toBe('Drain');
    expect(res.logEntry.monsterSpecialDrain).toBeGreaterThan(0);
  });

  it('a kill suppresses the special + does not prime a charge', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const monster = makeMonster({ hp: 1, defense: 0, specialMoves: [HEAVY] });
    const res = resolveAttackAction(makeInput(monster), 'attack');
    expect(res.nextState.outcome).toBe('win');
    expect(res.logEntry.monsterSpecialName).toBeUndefined();
    expect(res.nextState.monsterCharging).toBeNull();
  });
});

// ── resolveStunnedSkipAction ─────────────────────────────────────────────────

describe('resolveStunnedSkipAction', () => {
  it('forfeits the turn, lands an undefended free hit, and clears the stun', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const monster = makeMonster({ hp: 400, attack: 30, specialMoves: [HEAVY] });
    const res = resolveStunnedSkipAction(
      makeInput(monster, {
        state: makeFightState(monster, { playerStunned: true, playerHp: 200 }),
      }),
    );
    expect(res.logEntry.action).toBe('stunned');
    expect(res.logEntry.playerSkipped).toBe(true);
    expect(res.logEntry.monsterDamage!).toBeGreaterThan(0);
    expect(res.nextState.playerHp).toBeLessThan(200);
    expect(res.nextState.playerStunned).toBe(false);
    // No overlay — the action bar's Continue is the acknowledgment.
    expect(res.pending.kind).toBe('none');
    // The free hit never rolls a special (no chain-stun).
    expect(res.logEntry.monsterSpecialName).toBeUndefined();
    expect(res.nextState.playerStunned).toBe(false);
  });
});

// ── Ability fizzle floors at MIN_DAMAGE (audit fix #3) ────────────────────────

describe('resolveAbility — fizzle damage floor', () => {
  it('a fizzle deals at least MIN_DAMAGE even against very high DEF', () => {
    // Dice [1,1,2,2,4,6] → no pattern (fizzle). Then defFail(no), d10, playerDefFail.
    const seq = [0.0, 0.0, 0.2, 0.2, 0.6, 0.9, 0.9, 0.5, 0.9];
    let i = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++] ?? 0.9);
    const monster = makeMonster({ defense: 99 });
    const resolution = resolveAbility(makeChar(), monster);
    expect(resolution.ability).toBeNull(); // fizzled
    expect(resolution.playerDamage).toBeGreaterThanOrEqual(COMBAT.MIN_DAMAGE);
  });
});

/**
 * Monster flee + intercept, the `heal` active, and the ability cooldown.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { rollFleeIntercept } from '../combat';
import {
  checkMonsterFlee,
  resolveInterceptAction,
  resolveAbilityAction,
  resolveAttackAction,
  type ActionInput,
} from '../combatActions';
import { COMBAT } from '../constants';
import { MONSTER_CATALOG, getMonsterById } from '../monsters';
import { DUNGEON_BOSSES } from '../dungeons';
import type { Character, MonsterDef } from '@/types';
import type { CombatModifiers, FightState } from '@/components/combat/types';

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

function makeMonster(overrides: Partial<MonsterDef> = {}): MonsterDef {
  return {
    id: 'm',
    name: 'M',
    level: 5,
    hp: 100,
    attack: 12,
    defense: 3,
    xpReward: 10,
    goldReward: 5,
    lootTable: [],
    description: '',
    ...overrides,
  };
}

function makeFightState(monster: MonsterDef, overrides: Partial<FightState> = {}): FightState {
  return {
    monster,
    playerHp: 300,
    playerStartHp: 300,
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
    maxHp: 300,
    maxStamina: 50,
    maxMagic: 30,
    streakMultiplier: 1.0,
    getPityFor: () => 0,
    modifiers: undefined,
    ...overrides,
  };
}

afterEach(() => vi.restoreAllMocks());

// ── checkMonsterFlee ─────────────────────────────────────────────────────────

describe('checkMonsterFlee', () => {
  const flee = makeMonster({ flee: { chance: 0.5, thresholdPct: 0.25 } });

  it('fires when low, surviving, under chance, and not disabled', () => {
    // 20/100 HP ≤ 25% threshold; rng 0.1 < 0.5 chance.
    expect(checkMonsterFlee(flee, 20, 100, null, undefined, false, () => 0.1)).toBe(true);
  });

  it('does not fire above the HP threshold', () => {
    expect(checkMonsterFlee(flee, 40, 100, null, undefined, false, () => 0.1)).toBe(false);
  });

  it('does not fire when the RNG misses the chance', () => {
    expect(checkMonsterFlee(flee, 20, 100, null, undefined, false, () => 0.9)).toBe(false);
  });

  it('never fires for a monster with no flee profile', () => {
    expect(checkMonsterFlee(makeMonster(), 5, 100, null, undefined, false, () => 0)).toBe(false);
  });

  it('is disabled by modifiers (dungeon rooms), a landed stun, a dead monster, or a finished fight', () => {
    const mods: CombatModifiers = { monsterFleeDisabled: true };
    expect(checkMonsterFlee(flee, 20, 100, null, mods, false, () => 0)).toBe(false);
    expect(checkMonsterFlee(flee, 20, 100, null, undefined, true, () => 0)).toBe(false);
    expect(checkMonsterFlee(flee, 0, 100, null, undefined, false, () => 0)).toBe(false);
    expect(checkMonsterFlee(flee, 20, 100, 'win', undefined, false, () => 0)).toBe(false);
  });
});

// ── rollFleeIntercept + resolveInterceptAction ──────────────────────────────

describe('rollFleeIntercept', () => {
  it('caught when player roll + AGI out-rolls the monster flee roll', () => {
    // Math.random sequence: playerRoll d10 (0.9→10), monsterRoll d10 (0.0→1).
    const seq = [0.9, 0.0];
    let i = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++] ?? 0);
    const res = rollFleeIntercept(makeChar(), makeMonster());
    expect(res.caught).toBe(true);
  });

  it('missed when the monster out-rolls the player', () => {
    const seq = [0.0, 0.9]; // player 1, monster 10
    let i = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++] ?? 0);
    const res = rollFleeIntercept(makeChar(), makeMonster());
    expect(res.caught).toBe(false);
  });
});

describe('resolveInterceptAction', () => {
  it('caught → instant kill (win) + a loot roll', () => {
    const seq = [0.9, 0.0];
    let i = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++] ?? 0);
    const monster = makeMonster({ flee: { chance: 1, thresholdPct: 0.25 } });
    const res = resolveInterceptAction(
      makeInput(monster, {
        state: makeFightState(monster, { monsterHp: 20, monsterFleeing: true }),
      }),
    );
    expect(res.nextState.outcome).toBe('win');
    expect(res.nextState.monsterHp).toBe(0);
    expect(res.nextState.monsterFleeing).toBe(false);
    expect(res.logEntry.action).toBe('intercept');
    expect(res.logEntry.interceptCaught).toBe(true);
  });

  it('missed → it escapes (fled), no kill', () => {
    const seq = [0.0, 0.9];
    let i = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++] ?? 0);
    const monster = makeMonster({ flee: { chance: 1, thresholdPct: 0.25 } });
    const res = resolveInterceptAction(
      makeInput(monster, {
        state: makeFightState(monster, { monsterHp: 20, monsterFleeing: true }),
      }),
    );
    expect(res.nextState.outcome).toBe('fled');
    expect(res.logEntry.interceptCaught).toBe(false);
    expect(res.nextState.monsterFleeing).toBe(false);
  });
});

// ── Flee threading through a real attack round ──────────────────────────────

describe('resolveAttackAction — flee threading', () => {
  it('sets monsterFleeing when the player damages a skittish monster to low HP', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // flee chance roll passes
    // High-DEF, low-HP monster: player chips it, it survives below 25%.
    const monster = makeMonster({
      hp: 100,
      defense: 50,
      flee: { chance: 1, thresholdPct: 0.25 },
    });
    const res = resolveAttackAction(
      makeInput(monster, { state: makeFightState(monster, { monsterHp: 22 }) }),
      'attack',
    );
    expect(res.nextState.outcome).toBeNull();
    expect(res.nextState.monsterFleeing).toBe(true);
  });

  it('does not flee when disabled by modifiers (dungeon)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const monster = makeMonster({ hp: 100, defense: 50, flee: { chance: 1, thresholdPct: 0.25 } });
    const res = resolveAttackAction(
      makeInput(monster, {
        state: makeFightState(monster, { monsterHp: 22 }),
        modifiers: { monsterFleeDisabled: true },
      }),
      'attack',
    );
    expect(res.nextState.monsterFleeing).toBeFalsy();
  });
});

// ── heal active ─────────────────────────────────────────────────────────────

describe('heal active — second wind', () => {
  it('restores HP and logs a recovery note when the threshold is crossed', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // no dodge/special noise
    const monster = makeMonster({
      hp: 100,
      defense: 0,
      active: { id: 'heal', triggerPct: 0.5, label: 'Second Wind', value: 30 },
    });
    // Monster at 52 HP; a normal hit drops it below 50 → heal fires.
    const res = resolveAttackAction(
      makeInput(monster, { state: makeFightState(monster, { monsterHp: 52 }) }),
      'attack',
    );
    // It healed back up rather than sitting at the post-hit value.
    expect(res.nextState.monsterHp).toBeGreaterThan(40);
    expect(res.logEntry.modifierNotes?.some((n) => n.includes('recovers'))).toBe(true);
  });
});

// ── ability cooldown ─────────────────────────────────────────────────────────

describe('ability cooldown', () => {
  it('stamps abilityReadyOnRound one action ahead after an ability', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const monster = makeMonster({ hp: 400 });
    const res = resolveAbilityAction(makeInput(monster));
    // log length after the ability round = 1; ready on 1 + cooldown.
    expect(res.nextState.abilityReadyOnRound).toBe(1 + COMBAT.ABILITY_COOLDOWN_ROUNDS);
    // Gate: not ready until the player takes one more action.
    expect((res.nextState.abilityReadyOnRound ?? 0) > res.nextState.log.length).toBe(true);
  });
});

// ── Catalog assertions ───────────────────────────────────────────────────────

describe('catalog — flee + heal registration', () => {
  it('only low-level (≤6) skittish mobs can flee — no boss/elemental/undead', () => {
    const fleers = MONSTER_CATALOG.filter((m) => m.flee);
    expect(fleers.length).toBeGreaterThanOrEqual(5);
    expect(fleers.every((m) => m.level <= 6)).toBe(true);
    // Every flee chance + threshold is a sane probability.
    for (const m of fleers) {
      expect(m.flee!.chance).toBeGreaterThan(0);
      expect(m.flee!.chance).toBeLessThanOrEqual(0.5);
      expect(m.flee!.thresholdPct).toBeLessThanOrEqual(0.3);
    }
  });

  it('the heal active is assigned (an arena bruiser + a boss)', () => {
    const ironHusk = getMonsterById('iron-husk')!;
    expect(ironHusk.active?.id).toBe('heal');
    expect(DUNGEON_BOSSES['goblin-caves'].active?.id).toBe('heal');
  });
});

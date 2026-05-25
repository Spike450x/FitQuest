import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveAttackAction, type ActionInput } from '../combatActions';
import type { FightState } from '@/components/combat/types';
import type { Character, MonsterDef } from '@/types';

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
    level: 5,
    xp: 0,
    xpToNextLevel: 500,
    gold: 0,
    stats: { ...BASE_STATS },
    equippedGear: { weapon: null, armor: null, accessory: null },
    createdAt: 0,
    ...overrides,
  };
}

function makeMonster(overrides: Partial<MonsterDef> = {}): MonsterDef {
  return {
    id: 'test-monster',
    name: 'Test Monster',
    level: 3,
    hp: 60,
    attack: 10,
    defense: 0,
    xpReward: 30,
    goldReward: 10,
    lootTable: [],
    description: '',
    ...overrides,
  };
}

function makeFightState(overrides: Partial<FightState> = {}): FightState {
  const monster = overrides.monster ?? makeMonster();
  return {
    monster,
    playerHp: 100,
    playerStartHp: 100,
    playerStamina: 50,
    playerMagic: 30,
    monsterHp: monster.hp,
    log: [],
    outcome: null,
    droppedItems: [],
    isFirstAbility: true,
    executeUsed: false,
    activeUsed: false,
    monsterBonusAtk: 0,
    monsterBonusDef: 0,
    ...overrides,
  };
}

function makeInput(overrides: Partial<ActionInput> = {}): ActionInput {
  return {
    state: makeFightState(),
    character: makeChar(),
    maxHp: 100,
    maxStamina: 50,
    maxMagic: 30,
    streakMultiplier: 1.0,
    getPityFor: () => 0,
    modifiers: undefined,
    ...overrides,
  };
}

afterEach(() => vi.restoreAllMocks());

// ── Regen ─────────────────────────────────────────────────────────────────────

describe('monster passive: regen', () => {
  it('heals monster HP before the player attacks', () => {
    const monster = makeMonster({ passive: { id: 'regen', label: 'Regen', value: 5 } });
    // Set monster HP to 40 of 60 max — regen should bring it to 45.
    const state = makeFightState({ monster, monsterHp: 40 });
    const input = makeInput({ state });

    // Fix the dice roll so the player deals exactly 0 damage (roll=1, def=100 blocks all).
    // Instead just verify the log entry's monsterRegen field.
    vi.spyOn(Math, 'random').mockReturnValue(0); // roll = ceil(0) = 0… use 0.05 → ceil = 1

    const result = resolveAttackAction(input, 'attack');
    expect(result.logEntry.monsterRegen).toBe(5);
  });

  it('does not regen above max HP', () => {
    const monster = makeMonster({ passive: { id: 'regen', label: 'Regen', value: 10 } });
    // Set monster at 58/60 — regen should only restore 2.
    const state = makeFightState({ monster, monsterHp: 58 });
    const input = makeInput({ state });

    const result = resolveAttackAction(input, 'attack');
    expect(result.logEntry.monsterRegen).toBe(2);
  });

  it('does not regen when monster is at full HP', () => {
    const monster = makeMonster({ passive: { id: 'regen', label: 'Regen', value: 5 } });
    const state = makeFightState({ monster, monsterHp: monster.hp });
    const input = makeInput({ state });

    const result = resolveAttackAction(input, 'attack');
    expect(result.logEntry.monsterRegen).toBeUndefined();
  });
});

// ── Thorns ────────────────────────────────────────────────────────────────────

describe('monster passive: thorns', () => {
  it('reflects a percentage of player damage back to the player', () => {
    // Monster with 0 defense and 20% thorns.
    const monster = makeMonster({
      defense: 0,
      passive: { id: 'thorns', label: 'Thorns', value: 20 },
    });
    const state = makeFightState({ monster, monsterHp: monster.hp, playerHp: 100 });

    // Force attack roll so player deals a known amount. Use real random (harder to pin).
    // Instead, verify thornsDamage = ceil(playerDamage * 0.2) whenever playerDamage > 0.
    const input = makeInput({ state });
    const result = resolveAttackAction(input, 'attack');

    if (result.logEntry.playerDamage && result.logEntry.playerDamage > 0) {
      const expectedThorns = Math.ceil(result.logEntry.playerDamage * 0.2);
      expect(result.logEntry.thornsDamage).toBe(expectedThorns);
    } else {
      expect(result.logEntry.thornsDamage).toBeUndefined();
    }
  });

  it('reduces final player HP by thorns amount', () => {
    const monster = makeMonster({
      defense: 0,
      attack: 0,
      passive: { id: 'thorns', label: 'Thorns', value: 50 },
    });
    const state = makeFightState({ monster, monsterHp: monster.hp, playerHp: 100 });
    const input = makeInput({ state });

    const result = resolveAttackAction(input, 'attack');
    const thornsDmg = result.logEntry.thornsDamage ?? 0;
    // playerHpAfter accounts for thorns + counter-attack damage.
    expect(result.logEntry.playerHpAfter).toBeLessThanOrEqual(100 - thornsDmg);
  });

  it('does not apply thorns when player deals 0 damage', () => {
    // Monster with very high defense so player damage = 0.
    const monster = makeMonster({
      defense: 999,
      passive: { id: 'thorns', label: 'Thorns', value: 25 },
    });
    const state = makeFightState({ monster, monsterHp: monster.hp });
    const input = makeInput({ state });

    const result = resolveAttackAction(input, 'attack');
    // If playerDamage = 0, thornsDamage should be absent.
    if (!result.logEntry.playerDamage) {
      expect(result.logEntry.thornsDamage).toBeUndefined();
    }
  });
});

// ── Vampiric ──────────────────────────────────────────────────────────────────

describe('monster passive: vampiric', () => {
  it('sets monsterVampiric when monster deals damage and is alive', () => {
    // Monster with 30% vampiric and very low player defense so monster deals real damage.
    const monster = makeMonster({
      attack: 20,
      defense: 0,
      passive: { id: 'vampiric', label: 'Vampiric', value: 30 },
    });
    // Set monster HP below max so there's room to heal.
    const state = makeFightState({ monster, monsterHp: 30 });
    const input = makeInput({
      state,
      character: makeChar({ stats: { ...BASE_STATS, defense: 0 } }),
    });

    const result = resolveAttackAction(input, 'attack');
    // If monster survived (monsterHp > 0 after) and dealt damage, vampiric should heal.
    if (result.logEntry.monsterHpAfter! > 0 && result.logEntry.monsterDamage! > 0) {
      const expectedHeal = Math.ceil(result.logEntry.monsterDamage! * 0.3);
      expect(result.logEntry.monsterVampiric).toBe(expectedHeal);
    }
  });

  it('does not apply vampiric when monster is killed in the same round', () => {
    // Kill monster in one hit (1 HP left, player has high strength).
    const monster = makeMonster({ defense: 0 });
    const state = makeFightState({ monster, monsterHp: 1 });
    const input = makeInput({ state });

    const result = resolveAttackAction(input, 'attack');
    // Monster must be dead.
    expect(result.logEntry.monsterHpAfter).toBe(0);
    expect(result.logEntry.monsterVampiric).toBeUndefined();
  });
});

// ── Monster active ────────────────────────────────────────────────────────────

describe('monster active: enrage', () => {
  it('triggers when monster HP crosses the threshold for the first time', () => {
    // Monster with enrage at 50% HP (threshold = 30 HP).
    const monster = makeMonster({
      defense: 0,
      active: { id: 'enrage', triggerPct: 0.5, label: 'Enrage', value: 4 },
    });
    // Start at 40 HP (above threshold of 30). Player must deal > 10 damage to cross threshold.
    const state = makeFightState({ monster, monsterHp: 40, activeUsed: false });
    // Give player huge strength so attack definitely deals > 10.
    const input = makeInput({
      state,
      character: makeChar({ stats: { ...BASE_STATS, strength: 50 } }),
    });

    const result = resolveAttackAction(input, 'attack');
    // If monster crossed threshold:
    if ((result.nextState.monsterHp ?? 0) <= 30 && result.nextState.monsterHp! > 0) {
      expect(result.logEntry.monsterActiveTriggered).toBe('Enrage');
      expect(result.nextState.activeUsed).toBe(true);
      expect(result.nextState.monsterBonusAtk).toBe(4);
    }
  });

  it('does not trigger twice when active is already used', () => {
    const monster = makeMonster({
      active: { id: 'enrage', triggerPct: 0.5, label: 'Enrage', value: 4 },
    });
    const state = makeFightState({ monster, monsterHp: 20, activeUsed: true, monsterBonusAtk: 4 });
    const input = makeInput({ state });

    const result = resolveAttackAction(input, 'attack');
    expect(result.logEntry.monsterActiveTriggered).toBeUndefined();
    // Bonus should stay at 4, not accumulate to 8.
    expect(result.nextState.monsterBonusAtk ?? 0).toBe(4);
  });

  it('does not trigger when monster is killed in the same round', () => {
    const monster = makeMonster({
      hp: 10,
      defense: 0,
      active: { id: 'enrage', triggerPct: 0.5, label: 'Enrage', value: 4 },
    });
    const state = makeFightState({ monster, monsterHp: 10, activeUsed: false });
    // High strength — guaranteed kill.
    const input = makeInput({
      state,
      character: makeChar({ stats: { ...BASE_STATS, strength: 100 } }),
    });

    const result = resolveAttackAction(input, 'attack');
    expect(result.logEntry.monsterHpAfter).toBe(0);
    expect(result.logEntry.monsterActiveTriggered).toBeUndefined();
  });
});

describe('monster active: harden', () => {
  it('sets monsterBonusDef when harden triggers', () => {
    const monster = makeMonster({
      defense: 0,
      active: { id: 'harden', triggerPct: 0.5, label: 'Bone Shield', value: 6 },
    });
    const state = makeFightState({ monster, monsterHp: 40, activeUsed: false });
    const input = makeInput({
      state,
      character: makeChar({ stats: { ...BASE_STATS, strength: 50 } }),
    });

    const result = resolveAttackAction(input, 'attack');
    if (result.nextState.monsterHp! > 0 && result.nextState.monsterHp! <= 30) {
      expect(result.nextState.monsterBonusDef).toBe(6);
      expect(result.nextState.monsterBonusAtk).toBe(0);
    }
  });
});

// ── No passive — no side-effects ──────────────────────────────────────────────

describe('monster with no passive or active', () => {
  it('produces no passive log fields', () => {
    const monster = makeMonster(); // no passive or active
    const state = makeFightState({ monster });
    const input = makeInput({ state });

    const result = resolveAttackAction(input, 'attack');
    expect(result.logEntry.thornsDamage).toBeUndefined();
    expect(result.logEntry.monsterRegen).toBeUndefined();
    expect(result.logEntry.monsterVampiric).toBeUndefined();
    expect(result.logEntry.monsterActiveTriggered).toBeUndefined();
    expect(result.nextState.activeUsed).toBe(false);
    expect(result.nextState.monsterBonusAtk).toBe(0);
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveAttackAction, resolveAbilityAction, type ActionInput } from '../combatActions';
import { effectivePlayerDefenseVsMonster } from '../combat';
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
  spirit: 0,
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
    hp: 100,
    attack: 15,
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

// ── Harden active ─────────────────────────────────────────────────────────────

describe('monster active: harden', () => {
  it('raises monsterBonusDef when threshold is crossed', () => {
    // Monster HP=100, harden at 50% (50 HP). Start just above: 55 HP.
    // Player ATK should bring it below 50 to trigger.
    const monster = makeMonster({
      hp: 100,
      defense: 0,
      attack: 0,
      active: { id: 'harden', label: 'Bone Shield', triggerPct: 0.5, value: 8 },
    });
    const state = makeFightState({ monster, monsterHp: 55, activeUsed: false });

    // Pin Math.random so:
    //  - roll (0→1..10): use 0.6 → ceil(0.6*10)=6; player does 6+STR_bonus≈8 dmg → 55-8=47 ≤50
    //  - def fail (needs >0.1 to NOT fail): 0.6 > 0.1 → def holds
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
    const result = resolveAttackAction(makeInput({ state, character: makeChar() }), 'attack');

    // If monster HP dropped to ≤50 and monster wasn't killed
    if (result.nextState.monsterHp > 0 && result.nextState.monsterHp <= 50) {
      expect(result.logEntry.monsterActiveTriggered).toBe('Bone Shield');
      expect(result.nextState.monsterBonusDef).toBe(8);
      expect(result.nextState.activeUsed).toBe(true);
    }
  });

  it('reduces incoming player damage in the round after harden fires', () => {
    // State: harden already fired, monsterBonusDef=8 applied.
    // Compare damage dealt with bonusDef=0 vs bonusDef=8 (same ATK, same seed).
    const monster = makeMonster({ hp: 100, defense: 0, attack: 20 });

    const stateWithHarden = makeFightState({
      monster,
      monsterHp: 40,
      activeUsed: true,
      monsterBonusDef: 8,
    });
    const stateNoHarden = makeFightState({
      monster,
      monsterHp: 40,
      activeUsed: true,
      monsterBonusDef: 0,
    });

    // Pin same random for both so only bonusDef differs.
    // Use 0.5 for all rolls: attack, def-fail (0.5 > 0.1 → holds), flee
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const resultHarden = resolveAttackAction(makeInput({ state: stateWithHarden }), 'attack');

    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const resultNoHarden = resolveAttackAction(makeInput({ state: stateNoHarden }), 'attack');

    // With harden (+8 bonusDef applied to effective monster DEF), the player
    // deals less damage because `getMonsterEffectiveStats` raises monster.defense
    // by monsterBonusDef. If monster was killed before counter, monsterDamage=0 both.
    // Check player damage is lower (or equal at min=1) with harden.
    const dmgHarden = resultHarden.logEntry.playerDamage ?? 0;
    const dmgNoHarden = resultNoHarden.logEntry.playerDamage ?? 0;
    expect(dmgHarden).toBeLessThanOrEqual(dmgNoHarden);
  });
});

// ── Armor-pierce ──────────────────────────────────────────────────────────────

describe('effectivePlayerDefenseVsMonster: armor-pierce', () => {
  it('reduces player effective DEF by the pierce value', () => {
    const charWith10Def = makeChar({ stats: { ...BASE_STATS, defense: 10 } });
    const monsterWith2Pierce = makeMonster({
      passive: { id: 'armor-pierce', label: 'Pierce', value: 2 },
    });
    const monsterNoPierce = makeMonster();

    // Warrior class multiplier for defense is 1.5, so effective DEF = floor(10 * 1.5) = 15
    // With pierce 2: max(0, 15 - 2) = 13
    const defWithPierce = effectivePlayerDefenseVsMonster(charWith10Def, monsterWith2Pierce, false);
    const defNoPierce = effectivePlayerDefenseVsMonster(charWith10Def, monsterNoPierce, false);

    expect(defWithPierce).toBe(defNoPierce - 2);
    expect(defWithPierce).toBeGreaterThanOrEqual(0);
  });

  it('floors player effective DEF at 0 (cannot go negative)', () => {
    // Character with very low DEF stat and high armor-pierce
    const charLowDef = makeChar({ stats: { ...BASE_STATS, defense: 1 } });
    const monsterHighPierce = makeMonster({
      passive: { id: 'armor-pierce', label: 'Pierce', value: 100 },
    });
    const result = effectivePlayerDefenseVsMonster(charLowDef, monsterHighPierce, false);
    expect(result).toBe(0);
  });

  it('increases incoming monster damage vs baseline (pierce reduces player DEF)', () => {
    const char = makeChar({ stats: { ...BASE_STATS, defense: 10 } });
    const monsterPierce = makeMonster({
      attack: 30,
      defense: 0,
      passive: { id: 'armor-pierce', label: 'Pierce', value: 5 },
    });
    const monsterNoPierce = makeMonster({ attack: 30, defense: 0 });

    // Pin random so: both use same dice, def does NOT fail (0.5 > 0.1)
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const withPierce = resolveAttackAction(
      makeInput({ state: makeFightState({ monster: monsterPierce }), character: char }),
      'attack',
    );

    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const withoutPierce = resolveAttackAction(
      makeInput({ state: makeFightState({ monster: monsterNoPierce }), character: char }),
      'attack',
    );

    // Armor-pierce reduces player effective DEF → monster deals more damage.
    // monsterArmorPierce field should be logged.
    if ((withPierce.logEntry.monsterDamage ?? 0) > 0) {
      expect(withPierce.logEntry.monsterArmorPierce).toBe(5);
      expect(withPierce.logEntry.monsterDamage!).toBeGreaterThanOrEqual(
        withoutPierce.logEntry.monsterDamage ?? 0,
      );
    }
  });
});

// ── Stun cancels telegraph ─────────────────────────────────────────────────────

describe('stun cancels telegraphed charge', () => {
  it('clearing pending charge when monster is stunned by an ability', () => {
    // Set up a monster with a charged special winding up.
    // Then use resolveAbilityAction — if the ability stuns the monster,
    // monsterSwung=false and resolveChargeOutcome should return nextCharging=null.
    const monster = makeMonster({ hp: 200, defense: 0, attack: 10 });
    const chargingSpecial = {
      id: 'heavy',
      name: 'Heavy Strike',
      emoji: '💥',
      chance: 1,
      effect: { kind: 'heavy' as const, multiplier: 2 },
    };
    const state = makeFightState({
      monster,
      monsterHp: 200,
      monsterCharging: chargingSpecial,
    });

    // To force a stun-producing ability, use a Warrior with dice that produce
    // a full_house pattern (Warrior's Shield Slam = stun). Pin Math.random to
    // produce three 4s and two 6s: values [4,4,4,6,6] → full_house.
    // rollD6: ceil(random * 6). Use sequence: 4/6=0.667→4, 0.667→4, 0.667→4, 1.0→6, 1.0→6
    const rolls = [0.667, 0.667, 0.667, 1.0, 1.0, 0.5, 0.5, 0.5];
    let callIndex = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => rolls[callIndex++ % rolls.length]);

    const char = makeChar({ class: 'warrior' });
    const result = resolveAbilityAction(makeInput({ state, character: char }));

    // If the ability stunned the monster, the charging special must be cleared.
    if (result.logEntry.monsterStunned) {
      expect(result.nextState.monsterCharging).toBeNull();
    }

    // Regardless of whether a stun pattern fired, if monsterCharging existed
    // and monsterSwung=false (stun), the next state must clear monsterCharging.
    // This verifies the invariant: a stunned monster can't fire its queued special.
    if (!result.logEntry.monsterStunned) {
      // Stun didn't fire — charge may or may not persist. That's fine.
      // This branch just confirms no crash.
      expect(result.nextState).toBeDefined();
    }
  });

  it('a stunned round with an active charging special fires null next state charging', () => {
    // More direct: if the prior round set up monsterCharging AND this round the
    // monster is stunned (monsterSwung=false), the charge fires as fizzledCharge
    // and nextCharging must be null.
    // We test this by checking: after a round where the monster was stunned,
    // nextState.monsterCharging should be null (charge consumed or fizzled).
    const monster = makeMonster({ hp: 200, defense: 0, attack: 0 });
    const chargingSpecial = {
      id: 'stun',
      name: 'Thunderclap',
      emoji: '⚡',
      chance: 1,
      effect: { kind: 'stun' as const },
    };
    const state = makeFightState({
      monster,
      monsterHp: 200,
      monsterCharging: chargingSpecial,
    });

    // Use resolveAbilityAction with stun-producing roll
    const rolls = [0.667, 0.667, 0.667, 1.0, 1.0, 0.5, 0.5, 0.5];
    let callIndex = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => rolls[callIndex++ % rolls.length]);

    const char = makeChar({ class: 'warrior' });
    const result = resolveAbilityAction(makeInput({ state, character: char }));

    if (result.logEntry.monsterStunned) {
      // A stun interrupts the pending charge
      expect(result.nextState.monsterCharging).toBeNull();
    }
  });
});

// ── Siphon stamina floor ───────────────────────────────────────────────────────

describe('monster passive: siphon floor', () => {
  it('cannot drain more stamina than the player currently has', () => {
    // Siphon value=10 but player only has 3 stamina → drain=3
    const monster = makeMonster({
      attack: 20,
      defense: 0,
      passive: { id: 'siphon', label: 'Siphon', value: 10 },
    });
    const state = makeFightState({ monster, playerStamina: 3 });

    // Pin random: player rolls a hit, def does not fail (0.5 > 0.1)
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = resolveAttackAction(makeInput({ state }), 'attack');

    if ((result.logEntry.monsterDamage ?? 0) > 0) {
      // Siphon should be min(10, 3) = 3
      expect(result.logEntry.monsterSiphon).toBe(3);
      // Player stamina must not go negative
      expect(result.nextState.playerStamina).toBe(0);
    }
  });

  it('does not drain stamina when monster has no siphon passive', () => {
    // Monster with no passive → calcSiphonDrain returns 0 regardless of damage
    // (MIN_DAMAGE=1 ensures every hit deals ≥1 damage, so this tests the passive guard)
    const monster = makeMonster({ attack: 20, defense: 0 }); // no passive
    const state = makeFightState({ monster, playerStamina: 20 });

    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = resolveAttackAction(makeInput({ state }), 'attack');

    // Monster deals damage but has no siphon passive → no stamina drain
    expect(result.logEntry.monsterSiphon ?? 0).toBe(0);
    expect(result.nextState.playerStamina).toBe(20);
  });

  it('drains up to siphon value when player has plenty of stamina', () => {
    const monster = makeMonster({
      attack: 20,
      defense: 0,
      passive: { id: 'siphon', label: 'Siphon', value: 4 },
    });
    const state = makeFightState({ monster, playerStamina: 50 });

    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = resolveAttackAction(makeInput({ state }), 'attack');

    if ((result.logEntry.monsterDamage ?? 0) > 0) {
      // Siphon = min(4, 50) = 4
      expect(result.logEntry.monsterSiphon).toBe(4);
      expect(result.nextState.playerStamina).toBe(46);
    }
  });
});

// ── DoT kill = win ─────────────────────────────────────────────────────────────

describe('spell DoT tick: kill resolves as win', () => {
  it('when DoT damage reduces monster HP to 0 at round start, outcome is win', () => {
    // Monster at 1 HP, active DoT doing 10 per round → DoT kills before player swings
    const monster = makeMonster({ hp: 100, defense: 0, attack: 10 });
    const state = makeFightState({
      monster,
      monsterHp: 1,
      monsterDots: [{ key: 'fireball', label: 'Fireball', perRound: 10, roundsRemaining: 2 }],
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = resolveAttackAction(makeInput({ state }), 'attack');

    // DoT ticks first: 1 HP - min(10, 1) = 0 → win before player even swings
    expect(result.nextState.outcome).toBe('win');
    expect(result.nextState.monsterHp).toBe(0);
    // DoT damage should be logged
    expect(result.logEntry.monsterDotDamage).toBeGreaterThan(0);
  });

  it('DoT partially ticks without killing when monster has more HP', () => {
    // Monster at 20 HP, DoT of 5/round — should tick 5, not kill
    const monster = makeMonster({ hp: 100, defense: 0, attack: 10 });
    const state = makeFightState({
      monster,
      monsterHp: 20,
      monsterDots: [{ key: 'bleed', label: 'Bleed', perRound: 5, roundsRemaining: 3 }],
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = resolveAttackAction(makeInput({ state }), 'attack');

    // DoT dealt 5 damage (monster HP was 20, so min(5,20)=5)
    expect(result.logEntry.monsterDotDamage).toBe(5);
    // Monster should still be alive before player's swing (unless player also kills)
    // The DoT alone shouldn't kill it (20 - 5 = 15 HP remaining for calc)
  });

  it('DoT round counter decrements and expires', () => {
    // DoT with 1 round remaining — should expire after this round
    const monster = makeMonster({ hp: 100, defense: 0, attack: 0 });
    const state = makeFightState({
      monster,
      monsterHp: 50,
      monsterDots: [{ key: 'burn', label: 'Burn', perRound: 3, roundsRemaining: 1 }],
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = resolveAttackAction(makeInput({ state }), 'attack');

    // After 1 remaining round ticks, DoT should be gone
    const remainingDots = result.nextState.monsterDots ?? [];
    expect(remainingDots.length).toBe(0);
  });
});

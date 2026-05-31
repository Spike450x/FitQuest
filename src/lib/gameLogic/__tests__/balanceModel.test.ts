/**
 * Balance model — calibration tool + regression guard for the class/combat
 * tuning pass. It computes resource pools, basic-attack offense, and an
 * analytical "level-matched fight" (kill-rounds + % HP lost) for each class at
 * L1/L10/L20, then asserts they stay in target bands.
 *
 * The character fixtures are *representative dedicated-player builds*: starting
 * stats + level-up auto health/defense + allocation/mastery poured into each
 * class's signature stats (Warrior STR/DEF, Wizard WIS/SPI, Rogue AGI/STR/STA),
 * respecting the primary cap (50) and secondary cap (level×5+10). They are a
 * model, not a simulation of the economy — when tuning multipliers or monsters,
 * run `npx vitest run balanceModel` and read the printed table.
 *
 * The analytical fight uses *basic attacks* as the offense floor (abilities and
 * spells add burst on top), monster counters every surviving round, and the
 * 25%-defense-fail averages to 0.75× effective DEF. It is deterministic.
 */
import { describe, it, expect } from 'vitest';
import {
  effectiveStat,
  playerMaxHp,
  playerMaxStamina,
  playerMaxMagic,
  classDodgeChance,
  spellCritChance,
  spellCritDamage,
} from '../combat';
import { CLASS_DAMAGE_TAKEN, COMBAT } from '../constants';
import { getMonsterById } from '../monsters';
import type { Character, CharacterClass, MonsterDef, Stats } from '@/types';

// ── Representative builds ───────────────────────────────────────────────────

const BUILDS: Record<CharacterClass, Record<number, Stats>> = {
  warrior: {
    1: { strength: 8, stamina: 6, agility: 4, health: 7, wisdom: 3, defense: 6, spirit: 3 },
    10: { strength: 24, stamina: 14, agility: 4, health: 16, wisdom: 3, defense: 16, spirit: 4 },
    20: { strength: 45, stamina: 26, agility: 5, health: 30, wisdom: 4, defense: 34, spirit: 6 },
  },
  wizard: {
    1: { strength: 3, stamina: 5, agility: 6, health: 8, wisdom: 8, defense: 1, spirit: 7 },
    10: { strength: 3, stamina: 10, agility: 6, health: 18, wisdom: 26, defense: 10, spirit: 14 },
    20: { strength: 4, stamina: 16, agility: 8, health: 32, wisdom: 48, defense: 20, spirit: 26 },
  },
  // A realistic Rogue splits its allocation between AGI (dodge/escape) and STR
  // (its actual damage stat) rather than dumping everything into AGI.
  rogue: {
    1: { strength: 5, stamina: 8, agility: 8, health: 5, wisdom: 6, defense: 3, spirit: 3 },
    10: { strength: 20, stamina: 20, agility: 22, health: 14, wisdom: 6, defense: 12, spirit: 4 },
    20: { strength: 36, stamina: 34, agility: 44, health: 24, wisdom: 8, defense: 22, spirit: 8 },
  },
};

/** Level → the monster a player of that level would face as a "fair" fight. */
const MATCHUP: Record<number, string> = {
  1: 'goblin-scout',
  10: 'ancient-dragon',
  20: 'storm-djinn',
};

function makeChar(cls: CharacterClass, level: number): Character {
  return {
    uid: 't',
    name: 'T',
    class: cls,
    level,
    xp: 0,
    xpToNextLevel: 100,
    gold: 0,
    stats: BUILDS[cls][level],
    equippedGear: { weapon: null, armor: null, accessory: null },
    createdAt: 0,
  } as Character;
}

/**
 * Player's average *sustained* damage per round. Players lean on class abilities
 * (≈2–3× multipliers, ~60% pattern-hit on 6d6, partial defense bypass), so the
 * realistic offense is the ability blend — basic attacks are only the floor.
 * STR drives melee classes, WIS drives the Wizard.
 */
function avgPlayerDamage(char: Character, monster: MonsterDef): number {
  const offense =
    char.class === 'wizard' ? effectiveStat(char, 'wisdom') : effectiveStat(char, 'strength');
  const avgRoll = (COMBAT.ATTACK_RNG_MIN + COMBAT.ATTACK_RNG_MAX) / 2; // 5.5
  const effMonDef = monster.defense * (1 - COMBAT.DEFENSE_FAIL_CHANCE); // 0.75× avg
  const basic = Math.max(COMBAT.MIN_DAMAGE, offense + avgRoll - effMonDef);
  // Ability blend: avg 6d6 base (~4) + stat, ×1.7 blended multiplier, partial DEF.
  const ability = Math.max(COMBAT.MIN_DAMAGE, (4 + offense) * 1.7 - monster.defense * 0.4);
  // Spirit crit applies to attacks, abilities, and spells — fold its expected
  // value in so the model mirrors the live damage path (small at low Spirit).
  const spirit = effectiveStat(char, 'spirit');
  const critEv = 1 + spellCritChance(spirit) * (spellCritDamage(spirit) - 1);
  return Math.max(basic, ability) * critEv;
}

/** Average monster counter-attack damage to the player, including damage-school + dodge. */
function avgMonsterDamage(char: Character, monster: MonsterDef): number {
  const type = monster.attackType ?? 'physical';
  const mult = CLASS_DAMAGE_TAKEN[char.class][type];
  const effPlayerDef = (effectiveStat(char, 'defense') + 0) * (1 - COMBAT.DEFENSE_FAIL_CHANCE); // gear-less model
  const mitigated = type === 'magic' ? monster.attack : Math.max(0, monster.attack - effPlayerDef);
  const raw = Math.max(COMBAT.MIN_DAMAGE, mitigated * mult);
  return raw * (1 - classDodgeChance(char)); // dodge averages damage down
}

interface FightModel {
  maxHp: number;
  maxStamina: number;
  maxMagic: number;
  killRounds: number;
  pctHpLost: number;
}

function modelFight(char: Character, monster: MonsterDef): FightModel {
  const maxHp = playerMaxHp(char);
  const playerDmg = avgPlayerDamage(char, monster);
  const killRounds = Math.max(1, Math.ceil(monster.hp / playerDmg));
  const monsterDmg = avgMonsterDamage(char, monster);
  const hpLost = monsterDmg * (killRounds - 1); // monster doesn't counter the kill round
  return {
    maxHp,
    maxStamina: playerMaxStamina(char),
    maxMagic: playerMaxMagic(char),
    killRounds,
    pctHpLost: Math.min(1, hpLost / maxHp),
  };
}

// ── Diagnostic table (printed once for calibration) ──────────────────────────

describe('balance model — diagnostic table', () => {
  it('prints pools + level-matched fight per class/level', () => {
    const rows: string[] = [];
    for (const level of [1, 10, 20]) {
      const monster = getMonsterById(MATCHUP[level])!;
      for (const cls of ['warrior', 'wizard', 'rogue'] as CharacterClass[]) {
        const m = modelFight(makeChar(cls, level), monster);
        rows.push(
          `L${level} ${cls.padEnd(7)} vs ${monster.name.padEnd(15)} ` +
            `HP=${m.maxHp} STA=${m.maxStamina} MAG=${m.maxMagic} ` +
            `kill=${m.killRounds}r hpLost=${(m.pctHpLost * 100).toFixed(0)}%`,
        );
      }
    }
    console.log('\n' + rows.join('\n') + '\n');
    expect(rows.length).toBe(9);
  });
});

// ── Pool differentiation ─────────────────────────────────────────────────────

describe('balance model — pool identity', () => {
  it('Wizard has the largest magic pool at every level', () => {
    for (const level of [1, 10, 20]) {
      const wiz = playerMaxMagic(makeChar('wizard', level));
      expect(wiz).toBeGreaterThan(playerMaxMagic(makeChar('warrior', level)));
      expect(wiz).toBeGreaterThan(playerMaxMagic(makeChar('rogue', level)));
    }
  });

  it('Rogue has the largest stamina (ability) pool at mid/late game', () => {
    for (const level of [10, 20]) {
      const rog = playerMaxStamina(makeChar('rogue', level));
      expect(rog).toBeGreaterThan(playerMaxStamina(makeChar('warrior', level)));
      expect(rog).toBeGreaterThan(playerMaxStamina(makeChar('wizard', level)));
    }
  });

  it('Rogue has less max HP than the Warrior (the designed tank) at mid/late game', () => {
    // The Rogue pumps Stamina for its ability pool, which still trickles into HP
    // (×1), so it is not necessarily below the Wizard — but its low Health
    // multiplier keeps it under the Warrior, the intended HP leader. Combined
    // with leaning on dodge/escape, that is its defensive identity.
    for (const level of [10, 20]) {
      const rog = playerMaxHp(makeChar('rogue', level));
      expect(rog).toBeLessThan(playerMaxHp(makeChar('warrior', level)));
    }
  });
});

// ── Fight bands: level-matched fights are meaningful but winnable ────────────

describe('balance model — level-matched fight bands', () => {
  for (const level of [1, 10, 20]) {
    for (const cls of ['warrior', 'wizard', 'rogue'] as CharacterClass[]) {
      // Bands are deliberately generous — the offense/HP models are approximate,
      // so these guard against *gross* breakage (one-shot kills, 20-round
      // unwinnable slogs) rather than asserting false precision. Use the printed
      // diagnostic table for fine calibration.
      it(`${cls} L${level} kills in a sane number of rounds (2–9)`, () => {
        const m = modelFight(makeChar(cls, level), getMonsterById(MATCHUP[level])!);
        expect(m.killRounds).toBeGreaterThanOrEqual(2);
        expect(m.killRounds).toBeLessThanOrEqual(9);
      });

      it(`${cls} L${level} fight is winnable (HP loss < 100%)`, () => {
        const m = modelFight(makeChar(cls, level), getMonsterById(MATCHUP[level])!);
        expect(m.pctHpLost).toBeLessThan(1);
      });
    }
  }
});

// ── Damage-type affinity: off-school hurts more ──────────────────────────────

describe('balance model — damage-type affinity', () => {
  const physical: MonsterDef = {
    id: 'phys',
    name: 'Brute',
    level: 10,
    hp: 200,
    attack: 30,
    defense: 10,
    attackType: 'physical',
    xpReward: 0,
    goldReward: 0,
    lootTable: [],
    description: '',
  };
  const magic: MonsterDef = { ...physical, id: 'mag', name: 'Caster', attackType: 'magic' };

  it('a magic attacker hurts the Warrior more than a physical one of equal ATK', () => {
    const warrior = makeChar('warrior', 10);
    expect(avgMonsterDamage(warrior, magic)).toBeGreaterThan(avgMonsterDamage(warrior, physical));
  });

  it('the Wizard resists magic relative to the Warrior taking the same magic hit', () => {
    const wiz = makeChar('wizard', 10);
    const warrior = makeChar('warrior', 10);
    // Per-point: Wizard magic mult (0.75) < Warrior magic mult (1.3).
    expect(CLASS_DAMAGE_TAKEN.wizard.magic).toBeLessThan(CLASS_DAMAGE_TAKEN.warrior.magic);
    // And in the model the Wizard takes less raw magic than the Warrior would.
    expect(avgMonsterDamage(wiz, magic)).toBeLessThan(avgMonsterDamage(warrior, magic));
  });
});

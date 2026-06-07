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
import { getMonsterById, MONSTER_CATALOG } from '../monsters';
import { DUNGEON_BOSSES } from '../dungeons';
import type { Character, CharacterClass, MonsterDef, Stats } from '@/types';

// Telegraphed specials (heavy/burst/stun) wind up a round early, so the player
// can pre-empt them — they land less often than their raw chance. Instant
// specials (pierce/drain) land at full chance. These factors keep the model an
// honest mirror of live combat rather than a worst-case ceiling.
const TELEGRAPH_LAND_RATE = 0.4;
/** A stun costs ~a free undefended hit plus a fraction of a lost offensive turn. */
const STUN_TEMPO_FACTOR = 1.5;

// ── Representative builds ───────────────────────────────────────────────────

const BUILDS: Record<CharacterClass, Record<number, Stats>> = {
  warrior: {
    1: { strength: 8, stamina: 6, agility: 4, health: 7, wisdom: 3, defense: 6, spirit: 3 },
    10: { strength: 24, stamina: 14, agility: 4, health: 16, wisdom: 3, defense: 16, spirit: 4 },
    13: { strength: 30, stamina: 18, agility: 4, health: 21, wisdom: 3, defense: 22, spirit: 5 },
    15: { strength: 34, stamina: 20, agility: 5, health: 24, wisdom: 3, defense: 26, spirit: 5 },
    20: { strength: 45, stamina: 26, agility: 5, health: 30, wisdom: 4, defense: 34, spirit: 6 },
  },
  wizard: {
    1: { strength: 3, stamina: 5, agility: 6, health: 8, wisdom: 8, defense: 1, spirit: 7 },
    10: { strength: 3, stamina: 10, agility: 6, health: 18, wisdom: 26, defense: 10, spirit: 14 },
    13: { strength: 3, stamina: 12, agility: 7, health: 23, wisdom: 33, defense: 13, spirit: 18 },
    15: { strength: 4, stamina: 13, agility: 7, health: 26, wisdom: 37, defense: 15, spirit: 20 },
    20: { strength: 4, stamina: 16, agility: 8, health: 32, wisdom: 48, defense: 20, spirit: 26 },
  },
  // A realistic Rogue splits its allocation between AGI (dodge/escape) and STR
  // (its actual damage stat) rather than dumping everything into AGI.
  rogue: {
    1: { strength: 5, stamina: 8, agility: 8, health: 5, wisdom: 6, defense: 3, spirit: 3 },
    10: { strength: 20, stamina: 20, agility: 22, health: 14, wisdom: 6, defense: 12, spirit: 4 },
    13: { strength: 26, stamina: 26, agility: 30, health: 18, wisdom: 7, defense: 16, spirit: 6 },
    15: { strength: 30, stamina: 29, agility: 35, health: 20, wisdom: 7, defense: 18, spirit: 7 },
    20: { strength: 36, stamina: 34, agility: 44, health: 24, wisdom: 8, defense: 22, spirit: 8 },
  },
};

/** Level → the monster a player of that level would face as a "fair" fight. */
const MATCHUP: Record<number, string> = {
  1: 'goblin-scout',
  10: 'ancient-dragon',
  13: 'void-revenant',
  15: 'boss-dragon-king',
  20: 'storm-djinn',
};

/** Resolve a matchup id from either the arena catalog or the dungeon-boss table. */
function monsterFor(level: number): MonsterDef {
  const id = MATCHUP[level];
  const arena = getMonsterById(id);
  if (arena) return arena;
  const boss = Object.values(DUNGEON_BOSSES).find((b) => b.id === id);
  if (!boss) throw new Error(`no monster for level ${level} (${id})`);
  return boss;
}

const FIGHT_LEVELS = [1, 10, 13, 15, 20];

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
  // The 1-round ability cooldown means the player can't ability every turn — but
  // the optimal off-turn is a SPELL (no cooldown, ~ability strength), not a weak
  // basic. So a level-matched, spell-equipped player barely loses DPS: the
  // cooldown changes HOW you fight (vary actions), not HOW HARD it is. Model the
  // off-turn as mostly-spell with a small tax: a 75/25 ability/basic blend.
  const sustained = 0.75 * ability + 0.25 * basic;
  // Spirit crit applies to attacks, abilities, and spells — fold its expected
  // value in so the model mirrors the live damage path (small at low Spirit).
  const spirit = effectiveStat(char, 'spirit');
  const critEv = 1 + spellCritChance(spirit) * (spellCritDamage(spirit) - 1);
  return sustained * critEv;
}

/** The monster's normal per-hit counter (before specials), school + DEF applied. */
function baseCounter(char: Character, monster: MonsterDef): number {
  const type = monster.attackType ?? 'physical';
  const mult = CLASS_DAMAGE_TAKEN[char.class][type];
  const effPlayerDef = (effectiveStat(char, 'defense') + 0) * (1 - COMBAT.DEFENSE_FAIL_CHANCE); // gear-less model
  const mitigated = type === 'magic' ? monster.attack : Math.max(0, monster.attack - effPlayerDef);
  return Math.max(COMBAT.MIN_DAMAGE, mitigated * mult);
}

/**
 * Expected EXTRA damage-per-round from a monster's special moves. Telegraphed
 * specials (heavy/burst/stun) are discounted by `TELEGRAPH_LAND_RATE` (the
 * player can pre-empt them); instant specials (pierce) at full chance. `drain`
 * is sustain, not player damage — it lives in `effectiveMonsterHp`. Marginal
 * EVs are summed (slightly conservative since only one special fires per
 * counter) — fine for a safety-margin model.
 */
function specialDamageEv(char: Character, monster: MonsterDef): number {
  const moves = monster.specialMoves ?? [];
  if (moves.length === 0) return 0;
  const type = monster.attackType ?? 'physical';
  const physMult = CLASS_DAMAGE_TAKEN[char.class].physical;
  const magicMult = CLASS_DAMAGE_TAKEN[char.class].magic;
  const effPlayerDef = effectiveStat(char, 'defense') * (1 - COMBAT.DEFENSE_FAIL_CHANCE);
  const counter = baseCounter(char, monster);
  let ev = 0;
  for (const m of moves) {
    const telegraphed =
      m.effect.kind === 'heavy' || m.effect.kind === 'burst' || m.effect.kind === 'stun';
    const rate = m.chance * (telegraphed ? TELEGRAPH_LAND_RATE : 1);
    switch (m.effect.kind) {
      case 'heavy':
        ev += rate * (m.effect.multiplier - 1) * counter;
        break;
      case 'pierce':
        // Only meaningful vs a physical monster (magic already ignores armor).
        if (type === 'physical') ev += rate * Math.min(effPlayerDef, monster.attack) * physMult;
        break;
      case 'burst':
        // Physical → magic delta (negative for classes that resist magic).
        if (type === 'physical') ev += rate * (monster.attack * magicMult - counter);
        break;
      case 'stun':
        ev += rate * STUN_TEMPO_FACTOR * counter;
        break;
      case 'drain':
        break; // sustain — see effectiveMonsterHp
    }
  }
  return Math.max(0, ev);
}

/** Average monster counter-attack damage to the player — school, dodge, specials. */
function avgMonsterDamage(char: Character, monster: MonsterDef): number {
  const raw = baseCounter(char, monster) + specialDamageEv(char, monster);
  return raw * (1 - classDodgeChance(char)); // dodge averages damage down
}

/**
 * Effective monster HP, folding in self-sustain (regen, vampiric, drain) and the
 * one-time summon-add HP bump. Sustain extends the fight, so it raises effective
 * HP → more kill-rounds. A single-pass approximation (rounds depend on HP, which
 * depends on rounds) — good enough for a calibration model.
 */
function effectiveMonsterHp(char: Character, monster: MonsterDef, playerDmg: number): number {
  // summon-add raises the cap; the `heal` active is a one-time "second wind"
  // restore — both add HP the player must chew through.
  const summon = monster.active?.id === 'summon-add' ? monster.active.value : 0;
  const heal = monster.active?.id === 'heal' ? monster.active.value : 0;
  const baseHp = monster.hp + summon + heal;
  const counter = baseCounter(char, monster);
  const regen = monster.passive?.id === 'regen' ? monster.passive.value : 0;
  const vamp = monster.passive?.id === 'vampiric' ? (monster.passive.value / 100) * counter : 0;
  const drainMove = (monster.specialMoves ?? []).find((m) => m.effect.kind === 'drain');
  const drain =
    drainMove && drainMove.effect.kind === 'drain'
      ? drainMove.chance * (drainMove.effect.pct / 100) * counter
      : 0;
  const sustainPerRound = regen + vamp + drain;
  const rounds0 = Math.max(1, Math.ceil(baseHp / playerDmg));
  return baseHp + sustainPerRound * rounds0;
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
  const effHp = effectiveMonsterHp(char, monster, playerDmg);
  const killRounds = Math.max(1, Math.ceil(effHp / playerDmg));
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
    for (const level of FIGHT_LEVELS) {
      const monster = monsterFor(level);
      for (const cls of ['warrior', 'wizard', 'rogue'] as CharacterClass[]) {
        const m = modelFight(makeChar(cls, level), monster);
        rows.push(
          `L${level} ${cls.padEnd(7)} vs ${monster.name.padEnd(20)} ` +
            `HP=${m.maxHp} STA=${m.maxStamina} MAG=${m.maxMagic} ` +
            `kill=${m.killRounds}r hpLost=${(m.pctHpLost * 100).toFixed(0)}%`,
        );
      }
    }
    console.log('\n' + rows.join('\n') + '\n');
    expect(rows.length).toBe(FIGHT_LEVELS.length * 3);
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
  for (const level of FIGHT_LEVELS) {
    for (const cls of ['warrior', 'wizard', 'rogue'] as CharacterClass[]) {
      // Bands are deliberately generous — the offense/HP models are approximate,
      // so these guard against *gross* breakage (one-shot kills, 20-round
      // unwinnable slogs) rather than asserting false precision. Use the printed
      // diagnostic table for fine calibration.
      it(`${cls} L${level} kills in a sane number of rounds (2–9)`, () => {
        const m = modelFight(makeChar(cls, level), monsterFor(level));
        expect(m.killRounds).toBeGreaterThanOrEqual(2);
        expect(m.killRounds).toBeLessThanOrEqual(9);
      });

      it(`${cls} L${level} fight is winnable (HP loss < 95%)`, () => {
        const m = modelFight(makeChar(cls, level), monsterFor(level));
        expect(m.pctHpLost).toBeLessThan(0.95);
      });
    }
  }
});

// ── Guardrail: no monster runaway-heals (vampiric + drain on one body) ───────

describe('balance model — self-heal guardrail', () => {
  it('no monster stacks a vampiric passive AND a drain special', () => {
    const all = [...MONSTER_CATALOG, ...Object.values(DUNGEON_BOSSES)];
    const offenders = all.filter(
      (m) =>
        m.passive?.id === 'vampiric' &&
        (m.specialMoves ?? []).some((s) => s.effect.kind === 'drain'),
    );
    expect(offenders.map((m) => m.id)).toEqual([]);
  });
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

import type { Character, MonsterDef } from '@/types';
import { gearAttackBonus, gearDefenseBonus, monsterArmorPierce, rollD10 } from './combat';
import { COMBAT } from './constants';
import { applySubclassAbilityMods, getAbilityDamageMultiplier } from './passives';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DicePattern =
  | 'three_of_a_kind'
  | 'four_of_a_kind'
  | 'full_house'
  | 'small_straight'
  | 'large_straight';

export interface AbilityDef {
  id: string;
  name: string;
  description: string;
  pattern: DicePattern;
  emoji: string;
  damageMultiplier: number;
  bypassMonsterDef: boolean;
  stunMonster: boolean; // monster skips counter-attack this round
  lifestealPct: number; // 0–1 fraction of damage dealt returned as HP
  bypassPlayerDef: boolean; // Berserker Rage: player also ignores their own defense
}

export interface AbilityResolution {
  ability: AbilityDef | null; // null = fizzle
  dice: number[];
  pattern: DicePattern | null;
  playerDamage: number;
  monsterDamage: number;
  monsterStunned: boolean;
  playerDefFailed: boolean;
  /** Flat HP healed at end of this round — Paladin subclass bonuses (shield-slam, unstoppable). */
  flatPassiveHeal: number;
  /** Formula intermediates — only set on the ability hit path (not fizzle). */
  formulaBreakdown?: {
    avgRoll: number;
    statBonus: number;
    gearBonus: number;
    baseHit: number;
    damageMultiplier: number;
    rawDamage: number;
    monsterDef: number;
  };
}

// ─── Ability catalog ──────────────────────────────────────────────────────────
// One ability per class × pattern combination: 5 patterns × 3 classes = 15 total.

const CLASS_ABILITY_CATALOG: Record<string, Record<DicePattern, AbilityDef>> = {
  warrior: {
    three_of_a_kind: {
      id: 'power-strike',
      name: 'Power Strike',
      description: 'Channel raw force into a single devastating blow.',
      pattern: 'three_of_a_kind',
      emoji: '💪',
      damageMultiplier: 2,
      bypassMonsterDef: true,
      stunMonster: false,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    full_house: {
      id: 'shield-slam',
      name: 'Shield Slam',
      description: "Bash the enemy with your shield — they can't counter.",
      pattern: 'full_house',
      emoji: '🛡️',
      damageMultiplier: 2,
      bypassMonsterDef: false,
      stunMonster: true,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    small_straight: {
      id: 'war-cry',
      name: 'War Cry',
      description: 'A fearsome roar that shakes the enemy to their core.',
      pattern: 'small_straight',
      emoji: '📣',
      damageMultiplier: 1.5,
      bypassMonsterDef: false,
      stunMonster: true,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    large_straight: {
      id: 'berserker-rage',
      name: 'Berserker Rage',
      description: 'All defenses down — yours and theirs. Pure destruction.',
      pattern: 'large_straight',
      emoji: '🔥',
      damageMultiplier: 3,
      bypassMonsterDef: true,
      stunMonster: false,
      lifestealPct: 0,
      bypassPlayerDef: true,
    },
    four_of_a_kind: {
      id: 'unstoppable',
      name: 'Unstoppable',
      description: 'Nothing stands between you and your target.',
      pattern: 'four_of_a_kind',
      emoji: '⚡',
      damageMultiplier: 3,
      bypassMonsterDef: true,
      stunMonster: true,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
  },

  wizard: {
    three_of_a_kind: {
      id: 'arcane-bolt',
      name: 'Arcane Bolt',
      description: 'A concentrated burst of arcane energy.',
      pattern: 'three_of_a_kind',
      emoji: '✨',
      damageMultiplier: 2,
      bypassMonsterDef: false,
      stunMonster: false,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    full_house: {
      id: 'mana-surge',
      name: 'Mana Surge',
      description: 'Release a surge of raw mana that staggers the enemy.',
      pattern: 'full_house',
      emoji: '🌀',
      damageMultiplier: 2,
      bypassMonsterDef: false,
      stunMonster: true,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    small_straight: {
      id: 'chain-lightning',
      name: 'Chain Lightning',
      description: 'Lightning that arcs through the target with triple force.',
      pattern: 'small_straight',
      emoji: '⚡',
      damageMultiplier: 3,
      bypassMonsterDef: false,
      stunMonster: false,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    large_straight: {
      id: 'meteor',
      name: 'Meteor',
      description: 'Call down a meteor from the sky. Defense is meaningless.',
      pattern: 'large_straight',
      emoji: '☄️',
      damageMultiplier: 3,
      bypassMonsterDef: true,
      stunMonster: false,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    four_of_a_kind: {
      id: 'time-warp',
      name: 'Time Warp',
      description: "Bend time to strike 2.5× and prevent the enemy's response.",
      pattern: 'four_of_a_kind',
      emoji: '⏳',
      damageMultiplier: 2.5,
      bypassMonsterDef: false,
      stunMonster: true,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
  },

  rogue: {
    three_of_a_kind: {
      id: 'backstab',
      name: 'Backstab',
      description: 'Strike from the shadows for twice the pain.',
      pattern: 'three_of_a_kind',
      emoji: '🗡️',
      damageMultiplier: 2,
      bypassMonsterDef: false,
      stunMonster: false,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    full_house: {
      id: 'smoke-bomb',
      name: 'Smoke Bomb',
      description: "Blind the enemy — they can't counter while coughing.",
      pattern: 'full_house',
      emoji: '💨',
      damageMultiplier: 1.5,
      bypassMonsterDef: false,
      stunMonster: true,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    small_straight: {
      id: 'blade-dance',
      name: 'Blade Dance',
      description: 'A fluid sequence of cuts — 30% of damage returns as HP.',
      pattern: 'small_straight',
      emoji: '💃',
      damageMultiplier: 1.5,
      bypassMonsterDef: false,
      stunMonster: false,
      lifestealPct: 0.3,
      bypassPlayerDef: false,
    },
    large_straight: {
      id: 'death-mark',
      name: 'Death Mark',
      description: 'Brand the target for 2.5× damage — 50% returned as life.',
      pattern: 'large_straight',
      emoji: '💀',
      damageMultiplier: 2.5,
      bypassMonsterDef: false,
      stunMonster: false,
      lifestealPct: 0.5,
      bypassPlayerDef: false,
    },
    four_of_a_kind: {
      id: 'assassinate',
      name: 'Assassinate',
      description: 'Eliminate the target instantly — bypass defense, stun, triple damage.',
      pattern: 'four_of_a_kind',
      emoji: '☠️',
      damageMultiplier: 3,
      bypassMonsterDef: true,
      stunMonster: true,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
  },
};

// ─── Pattern detection ────────────────────────────────────────────────────────
// Priority: four_of_a_kind > full_house > large_straight > small_straight > three_of_a_kind > null

export function detectPattern(dice: number[]): DicePattern | null {
  const counts = new Map<number, number>();
  for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);

  const vals = Array.from(counts.values()).sort((a, b) => b - a);
  const uniqueSet = new Set(dice);

  // Four of a kind
  if (vals[0] >= 4) return 'four_of_a_kind';

  // Full house — 3 of one value + 2 of another
  if (vals[0] >= 3 && (vals[1] ?? 0) >= 2) return 'full_house';

  // Large straight — 5 consecutive distinct values (1-5 or 2-6 on d6)
  for (let start = 1; start <= 2; start++) {
    if ([0, 1, 2, 3, 4].every((i) => uniqueSet.has(start + i))) return 'large_straight';
  }

  // Small straight — 4 consecutive distinct values
  for (let start = 1; start <= 3; start++) {
    if ([0, 1, 2, 3].every((i) => uniqueSet.has(start + i))) return 'small_straight';
  }

  // Three of a kind
  if (vals[0] >= 3) return 'three_of_a_kind';

  return null;
}

// ─── Ability lookup ───────────────────────────────────────────────────────────

export function getAbility(characterClass: string, pattern: DicePattern): AbilityDef | null {
  return CLASS_ABILITY_CATALOG[characterClass]?.[pattern] ?? null;
}

// ─── Resolve ability ──────────────────────────────────────────────────────────

/**
 * Roll 6d6, detect the poker-like pattern, and resolve the class ability outcome.
 *
 * If no pattern matches, it's a "fizzle" — the stamina is still spent, the player
 * deals reduced damage using the average of the 6 dice, and the monster retaliates.
 *
 * isFirstAbility — true only for the first ability roll of this fight; used by
 * Assassin (Lethal Opener: 2× damage) and Opening Strike (0 stamina cost).
 */
export function resolveAbility(
  character: Character,
  monster: MonsterDef,
  isFirstAbility = false,
): AbilityResolution {
  // Roll 6 d6
  const dice = Array.from({ length: 6 }, () => Math.ceil(Math.random() * 6));
  const pattern = detectPattern(dice);

  // Stat bonus (same factors as regular combat)
  const isWizard = character.class === 'wizard';
  const attackMode = isWizard ? 'magic' : 'attack';
  const gearBonus = gearAttackBonus(character, attackMode);
  const statBonus = isWizard
    ? Math.floor(character.stats.wisdom * COMBAT.WISDOM_ATTACK_FACTOR)
    : Math.floor(character.stats.strength * COMBAT.STRENGTH_ATTACK_FACTOR);

  // Average of all 6 dice serves as the base roll (replaces the d10 used in regular attacks).
  const avgRoll = Math.round(dice.reduce((a, b) => a + b, 0) / dice.length);
  const baseHit = avgRoll + statBonus + gearBonus;

  // ── Fizzle path ────────────────────────────────────────────────────────────
  if (!pattern) {
    const playerDamage = Math.max(0, baseHit - monster.defense);
    const { monsterDamage, playerDefFailed } = rollMonsterAttack(character, monster, false);
    return {
      ability: null,
      dice,
      pattern: null,
      playerDamage,
      monsterDamage,
      monsterStunned: false,
      playerDefFailed,
      flatPassiveHeal: 0,
    };
  }

  // ── Ability path ───────────────────────────────────────────────────────────
  const baseAbility = getAbility(character.class, pattern);
  if (!baseAbility) {
    // Fallback — treat as fizzle if somehow class is unknown
    const playerDamage = Math.max(0, baseHit - monster.defense);
    const { monsterDamage, playerDefFailed } = rollMonsterAttack(character, monster, false);
    return {
      ability: null,
      dice,
      pattern,
      playerDamage,
      monsterDamage,
      monsterStunned: false,
      playerDefFailed,
      flatPassiveHeal: 0,
    };
  }

  // ── Step 1: bake in ability-specific subclass mods ───────────────────────────
  // applySubclassAbilityMods adjusts the ability's damage multiplier, lifesteal,
  // stun flag, or flatHeal for subclasses like Berserker, Paladin, Archmage, etc.
  // Lethal Opener (Assassin) extra multiplier is also applied here.
  //
  // Step 2 happens in handleAbility (combat/page.tsx): applyOutgoingPassives then
  // adds Battle-Hardened flat bonus and Bloodlust multiplier on top of this value.
  const ability = applySubclassAbilityMods(character, baseAbility);

  // Apply Lethal Opener (Assassin) — 2× on first ability this fight
  const extraMultiplier = getAbilityDamageMultiplier(character, isFirstAbility);

  const rawDamage = Math.round(baseHit * ability.damageMultiplier * extraMultiplier);
  const playerDamage = Math.max(
    1,
    ability.bypassMonsterDef ? rawDamage : rawDamage - monster.defense,
  );

  let monsterDamage = 0;
  let playerDefFailed = false;
  if (!ability.stunMonster) {
    const result = rollMonsterAttack(character, monster, ability.bypassPlayerDef);
    monsterDamage = result.monsterDamage;
    playerDefFailed = result.playerDefFailed;
  }

  return {
    ability,
    dice,
    pattern,
    playerDamage,
    monsterDamage,
    monsterStunned: ability.stunMonster,
    playerDefFailed,
    flatPassiveHeal: ability.flatHeal,
    formulaBreakdown: {
      avgRoll,
      statBonus,
      gearBonus,
      baseHit,
      damageMultiplier: ability.damageMultiplier * extraMultiplier,
      rawDamage,
      monsterDef: ability.bypassMonsterDef ? 0 : monster.defense,
    },
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function rollMonsterAttack(
  character: Character,
  monster: MonsterDef,
  bypassPlayerDef: boolean,
): { monsterDamage: number; playerDefFailed: boolean } {
  const monsterRoll = rollD10();
  const totalDef = (character.stats.defense ?? 0) + gearDefenseBonus(character);
  const playerDefFailed = bypassPlayerDef || Math.random() < COMBAT.DEFENSE_FAIL_CHANCE;
  // Armor-pierce reduces the player's effective defense when it lands; failed
  // blocks are already zero so pierce can't further reduce them.
  const effectiveDef = playerDefFailed ? 0 : Math.max(0, totalDef - monsterArmorPierce(monster));
  const rawMonsterDamage = monsterRoll + monster.attack;
  const monsterDamage = playerDefFailed
    ? rawMonsterDamage
    : Math.max(0, rawMonsterDamage - effectiveDef);
  return { monsterDamage, playerDefFailed };
}

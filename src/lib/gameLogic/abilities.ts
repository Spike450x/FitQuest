import type { Character, MonsterDef } from "@/types";
import { gearAttackBonus, gearDefenseBonus } from "./combat";
import { COMBAT } from "./constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DicePattern =
  | "three_of_a_kind"
  | "four_of_a_kind"
  | "full_house"
  | "small_straight"
  | "large_straight";

export interface AbilityDef {
  id: string;
  name: string;
  description: string;
  pattern: DicePattern;
  emoji: string;
  damageMultiplier: number;
  bypassMonsterDef: boolean;
  stunMonster: boolean;       // monster skips counter-attack this round
  lifestealPct: number;       // 0–1 fraction of damage dealt returned as HP
  bypassPlayerDef: boolean;   // Berserker Rage: player also ignores their own defense
}

export interface AbilityResolution {
  ability: AbilityDef | null;  // null = fizzle
  dice: number[];
  pattern: DicePattern | null;
  playerDamage: number;
  monsterDamage: number;
  healAmount: number;
  monsterStunned: boolean;
  playerDefFailed: boolean;
}

// ─── Ability catalog ──────────────────────────────────────────────────────────
// One ability per class × pattern combination (5 patterns × 3 classes = 15).

const ABILITIES: Record<string, Record<DicePattern, AbilityDef>> = {
  warrior: {
    three_of_a_kind: {
      id: "power-strike",
      name: "Power Strike",
      description: "Channel raw force into a single devastating blow.",
      pattern: "three_of_a_kind",
      emoji: "💪",
      damageMultiplier: 2,
      bypassMonsterDef: true,
      stunMonster: false,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    full_house: {
      id: "shield-slam",
      name: "Shield Slam",
      description: "Bash the enemy with your shield — they can't counter.",
      pattern: "full_house",
      emoji: "🛡️",
      damageMultiplier: 2,
      bypassMonsterDef: false,
      stunMonster: true,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    small_straight: {
      id: "war-cry",
      name: "War Cry",
      description: "A fearsome roar that shakes the enemy to their core.",
      pattern: "small_straight",
      emoji: "📣",
      damageMultiplier: 1.5,
      bypassMonsterDef: false,
      stunMonster: true,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    large_straight: {
      id: "berserker-rage",
      name: "Berserker Rage",
      description: "All defenses down — yours and theirs. Pure destruction.",
      pattern: "large_straight",
      emoji: "🔥",
      damageMultiplier: 3,
      bypassMonsterDef: true,
      stunMonster: false,
      lifestealPct: 0,
      bypassPlayerDef: true,
    },
    four_of_a_kind: {
      id: "unstoppable",
      name: "Unstoppable",
      description: "Nothing stands between you and your target.",
      pattern: "four_of_a_kind",
      emoji: "⚡",
      damageMultiplier: 3,
      bypassMonsterDef: true,
      stunMonster: true,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
  },

  wizard: {
    three_of_a_kind: {
      id: "arcane-bolt",
      name: "Arcane Bolt",
      description: "A concentrated burst of arcane energy.",
      pattern: "three_of_a_kind",
      emoji: "✨",
      damageMultiplier: 2,
      bypassMonsterDef: false,
      stunMonster: false,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    full_house: {
      id: "mana-surge",
      name: "Mana Surge",
      description: "Release a surge of raw mana that staggers the enemy.",
      pattern: "full_house",
      emoji: "🌀",
      damageMultiplier: 2,
      bypassMonsterDef: false,
      stunMonster: true,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    small_straight: {
      id: "chain-lightning",
      name: "Chain Lightning",
      description: "Lightning that arcs through the target with triple force.",
      pattern: "small_straight",
      emoji: "⚡",
      damageMultiplier: 3,
      bypassMonsterDef: false,
      stunMonster: false,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    large_straight: {
      id: "meteor",
      name: "Meteor",
      description: "Call down a meteor from the sky. Defense is meaningless.",
      pattern: "large_straight",
      emoji: "☄️",
      damageMultiplier: 3,
      bypassMonsterDef: true,
      stunMonster: false,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    four_of_a_kind: {
      id: "time-warp",
      name: "Time Warp",
      description: "Bend time to strike 2.5× and prevent the enemy's response.",
      pattern: "four_of_a_kind",
      emoji: "⏳",
      damageMultiplier: 2.5,
      bypassMonsterDef: false,
      stunMonster: true,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
  },

  rogue: {
    three_of_a_kind: {
      id: "backstab",
      name: "Backstab",
      description: "Strike from the shadows for twice the pain.",
      pattern: "three_of_a_kind",
      emoji: "🗡️",
      damageMultiplier: 2,
      bypassMonsterDef: false,
      stunMonster: false,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    full_house: {
      id: "smoke-bomb",
      name: "Smoke Bomb",
      description: "Blind the enemy — they can't counter while coughing.",
      pattern: "full_house",
      emoji: "💨",
      damageMultiplier: 1.5,
      bypassMonsterDef: false,
      stunMonster: true,
      lifestealPct: 0,
      bypassPlayerDef: false,
    },
    small_straight: {
      id: "blade-dance",
      name: "Blade Dance",
      description: "A fluid sequence of cuts — 30% of damage returns as HP.",
      pattern: "small_straight",
      emoji: "💃",
      damageMultiplier: 1.5,
      bypassMonsterDef: false,
      stunMonster: false,
      lifestealPct: 0.3,
      bypassPlayerDef: false,
    },
    large_straight: {
      id: "death-mark",
      name: "Death Mark",
      description: "Brand the target for 2.5× damage — 50% returned as life.",
      pattern: "large_straight",
      emoji: "💀",
      damageMultiplier: 2.5,
      bypassMonsterDef: false,
      stunMonster: false,
      lifestealPct: 0.5,
      bypassPlayerDef: false,
    },
    four_of_a_kind: {
      id: "assassinate",
      name: "Assassinate",
      description: "Eliminate the target instantly — bypass defense, stun, triple damage.",
      pattern: "four_of_a_kind",
      emoji: "☠️",
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
  if (vals[0] >= 4) return "four_of_a_kind";

  // Full house — 3 of one value + 2 of another
  if (vals[0] >= 3 && (vals[1] ?? 0) >= 2) return "full_house";

  // Large straight — 5 consecutive distinct values (1-5 or 2-6 on d6)
  for (let start = 1; start <= 2; start++) {
    if ([0, 1, 2, 3, 4].every((i) => uniqueSet.has(start + i))) return "large_straight";
  }

  // Small straight — 4 consecutive distinct values
  for (let start = 1; start <= 3; start++) {
    if ([0, 1, 2, 3].every((i) => uniqueSet.has(start + i))) return "small_straight";
  }

  // Three of a kind
  if (vals[0] >= 3) return "three_of_a_kind";

  return null;
}

// ─── Ability lookup ───────────────────────────────────────────────────────────

export function getAbility(
  characterClass: string,
  pattern: DicePattern,
): AbilityDef | null {
  return ABILITIES[characterClass]?.[pattern] ?? null;
}

// ─── Resolve ability ──────────────────────────────────────────────────────────

/** Roll 6d6 and resolve the ability outcome for the given character vs monster. */
export function resolveAbility(
  character: Character,
  monster: MonsterDef,
): AbilityResolution {
  // Roll 6 d6
  const dice = Array.from({ length: 6 }, () => Math.ceil(Math.random() * 6));
  const pattern = detectPattern(dice);

  // Stat bonus (same factors as regular combat)
  const isWizard = character.class === "wizard";
  const attackType = isWizard ? "magic" : "attack";
  const gearBonus = gearAttackBonus(character, attackType);
  const statBonus = isWizard
    ? Math.floor(character.stats.wisdom * COMBAT.WISDOM_ATTACK_FACTOR)
    : Math.floor(character.stats.strength * COMBAT.STRENGTH_ATTACK_FACTOR);

  // Avg of 6 dice as the "roll" (replaces d10)
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
      healAmount: 0,
      monsterStunned: false,
      playerDefFailed,
    };
  }

  // ── Ability path ───────────────────────────────────────────────────────────
  const ability = getAbility(character.class, pattern);
  if (!ability) {
    // Fallback — treat as fizzle if somehow class is unknown
    const playerDamage = Math.max(0, baseHit - monster.defense);
    const { monsterDamage, playerDefFailed } = rollMonsterAttack(character, monster, false);
    return { ability: null, dice, pattern, playerDamage, monsterDamage, healAmount: 0, monsterStunned: false, playerDefFailed };
  }

  const rawDamage = Math.round(baseHit * ability.damageMultiplier);
  const playerDamage = Math.max(
    1,
    ability.bypassMonsterDef ? rawDamage : rawDamage - monster.defense,
  );

  const healAmount = Math.round(playerDamage * ability.lifestealPct);

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
    healAmount,
    monsterStunned: ability.stunMonster,
    playerDefFailed,
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function rollMonsterAttack(
  character: Character,
  monster: MonsterDef,
  bypassPlayerDef: boolean,
): { monsterDamage: number; playerDefFailed: boolean } {
  const monsterRoll = Math.ceil(Math.random() * 10);
  const playerDef = (character.stats.defense ?? 0) + gearDefenseBonus(character);
  const playerDefFailed = bypassPlayerDef || Math.random() < COMBAT.DEFENSE_FAIL_CHANCE;
  const rawMonsterDamage = monsterRoll + monster.attack;
  const monsterDamage = playerDefFailed
    ? rawMonsterDamage
    : Math.max(0, rawMonsterDamage - playerDef);
  return { monsterDamage, playerDefFailed };
}

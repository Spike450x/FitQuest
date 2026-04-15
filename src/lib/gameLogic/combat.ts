import { COMBAT } from "./constants";
import { getItemById } from "./items";
import type { Character, EquippedGear, MonsterDef, Stats } from "@/types";

/**
 * Total magic pool available to the player.
 * Scales with wisdom stat; wizards receive an additional class bonus.
 */
export function playerMaxMagic(character: Pick<Character, "stats" | "class">): number {
  return (
    COMBAT.BASE_MAGIC +
    character.stats.wisdom * COMBAT.MAGIC_PER_WISDOM +
    (character.class === "wizard" ? COMBAT.WIZARD_MAGIC_BONUS : 0)
  );
}

// ─── Gear stat aggregation ────────────────────────────────────────────────────

/**
 * Sums stat bonuses from every equipped item (weapon + armor + accessory).
 * Used as the single source of truth for gear contributions to all calculations.
 */
export function totalGearBonuses(equippedGear: EquippedGear | null | undefined): Partial<Stats> {
  const result: Partial<Stats> = {};
  if (!equippedGear) return result;
  for (const itemId of [equippedGear.weapon, equippedGear.armor, equippedGear.accessory]) {
    if (!itemId) continue;
    const def = getItemById(itemId);
    if (!def) continue;
    for (const [key, val] of Object.entries(def.statBonuses) as [keyof Stats, number][]) {
      result[key] = (result[key] ?? 0) + (val ?? 0);
    }
  }
  return result;
}

// ─── Gear bonus helpers ───────────────────────────────────────────────────────

/**
 * Total STR or WIS bonus from all equipped items.
 * Includes weapon AND accessories (e.g. Warrior's Pendant gives +3 STR).
 */
export function gearAttackBonus(character: Character, attackType: "attack" | "magic"): number {
  const bonuses = totalGearBonuses(character.equippedGear);
  return attackType === "magic"
    ? (bonuses.wisdom ?? 0)
    : (bonuses.strength ?? 0);
}

/**
 * Total DEF bonus from all equipped items.
 * Stacks with the character's base defense stat.
 */
export function gearDefenseBonus(character: Character): number {
  return totalGearBonuses(character.equippedGear).defense ?? 0;
}

/** Roll a d10 — returns a value between ATTACK_RNG_MIN and ATTACK_RNG_MAX inclusive. */
export function rollDice(): number {
  return (
    Math.floor(Math.random() * (COMBAT.ATTACK_RNG_MAX - COMBAT.ATTACK_RNG_MIN + 1)) +
    COMBAT.ATTACK_RNG_MIN
  );
}

/**
 * Total HP available to the player.
 * Includes health and stamina bonuses from all equipped gear.
 */
export function playerMaxHp(character: Pick<Character, "stats" | "equippedGear">): number {
  const gear = totalGearBonuses(character.equippedGear);
  return (
    COMBAT.BASE_HP +
    (character.stats.stamina + (gear.stamina ?? 0)) * COMBAT.HP_PER_STAMINA +
    (character.stats.health  + (gear.health  ?? 0)) * COMBAT.HP_PER_HEALTH
  );
}

/**
 * Stamina pool available at the start of a fight.
 * Includes stamina bonuses from all equipped gear.
 */
export function playerMaxStamina(character: Pick<Character, "stats" | "equippedGear">): number {
  const gear = totalGearBonuses(character.equippedGear);
  return COMBAT.BASE_STAMINA + (character.stats.stamina + (gear.stamina ?? 0)) * COMBAT.STAMINA_PER_STAT;
}

/**
 * Calculate one interactive round of combat.
 *
 * attackType:
 *   "attack" — uses Strength (warrior/rogue playstyle)
 *   "magic"  — uses Wisdom  (wizard playstyle, or any class with high WIS)
 *
 * Each defender has a DEFENSE_FAIL_CHANCE of their defense being bypassed entirely.
 *
 * Future — Special Abilities (Post-MVP):
 *   Plan to support multi-dice (6d10) combo abilities. A specific combination of
 *   dice values (e.g. three 7s, a straight 1-2-3) triggers a class-specific ability
 *   with bonus effects (stun, lifesteal, double damage, etc.). One "ability roll"
 *   available per fight. The single-d10 mechanics here are the base; ability mode
 *   adds a separate "roll all 6 dice" action alongside Attack / Magic / Run Away.
 */
export function calculateRound(
  character: Character,
  monster: MonsterDef,
  attackType: "attack" | "magic"
): {
  roll: number;
  attackBonus: number;
  attackBonusLabel: "STR" | "WIS";
  playerDamage: number;
  monsterRoll: number;
  monsterDamage: number;
  playerDefFailed: boolean;
  monsterDefFailed: boolean;
} {
  const roll = rollDice();

  const statBonus =
    attackType === "magic"
      ? Math.floor(character.stats.wisdom * COMBAT.WISDOM_ATTACK_FACTOR)
      : Math.floor(character.stats.strength * COMBAT.STRENGTH_ATTACK_FACTOR);
  const weaponBonus = gearAttackBonus(character, attackType);
  const attackBonus = statBonus + weaponBonus;
  const attackBonusLabel = attackType === "magic" ? "WIS" : "STR";

  // Monster's defense might fail
  const monsterDefFailed = Math.random() < COMBAT.DEFENSE_FAIL_CHANCE;
  const effectiveMonsterDef = monsterDefFailed ? 0 : monster.defense;
  const playerDamage = Math.max(COMBAT.MIN_DAMAGE, attackBonus + roll - effectiveMonsterDef);

  // Monster rolls its own d10 for its counter-attack
  const monsterRoll = rollDice();

  // Player's defense might fail (stat + gear)
  const playerDefFailed = Math.random() < COMBAT.DEFENSE_FAIL_CHANCE;
  const totalPlayerDef = (character.stats.defense ?? 0) + gearDefenseBonus(character);
  const effectivePlayerDef = playerDefFailed ? 0 : totalPlayerDef;
  const monsterDamage = Math.max(COMBAT.MIN_DAMAGE, monster.attack - effectivePlayerDef);

  return {
    roll,
    attackBonus,
    attackBonusLabel,
    playerDamage,
    monsterRoll,
    monsterDamage,
    playerDefFailed,
    monsterDefFailed,
  };
}

/**
 * Roll the loot table for a defeated monster.
 * Each entry is an independent Bernoulli trial — items can each drop (or not)
 * regardless of what else drops. Returns the item IDs that were awarded.
 */
export function rollLoot(lootTable: Array<{ itemId: string; chance: number }>): string[] {
  return lootTable
    .filter(({ chance }) => Math.random() < chance)
    .map(({ itemId }) => itemId);
}

/**
 * Attempt to run away from combat.
 * Player rolls d10 + Agility bonus vs monster rolls d10.
 * If player total > monsterRoll: escaped — no damage taken.
 * If player total <= monsterRoll: failed — monster attacks, player defense applies.
 */
export function rollRunAway(
  character: Character,
  monster: MonsterDef
): {
  playerRoll: number;
  agilityBonus: number;
  monsterRoll: number;
  escaped: boolean;
  monsterDamage: number;
  playerDefFailed: boolean;
} {
  const playerRoll = rollDice();
  const gear = totalGearBonuses(character.equippedGear);
  const effectiveAgility = (character.stats.agility ?? 0) + (gear.agility ?? 0);
  const agilityBonus = Math.floor(effectiveAgility * COMBAT.AGILITY_ESCAPE_FACTOR);
  const monsterRoll = rollDice();
  const escaped = playerRoll + agilityBonus > monsterRoll;

  let monsterDamage = 0;
  let playerDefFailed = false;

  if (!escaped) {
    // Failed escape: monster gets a free hit
    playerDefFailed = Math.random() < COMBAT.DEFENSE_FAIL_CHANCE;
    const totalDef = (character.stats.defense ?? 0) + gearDefenseBonus(character);
    const effectivePlayerDef = playerDefFailed ? 0 : totalDef;
    monsterDamage = Math.max(COMBAT.MIN_DAMAGE, monster.attack - effectivePlayerDef);
  }

  return { playerRoll, agilityBonus, monsterRoll, escaped, monsterDamage, playerDefFailed };
}

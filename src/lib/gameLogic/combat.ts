import { COMBAT } from './constants';
import { getItemById } from './items';
import type { Character, EquippedGear, MonsterDef, Stats } from '@/types';
import { getEscapeBonus, hasSureEscape } from './passives';

/**
 * Total magic pool available to the player.
 * Scales with wisdom stat; wizards receive an additional class bonus.
 */
export function playerMaxMagic(character: Pick<Character, 'stats' | 'class'>): number {
  return (
    COMBAT.BASE_MAGIC +
    character.stats.wisdom * COMBAT.MAGIC_PER_WISDOM +
    (character.class === 'wizard' ? COMBAT.WIZARD_MAGIC_BONUS : 0)
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
 * attackMode "attack" = physical (uses STR gear), "magic" = magical (uses WIS gear).
 */
export function gearAttackBonus(character: Character, attackMode: 'attack' | 'magic'): number {
  const bonuses = totalGearBonuses(character.equippedGear);
  return attackMode === 'magic' ? (bonuses.wisdom ?? 0) : (bonuses.strength ?? 0);
}

/**
 * Total DEF bonus from all equipped items.
 * Stacks with the character's base defense stat.
 */
export function gearDefenseBonus(character: Character): number {
  return totalGearBonuses(character.equippedGear).defense ?? 0;
}

/** Roll a d10 — returns a value between ATTACK_RNG_MIN (1) and ATTACK_RNG_MAX (10) inclusive. */
export function rollD10(): number {
  return (
    Math.floor(Math.random() * (COMBAT.ATTACK_RNG_MAX - COMBAT.ATTACK_RNG_MIN + 1)) +
    COMBAT.ATTACK_RNG_MIN
  );
}

/**
 * Total HP available to the player.
 * Includes health and stamina bonuses from all equipped gear.
 */
export function playerMaxHp(character: Pick<Character, 'stats' | 'equippedGear'>): number {
  const gear = totalGearBonuses(character.equippedGear);
  return (
    COMBAT.BASE_HP +
    (character.stats.stamina + (gear.stamina ?? 0)) * COMBAT.HP_PER_STAMINA +
    (character.stats.health + (gear.health ?? 0)) * COMBAT.HP_PER_HEALTH
  );
}

/**
 * Stamina pool available at the start of a fight.
 * Includes stamina bonuses from all equipped gear.
 */
export function playerMaxStamina(character: Pick<Character, 'stats' | 'equippedGear'>): number {
  const gear = totalGearBonuses(character.equippedGear);
  return (
    COMBAT.BASE_STAMINA + (character.stats.stamina + (gear.stamina ?? 0)) * COMBAT.STAMINA_PER_STAT
  );
}

/**
 * Calculate one interactive round of combat for Attack or Magic actions.
 *
 * attackMode:
 *   "attack" — physical strike, uses Strength (warrior/rogue playstyle)
 *   "magic"  — magical strike, uses Wisdom  (wizard playstyle, or any class with high WIS)
 *
 * Each defender has a DEFENSE_FAIL_CHANCE of their defense being bypassed entirely.
 *
 * Monster damage in this path is deterministic: flat monster.attack minus player defense.
 * The monster's d10 roll (monsterRoll) is returned for UI animation only — it does NOT
 * affect damage here. Ability and spell resolutions (abilities.ts / spells.ts) add the
 * monster roll to damage for more chaos on those riskier actions.
 */
export function calculateRound(
  character: Character,
  monster: MonsterDef,
  attackMode: 'attack' | 'magic',
): {
  roll: number;
  attackBonus: number;
  attackBonusLabel: 'STR' | 'WIS';
  playerDamage: number;
  monsterRoll: number;
  monsterDamage: number;
  playerDefFailed: boolean;
  monsterDefFailed: boolean;
} {
  const roll = rollD10();

  const statBonus =
    attackMode === 'magic'
      ? Math.floor(character.stats.wisdom * COMBAT.WISDOM_ATTACK_FACTOR)
      : Math.floor(character.stats.strength * COMBAT.STRENGTH_ATTACK_FACTOR);
  const weaponBonus = gearAttackBonus(character, attackMode);
  const attackBonus = statBonus + weaponBonus;
  const attackBonusLabel = attackMode === 'magic' ? 'WIS' : 'STR';

  // Monster's defense might fail
  const monsterDefFailed = Math.random() < COMBAT.DEFENSE_FAIL_CHANCE;
  const effectiveMonsterDef = monsterDefFailed ? 0 : monster.defense;
  const playerDamage = Math.max(COMBAT.MIN_DAMAGE, attackBonus + roll - effectiveMonsterDef);

  // Monster rolls its own d10 for its counter-attack
  const monsterRoll = rollD10();

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
 * Number of dry kills before pity bonus starts ramping legendary chance.
 * Below this, pure RNG; above, every additional kill adds LEGENDARY_PITY_STEP.
 */
export const LEGENDARY_PITY_THRESHOLD = 10;
/** Additive bonus (per kill above threshold) to a legendary's drop probability. */
export const LEGENDARY_PITY_STEP = 0.02;

/**
 * Roll the loot table for a defeated monster.
 * Each entry is an independent Bernoulli trial — items can each drop (or not)
 * regardless of what else drops. Returns the item IDs that were awarded.
 *
 * streakMultiplier — from the player's active Blessing (streak tier).
 * Applied exclusively to items of rarity "rare", "epic", or "legendary";
 * common and uncommon item chances are unchanged.
 *
 * legendaryDryStreak — kills against this monster since the last legendary
 * drop. Each kill above LEGENDARY_PITY_THRESHOLD adds LEGENDARY_PITY_STEP
 * (additive) to legendary item chances only. Effective chance is still capped
 * at 0.95 so there is always some RNG even at max streak/pity.
 */
export function rollLoot(
  lootTable: Array<{ itemId: string; chance: number }>,
  streakMultiplier = 1.0,
  legendaryDryStreak = 0,
): string[] {
  const RARE_PLUS = new Set(['rare', 'epic', 'legendary']);
  const pityBonus =
    legendaryDryStreak > LEGENDARY_PITY_THRESHOLD
      ? (legendaryDryStreak - LEGENDARY_PITY_THRESHOLD) * LEGENDARY_PITY_STEP
      : 0;

  return lootTable
    .filter(({ itemId, chance }) => {
      const item = getItemById(itemId);
      if (!item) return Math.random() < chance;

      const isRarePlus = RARE_PLUS.has(item.rarity);
      const isLegendary = item.rarity === 'legendary';
      const baseBoosted = isRarePlus ? chance * streakMultiplier : chance;
      const withPity = isLegendary ? baseBoosted + pityBonus : baseBoosted;
      const effectiveChance = Math.min(withPity, 0.95);
      return Math.random() < effectiveChance;
    })
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
  monster: MonsterDef,
): {
  playerRoll: number;
  agilityBonus: number;
  monsterRoll: number;
  escaped: boolean;
  monsterDamage: number;
  playerDefFailed: boolean;
} {
  const playerRoll = rollD10();
  const gear = totalGearBonuses(character.equippedGear);
  const effectiveAgility = (character.stats.agility ?? 0) + (gear.agility ?? 0);
  const agilityBonus = Math.floor(effectiveAgility * COMBAT.AGILITY_ESCAPE_FACTOR);
  // Ghost Step (Assassin/Ranger): additional agility-based escape bonus
  const ghostStepBonus = getEscapeBonus(character);
  const monsterRoll = rollD10();
  // Sure Escape (Ranger): always succeeds
  const escaped =
    hasSureEscape(character) || playerRoll + agilityBonus + ghostStepBonus > monsterRoll;

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

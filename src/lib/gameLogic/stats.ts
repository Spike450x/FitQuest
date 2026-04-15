import { ACTIVITY_DEFINITIONS, CLASS_DEFINITIONS, maxStatForLevel, statCap, RESTORE } from "./constants";
import type { ActivityType, CharacterClass, Stats } from "@/types";

/**
 * Calculates stat gains and XP for a logged activity,
 * applying the character's class multipliers and level caps.
 */
export function calculateActivityGains(
  activityType: ActivityType,
  amount: number,
  characterClass: CharacterClass,
  characterLevel: number
): { statGains: Partial<Stats>; xpGained: number } {
  const def = ACTIVITY_DEFINITIONS[activityType];
  const multipliers = CLASS_DEFINITIONS[characterClass].statMultipliers;
  const units = amount / def.unitDivisor;

  const statGains: Partial<Stats> = {};
  const statKeys: (keyof Stats)[] = ["strength", "stamina", "agility", "health", "wisdom", "defense"];

  for (const key of statKeys) {
    const base = def.statGainsPerUnit[key] * units;
    const withMultiplier = base * multipliers[key];
    const rounded = Math.floor(withMultiplier);
    if (rounded > 0) {
      statGains[key] = Math.min(rounded, statCap(key, characterLevel));
    }
  }

  const xpGained = Math.floor(def.baseXp * units);

  return { statGains, xpGained };
}

/**
 * Stamina (currentStamina) restored by logging a given activity.
 * Sleep is the primary source; water and nutrition restore less.
 * Returns 0 for activities that don't restore stamina.
 */
export function calculateStaminaRestore(activityType: ActivityType, amount: number): number {
  switch (activityType) {
    case "sleep":     return Math.floor(amount * RESTORE.STAMINA_PER_SLEEP_HOUR);
    case "water":     return Math.floor(amount * RESTORE.STAMINA_PER_WATER_GLASS);
    case "nutrition": return Math.floor(amount * RESTORE.STAMINA_PER_MEAL);
    default:          return 0;
  }
}

/** Adds stat gains to existing stats, respecting per-stat caps. */
export function applyStatGains(
  current: Stats,
  gains: Partial<Stats>,
  characterLevel: number
): Stats {
  return {
    strength: Math.min(current.strength + (gains.strength ?? 0), statCap("strength", characterLevel)),
    stamina:  Math.min(current.stamina  + (gains.stamina  ?? 0), statCap("stamina",  characterLevel)),
    agility:  Math.min((current.agility ?? 0) + (gains.agility ?? 0), statCap("agility", characterLevel)),
    health:   Math.min(current.health   + (gains.health   ?? 0), statCap("health",   characterLevel)),
    wisdom:   Math.min(current.wisdom   + (gains.wisdom   ?? 0), statCap("wisdom",   characterLevel)),
    defense:  Math.min((current.defense ?? 0) + (gains.defense ?? 0), statCap("defense", characterLevel)),
  };
}

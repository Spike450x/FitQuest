// Copied subset of src/lib/gameLogic/combat.ts
// Only the resource-max formulas needed by the logActivity restore branch.
// Keep in sync when COMBAT constants or playerMax* formulas change.

import { GEAR_STAT_BONUSES } from './items';

// ─── COMBAT constants (inlined from src/lib/gameLogic/constants.ts) ───────────
const BASE_HP = 50;
const HP_PER_STAMINA = 2;
const HP_PER_HEALTH = 1;
const BASE_STAMINA = 20;
const STAMINA_PER_STAT = 5;
const BASE_MAGIC = 20;
const MAGIC_PER_WISDOM = 3;
const WIZARD_MAGIC_BONUS = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

interface EquippedGear {
  weapon: string | null;
  armor: string | null;
  accessory: string | null;
}

// ─── Gear bonuses ─────────────────────────────────────────────────────────────

/**
 * Returns the combined stamina and health bonuses across all equipped gear slots.
 * Only stamina and health are needed for resource-max computation — other stat bonuses
 * (strength, wisdom, agility, defense) don't affect HP/Stamina/Magic caps.
 */
function totalGearBonuses(equippedGear: EquippedGear | null | undefined): {
  stamina: number;
  health: number;
} {
  const result = { stamina: 0, health: 0 };
  if (!equippedGear) return result;
  for (const itemId of [equippedGear.weapon, equippedGear.armor, equippedGear.accessory]) {
    if (!itemId) continue;
    const bonuses = GEAR_STAT_BONUSES[itemId];
    if (!bonuses) continue;
    result.stamina += bonuses.stamina ?? 0;
    result.health += bonuses.health ?? 0;
  }
  return result;
}

// ─── Resource max formulas ────────────────────────────────────────────────────

/** Maximum HP available to the player (base + stamina + health + gear). */
export function playerMaxHp(
  stats: { stamina: number; health: number },
  equippedGear: EquippedGear | null | undefined,
): number {
  const gear = totalGearBonuses(equippedGear);
  return (
    BASE_HP +
    (stats.stamina + gear.stamina) * HP_PER_STAMINA +
    (stats.health + gear.health) * HP_PER_HEALTH
  );
}

/** Maximum Stamina available to the player (base + stamina stat + gear). */
export function playerMaxStamina(
  stats: { stamina: number },
  equippedGear: EquippedGear | null | undefined,
): number {
  const gear = totalGearBonuses(equippedGear);
  return BASE_STAMINA + (stats.stamina + gear.stamina) * STAMINA_PER_STAT;
}

/** Maximum Magic available to the player (base + wisdom + wizard class bonus). No gear contribution. */
export function playerMaxMagic(wisdom: number, charClass: string): number {
  return BASE_MAGIC + wisdom * MAGIC_PER_WISDOM + (charClass === 'wizard' ? WIZARD_MAGIC_BONUS : 0);
}

// ─── Daily combat XP cap (parity copy of client function) ────────────────────
//
// PARITY: must match src/lib/gameLogic/combat.ts → combatXpDailyMultiplier.
// A parity test (functions/src/__tests__/combatXp.test.ts) cross-checks the
// two copies. If you change one, change the other in the same commit.
//
//   wins 0–4   → 1.0×
//   wins 5–14  → 0.5×
//   wins 15–24 → 0.25×
//   wins 25+   → 0.1×
export function combatXpDailyMultiplier(winsToday: number): number {
  if (winsToday < 5) return 1.0;
  if (winsToday < 15) return 0.5;
  if (winsToday < 25) return 0.25;
  return 0.1;
}

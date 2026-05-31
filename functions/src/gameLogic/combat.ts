// Copied subset of src/lib/gameLogic/combat.ts
// Only the resource-max formulas needed by the logActivity restore branch.
// Keep in sync when COMBAT constants or playerMax* formulas change.

import { GEAR_STAT_BONUSES } from './items';

// ─── COMBAT constants (inlined from src/lib/gameLogic/constants.ts) ───────────
const BASE_HP = 50;
const HP_PER_STAMINA = 1;
const HP_PER_HEALTH = 2;
const BASE_STAMINA = 20;
const STAMINA_PER_STAT = 5;
const BASE_MAGIC = 20;
const MAGIC_PER_WISDOM = 3;
const WIZARD_MAGIC_BONUS = 10;

// ─── Class stat multipliers (parity with CLASS_DEFINITIONS.statMultipliers) ───
// Only the stats that feed the resource-max formulas are mirrored here
// (stamina + health → HP, stamina → stamina pool, wisdom → magic pool). The
// client applies the full 7-stat set in combat; the server only needs pools.
// PARITY: must match src/lib/gameLogic/constants.ts → CLASS_DEFINITIONS.
const CLASS_POOL_MULTIPLIERS: Record<string, { stamina: number; health: number; wisdom: number }> =
  {
    warrior: { stamina: 1.1, health: 1.2, wisdom: 0.8 },
    wizard: { stamina: 0.95, health: 1.0, wisdom: 1.4 },
    rogue: { stamina: 1.4, health: 0.9, wisdom: 1.0 },
  };

/** Effective (class-scaled) stat value, floored at 0. Mirrors client `effectiveStat`. */
function effectiveStat(
  base: number,
  charClass: string,
  statKey: 'stamina' | 'health' | 'wisdom',
): number {
  const mult = CLASS_POOL_MULTIPLIERS[charClass]?.[statKey] ?? 1.0;
  return Math.floor(Math.max(0, base) * mult);
}

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

/**
 * Maximum HP available to the player (base + effective stamina + effective
 * health + flat gear). Uses class-scaled stats; gear bonuses stay flat.
 */
export function playerMaxHp(
  stats: { stamina: number; health: number },
  equippedGear: EquippedGear | null | undefined,
  charClass: string,
): number {
  const gear = totalGearBonuses(equippedGear);
  return (
    BASE_HP +
    (effectiveStat(stats.stamina, charClass, 'stamina') + gear.stamina) * HP_PER_STAMINA +
    (effectiveStat(stats.health, charClass, 'health') + gear.health) * HP_PER_HEALTH
  );
}

/**
 * Maximum Stamina available to the player (base + effective stamina + flat
 * gear). Uses class-scaled stamina; gear bonuses stay flat.
 */
export function playerMaxStamina(
  stats: { stamina: number },
  equippedGear: EquippedGear | null | undefined,
  charClass: string,
): number {
  const gear = totalGearBonuses(equippedGear);
  return (
    BASE_STAMINA +
    (effectiveStat(stats.stamina, charClass, 'stamina') + gear.stamina) * STAMINA_PER_STAT
  );
}

/** Maximum Magic available to the player (base + effective wisdom + wizard class bonus). No gear contribution. */
export function playerMaxMagic(wisdom: number, charClass: string): number {
  return (
    BASE_MAGIC +
    effectiveStat(wisdom, charClass, 'wisdom') * MAGIC_PER_WISDOM +
    (charClass === 'wizard' ? WIZARD_MAGIC_BONUS : 0)
  );
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

import type { ActivityType } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string; // "YYYY-MM-DD" UTC
}

export interface PersonalRecord {
  value: number;
  loggedAt: number; // unix ms
  unit: string;
}

export type PersonalRecords = Partial<Record<ActivityType, PersonalRecord>>;

export interface StreakTier {
  minDays: number;
  /** Display name for this tier. null = no active streak (below threshold). */
  label: string | null;
  /**
   * Drop-chance multiplier applied exclusively to items of rarity "rare", "epic",
   * or "legendary" in a monster's loot table. Common and uncommon are unaffected.
   * 1.0 = no bonus. Effective chance is still capped at 0.95 in rollLoot().
   */
  lootDropMultiplier: number;
  /** Tailwind text color class for displaying the tier name. */
  color: string;
  /** Tailwind background + border classes for the streak badge. */
  bgColor: string;
}

// ─── Streak Tiers ─────────────────────────────────────────────────────────────
//
// The multiplier is applied only to items of rarity "rare", "epic", or
// "legendary" in a monster's loot table — so it rewards consistent players
// with better odds on the items that actually matter.
//
// Tiers are checked highest → lowest; the first match wins.

export const STREAK_TIERS: StreakTier[] = [
  { minDays: 30, label: "Blessed",     lootDropMultiplier: 2.00, color: "text-orange-500", bgColor: "bg-orange-50 border-orange-200"   },
  { minDays: 21, label: "Unstoppable", lootDropMultiplier: 1.75, color: "text-purple-600", bgColor: "bg-purple-50 border-purple-200"   },
  { minDays: 14, label: "Relentless",  lootDropMultiplier: 1.50, color: "text-blue-600",   bgColor: "bg-blue-50 border-blue-200"       },
  { minDays:  7, label: "Dedicated",   lootDropMultiplier: 1.30, color: "text-indigo-600", bgColor: "bg-indigo-50 border-indigo-200"   },
  { minDays:  3, label: "Focused",     lootDropMultiplier: 1.15, color: "text-emerald-600",bgColor: "bg-emerald-50 border-emerald-200" },
  { minDays:  0, label: null,          lootDropMultiplier: 1.00, color: "text-gray-400",   bgColor: "bg-gray-50 border-gray-200"       },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's date as "YYYY-MM-DD" in UTC. */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns yesterday's date as "YYYY-MM-DD" in UTC. */
function yesterdayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * Computes the new StreakData after an activity is logged on `today`.
 *
 * Rules:
 *   - lastLogDate === today     → already counted, no change
 *   - lastLogDate === yesterday → streak continues (+1)
 *   - anything else             → streak resets to 1
 */
export function computeNewStreak(
  current: StreakData | undefined,
  today: string
): StreakData {
  if (!current) {
    return { currentStreak: 1, longestStreak: 1, lastLogDate: today };
  }
  // Already logged today — idempotent
  if (current.lastLogDate === today) {
    return current;
  }
  const continued = current.lastLogDate === yesterdayUTC();
  const newCurrent = continued ? current.currentStreak + 1 : 1;
  return {
    currentStreak: newCurrent,
    longestStreak: Math.max(current.longestStreak, newCurrent),
    lastLogDate: today,
  };
}

/** Returns the StreakTier for a given streak day count. */
export function getStreakTier(streak: number): StreakTier {
  return (
    STREAK_TIERS.find((t) => streak >= t.minDays) ??
    STREAK_TIERS[STREAK_TIERS.length - 1]
  );
}

/**
 * Returns the loot drop chance multiplier for rare+ items based on the
 * player's current streak. Common and uncommon item chances are unaffected.
 */
export function getStreakLootMultiplier(streak: number): number {
  return getStreakTier(streak).lootDropMultiplier;
}

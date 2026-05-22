import type { ActivityType } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string; // "YYYY-MM-DD" UTC
  /**
   * Number of grace-day shields available. A shield is consumed instead of
   * resetting the streak when a single day is missed. Refilled to 1 each ISO
   * week (cap 1 stored). Undefined on legacy character docs is treated as 0.
   */
  shields?: number;
  /** ISO date ("YYYY-MM-DD" UTC) of the most recent shield refill. */
  shieldsRefilledOn?: string;
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
  /**
   * Multiplicative bonus applied to XP awarded from quest claims and combat
   * victories. Caps at ×1.50 for Blessed-tier players (30+ day streak) so the
   * habit reward is meaningful but still compounds gently with the quest-level
   * scaler.
   */
  xpMultiplier: number;
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
  {
    minDays: 30,
    label: 'Blessed',
    lootDropMultiplier: 2.0,
    xpMultiplier: 1.5,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 border-orange-200',
  },
  {
    minDays: 21,
    label: 'Unstoppable',
    lootDropMultiplier: 1.75,
    xpMultiplier: 1.2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
  },
  {
    minDays: 14,
    label: 'Relentless',
    lootDropMultiplier: 1.5,
    xpMultiplier: 1.15,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  {
    minDays: 7,
    label: 'Dedicated',
    lootDropMultiplier: 1.3,
    xpMultiplier: 1.1,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
  },
  {
    minDays: 3,
    label: 'Focused',
    lootDropMultiplier: 1.15,
    xpMultiplier: 1.05,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
  },
  {
    minDays: 0,
    label: null,
    lootDropMultiplier: 1.0,
    xpMultiplier: 1.0,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50 border-gray-200',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's date as "YYYY-MM-DD" in UTC. */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns the date `daysAgo` before `today` ("YYYY-MM-DD"). */
function dateMinusDays(today: string, daysAgo: number): string {
  const [y, m, d] = today.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - daysAgo);
  return dt.toISOString().slice(0, 10);
}

/** Returns the difference in whole UTC days between two ISO date strings. */
function daysBetween(earlier: string, later: string): number {
  const [y1, m1, d1] = earlier.split('-').map(Number);
  const [y2, m2, d2] = later.split('-').map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000);
}

/** Returns the ISO week key ("YYYY-Www") for a given date. */
function isoWeekKey(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Thursday of current week determines the ISO year/week
  const dayNum = (dt.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  dt.setUTCDate(dt.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((dt.getTime() - firstThursday.getTime()) / 86_400_000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

/** Max number of streak shields a player can hold at once. */
export const MAX_STREAK_SHIELDS = 1;

/**
 * Computes the new StreakData after an activity is logged on `today`.
 *
 * Rules:
 *   - lastLogDate === today        → already counted, no change
 *   - lastLogDate === yesterday    → streak continues (+1)
 *   - lastLogDate === 2 days ago   → consume 1 shield if available, streak +1; else reset
 *   - gap > 2 days                 → reset to 1 (shields don't cover multi-day gaps)
 *
 * Shield refill: if the most recent refill was in a prior ISO week, the player
 * is granted 1 shield (capped at MAX_STREAK_SHIELDS) on this log.
 */
export function computeNewStreak(current: StreakData | undefined, today: string): StreakData {
  if (!current) {
    return {
      currentStreak: 1,
      longestStreak: 1,
      lastLogDate: today,
      shields: MAX_STREAK_SHIELDS,
      shieldsRefilledOn: today,
    };
  }
  // Already logged today — refill shield if a new ISO week has begun, otherwise no-op
  if (current.lastLogDate === today) {
    return refillShieldsIfNewWeek(current, today);
  }
  const gap = daysBetween(current.lastLogDate, today);
  const yesterday = dateMinusDays(today, 1);
  const continued = current.lastLogDate === yesterday;

  let shields = current.shields ?? 0;
  let newCurrent: number;

  if (continued) {
    newCurrent = current.currentStreak + 1;
  } else if (gap === 2 && shields > 0) {
    // Single missed day, shield available — consume it and keep the streak alive
    shields -= 1;
    newCurrent = current.currentStreak + 1;
  } else {
    newCurrent = 1;
  }

  const next: StreakData = {
    currentStreak: newCurrent,
    longestStreak: Math.max(current.longestStreak, newCurrent),
    lastLogDate: today,
    shields,
    shieldsRefilledOn: current.shieldsRefilledOn,
  };
  return refillShieldsIfNewWeek(next, today);
}

/**
 * Tops shield count up to MAX_STREAK_SHIELDS if `today` is in a different ISO
 * week than the last refill. Pure — returns a new object only when something
 * changed, otherwise returns the input.
 */
export function refillShieldsIfNewWeek(streak: StreakData, today: string): StreakData {
  const lastRefill = streak.shieldsRefilledOn;
  if (lastRefill && isoWeekKey(lastRefill) === isoWeekKey(today)) {
    return streak;
  }
  const currentShields = streak.shields ?? 0;
  if (currentShields >= MAX_STREAK_SHIELDS) {
    return { ...streak, shieldsRefilledOn: today };
  }
  return {
    ...streak,
    shields: MAX_STREAK_SHIELDS,
    shieldsRefilledOn: today,
  };
}

/** Returns the StreakTier for a given streak day count. */
export function getStreakTier(streak: number): StreakTier {
  return STREAK_TIERS.find((t) => streak >= t.minDays) ?? STREAK_TIERS[STREAK_TIERS.length - 1];
}

/**
 * Returns the loot drop chance multiplier for rare+ items based on the
 * player's current streak. Common and uncommon item chances are unaffected.
 */
export function getStreakLootMultiplier(streak: number): number {
  return getStreakTier(streak).lootDropMultiplier;
}

/**
 * Returns the XP reward multiplier for the player's current streak. Applied to
 * quest claim XP and combat-victory XP. Softer than the loot multiplier so it
 * compounds gently with quest-level scaling.
 */
export function getStreakXpMultiplier(streak: number): number {
  return getStreakTier(streak).xpMultiplier;
}

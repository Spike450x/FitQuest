// Copied subset of src/lib/gameLogic/xp.ts and src/lib/gameLogic/constants.ts
// Only XP and level-up logic needed by claimDungeonRun.
// Keep in sync with the source when leveling formulas change.

// ─── XP formula (from constants.ts) ──────────────────────────────────────────

/** XP required to reach a given level from the previous level. */
function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

/** Level-scaled cap for secondary stats: Stamina, Health, Defense. */
function maxStatForLevel(level: number): number {
  return level * 5 + 10;
}

// ─── Level-up bonuses (from constants.ts LEVEL_UP) ───────────────────────────

export const LEVEL_UP = {
  HEALTH_PER_LEVEL: 1,
  DEFENSE_PER_LEVEL: 1,
  STAT_POINTS_PER_LEVEL: 1,
} as const;

// ─── applyXp (from xp.ts) ────────────────────────────────────────────────────

/**
 * Given current level/xp and XP to award, returns the updated level, xp,
 * xpToNextLevel — handling multi-level gains in one call.
 */
export function applyXp(
  character: { level: number; xp: number },
  xpGained: number,
): { level: number; xp: number; xpToNextLevel: number; levelsGained: number } {
  let { level, xp } = character;
  let levelsGained = 0;

  xp += xpGained;

  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
    levelsGained += 1;
  }

  return {
    level,
    xp,
    xpToNextLevel: xpToNextLevel(level),
    levelsGained,
  };
}

/**
 * Returns the stat cap for a secondary stat (health/defense/stamina) at the given level,
 * or 50 for primary stats (strength/wisdom/agility).
 */
export function statCapForLevel(stat: string, level: number): number {
  if (stat === 'strength' || stat === 'wisdom' || stat === 'agility') return 50;
  return maxStatForLevel(level);
}

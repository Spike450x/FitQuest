import { xpToNextLevel } from "./constants";
import type { Character } from "@/types";

/**
 * Given a character and XP to award, returns the updated level, xp,
 * and xpToNextLevel — handling multi-level gains in one call.
 */
export function applyXp(
  character: Pick<Character, "level" | "xp" | "xpToNextLevel">,
  xpGained: number
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

/** Returns XP progress as a 0–1 fraction for the current level. */
export function xpProgress(xp: number, level: number): number {
  const needed = xpToNextLevel(level);
  return Math.min(xp / needed, 1);
}

import { describe, it, expect } from "vitest";
import { applyXp, xpProgress } from "../xp";
import { xpToNextLevel } from "../constants";

describe("xpToNextLevel", () => {
  it("returns 100 at level 1", () => {
    expect(xpToNextLevel(1)).toBe(100);
  });

  it("increases monotonically with level", () => {
    for (let l = 1; l < 20; l++) {
      expect(xpToNextLevel(l + 1)).toBeGreaterThan(xpToNextLevel(l));
    }
  });

  it("uses floor(100 * level^1.5) formula", () => {
    expect(xpToNextLevel(5)).toBe(Math.floor(100 * Math.pow(5, 1.5)));
    expect(xpToNextLevel(10)).toBe(Math.floor(100 * Math.pow(10, 1.5)));
  });
});

describe("applyXp", () => {
  const base = { level: 1, xp: 0, xpToNextLevel: xpToNextLevel(1) };

  it("accumulates xp without leveling up when below threshold", () => {
    const result = applyXp(base, 50);
    expect(result.level).toBe(1);
    expect(result.xp).toBe(50);
    expect(result.levelsGained).toBe(0);
  });

  it("levels up exactly when xp hits the threshold", () => {
    const result = applyXp(base, xpToNextLevel(1));
    expect(result.level).toBe(2);
    expect(result.xp).toBe(0);
    expect(result.levelsGained).toBe(1);
  });

  it("carries over remainder xp after leveling up", () => {
    const overshoot = 37;
    const result = applyXp(base, xpToNextLevel(1) + overshoot);
    expect(result.xp).toBe(overshoot);
    expect(result.level).toBe(2);
  });

  it("handles multi-level gains in one call", () => {
    const xpNeeded = xpToNextLevel(1) + xpToNextLevel(2);
    const result = applyXp(base, xpNeeded);
    expect(result.level).toBe(3);
    expect(result.levelsGained).toBe(2);
    expect(result.xp).toBe(0);
  });

  it("returns correct xpToNextLevel for the new level after leveling", () => {
    const result = applyXp(base, xpToNextLevel(1));
    expect(result.xpToNextLevel).toBe(xpToNextLevel(2));
  });

  it("works correctly when starting character already has xp", () => {
    const partial = { level: 3, xp: 50, xpToNextLevel: xpToNextLevel(3) };
    const toLevel = xpToNextLevel(3) - 50;
    const result = applyXp(partial, toLevel);
    expect(result.level).toBe(4);
    expect(result.xp).toBe(0);
  });
});

describe("xpProgress", () => {
  it("returns 0 at the start of a level", () => {
    expect(xpProgress(0, 1)).toBe(0);
  });

  it("returns 0.5 at the halfway point", () => {
    const needed = xpToNextLevel(1);
    expect(xpProgress(needed / 2, 1)).toBe(0.5);
  });

  it("returns 1 when xp equals xpToNextLevel", () => {
    const needed = xpToNextLevel(1);
    expect(xpProgress(needed, 1)).toBe(1);
  });

  it("caps at 1 even when xp exceeds threshold", () => {
    expect(xpProgress(99999, 1)).toBe(1);
  });
});

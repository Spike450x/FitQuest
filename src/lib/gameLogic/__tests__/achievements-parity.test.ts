/**
 * Drift-detection test for the duplicated achievements module.
 *
 * `src/lib/gameLogic/achievements.ts` contains achievement logic that is
 * mirrored in `functions/src/gameLogic/achievements.ts` so the Cloud Function
 * can award achievements atomically inside a transaction without Next.js
 * path-alias dependencies.
 *
 * This test asserts that LEGENDARY_ITEM_IDS, ACHIEVEMENT_GOLD, and
 * checkNewAchievements in the CF copy stay in sync with the source of truth
 * (src/ copy + ITEM_CATALOG). A failure here means one copy drifted and the
 * CF will award different achievements or gold than the client expects.
 */

import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENTS,
  checkDungeonAchievements,
  checkCombatAchievements,
  checkActivityAchievements,
  checkMasteryAchievements,
  SLAYER_KILL_TARGET,
  CENTURION_WIN_TARGET,
  HYDRATION_STREAK_DAYS,
  POLYMATH_THRESHOLD,
  ARMORY_UNIQUE_GEAR_TARGET,
  MASTERY_TIERS,
  ACTIVITY_COUNT_TARGETS,
  ACTIVITY_COUNT_THRESHOLD,
  QUEST_COUNT_TIERS,
  WEEKLY_PERFECTIONIST_TARGET,
} from '../achievements';
import { ITEM_CATALOG } from '../items';
import type { Character, DungeonRun, AchievementId, DungeonTierId } from '@/types';
import {
  LEGENDARY_ITEM_IDS,
  ACHIEVEMENT_GOLD,
  checkNewAchievements,
  checkNewCombatAchievements,
  checkNewActivityAchievements,
  checkNewMasteryAchievements,
  SLAYER_KILL_TARGET as CF_SLAYER_KILL_TARGET,
  CENTURION_WIN_TARGET as CF_CENTURION_WIN_TARGET,
  HYDRATION_STREAK_DAYS as CF_HYDRATION_STREAK_DAYS,
  POLYMATH_THRESHOLD as CF_POLYMATH_THRESHOLD,
  ARMORY_UNIQUE_GEAR_TARGET as CF_ARMORY_UNIQUE_GEAR_TARGET,
  MASTERY_TIERS as CF_MASTERY_TIERS,
  ACTIVITY_COUNT_TARGETS as CF_ACTIVITY_COUNT_TARGETS,
  ACTIVITY_COUNT_THRESHOLD as CF_ACTIVITY_COUNT_THRESHOLD,
  QUEST_COUNT_TIERS as CF_QUEST_COUNT_TIERS,
  WEEKLY_PERFECTIONIST_TARGET as CF_WEEKLY_PERFECTIONIST_TARGET,
} from '../../../../functions/src/gameLogic/achievements';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeChar(achievements: AchievementId[] = []): Character {
  return {
    uid: 'test-uid',
    name: 'Test',
    class: 'warrior',
    level: 5,
    xp: 0,
    xpToNextLevel: 100,
    gold: 500,
    stats: {
      strength: 10,
      stamina: 10,
      agility: 10,
      health: 10,
      wisdom: 10,
      defense: 5,
      spirit: 0,
    },
    equippedGear: { weapon: null, armor: null, accessory: null },
    createdAt: 0,
    achievements,
  };
}

function makeRun(overrides: Partial<DungeonRun> = {}): DungeonRun {
  return {
    id: 'run-1',
    uid: 'test-uid',
    tierId: 'goblin-caves',
    weekSeed: 202601,
    status: 'completed',
    currentRoom: 4,
    rooms: [],
    currentHp: 80,
    currentStamina: 20,
    currentMagic: 20,
    legendaryEligible: true,
    cumulativeXp: 300,
    cumulativeGold: 150,
    allDroppedItems: [],
    startedAt: Date.now(),
    completedAt: Date.now(),
    ...overrides,
  };
}

// ─── LEGENDARY_ITEM_IDS parity ────────────────────────────────────────────────

describe('LEGENDARY_ITEM_IDS parity — functions copy vs ITEM_CATALOG', () => {
  const catalogLegendaryIds = new Set(
    ITEM_CATALOG.filter((item) => item.rarity === 'legendary').map((item) => item.id),
  );

  it('contains every legendary item in ITEM_CATALOG', () => {
    for (const id of catalogLegendaryIds) {
      expect(LEGENDARY_ITEM_IDS.has(id)).toBe(true);
    }
  });

  it('contains no items that are not legendary in ITEM_CATALOG', () => {
    for (const id of LEGENDARY_ITEM_IDS) {
      expect(catalogLegendaryIds.has(id)).toBe(true);
    }
  });
});

// ─── ACHIEVEMENT_GOLD parity ──────────────────────────────────────────────────

describe('ACHIEVEMENT_GOLD parity — functions copy vs ACHIEVEMENTS catalog', () => {
  const achievementIds = Object.keys(ACHIEVEMENTS) as AchievementId[];

  it('has an entry for every achievement ID', () => {
    for (const id of achievementIds) {
      expect(ACHIEVEMENT_GOLD).toHaveProperty(id);
    }
  });

  it('has no extra entries beyond known achievement IDs', () => {
    const knownIds = new Set(achievementIds);
    for (const id of Object.keys(ACHIEVEMENT_GOLD)) {
      expect(knownIds.has(id as AchievementId)).toBe(true);
    }
  });

  it('gold values match ACHIEVEMENTS[id].goldReward for every ID', () => {
    for (const id of achievementIds) {
      expect(ACHIEVEMENT_GOLD[id]).toBe(ACHIEVEMENTS[id].goldReward);
    }
  });
});

// ─── checkNewAchievements behaviour parity ────────────────────────────────────

describe('checkNewAchievements parity — functions copy vs checkDungeonAchievements', () => {
  // Helper that runs both implementations on equivalent inputs and asserts they agree
  function assertParity(
    tierId: DungeonTierId,
    existing: AchievementId[],
    droppedItems: string[],
    status: 'completed' | 'abandoned',
  ) {
    const char = makeChar(existing);
    const run = makeRun({ tierId, allDroppedItems: droppedItems, status });

    const src = checkDungeonAchievements(char, run).sort();
    const fn = checkNewAchievements(tierId, existing, droppedItems, status).sort();

    expect(fn).toEqual(src);
  }

  it('returns empty for abandoned runs', () => {
    assertParity('goblin-caves', [], [], 'abandoned');
  });

  it('awards dungeon-initiate on first completed run', () => {
    assertParity('goblin-caves', [], [], 'completed');
  });

  it('does not re-award already unlocked achievements', () => {
    assertParity('goblin-caves', ['dungeon-initiate', 'goblin-slayer'], [], 'completed');
  });

  it('awards correct tier achievement for each dungeon', () => {
    assertParity('goblin-caves', [], [], 'completed');
    assertParity('spider-lair', [], [], 'completed');
    assertParity('dark-sanctum', [], [], 'completed');
    assertParity('dragons-keep', [], [], 'completed');
  });

  it('awards legendary-haul when a legendary item dropped', () => {
    assertParity('dragons-keep', [], ['draconic-sigil'], 'completed');
  });

  it('does not award legendary-haul for non-legendary drops', () => {
    assertParity('goblin-caves', [], ['scavengers-chain'], 'completed');
  });

  it('can award multiple achievements at once', () => {
    assertParity('dragons-keep', [], ['draconic-sigil'], 'completed');
  });
});

// ─── PR5b — combat / activity / mastery thresholds parity ────────────────────

describe('PR5b threshold + lookup parity (src ↔ functions)', () => {
  it('combat thresholds match', () => {
    expect(CF_SLAYER_KILL_TARGET).toBe(SLAYER_KILL_TARGET);
    expect(CF_CENTURION_WIN_TARGET).toBe(CENTURION_WIN_TARGET);
  });

  it('activity thresholds match', () => {
    expect(CF_HYDRATION_STREAK_DAYS).toBe(HYDRATION_STREAK_DAYS);
    for (const [activityType, achievementId] of Object.entries(ACTIVITY_COUNT_TARGETS)) {
      expect(CF_ACTIVITY_COUNT_TARGETS[activityType]).toBe(achievementId);
      expect(CF_ACTIVITY_COUNT_THRESHOLD[achievementId as string]).toBe(
        ACTIVITY_COUNT_THRESHOLD[achievementId as AchievementId],
      );
    }
  });

  it('mastery thresholds match', () => {
    expect(CF_POLYMATH_THRESHOLD).toBe(POLYMATH_THRESHOLD);
    expect(CF_MASTERY_TIERS.apprentice).toBe(MASTERY_TIERS.apprentice);
    expect(CF_MASTERY_TIERS.journeyman).toBe(MASTERY_TIERS.journeyman);
    expect(CF_MASTERY_TIERS.master).toBe(MASTERY_TIERS.master);
  });

  it('quest + collection thresholds match', () => {
    expect(CF_WEEKLY_PERFECTIONIST_TARGET).toBe(WEEKLY_PERFECTIONIST_TARGET);
    expect(CF_ARMORY_UNIQUE_GEAR_TARGET).toBe(ARMORY_UNIQUE_GEAR_TARGET);
    for (const [id, threshold] of Object.entries(QUEST_COUNT_TIERS)) {
      expect(CF_QUEST_COUNT_TIERS[id]).toBe(threshold);
    }
  });
});

describe('PR5b checker parity — src ↔ functions return identical IDs', () => {
  it('combat: first-blood + centurion + slayer + untouched', () => {
    const cases: Array<Parameters<typeof checkCombatAchievements>[0]> = [
      {
        existing: new Set(),
        monsterId: 'obsidian-golem',
        monsterKillsAfter: 5,
        totalWinsAfter: 1,
        flawless: true,
      },
      {
        existing: new Set(),
        monsterId: 'ashwyrm',
        monsterKillsAfter: 4,
        totalWinsAfter: 100,
        flawless: false,
      },
      {
        existing: new Set(['first-blood']),
        monsterId: 'storm-djinn',
        monsterKillsAfter: 5,
        totalWinsAfter: 50,
        flawless: true,
      },
      {
        existing: new Set(),
        monsterId: 'goblin',
        monsterKillsAfter: 99,
        totalWinsAfter: 0,
        flawless: false,
      },
    ];
    for (const c of cases) {
      const src = checkCombatAchievements(c).sort();
      const fn = checkNewCombatAchievements({
        existing: [...c.existing],
        monsterId: c.monsterId,
        monsterKillsAfter: c.monsterKillsAfter,
        totalWinsAfter: c.totalWinsAfter,
        flawless: c.flawless,
      }).sort();
      expect(fn).toEqual(src);
    }
  });

  it('activity: count thresholds + hydration streak', () => {
    const cases: Array<Parameters<typeof checkActivityAchievements>[0]> = [
      { existing: new Set(), activityType: 'workout', activityCountAfter: 100 },
      { existing: new Set(['iron-body']), activityType: 'workout', activityCountAfter: 100 },
      { existing: new Set(), activityType: 'meditation', activityCountAfter: 50 },
      { existing: new Set(), activityType: 'water', activityCountAfter: 1, waterStreakDays: 7 },
      { existing: new Set(), activityType: 'water', activityCountAfter: 1, waterStreakDays: 6 },
      { existing: new Set(), activityType: 'sleep', activityCountAfter: 100 },
    ];
    for (const c of cases) {
      const src = checkActivityAchievements(c).sort();
      const fn = checkNewActivityAchievements({
        existing: [...c.existing],
        activityType: c.activityType,
        activityCountAfter: c.activityCountAfter,
        waterStreakDays: c.waterStreakDays,
      }).sort();
      expect(fn).toEqual(src);
    }
  });

  it('mastery: apprentice/journeyman/master/polymath', () => {
    const cases: Array<Parameters<typeof checkMasteryAchievements>[0]> = [
      { existing: new Set(), masteryCounts: { workout: 5 } },
      { existing: new Set(), masteryCounts: { run: 15 } },
      { existing: new Set(), masteryCounts: { steps: 25 } },
      {
        existing: new Set(),
        masteryCounts: { workout: 5, run: 5, steps: 5, meditation: 5 },
      },
      { existing: new Set(['apprentice']), masteryCounts: { workout: 5 } },
      { existing: new Set(), masteryCounts: { workout: 4, run: 5, steps: 5, meditation: 5 } },
    ];
    for (const c of cases) {
      const src = checkMasteryAchievements(c).sort();
      const fn = checkNewMasteryAchievements({
        existing: [...c.existing],
        masteryCounts: c.masteryCounts,
      }).sort();
      expect(fn).toEqual(src);
    }
  });
});

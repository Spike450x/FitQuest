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
import { ACHIEVEMENTS, checkDungeonAchievements } from '../achievements';
import { ITEM_CATALOG } from '../items';
import type { Character, DungeonRun, AchievementId, DungeonTierId } from '@/types';
import {
  LEGENDARY_ITEM_IDS,
  ACHIEVEMENT_GOLD,
  checkNewAchievements,
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
    stats: { strength: 10, stamina: 10, agility: 10, health: 10, wisdom: 10, defense: 5 },
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

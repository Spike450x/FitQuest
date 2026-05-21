import { describe, it, expect } from 'vitest';
import { checkDungeonAchievements, ACHIEVEMENTS } from '../achievements';
import type { Character, DungeonRun, AchievementId } from '@/types';

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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkDungeonAchievements', () => {
  it('returns empty for non-completed runs', () => {
    expect(checkDungeonAchievements(makeChar(), makeRun({ status: 'abandoned' }))).toEqual([]);
    expect(checkDungeonAchievements(makeChar(), makeRun({ status: 'active' }))).toEqual([]);
  });

  it('awards dungeon-initiate on first completed run', () => {
    const result = checkDungeonAchievements(makeChar(), makeRun());
    expect(result).toContain('dungeon-initiate');
  });

  it('does not re-award already unlocked achievements', () => {
    const char = makeChar(['dungeon-initiate', 'goblin-slayer']);
    const result = checkDungeonAchievements(char, makeRun({ tierId: 'goblin-caves' }));
    expect(result).not.toContain('dungeon-initiate');
    expect(result).not.toContain('goblin-slayer');
  });

  it('awards tier-specific achievement for goblin-caves', () => {
    const result = checkDungeonAchievements(makeChar(), makeRun({ tierId: 'goblin-caves' }));
    expect(result).toContain('goblin-slayer');
    expect(result).not.toContain('web-walker');
  });

  it('awards tier-specific achievement for spider-lair', () => {
    const result = checkDungeonAchievements(makeChar(), makeRun({ tierId: 'spider-lair' }));
    expect(result).toContain('web-walker');
    expect(result).not.toContain('goblin-slayer');
  });

  it('awards tier-specific achievement for dark-sanctum', () => {
    const result = checkDungeonAchievements(makeChar(), makeRun({ tierId: 'dark-sanctum' }));
    expect(result).toContain('dark-arts');
  });

  it('awards dragonheart for dragons-keep', () => {
    const result = checkDungeonAchievements(makeChar(), makeRun({ tierId: 'dragons-keep' }));
    expect(result).toContain('dragonheart');
  });

  it('awards legendary-haul when a legendary item dropped', () => {
    // 'draconic-sigil' is legendary in the dungeon item catalog
    const result = checkDungeonAchievements(
      makeChar(),
      makeRun({ tierId: 'dragons-keep', allDroppedItems: ['draconic-sigil'] }),
    );
    expect(result).toContain('legendary-haul');
  });

  it('does not award legendary-haul for non-legendary drops', () => {
    const result = checkDungeonAchievements(
      makeChar(),
      makeRun({ allDroppedItems: ['scavengers-chain'] }), // Rare item
    );
    expect(result).not.toContain('legendary-haul');
  });

  it('can award multiple achievements at once on a single run', () => {
    // New player clears Dragon's Keep with a legendary drop
    const result = checkDungeonAchievements(
      makeChar(),
      makeRun({ tierId: 'dragons-keep', allDroppedItems: ['draconic-sigil'] }),
    );
    expect(result).toContain('dungeon-initiate');
    expect(result).toContain('dragonheart');
    expect(result).toContain('legendary-haul');
  });

  it('ACHIEVEMENTS catalog has goldReward for every AchievementId', () => {
    const ids: AchievementId[] = [
      'dungeon-initiate',
      'goblin-slayer',
      'web-walker',
      'dark-arts',
      'dragonheart',
      'legendary-haul',
    ];
    for (const id of ids) {
      expect(ACHIEVEMENTS[id].goldReward).toBeGreaterThan(0);
    }
  });
});

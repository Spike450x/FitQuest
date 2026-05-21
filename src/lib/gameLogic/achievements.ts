import { getItemById } from './items';
import type { AchievementId, Character, DungeonRun } from '@/types';

export interface AchievementDef {
  id: AchievementId;
  name: string;
  description: string;
  goldReward: number;
  emoji: string;
}

export const ACHIEVEMENTS: Record<AchievementId, AchievementDef> = {
  'dungeon-initiate': {
    id: 'dungeon-initiate',
    name: 'Dungeon Initiate',
    description: 'Complete your first dungeon run.',
    goldReward: 50,
    emoji: '🏰',
  },
  'goblin-slayer': {
    id: 'goblin-slayer',
    name: 'Goblin Slayer',
    description: 'Clear the Goblin Caves.',
    goldReward: 100,
    emoji: '👺',
  },
  'web-walker': {
    id: 'web-walker',
    name: 'Web Walker',
    description: 'Clear the Spider Lair.',
    goldReward: 150,
    emoji: '🕷',
  },
  'dark-arts': {
    id: 'dark-arts',
    name: 'Dark Arts',
    description: 'Clear the Dark Sanctum.',
    goldReward: 250,
    emoji: '💀',
  },
  dragonheart: {
    id: 'dragonheart',
    name: 'Dragonheart',
    description: "Clear Dragon's Keep.",
    goldReward: 500,
    emoji: '🔥',
  },
  'legendary-haul': {
    id: 'legendary-haul',
    name: 'Legendary Haul',
    description: 'Receive a legendary item from a dungeon boss.',
    goldReward: 200,
    emoji: '⭐',
  },
};

/**
 * Compares a completed dungeon run against the character's existing achievements
 * and returns any achievement IDs newly earned. Always returns an empty array
 * for non-completed runs (retreat/defeat do not trigger achievements).
 */
export function checkDungeonAchievements(character: Character, run: DungeonRun): AchievementId[] {
  if (run.status !== 'completed') return [];

  const existing = new Set(character.achievements ?? []);
  const unlocked: AchievementId[] = [];

  const check = (id: AchievementId, condition: boolean) => {
    if (condition && !existing.has(id)) unlocked.push(id);
  };

  check('dungeon-initiate', true);
  check('goblin-slayer', run.tierId === 'goblin-caves');
  check('web-walker', run.tierId === 'spider-lair');
  check('dark-arts', run.tierId === 'dark-sanctum');
  check('dragonheart', run.tierId === 'dragons-keep');
  check(
    'legendary-haul',
    run.allDroppedItems.some((id) => getItemById(id)?.rarity === 'legendary'),
  );

  return unlocked;
}

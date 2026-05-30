import { getItemById, ITEM_CATALOG } from './items';
import type { MasteryActivityType } from './constants';
import type { AchievementId, Character, DungeonRun, Stats } from '@/types';

export interface AchievementDef {
  id: AchievementId;
  name: string;
  description: string;
  goldReward: number;
  emoji: string;
}

export const ACHIEVEMENTS: Record<AchievementId, AchievementDef> = {
  // ─── Dungeon (shipped pre-PR5b) ──────────────────────────────────────────────
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

  // ─── Combat ──────────────────────────────────────────────────────────────────
  'first-blood': {
    id: 'first-blood',
    name: 'First Blood',
    description: 'Win your first arena combat encounter.',
    goldReward: 50,
    emoji: '⚔️',
  },
  centurion: {
    id: 'centurion',
    name: 'Centurion',
    description: 'Win 100 arena combat encounters.',
    goldReward: 300,
    emoji: '🛡️',
  },
  'slayer-obsidian': {
    id: 'slayer-obsidian',
    name: 'Stoneshatter',
    description: 'Defeat 5 Obsidian Golems.',
    goldReward: 150,
    emoji: '🗿',
  },
  'slayer-ashwyrm': {
    id: 'slayer-ashwyrm',
    name: 'Ash to Ash',
    description: 'Defeat 5 Ashwyrms.',
    goldReward: 150,
    emoji: '🐉',
  },
  'slayer-revenant': {
    id: 'slayer-revenant',
    name: 'Banisher',
    description: 'Defeat 5 Void Revenants.',
    goldReward: 150,
    emoji: '👻',
  },
  'slayer-djinn': {
    id: 'slayer-djinn',
    name: 'Stormbreaker',
    description: 'Defeat 5 Storm Djinns.',
    goldReward: 150,
    emoji: '🌀',
  },
  untouched: {
    id: 'untouched',
    name: 'Untouched',
    description: 'Win an arena fight without taking any damage.',
    goldReward: 200,
    emoji: '✨',
  },

  // ─── Activity ────────────────────────────────────────────────────────────────
  'iron-body': {
    id: 'iron-body',
    name: 'Iron Body',
    description: 'Log 100 workout sessions.',
    goldReward: 200,
    emoji: '✊',
  },
  marathoner: {
    id: 'marathoner',
    name: 'Marathoner',
    description: 'Log 100 runs.',
    goldReward: 200,
    emoji: '🏃',
  },
  'well-fed': {
    id: 'well-fed',
    name: 'Well-Fed',
    description: 'Log 100 nutrition entries.',
    goldReward: 200,
    emoji: '🥗',
  },
  'well-rested': {
    id: 'well-rested',
    name: 'Well-Rested',
    description: 'Log 100 sleep entries.',
    goldReward: 200,
    emoji: '💤',
  },
  'hydration-streak': {
    id: 'hydration-streak',
    name: 'Like Water',
    description: 'Log water 7 days in a row.',
    goldReward: 150,
    emoji: '💧',
  },
  enlightened: {
    id: 'enlightened',
    name: 'Enlightened',
    description: 'Complete 50 meditation sessions.',
    goldReward: 250,
    emoji: '🧘',
  },

  // ─── Mastery ─────────────────────────────────────────────────────────────────
  apprentice: {
    id: 'apprentice',
    name: 'Apprentice',
    description: 'Hit mastery level 5 on any primary stat.',
    goldReward: 50,
    emoji: '📘',
  },
  journeyman: {
    id: 'journeyman',
    name: 'Journeyman',
    description: 'Hit mastery level 15 on any primary stat.',
    goldReward: 150,
    emoji: '📗',
  },
  master: {
    id: 'master',
    name: 'Master',
    description: 'Hit mastery level 25 on any primary stat.',
    goldReward: 300,
    emoji: '📕',
  },
  polymath: {
    id: 'polymath',
    name: 'Polymath',
    description: 'Hit mastery level 5 on every primary stat (STR + WIS + AGI + SPR).',
    goldReward: 500,
    emoji: '🎓',
  },

  // ─── Quest ───────────────────────────────────────────────────────────────────
  'quest-novice': {
    id: 'quest-novice',
    name: 'Quest Novice',
    description: 'Complete 50 quests.',
    goldReward: 100,
    emoji: '📜',
  },
  'quest-veteran': {
    id: 'quest-veteran',
    name: 'Quest Veteran',
    description: 'Complete 250 quests.',
    goldReward: 300,
    emoji: '📜',
  },
  'quest-legend': {
    id: 'quest-legend',
    name: 'Quest Legend',
    description: 'Complete 1000 quests.',
    goldReward: 1000,
    emoji: '📜',
  },
  'weekly-perfectionist': {
    id: 'weekly-perfectionist',
    name: 'Weekly Perfectionist',
    description: 'Claim all 3 weekly quests in a single week.',
    goldReward: 400,
    emoji: '📆',
  },

  // ─── Collection ──────────────────────────────────────────────────────────────
  'bestiary-complete': {
    id: 'bestiary-complete',
    name: 'Bestiary Complete',
    description: 'Discover every monster and dungeon boss.',
    goldReward: 500,
    emoji: '📖',
  },
  'legendary-hoarder': {
    id: 'legendary-hoarder',
    name: 'Legendary Hoarder',
    description: 'Own every legendary item simultaneously.',
    goldReward: 1500,
    emoji: '💎',
  },
  armory: {
    id: 'armory',
    name: 'Armory',
    description: 'Own at least 15 unique pieces of gear at once.',
    goldReward: 300,
    emoji: '🗡️',
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function newlyUnlocked(
  existing: ReadonlySet<AchievementId>,
  candidates: Array<[AchievementId, boolean]>,
): AchievementId[] {
  const result: AchievementId[] = [];
  for (const [id, condition] of candidates) {
    if (condition && !existing.has(id)) result.push(id);
  }
  return result;
}

// ─── Dungeon checker (existing, preserved) ─────────────────────────────────

export function checkDungeonAchievements(character: Character, run: DungeonRun): AchievementId[] {
  if (run.status !== 'completed') return [];
  const existing = new Set(character.achievements ?? []);
  return newlyUnlocked(existing, [
    ['dungeon-initiate', true],
    ['goblin-slayer', run.tierId === 'goblin-caves'],
    ['web-walker', run.tierId === 'spider-lair'],
    ['dark-arts', run.tierId === 'dark-sanctum'],
    ['dragonheart', run.tierId === 'dragons-keep'],
    ['legendary-haul', run.allDroppedItems.some((id) => getItemById(id)?.rarity === 'legendary')],
  ]);
}

// ─── Combat checker (server) ────────────────────────────────────────────────

const SLAYER_THRESHOLDS: Partial<Record<string, AchievementId>> = {
  'obsidian-golem': 'slayer-obsidian',
  ashwyrm: 'slayer-ashwyrm',
  'void-revenant': 'slayer-revenant',
  'storm-djinn': 'slayer-djinn',
};

export const SLAYER_KILL_TARGET = 5;
export const CENTURION_WIN_TARGET = 100;

export interface CombatAchievementInput {
  existing: ReadonlySet<AchievementId>;
  monsterId: string;
  /** Monster's per-monster kill count AFTER this win is counted. */
  monsterKillsAfter: number;
  /** Lifetime arena wins AFTER this win is counted. */
  totalWinsAfter: number;
  /** True if the player did not take damage at any point in the fight. */
  flawless: boolean;
}

export function checkCombatAchievements(input: CombatAchievementInput): AchievementId[] {
  const slayerId = SLAYER_THRESHOLDS[input.monsterId];
  return newlyUnlocked(input.existing, [
    ['first-blood', input.totalWinsAfter >= 1],
    ['centurion', input.totalWinsAfter >= CENTURION_WIN_TARGET],
    ['untouched', input.flawless],
    ...(slayerId
      ? ([[slayerId, input.monsterKillsAfter >= SLAYER_KILL_TARGET]] as Array<
          [AchievementId, boolean]
        >)
      : []),
  ]);
}

// ─── Activity checker (server) ──────────────────────────────────────────────

export const ACTIVITY_COUNT_TARGETS: Partial<Record<string, AchievementId>> = {
  workout: 'iron-body',
  run: 'marathoner',
  nutrition: 'well-fed',
  sleep: 'well-rested',
  meditation: 'enlightened',
};

export const ACTIVITY_COUNT_THRESHOLD: Record<AchievementId, number> = {
  // Only the activity-count achievements have a target; others are unused via lookup.
  ...Object.fromEntries(
    Object.values(ACTIVITY_COUNT_TARGETS).map((id) => [id as AchievementId, 100]),
  ),
  enlightened: 50,
} as Record<AchievementId, number>;

export const HYDRATION_STREAK_DAYS = 7;

export interface ActivityAchievementInput {
  existing: ReadonlySet<AchievementId>;
  activityType: string;
  /** Count of this activity type AFTER the log was persisted. */
  activityCountAfter: number;
  /** Distinct days (UTC) with a water log in the last 7-day window, including today. */
  waterStreakDays?: number;
}

export function checkActivityAchievements(input: ActivityAchievementInput): AchievementId[] {
  const targetId = ACTIVITY_COUNT_TARGETS[input.activityType];
  const threshold = targetId ? (ACTIVITY_COUNT_THRESHOLD[targetId] ?? 100) : 0;
  return newlyUnlocked(input.existing, [
    ...(targetId
      ? ([[targetId, input.activityCountAfter >= threshold]] as Array<[AchievementId, boolean]>)
      : []),
    [
      'hydration-streak',
      input.activityType === 'water' && (input.waterStreakDays ?? 0) >= HYDRATION_STREAK_DAYS,
    ],
  ]);
}

// ─── Mastery checker (server) ───────────────────────────────────────────────

export const MASTERY_TIERS = { apprentice: 5, journeyman: 15, master: 25 } as const;
export const POLYMATH_THRESHOLD = 5;

export interface MasteryAchievementInput {
  existing: ReadonlySet<AchievementId>;
  /** Mastery counts AFTER the increment. */
  masteryCounts: Partial<Record<MasteryActivityType, number>>;
}

export function checkMasteryAchievements(input: MasteryAchievementInput): AchievementId[] {
  const counts = Object.values(input.masteryCounts).filter(
    (n): n is number => typeof n === 'number',
  );
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
  const allFourAtFive =
    (input.masteryCounts.workout ?? 0) >= POLYMATH_THRESHOLD &&
    (input.masteryCounts.steps ?? 0) >= POLYMATH_THRESHOLD &&
    (input.masteryCounts.run ?? 0) >= POLYMATH_THRESHOLD &&
    (input.masteryCounts.meditation ?? 0) >= POLYMATH_THRESHOLD;
  return newlyUnlocked(input.existing, [
    ['apprentice', maxCount >= MASTERY_TIERS.apprentice],
    ['journeyman', maxCount >= MASTERY_TIERS.journeyman],
    ['master', maxCount >= MASTERY_TIERS.master],
    ['polymath', allFourAtFive],
  ]);
}

// ─── Quest checker (client-mirrored) ────────────────────────────────────────

export const QUEST_COUNT_TIERS = {
  'quest-novice': 50,
  'quest-veteran': 250,
  'quest-legend': 1000,
} as const;

export const WEEKLY_PERFECTIONIST_TARGET = 3;

export interface QuestAchievementInput {
  existing: ReadonlySet<AchievementId>;
  /** Lifetime quests claimed AFTER this claim. */
  totalQuestsClaimedAfter: number;
  /** Distinct weekly questDefIds claimed inside the current ISO week, AFTER this claim. */
  weeklyClaimsThisWeek: number;
}

export function checkQuestAchievements(input: QuestAchievementInput): AchievementId[] {
  return newlyUnlocked(input.existing, [
    ['quest-novice', input.totalQuestsClaimedAfter >= QUEST_COUNT_TIERS['quest-novice']],
    ['quest-veteran', input.totalQuestsClaimedAfter >= QUEST_COUNT_TIERS['quest-veteran']],
    ['quest-legend', input.totalQuestsClaimedAfter >= QUEST_COUNT_TIERS['quest-legend']],
    ['weekly-perfectionist', input.weeklyClaimsThisWeek >= WEEKLY_PERFECTIONIST_TARGET],
  ]);
}

// ─── Collection checker (client-mirrored) ───────────────────────────────────

export const ARMORY_UNIQUE_GEAR_TARGET = 15;

const LEGENDARY_ITEM_IDS: ReadonlySet<string> = new Set(
  ITEM_CATALOG.filter((i) => i.rarity === 'legendary').map((i) => i.id),
);

const GEAR_TYPES = new Set(['weapon', 'armor', 'accessory']);

const GEAR_ITEM_IDS: ReadonlySet<string> = new Set(
  ITEM_CATALOG.filter((i) => GEAR_TYPES.has(i.type)).map((i) => i.id),
);

export interface CollectionAchievementInput {
  existing: ReadonlySet<AchievementId>;
  /** Item IDs currently in inventory (deduped — pass `new Set(items.map(i => i.itemId))`). */
  ownedItemIds: ReadonlySet<string>;
  /** True iff the player has discovered every catalog monster AND defeated every dungeon boss. */
  bestiaryComplete: boolean;
}

export function checkCollectionAchievements(input: CollectionAchievementInput): AchievementId[] {
  const ownsAllLegendaries =
    LEGENDARY_ITEM_IDS.size > 0 &&
    [...LEGENDARY_ITEM_IDS].every((id) => input.ownedItemIds.has(id));
  let uniqueGear = 0;
  for (const id of input.ownedItemIds) {
    if (GEAR_ITEM_IDS.has(id)) uniqueGear++;
  }
  return newlyUnlocked(input.existing, [
    ['bestiary-complete', input.bestiaryComplete],
    ['legendary-hoarder', ownsAllLegendaries],
    ['armory', uniqueGear >= ARMORY_UNIQUE_GEAR_TARGET],
  ]);
}

// ─── Aggregate helper ───────────────────────────────────────────────────────

/**
 * Sum of gold rewards for a list of achievement IDs. Used by every CF that
 * merges achievements into a character doc so the gold credit happens in the
 * same atomic write as the achievements array update.
 */
export function sumAchievementGold(ids: readonly AchievementId[]): number {
  return ids.reduce((sum, id) => sum + (ACHIEVEMENTS[id]?.goldReward ?? 0), 0);
}

// ─── Stats helper ──────────────────────────────────────────────────────────

export const PRIMARY_MASTERY_STATS: readonly (keyof Stats)[] = [
  'strength',
  'wisdom',
  'agility',
  'spirit',
];

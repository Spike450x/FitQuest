/**
 * Achievement helpers for the claimDungeonRun + claimCombatVictory + logActivity
 * Cloud Functions.
 *
 * Duplicated logic from src/lib/gameLogic/achievements.ts so the CF
 * has no @/ path-alias dependencies.
 *
 * DRIFT RISK: any change to achievement IDs, gold rewards, thresholds, or the
 * legendary item list must be mirrored here AND in the src copy. The parity test
 * at src/lib/gameLogic/__tests__/achievements-parity.test.ts enforces this.
 */

// ─── Item lists ──────────────────────────────────────────────────────────────

export const LEGENDARY_ITEM_IDS = new Set([
  // Regular combat loot
  'godslayer',
  'the-eternal-grimoire',
  'oblivion-edge',
  'celestial-aegis',
  'heart-of-the-cosmos',
  // Dungeon-exclusive boss loot
  'wraithbound-ring',
  'draconic-sigil',
  'scale-dragon-king',
  // PR3 — Content-scaling legendaries
  'world-ender',
  'cosmic-codex',
  'shadowblade-zenith',
  'crown-of-mind',
  'guardian-bulwark',
  'starfire-vestments',
  'eye-of-eternity',
  'twin-suns-pendant',
  'phoenix-draught',
  // PR4 — Legendary class spells (loot-only)
  'spell-worldbreaker',
  'spell-stellar-collapse',
  'spell-thousand-cuts',
]);

// ─── Gold rewards (mirrors goldReward in src achievements.ts) ───────────────

export const ACHIEVEMENT_GOLD: Record<string, number> = {
  // Dungeon
  'dungeon-initiate': 50,
  'goblin-slayer': 100,
  'web-walker': 150,
  'dark-arts': 250,
  dragonheart: 500,
  'legendary-haul': 200,
  // Combat (PR5b)
  'first-blood': 50,
  centurion: 300,
  'slayer-obsidian': 150,
  'slayer-ashwyrm': 150,
  'slayer-revenant': 150,
  'slayer-djinn': 150,
  untouched: 200,
  // Activity (PR5b)
  'iron-body': 200,
  marathoner: 200,
  'well-fed': 200,
  'well-rested': 200,
  'hydration-streak': 150,
  enlightened: 250,
  // Mastery (PR5b)
  apprentice: 50,
  journeyman: 150,
  master: 300,
  polymath: 500,
  // Quest (PR5b — client-mirrored, CF re-validates)
  'quest-novice': 100,
  'quest-veteran': 300,
  'quest-legend': 1000,
  'weekly-perfectionist': 400,
  // Collection (PR5b — client-mirrored, CF re-validates)
  'bestiary-complete': 500,
  'legendary-hoarder': 1500,
  armory: 300,
};

// ─── Thresholds (mirrors src constants) ─────────────────────────────────────

export const SLAYER_KILL_TARGET = 5;
export const CENTURION_WIN_TARGET = 100;
export const HYDRATION_STREAK_DAYS = 7;
export const POLYMATH_THRESHOLD = 5;
export const ARMORY_UNIQUE_GEAR_TARGET = 15;

export const MASTERY_TIERS = { apprentice: 5, journeyman: 15, master: 25 } as const;

export const SLAYER_THRESHOLDS: Record<string, string> = {
  'obsidian-golem': 'slayer-obsidian',
  ashwyrm: 'slayer-ashwyrm',
  'void-revenant': 'slayer-revenant',
  'storm-djinn': 'slayer-djinn',
};

export const ACTIVITY_COUNT_TARGETS: Record<string, string> = {
  workout: 'iron-body',
  run: 'marathoner',
  nutrition: 'well-fed',
  sleep: 'well-rested',
  meditation: 'enlightened',
};

export const ACTIVITY_COUNT_THRESHOLD: Record<string, number> = {
  'iron-body': 100,
  marathoner: 100,
  'well-fed': 100,
  'well-rested': 100,
  enlightened: 50,
};

export const QUEST_COUNT_TIERS: Record<string, number> = {
  'quest-novice': 50,
  'quest-veteran': 250,
  'quest-legend': 1000,
};

export const WEEKLY_PERFECTIONIST_TARGET = 3;

// ─── Checkers ───────────────────────────────────────────────────────────────

function newlyUnlocked(
  existing: ReadonlySet<string>,
  candidates: Array<[string, boolean]>,
): string[] {
  const result: string[] = [];
  for (const [id, condition] of candidates) {
    if (condition && !existing.has(id)) result.push(id);
  }
  return result;
}

/**
 * Returns achievement IDs newly earned by a completed dungeon run.
 * Mirrors checkDungeonAchievements from the src copy.
 */
export function checkNewAchievements(
  tierId: string,
  existingAchievements: string[],
  droppedItems: string[],
  outcomeStatus: 'completed' | 'abandoned',
): string[] {
  if (outcomeStatus !== 'completed') return [];
  const existing = new Set(existingAchievements);
  return newlyUnlocked(existing, [
    ['dungeon-initiate', true],
    ['goblin-slayer', tierId === 'goblin-caves'],
    ['web-walker', tierId === 'spider-lair'],
    ['dark-arts', tierId === 'dark-sanctum'],
    ['dragonheart', tierId === 'dragons-keep'],
    ['legendary-haul', droppedItems.some((id) => LEGENDARY_ITEM_IDS.has(id))],
  ]);
}

/**
 * Returns combat achievement IDs newly earned by an arena win.
 * Mirrors checkCombatAchievements from the src copy.
 */
export function checkNewCombatAchievements(input: {
  existing: string[];
  monsterId: string;
  monsterKillsAfter: number;
  totalWinsAfter: number;
  flawless: boolean;
}): string[] {
  const existing = new Set(input.existing);
  const slayerId = SLAYER_THRESHOLDS[input.monsterId];
  const candidates: Array<[string, boolean]> = [
    ['first-blood', input.totalWinsAfter >= 1],
    ['centurion', input.totalWinsAfter >= CENTURION_WIN_TARGET],
    ['untouched', input.flawless],
  ];
  if (slayerId) {
    candidates.push([slayerId, input.monsterKillsAfter >= SLAYER_KILL_TARGET]);
  }
  return newlyUnlocked(existing, candidates);
}

/**
 * Returns activity achievement IDs newly earned by an activity log.
 * Mirrors checkActivityAchievements from the src copy.
 */
export function checkNewActivityAchievements(input: {
  existing: string[];
  activityType: string;
  activityCountAfter: number;
  waterStreakDays?: number;
}): string[] {
  const existing = new Set(input.existing);
  const targetId = ACTIVITY_COUNT_TARGETS[input.activityType];
  const threshold = targetId ? (ACTIVITY_COUNT_THRESHOLD[targetId] ?? 100) : 0;
  const candidates: Array<[string, boolean]> = [
    [
      'hydration-streak',
      input.activityType === 'water' && (input.waterStreakDays ?? 0) >= HYDRATION_STREAK_DAYS,
    ],
  ];
  if (targetId) {
    candidates.push([targetId, input.activityCountAfter >= threshold]);
  }
  return newlyUnlocked(existing, candidates);
}

/**
 * Returns mastery achievement IDs newly earned given the AFTER-increment counts.
 * Mirrors checkMasteryAchievements from the src copy.
 */
export function checkNewMasteryAchievements(input: {
  existing: string[];
  masteryCounts: Partial<Record<'workout' | 'run' | 'steps' | 'meditation', number>>;
}): string[] {
  const existing = new Set(input.existing);
  const counts = [
    input.masteryCounts.workout ?? 0,
    input.masteryCounts.run ?? 0,
    input.masteryCounts.steps ?? 0,
    input.masteryCounts.meditation ?? 0,
  ];
  const maxCount = Math.max(...counts);
  const allFourAtFive = counts.every((c) => c >= POLYMATH_THRESHOLD);
  return newlyUnlocked(existing, [
    ['apprentice', maxCount >= MASTERY_TIERS.apprentice],
    ['journeyman', maxCount >= MASTERY_TIERS.journeyman],
    ['master', maxCount >= MASTERY_TIERS.master],
    ['polymath', allFourAtFive],
  ]);
}

/**
 * Sum of gold rewards for a list of achievement IDs.
 */
export function sumAchievementGold(ids: readonly string[]): number {
  return ids.reduce((sum, id) => sum + (ACHIEVEMENT_GOLD[id] ?? 0), 0);
}

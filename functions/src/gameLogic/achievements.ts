/**
 * Achievement helpers for the claimDungeonRun Cloud Function.
 *
 * Duplicated logic from src/lib/gameLogic/achievements.ts so the CF
 * has no @/ path-alias dependencies.
 *
 * DRIFT RISK: any change to achievement IDs, gold rewards, or the legendary
 * item list must be mirrored here AND in the src copy. The parity test at
 * src/lib/gameLogic/__tests__/achievements-parity.test.ts enforces this.
 */

/**
 * Item IDs whose rarity is 'legendary' across the entire ITEM_CATALOG.
 * Used to evaluate the 'legendary-haul' achievement without importing
 * the full item catalog (which has Next.js path dependencies).
 *
 * Keep in sync with items marked `rarity: 'legendary'` in
 * src/lib/gameLogic/items.ts.
 */
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
]);

/**
 * Gold reward per achievement ID.
 * Keep in sync with `goldReward` in src/lib/gameLogic/achievements.ts.
 */
export const ACHIEVEMENT_GOLD: Record<string, number> = {
  'dungeon-initiate': 50,
  'goblin-slayer': 100,
  'web-walker': 150,
  'dark-arts': 250,
  dragonheart: 500,
  'legendary-haul': 200,
};

/**
 * Returns achievement IDs newly earned by a completed dungeon run.
 * Returns [] for non-completed runs (abandoned runs earn no badges).
 *
 * Mirrors checkDungeonAchievements from src/lib/gameLogic/achievements.ts.
 */
export function checkNewAchievements(
  tierId: string,
  existingAchievements: string[],
  droppedItems: string[],
  outcomeStatus: 'completed' | 'abandoned',
): string[] {
  if (outcomeStatus !== 'completed') return [];
  const existing = new Set(existingAchievements);
  const unlocked: string[] = [];
  const check = (id: string, condition: boolean) => {
    if (condition && !existing.has(id)) unlocked.push(id);
  };
  check('dungeon-initiate', true);
  check('goblin-slayer', tierId === 'goblin-caves');
  check('web-walker', tierId === 'spider-lair');
  check('dark-arts', tierId === 'dark-sanctum');
  check('dragonheart', tierId === 'dragons-keep');
  check(
    'legendary-haul',
    droppedItems.some((id) => LEGENDARY_ITEM_IDS.has(id)),
  );
  return unlocked;
}

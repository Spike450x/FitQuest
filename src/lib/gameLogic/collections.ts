import type { AchievementId, Character, DungeonTierId, ItemType } from '@/types';
import { MONSTER_CATALOG } from './monsters';
import { DUNGEON_BOSSES, DUNGEON_TIERS } from './dungeons';
import { ITEM_CATALOG } from './items';

// ─── Bestiary ─────────────────────────────────────────────────────────────────

/**
 * Bosses are NOT tracked in `character.monstersKilled` (that map is pruned to
 * MONSTER_CATALOG ids). Their "defeated" state is derived from the 1:1
 * tier-clear achievement instead.
 */
export const BOSS_TIER_ACHIEVEMENT: Record<DungeonTierId, AchievementId> = {
  'goblin-caves': 'goblin-slayer',
  'spider-lair': 'web-walker',
  'dark-sanctum': 'dark-arts',
  'dragons-keep': 'dragonheart',
};

/** Display name for a dungeon tier (reuses the canonical tier definitions). */
export function tierName(tierId: DungeonTierId): string {
  return DUNGEON_TIERS[tierId].name;
}

export interface BestiaryProgress {
  monstersDiscovered: number;
  totalMonsters: number;
  bossesDefeated: number;
  totalBosses: number;
}

/** Aggregate bestiary completion for the header counter. */
export function bestiaryProgress(character: Character): BestiaryProgress {
  const killed = character.monstersKilled ?? {};
  const achievements = new Set(character.achievements ?? []);
  const tiers = Object.keys(DUNGEON_BOSSES) as DungeonTierId[];
  return {
    monstersDiscovered: MONSTER_CATALOG.filter((m) => killed[m.id]).length,
    totalMonsters: MONSTER_CATALOG.length,
    bossesDefeated: tiers.filter((t) => achievements.has(BOSS_TIER_ACHIEVEMENT[t])).length,
    totalBosses: tiers.length,
  };
}

// ─── Collection ─────────────────────────────────────────────────────────────────

export interface TypeCollectionProgress {
  type: ItemType;
  owned: number;
  total: number;
}

export interface CollectionProgress {
  owned: number;
  total: number;
  /** Whole-percent completion (0–100). */
  pct: number;
  byType: TypeCollectionProgress[];
}

const COLLECTION_TYPES: ItemType[] = ['weapon', 'armor', 'accessory', 'consumable', 'spell'];

/**
 * Owned-vs-total item collection completion, overall and per type. `ownedIds`
 * is the set of `itemDefId`s the player currently holds (from the inventory store).
 */
export function collectionProgress(ownedIds: Set<string>): CollectionProgress {
  const byType = COLLECTION_TYPES.map((type) => {
    const defs = ITEM_CATALOG.filter((d) => d.type === type);
    return {
      type,
      owned: defs.filter((d) => ownedIds.has(d.id)).length,
      total: defs.length,
    };
  });
  const owned = ITEM_CATALOG.filter((d) => ownedIds.has(d.id)).length;
  const total = ITEM_CATALOG.length;
  return {
    owned,
    total,
    pct: total > 0 ? Math.round((owned / total) * 100) : 0,
    byType,
  };
}

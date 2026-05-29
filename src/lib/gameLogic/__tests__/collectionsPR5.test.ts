import { describe, it, expect } from 'vitest';
import {
  BOSS_TIER_ACHIEVEMENT,
  bestiaryProgress,
  collectionProgress,
  tierName,
} from '../collections';
import { MONSTER_CATALOG } from '../monsters';
import { DUNGEON_BOSSES } from '../dungeons';
import { ITEM_CATALOG } from '../items';
import { ACHIEVEMENTS } from '../achievements';
import { MONSTER_SILHOUETTES, SPELL_SILHOUETTES } from '@/components/art/silhouettes';
import { ITEM_SILHOUETTES } from '@/components/art/item-silhouettes';
import { spellEffectKey } from '@/lib/entityArt';
import type { Character, DungeonTierId } from '@/types';

function makeChar(overrides: Partial<Character> = {}): Character {
  return {
    uid: 'test',
    name: 'Tester',
    class: 'warrior',
    level: 5,
    xp: 0,
    xpToNextLevel: 100,
    gold: 0,
    stats: { strength: 10, stamina: 10, agility: 10, health: 10, wisdom: 10, defense: 10 },
    equippedGear: { weapon: null, armor: null, accessory: null },
    createdAt: 0,
    ...overrides,
  };
}

// ─── Bestiary ─────────────────────────────────────────────────────────────────

describe('bestiaryProgress', () => {
  it('reports zero discovered for a fresh character', () => {
    const p = bestiaryProgress(makeChar());
    expect(p.monstersDiscovered).toBe(0);
    expect(p.bossesDefeated).toBe(0);
    expect(p.totalMonsters).toBe(MONSTER_CATALOG.length);
    expect(p.totalBosses).toBe(Object.keys(DUNGEON_BOSSES).length);
  });

  it('counts a discovered monster from monstersKilled', () => {
    const first = MONSTER_CATALOG[0];
    const p = bestiaryProgress(
      makeChar({ monstersKilled: { [first.id]: { killCount: 3, firstKilledAt: 1 } } }),
    );
    expect(p.monstersDiscovered).toBe(1);
  });

  it('derives boss-defeated state from the tier-clear achievement', () => {
    const p = bestiaryProgress(makeChar({ achievements: ['goblin-slayer', 'dragonheart'] }));
    expect(p.bossesDefeated).toBe(2);
  });

  it('ignores monstersKilled entries that are not in the catalog', () => {
    const p = bestiaryProgress(
      makeChar({ monstersKilled: { 'ghost-monster-xyz': { killCount: 9, firstKilledAt: 1 } } }),
    );
    expect(p.monstersDiscovered).toBe(0);
  });
});

describe('BOSS_TIER_ACHIEVEMENT mapping', () => {
  it('covers every dungeon tier with a real achievement id', () => {
    const tiers = Object.keys(DUNGEON_BOSSES) as DungeonTierId[];
    for (const t of tiers) {
      const ach = BOSS_TIER_ACHIEVEMENT[t];
      expect(ach, `${t} missing achievement`).toBeDefined();
      expect(ACHIEVEMENTS[ach], `${ach} not a real achievement`).toBeDefined();
    }
  });

  it('tierName returns a non-empty display name for each tier', () => {
    for (const t of Object.keys(DUNGEON_BOSSES) as DungeonTierId[]) {
      expect(tierName(t).length).toBeGreaterThan(0);
    }
  });
});

describe('bestiary render coverage', () => {
  it('every catalog monster has a silhouette (bestiary renders with no fallback)', () => {
    for (const m of MONSTER_CATALOG) {
      expect(MONSTER_SILHOUETTES[m.id], `${m.id} missing silhouette`).toBeDefined();
    }
  });
});

// ─── Collection ─────────────────────────────────────────────────────────────────

describe('collectionProgress', () => {
  it('reports 0% for an empty inventory', () => {
    const p = collectionProgress(new Set());
    expect(p.owned).toBe(0);
    expect(p.total).toBe(ITEM_CATALOG.length);
    expect(p.pct).toBe(0);
  });

  it('reports 100% when every catalog item is owned', () => {
    const all = new Set(ITEM_CATALOG.map((d) => d.id));
    const p = collectionProgress(all);
    expect(p.owned).toBe(ITEM_CATALOG.length);
    expect(p.pct).toBe(100);
  });

  it('per-type owned/total sums back to the overall totals', () => {
    const someOwned = new Set(ITEM_CATALOG.slice(0, 10).map((d) => d.id));
    const p = collectionProgress(someOwned);
    const sumOwned = p.byType.reduce((s, t) => s + t.owned, 0);
    const sumTotal = p.byType.reduce((s, t) => s + t.total, 0);
    expect(sumOwned).toBe(p.owned);
    expect(sumTotal).toBe(p.total);
  });

  it('includes all five item types in byType', () => {
    const p = collectionProgress(new Set());
    expect(p.byType.map((t) => t.type).sort()).toEqual(
      ['accessory', 'armor', 'consumable', 'spell', 'weapon'].sort(),
    );
  });

  it('every catalog item renders a silhouette with no fallback', () => {
    for (const d of ITEM_CATALOG) {
      if (d.type === 'spell') {
        // Spells render their effect-school silhouette, not a per-id item one.
        const key = spellEffectKey(d.spellMechanics!.effect);
        expect(SPELL_SILHOUETTES[key], `spell ${d.id} → ${key} missing silhouette`).toBeDefined();
      } else {
        expect(ITEM_SILHOUETTES[d.id], `${d.id} missing silhouette`).toBeDefined();
      }
    }
  });
});

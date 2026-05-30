import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENTS,
  ARMORY_UNIQUE_GEAR_TARGET,
  CENTURION_WIN_TARGET,
  HYDRATION_STREAK_DAYS,
  MASTERY_TIERS,
  POLYMATH_THRESHOLD,
  QUEST_COUNT_TIERS,
  SLAYER_KILL_TARGET,
  WEEKLY_PERFECTIONIST_TARGET,
  checkActivityAchievements,
  checkCollectionAchievements,
  checkCombatAchievements,
  checkMasteryAchievements,
  checkQuestAchievements,
  sumAchievementGold,
} from '../achievements';
import { ITEM_CATALOG } from '../items';
import type { AchievementId } from '@/types';

// ─── Catalog sanity ─────────────────────────────────────────────────────────

describe('ACHIEVEMENTS catalog (PR5b)', () => {
  const NEW_IDS: AchievementId[] = [
    'first-blood',
    'centurion',
    'slayer-obsidian',
    'slayer-ashwyrm',
    'slayer-revenant',
    'slayer-djinn',
    'untouched',
    'iron-body',
    'marathoner',
    'well-fed',
    'well-rested',
    'hydration-streak',
    'enlightened',
    'apprentice',
    'journeyman',
    'master',
    'polymath',
    'quest-novice',
    'quest-veteran',
    'quest-legend',
    'weekly-perfectionist',
    'bestiary-complete',
    'legendary-hoarder',
    'armory',
    'arcane-archive',
  ];

  it('catalog contains all 25 new achievements (PR5b + arcane-archive)', () => {
    for (const id of NEW_IDS) {
      expect(ACHIEVEMENTS[id], `${id} missing from ACHIEVEMENTS catalog`).toBeDefined();
    }
  });

  it('every achievement has a non-empty name, description, emoji, and a positive gold reward', () => {
    for (const id of NEW_IDS) {
      const def = ACHIEVEMENTS[id];
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(0);
      expect(def.emoji.length).toBeGreaterThan(0);
      expect(def.goldReward).toBeGreaterThan(0);
    }
  });

  it('catalog now contains 31 achievements (6 dungeon + 24 PR5b + 1 balance pass)', () => {
    expect(Object.keys(ACHIEVEMENTS)).toHaveLength(31);
  });
});

// ─── Combat ──────────────────────────────────────────────────────────────────

describe('checkCombatAchievements', () => {
  it('first-blood unlocks on the first win', () => {
    const out = checkCombatAchievements({
      existing: new Set(),
      monsterId: 'goblin',
      monsterKillsAfter: 1,
      totalWinsAfter: 1,
      flawless: false,
    });
    expect(out).toContain('first-blood');
  });

  it('centurion requires CENTURION_WIN_TARGET lifetime wins', () => {
    const justShort = checkCombatAchievements({
      existing: new Set(['first-blood']),
      monsterId: 'goblin',
      monsterKillsAfter: 1,
      totalWinsAfter: CENTURION_WIN_TARGET - 1,
      flawless: false,
    });
    expect(justShort).not.toContain('centurion');
    const hit = checkCombatAchievements({
      existing: new Set(['first-blood']),
      monsterId: 'goblin',
      monsterKillsAfter: 1,
      totalWinsAfter: CENTURION_WIN_TARGET,
      flawless: false,
    });
    expect(hit).toContain('centurion');
  });

  it('slayer-X unlocks at SLAYER_KILL_TARGET kills of the matching monster', () => {
    const out = checkCombatAchievements({
      existing: new Set(['first-blood']),
      monsterId: 'ashwyrm',
      monsterKillsAfter: SLAYER_KILL_TARGET,
      totalWinsAfter: 50,
      flawless: false,
    });
    expect(out).toContain('slayer-ashwyrm');
  });

  it('non-tracked monsters do not award slayer achievements', () => {
    const out = checkCombatAchievements({
      existing: new Set(['first-blood']),
      monsterId: 'goblin',
      monsterKillsAfter: 99,
      totalWinsAfter: 50,
      flawless: false,
    });
    expect(out.some((id) => id.startsWith('slayer-'))).toBe(false);
  });

  it('untouched fires only when flawless = true', () => {
    const damaged = checkCombatAchievements({
      existing: new Set(['first-blood']),
      monsterId: 'goblin',
      monsterKillsAfter: 1,
      totalWinsAfter: 50,
      flawless: false,
    });
    expect(damaged).not.toContain('untouched');
    const flawless = checkCombatAchievements({
      existing: new Set(['first-blood']),
      monsterId: 'goblin',
      monsterKillsAfter: 1,
      totalWinsAfter: 50,
      flawless: true,
    });
    expect(flawless).toContain('untouched');
  });

  it('does not re-award already-held achievements', () => {
    const out = checkCombatAchievements({
      existing: new Set(['first-blood', 'untouched', 'centurion']),
      monsterId: 'goblin',
      monsterKillsAfter: 1,
      totalWinsAfter: CENTURION_WIN_TARGET + 50,
      flawless: true,
    });
    expect(out).not.toContain('first-blood');
    expect(out).not.toContain('untouched');
    expect(out).not.toContain('centurion');
  });
});

// ─── Activity ────────────────────────────────────────────────────────────────

describe('checkActivityAchievements', () => {
  it('iron-body unlocks at 100 workouts', () => {
    expect(
      checkActivityAchievements({
        existing: new Set(),
        activityType: 'workout',
        activityCountAfter: 100,
      }),
    ).toContain('iron-body');
  });

  it('enlightened unlocks at 50 meditations', () => {
    expect(
      checkActivityAchievements({
        existing: new Set(),
        activityType: 'meditation',
        activityCountAfter: 50,
      }),
    ).toContain('enlightened');
  });

  it('hydration-streak fires only on a water log AND with HYDRATION_STREAK_DAYS distinct days', () => {
    expect(
      checkActivityAchievements({
        existing: new Set(),
        activityType: 'workout',
        activityCountAfter: 1,
        waterStreakDays: HYDRATION_STREAK_DAYS,
      }),
    ).not.toContain('hydration-streak');
    expect(
      checkActivityAchievements({
        existing: new Set(),
        activityType: 'water',
        activityCountAfter: 1,
        waterStreakDays: HYDRATION_STREAK_DAYS - 1,
      }),
    ).not.toContain('hydration-streak');
    expect(
      checkActivityAchievements({
        existing: new Set(),
        activityType: 'water',
        activityCountAfter: 1,
        waterStreakDays: HYDRATION_STREAK_DAYS,
      }),
    ).toContain('hydration-streak');
  });

  it('unknown activity types award nothing', () => {
    expect(
      checkActivityAchievements({
        existing: new Set(),
        activityType: 'pirate-radio',
        activityCountAfter: 9999,
      }),
    ).toEqual([]);
  });
});

// ─── Mastery ─────────────────────────────────────────────────────────────────

describe('checkMasteryAchievements', () => {
  it('apprentice fires when any stat hits 5', () => {
    expect(
      checkMasteryAchievements({ existing: new Set(), masteryCounts: { workout: 5 } }),
    ).toContain('apprentice');
  });

  it('journeyman fires when any stat hits 15', () => {
    expect(checkMasteryAchievements({ existing: new Set(), masteryCounts: { run: 15 } })).toContain(
      'journeyman',
    );
  });

  it('master fires when any stat hits 25', () => {
    expect(
      checkMasteryAchievements({ existing: new Set(), masteryCounts: { steps: 25 } }),
    ).toContain('master');
  });

  it('polymath requires ALL four primary mastery stats at threshold', () => {
    expect(
      checkMasteryAchievements({
        existing: new Set(),
        masteryCounts: { workout: 5, run: 5, steps: 5, meditation: 5 },
      }),
    ).toContain('polymath');
    expect(
      checkMasteryAchievements({
        existing: new Set(),
        masteryCounts: { workout: 5, run: 5, steps: 5, meditation: POLYMATH_THRESHOLD - 1 },
      }),
    ).not.toContain('polymath');
  });

  it('returns nothing when nothing hit any threshold', () => {
    expect(
      checkMasteryAchievements({
        existing: new Set(),
        masteryCounts: { workout: MASTERY_TIERS.apprentice - 1 },
      }),
    ).toEqual([]);
  });
});

// ─── Quest ───────────────────────────────────────────────────────────────────

describe('checkQuestAchievements', () => {
  it('unlocks each lifetime tier in order', () => {
    expect(
      checkQuestAchievements({
        existing: new Set(),
        totalQuestsClaimedAfter: QUEST_COUNT_TIERS['quest-novice'],
        weeklyClaimsThisWeek: 0,
      }),
    ).toContain('quest-novice');
    expect(
      checkQuestAchievements({
        existing: new Set(['quest-novice']),
        totalQuestsClaimedAfter: QUEST_COUNT_TIERS['quest-veteran'],
        weeklyClaimsThisWeek: 0,
      }),
    ).toContain('quest-veteran');
    expect(
      checkQuestAchievements({
        existing: new Set(['quest-novice', 'quest-veteran']),
        totalQuestsClaimedAfter: QUEST_COUNT_TIERS['quest-legend'],
        weeklyClaimsThisWeek: 0,
      }),
    ).toContain('quest-legend');
  });

  it('weekly-perfectionist fires at WEEKLY_PERFECTIONIST_TARGET claims in one week', () => {
    expect(
      checkQuestAchievements({
        existing: new Set(),
        totalQuestsClaimedAfter: 1,
        weeklyClaimsThisWeek: WEEKLY_PERFECTIONIST_TARGET,
      }),
    ).toContain('weekly-perfectionist');
    expect(
      checkQuestAchievements({
        existing: new Set(),
        totalQuestsClaimedAfter: 1,
        weeklyClaimsThisWeek: WEEKLY_PERFECTIONIST_TARGET - 1,
      }),
    ).not.toContain('weekly-perfectionist');
  });
});

// ─── Collection ──────────────────────────────────────────────────────────────

describe('checkCollectionAchievements', () => {
  it('bestiary-complete fires only when both monsters and bosses are 100%', () => {
    expect(
      checkCollectionAchievements({
        existing: new Set(),
        ownedItemIds: new Set(),
        bestiaryComplete: false,
      }),
    ).not.toContain('bestiary-complete');
    expect(
      checkCollectionAchievements({
        existing: new Set(),
        ownedItemIds: new Set(),
        bestiaryComplete: true,
      }),
    ).toContain('bestiary-complete');
  });

  it('legendary-hoarder fires only when every legendary in ITEM_CATALOG is owned', () => {
    const allLegendaries = new Set(
      ITEM_CATALOG.filter((i) => i.rarity === 'legendary').map((i) => i.id),
    );
    expect(
      checkCollectionAchievements({
        existing: new Set(),
        ownedItemIds: allLegendaries,
        bestiaryComplete: false,
      }),
    ).toContain('legendary-hoarder');
    // Drop one legendary → no longer qualifies
    const allButOne = new Set([...allLegendaries].slice(1));
    expect(
      checkCollectionAchievements({
        existing: new Set(),
        ownedItemIds: allButOne,
        bestiaryComplete: false,
      }),
    ).not.toContain('legendary-hoarder');
  });

  it('armory fires at ARMORY_UNIQUE_GEAR_TARGET unique gear pieces owned', () => {
    const gearIds = ITEM_CATALOG.filter(
      (i) => i.type === 'weapon' || i.type === 'armor' || i.type === 'accessory',
    ).map((i) => i.id);

    expect(
      checkCollectionAchievements({
        existing: new Set(),
        ownedItemIds: new Set(gearIds.slice(0, ARMORY_UNIQUE_GEAR_TARGET - 1)),
        bestiaryComplete: false,
      }),
    ).not.toContain('armory');
    expect(
      checkCollectionAchievements({
        existing: new Set(),
        ownedItemIds: new Set(gearIds.slice(0, ARMORY_UNIQUE_GEAR_TARGET)),
        bestiaryComplete: false,
      }),
    ).toContain('armory');
  });

  it('consumables and spells do not count toward armory', () => {
    const nonGear = ITEM_CATALOG.filter((i) => i.type === 'consumable' || i.type === 'spell')
      .map((i) => i.id)
      .slice(0, ARMORY_UNIQUE_GEAR_TARGET + 5);
    expect(
      checkCollectionAchievements({
        existing: new Set(),
        ownedItemIds: new Set(nonGear),
        bestiaryComplete: false,
      }),
    ).not.toContain('armory');
  });

  it('arcane-archive fires only when every spell in the catalog is owned', () => {
    const allSpells = new Set(ITEM_CATALOG.filter((i) => i.type === 'spell').map((i) => i.id));
    expect(
      checkCollectionAchievements({
        existing: new Set(),
        ownedItemIds: allSpells,
        bestiaryComplete: false,
      }),
    ).toContain('arcane-archive');
    // Drop one spell → no longer qualifies
    const allButOne = new Set([...allSpells].slice(1));
    expect(
      checkCollectionAchievements({
        existing: new Set(),
        ownedItemIds: allButOne,
        bestiaryComplete: false,
      }),
    ).not.toContain('arcane-archive');
  });
});

// ─── Aggregate ───────────────────────────────────────────────────────────────

describe('sumAchievementGold', () => {
  it('sums gold rewards for known IDs', () => {
    const total = sumAchievementGold(['first-blood', 'centurion']);
    expect(total).toBe(ACHIEVEMENTS['first-blood'].goldReward + ACHIEVEMENTS.centurion.goldReward);
  });

  it('returns 0 for an empty list', () => {
    expect(sumAchievementGold([])).toBe(0);
  });
});

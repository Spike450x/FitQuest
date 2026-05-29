import { describe, it, expect } from 'vitest';
import { scaleQuestRewards, DAILY_QUEST_POOL, WEEKLY_QUEST_POOL } from '../quests';

describe('scaleQuestRewards', () => {
  const base = { xp: 50, gold: 15 };

  it('returns ~1.0× rewards at level 1', () => {
    const r = scaleQuestRewards(base, 1);
    expect(r.xp).toBe(50);
    expect(r.gold).toBe(15);
  });

  it('returns ~2.30× at level 10 (steeper than the old 0.6+0.4·√l curve)', () => {
    const r = scaleQuestRewards(base, 10);
    // 0.4 + 0.6 * sqrt(10) ≈ 2.2974
    expect(r.xp).toBe(Math.round(50 * (0.4 + 0.6 * Math.sqrt(10))));
    expect(r.xp).toBeGreaterThan(110);
    expect(r.xp).toBeLessThan(120);
  });

  it('scales monotonically with level', () => {
    let prev = -1;
    for (let l = 1; l <= 50; l++) {
      const xp = scaleQuestRewards(base, l).xp;
      expect(xp).toBeGreaterThanOrEqual(prev);
      prev = xp;
    }
  });

  it('clamps level <= 0 to a 1.0× factor', () => {
    expect(scaleQuestRewards(base, 0).xp).toBe(50);
    expect(scaleQuestRewards(base, -5).xp).toBe(50);
  });
});

describe('Quest pools', () => {
  it('daily pool covers all activity types with multiple variants', () => {
    const types = new Set(DAILY_QUEST_POOL.map((q) => q.requirement.activityType));
    expect(types.size).toBe(7);
    // PR5 expansion brought the pool to 61 (was 34).
    expect(DAILY_QUEST_POOL.length).toBeGreaterThanOrEqual(60);
  });

  it('weekly pool covers all activity types with multiple variants', () => {
    const types = new Set(WEEKLY_QUEST_POOL.map((q) => q.requirement.activityType));
    expect(types.size).toBe(7);
    // PR5 expansion brought the pool to 31 (was 17).
    expect(WEEKLY_QUEST_POOL.length).toBeGreaterThanOrEqual(30);
  });

  it('every quest grants positive xp and gold', () => {
    for (const q of [...DAILY_QUEST_POOL, ...WEEKLY_QUEST_POOL]) {
      expect(q.rewards.xp, `${q.id} xp`).toBeGreaterThan(0);
      expect(q.rewards.gold, `${q.id} gold`).toBeGreaterThan(0);
    }
  });

  it('every quest primary requirement has a positive target and a unit', () => {
    for (const q of [...DAILY_QUEST_POOL, ...WEEKLY_QUEST_POOL]) {
      expect(q.requirement.target, `${q.id} target`).toBeGreaterThan(0);
      expect(typeof q.requirement.unit, `${q.id} unit`).toBe('string');
    }
  });

  it('quest IDs are unique across both pools', () => {
    const ids = [...DAILY_QUEST_POOL, ...WEEKLY_QUEST_POOL].map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('multi-target quests have valid extraTargets shapes', () => {
    const allQuests = [...DAILY_QUEST_POOL, ...WEEKLY_QUEST_POOL];
    const multiTarget = allQuests.filter((q) => q.extraTargets && q.extraTargets.length > 0);
    // At least the 6 we added
    expect(multiTarget.length).toBeGreaterThanOrEqual(6);
    for (const q of multiTarget) {
      expect(q.extraTargets).toBeDefined();
      for (const et of q.extraTargets!) {
        expect(typeof et.activityType).toBe('string');
        expect(et.target).toBeGreaterThan(0);
        expect(typeof et.unit).toBe('string');
        // Extra targets must not duplicate the primary requirement type
        // (prevents accidental overlapping progress tracking)
        expect(et.activityType).not.toBe(q.requirement.activityType);
      }
    }
  });
});

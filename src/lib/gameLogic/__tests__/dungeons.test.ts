import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  mulberry32,
  getWeekSeed,
  generateDungeonLayout,
  resolveStatCheckOptions,
  checkVenomProc,
  applyVenomTick,
  evaluateBossEnrage,
  initialEnrageState,
  bossEffectiveAtk,
  applyNecroShield,
  dragonIgnoresDef,
  canStartDungeonRun,
  isLegendaryEligible,
  nextDungeonRunsToday,
  DUNGEON_TIERS,
} from '../dungeons';
import type { Character, BossEnrageState, DungeonRunsToday } from '@/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockCharacter: Character = {
  uid: 'test-uid',
  name: 'Test',
  class: 'warrior',
  level: 5,
  xp: 0,
  xpToNextLevel: 500,
  gold: 100,
  stats: { strength: 15, stamina: 10, agility: 12, health: 5, wisdom: 8, defense: 5, spirit: 0 },
  equippedGear: { weapon: null, armor: null, accessory: null },
  createdAt: 1000000,
};

// ── mulberry32 ────────────────────────────────────────────────────────────────

describe('mulberry32', () => {
  it('produces the same sequence from the same seed', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    const seq1 = [rng1(), rng1(), rng1(), rng1(), rng1()];
    const seq2 = [rng2(), rng2(), rng2(), rng2(), rng2()];
    expect(seq1).toEqual(seq2);
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(999);
    for (let i = 0; i < 20; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);
    const seq1 = [rng1(), rng1(), rng1()];
    const seq2 = [rng2(), rng2(), rng2()];
    expect(seq1).not.toEqual(seq2);
  });
});

// ── getWeekSeed ───────────────────────────────────────────────────────────────

describe('getWeekSeed', () => {
  it('returns a positive number', () => {
    const seed = getWeekSeed();
    expect(seed).toBeGreaterThan(0);
  });

  it('returns a number greater than year * 100', () => {
    const nowMs = Date.now();
    const year = new Date(nowMs).getUTCFullYear();
    const seed = getWeekSeed(nowMs);
    // seed = year * 100 + weekNumber (1–53)
    expect(seed).toBeGreaterThan(year * 100);
    expect(seed).toBeLessThanOrEqual(year * 100 + 53);
  });

  it('returns the same value for the same timestamp', () => {
    const ts = 1716307200000; // a fixed UTC timestamp
    expect(getWeekSeed(ts)).toBe(getWeekSeed(ts));
  });
});

// ── generateDungeonLayout ─────────────────────────────────────────────────────

describe('generateDungeonLayout', () => {
  const TIERS = ['goblin-caves', 'spider-lair', 'dark-sanctum', 'dragons-keep'] as const;

  it('is deterministic — same tierId + seed always returns the same layout', () => {
    for (const tierId of TIERS) {
      const layout1 = generateDungeonLayout(tierId, 202421);
      const layout2 = generateDungeonLayout(tierId, 202421);
      expect(layout1).toEqual(layout2);
    }
  });

  it('last room is always type "boss"', () => {
    for (const tierId of TIERS) {
      const layout = generateDungeonLayout(tierId, 202421);
      expect(layout[layout.length - 1].type).toBe('boss');
    }
  });

  it('room count (excluding boss) is within tier bounds', () => {
    for (const tierId of TIERS) {
      const tier = DUNGEON_TIERS[tierId];
      // Test multiple seeds to catch variance
      for (const seed of [100, 200, 300, 400]) {
        const layout = generateDungeonLayout(tierId, seed);
        const nonBossCount = layout.length - 1;
        expect(nonBossCount).toBeGreaterThanOrEqual(tier.minRooms);
        expect(nonBossCount).toBeLessThanOrEqual(tier.maxRooms);
      }
    }
  });

  it('produces different layouts for different seeds', () => {
    const layout1 = generateDungeonLayout('goblin-caves', 100);
    const layout2 = generateDungeonLayout('goblin-caves', 999);
    // At least one room difference (room count or type) across different seeds
    const sameLength = layout1.length === layout2.length;
    const sameTypes = sameLength && layout1.every((r, i) => r.type === layout2[i].type);
    // Very unlikely to be identical for different seeds
    expect(sameLength && sameTypes).toBe(false);
  });

  it('boss room has the correct monsterId', () => {
    const layout = generateDungeonLayout('goblin-caves', 202421);
    const bossRoom = layout[layout.length - 1];
    expect(bossRoom.monsterId).toBe('boss-goblin-king');
  });

  it('all rooms start with cleared=false and empty awards', () => {
    const layout = generateDungeonLayout('spider-lair', 202421);
    for (const room of layout) {
      expect(room.cleared).toBe(false);
      expect(room.lootAwarded).toEqual([]);
      expect(room.xpAwarded).toBe(0);
      expect(room.goldAwarded).toBe(0);
    }
  });

  it('never produces a room with an undefined field value (Firestore safety)', () => {
    for (const tierId of TIERS) {
      for (const seed of [100, 200, 300, 202421]) {
        const layout = generateDungeonLayout(tierId, seed);
        for (const room of layout) {
          for (const [key, val] of Object.entries(room)) {
            expect(
              val,
              `${tierId} seed ${seed}: room.${key} must not be undefined`,
            ).not.toBeUndefined();
          }
        }
      }
    }
  });

  it('always contains at least one combat room (excluding boss)', () => {
    // Test many seeds to catch stat-check-heavy PRNG outputs
    for (const tierId of TIERS) {
      for (let seed = 1; seed <= 500; seed++) {
        const layout = generateDungeonLayout(tierId, seed);
        const nonBoss = layout.slice(0, -1);
        const hasCombat = nonBoss.some((r) => r.type === 'combat');
        expect(hasCombat).toBe(true);
      }
    }
  });
});

// ── resolveStatCheckOptions ───────────────────────────────────────────────────

describe('resolveStatCheckOptions', () => {
  it('always includes at least one "str" path', () => {
    for (const seed of [1, 100, 500, 9999]) {
      const options = resolveStatCheckOptions('goblin-caves', mockCharacter, seed);
      const hasStr = options.some((o) => o.path === 'str');
      expect(hasStr).toBe(true);
    }
  });

  it('when player passes at least one check, no option has isAttemptAnyway', () => {
    // mockCharacter has str=15 >= goblin-caves str threshold of 12
    const options = resolveStatCheckOptions('goblin-caves', mockCharacter, 42);
    const attemptAnyway = options.filter((o) => o.isAttemptAnyway);
    expect(attemptAnyway).toHaveLength(0);
  });

  it('when player fails all checks, exactly one option has isAttemptAnyway=true', () => {
    // Use dragons-keep thresholds (str:25, wis:21, agi:21) with weak character stats
    const weakChar: Character = {
      ...mockCharacter,
      stats: { strength: 5, stamina: 5, agility: 5, health: 5, wisdom: 5, defense: 5, spirit: 0 },
    };
    const options = resolveStatCheckOptions('dragons-keep', weakChar, 42);
    const anyPass = options.some((o) => o.passes);
    expect(anyPass).toBe(false);
    const attemptAnyway = options.filter((o) => o.isAttemptAnyway);
    expect(attemptAnyway).toHaveLength(1);
  });

  it('returns 2 or 3 options', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const options = resolveStatCheckOptions('goblin-caves', mockCharacter, seed);
      expect(options.length).toBeGreaterThanOrEqual(2);
      expect(options.length).toBeLessThanOrEqual(3);
    }
  });

  it('passes field reflects correct comparison', () => {
    const options = resolveStatCheckOptions('goblin-caves', mockCharacter, 1);
    for (const opt of options) {
      expect(opt.passes).toBe(opt.playerStat >= opt.threshold);
    }
  });
});

// ── checkVenomProc ────────────────────────────────────────────────────────────

describe('checkVenomProc', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('always returns false when hasVenomfangBracer is false', () => {
    // Even with Math.random mocked to 0 (which would pass), still false
    vi.spyOn(Math, 'random').mockReturnValue(0);
    for (let i = 0; i < 10; i++) {
      expect(checkVenomProc(false)).toBe(false);
    }
  });

  it('returns true when bracer equipped and random < 0.20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.19);
    expect(checkVenomProc(true)).toBe(true);
  });

  it('returns false when bracer equipped but random >= 0.20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    expect(checkVenomProc(true)).toBe(false);
  });
});

// ── applyVenomTick ────────────────────────────────────────────────────────────

describe('applyVenomTick', () => {
  it('decrements roundsRemaining by 1', () => {
    const poisoned = { roundsRemaining: 3, damagePerRound: 3 };
    const { newPoisoned } = applyVenomTick(100, poisoned);
    expect(newPoisoned.roundsRemaining).toBe(2);
  });

  it('deals damagePerRound to monster HP', () => {
    const poisoned = { roundsRemaining: 3, damagePerRound: 3 };
    const { newMonsterHp } = applyVenomTick(50, poisoned);
    expect(newMonsterHp).toBe(47);
  });

  it('does not reduce monster HP below 0', () => {
    const poisoned = { roundsRemaining: 1, damagePerRound: 10 };
    const { newMonsterHp } = applyVenomTick(5, poisoned);
    expect(newMonsterHp).toBe(0);
  });

  it('does not mutate the original poisoned status', () => {
    const poisoned = { roundsRemaining: 3, damagePerRound: 3 };
    applyVenomTick(50, poisoned);
    expect(poisoned.roundsRemaining).toBe(3);
  });
});

// ── evaluateBossEnrage ────────────────────────────────────────────────────────

describe('evaluateBossEnrage', () => {
  it('spider-lair enrage triggers when HP falls to 25% and returns message', () => {
    const maxHp = 200;
    const prev = initialEnrageState();
    // At exactly 25% HP = 50
    const { next, message } = evaluateBossEnrage('spider-lair', 50, maxHp, prev);
    expect(next.triggered).toBe(true);
    expect(message).toBe('Enraged — +5 ATK permanently');
  });

  it('spider-lair enrage does not re-trigger once already triggered', () => {
    const maxHp = 200;
    const prev: BossEnrageState = {
      triggered: true,
      dragonIgnoreDefRoundsLeft: 0,
      necroShieldHp: 0,
    };
    const { next, message } = evaluateBossEnrage('spider-lair', 10, maxHp, prev);
    expect(next.triggered).toBe(true);
    expect(message).toBeNull();
  });

  it('spider-lair bossEffectiveAtk adds +5 after enrage', () => {
    const enrage: BossEnrageState = {
      triggered: true,
      dragonIgnoreDefRoundsLeft: 0,
      necroShieldHp: 0,
    };
    expect(bossEffectiveAtk('spider-lair', 22, enrage)).toBe(27);
  });

  it('dragon-king enrage sets dragonIgnoreDefRoundsLeft to 3', () => {
    const maxHp = 380;
    const prev = initialEnrageState();
    // At 30% = 114
    const { next } = evaluateBossEnrage('dragons-keep', 113, maxHp, prev);
    expect(next.triggered).toBe(true);
    expect(next.dragonIgnoreDefRoundsLeft).toBe(3);
  });

  it('dragon-king counter ticks down each round after enrage', () => {
    const triggered: BossEnrageState = {
      triggered: true,
      dragonIgnoreDefRoundsLeft: 3,
      necroShieldHp: 0,
    };
    const { next } = evaluateBossEnrage('dragons-keep', 50, 380, triggered);
    expect(next.dragonIgnoreDefRoundsLeft).toBe(2);
  });

  it('dragonIgnoresDef returns true when rounds remain, false when exhausted', () => {
    const active: BossEnrageState = {
      triggered: true,
      dragonIgnoreDefRoundsLeft: 2,
      necroShieldHp: 0,
    };
    expect(dragonIgnoresDef(active)).toBe(true);
    const spent: BossEnrageState = {
      triggered: true,
      dragonIgnoreDefRoundsLeft: 0,
      necroShieldHp: 0,
    };
    expect(dragonIgnoresDef(spent)).toBe(false);
  });

  it('necromancer enrage sets necroShieldHp to 30', () => {
    const maxHp = 280;
    const prev = initialEnrageState();
    // At 50% = 140
    const { next, message } = evaluateBossEnrage('dark-sanctum', 140, maxHp, prev);
    expect(next.triggered).toBe(true);
    expect(next.necroShieldHp).toBe(30);
    expect(message).toBe('Necro Shield active — absorbing up to 30 damage');
  });

  it('goblin-caves boss has no enrage (null trigger)', () => {
    const { next, message } = evaluateBossEnrage('goblin-caves', 1, 140, initialEnrageState());
    expect(next.triggered).toBe(false);
    expect(message).toBeNull();
  });
});

// ── applyNecroShield ──────────────────────────────────────────────────────────

describe('applyNecroShield', () => {
  it('absorbs damage up to shield HP', () => {
    const { absorbed, shieldHpLeft, damageToBoss } = applyNecroShield(20, 30);
    expect(absorbed).toBe(20);
    expect(shieldHpLeft).toBe(10);
    expect(damageToBoss).toBe(0);
  });

  it('passes excess damage to boss when shield is depleted', () => {
    const { absorbed, shieldHpLeft, damageToBoss } = applyNecroShield(40, 30);
    expect(absorbed).toBe(30);
    expect(shieldHpLeft).toBe(0);
    expect(damageToBoss).toBe(10);
  });

  it('passes full damage when shield is already 0', () => {
    const { absorbed, shieldHpLeft, damageToBoss } = applyNecroShield(15, 0);
    expect(absorbed).toBe(0);
    expect(shieldHpLeft).toBe(0);
    expect(damageToBoss).toBe(15);
  });
});

// ── canStartDungeonRun ────────────────────────────────────────────────────────

describe('canStartDungeonRun', () => {
  it('allows run when runsToday is undefined', () => {
    expect(canStartDungeonRun(undefined)).toBe(true);
  });

  it('allows run when count < 2 on same day', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(canStartDungeonRun({ date: today, count: 1, legendaryUsed: false })).toBe(true);
  });

  it('blocks run when count >= 2 on same day', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(canStartDungeonRun({ date: today, count: 2, legendaryUsed: false })).toBe(false);
    expect(canStartDungeonRun({ date: today, count: 3, legendaryUsed: false })).toBe(false);
  });

  it('allows run on a new day even if count >= 2', () => {
    expect(canStartDungeonRun({ date: '2020-01-01', count: 2, legendaryUsed: false })).toBe(true);
  });
});

// ── isLegendaryEligible ───────────────────────────────────────────────────────

describe('isLegendaryEligible', () => {
  it('returns true when runsToday is undefined', () => {
    expect(isLegendaryEligible(undefined)).toBe(true);
  });

  it('returns false when legendaryUsed is true on same day', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(isLegendaryEligible({ date: today, count: 1, legendaryUsed: true })).toBe(false);
  });

  it('returns true when legendaryUsed is false on same day', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(isLegendaryEligible({ date: today, count: 1, legendaryUsed: false })).toBe(true);
  });

  it('returns true on a new day even if legendaryUsed was true', () => {
    expect(isLegendaryEligible({ date: '2020-01-01', count: 1, legendaryUsed: true })).toBe(true);
  });
});

// ── nextDungeonRunsToday ──────────────────────────────────────────────────────

describe('nextDungeonRunsToday', () => {
  it('creates a fresh record when undefined', () => {
    const result = nextDungeonRunsToday(undefined);
    const today = new Date().toISOString().slice(0, 10);
    expect(result.date).toBe(today);
    expect(result.count).toBe(1);
    expect(result.legendaryUsed).toBe(false);
  });

  it('increments count when called on same day', () => {
    const today = new Date().toISOString().slice(0, 10);
    const prev: DungeonRunsToday = { date: today, count: 1, legendaryUsed: false };
    const result = nextDungeonRunsToday(prev);
    expect(result.count).toBe(2);
  });

  it('resets to count=1 on a new day', () => {
    const prev: DungeonRunsToday = { date: '2020-01-01', count: 2, legendaryUsed: true };
    const result = nextDungeonRunsToday(prev);
    const today = new Date().toISOString().slice(0, 10);
    expect(result.date).toBe(today);
    expect(result.count).toBe(1);
    expect(result.legendaryUsed).toBe(false);
  });
});

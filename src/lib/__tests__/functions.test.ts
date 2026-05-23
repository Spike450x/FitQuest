import { describe, it, expect, vi, beforeEach } from 'vitest';

const { claimDungeonRunFn, claimCombatVictoryFn, logActivityFn } = vi.hoisted(() => ({
  claimDungeonRunFn: vi.fn(),
  claimCombatVictoryFn: vi.fn(),
  logActivityFn: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({ functions: {} }));
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn((_fns: unknown, name: string) => {
    if (name === 'logActivity') return logActivityFn;
    if (name === 'claimDungeonRun') return claimDungeonRunFn;
    if (name === 'claimCombatVictory') return claimCombatVictoryFn;
    throw new Error(`unexpected callable: ${name}`);
  }),
}));

import { claimCombatVictoryCF, claimDungeonRunCF } from '../functions';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('claimCombatVictoryCF', () => {
  it('returns the result.data payload from the CF', async () => {
    claimCombatVictoryFn.mockResolvedValue({
      data: {
        finalXp: 50,
        multiplier: 1,
        winsTodayBefore: 0,
        winsTodayAfter: 1,
        leveledUp: false,
      },
    });
    const result = await claimCombatVictoryCF({
      monsterId: 'goblin-scout',
      monsterName: 'Goblin',
      xpReward: 50,
      goldReward: 25,
      idempotencyKey: 'idem-1',
    });
    expect(result.finalXp).toBe(50);
    expect(result.multiplier).toBe(1);
  });

  it('propagates non-already-exists CF errors', async () => {
    claimCombatVictoryFn.mockRejectedValue(new Error('out of quota'));
    await expect(
      claimCombatVictoryCF({
        monsterId: 'g',
        monsterName: 'g',
        xpReward: 1,
        goldReward: 1,
        idempotencyKey: 'idem-2',
      }),
    ).rejects.toThrow('out of quota');
  });
});

describe('claimDungeonRunCF', () => {
  it('returns the CF data payload on success', async () => {
    claimDungeonRunFn.mockResolvedValue({
      data: {
        xp: 100,
        gold: 50,
        achievementGold: 25,
        items: ['legendary-axe'],
        leveledUp: true,
        newAchievements: ['initiate'],
      },
    });
    const result = await claimDungeonRunCF('run1', false, 'completed');
    expect(result.xp).toBe(100);
    expect(result.items).toEqual(['legendary-axe']);
    expect(result.leveledUp).toBe(true);
  });

  it('treats functions/already-exists as an idempotent success with zero rewards', async () => {
    claimDungeonRunFn.mockRejectedValue({ code: 'functions/already-exists' });
    const result = await claimDungeonRunCF('run1', false, 'completed');
    expect(result.xp).toBe(0);
    expect(result.gold).toBe(0);
    expect(result.achievementGold).toBe(0);
    expect(result.items).toEqual([]);
    expect(result.leveledUp).toBe(false);
    expect(result.newAchievements).toEqual([]);
  });

  it('rethrows other CF errors', async () => {
    claimDungeonRunFn.mockRejectedValue({ code: 'functions/unavailable' });
    await expect(claimDungeonRunCF('run1', false, 'completed')).rejects.toMatchObject({
      code: 'functions/unavailable',
    });
  });

  it('rethrows generic Error objects (no code property)', async () => {
    claimDungeonRunFn.mockRejectedValue(new Error('network error'));
    await expect(claimDungeonRunCF('run1', false, 'completed')).rejects.toThrow('network error');
  });

  it('forwards the legendaryUsed and outcomeStatus to the CF', async () => {
    claimDungeonRunFn.mockResolvedValue({
      data: {
        xp: 0,
        gold: 0,
        achievementGold: 0,
        items: [],
        leveledUp: false,
        newAchievements: [],
      },
    });
    await claimDungeonRunCF('run1', true, 'abandoned');
    expect(claimDungeonRunFn).toHaveBeenCalledWith({
      runId: 'run1',
      legendaryUsed: true,
      outcomeStatus: 'abandoned',
    });
  });
});

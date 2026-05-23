import { describe, it, expect, vi, beforeEach } from 'vitest';

const collectionMock = vi.fn();
const addDocMock = vi.fn();
const queryMock = vi.fn();
const whereMock = vi.fn();
const orderByMock = vi.fn();
const limitMock = vi.fn();
const getDocsMock = vi.fn();

vi.mock('@/lib/firebase', () => ({ db: { tag: 'db' } }));
vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => collectionMock(...args),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
  where: (...args: unknown[]) => whereMock(...args),
  orderBy: (...args: unknown[]) => orderByMock(...args),
  limit: (...args: unknown[]) => limitMock(...args),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
}));

import { addCombatLogDoc, fetchRecentCombatLogs, COMBAT_LOGS_COLLECTION } from '../combatData';

beforeEach(() => {
  vi.clearAllMocks();
  collectionMock.mockReturnValue('collection-ref');
  queryMock.mockReturnValue('query-ref');
  whereMock.mockReturnValue('where-clause');
  orderByMock.mockReturnValue('order-clause');
  limitMock.mockReturnValue('limit-clause');
});

describe('addCombatLogDoc', () => {
  it('writes to the combatLogs collection with uid + loggedAt + data fields', async () => {
    addDocMock.mockResolvedValue({ id: 'log1' });
    const before = Date.now();
    await addCombatLogDoc('uid1', {
      monsterId: 'goblin-scout',
      monsterName: 'Goblin',
      xp: 50,
      gold: 25,
    });

    expect(collectionMock).toHaveBeenCalledWith({ tag: 'db' }, COMBAT_LOGS_COLLECTION);
    expect(addDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = addDocMock.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(payload.uid).toBe('uid1');
    expect(payload.monsterId).toBe('goblin-scout');
    expect(payload.xp).toBe(50);
    expect(payload.gold).toBe(25);
    expect(payload.loggedAt).toBeGreaterThanOrEqual(before);
  });

  it('propagates Firestore failures', async () => {
    addDocMock.mockRejectedValue(new Error('permission denied'));
    await expect(
      addCombatLogDoc('uid1', { monsterId: 'g', monsterName: 'g', xp: 0, gold: 0 }),
    ).rejects.toThrow('permission denied');
  });
});

describe('fetchRecentCombatLogs', () => {
  it('queries by uid, ordered by loggedAt desc with the requested limit', async () => {
    getDocsMock.mockResolvedValue({
      docs: [
        {
          id: 'l1',
          data: () => ({ uid: 'u', monsterId: 'g', monsterName: 'G', xp: 1, gold: 1, loggedAt: 1 }),
        },
      ],
    });
    const logs = await fetchRecentCombatLogs('uid1', 50);

    expect(whereMock).toHaveBeenCalledWith('uid', '==', 'uid1');
    expect(orderByMock).toHaveBeenCalledWith('loggedAt', 'desc');
    expect(limitMock).toHaveBeenCalledWith(50);
    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe('l1');
  });

  it('returns an empty array when there are no docs', async () => {
    getDocsMock.mockResolvedValue({ docs: [] });
    expect(await fetchRecentCombatLogs('uid1', 10)).toEqual([]);
  });
});

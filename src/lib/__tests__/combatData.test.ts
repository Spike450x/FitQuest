import { describe, it, expect, vi, beforeEach } from 'vitest';

const collectionMock = vi.fn();
const queryMock = vi.fn();
const whereMock = vi.fn();
const orderByMock = vi.fn();
const limitMock = vi.fn();
const getDocsMock = vi.fn();

vi.mock('@/lib/firebase', () => ({ db: { tag: 'db' } }));
vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => collectionMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
  where: (...args: unknown[]) => whereMock(...args),
  orderBy: (...args: unknown[]) => orderByMock(...args),
  limit: (...args: unknown[]) => limitMock(...args),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
}));

import { fetchRecentCombatLogs, COMBAT_LOGS_COLLECTION } from '../combatData';

beforeEach(() => {
  vi.clearAllMocks();
  collectionMock.mockReturnValue('collection-ref');
  queryMock.mockReturnValue('query-ref');
  whereMock.mockReturnValue('where-clause');
  orderByMock.mockReturnValue('order-clause');
  limitMock.mockReturnValue('limit-clause');
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
    expect(COMBAT_LOGS_COLLECTION).toBe('combatLogs');
  });

  it('returns an empty array when there are no docs', async () => {
    getDocsMock.mockResolvedValue({ docs: [] });
    expect(await fetchRecentCombatLogs('uid1', 10)).toEqual([]);
  });
});

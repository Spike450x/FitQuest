import { describe, it, expect, vi, beforeEach } from 'vitest';

const collectionMock = vi.fn();
const addDocMock = vi.fn();
const docMock = vi.fn();
const getDocMock = vi.fn();
const getDocsMock = vi.fn();
const updateDocMock = vi.fn();
const queryMock = vi.fn();
const whereMock = vi.fn();
const orderByMock = vi.fn();
const limitMock = vi.fn();

vi.mock('@/lib/firebase', () => ({ db: { tag: 'db' } }));
vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => collectionMock(...args),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  doc: (...args: unknown[]) => docMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
  where: (...args: unknown[]) => whereMock(...args),
  orderBy: (...args: unknown[]) => orderByMock(...args),
  limit: (...args: unknown[]) => limitMock(...args),
}));

import {
  createDungeonRunDoc,
  getDungeonRunDoc,
  getActiveDungeonRun,
  updateDungeonRunProgress,
  finalizeDungeonRun,
  claimDungeonRunRewards,
  getRecentDungeonRuns,
  DUNGEON_RUNS_COLLECTION,
} from '../dungeonData';

beforeEach(() => {
  vi.clearAllMocks();
  collectionMock.mockReturnValue('coll');
  docMock.mockReturnValue('doc-ref');
  queryMock.mockReturnValue('q');
});

describe('createDungeonRunDoc', () => {
  it('writes an active run with starting resources and zero progress', async () => {
    addDocMock.mockResolvedValue({ id: 'run-new' });
    const before = Date.now();
    const id = await createDungeonRunDoc('uid1', 'goblin-caves', [], 12345, true, 50, 40, 20);
    expect(id).toBe('run-new');
    const [, payload] = addDocMock.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(payload.uid).toBe('uid1');
    expect(payload.tierId).toBe('goblin-caves');
    expect(payload.status).toBe('active');
    expect(payload.currentRoom).toBe(0);
    expect(payload.currentHp).toBe(50);
    expect(payload.cumulativeXp).toBe(0);
    expect(payload.completedAt).toBeNull();
    expect(payload.startedAt).toBeGreaterThanOrEqual(before);
  });
});

describe('getDungeonRunDoc', () => {
  it('returns null when the doc does not exist', async () => {
    getDocMock.mockResolvedValue({ exists: () => false });
    expect(await getDungeonRunDoc('run1')).toBeNull();
  });

  it('returns the run with id when it exists', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      id: 'run1',
      data: () => ({ uid: 'u', status: 'active' }),
    });
    const run = await getDungeonRunDoc('run1');
    expect(run?.id).toBe('run1');
  });
});

describe('getActiveDungeonRun', () => {
  it('returns null when no active run', async () => {
    getDocsMock.mockResolvedValue({ empty: true, docs: [] });
    expect(await getActiveDungeonRun('uid1')).toBeNull();
  });

  it('returns the first active run when present', async () => {
    getDocsMock.mockResolvedValue({
      empty: false,
      docs: [{ id: 'run1', data: () => ({ uid: 'uid1', status: 'active' }) }],
    });
    const run = await getActiveDungeonRun('uid1');
    expect(run?.id).toBe('run1');
    expect(whereMock).toHaveBeenCalledWith('uid', '==', 'uid1');
    expect(whereMock).toHaveBeenCalledWith('status', '==', 'active');
  });
});

describe('updateDungeonRunProgress', () => {
  it('forwards the partial updates to updateDoc', async () => {
    await updateDungeonRunProgress('run1', {
      currentRoom: 2,
      rooms: [],
      currentHp: 30,
      currentStamina: 20,
      currentMagic: 10,
      cumulativeXp: 50,
      cumulativeGold: 25,
      allDroppedItems: ['x'],
    });
    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = updateDocMock.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(payload.currentRoom).toBe(2);
    expect(payload.cumulativeXp).toBe(50);
  });
});

describe('finalizeDungeonRun', () => {
  it.each(['completed', 'abandoned'] as const)(
    'stamps status and completedAt for %s',
    async (status) => {
      const before = Date.now();
      await finalizeDungeonRun('run1', status);
      const [, payload] = updateDocMock.mock.calls.at(-1) as [unknown, Record<string, unknown>];
      expect(payload.status).toBe(status);
      expect(payload.completedAt).toBeGreaterThanOrEqual(before);
    },
  );
});

describe('claimDungeonRunRewards', () => {
  it('marks claimed: true', async () => {
    await claimDungeonRunRewards('run1');
    expect(updateDocMock).toHaveBeenCalledWith('doc-ref', { claimed: true });
  });
});

describe('getRecentDungeonRuns', () => {
  it('uses default count of 10 when not specified', async () => {
    getDocsMock.mockResolvedValue({ docs: [] });
    await getRecentDungeonRuns('uid1');
    expect(limitMock).toHaveBeenCalledWith(10);
  });

  it('honors a custom count', async () => {
    getDocsMock.mockResolvedValue({ docs: [] });
    await getRecentDungeonRuns('uid1', 25);
    expect(limitMock).toHaveBeenCalledWith(25);
  });

  it('returns an empty array when no docs match', async () => {
    getDocsMock.mockResolvedValue({ docs: [] });
    expect(await getRecentDungeonRuns('uid1')).toEqual([]);
  });

  it('maps doc id and data fields onto each entry', async () => {
    getDocsMock.mockResolvedValue({
      docs: [
        { id: 'r1', data: () => ({ uid: 'u', status: 'completed' }) },
        { id: 'r2', data: () => ({ uid: 'u', status: 'abandoned' }) },
      ],
    });
    const runs = await getRecentDungeonRuns('uid1');
    expect(runs.map((r) => r.id)).toEqual(['r1', 'r2']);
  });
});

describe('DUNGEON_RUNS_COLLECTION', () => {
  it('is "dungeonRuns" (Firestore rules + indexes depend on this name)', () => {
    expect(DUNGEON_RUNS_COLLECTION).toBe('dungeonRuns');
  });
});

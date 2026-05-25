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

import type { DungeonRoomDef } from '@/types';
import {
  createDungeonRunDoc,
  getDungeonRunDoc,
  getActiveDungeonRun,
  updateDungeonRunProgress,
  finalizeDungeonRun,
  claimDungeonRunRewards,
  getRecentDungeonRuns,
  normalizeDungeonRun,
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

  it('omits monsterId key entirely for stat-check and rest rooms (Firestore rejects undefined)', async () => {
    addDocMock.mockResolvedValue({ id: 'run-sc' });
    const rooms: DungeonRoomDef[] = [
      { type: 'stat-check', cleared: false, lootAwarded: [], xpAwarded: 0, goldAwarded: 0 },
      { type: 'rest', cleared: false, lootAwarded: [], xpAwarded: 0, goldAwarded: 0 },
      {
        type: 'combat',
        monsterId: 'goblin',
        cleared: false,
        lootAwarded: [],
        xpAwarded: 0,
        goldAwarded: 0,
      },
    ];
    await createDungeonRunDoc('uid1', 'goblin-caves', rooms, 12345, true, 50, 40, 20);
    const [, payload] = addDocMock.mock.calls[0] as [unknown, Record<string, unknown>];
    const written = payload.rooms as Record<string, unknown>[];
    expect('monsterId' in written[0]).toBe(false);
    expect('monsterId' in written[1]).toBe(false);
    expect(written[2].monsterId).toBe('goblin');
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

describe('normalizeDungeonRun', () => {
  it('maps all scalar fields with their correct values', () => {
    const run = normalizeDungeonRun('run1', {
      uid: 'u1',
      tierId: 'spider-lair',
      weekSeed: 202421,
      status: 'completed',
      currentRoom: 3,
      rooms: [],
      currentHp: 80,
      currentStamina: 50,
      currentMagic: 30,
      legendaryEligible: true,
      cumulativeXp: 120,
      cumulativeGold: 60,
      allDroppedItems: ['item-sword'],
      startedAt: 1000,
      completedAt: 2000,
      claimed: true,
    });
    expect(run.id).toBe('run1');
    expect(run.uid).toBe('u1');
    expect(run.tierId).toBe('spider-lair');
    expect(run.weekSeed).toBe(202421);
    expect(run.status).toBe('completed');
    expect(run.currentRoom).toBe(3);
    expect(run.currentHp).toBe(80);
    expect(run.legendaryEligible).toBe(true);
    expect(run.cumulativeXp).toBe(120);
    expect(run.allDroppedItems).toEqual(['item-sword']);
    expect(run.completedAt).toBe(2000);
    expect(run.claimed).toBe(true);
  });

  it('provides safe defaults for every missing field', () => {
    const run = normalizeDungeonRun('run-empty', {});
    expect(run.uid).toBe('');
    expect(run.tierId).toBe('goblin-caves');
    expect(run.weekSeed).toBe(0);
    expect(run.status).toBe('active');
    expect(run.currentRoom).toBe(0);
    expect(run.rooms).toEqual([]);
    expect(run.currentHp).toBe(0);
    expect(run.currentStamina).toBe(0);
    expect(run.currentMagic).toBe(0);
    expect(run.legendaryEligible).toBe(false);
    expect(run.cumulativeXp).toBe(0);
    expect(run.cumulativeGold).toBe(0);
    expect(run.allDroppedItems).toEqual([]);
    expect(run.startedAt).toBe(0);
    expect(run.completedAt).toBeNull();
    expect(run.claimed).toBe(false);
  });

  it('normalizes combat and boss rooms — monsterId present', () => {
    const run = normalizeDungeonRun('run1', {
      rooms: [
        {
          type: 'combat',
          monsterId: 'goblin',
          cleared: false,
          lootAwarded: [],
          xpAwarded: 0,
          goldAwarded: 0,
        },
        {
          type: 'boss',
          monsterId: 'boss-goblin-king',
          cleared: true,
          lootAwarded: ['loot-1'],
          xpAwarded: 100,
          goldAwarded: 50,
        },
      ],
    });
    expect(run.rooms[0].monsterId).toBe('goblin');
    expect(run.rooms[1].monsterId).toBe('boss-goblin-king');
    expect(run.rooms[1].cleared).toBe(true);
    expect(run.rooms[1].xpAwarded).toBe(100);
  });

  it('normalizes stat-check and rest rooms — monsterId key absent', () => {
    const run = normalizeDungeonRun('run1', {
      rooms: [
        { type: 'stat-check', cleared: false, lootAwarded: [], xpAwarded: 0, goldAwarded: 0 },
        { type: 'rest', cleared: false, lootAwarded: [], xpAwarded: 0, goldAwarded: 0 },
      ],
    });
    expect('monsterId' in run.rooms[0]).toBe(false);
    expect('monsterId' in run.rooms[1]).toBe(false);
  });

  it('ignores a non-string monsterId stored in Firestore (schema corruption guard)', () => {
    const run = normalizeDungeonRun('run1', {
      rooms: [
        {
          type: 'combat',
          monsterId: 42,
          cleared: false,
          lootAwarded: [],
          xpAwarded: 0,
          goldAwarded: 0,
        },
      ],
    });
    expect('monsterId' in run.rooms[0]).toBe(false);
  });

  it('returns null completedAt when the field is absent or non-numeric', () => {
    expect(normalizeDungeonRun('r', { completedAt: null }).completedAt).toBeNull();
    expect(normalizeDungeonRun('r', { completedAt: 'bad' }).completedAt).toBeNull();
    expect(normalizeDungeonRun('r', {}).completedAt).toBeNull();
  });
});

describe('DUNGEON_RUNS_COLLECTION', () => {
  it('is "dungeonRuns" (Firestore rules + indexes depend on this name)', () => {
    expect(DUNGEON_RUNS_COLLECTION).toBe('dungeonRuns');
  });
});

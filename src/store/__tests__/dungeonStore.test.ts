import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
vi.mock('@/lib/errors', () => ({ captureError: vi.fn() }));
vi.mock('@/lib/dungeonData', () => ({
  createDungeonRunDoc: vi.fn(),
  getDungeonRunDoc: vi.fn(),
  getActiveDungeonRun: vi.fn(),
  updateDungeonRunProgress: vi.fn(),
  finalizeDungeonRun: vi.fn(),
}));
vi.mock('@/lib/characterData', () => ({ updateCharacterDoc: vi.fn() }));

import {
  createDungeonRunDoc,
  getDungeonRunDoc,
  getActiveDungeonRun,
  updateDungeonRunProgress,
  finalizeDungeonRun,
} from '@/lib/dungeonData';
import { updateCharacterDoc } from '@/lib/characterData';
import { useDungeonStore } from '@/store/dungeonStore';
import { DUNGEON_TIERS } from '@/lib/gameLogic/dungeons';
import { CLASS_DEFINITIONS } from '@/lib/gameLogic/constants';
import { playerMaxHp } from '@/lib/gameLogic/combat';
import type { Character, DungeonRun } from '@/types';

const createDungeonRunDocMock = vi.mocked(createDungeonRunDoc);
const getDungeonRunDocMock = vi.mocked(getDungeonRunDoc);
const getActiveDungeonRunMock = vi.mocked(getActiveDungeonRun);
const updateDungeonRunProgressMock = vi.mocked(updateDungeonRunProgress);
const finalizeDungeonRunMock = vi.mocked(finalizeDungeonRun);
const updateCharacterDocMock = vi.mocked(updateCharacterDoc);

function baseCharacter(overrides: Partial<Character> = {}): Character {
  const classDef = CLASS_DEFINITIONS.warrior;
  const stats = { ...classDef.startingStats };
  return {
    uid: 'uid1',
    name: 'Hero',
    class: 'warrior',
    level: 5,
    xp: 0,
    xpToNextLevel: 200,
    gold: 1000,
    stats,
    equippedGear: { weapon: null, armor: null, accessory: null },
    createdAt: 1_700_000_000_000,
    currentHp: playerMaxHp({ stats, equippedGear: { weapon: null, armor: null, accessory: null } }),
    currentStamina: 50,
    currentMagic: 20,
    dungeonRunsToday: { date: '2026-05-23', count: 0, legendaryUsed: false },
    ...overrides,
  } as Character;
}

function baseRun(overrides: Partial<DungeonRun> = {}): DungeonRun {
  return {
    id: 'run1',
    uid: 'uid1',
    tierId: 'goblin-caves',
    weekSeed: 12345,
    status: 'active',
    currentRoom: 0,
    rooms: [],
    currentHp: 50,
    currentStamina: 40,
    currentMagic: 20,
    legendaryEligible: true,
    cumulativeXp: 0,
    cumulativeGold: 0,
    allDroppedItems: [],
    startedAt: Date.now(),
    completedAt: null,
    ...overrides,
  } as DungeonRun;
}

beforeEach(() => {
  vi.clearAllMocks();
  useDungeonStore.setState({ activeRun: null, loading: false, error: null });
});

describe('dungeonStore.fetchActiveRun', () => {
  it('loads the active run', async () => {
    const run = baseRun();
    getActiveDungeonRunMock.mockResolvedValue(run);
    await useDungeonStore.getState().fetchActiveRun('uid1');
    expect(useDungeonStore.getState().activeRun).toEqual(run);
    expect(useDungeonStore.getState().loading).toBe(false);
  });

  it('handles no active run', async () => {
    getActiveDungeonRunMock.mockResolvedValue(null);
    await useDungeonStore.getState().fetchActiveRun('uid1');
    expect(useDungeonStore.getState().activeRun).toBeNull();
  });

  it('quietly finalizes legacy claimed-but-unfinalized runs', async () => {
    const claimed = baseRun({ claimed: true });
    getActiveDungeonRunMock.mockResolvedValue(claimed);
    await useDungeonStore.getState().fetchActiveRun('uid1');
    expect(finalizeDungeonRunMock).toHaveBeenCalledWith('run1', 'completed');
    expect(useDungeonStore.getState().activeRun).toBeNull();
  });

  it('captures errors and sets error state', async () => {
    getActiveDungeonRunMock.mockRejectedValue(new Error('boom'));
    await useDungeonStore.getState().fetchActiveRun('uid1');
    expect(useDungeonStore.getState().error).toContain('dungeon');
    expect(useDungeonStore.getState().loading).toBe(false);
  });
});

describe('dungeonStore.startRun — gating', () => {
  it('refuses when HP is below 50% of max', async () => {
    const ch = baseCharacter({ currentHp: 5 });
    const id = await useDungeonStore.getState().startRun('goblin-caves', ch);
    expect(id).toBeNull();
    expect(createDungeonRunDocMock).not.toHaveBeenCalled();
  });

  it('refuses when gold is below tier entry fee', async () => {
    const ch = baseCharacter({ gold: 0 });
    const id = await useDungeonStore.getState().startRun('goblin-caves', ch);
    expect(id).toBeNull();
  });

  it('refuses when daily limit reached', async () => {
    const ch = baseCharacter({
      dungeonRunsToday: { date: '2026-05-23', count: 99, legendaryUsed: false },
    });
    const id = await useDungeonStore.getState().startRun('goblin-caves', ch);
    expect(id).toBeNull();
  });

  it('creates a new run and deducts entry fee when eligible', async () => {
    const ch = baseCharacter();
    createDungeonRunDocMock.mockResolvedValue('newrunid');
    getDungeonRunDocMock.mockResolvedValue(baseRun({ id: 'newrunid' }));
    const id = await useDungeonStore.getState().startRun('goblin-caves', ch);
    expect(id).toBe('newrunid');
    expect(createDungeonRunDocMock).toHaveBeenCalled();
    expect(updateCharacterDocMock).toHaveBeenCalledWith(
      'uid1',
      expect.objectContaining({
        gold: ch.gold - DUNGEON_TIERS['goblin-caves'].entryFee,
        activeDungeonRunId: 'newrunid',
      }),
    );
  });

  it('sets error state on createDungeonRunDoc failure', async () => {
    const ch = baseCharacter();
    createDungeonRunDocMock.mockRejectedValue(new Error('write failed'));
    const id = await useDungeonStore.getState().startRun('goblin-caves', ch);
    expect(id).toBeNull();
    expect(useDungeonStore.getState().error).toContain('dungeon');
  });
});

describe('dungeonStore.advanceRoom', () => {
  it('no-ops when no active run', async () => {
    await useDungeonStore.getState().advanceRoom({
      clearedRooms: [],
      newHp: 40,
      newStamina: 30,
      newMagic: 15,
      xpEarned: 50,
      goldEarned: 25,
      itemsDropped: [],
    });
    expect(updateDungeonRunProgressMock).not.toHaveBeenCalled();
  });

  it('accumulates xp/gold/items and bumps currentRoom', async () => {
    useDungeonStore.setState({
      activeRun: baseRun({
        currentRoom: 1,
        cumulativeXp: 100,
        cumulativeGold: 50,
        allDroppedItems: ['existing'],
      }),
    });
    await useDungeonStore.getState().advanceRoom({
      clearedRooms: [],
      newHp: 40,
      newStamina: 30,
      newMagic: 15,
      xpEarned: 50,
      goldEarned: 25,
      itemsDropped: ['new-item'],
    });

    expect(updateDungeonRunProgressMock).toHaveBeenCalledWith(
      'run1',
      expect.objectContaining({
        currentRoom: 2,
        cumulativeXp: 150,
        cumulativeGold: 75,
        allDroppedItems: ['existing', 'new-item'],
        currentHp: 40,
      }),
    );
    const updated = useDungeonStore.getState().activeRun!;
    expect(updated.currentRoom).toBe(2);
    expect(updated.cumulativeXp).toBe(150);
  });
});

describe('dungeonStore.completeRun', () => {
  it('no-ops when no active run', async () => {
    await useDungeonStore.getState().completeRun('uid1', false);
    expect(finalizeDungeonRunMock).not.toHaveBeenCalled();
  });

  it('finalizes an active run and clears active run', async () => {
    useDungeonStore.setState({ activeRun: baseRun({ status: 'active' }) });
    await useDungeonStore.getState().completeRun('uid1', false);
    expect(finalizeDungeonRunMock).toHaveBeenCalledWith('run1', 'completed');
    expect(updateCharacterDocMock).toHaveBeenCalledWith('uid1', { activeDungeonRunId: null });
    expect(useDungeonStore.getState().activeRun).toBeNull();
  });

  it('marks legendary used when flag is true', async () => {
    useDungeonStore.setState({ activeRun: baseRun({ status: 'active' }) });
    await useDungeonStore.getState().completeRun('uid1', true);
    expect(updateCharacterDocMock).toHaveBeenCalledWith(
      'uid1',
      expect.objectContaining({ 'dungeonRunsToday.legendaryUsed': true }),
    );
  });

  it('skips Firestore writes when CF already finalized the run', async () => {
    useDungeonStore.setState({ activeRun: baseRun({ status: 'completed' }) });
    await useDungeonStore.getState().completeRun('uid1', false);
    expect(finalizeDungeonRunMock).not.toHaveBeenCalled();
    expect(updateCharacterDocMock).not.toHaveBeenCalled();
    expect(useDungeonStore.getState().activeRun).toBeNull();
  });
});

describe('dungeonStore.abandonRun', () => {
  it('no-ops when no active run', async () => {
    await useDungeonStore.getState().abandonRun('uid1');
    expect(finalizeDungeonRunMock).not.toHaveBeenCalled();
  });

  it('finalizes as abandoned and clears active run', async () => {
    useDungeonStore.setState({ activeRun: baseRun({ status: 'active' }) });
    await useDungeonStore.getState().abandonRun('uid1');
    expect(finalizeDungeonRunMock).toHaveBeenCalledWith('run1', 'abandoned');
    expect(updateCharacterDocMock).toHaveBeenCalledWith('uid1', { activeDungeonRunId: null });
    expect(useDungeonStore.getState().activeRun).toBeNull();
  });

  it('still clears the character pointer when run is already non-active', async () => {
    useDungeonStore.setState({ activeRun: baseRun({ status: 'completed' }) });
    await useDungeonStore.getState().abandonRun('uid1');
    expect(finalizeDungeonRunMock).not.toHaveBeenCalled();
    expect(updateCharacterDocMock).toHaveBeenCalledWith('uid1', { activeDungeonRunId: null });
  });
});

describe('dungeonStore.clearError', () => {
  it('resets the error field to null', () => {
    useDungeonStore.setState({ error: 'boom' });
    useDungeonStore.getState().clearError();
    expect(useDungeonStore.getState().error).toBeNull();
  });
});

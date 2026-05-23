import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
vi.mock('@/lib/errors', () => ({ captureError: vi.fn() }));
vi.mock('@/lib/characterData', () => ({
  getCharacterDoc: vi.fn(),
  createCharacterDoc: vi.fn(),
  updateCharacterDoc: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ updateUserDisplayName: vi.fn() }));

import { getCharacterDoc, createCharacterDoc, updateCharacterDoc } from '@/lib/characterData';
import { updateUserDisplayName } from '@/lib/auth';
import { useCharacterStore } from '@/store/characterStore';
import { CLASS_DEFINITIONS, maxStatForLevel } from '@/lib/gameLogic/constants';
import type { Character } from '@/types';

const getCharacterDocMock = vi.mocked(getCharacterDoc);
const createCharacterDocMock = vi.mocked(createCharacterDoc);
const updateCharacterDocMock = vi.mocked(updateCharacterDoc);
const updateUserDisplayNameMock = vi.mocked(updateUserDisplayName);

function baseCharacter(overrides: Partial<Character> = {}): Character {
  const classDef = CLASS_DEFINITIONS.warrior;
  return {
    uid: 'uid1',
    name: 'Hero',
    class: 'warrior',
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    gold: 50,
    stats: { ...classDef.startingStats },
    equippedGear: { weapon: null, armor: null, accessory: null },
    createdAt: 1_700_000_000_000,
    ...overrides,
  } as Character;
}

beforeEach(() => {
  vi.clearAllMocks();
  useCharacterStore.setState({
    character: null,
    loading: false,
    error: null,
    lastFetchedAt: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('characterStore.fetchCharacter — TTL cache', () => {
  it('fetches from Firestore on first call', async () => {
    getCharacterDocMock.mockResolvedValue(baseCharacter());
    await useCharacterStore.getState().fetchCharacter('uid1');
    expect(getCharacterDocMock).toHaveBeenCalledTimes(1);
  });

  it('skips Firestore on second call within 30 s TTL', async () => {
    getCharacterDocMock.mockResolvedValue(baseCharacter());
    await useCharacterStore.getState().fetchCharacter('uid1');
    await useCharacterStore.getState().fetchCharacter('uid1');
    expect(getCharacterDocMock).toHaveBeenCalledTimes(1);
  });

  it('refetches when uid changes', async () => {
    getCharacterDocMock.mockResolvedValue(baseCharacter());
    await useCharacterStore.getState().fetchCharacter('uid1');
    await useCharacterStore.getState().fetchCharacter('uid2');
    expect(getCharacterDocMock).toHaveBeenCalledTimes(2);
  });

  it('refetches when force: true is passed', async () => {
    getCharacterDocMock.mockResolvedValue(baseCharacter());
    await useCharacterStore.getState().fetchCharacter('uid1');
    await useCharacterStore.getState().fetchCharacter('uid1', true);
    expect(getCharacterDocMock).toHaveBeenCalledTimes(2);
  });

  it('refetches after 30 s TTL expires', async () => {
    getCharacterDocMock.mockResolvedValue(baseCharacter());
    useCharacterStore.setState({
      character: baseCharacter(),
      lastFetchedAt: Date.now() - 31_000,
    });
    await useCharacterStore.getState().fetchCharacter('uid1');
    expect(getCharacterDocMock).toHaveBeenCalledTimes(1);
  });

  it('stores null when no character document exists', async () => {
    getCharacterDocMock.mockResolvedValue(null);
    await useCharacterStore.getState().fetchCharacter('uid1');
    expect(useCharacterStore.getState().character).toBeNull();
    expect(useCharacterStore.getState().loading).toBe(false);
  });

  it('captures errors and sets error state', async () => {
    getCharacterDocMock.mockRejectedValue(new Error('firestore down'));
    await useCharacterStore.getState().fetchCharacter('uid1');
    expect(useCharacterStore.getState().error).toBe('firestore down');
    expect(useCharacterStore.getState().loading).toBe(false);
  });

  it('backfills agility on legacy character docs missing the field', async () => {
    const legacy = baseCharacter();
    // Cast to mutate as legacy data
    (legacy.stats as unknown as Record<string, unknown>).agility = undefined;
    getCharacterDocMock.mockResolvedValue(legacy);
    await useCharacterStore.getState().fetchCharacter('uid1');
    const startingAgility = CLASS_DEFINITIONS.warrior.startingStats.agility;
    expect(useCharacterStore.getState().character?.stats.agility).toBe(startingAgility);
    expect(updateCharacterDocMock).toHaveBeenCalledWith('uid1', {
      'stats.agility': startingAgility,
    });
  });
});

describe('characterStore.createCharacter', () => {
  it('creates a character document with class starting stats and 50 starting gold', async () => {
    await useCharacterStore.getState().createCharacter('uid1', 'Hero', 'warrior');
    expect(createCharacterDocMock).toHaveBeenCalledTimes(1);
    const character = useCharacterStore.getState().character!;
    expect(character.uid).toBe('uid1');
    expect(character.name).toBe('Hero');
    expect(character.class).toBe('warrior');
    expect(character.level).toBe(1);
    expect(character.gold).toBe(50);
    expect(character.stats).toEqual(CLASS_DEFINITIONS.warrior.startingStats);
  });

  it('trims whitespace from the name', async () => {
    await useCharacterStore.getState().createCharacter('uid1', '  Hero  ', 'warrior');
    expect(useCharacterStore.getState().character?.name).toBe('Hero');
  });

  it('captures errors and sets error state', async () => {
    createCharacterDocMock.mockRejectedValue(new Error('write failed'));
    await useCharacterStore.getState().createCharacter('uid1', 'Hero', 'warrior');
    expect(useCharacterStore.getState().error).toBe('write failed');
  });
});

describe('characterStore.awardXpAndStats', () => {
  it('returns 0 and no-ops when no character is loaded', async () => {
    const result = await useCharacterStore.getState().awardXpAndStats(50, {});
    expect(result).toBe(0);
    expect(updateCharacterDocMock).not.toHaveBeenCalled();
  });

  it('awards XP without level-up below the threshold', async () => {
    useCharacterStore.setState({
      character: baseCharacter({ xp: 0, xpToNextLevel: 100, level: 1 }),
    });
    const levelsGained = await useCharacterStore.getState().awardXpAndStats(50, {});
    expect(levelsGained).toBe(0);
    expect(useCharacterStore.getState().character?.xp).toBe(50);
    expect(useCharacterStore.getState().character?.level).toBe(1);
  });

  it('awards level-up bonuses on threshold crossing', async () => {
    useCharacterStore.setState({
      character: baseCharacter({ xp: 90, xpToNextLevel: 100, level: 1 }),
    });
    const levelsGained = await useCharacterStore.getState().awardXpAndStats(50, {});
    expect(levelsGained).toBeGreaterThan(0);
    const ch = useCharacterStore.getState().character!;
    expect(ch.level).toBeGreaterThan(1);
    expect(ch.pendingStatPoints).toBeGreaterThan(0);
    // Level-up should restore HP/Stamina/Magic to new max
    expect(ch.currentHp).toBeGreaterThan(0);
    expect(ch.currentStamina).toBeGreaterThan(0);
  });

  it('caps stats at maxStatForLevel after level-up bonus health bump', async () => {
    const cap = maxStatForLevel(2);
    useCharacterStore.setState({
      character: baseCharacter({
        xp: 90,
        xpToNextLevel: 100,
        level: 1,
        stats: { strength: 5, defense: cap, wisdom: 5, agility: 5, stamina: 5, health: cap },
      }),
    });
    await useCharacterStore.getState().awardXpAndStats(50, {});
    const ch = useCharacterStore.getState().character!;
    expect(ch.stats.defense).toBeLessThanOrEqual(maxStatForLevel(ch.level));
    expect(ch.stats.health).toBeLessThanOrEqual(maxStatForLevel(ch.level));
  });
});

describe('characterStore.awardGold', () => {
  it('adds gold and persists', async () => {
    useCharacterStore.setState({ character: baseCharacter({ gold: 50 }) });
    await useCharacterStore.getState().awardGold(25);
    expect(useCharacterStore.getState().character?.gold).toBe(75);
    expect(updateCharacterDocMock).toHaveBeenCalledWith('uid1', { gold: 75 });
  });

  it('no-ops when no character is loaded', async () => {
    await useCharacterStore.getState().awardGold(25);
    expect(updateCharacterDocMock).not.toHaveBeenCalled();
  });

  it('supports negative amounts (gold spend)', async () => {
    useCharacterStore.setState({ character: baseCharacter({ gold: 50 }) });
    await useCharacterStore.getState().awardGold(-30);
    expect(useCharacterStore.getState().character?.gold).toBe(20);
  });
});

describe('characterStore.setHpLocal / updateCurrentHp', () => {
  it('setHpLocal updates state without Firestore write', () => {
    useCharacterStore.setState({ character: baseCharacter({ currentHp: 50 }) });
    useCharacterStore.getState().setHpLocal(35);
    expect(useCharacterStore.getState().character?.currentHp).toBe(35);
    expect(updateCharacterDocMock).not.toHaveBeenCalled();
  });

  it('updateCurrentHp writes to Firestore', async () => {
    useCharacterStore.setState({ character: baseCharacter() });
    await useCharacterStore.getState().updateCurrentHp(40);
    expect(updateCharacterDocMock).toHaveBeenCalledWith('uid1', { currentHp: 40 });
    expect(useCharacterStore.getState().character?.currentHp).toBe(40);
  });

  it('setHpLocal no-ops when no character', () => {
    useCharacterStore.getState().setHpLocal(40);
    expect(useCharacterStore.getState().character).toBeNull();
  });
});

describe('characterStore.allocateStatPoint', () => {
  it('decrements pending and increments the chosen stat', async () => {
    useCharacterStore.setState({
      character: baseCharacter({
        pendingStatPoints: 3,
        stats: { strength: 5, defense: 5, wisdom: 5, agility: 5, stamina: 5, health: 5 },
      }),
    });
    await useCharacterStore.getState().allocateStatPoint('strength');
    const ch = useCharacterStore.getState().character!;
    expect(ch.pendingStatPoints).toBe(2);
    expect(ch.stats.strength).toBe(6);
  });

  it('no-ops when pendingStatPoints is 0', async () => {
    useCharacterStore.setState({
      character: baseCharacter({ pendingStatPoints: 0 }),
    });
    await useCharacterStore.getState().allocateStatPoint('strength');
    expect(updateCharacterDocMock).not.toHaveBeenCalled();
  });

  it('caps secondary stats at maxStatForLevel(level)', async () => {
    const cap = maxStatForLevel(1);
    useCharacterStore.setState({
      character: baseCharacter({
        pendingStatPoints: 1,
        stats: { strength: 5, defense: 5, wisdom: 5, agility: 5, stamina: cap, health: 5 },
      }),
    });
    await useCharacterStore.getState().allocateStatPoint('stamina');
    expect(useCharacterStore.getState().character?.stats.stamina).toBe(cap);
  });
});

describe('characterStore.resetCharacter', () => {
  it('resets level, xp and stats to class starting values', async () => {
    useCharacterStore.setState({
      character: baseCharacter({ level: 5, xp: 500, gold: 200 }),
    });
    await useCharacterStore.getState().resetCharacter();
    const ch = useCharacterStore.getState().character!;
    expect(ch.level).toBe(1);
    expect(ch.xp).toBe(0);
    expect(ch.stats).toEqual(CLASS_DEFINITIONS.warrior.startingStats);
    // Gold is intentionally NOT reset (death penalty resets level/xp only).
    expect(ch.gold).toBe(200);
  });

  it('no-ops when no character is loaded', async () => {
    await useCharacterStore.getState().resetCharacter();
    expect(updateCharacterDocMock).not.toHaveBeenCalled();
  });
});

describe('characterStore.applyMasteryLocal', () => {
  it('updates mastery count without milestone hit', () => {
    useCharacterStore.setState({
      character: baseCharacter({ masteryCounts: { run: 5 } }),
    });
    useCharacterStore.getState().applyMasteryLocal('run', 6, false);
    expect(useCharacterStore.getState().character?.masteryCounts?.run).toBe(6);
  });

  it('increments linked stat on milestone hit', () => {
    const base = baseCharacter({
      stats: { strength: 5, defense: 5, wisdom: 5, agility: 5, stamina: 5, health: 5 },
      masteryCounts: { run: 9 },
    });
    useCharacterStore.setState({ character: base });
    useCharacterStore.getState().applyMasteryLocal('run', 10, true);
    const ch = useCharacterStore.getState().character!;
    expect(ch.masteryCounts?.run).toBe(10);
    // 'run' is linked to agility in MASTERY_CONFIG
    expect(ch.stats.agility).toBe(6);
  });
});

describe('characterStore.applyRestoreLocal', () => {
  it.each([
    ['hp' as const, 'currentHp'],
    ['stamina' as const, 'currentStamina'],
    ['magic' as const, 'currentMagic'],
  ])('updates %s', (resource, field) => {
    useCharacterStore.setState({ character: baseCharacter() });
    useCharacterStore.getState().applyRestoreLocal(resource, 42);
    expect(useCharacterStore.getState().character?.[field as keyof Character]).toBe(42);
  });

  it('no-ops when no character is loaded', () => {
    useCharacterStore.getState().applyRestoreLocal('hp', 50);
    expect(useCharacterStore.getState().character).toBeNull();
  });
});

describe('characterStore.chooseSubclass', () => {
  it('refuses when below level 10', async () => {
    useCharacterStore.setState({ character: baseCharacter({ level: 9 }) });
    await useCharacterStore.getState().chooseSubclass('berserker');
    expect(updateCharacterDocMock).not.toHaveBeenCalled();
    expect(useCharacterStore.getState().character?.subclass).toBeUndefined();
  });

  it('refuses when subclass already chosen', async () => {
    useCharacterStore.setState({
      character: baseCharacter({ level: 12, subclass: 'berserker' }),
    });
    await useCharacterStore.getState().chooseSubclass('paladin');
    expect(updateCharacterDocMock).not.toHaveBeenCalled();
    expect(useCharacterStore.getState().character?.subclass).toBe('berserker');
  });

  it('persists the chosen subclass when eligible', async () => {
    useCharacterStore.setState({ character: baseCharacter({ level: 10 }) });
    await useCharacterStore.getState().chooseSubclass('berserker');
    expect(updateCharacterDocMock).toHaveBeenCalledWith('uid1', { subclass: 'berserker' });
    expect(useCharacterStore.getState().character?.subclass).toBe('berserker');
  });
});

describe('characterStore.updateMonsterPity', () => {
  it('resets to 0 on legendary drop', async () => {
    useCharacterStore.setState({
      character: baseCharacter({ legendaryDryStreak: { 'goblin-scout': 7 } }),
    });
    await useCharacterStore.getState().updateMonsterPity('goblin-scout', true);
    expect(useCharacterStore.getState().character?.legendaryDryStreak?.['goblin-scout']).toBe(0);
  });

  it('increments by 1 on no legendary drop', async () => {
    useCharacterStore.setState({
      character: baseCharacter({ legendaryDryStreak: { 'goblin-scout': 3 } }),
    });
    await useCharacterStore.getState().updateMonsterPity('goblin-scout', false);
    expect(useCharacterStore.getState().character?.legendaryDryStreak?.['goblin-scout']).toBe(4);
  });

  it('starts at 1 when monster has no prior entry', async () => {
    useCharacterStore.setState({
      character: baseCharacter({ legendaryDryStreak: {} }),
    });
    await useCharacterStore.getState().updateMonsterPity('goblin-scout', false);
    expect(useCharacterStore.getState().character?.legendaryDryStreak?.['goblin-scout']).toBe(1);
  });
});

describe('characterStore.updateName', () => {
  it('writes the new name to Firestore and Auth and updates local state', async () => {
    useCharacterStore.setState({ character: baseCharacter({ name: 'Old' }) });
    await useCharacterStore.getState().updateName('uid1', 'New');
    expect(updateCharacterDocMock).toHaveBeenCalledWith('uid1', { name: 'New' });
    expect(updateUserDisplayNameMock).toHaveBeenCalledWith('New');
    expect(useCharacterStore.getState().character?.name).toBe('New');
  });

  it('leaves null character untouched (no crash)', async () => {
    await useCharacterStore.getState().updateName('uid1', 'New');
    expect(useCharacterStore.getState().character).toBeNull();
  });
});

describe('characterStore.clear', () => {
  it('wipes character, error and lastFetchedAt', () => {
    useCharacterStore.setState({
      character: baseCharacter(),
      error: 'old',
      lastFetchedAt: Date.now(),
    });
    useCharacterStore.getState().clear();
    const s = useCharacterStore.getState();
    expect(s.character).toBeNull();
    expect(s.error).toBeNull();
    expect(s.lastFetchedAt).toBeNull();
  });
});

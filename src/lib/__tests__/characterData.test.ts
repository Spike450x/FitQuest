import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

import { normalizeCharacter } from '../characterData';
import { CLASS_DEFINITIONS } from '@/lib/gameLogic/constants';

describe('normalizeCharacter', () => {
  const valid = {
    name: 'Hero',
    class: 'warrior',
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    gold: 50,
    stats: {
      strength: 5,
      defense: 5,
      wisdom: 5,
      agility: 5,
      stamina: 5,
      health: 5,
      spirit: 5,
    },
    equippedGear: { weapon: null, armor: null, accessory: null },
    createdAt: 1_700_000_000_000,
  };

  it('attaches uid to the returned object', () => {
    expect(normalizeCharacter('uid1', valid).uid).toBe('uid1');
  });

  it('throws a descriptive error when a required field is missing', () => {
    const broken = { ...valid } as Record<string, unknown>;
    delete broken.level;
    expect(() => normalizeCharacter('uid1', broken)).toThrow(/"level"/);
  });

  it('throws when the document is empty', () => {
    expect(() => normalizeCharacter('uid1', {})).toThrow();
  });

  it('defaults pendingStatPoints to 0 when absent', () => {
    expect(normalizeCharacter('uid1', valid).pendingStatPoints).toBe(0);
  });

  it('preserves pendingStatPoints when present', () => {
    expect(normalizeCharacter('uid1', { ...valid, pendingStatPoints: 5 }).pendingStatPoints).toBe(
      5,
    );
  });

  it('defaults masteryCounts to an empty object', () => {
    expect(normalizeCharacter('uid1', valid).masteryCounts).toEqual({});
  });

  it('preserves an existing masteryCounts map', () => {
    const counts = { run: 5, workout: 3 };
    expect(normalizeCharacter('uid1', { ...valid, masteryCounts: counts }).masteryCounts).toEqual(
      counts,
    );
  });

  it('defaults legendaryDryStreak to an empty object', () => {
    expect(normalizeCharacter('uid1', valid).legendaryDryStreak).toEqual({});
  });

  it('preserves unknown extra fields (forward compat)', () => {
    const result = normalizeCharacter('uid1', { ...valid, futureField: 'x' });
    expect((result as unknown as Record<string, unknown>).futureField).toBe('x');
  });

  it('backfills agility from class starting stats when missing', () => {
    const legacy = {
      ...valid,
      stats: { strength: 5, defense: 5, wisdom: 5, stamina: 5, health: 5, spirit: 5 },
    };
    expect(normalizeCharacter('uid1', legacy).stats.agility).toBe(
      CLASS_DEFINITIONS.warrior.startingStats.agility,
    );
  });

  it('backfills spirit from class starting stats when missing', () => {
    const legacy = {
      ...valid,
      stats: { strength: 5, defense: 5, wisdom: 5, agility: 5, stamina: 5, health: 5 },
    };
    expect(normalizeCharacter('uid1', legacy).stats.spirit).toBe(
      CLASS_DEFINITIONS.warrior.startingStats.spirit,
    );
  });

  it('preserves existing spirit and agility values', () => {
    const result = normalizeCharacter('uid1', {
      ...valid,
      stats: { ...valid.stats, agility: 42, spirit: 17 },
    });
    expect(result.stats.agility).toBe(42);
    expect(result.stats.spirit).toBe(17);
  });

  it('preserves an explicit zero for spirit and agility (in-check, not ??)', () => {
    // Regression guard: if a future class ships with spirit: 0 (or a player
    // ever zeroes a stat), the backfill must respect the stored 0 rather than
    // silently re-applying the class default. Switching from `??` to an `in`
    // check is what makes this safe.
    const result = normalizeCharacter('uid1', {
      ...valid,
      stats: { ...valid.stats, agility: 0, spirit: 0 },
    });
    expect(result.stats.agility).toBe(0);
    expect(result.stats.spirit).toBe(0);
  });
});

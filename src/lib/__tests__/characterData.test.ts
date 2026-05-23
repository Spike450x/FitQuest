import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

import { normalizeCharacter } from '../characterData';

describe('normalizeCharacter', () => {
  const valid = {
    name: 'Hero',
    class: 'warrior',
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    gold: 50,
    stats: { strength: 5, defense: 5, wisdom: 5, agility: 5, stamina: 5, health: 5 },
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
});

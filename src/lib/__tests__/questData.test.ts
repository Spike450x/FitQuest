import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}));

import { normalizeActiveQuest } from '../questData';

describe('normalizeActiveQuest', () => {
  const valid = {
    uid: 'uid1',
    questDefId: 'q1',
    progress: 5,
    completedAt: 1_700_000_000_000,
    claimedAt: 1_700_100_000_000,
    expiresAt: 1_700_200_000_000,
    rewards: { xp: 100, gold: 50 },
  };

  it('attaches id to the returned object', () => {
    expect(normalizeActiveQuest('q-doc', valid).id).toBe('q-doc');
  });

  it('preserves all existing fields', () => {
    const q = normalizeActiveQuest('q-doc', valid);
    expect(q.uid).toBe('uid1');
    expect(q.questDefId).toBe('q1');
    expect(q.progress).toBe(5);
    expect(q.completedAt).toBe(1_700_000_000_000);
    expect(q.claimedAt).toBe(1_700_100_000_000);
  });

  it('defaults progress to 0 when absent', () => {
    const { progress: _, ...rest } = valid;
    expect(normalizeActiveQuest('q-doc', rest).progress).toBe(0);
  });

  it('defaults completedAt to null when absent', () => {
    const { completedAt: _, ...rest } = valid;
    expect(normalizeActiveQuest('q-doc', rest).completedAt).toBeNull();
  });

  it('defaults claimedAt to null when absent', () => {
    const { claimedAt: _, ...rest } = valid;
    expect(normalizeActiveQuest('q-doc', rest).claimedAt).toBeNull();
  });

  it('preserves unknown extra fields (forward compat)', () => {
    const result = normalizeActiveQuest('q-doc', { ...valid, customField: 'x' });
    expect((result as unknown as Record<string, unknown>).customField).toBe('x');
  });
});

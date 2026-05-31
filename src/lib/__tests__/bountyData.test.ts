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

import { normalizeActiveBounty } from '../bountyData';

describe('normalizeActiveBounty', () => {
  const valid = {
    uid: 'uid1',
    bountyDefId: 'bounty-run-3',
    progress: 2,
    completedAt: 1_700_000_000_000,
    claimedAt: 1_700_100_000_000,
    expiresAt: 1_700_200_000_000,
    rewards: { reputation: 45 },
  };

  it('attaches id to the returned object', () => {
    expect(normalizeActiveBounty('b-doc', valid).id).toBe('b-doc');
  });

  it('preserves all existing fields', () => {
    const b = normalizeActiveBounty('b-doc', valid);
    expect(b.uid).toBe('uid1');
    expect(b.bountyDefId).toBe('bounty-run-3');
    expect(b.progress).toBe(2);
    expect(b.completedAt).toBe(1_700_000_000_000);
    expect(b.claimedAt).toBe(1_700_100_000_000);
    expect(b.rewards.reputation).toBe(45);
  });

  it('defaults progress to 0 when absent', () => {
    const { progress: _, ...rest } = valid;
    expect(normalizeActiveBounty('b-doc', rest).progress).toBe(0);
  });

  it('defaults completedAt and claimedAt to null when absent', () => {
    const { completedAt: _c, claimedAt: _cl, ...rest } = valid;
    const b = normalizeActiveBounty('b-doc', rest);
    expect(b.completedAt).toBeNull();
    expect(b.claimedAt).toBeNull();
  });
});

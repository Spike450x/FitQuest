import { vi, describe, it, expect } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));

import {
  normalizeActivityLog,
  normalizeActiveQuest,
  normalizeInventoryItem,
} from '@/lib/fetchPlayerData';

describe('normalizeActivityLog', () => {
  const base = {
    uid: 'user1',
    type: 'run',
    data: { amount: 5, unit: 'km' },
    statGains: {},
    xpGained: 50,
    loggedAt: 1_700_000_000_000,
    rewardEligible: true,
  };

  it('returns the document id in the id field', () => {
    const result = normalizeActivityLog('doc_abc', base);
    expect(result.id).toBe('doc_abc');
  });

  it('preserves all existing fields', () => {
    const result = normalizeActivityLog('doc_abc', base);
    expect(result.uid).toBe('user1');
    expect(result.xpGained).toBe(50);
    expect(result.loggedAt).toBe(1_700_000_000_000);
  });

  it('defaults rewardEligible to true when field is absent', () => {
    const { rewardEligible: _, ...withoutField } = base;
    const result = normalizeActivityLog('doc_abc', withoutField);
    expect(result.rewardEligible).toBe(true);
  });

  it('preserves rewardEligible: false from existing docs', () => {
    const result = normalizeActivityLog('doc_abc', { ...base, rewardEligible: false });
    expect(result.rewardEligible).toBe(false);
  });

  it('passes through unknown extra fields (forward compat)', () => {
    const result = normalizeActivityLog('doc_abc', { ...base, newField: 'future' });
    expect((result as unknown as Record<string, unknown>).newField).toBe('future');
  });
});

describe('normalizeActiveQuest', () => {
  const base = {
    uid: 'user1',
    questDefId: 'quest_run_5k',
    progress: 3,
    completedAt: null,
    claimedAt: null,
    expiresAt: 1_700_100_000_000,
    rewards: { xp: 50, gold: 20 },
  };

  it('returns the document id in the id field', () => {
    const result = normalizeActiveQuest('quest_doc', base);
    expect(result.id).toBe('quest_doc');
  });

  it('preserves existing progress, completedAt, and claimedAt', () => {
    const result = normalizeActiveQuest('quest_doc', {
      ...base,
      progress: 10,
      completedAt: 1_700_000_000_000,
      claimedAt: 1_700_000_001_000,
    });
    expect(result.progress).toBe(10);
    expect(result.completedAt).toBe(1_700_000_000_000);
    expect(result.claimedAt).toBe(1_700_000_001_000);
  });

  it('defaults progress to 0 when absent', () => {
    const { progress: _, ...withoutProgress } = base;
    const result = normalizeActiveQuest('quest_doc', withoutProgress);
    expect(result.progress).toBe(0);
  });

  it('defaults completedAt to null when absent', () => {
    const { completedAt: _, ...withoutCompleted } = base;
    const result = normalizeActiveQuest('quest_doc', withoutCompleted);
    expect(result.completedAt).toBeNull();
  });

  it('defaults claimedAt to null when absent', () => {
    const { claimedAt: _, ...withoutClaimed } = base;
    const result = normalizeActiveQuest('quest_doc', withoutClaimed);
    expect(result.claimedAt).toBeNull();
  });

  it('passes through rewardedXp when present', () => {
    const result = normalizeActiveQuest('quest_doc', { ...base, rewardedXp: 75 });
    expect(result.rewardedXp).toBe(75);
  });

  it('leaves rewardedXp undefined when absent', () => {
    const result = normalizeActiveQuest('quest_doc', base);
    expect(result.rewardedXp).toBeUndefined();
  });

  it('passes through rewardedGold when present', () => {
    const result = normalizeActiveQuest('quest_doc', { ...base, rewardedGold: 30 });
    expect(result.rewardedGold).toBe(30);
  });
});

describe('normalizeInventoryItem', () => {
  const base = {
    uid: 'user1',
    itemDefId: 'iron_sword',
    quantity: 2,
    equipped: true,
    acquiredAt: 1_700_000_000_000,
  };

  it('returns the document id in the id field', () => {
    const result = normalizeInventoryItem('inv_doc', base);
    expect(result.id).toBe('inv_doc');
  });

  it('preserves all existing fields', () => {
    const result = normalizeInventoryItem('inv_doc', base);
    expect(result.itemDefId).toBe('iron_sword');
    expect(result.quantity).toBe(2);
    expect(result.equipped).toBe(true);
    expect(result.acquiredAt).toBe(1_700_000_000_000);
  });

  it('defaults quantity to 1 when absent', () => {
    const { quantity: _, ...withoutQty } = base;
    const result = normalizeInventoryItem('inv_doc', withoutQty);
    expect(result.quantity).toBe(1);
  });

  it('defaults equipped to false when absent', () => {
    const { equipped: _, ...withoutEquipped } = base;
    const result = normalizeInventoryItem('inv_doc', withoutEquipped);
    expect(result.equipped).toBe(false);
  });
});

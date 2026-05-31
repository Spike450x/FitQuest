import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
vi.mock('@/lib/errors', () => ({ captureError: vi.fn() }));
vi.mock('@/lib/fetchPlayerData', () => ({
  fetchActiveBounties: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/bountyData', () => ({
  addActiveBountyDoc: vi.fn().mockResolvedValue('bounty-doc-id'),
  updateActiveBountyDoc: vi.fn(),
}));

const applyCharacterPatchMock = vi.fn();
const awardXpAndStatsMock = vi.fn();
const awardGoldMock = vi.fn();
let mockCharacter: Record<string, unknown> | null = null;

vi.mock('@/store/characterStore', () => ({
  useCharacterStore: {
    getState: vi.fn(() => ({
      character: mockCharacter,
      applyCharacterPatch: applyCharacterPatchMock,
      awardXpAndStats: awardXpAndStatsMock,
      awardGold: awardGoldMock,
    })),
    setState: vi.fn(),
  },
}));

import { fetchActiveBounties } from '@/lib/fetchPlayerData';
import { addActiveBountyDoc, updateActiveBountyDoc } from '@/lib/bountyData';
import { useBountyStore } from '@/store/bountyStore';
import { BOUNTY_POOL, getBountyDef } from '@/lib/gameLogic/bounties';
import type { ActiveBounty } from '@/types';

const fetchActiveBountiesMock = vi.mocked(fetchActiveBounties);
const addActiveBountyDocMock = vi.mocked(addActiveBountyDoc);
const updateActiveBountyDocMock = vi.mocked(updateActiveBountyDoc);

function resetStore() {
  useBountyStore.setState({
    bounties: [],
    loading: false,
    error: null,
    _fetching: false,
    lastFetchedAt: null,
    lastFetchedUid: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchActiveBountiesMock.mockResolvedValue([]);
  addActiveBountyDocMock.mockResolvedValue('bounty-doc-id');
  mockCharacter = { uid: 'uid-1', spendableReputation: 100, lifetimeReputation: 100, gold: 500 };
  resetStore();
});

describe('bountyStore.fetchAndAssignBounties — TTL cache & assignment', () => {
  it('fetches from Firestore on first call', async () => {
    await useBountyStore.getState().fetchAndAssignBounties('uid1', '2026-01-01');
    expect(fetchActiveBountiesMock).toHaveBeenCalledTimes(1);
  });

  it('skips Firestore on a second call within the TTL window', async () => {
    await useBountyStore.getState().fetchAndAssignBounties('uid1', '2026-01-01');
    await useBountyStore.getState().fetchAndAssignBounties('uid1', '2026-01-01');
    expect(fetchActiveBountiesMock).toHaveBeenCalledTimes(1);
  });

  it('fetches again when the uid changes', async () => {
    await useBountyStore.getState().fetchAndAssignBounties('uid1', '2026-01-01');
    await useBountyStore.getState().fetchAndAssignBounties('uid2', '2026-01-01');
    expect(fetchActiveBountiesMock).toHaveBeenCalledTimes(2);
  });

  it('does not start a second in-flight fetch when _fetching is true', async () => {
    useBountyStore.setState({ _fetching: true, lastFetchedAt: null });
    await useBountyStore.getState().fetchAndAssignBounties('uid1', '2026-01-01');
    expect(fetchActiveBountiesMock).not.toHaveBeenCalled();
  });

  it('assigns 3 fresh bounties from the pool when none are active', async () => {
    await useBountyStore.getState().fetchAndAssignBounties('uid1', '2026-01-01');
    expect(addActiveBountyDocMock).toHaveBeenCalledTimes(3);
    const { bounties } = useBountyStore.getState();
    expect(bounties).toHaveLength(3);
    for (const b of bounties) expect(getBountyDef(b.bountyDefId)).toBeDefined();
  });

  it('does not reassign when active bounties already exist', async () => {
    fetchActiveBountiesMock.mockResolvedValue([
      {
        id: 'existing',
        uid: 'uid1',
        bountyDefId: BOUNTY_POOL[0].id,
        progress: 0,
        completedAt: null,
        claimedAt: null,
        expiresAt: Date.now() + 3_600_000,
        rewards: BOUNTY_POOL[0].rewards,
      },
    ]);
    await useBountyStore.getState().fetchAndAssignBounties('uid1', '2026-01-01');
    expect(addActiveBountyDocMock).not.toHaveBeenCalled();
    expect(useBountyStore.getState().bounties).toHaveLength(1);
  });
});

describe('bountyStore.clear', () => {
  it('resets TTL fields and allows a fresh fetch', async () => {
    await useBountyStore.getState().fetchAndAssignBounties('uid1', '2026-01-01');
    useBountyStore.getState().clear();
    const { lastFetchedAt, lastFetchedUid, bounties } = useBountyStore.getState();
    expect(lastFetchedAt).toBeNull();
    expect(lastFetchedUid).toBeNull();
    expect(bounties).toHaveLength(0);
    await useBountyStore.getState().fetchAndAssignBounties('uid1', '2026-01-01');
    expect(fetchActiveBountiesMock).toHaveBeenCalledTimes(2);
  });
});

describe('bountyStore.updateBountyProgress', () => {
  // Pick a single-target workout bounty for a deterministic fixture.
  const workoutDef = BOUNTY_POOL.find(
    (b) => b.requirement.activityType === 'workout' && !b.extraTargets,
  )!;

  function seedActive(progress = 0): ActiveBounty {
    const b: ActiveBounty = {
      id: 'b1',
      uid: 'uid1',
      bountyDefId: workoutDef.id,
      progress,
      completedAt: null,
      claimedAt: null,
      expiresAt: Date.now() + 3_600_000,
      rewards: workoutDef.rewards,
    };
    useBountyStore.setState({ bounties: [b] });
    return b;
  }

  it('advances a matching incomplete bounty and caps at the target', async () => {
    seedActive(0);
    await useBountyStore
      .getState()
      .updateBountyProgress('uid1', 'workout', workoutDef.requirement.target + 100);
    const b = useBountyStore.getState().bounties[0];
    expect(b.progress).toBe(workoutDef.requirement.target);
    expect(b.completedAt).not.toBeNull();
    expect(updateActiveBountyDocMock).toHaveBeenCalled();
  });

  it('ignores activity types that do not match any target', async () => {
    seedActive(0);
    await useBountyStore.getState().updateBountyProgress('uid1', 'sleep', 8);
    expect(useBountyStore.getState().bounties[0].progress).toBe(0);
    expect(updateActiveBountyDocMock).not.toHaveBeenCalled();
  });

  it('does not advance an already-completed bounty', async () => {
    const b = seedActive(workoutDef.requirement.target);
    useBountyStore.setState({ bounties: [{ ...b, completedAt: Date.now() }] });
    await useBountyStore.getState().updateBountyProgress('uid1', 'workout', 10);
    expect(updateActiveBountyDocMock).not.toHaveBeenCalled();
  });
});

describe('bountyStore.claimBounty', () => {
  const def = BOUNTY_POOL.find((b) => (b.kind ?? 'standing') === 'standing' && !b.extraTargets)!;
  const huntDef = BOUNTY_POOL.find((b) => b.kind === 'hunt')!;

  function seedCompleted(overrides: Partial<ActiveBounty> = {}): ActiveBounty {
    const b: ActiveBounty = {
      id: 'b1',
      uid: 'uid1',
      bountyDefId: def.id,
      progress: def.requirement.target,
      completedAt: Date.now(),
      claimedAt: null,
      expiresAt: Date.now() + 3_600_000,
      rewards: def.rewards,
      ...overrides,
    };
    useBountyStore.setState({ bounties: [b] });
    return b;
  }

  it('rejects a bounty that is not yet completed', async () => {
    seedCompleted({ completedAt: null });
    expect(await useBountyStore.getState().claimBounty('b1')).toBe(false);
  });

  it('rejects an already-claimed bounty', async () => {
    seedCompleted({ claimedAt: Date.now() });
    expect(await useBountyStore.getState().claimBounty('b1')).toBe(false);
  });

  it('grants reputation to both wallets and stamps the claim on the loot path', async () => {
    seedCompleted();
    const result = await useBountyStore.getState().claimBounty('b1', { path: 'loot' });
    expect(result).not.toBe(false);
    expect((result as { reputationAwarded: number }).reputationAwarded).toBe(
      def.rewards.reputation,
    );

    // Reputation flows to BOTH wallets via applyCharacterPatch.
    expect(applyCharacterPatchMock).toHaveBeenCalledWith({
      spendableReputation: 100 + def.rewards.reputation,
      lifetimeReputation: 100 + def.rewards.reputation,
    });

    // The bounty doc is stamped with claimedAt + rewardedReputation.
    expect(updateActiveBountyDocMock).toHaveBeenCalledWith(
      'b1',
      expect.objectContaining({ rewardedReputation: def.rewards.reputation }),
    );
    const b = useBountyStore.getState().bounties[0];
    expect(b.claimedAt).not.toBeNull();
    expect(b.rewardedReputation).toBe(def.rewards.reputation);
  });

  it('the fight path grants reputation + stamps combatWonAt, without XP/gold', async () => {
    seedCompleted({
      bountyDefId: huntDef.id,
      rewards: huntDef.rewards,
      combatMonsterId: 'goblin-scout',
    });
    const result = await useBountyStore.getState().claimBounty('b1', { path: 'fight' });
    expect(result).not.toBe(false);
    expect(result).toMatchObject({
      reputationAwarded: huntDef.rewards.reputation,
      xpAwarded: 0,
      goldAwarded: 0,
    });

    // Reputation to both wallets…
    expect(applyCharacterPatchMock).toHaveBeenCalledWith({
      spendableReputation: 100 + huntDef.rewards.reputation,
      lifetimeReputation: 100 + huntDef.rewards.reputation,
    });
    // …but the fight's XP/gold come from the CF on the hunt page, NOT here.
    expect(awardXpAndStatsMock).not.toHaveBeenCalled();
    expect(awardGoldMock).not.toHaveBeenCalled();

    // Stamps claimedAt + combatWonAt + rewardedReputation.
    expect(updateActiveBountyDocMock).toHaveBeenCalledWith(
      'b1',
      expect.objectContaining({ rewardedReputation: huntDef.rewards.reputation }),
    );
    const b = useBountyStore.getState().bounties[0];
    expect(b.claimedAt).not.toBeNull();
    expect(b.combatWonAt).not.toBeNull();
  });

  it('rejects the fight path on a bounty that is not yet completed', async () => {
    seedCompleted({ bountyDefId: huntDef.id, completedAt: null, combatMonsterId: 'goblin-scout' });
    expect(await useBountyStore.getState().claimBounty('b1', { path: 'fight' })).toBe(false);
    expect(applyCharacterPatchMock).not.toHaveBeenCalled();
  });
});

describe('bountyStore.fetchAndAssignBounties — hunt target pinning', () => {
  it('pins a resolvable combatMonsterId on every assigned hunt bounty', async () => {
    const { getBountyDef } = await import('@/lib/gameLogic/bounties');
    const { getMonsterById } = await import('@/lib/gameLogic/monsters');
    await useBountyStore.getState().fetchAndAssignBounties('uid1', '2026-03-03');
    const assigned = useBountyStore.getState().bounties;
    expect(assigned.length).toBeGreaterThan(0);
    let huntCount = 0;
    for (const b of assigned) {
      const d = getBountyDef(b.bountyDefId);
      if (d?.kind === 'hunt') {
        huntCount++;
        expect(b.combatMonsterId).toBeTruthy();
        expect(getMonsterById(b.combatMonsterId!)).toBeDefined();
        expect(b.combatWonAt).toBeNull();
      } else {
        expect(b.combatMonsterId).toBeUndefined();
      }
    }
    // The board is composed to be hunt-heavy.
    expect(huntCount).toBeGreaterThanOrEqual(1);
  });
});

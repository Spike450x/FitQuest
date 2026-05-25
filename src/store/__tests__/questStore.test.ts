import { vi, describe, it, expect, beforeEach } from 'vitest';

const DELETE_FIELD_SENTINEL = '__DELETE_FIELD_SENTINEL__';

vi.mock('firebase/firestore', () => ({
  deleteField: vi.fn(() => DELETE_FIELD_SENTINEL),
}));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
vi.mock('@/lib/errors', () => ({ captureError: vi.fn() }));
vi.mock('@/lib/characterData', () => ({ updateCharacterDoc: vi.fn() }));
vi.mock('@/lib/fetchPlayerData', () => ({
  fetchActiveQuests: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/questData', () => ({
  addActiveQuestDoc: vi.fn().mockResolvedValue('quest-doc-id'),
  updateActiveQuestDoc: vi.fn(),
}));
vi.mock('@/store/characterStore', () => ({
  useCharacterStore: {
    getState: vi.fn(() => ({ character: null })),
    setState: vi.fn(),
  },
}));

import { fetchActiveQuests } from '@/lib/fetchPlayerData';
import { updateActiveQuestDoc } from '@/lib/questData';
import { useQuestStore } from '@/store/questStore';
import { useCharacterStore } from '@/store/characterStore';
import { DAILY_QUEST_POOL } from '@/lib/gameLogic/quests';

const fetchActiveQuestsMock = vi.mocked(fetchActiveQuests);
const updateActiveQuestDocMock = vi.mocked(updateActiveQuestDoc);

beforeEach(() => {
  vi.clearAllMocks();
  fetchActiveQuestsMock.mockResolvedValue([]);
  useQuestStore.setState({
    quests: [],
    loading: false,
    error: null,
    _fetching: false,
    lastFetchedAt: null,
    lastFetchedUid: null,
  });
});

describe('questStore.fetchAndAssignQuests — TTL cache', () => {
  it('fetches from Firestore on first call', async () => {
    await useQuestStore.getState().fetchAndAssignQuests('uid1', '2026-01-01');
    expect(fetchActiveQuestsMock).toHaveBeenCalledTimes(1);
  });

  it('skips Firestore on second call within TTL window', async () => {
    await useQuestStore.getState().fetchAndAssignQuests('uid1', '2026-01-01');
    await useQuestStore.getState().fetchAndAssignQuests('uid1', '2026-01-01');
    expect(fetchActiveQuestsMock).toHaveBeenCalledTimes(1);
  });

  it('fetches again when uid changes (different user)', async () => {
    await useQuestStore.getState().fetchAndAssignQuests('uid1', '2026-01-01');
    await useQuestStore.getState().fetchAndAssignQuests('uid2', '2026-01-01');
    expect(fetchActiveQuestsMock).toHaveBeenCalledTimes(2);
  });

  it('fetches again after TTL expires', async () => {
    useQuestStore.setState({ lastFetchedAt: Date.now() - 31_000, lastFetchedUid: 'uid1' });
    await useQuestStore.getState().fetchAndAssignQuests('uid1', '2026-01-01');
    expect(fetchActiveQuestsMock).toHaveBeenCalledTimes(1);
  });

  it('stamps lastFetchedAt and lastFetchedUid after a successful fetch', async () => {
    const before = Date.now();
    await useQuestStore.getState().fetchAndAssignQuests('uid1', '2026-01-01');
    const { lastFetchedAt, lastFetchedUid } = useQuestStore.getState();
    expect(lastFetchedUid).toBe('uid1');
    expect(lastFetchedAt).toBeGreaterThanOrEqual(before);
  });

  it('does not start a second in-flight fetch when _fetching is true', async () => {
    // Mark as mid-fetch; TTL is null so the TTL guard doesn't apply.
    useQuestStore.setState({ _fetching: true, lastFetchedAt: null });
    await useQuestStore.getState().fetchAndAssignQuests('uid1', '2026-01-01');
    expect(fetchActiveQuestsMock).not.toHaveBeenCalled();
  });
});

describe('questStore.clear', () => {
  it('resets TTL fields', async () => {
    await useQuestStore.getState().fetchAndAssignQuests('uid1', '2026-01-01');
    useQuestStore.getState().clear();
    const { lastFetchedAt, lastFetchedUid } = useQuestStore.getState();
    expect(lastFetchedAt).toBeNull();
    expect(lastFetchedUid).toBeNull();
  });

  it('allows a fresh fetch after clear', async () => {
    await useQuestStore.getState().fetchAndAssignQuests('uid1', '2026-01-01');
    useQuestStore.getState().clear();
    await useQuestStore.getState().fetchAndAssignQuests('uid1', '2026-01-01');
    expect(fetchActiveQuestsMock).toHaveBeenCalledTimes(2);
  });
});

describe('questStore.rerollQuest — extraProgress payload (B1)', () => {
  beforeEach(() => {
    vi.mocked(useCharacterStore.getState).mockReturnValue({
      character: { uid: 'uid-1', gold: 1000 },
    } as unknown as ReturnType<typeof useCharacterStore.getState>);
  });

  it('sends deleteField() when the rolled quest has no extraTargets', async () => {
    // Source: has extraTargets; target: no extraTargets.
    const sourceDefId = 'daily-combo-run-sleep';
    const targetDefId = 'daily-run-1';
    const sourceQuestId = 'source-quest-id';

    const expiry = Date.now() + 24 * 3600 * 1000;
    const quests = DAILY_QUEST_POOL.filter((d) => d.id !== targetDefId).map((def, i) => ({
      id: def.id === sourceDefId ? sourceQuestId : `held-${i}`,
      uid: 'uid-1',
      questDefId: def.id,
      progress: 0,
      extraProgress: def.extraTargets ? {} : undefined,
      completedAt: null,
      claimedAt: null,
      expiresAt: expiry,
      rewards: def.rewards,
    }));
    useQuestStore.setState({ quests });

    const result = await useQuestStore.getState().rerollQuest(sourceQuestId);

    expect(result).toEqual({ newQuestDefId: targetDefId, cost: expect.any(Number) });
    expect(updateActiveQuestDocMock).toHaveBeenCalledWith(
      sourceQuestId,
      expect.objectContaining({
        questDefId: targetDefId,
        extraProgress: DELETE_FIELD_SENTINEL,
      }),
    );
  });

  it('sends {} when the rolled quest has extraTargets', async () => {
    const sourceDefId = 'daily-run-1';
    const targetDefId = 'daily-combo-workout-water';
    const sourceQuestId = 'source-quest-id';

    const expiry = Date.now() + 24 * 3600 * 1000;
    const quests = DAILY_QUEST_POOL.filter((d) => d.id !== targetDefId).map((def, i) => ({
      id: def.id === sourceDefId ? sourceQuestId : `held-${i}`,
      uid: 'uid-1',
      questDefId: def.id,
      progress: 0,
      extraProgress: def.extraTargets ? {} : undefined,
      completedAt: null,
      claimedAt: null,
      expiresAt: expiry,
      rewards: def.rewards,
    }));
    useQuestStore.setState({ quests });

    const result = await useQuestStore.getState().rerollQuest(sourceQuestId);

    expect(result).toEqual({ newQuestDefId: targetDefId, cost: expect.any(Number) });
    expect(updateActiveQuestDocMock).toHaveBeenCalledWith(
      sourceQuestId,
      expect.objectContaining({
        questDefId: targetDefId,
        extraProgress: {},
      }),
    );
  });
});

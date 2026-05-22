import { vi, describe, it, expect, beforeEach } from 'vitest';

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
  useCharacterStore: { getState: vi.fn(() => ({ character: null })) },
}));

import { fetchActiveQuests } from '@/lib/fetchPlayerData';
import { useQuestStore } from '@/store/questStore';

const fetchActiveQuestsMock = vi.mocked(fetchActiveQuests);

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

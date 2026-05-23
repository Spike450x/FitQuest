import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
vi.mock('@/lib/errors', () => ({ captureError: vi.fn() }));
vi.mock('@/lib/activityData', () => ({ fetchActivityLogs: vi.fn() }));
vi.mock('@/lib/combatData', () => ({ fetchRecentCombatLogs: vi.fn() }));

import { fetchActivityLogs } from '@/lib/activityData';
import { fetchRecentCombatLogs } from '@/lib/combatData';
import { useStatsStore } from '@/store/statsStore';

const fetchActivityLogsMock = vi.mocked(fetchActivityLogs);
const fetchRecentCombatLogsMock = vi.mocked(fetchRecentCombatLogs);

beforeEach(() => {
  vi.clearAllMocks();
  fetchActivityLogsMock.mockResolvedValue([]);
  fetchRecentCombatLogsMock.mockResolvedValue([]);
  useStatsStore.setState({
    activityLogs: [],
    combatLogs: [],
    loading: false,
    retrying: false,
    error: null,
    lastFetchedAt: null,
    lastFetchedUid: null,
  });
});

describe('statsStore.fetchStatsData — TTL cache', () => {
  it('fetches both activity + combat logs on first call', async () => {
    await useStatsStore.getState().fetchStatsData('uid1');
    expect(fetchActivityLogsMock).toHaveBeenCalledWith('uid1');
    expect(fetchRecentCombatLogsMock).toHaveBeenCalledWith('uid1', 1000);
  });

  it('skips fetch on second call within 30 s TTL', async () => {
    await useStatsStore.getState().fetchStatsData('uid1');
    await useStatsStore.getState().fetchStatsData('uid1');
    expect(fetchActivityLogsMock).toHaveBeenCalledTimes(1);
    expect(fetchRecentCombatLogsMock).toHaveBeenCalledTimes(1);
  });

  it('refetches when uid changes', async () => {
    await useStatsStore.getState().fetchStatsData('uid1');
    await useStatsStore.getState().fetchStatsData('uid2');
    expect(fetchActivityLogsMock).toHaveBeenCalledTimes(2);
  });

  it('refetches when force: true', async () => {
    await useStatsStore.getState().fetchStatsData('uid1');
    await useStatsStore.getState().fetchStatsData('uid1', true);
    expect(fetchActivityLogsMock).toHaveBeenCalledTimes(2);
  });

  it('refetches after TTL expires', async () => {
    useStatsStore.setState({ lastFetchedAt: Date.now() - 31_000, lastFetchedUid: 'uid1' });
    await useStatsStore.getState().fetchStatsData('uid1');
    expect(fetchActivityLogsMock).toHaveBeenCalledTimes(1);
  });

  it('stamps lastFetchedAt and lastFetchedUid after success', async () => {
    const before = Date.now();
    await useStatsStore.getState().fetchStatsData('uid1');
    const { lastFetchedAt, lastFetchedUid } = useStatsStore.getState();
    expect(lastFetchedUid).toBe('uid1');
    expect(lastFetchedAt).toBeGreaterThanOrEqual(before);
  });

  it('captures errors and exposes the message in state', async () => {
    fetchActivityLogsMock.mockRejectedValue(new Error('firestore down'));
    await useStatsStore.getState().fetchStatsData('uid1');
    expect(useStatsStore.getState().error).toBe('firestore down');
    expect(useStatsStore.getState().loading).toBe(false);
    expect(useStatsStore.getState().retrying).toBe(false);
  });

  it('returns the joined activity and combat logs in state', async () => {
    const aLogs = [{ id: 'a1' }, { id: 'a2' }] as ReturnType<
      typeof useStatsStore.getState
    >['activityLogs'];
    const cLogs = [{ id: 'c1' }] as ReturnType<typeof useStatsStore.getState>['combatLogs'];
    fetchActivityLogsMock.mockResolvedValue(aLogs);
    fetchRecentCombatLogsMock.mockResolvedValue(cLogs);
    await useStatsStore.getState().fetchStatsData('uid1');
    expect(useStatsStore.getState().activityLogs).toEqual(aLogs);
    expect(useStatsStore.getState().combatLogs).toEqual(cLogs);
  });
});

describe('statsStore.clear', () => {
  it('wipes all state to initial defaults', async () => {
    await useStatsStore.getState().fetchStatsData('uid1');
    useStatsStore.getState().clear();
    const s = useStatsStore.getState();
    expect(s.activityLogs).toEqual([]);
    expect(s.combatLogs).toEqual([]);
    expect(s.lastFetchedAt).toBeNull();
    expect(s.lastFetchedUid).toBeNull();
    expect(s.loading).toBe(false);
    expect(s.error).toBeNull();
  });

  it('allows a fresh fetch after clear', async () => {
    await useStatsStore.getState().fetchStatsData('uid1');
    useStatsStore.getState().clear();
    await useStatsStore.getState().fetchStatsData('uid1');
    expect(fetchActivityLogsMock).toHaveBeenCalledTimes(2);
  });
});

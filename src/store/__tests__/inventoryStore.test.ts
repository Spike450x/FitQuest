import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
vi.mock('@/lib/errors', () => ({ captureError: vi.fn() }));
vi.mock('@/lib/characterData', () => ({ updateCharacterDoc: vi.fn() }));
vi.mock('@/lib/inventoryData', () => ({
  fetchInventoryDocs: vi.fn().mockResolvedValue([]),
  addInventoryDoc: vi.fn(),
  updateInventoryDoc: vi.fn(),
  deleteInventoryDoc: vi.fn(),
  runBuyItemTransaction: vi.fn(),
}));
vi.mock('@/store/characterStore', () => ({
  useCharacterStore: { getState: vi.fn(() => ({ character: null })) },
}));

import { fetchInventoryDocs } from '@/lib/inventoryData';
import { useInventoryStore } from '@/store/inventoryStore';

const fetchInventoryDocsMock = vi.mocked(fetchInventoryDocs);

beforeEach(() => {
  vi.clearAllMocks();
  fetchInventoryDocsMock.mockResolvedValue([]);
  useInventoryStore.setState({
    items: [],
    loading: false,
    error: null,
    lastFetchedAt: null,
    lastFetchedUid: null,
  });
});

describe('inventoryStore.fetchInventory — TTL cache', () => {
  it('fetches from Firestore on first call', async () => {
    await useInventoryStore.getState().fetchInventory('uid1');
    expect(fetchInventoryDocsMock).toHaveBeenCalledTimes(1);
  });

  it('skips Firestore on second call within TTL window', async () => {
    await useInventoryStore.getState().fetchInventory('uid1');
    await useInventoryStore.getState().fetchInventory('uid1');
    expect(fetchInventoryDocsMock).toHaveBeenCalledTimes(1);
  });

  it('fetches again when uid changes (different user)', async () => {
    await useInventoryStore.getState().fetchInventory('uid1');
    await useInventoryStore.getState().fetchInventory('uid2');
    expect(fetchInventoryDocsMock).toHaveBeenCalledTimes(2);
  });

  it('fetches again when force: true is passed', async () => {
    await useInventoryStore.getState().fetchInventory('uid1');
    await useInventoryStore.getState().fetchInventory('uid1', true);
    expect(fetchInventoryDocsMock).toHaveBeenCalledTimes(2);
  });

  it('fetches again after TTL expires', async () => {
    useInventoryStore.setState({
      lastFetchedAt: Date.now() - 31_000,
      lastFetchedUid: 'uid1',
    });
    await useInventoryStore.getState().fetchInventory('uid1');
    expect(fetchInventoryDocsMock).toHaveBeenCalledTimes(1);
  });

  it('stamps lastFetchedAt and lastFetchedUid after a successful fetch', async () => {
    const before = Date.now();
    await useInventoryStore.getState().fetchInventory('uid1');
    const { lastFetchedAt, lastFetchedUid } = useInventoryStore.getState();
    expect(lastFetchedUid).toBe('uid1');
    expect(lastFetchedAt).toBeGreaterThanOrEqual(before);
  });
});

describe('inventoryStore.clear', () => {
  it('resets TTL fields', async () => {
    await useInventoryStore.getState().fetchInventory('uid1');
    useInventoryStore.getState().clear();
    const { lastFetchedAt, lastFetchedUid } = useInventoryStore.getState();
    expect(lastFetchedAt).toBeNull();
    expect(lastFetchedUid).toBeNull();
  });

  it('allows a fresh fetch after clear', async () => {
    await useInventoryStore.getState().fetchInventory('uid1');
    useInventoryStore.getState().clear();
    await useInventoryStore.getState().fetchInventory('uid1');
    expect(fetchInventoryDocsMock).toHaveBeenCalledTimes(2);
  });
});

import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
vi.mock('@/lib/errors', () => ({ captureError: vi.fn() }));
vi.mock('@/lib/characterData', () => ({ updateCharacterDoc: vi.fn() }));
vi.mock('firebase/firestore', () => ({
  deleteField: vi.fn(() => 'DELETE_SENTINEL'),
}));
vi.mock('@/lib/inventoryData', () => ({
  fetchInventoryDocs: vi.fn().mockResolvedValue([]),
  addInventoryDoc: vi.fn(),
  updateInventoryDoc: vi.fn().mockResolvedValue(undefined),
  deleteInventoryDoc: vi.fn(),
  runBuyItemTransaction: vi.fn(),
  normalizeInventoryItem: vi.fn(),
}));
vi.mock('@/store/characterStore', () => ({
  useCharacterStore: { getState: vi.fn(() => ({ character: null })) },
}));

import { fetchInventoryDocs, updateInventoryDoc } from '@/lib/inventoryData';
import { useInventoryStore } from '@/store/inventoryStore';
import { COMBAT } from '@/lib/gameLogic/constants';

const fetchInventoryDocsMock = vi.mocked(fetchInventoryDocs);
const updateInventoryDocMock = vi.mocked(updateInventoryDoc);

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

// ── Spell charge store actions ────────────────────────────────────────────────

const SPELL_ITEM = (id: string, charges?: number) => ({
  id,
  itemDefId: 'arcane-bolt', // any spell-type item
  quantity: 1,
  equipped: true,
  acquiredAt: 0,
  ...(charges !== undefined && { charges }),
});

// mock getItemById so spell type check works
vi.mock('@/lib/gameLogic/items', () => ({
  getItemById: vi.fn((id: string) => {
    if (id === 'arcane-bolt') return { type: 'spell', rarity: 'rare' };
    if (id === 'iron-sword') return { type: 'weapon', rarity: 'common' };
    return null;
  }),
  RARITY_BADGE: {},
}));

describe('inventoryStore.persistSpellChargeDecrements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateInventoryDocMock.mockResolvedValue(undefined);
  });

  it('no-ops when decrements is empty', async () => {
    await useInventoryStore.getState().persistSpellChargeDecrements({});
    expect(updateInventoryDocMock).not.toHaveBeenCalled();
  });

  it('writes remaining charges for each used spell', async () => {
    useInventoryStore.setState({ items: [SPELL_ITEM('inv1'), SPELL_ITEM('inv2')] });
    const MAX = COMBAT.SPELL_MAX_CHARGES;
    await useInventoryStore.getState().persistSpellChargeDecrements({ inv1: 1, inv2: 2 });
    expect(updateInventoryDocMock).toHaveBeenCalledWith('inv1', { charges: MAX - 1 });
    expect(updateInventoryDocMock).toHaveBeenCalledWith('inv2', { charges: MAX - 2 });
  });

  it('clamps charges to 0 when all charges are used', async () => {
    const MAX = COMBAT.SPELL_MAX_CHARGES;
    await useInventoryStore.getState().persistSpellChargeDecrements({ inv1: MAX + 1 });
    expect(updateInventoryDocMock).toHaveBeenCalledWith('inv1', { charges: 0 });
  });

  it('updates local store items after persisting', async () => {
    useInventoryStore.setState({ items: [SPELL_ITEM('inv1')] });
    const MAX = COMBAT.SPELL_MAX_CHARGES;
    await useInventoryStore.getState().persistSpellChargeDecrements({ inv1: 2 });
    const updated = useInventoryStore.getState().items.find((i) => i.id === 'inv1');
    expect(updated?.charges).toBe(MAX - 2);
  });

  it('skips items with 0 decrements', async () => {
    await useInventoryStore.getState().persistSpellChargeDecrements({ inv1: 0 });
    expect(updateInventoryDocMock).not.toHaveBeenCalled();
  });
});

describe('inventoryStore.replenishSpellCharges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateInventoryDocMock.mockResolvedValue(undefined);
  });

  it('no-ops when no spells have depleted charges', async () => {
    // Items with no charges field (all full) — nothing to replenish
    useInventoryStore.setState({ items: [SPELL_ITEM('inv1')] });
    await useInventoryStore.getState().replenishSpellCharges();
    expect(updateInventoryDocMock).not.toHaveBeenCalled();
  });

  it('calls updateInventoryDoc for each spell with a charges field', async () => {
    useInventoryStore.setState({ items: [SPELL_ITEM('inv1', 1), SPELL_ITEM('inv2', 0)] });
    await useInventoryStore.getState().replenishSpellCharges();
    expect(updateInventoryDocMock).toHaveBeenCalledTimes(2);
  });

  it('clears charges from local store items after replenishment', async () => {
    useInventoryStore.setState({ items: [SPELL_ITEM('inv1', 2)] });
    await useInventoryStore.getState().replenishSpellCharges();
    const updated = useInventoryStore.getState().items.find((i) => i.id === 'inv1');
    expect(updated?.charges).toBeUndefined();
  });

  it('does not touch non-spell items or fully-charged spells', async () => {
    const weaponItem = {
      id: 'weapon1',
      itemDefId: 'iron-sword',
      quantity: 1,
      equipped: true,
      acquiredAt: 0,
    };
    useInventoryStore.setState({
      items: [SPELL_ITEM('inv1'), weaponItem, SPELL_ITEM('inv2', 1)],
    });
    await useInventoryStore.getState().replenishSpellCharges();
    // Only inv2 (has charges: 1) should be updated; inv1 (no charges field) and weapon1 are skipped
    expect(updateInventoryDocMock).toHaveBeenCalledTimes(1);
    const weapon = useInventoryStore.getState().items.find((i) => i.id === 'weapon1');
    expect(weapon?.charges).toBeUndefined();
  });
});

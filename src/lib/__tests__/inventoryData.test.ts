import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  runTransaction: vi.fn(),
}));

import { normalizeInventoryItem } from '../inventoryData';

describe('normalizeInventoryItem', () => {
  const valid = {
    uid: 'uid1',
    itemDefId: 'iron-sword',
    quantity: 3,
    equipped: true,
    acquiredAt: 1_700_000_000_000,
  };

  it('attaches id to the returned object', () => {
    expect(normalizeInventoryItem('inv1', valid).id).toBe('inv1');
  });

  it('preserves existing fields', () => {
    const item = normalizeInventoryItem('inv1', valid);
    expect(item.itemDefId).toBe('iron-sword');
    expect(item.quantity).toBe(3);
    expect(item.equipped).toBe(true);
  });

  it('defaults quantity to 1 when absent', () => {
    const { quantity: _, ...rest } = valid;
    expect(normalizeInventoryItem('inv1', rest).quantity).toBe(1);
  });

  it('defaults equipped to false when absent', () => {
    const { equipped: _, ...rest } = valid;
    expect(normalizeInventoryItem('inv1', rest).equipped).toBe(false);
  });

  it('preserves unknown extra fields (forward compat)', () => {
    const result = normalizeInventoryItem('inv1', { ...valid, future: 'x' });
    expect((result as unknown as Record<string, unknown>).future).toBe('x');
  });

  it('handles quantity: 0 explicitly (not the default)', () => {
    expect(normalizeInventoryItem('inv1', { ...valid, quantity: 0 }).quantity).toBe(0);
  });
});

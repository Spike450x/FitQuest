import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { InventoryItem } from '@/types';

const INVENTORY = 'inventory';
const CHARACTERS = 'characters';

// CONTRACT: whenever a new optional field is added to InventoryItem, add a safe
// default here. See "Adding a post-MVP schema field" in docs/FIRESTORE.md.
export function normalizeInventoryItem(id: string, data: Record<string, unknown>): InventoryItem {
  return {
    ...data,
    id,
    quantity: (data.quantity as number | undefined) ?? 1,
    equipped: (data.equipped as boolean | undefined) ?? false,
  } as InventoryItem;
}

export async function fetchInventoryItems(uid: string): Promise<InventoryItem[]> {
  const snap = await getDocs(query(collection(db, INVENTORY), where('uid', '==', uid)));
  return snap.docs.map((d) => normalizeInventoryItem(d.id, d.data()));
}

export async function fetchInventoryDocs(uid: string): Promise<InventoryItem[]> {
  const snap = await getDocs(query(collection(db, INVENTORY), where('uid', '==', uid)));
  return snap.docs.map((d) => normalizeInventoryItem(d.id, d.data()));
}

export async function addInventoryDoc(
  data: Omit<InventoryItem, 'id'> & { uid: string },
): Promise<string> {
  const ref = await addDoc(collection(db, INVENTORY), data);
  return ref.id;
}

export async function updateInventoryDoc(id: string, data: Record<string, unknown>): Promise<void> {
  await updateDoc(doc(db, INVENTORY, id), data);
}

export async function deleteInventoryDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, INVENTORY, id));
}

/**
 * Atomically deducts `price` gold from the character and creates an inventory
 * document for the purchased item. Throws if the character doesn't exist or
 * doesn't have enough gold.
 * Returns the new inventory document ID.
 */
export async function runBuyItemTransaction(
  uid: string,
  itemDefId: string,
  price: number,
  acquiredAt: number,
): Promise<string> {
  const invRef = doc(collection(db, INVENTORY));
  const charRef = doc(db, CHARACTERS, uid);

  await runTransaction(db, async (tx) => {
    const charSnap = await tx.get(charRef);
    if (!charSnap.exists()) throw new Error('Character not found');
    const currentGold = (charSnap.data().gold as number) ?? 0;
    if (currentGold < price) throw new Error('Not enough gold');
    tx.set(invRef, { uid, itemDefId, quantity: 1, equipped: false, acquiredAt });
    tx.update(charRef, { gold: currentGold - price });
  });

  return invRef.id;
}

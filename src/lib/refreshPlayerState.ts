import { useCharacterStore } from '@/store/characterStore';
import { useInventoryStore } from '@/store/inventoryStore';

/**
 * Re-fetches the authoritative character + inventory state from Firestore.
 * Call this after any server-side write that mutates the character or inventory
 * (e.g., `claimDungeonRunCF`, `buyItem`) to keep local stores in sync.
 */
export async function refreshPlayerState(uid: string): Promise<void> {
  await Promise.all([
    useCharacterStore.getState().fetchCharacter(uid, true),
    useInventoryStore.getState().fetchInventory(uid),
  ]);
}

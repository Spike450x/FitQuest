import { create } from 'zustand';
import { captureError } from '@/lib/errors';
import { fetchWithRetry } from '@/lib/retry';
import { useCharacterStore } from './characterStore';
import {
  fetchInventoryDocs,
  addInventoryDoc,
  updateInventoryDoc,
  deleteInventoryDoc,
  runBuyItemTransaction,
} from '@/lib/inventoryData';
import { updateCharacterDoc } from '@/lib/characterData';
import { getItemById } from '@/lib/gameLogic/items';
import { playerMaxHp, playerMaxStamina, playerMaxMagic } from '@/lib/gameLogic/combat';
import { COMBAT } from '@/lib/gameLogic/constants';
import type { Character, EquippedGear, InventoryItem } from '@/types';

interface InventoryStore {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  lastFetchedUid: string | null;

  fetchInventory: (uid: string, force?: boolean) => Promise<void>;
  /**
   * Buy an item: atomically deducts gold and adds an InventoryItem doc in a
   * single Firestore transaction. Returns true on success, false on failure.
   */
  buyItem: (uid: string, itemDefId: string) => Promise<boolean>;
  /**
   * Award loot items after defeating a monster.
   * - Consumables: stacks with existing inventory doc (increments quantity).
   * - Equipment/accessories: skipped if already owned (no duplicate gear).
   */
  awardLoot: (uid: string, itemIds: string[]) => Promise<void>;
  /**
   * Equip an item. Unequips any previously equipped item in the same slot first.
   * Also updates character.equippedGear in Firestore so combat can read it.
   */
  equipItem: (inventoryItemId: string, uid: string) => Promise<void>;
  /** Unequip a specific inventory item and clear its slot on the character doc. */
  unequipItem: (inventoryItemId: string, uid: string) => Promise<void>;
  /**
   * Use a consumable item: applies its effect to the character, removes the item from inventory.
   * Returns the HP, Stamina, and Magic actually gained (each 0 if not applicable).
   */
  useConsumable: (
    inventoryItemId: string,
    currentHp: number,
    maxHp: number,
    currentStamina: number,
    maxStamina: number,
    currentMagic?: number,
    maxMagic?: number,
  ) => Promise<{ hpGained: number; staminaGained: number; magicGained: number }>;
  /**
   * Add a spell to the active loadout (max MAX_EQUIPPED_SPELLS).
   * Returns { ok: false, reason } if the limit is already reached.
   */
  equipSpell: (inventoryItemId: string) => Promise<{ ok: boolean; reason?: string }>;
  /** Remove a spell from the active loadout. */
  unequipSpell: (inventoryItemId: string) => Promise<void>;
  /**
   * Add a consumable to the combat pack (max MAX_EQUIPPED_CONSUMABLES).
   * Returns { ok: false, reason } if the limit is already reached.
   */
  equipConsumable: (inventoryItemId: string) => Promise<{ ok: boolean; reason?: string }>;
  /** Remove a consumable from the combat pack. */
  unequipConsumable: (inventoryItemId: string) => Promise<void>;
  clear: () => void;
}

interface GearDeltaResult {
  charUpdate: Record<string, unknown>;
  newCurrentHp?: number;
  newCurrentStamina?: number;
}

function computeGearDelta(
  character: Character | null,
  slot: 'weapon' | 'armor' | 'accessory',
  newItemDefId: string | null,
): GearDeltaResult {
  if (!character) return { charUpdate: { [`equippedGear.${slot}`]: newItemDefId } };

  const newEquippedGear: EquippedGear = { ...character.equippedGear, [slot]: newItemDefId };
  const oldMaxHp = playerMaxHp(character);
  const oldMaxStamina = playerMaxStamina(character);
  const newMaxHp = playerMaxHp({ stats: character.stats, equippedGear: newEquippedGear });
  const newMaxStamina = playerMaxStamina({ stats: character.stats, equippedGear: newEquippedGear });
  const hpDelta = newMaxHp - oldMaxHp;
  const staminaDelta = newMaxStamina - oldMaxStamina;

  const charUpdate: Record<string, unknown> = { [`equippedGear.${slot}`]: newItemDefId };
  let newCurrentHp: number | undefined;
  let newCurrentStamina: number | undefined;

  if (hpDelta !== 0) {
    newCurrentHp =
      newItemDefId !== null
        ? Math.max(1, Math.min((character.currentHp ?? oldMaxHp) + hpDelta, newMaxHp))
        : Math.max(1, (character.currentHp ?? oldMaxHp) + hpDelta);
    charUpdate.currentHp = newCurrentHp;
  }
  if (staminaDelta !== 0) {
    newCurrentStamina =
      newItemDefId !== null
        ? Math.max(
            0,
            Math.min((character.currentStamina ?? oldMaxStamina) + staminaDelta, newMaxStamina),
          )
        : Math.max(0, (character.currentStamina ?? oldMaxStamina) + staminaDelta);
    charUpdate.currentStamina = newCurrentStamina;
  }

  return { charUpdate, newCurrentHp, newCurrentStamina };
}

const FETCH_TTL_MS = 30_000;

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
  lastFetchedUid: null,

  fetchInventory: async (uid, force = false) => {
    const { lastFetchedAt, lastFetchedUid } = get();
    if (
      !force &&
      lastFetchedUid === uid &&
      lastFetchedAt !== null &&
      Date.now() - lastFetchedAt < FETCH_TTL_MS
    ) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const items = await fetchWithRetry(() => fetchInventoryDocs(uid));
      set({ items, loading: false, lastFetchedAt: Date.now(), lastFetchedUid: uid });
    } catch (e) {
      captureError('inventoryStore.fetchInventory', e);
      set({ error: (e as Error).message, loading: false });
    }
  },

  buyItem: async (uid, itemDefId) => {
    const def = getItemById(itemDefId);
    if (!def) return false;

    const acquiredAt = Date.now();
    try {
      const newDocId = await runBuyItemTransaction(uid, itemDefId, def.price, acquiredAt);
      const newItem: InventoryItem = {
        id: newDocId,
        itemDefId,
        quantity: 1,
        equipped: false,
        acquiredAt,
      };
      set((state) => ({ items: [...state.items, newItem] }));
      useCharacterStore.setState((state) => ({
        character: state.character
          ? { ...state.character, gold: state.character.gold - def.price }
          : null,
      }));
      return true;
    } catch (e) {
      captureError('inventoryStore.buyItem', e);
      set({ error: (e as Error).message });
      return false;
    }
  },

  awardLoot: async (uid, itemIds) => {
    const consumableIds: string[] = [];
    const equipmentIds: string[] = [];
    for (const id of itemIds) {
      const def = getItemById(id);
      if (!def) continue;
      if (def.type === 'consumable') {
        consumableIds.push(id);
      } else {
        equipmentIds.push(id);
      }
    }

    // Consumables must be processed sequentially: each stack-write must be
    // visible to the next iteration so duplicate drops stack correctly.
    for (const itemDefId of consumableIds) {
      const existing = get().items.find((i) => i.itemDefId === itemDefId);
      if (existing) {
        const newQty = existing.quantity + 1;
        await updateInventoryDoc(existing.id, { quantity: newQty });
        set((state) => ({
          items: state.items.map((i) => (i.id === existing.id ? { ...i, quantity: newQty } : i)),
        }));
      } else {
        const data = { uid, itemDefId, quantity: 1, equipped: false, acquiredAt: Date.now() };
        const newId = await addInventoryDoc(data);
        set((state) => ({ items: [...state.items, { id: newId, ...data }] }));
      }
    }

    // Equipment can be written in parallel — each item is independent.
    const ownedIds = new Set(get().items.map((i) => i.itemDefId));
    const newEquipment = equipmentIds.filter((id) => !ownedIds.has(id));
    if (newEquipment.length === 0) return;

    const acquiredAt = Date.now();
    const newIds = await Promise.all(
      newEquipment.map((itemDefId) =>
        addInventoryDoc({ uid, itemDefId, quantity: 1, equipped: false, acquiredAt }),
      ),
    );
    const addedItems: InventoryItem[] = newIds.map((id, i) => ({
      id,
      itemDefId: newEquipment[i],
      quantity: 1,
      equipped: false,
      acquiredAt,
    }));
    set((state) => ({ items: [...state.items, ...addedItems] }));
  },

  equipItem: async (inventoryItemId, uid) => {
    const { items } = get();
    const target = items.find((i) => i.id === inventoryItemId);
    if (!target) return;

    const itemDef = getItemById(target.itemDefId);
    // Spells and consumables use their own equip flows (equipSpell / equipConsumable).
    if (!itemDef || itemDef.type === 'consumable' || itemDef.type === 'spell') return;

    const slot = itemDef.type as 'weapon' | 'armor' | 'accessory';

    const currentlyEquipped = items.find((i) => {
      if (!i.equipped) return false;
      return getItemById(i.itemDefId)?.type === slot;
    });

    const character = useCharacterStore.getState().character;
    const { charUpdate, newCurrentHp, newCurrentStamina } = computeGearDelta(
      character,
      slot,
      target.itemDefId,
    );

    await Promise.all([
      currentlyEquipped
        ? updateInventoryDoc(currentlyEquipped.id, { equipped: false })
        : Promise.resolve(),
      updateInventoryDoc(inventoryItemId, { equipped: true }),
      updateCharacterDoc(uid, charUpdate),
    ]);

    useCharacterStore.setState((state) => ({
      character: state.character
        ? {
            ...state.character,
            equippedGear: { ...state.character.equippedGear, [slot]: target.itemDefId },
            ...(newCurrentHp !== undefined && { currentHp: newCurrentHp }),
            ...(newCurrentStamina !== undefined && { currentStamina: newCurrentStamina }),
          }
        : null,
    }));

    set((state) => ({
      items: state.items.map((i) => {
        if (i.id === currentlyEquipped?.id) return { ...i, equipped: false };
        if (i.id === inventoryItemId) return { ...i, equipped: true };
        return i;
      }),
    }));
  },

  unequipItem: async (inventoryItemId, uid) => {
    const { items } = get();
    const target = items.find((i) => i.id === inventoryItemId);
    if (!target) return;

    const itemDef = getItemById(target.itemDefId);
    if (!itemDef || itemDef.type === 'consumable' || itemDef.type === 'spell') return;
    const slot = itemDef.type as 'weapon' | 'armor' | 'accessory';

    const character = useCharacterStore.getState().character;
    const { charUpdate, newCurrentHp, newCurrentStamina } = computeGearDelta(character, slot, null);

    await Promise.all([
      updateInventoryDoc(inventoryItemId, { equipped: false }),
      updateCharacterDoc(uid, charUpdate),
    ]);

    useCharacterStore.setState((state) => ({
      character: state.character
        ? {
            ...state.character,
            equippedGear: { ...state.character.equippedGear, [slot]: null },
            ...(newCurrentHp !== undefined && { currentHp: newCurrentHp }),
            ...(newCurrentStamina !== undefined && { currentStamina: newCurrentStamina }),
          }
        : null,
    }));

    set((state) => ({
      items: state.items.map((i) => (i.id === inventoryItemId ? { ...i, equipped: false } : i)),
    }));
  },

  useConsumable: async (
    inventoryItemId,
    currentHp,
    maxHp,
    currentStamina,
    maxStamina,
    currentMagic,
    maxMagic,
  ) => {
    const { items } = get();
    const invItem = items.find((i) => i.id === inventoryItemId);
    if (!invItem) return { hpGained: 0, staminaGained: 0, magicGained: 0 };

    const def = getItemById(invItem.itemDefId);
    if (!def || def.type !== 'consumable' || !def.effect)
      return { hpGained: 0, staminaGained: 0, magicGained: 0 };

    let hpGained = 0;
    let staminaGained = 0;
    let magicGained = 0;
    const { updateCurrentHp, updateCurrentStamina, updateCurrentMagic } =
      useCharacterStore.getState();

    if (def.effect.type === 'restore_hp') {
      const newHp = Math.min(currentHp + def.effect.amount, maxHp);
      hpGained = newHp - currentHp;
      if (hpGained > 0) await updateCurrentHp(newHp);
    } else if (def.effect.type === 'restore_stamina') {
      const newStamina = Math.min(currentStamina + def.effect.amount, maxStamina);
      staminaGained = newStamina - currentStamina;
      if (staminaGained > 0) await updateCurrentStamina(newStamina);
    } else if (def.effect.type === 'restore_magic') {
      const character = useCharacterStore.getState().character;
      const resolvedMax = maxMagic ?? (character ? playerMaxMagic(character) : 20);
      const resolvedCurrent = currentMagic ?? 0;
      const newMagic = Math.min(resolvedCurrent + def.effect.amount, resolvedMax);
      magicGained = newMagic - resolvedCurrent;
      if (magicGained > 0) await updateCurrentMagic(newMagic);
    }

    // Consume one from the stack; delete the doc only when quantity reaches 0
    if (invItem.quantity > 1) {
      const newQty = invItem.quantity - 1;
      await updateInventoryDoc(inventoryItemId, { quantity: newQty });
      set((state) => ({
        items: state.items.map((i) => (i.id === inventoryItemId ? { ...i, quantity: newQty } : i)),
      }));
    } else {
      await deleteInventoryDoc(inventoryItemId);
      set((state) => ({ items: state.items.filter((i) => i.id !== inventoryItemId) }));
    }

    return { hpGained, staminaGained, magicGained };
  },

  equipSpell: async (inventoryItemId) => {
    const { items } = get();
    const target = items.find((i) => i.id === inventoryItemId);
    if (!target) return { ok: false, reason: 'Item not found.' };

    const itemDef = getItemById(target.itemDefId);
    if (!itemDef || itemDef.type !== 'spell') return { ok: false, reason: 'Not a spell.' };
    if (target.equipped) return { ok: true }; // already equipped, no-op

    const equippedSpellCount = items.filter((i) => {
      const d = getItemById(i.itemDefId);
      return i.equipped && d?.type === 'spell';
    }).length;

    if (equippedSpellCount >= COMBAT.MAX_EQUIPPED_SPELLS) {
      return {
        ok: false,
        reason: `Spell loadout is full (${COMBAT.MAX_EQUIPPED_SPELLS} max). Unequip a spell first.`,
      };
    }

    await updateInventoryDoc(inventoryItemId, { equipped: true });
    set((state) => ({
      items: state.items.map((i) => (i.id === inventoryItemId ? { ...i, equipped: true } : i)),
    }));
    return { ok: true };
  },

  unequipSpell: async (inventoryItemId) => {
    const { items } = get();
    const target = items.find((i) => i.id === inventoryItemId);
    if (!target || !target.equipped) return;

    await updateInventoryDoc(inventoryItemId, { equipped: false });
    set((state) => ({
      items: state.items.map((i) => (i.id === inventoryItemId ? { ...i, equipped: false } : i)),
    }));
  },

  equipConsumable: async (inventoryItemId) => {
    const { items } = get();
    const target = items.find((i) => i.id === inventoryItemId);
    if (!target) return { ok: false, reason: 'Item not found.' };

    const itemDef = getItemById(target.itemDefId);
    if (!itemDef || itemDef.type !== 'consumable')
      return { ok: false, reason: 'Not a consumable.' };
    if (target.equipped) return { ok: true }; // already packed, no-op

    const packedCount = items.filter((i) => {
      const d = getItemById(i.itemDefId);
      return i.equipped && d?.type === 'consumable';
    }).length;

    if (packedCount >= COMBAT.MAX_EQUIPPED_CONSUMABLES) {
      return {
        ok: false,
        reason: `Combat pack is full (${COMBAT.MAX_EQUIPPED_CONSUMABLES} max). Remove one first.`,
      };
    }

    await updateInventoryDoc(inventoryItemId, { equipped: true });
    set((state) => ({
      items: state.items.map((i) => (i.id === inventoryItemId ? { ...i, equipped: true } : i)),
    }));
    return { ok: true };
  },

  unequipConsumable: async (inventoryItemId) => {
    const { items } = get();
    const target = items.find((i) => i.id === inventoryItemId);
    if (!target || !target.equipped) return;

    await updateInventoryDoc(inventoryItemId, { equipped: false });
    set((state) => ({
      items: state.items.map((i) => (i.id === inventoryItemId ? { ...i, equipped: false } : i)),
    }));
  },

  clear: () =>
    set({ items: [], loading: false, error: null, lastFetchedAt: null, lastFetchedUid: null }),
}));

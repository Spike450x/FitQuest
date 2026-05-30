import { create } from 'zustand';
import { deleteField } from 'firebase/firestore';
import { captureError } from '@/lib/errors';
import { fetchWithRetry, STORE_RETRY_DELAYS } from '@/lib/retry';
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
import { getSpellMaxCharges } from '@/lib/gameLogic/spells';
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
    resources: {
      currentHp: number;
      maxHp: number;
      currentStamina: number;
      maxStamina: number;
      currentMagic?: number;
      maxMagic?: number;
    },
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
  /**
   * Persist mid-dungeon spell charge decrements to Firestore so charges survive
   * room transitions. `decrements` maps invItemId → number of charges used.
   * Items used at or beyond their per-rarity max (see `getSpellMaxCharges`)
   * are written with charges=0.
   */
  persistSpellChargeDecrements: (decrements: Record<string, number>) => Promise<void>;
  /**
   * Reset all equipped spell charges to full (delete the Firestore `charges`
   * field so undefined = full is the canonical state). Call after arena fights
   * and at dungeon rest sites.
   */
  replenishSpellCharges: () => Promise<void>;
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

  // Equip: only max changes, current is left untouched.
  // Unequip: max falls; clamp current down to the new lower max if needed.
  if (hpDelta !== 0) {
    const currentHp = character.currentHp ?? oldMaxHp;
    if (newItemDefId === null) {
      // Unequipping — clamp if current would exceed the reduced max
      const clamped = Math.max(1, Math.min(currentHp, newMaxHp));
      if (clamped !== currentHp) {
        newCurrentHp = clamped;
        charUpdate.currentHp = newCurrentHp;
      }
    }
    // Equipping — max rises, current stays the same; no charUpdate for currentHp
  }
  if (staminaDelta !== 0) {
    const currentStamina = character.currentStamina ?? oldMaxStamina;
    if (newItemDefId === null) {
      // Unequipping — clamp if current would exceed the reduced max
      const clamped = Math.max(0, Math.min(currentStamina, newMaxStamina));
      if (clamped !== currentStamina) {
        newCurrentStamina = clamped;
        charUpdate.currentStamina = newCurrentStamina;
      }
    }
    // Equipping — max rises, current stays the same; no charUpdate for currentStamina
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
      const items = await fetchWithRetry(() => fetchInventoryDocs(uid), STORE_RETRY_DELAYS);
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
      await runBuyItemTransaction(uid, itemDefId, def.price, acquiredAt);
      // Pull authoritative gold + inventory from Firestore instead of applying
      // a local delta — avoids stale-gold desync when the player has been on
      // another device since the store was last populated.
      await Promise.all([
        useCharacterStore.getState().fetchCharacter(uid, true),
        get().fetchInventory(uid, true),
      ]);
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

  useConsumable: async (inventoryItemId, resources) => {
    const { currentHp, maxHp, currentStamina, maxStamina, currentMagic, maxMagic } = resources;
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

    // Resolve current magic + max once for both single and multi paths.
    const character = useCharacterStore.getState().character;
    const resolvedMaxMagic = maxMagic ?? (character ? playerMaxMagic(character) : 20);
    const resolvedCurrentMagic = currentMagic ?? 0;

    // Per-resource pending totals — written to Firestore exactly once at the end,
    // so a multi-restore drinks in a single document update instead of three.
    let pendingHp = currentHp;
    let pendingStamina = currentStamina;
    let pendingMagic = resolvedCurrentMagic;

    const applyStep = (resource: 'hp' | 'stamina' | 'magic', amount: number) => {
      if (amount <= 0) return;
      if (resource === 'hp') pendingHp = Math.min(pendingHp + amount, maxHp);
      else if (resource === 'stamina')
        pendingStamina = Math.min(pendingStamina + amount, maxStamina);
      else pendingMagic = Math.min(pendingMagic + amount, resolvedMaxMagic);
    };

    if (def.effect.type === 'restore_hp') applyStep('hp', def.effect.amount);
    else if (def.effect.type === 'restore_stamina') applyStep('stamina', def.effect.amount);
    else if (def.effect.type === 'restore_magic') applyStep('magic', def.effect.amount);
    else if (def.effect.type === 'multi') {
      for (const step of def.effect.restores) applyStep(step.resource, step.amount);
    }

    hpGained = pendingHp - currentHp;
    staminaGained = pendingStamina - currentStamina;
    magicGained = pendingMagic - resolvedCurrentMagic;

    if (hpGained > 0) await updateCurrentHp(pendingHp);
    if (staminaGained > 0) await updateCurrentStamina(pendingStamina);
    if (magicGained > 0) await updateCurrentMagic(pendingMagic);

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

  persistSpellChargeDecrements: async (decrements) => {
    const entries = Object.entries(decrements).filter(([, used]) => used > 0);
    if (entries.length === 0) return;
    // Per-item max — look up each spell's rarity to compute the correct remaining.
    const remainingByInvId: Record<string, number> = {};
    const items = get().items;
    for (const [invItemId, used] of entries) {
      const item = items.find((i) => i.id === invItemId);
      const def = item ? getItemById(item.itemDefId) : undefined;
      const max = getSpellMaxCharges(def?.rarity);
      remainingByInvId[invItemId] = Math.max(0, max - used);
    }
    await Promise.all(
      entries.map(([invItemId]) =>
        updateInventoryDoc(invItemId, { charges: remainingByInvId[invItemId] }),
      ),
    );
    set((state) => ({
      items: state.items.map((i) => {
        const remaining = remainingByInvId[i.id];
        if (remaining === undefined) return i;
        return { ...i, charges: remaining };
      }),
    }));
  },

  replenishSpellCharges: async () => {
    const spellsWithDepletedCharges = get().items.filter((i) => {
      const def = getItemById(i.itemDefId);
      return i.equipped && def?.type === 'spell' && i.charges !== undefined;
    });
    if (spellsWithDepletedCharges.length === 0) return;
    await Promise.all(
      spellsWithDepletedCharges.map((i) =>
        updateInventoryDoc(i.id, { charges: deleteField() as unknown as number }),
      ),
    );
    set((state) => ({
      items: state.items.map((i) => {
        if (!spellsWithDepletedCharges.some((s) => s.id === i.id)) return i;
        const { charges: _charges, ...rest } = i;
        void _charges;
        return rest as typeof i;
      }),
    }));
  },

  clear: () =>
    set({ items: [], loading: false, error: null, lastFetchedAt: null, lastFetchedUid: null }),
}));

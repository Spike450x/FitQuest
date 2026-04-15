"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCharacter } from "@/hooks/useCharacter";
import { useInventoryStore } from "@/store/inventoryStore";
import { getItemById, RARITY_BADGE } from "@/lib/gameLogic/items";
import { playerMaxHp, playerMaxStamina, playerMaxMagic } from "@/lib/gameLogic/combat";
import { SpellCard } from "@/components/ui/SpellCard";
import { COMBAT } from "@/lib/gameLogic/constants";
import type { ItemType } from "@/types";

const TYPE_TABS: { type: ItemType | "all"; label: string; icon: string }[] = [
  { type: "all", label: "All", icon: "🎒" },
  { type: "weapon", label: "Weapons", icon: "⚔️" },
  { type: "armor", label: "Armor", icon: "🛡️" },
  { type: "accessory", label: "Accessories", icon: "💍" },
  { type: "consumable", label: "Consumables", icon: "🧪" },
  { type: "spell", label: "Spells", icon: "✨" },
];

const SLOT_ICON: Record<string, string> = {
  weapon: "⚔️",
  armor: "🛡️",
  accessory: "💍",
};

export default function InventoryPage() {
  const { character } = useCharacter();
  const {
    items, loading, fetchInventory,
    equipItem, unequipItem,
    useConsumable, equipConsumable, unequipConsumable,
    equipSpell, unequipSpell,
  } = useInventoryStore();
  const [activeTab, setActiveTab] = useState<ItemType | "all">("all");
  const [acting, setActing] = useState<string | null>(null);
  const [spellError, setSpellError] = useState<string | null>(null);
  const [consumableError, setConsumableError] = useState<string | null>(null);

  useEffect(() => {
    if (character?.uid) fetchInventory(character.uid);
  }, [character?.uid, fetchInventory]);

  if (!character) return null;

  // "all" tab hides spells to avoid clutter — they have their own tab
  const filtered = items.filter((invItem) => {
    const def = getItemById(invItem.itemDefId);
    if (!def) return false;
    if (activeTab === "all") return def.type !== "spell";
    return def.type === activeTab;
  });

  async function handleEquip(inventoryItemId: string) {
    if (!character || acting) return;
    setActing(inventoryItemId);
    await equipItem(inventoryItemId, character.uid);
    setActing(null);
  }

  async function handleUnequip(inventoryItemId: string) {
    if (!character || acting) return;
    setActing(inventoryItemId);
    await unequipItem(inventoryItemId, character.uid);
    setActing(null);
  }

  async function handleUse(inventoryItemId: string) {
    if (!character || acting) return;
    setActing(inventoryItemId);
    const maxHp = playerMaxHp(character);
    const maxStamina = playerMaxStamina(character);
    const maxMagic = playerMaxMagic(character);
    await useConsumable(
      inventoryItemId,
      character.currentHp ?? maxHp,
      maxHp,
      character.currentStamina ?? maxStamina,
      maxStamina,
      character.currentMagic ?? maxMagic,
      maxMagic,
    );
    setActing(null);
  }

  async function handleEquipSpell(inventoryItemId: string) {
    if (!character || acting) return;
    setActing(inventoryItemId);
    setSpellError(null);
    const result = await equipSpell(inventoryItemId);
    if (!result.ok && result.reason) setSpellError(result.reason);
    setActing(null);
  }

  async function handleUnequipSpell(inventoryItemId: string) {
    if (!character || acting) return;
    setActing(inventoryItemId);
    await unequipSpell(inventoryItemId);
    setActing(null);
  }

  async function handleEquipConsumable(inventoryItemId: string) {
    if (!character || acting) return;
    setActing(inventoryItemId);
    setConsumableError(null);
    const result = await equipConsumable(inventoryItemId);
    if (!result.ok && result.reason) setConsumableError(result.reason);
    setActing(null);
  }

  async function handleUnequipConsumable(inventoryItemId: string) {
    if (!character || acting) return;
    setActing(inventoryItemId);
    await unequipConsumable(inventoryItemId);
    setActing(null);
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const equippedGearItems = items
    .filter((i) => i.equipped)
    .map((i) => ({ invItem: i, def: getItemById(i.itemDefId) }))
    .filter((x) => x.def && x.def.type !== "spell" && x.def.type !== "consumable");

  const equippedSpells = items
    .filter((i) => i.equipped)
    .map((i) => ({ invItem: i, def: getItemById(i.itemDefId) }))
    .filter((x) => x.def?.type === "spell");

  const equippedConsumables = items
    .filter((i) => i.equipped)
    .map((i) => ({ invItem: i, def: getItemById(i.itemDefId) }))
    .filter((x) => x.def?.type === "consumable");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500 mt-1">Equip gear for stat bonuses. Load up to 5 spells before combat.</p>
      </div>

      {/* Gear loadout */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Gear Loadout</p>
        <div className="grid grid-cols-3 gap-3">
          {(["weapon", "armor", "accessory"] as const).map((slot) => {
            const equipped = equippedGearItems.find((x) => x.def?.type === slot);
            return (
              <div
                key={slot}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center space-y-1"
              >
                <p className="text-xl">{SLOT_ICON[slot]}</p>
                <p className="text-xs text-gray-400 capitalize">{slot}</p>
                {equipped ? (
                  <>
                    <p className="text-xs font-semibold text-gray-800 leading-tight">
                      {equipped.def!.name}
                    </p>
                    <div className="flex flex-wrap justify-center gap-1 mt-1">
                      {Object.entries(equipped.def!.statBonuses)
                        .filter(([, v]) => (v ?? 0) > 0)
                        .map(([k, v]) => (
                          <span key={k} className="text-xs text-indigo-600 font-medium">
                            +{v} {k}
                          </span>
                        ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 italic">Empty</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Spell loadout */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">✨ Spell Loadout</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            equippedSpells.length >= COMBAT.MAX_EQUIPPED_SPELLS
              ? "bg-red-100 text-red-600"
              : "bg-violet-100 text-violet-600"
          }`}>
            {equippedSpells.length} / {COMBAT.MAX_EQUIPPED_SPELLS}
          </span>
        </div>

        {spellError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            {spellError}
          </p>
        )}

        {equippedSpells.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-3">
            No spells equipped.{" "}
            <button onClick={() => setActiveTab("spell")} className="text-violet-500 hover:underline">
              View your spells →
            </button>
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {equippedSpells.map(({ invItem, def }) => {
              if (!def?.spellMechanics) return null;
              const isActing = acting === invItem.id;
              return (
                <SpellCard
                  key={invItem.id}
                  def={def}
                  wisdomValue={character.stats.wisdom}
                  isEquipped
                  disabled={!!acting}
                  acting={isActing}
                  actionLabel={isActing ? "Removing…" : "Remove"}
                  onAction={() => handleUnequipSpell(invItem.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Consumable pack */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">🧪 Combat Pack</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            equippedConsumables.length >= COMBAT.MAX_EQUIPPED_CONSUMABLES
              ? "bg-red-100 text-red-600"
              : "bg-emerald-100 text-emerald-600"
          }`}>
            {equippedConsumables.length} / {COMBAT.MAX_EQUIPPED_CONSUMABLES}
          </span>
        </div>

        {consumableError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            {consumableError}
          </p>
        )}

        {equippedConsumables.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-3">
            No consumables packed.{" "}
            <button onClick={() => setActiveTab("consumable")} className="text-emerald-500 hover:underline">
              Add some →
            </button>
          </p>
        ) : (
          <div className="space-y-2">
            {equippedConsumables.map(({ invItem, def }) => {
              if (!def?.effect) return null;
              const isActing = acting === invItem.id;
              const effectLabel = def.effect.type === "restore_stamina" ? "Stamina"
                : def.effect.type === "restore_magic" ? "Magic" : "HP";
              const effectColor = def.effect.type === "restore_stamina" ? "text-amber-600"
                : def.effect.type === "restore_magic" ? "text-violet-600" : "text-emerald-600";
              return (
                <div key={invItem.id} className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-gray-800">{def.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${RARITY_BADGE[def.rarity]}`}>
                        {def.rarity}
                      </span>
                      <span className={`text-xs font-semibold ${effectColor}`}>
                        +{def.effect.amount} {effectLabel}
                      </span>
                      {invItem.quantity > 1 && (
                        <span className="text-xs text-gray-400">×{invItem.quantity}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnequipConsumable(invItem.id)}
                    disabled={!!acting}
                    className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors shrink-0"
                  >
                    {isActing ? "…" : "Remove"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TYPE_TABS.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => { setActiveTab(type); setSpellError(null); setConsumableError(null); }}
            className={`flex-shrink-0 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === type
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Item list */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
          <p className="text-gray-400 text-sm">
            {activeTab === "spell" ? "No spells in your bag yet." : "No items here yet."}
          </p>
          <Link href="/shop" className="text-indigo-500 hover:underline text-sm mt-1 inline-block">
            Visit the shop →
          </Link>
        </div>
      ) : activeTab === "spell" ? (
        /* Spell tab: playing card grid */
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((invItem) => {
            const def = getItemById(invItem.itemDefId);
            if (!def?.spellMechanics) return null;
            const isEquipped = invItem.equipped;
            const isActing = acting === invItem.id;
            const actionLabel = isEquipped
              ? isActing ? "Removing…" : "Remove from Loadout"
              : isActing ? "Adding…" : `Add to Loadout (${equippedSpells.length}/${COMBAT.MAX_EQUIPPED_SPELLS})`;

            return (
              <SpellCard
                key={invItem.id}
                def={def}
                wisdomValue={character.stats.wisdom}
                isEquipped={isEquipped}
                disabled={!!acting}
                acting={isActing}
                actionLabel={actionLabel}
                onAction={() => isEquipped ? handleUnequipSpell(invItem.id) : handleEquipSpell(invItem.id)}
              />
            );
          })}
        </div>
      ) : (
        /* Non-spell tabs: original card layout */
        <div className="space-y-3">
          {filtered.map((invItem) => {
            const def = getItemById(invItem.itemDefId);
            if (!def) return null;
            const isEquipped = invItem.equipped;
            const isActing = acting === invItem.id;

            const isConsumable = def.type === "consumable";
            return (
              <div
                key={invItem.id}
                className={`bg-white border rounded-xl p-4 shadow-sm space-y-2 transition-colors ${
                  isEquipped
                    ? isConsumable
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-indigo-300 bg-indigo-50/30"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 text-sm">{def.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RARITY_BADGE[def.rarity]}`}>
                        {def.rarity}
                      </span>
                      {def.lootOnly && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600">
                          ✦ Drop Only
                        </span>
                      )}
                      {isConsumable && invItem.quantity > 1 && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                          ×{invItem.quantity}
                        </span>
                      )}
                      {isEquipped && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isConsumable ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                        }`}>
                          {isConsumable ? "🧪 In Pack" : "Equipped"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{def.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(def.statBonuses)
                    .filter(([, v]) => (v ?? 0) > 0)
                    .map(([key, val]) => (
                      <span
                        key={key}
                        className="text-xs bg-indigo-50 text-indigo-600 font-medium px-2 py-0.5 rounded-full capitalize"
                      >
                        +{val} {key}
                      </span>
                    ))}
                </div>

                {def.type === "consumable" ? (
                  isEquipped ? (
                    <button
                      onClick={() => handleUnequipConsumable(invItem.id)}
                      disabled={!!acting}
                      className="text-xs text-emerald-500 hover:text-red-500 disabled:opacity-40 transition-colors font-medium"
                    >
                      {isActing ? "Removing…" : "Remove from Pack"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEquipConsumable(invItem.id)}
                      disabled={!!acting}
                      className="text-xs text-emerald-600 hover:text-emerald-800 disabled:opacity-40 transition-colors font-medium"
                    >
                      {isActing ? "Adding…" : `Add to Pack (${equippedConsumables.length}/${COMBAT.MAX_EQUIPPED_CONSUMABLES})`}
                    </button>
                  )
                ) : isEquipped ? (
                  <button
                    onClick={() => handleUnequip(invItem.id)}
                    disabled={!!acting}
                    className="text-xs text-gray-500 hover:text-red-500 disabled:opacity-40 transition-colors font-medium"
                  >
                    {isActing ? "Unequipping…" : "Unequip"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleEquip(invItem.id)}
                    disabled={!!acting}
                    className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition-colors font-medium"
                  >
                    {isActing ? "Equipping…" : "Equip"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

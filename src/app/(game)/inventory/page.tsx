'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useCharacter } from '@/hooks/useCharacter';
import { useInventoryStore } from '@/store/inventoryStore';
import { getItemById, RARITY_BADGE, RARITY_CARD } from '@/lib/gameLogic/items';
import { playerMaxHp, playerMaxStamina, playerMaxMagic } from '@/lib/gameLogic/combat';
import { PremiumSpellCard } from '@/components/ui/PremiumSpellCard';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toaster';
import { useInventoryNewMarkers } from '@/hooks/useInventoryNewMarkers';
import { COMBAT } from '@/lib/gameLogic/constants';
import type { ItemType } from '@/types';
import { EntityArt } from '@/components/art/EntityArt';
import { rarityTint } from '@/lib/entityArt';

const TYPE_TABS: { type: ItemType | 'all'; label: string; icon: string }[] = [
  { type: 'all', label: 'All', icon: '🎒' },
  { type: 'weapon', label: 'Weapons', icon: '⚔️' },
  { type: 'armor', label: 'Armor', icon: '🛡️' },
  { type: 'accessory', label: 'Accessories', icon: '💍' },
  { type: 'consumable', label: 'Consumables', icon: '🧪' },
  { type: 'spell', label: 'Spells', icon: '✨' },
];

const ITEM_TYPE_EMOJI: Partial<Record<ItemType, string>> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💍',
  consumable: '🧪',
};

const SLOT_ICON: Record<string, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💍',
};

export default function InventoryPage() {
  const { character } = useCharacter();
  const items = useInventoryStore((s) => s.items);
  const loading = useInventoryStore((s) => s.loading);
  const storeError = useInventoryStore((s) => s.error);
  const fetchInventory = useInventoryStore((s) => s.fetchInventory);
  const equipItem = useInventoryStore((s) => s.equipItem);
  const unequipItem = useInventoryStore((s) => s.unequipItem);
  const consumeItem = useInventoryStore((s) => s.useConsumable);
  const equipConsumable = useInventoryStore((s) => s.equipConsumable);
  const unequipConsumable = useInventoryStore((s) => s.unequipConsumable);
  const equipSpell = useInventoryStore((s) => s.equipSpell);
  const unequipSpell = useInventoryStore((s) => s.unequipSpell);
  const [activeTab, setActiveTab] = useState<ItemType | 'all'>('all');
  const [acting, setActing] = useState<string | null>(null);
  const [spellError, setSpellError] = useState<string | null>(null);
  const [consumableError, setConsumableError] = useState<string | null>(null);

  useEffect(() => {
    if (character?.uid) fetchInventory(character.uid);
  }, [character?.uid, fetchInventory]);

  const { isNew, markAllSeen } = useInventoryNewMarkers(character?.uid, items);

  // Once items have loaded for this visit, clear the NEW markers so they don't
  // re-appear on the next page open. The list is already rendered with the
  // pre-clear snapshot, so this fires on unmount.
  useEffect(() => {
    if (!loading && items.length > 0) {
      const t = setTimeout(markAllSeen, 1500);
      return () => clearTimeout(t);
    }
  }, [loading, items.length, markAllSeen]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const { equippedGearItems, equippedSpells, equippedConsumables } = useMemo(() => {
    type WithDef = { invItem: (typeof items)[number]; def: ReturnType<typeof getItemById> };
    const gear: WithDef[] = [];
    const spells: WithDef[] = [];
    const consumables: WithDef[] = [];
    for (const invItem of items) {
      if (!invItem.equipped) continue;
      const def = getItemById(invItem.itemDefId);
      if (!def) continue;
      if (def.type === 'spell') spells.push({ invItem, def });
      else if (def.type === 'consumable') consumables.push({ invItem, def });
      else gear.push({ invItem, def });
    }
    return { equippedGearItems: gear, equippedSpells: spells, equippedConsumables: consumables };
  }, [items]);

  if (!character) return null;

  // "all" tab hides spells to avoid clutter — they have their own tab
  const filtered = items.filter((invItem) => {
    const def = getItemById(invItem.itemDefId);
    if (!def) return false;
    if (activeTab === 'all') return def.type !== 'spell';
    return def.type === activeTab;
  });

  async function handleEquip(inventoryItemId: string) {
    if (!character || acting) return;
    const def = getItemById(items.find((i) => i.id === inventoryItemId)?.itemDefId ?? '');
    setActing(inventoryItemId);
    await equipItem(inventoryItemId, character.uid);
    setActing(null);
    if (def) toast.success(`Equipped ${def.name}`);
  }

  async function handleUnequip(inventoryItemId: string) {
    if (!character || acting) return;
    const def = getItemById(items.find((i) => i.id === inventoryItemId)?.itemDefId ?? '');
    setActing(inventoryItemId);
    await unequipItem(inventoryItemId, character.uid);
    setActing(null);
    if (def) toast(`Unequipped ${def.name}`);
  }

  async function handleUse(inventoryItemId: string) {
    if (!character || acting) return;
    const def = getItemById(items.find((i) => i.id === inventoryItemId)?.itemDefId ?? '');
    setActing(inventoryItemId);
    const maxHp = playerMaxHp(character);
    const maxStamina = playerMaxStamina(character);
    const maxMagic = playerMaxMagic(character);
    const result = await consumeItem(
      inventoryItemId,
      character.currentHp ?? maxHp,
      maxHp,
      character.currentStamina ?? maxStamina,
      maxStamina,
      character.currentMagic ?? maxMagic,
      maxMagic,
    );
    setActing(null);
    if (def) {
      const parts: string[] = [];
      if (result.hpGained > 0) parts.push(`+${result.hpGained} HP`);
      if (result.staminaGained > 0) parts.push(`+${result.staminaGained} Stamina`);
      if (result.magicGained > 0) parts.push(`+${result.magicGained} Magic`);
      toast.success(`Used ${def.name}`, {
        description: parts.length ? parts.join(' · ') : 'No effect — already topped up.',
      });
    }
  }

  async function handleEquipSpell(inventoryItemId: string) {
    if (!character || acting) return;
    const def = getItemById(items.find((i) => i.id === inventoryItemId)?.itemDefId ?? '');
    setActing(inventoryItemId);
    setSpellError(null);
    const result = await equipSpell(inventoryItemId);
    if (!result.ok && result.reason) {
      setSpellError(result.reason);
      toast.error(result.reason);
    } else if (result.ok && def) {
      toast.success(`Spell equipped: ${def.name}`);
    }
    setActing(null);
  }

  async function handleUnequipSpell(inventoryItemId: string) {
    if (!character || acting) return;
    const def = getItemById(items.find((i) => i.id === inventoryItemId)?.itemDefId ?? '');
    setActing(inventoryItemId);
    await unequipSpell(inventoryItemId);
    setActing(null);
    if (def) toast(`Spell unequipped: ${def.name}`);
  }

  async function handleEquipConsumable(inventoryItemId: string) {
    if (!character || acting) return;
    const def = getItemById(items.find((i) => i.id === inventoryItemId)?.itemDefId ?? '');
    setActing(inventoryItemId);
    setConsumableError(null);
    const result = await equipConsumable(inventoryItemId);
    if (!result.ok && result.reason) {
      setConsumableError(result.reason);
      toast.error(result.reason);
    } else if (result.ok && def) {
      toast.success(`Added to combat pack: ${def.name}`);
    }
    setActing(null);
  }

  async function handleUnequipConsumable(inventoryItemId: string) {
    if (!character || acting) return;
    const def = getItemById(items.find((i) => i.id === inventoryItemId)?.itemDefId ?? '');
    setActing(inventoryItemId);
    await unequipConsumable(inventoryItemId);
    setActing(null);
    if (def) toast(`Removed from pack: ${def.name}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
          Inventory
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Equip gear for stat bonuses. Load up to 5 spells before combat.
        </p>
      </div>

      {storeError && (
        <ErrorBanner
          title="Couldn't load your inventory."
          message={storeError}
          onRetry={() => fetchInventory(character.uid)}
        />
      )}

      {/* Loadout row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gear loadout */}
        <Card variant="default" padding="md">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 mb-3 uppercase tracking-wider">
            Gear Loadout
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(['weapon', 'armor', 'accessory'] as const).map((slot) => {
              const equipped = equippedGearItems.find((x) => x.def?.type === slot);
              return (
                <div
                  key={slot}
                  className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-center space-y-1"
                >
                  <p className="text-xl">{SLOT_ICON[slot]}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 capitalize">{slot}</p>
                  {equipped ? (
                    <>
                      <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 leading-tight">
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
                    <p className="text-xs text-gray-400 dark:text-slate-500 italic">Empty</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Spell loadout */}
        <Card variant="default" padding="md">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              ✨ Spell Loadout
            </p>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                equippedSpells.length >= COMBAT.MAX_EQUIPPED_SPELLS
                  ? 'bg-red-100 text-red-600'
                  : 'bg-violet-100 text-violet-600'
              }`}
            >
              {equippedSpells.length} / {COMBAT.MAX_EQUIPPED_SPELLS}
            </span>
          </div>

          {spellError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              {spellError}
            </p>
          )}

          {equippedSpells.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-slate-500 italic text-center py-3">
              No spells equipped.{' '}
              <button
                onClick={() => setActiveTab('spell')}
                className="text-violet-500 hover:underline"
              >
                View your spells →
              </button>
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {equippedSpells.map(({ invItem, def }) => {
                if (!def?.spellMechanics) return null;
                const isActing = acting === invItem.id;
                return (
                  <PremiumSpellCard
                    key={invItem.id}
                    def={def}
                    wisdomValue={character.stats.wisdom}
                    isEquipped
                    disabled={!!acting}
                    acting={isActing}
                    actionLabel={isActing ? 'Removing…' : 'Remove'}
                    onAction={() => handleUnequipSpell(invItem.id)}
                  />
                );
              })}
            </div>
          )}
        </Card>

        {/* Consumable pack */}
        <Card variant="default" padding="md">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              🧪 Combat Pack
            </p>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                equippedConsumables.length >= COMBAT.MAX_EQUIPPED_CONSUMABLES
                  ? 'bg-red-100 text-red-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {equippedConsumables.length} / {COMBAT.MAX_EQUIPPED_CONSUMABLES}
            </span>
          </div>

          {consumableError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              {consumableError}
            </p>
          )}

          {equippedConsumables.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-slate-500 italic text-center py-3">
              No consumables packed.{' '}
              <button
                onClick={() => setActiveTab('consumable')}
                className="text-emerald-500 hover:underline"
              >
                Add some →
              </button>
            </p>
          ) : (
            <div className="space-y-2">
              {equippedConsumables.map(({ invItem, def }) => {
                if (!def?.effect) return null;
                const isActing = acting === invItem.id;
                const effectLabel =
                  def.effect.type === 'restore_stamina'
                    ? 'Stamina'
                    : def.effect.type === 'restore_magic'
                      ? 'Magic'
                      : 'HP';
                const effectColor =
                  def.effect.type === 'restore_stamina'
                    ? 'text-amber-600'
                    : def.effect.type === 'restore_magic'
                      ? 'text-violet-600'
                      : 'text-emerald-600';
                return (
                  <div
                    key={invItem.id}
                    className="flex items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-800 dark:text-slate-100">
                          {def.name}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${RARITY_BADGE[def.rarity]}`}
                        >
                          {def.rarity}
                        </span>
                        <span className={`text-xs font-semibold ${effectColor}`}>
                          +{def.effect.amount} {effectLabel}
                        </span>
                        {invItem.quantity > 1 && (
                          <span className="text-xs text-gray-400 dark:text-slate-500">
                            ×{invItem.quantity}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnequipConsumable(invItem.id)}
                      disabled={!!acting}
                      className="text-xs text-gray-400 dark:text-slate-500 hover:text-red-500 disabled:opacity-40 transition-colors shrink-0"
                    >
                      {isActing ? '…' : 'Remove'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
      {/* end loadout row */}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1 overflow-x-auto">
        {TYPE_TABS.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => {
              setActiveTab(type);
              setSpellError(null);
              setConsumableError(null);
            }}
            className={`flex-shrink-0 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === type
                ? 'bg-white dark:bg-slate-900 text-indigo-700 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Item list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} shape="card" height="h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={activeTab === 'spell' ? '✨' : '🎒'}
          title={activeTab === 'spell' ? 'No spells in your bag yet' : 'No items here yet'}
          description="Buy gear in the shop or defeat monsters to fill your inventory."
          cta={{ label: 'Visit the shop', href: '/shop' }}
          className="p-8"
        />
      ) : activeTab === 'spell' ? (
        /* Spell tab: playing card grid */
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((invItem) => {
            const def = getItemById(invItem.itemDefId);
            if (!def?.spellMechanics) return null;
            const isEquipped = invItem.equipped;
            const isActing = acting === invItem.id;
            const isNewItem = isNew(invItem.id);
            const actionLabel = isEquipped
              ? isActing
                ? 'Removing…'
                : 'Remove from Loadout'
              : isActing
                ? 'Adding…'
                : `Add to Loadout (${equippedSpells.length}/${COMBAT.MAX_EQUIPPED_SPELLS})`;

            return (
              <div key={invItem.id} className="relative">
                {isNewItem && (
                  <span className="absolute -top-2 -right-2 z-10 text-[10px] px-2 py-0.5 rounded-full font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-md shadow-amber-500/40 ring-2 ring-white">
                    NEW
                  </span>
                )}
                <PremiumSpellCard
                  def={def}
                  wisdomValue={character.stats.wisdom}
                  isEquipped={isEquipped}
                  disabled={!!acting}
                  acting={isActing}
                  actionLabel={actionLabel}
                  onAction={() =>
                    isEquipped ? handleUnequipSpell(invItem.id) : handleEquipSpell(invItem.id)
                  }
                />
              </div>
            );
          })}
        </div>
      ) : (
        /* Non-spell tabs: 2-col grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((invItem) => {
            const def = getItemById(invItem.itemDefId);
            if (!def) return null;
            const isEquipped = invItem.equipped;
            const isActing = acting === invItem.id;

            const isConsumable = def.type === 'consumable';
            const rarityScheme = RARITY_CARD[def.rarity];
            const isLegendary = def.rarity === 'legendary';
            return (
              <div
                key={invItem.id}
                className={`relative bg-white dark:bg-slate-900 border-2 rounded-xl p-4 space-y-2 transition-all hover:-translate-y-0.5 hover:shadow-lg ${rarityScheme.glow} ${
                  isEquipped
                    ? isConsumable
                      ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-emerald-200 dark:ring-emerald-800'
                      : 'border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-indigo-200 dark:ring-indigo-800'
                    : rarityScheme.border
                } ${isLegendary && !isEquipped ? 'animate-legendary-glow' : ''}`}
              >
                {/* Rarity accent strip */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 rounded-t-[10px] ${rarityScheme.header}`}
                  aria-hidden="true"
                />
                {/* Item silhouette portrait */}
                <div className="flex justify-center pt-1">
                  <EntityArt
                    category="item"
                    id={def.type}
                    size="md"
                    tint={rarityTint(def.rarity)}
                    fallbackEmoji={ITEM_TYPE_EMOJI[def.type]}
                    ariaLabel={def.name}
                  />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
                        {def.name}
                      </h3>
                      {isNew(invItem.id) && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm shadow-amber-500/40">
                          NEW
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${RARITY_BADGE[def.rarity]}`}
                      >
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
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isConsumable
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {isConsumable ? '🧪 In Pack' : 'Equipped'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      {def.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(def.statBonuses)
                    .filter(([, v]) => (v ?? 0) > 0)
                    .map(([key, val]) => (
                      <span
                        key={key}
                        className="text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 font-medium px-2 py-0.5 rounded-full capitalize"
                      >
                        +{val} {key}
                      </span>
                    ))}
                </div>

                {def.type === 'consumable' ? (
                  isEquipped ? (
                    <button
                      onClick={() => handleUnequipConsumable(invItem.id)}
                      disabled={!!acting}
                      className="text-xs text-emerald-500 hover:text-red-500 disabled:opacity-40 transition-colors font-medium"
                    >
                      {isActing ? 'Removing…' : 'Remove from Pack'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEquipConsumable(invItem.id)}
                      disabled={!!acting}
                      className="text-xs text-emerald-600 hover:text-emerald-800 disabled:opacity-40 transition-colors font-medium"
                    >
                      {isActing
                        ? 'Adding…'
                        : `Add to Pack (${equippedConsumables.length}/${COMBAT.MAX_EQUIPPED_CONSUMABLES})`}
                    </button>
                  )
                ) : isEquipped ? (
                  <button
                    onClick={() => handleUnequip(invItem.id)}
                    disabled={!!acting}
                    className="text-xs text-gray-500 dark:text-slate-400 hover:text-red-500 disabled:opacity-40 transition-colors font-medium"
                  >
                    {isActing ? 'Unequipping…' : 'Unequip'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleEquip(invItem.id)}
                    disabled={!!acting}
                    className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition-colors font-medium"
                  >
                    {isActing ? 'Equipping…' : 'Equip'}
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

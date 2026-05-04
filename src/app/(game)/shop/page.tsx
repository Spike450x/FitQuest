'use client';

import { useEffect, useState } from 'react';
import { useCharacter } from '@/hooks/useCharacter';
import { useCharacterStore } from '@/store/characterStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { ITEM_CATALOG, RARITY_BADGE, RARITY_TEXT } from '@/lib/gameLogic/items';
import { getDailyPick, dailyExpiresAt, formatCountdown } from '@/lib/gameLogic/rotation';
import { GoldDisplay } from '@/components/ui/GoldDisplay';
import { SpellCard } from '@/components/ui/SpellCard';
import type { ItemDef, ItemType } from '@/types';

// Gear + consumables rotate daily (8 items); spells have their own fixed pool.
const GEAR_SHOP_COUNT = 8;
const PURCHASABLE_GEAR = ITEM_CATALOG.filter((i) => !i.lootOnly && i.type !== 'spell');
const PURCHASABLE_SPELLS = ITEM_CATALOG.filter((i) => !i.lootOnly && i.type === 'spell');
const DAILY_GEAR = getDailyPick(PURCHASABLE_GEAR, GEAR_SHOP_COUNT);
// All non-lootOnly spells are always available (not daily-rotated)
const DAILY_ITEMS = [...DAILY_GEAR, ...PURCHASABLE_SPELLS];

const TYPE_TABS: { type: ItemType | 'all'; label: string; icon: string }[] = [
  { type: 'all', label: 'All', icon: '🏪' },
  { type: 'weapon', label: 'Weapons', icon: '⚔️' },
  { type: 'armor', label: 'Armor', icon: '🛡️' },
  { type: 'accessory', label: 'Accessories', icon: '💍' },
  { type: 'consumable', label: 'Consumables', icon: '🧪' },
  { type: 'spell', label: 'Spells', icon: '✨' },
];

export default function ShopPage() {
  const { character } = useCharacter();
  const awardGold = useCharacterStore((s) => s.awardGold);
  const { items, fetchInventory, buyItem } = useInventoryStore();

  const [activeTab, setActiveTab] = useState<ItemType | 'all'>('all');
  const [buying, setBuying] = useState<string | null>(null);
  const [justBought, setJustBought] = useState<string | null>(null);

  useEffect(() => {
    if (character?.uid) fetchInventory(character.uid);
  }, [character?.uid, fetchInventory]);

  if (!character) return null;

  const ownedDefIds = new Set(items.map((i) => i.itemDefId));

  const filtered = DAILY_ITEMS.filter((item) => activeTab === 'all' || item.type === activeTab);

  async function handleBuy(item: ItemDef) {
    if (!character || buying) return;
    if (character.gold < item.price) return;

    setBuying(item.id);
    const ok = await buyItem(character.uid, item.id);
    if (ok) {
      await awardGold(-item.price);
      setJustBought(item.id);
      setTimeout(() => setJustBought(null), 2000);
    }
    setBuying(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shop</h1>
          <p className="text-sm text-gray-500 mt-1">
            Buy gear, consumables, and spells. Equip up to 5 spells before combat.
          </p>
        </div>
        <GoldDisplay amount={character.gold} size="lg" />
      </div>

      {/* Daily rotation notice */}
      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
        <p className="text-xs text-amber-700 font-medium">
          🔄 {GEAR_SHOP_COUNT} gear/consumables today — spells always available
        </p>
        <p className="text-xs text-amber-600 font-semibold">
          Resets in {formatCountdown(dailyExpiresAt())}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TYPE_TABS.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === type
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Item grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((item) => {
          // Consumables are stackable; gear and spells can only be owned once
          const owned = item.type !== 'consumable' && ownedDefIds.has(item.id);
          const canAfford = character.gold >= item.price;
          const isBuying = buying === item.id;
          const bought = justBought === item.id;

          // ── Spell items use the playing card UI ──────────────────────────────
          if (item.type === 'spell' && item.spellMechanics) {
            const actionLabel = owned
              ? bought
                ? '✓ Purchased!'
                : 'Already owned'
              : !canAfford
                ? 'Not enough gold'
                : isBuying
                  ? 'Buying…'
                  : `Buy for ${item.price} 💰`;

            return (
              <SpellCard
                key={item.id}
                def={item}
                wisdomValue={character.stats.wisdom}
                affordable={canAfford}
                disabled={owned || !canAfford || !!buying}
                acting={isBuying}
                actionLabel={actionLabel}
                onAction={() => !owned && handleBuy(item)}
              />
            );
          }

          // ── Gear / consumable items ──────────────────────────────────────────
          return (
            <div
              key={item.id}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${RARITY_BADGE[item.rarity]}`}
                    >
                      {item.rarity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">
                    {item.type} · Tier {item.tier}
                  </p>
                </div>
                <p className="text-amber-500 font-bold text-sm shrink-0">{item.price} 💰</p>
              </div>

              <p className="text-xs text-gray-500">{item.description}</p>

              <div className="flex flex-wrap gap-1.5">
                {Object.entries(item.statBonuses)
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

              {owned ? (
                <div className="w-full text-center text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg py-2">
                  {bought ? '✓ Purchased!' : 'Already owned'}
                </div>
              ) : (
                <button
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford || isBuying || !!buying}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                >
                  {isBuying
                    ? 'Buying…'
                    : !canAfford
                      ? 'Not enough gold'
                      : `Buy for ${item.price} 💰`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

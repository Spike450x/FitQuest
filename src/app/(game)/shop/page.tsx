'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCharacter } from '@/hooks/useCharacter';
import { useInventoryStore } from '@/store/inventoryStore';
import { ITEM_CATALOG, RARITY_BADGE, RARITY_CARD, RARITY_TEXT } from '@/lib/gameLogic/items';
import { getDailyPick, rotationExpiresAt, formatCountdown } from '@/lib/gameLogic/rotation';
import { GoldDisplay } from '@/components/ui/GoldDisplay';
import { SpellCard } from '@/components/ui/SpellCard';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toaster';
import { useTodayKey } from '@/hooks/useTodayKey';
import type { ItemDef, ItemType } from '@/types';

// Gear + consumables rotate daily (8 items); spells have their own fixed pool.
const GEAR_SHOP_COUNT = 8;
// Stable pools — item catalog never changes at runtime, safe at module level.
const PURCHASABLE_GEAR = ITEM_CATALOG.filter((i) => !i.lootOnly && i.type !== 'spell');
const PURCHASABLE_SPELLS = ITEM_CATALOG.filter((i) => !i.lootOnly && i.type === 'spell');

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
  const items = useInventoryStore((s) => s.items);
  const inventoryLoading = useInventoryStore((s) => s.loading);
  const inventoryError = useInventoryStore((s) => s.error);
  const fetchInventory = useInventoryStore((s) => s.fetchInventory);
  const buyItem = useInventoryStore((s) => s.buyItem);

  const [activeTab, setActiveTab] = useState<ItemType | 'all'>('all');
  const [buying, setBuying] = useState<string | null>(null);
  const [justBought, setJustBought] = useState<string | null>(null);

  const todayKey = useTodayKey();
  const dailyItems = useMemo(
    () => [...getDailyPick(PURCHASABLE_GEAR, GEAR_SHOP_COUNT, todayKey), ...PURCHASABLE_SPELLS],
    [todayKey],
  );

  useEffect(() => {
    if (character?.uid) fetchInventory(character.uid);
  }, [character?.uid, fetchInventory]);

  if (!character) return null;

  const ownedDefIds = new Set(items.map((i) => i.itemDefId));

  const filtered = dailyItems.filter((item) => activeTab === 'all' || item.type === activeTab);

  async function handleBuy(item: ItemDef) {
    if (!character || buying) return;
    if (character.gold < item.price) return;

    setBuying(item.id);
    const ok = await buyItem(character.uid, item.id);
    if (ok) {
      setJustBought(item.id);
      setTimeout(() => setJustBought(null), 2000);
      toast.success(`Purchased ${item.name}`, {
        description: `−${item.price} gold`,
      });
    } else {
      toast.error('Purchase failed. Try again.');
    }
    setBuying(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
            Shop
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Buy gear, consumables, and spells. Equip up to 5 spells before combat.
          </p>
        </div>
        <GoldDisplay amount={character.gold} size="lg" />
      </div>

      {/* Daily rotation notice */}
      <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5">
        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
          🔄 {GEAR_SHOP_COUNT} gear/consumables today — spells always available
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
          Resets in {formatCountdown(rotationExpiresAt())} (midnight UTC)
        </p>
      </div>

      {inventoryError && (
        <ErrorBanner
          title="Couldn't load your owned items."
          message={inventoryError}
          onRetry={() => fetchInventory(character.uid)}
        />
      )}

      {/* Tabs */}
      <div
        className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1"
        role="tablist"
        aria-label="Shop categories"
      >
        {TYPE_TABS.map(({ type, label, icon }) => (
          <button
            key={type}
            role="tab"
            aria-selected={activeTab === type}
            aria-label={label}
            onClick={() => setActiveTab(type)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === type
                ? 'bg-white dark:bg-slate-900 text-indigo-700 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            <span aria-hidden="true">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Item grid */}
      {inventoryLoading && items.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 h-44 space-y-3"
            >
              <Skeleton shape="line" height="h-4" width="w-2/3" />
              <Skeleton shape="line" />
              <Skeleton shape="line" width="w-3/4" />
              <Skeleton shape="block" height="h-8" className="mt-auto" />
            </div>
          ))}
        </div>
      ) : (
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
            const rarityScheme = RARITY_CARD[item.rarity];
            const isLegendary = item.rarity === 'legendary';
            return (
              <div
                key={item.id}
                className={`relative bg-white dark:bg-slate-900 border-2 ${rarityScheme.border} ${rarityScheme.glow} rounded-xl p-4 space-y-3 transition-all hover:-translate-y-0.5 hover:shadow-xl ${
                  isLegendary ? 'animate-legendary-glow' : ''
                }`}
              >
                {/* Rarity accent strip */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 rounded-t-[10px] ${rarityScheme.header}`}
                  aria-hidden="true"
                />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
                        {item.name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${RARITY_BADGE[item.rarity]}`}
                      >
                        {item.rarity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 capitalize">
                      {item.type} · Tier {item.tier}
                    </p>
                  </div>
                  <p className="text-amber-500 font-bold text-sm shrink-0">{item.price} 💰</p>
                </div>

                <p className="text-xs text-gray-500 dark:text-slate-400">{item.description}</p>

                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(item.statBonuses)
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

                {owned ? (
                  <div className="w-full text-center text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg py-2">
                    {bought ? '✓ Purchased!' : 'Already owned'}
                  </div>
                ) : (
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={!canAfford || isBuying || !!buying}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 hover:shadow-md hover:shadow-amber-500/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none text-white text-sm font-semibold py-2 rounded-lg transition-all active:scale-[0.98]"
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
      )}
    </div>
  );
}

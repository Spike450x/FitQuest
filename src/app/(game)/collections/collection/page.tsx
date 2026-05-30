'use client';

import { useEffect, useMemo } from 'react';
import { useCharacter } from '@/hooks/useCharacter';
import { useInventoryStore } from '@/store/inventoryStore';
import { ITEM_CATALOG, RARITY_TEXT } from '@/lib/gameLogic/items';
import { collectionProgress } from '@/lib/gameLogic/collections';
import { EntityArt } from '@/components/art/EntityArt';
import { rarityTint, spellEffectKey } from '@/lib/entityArt';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { CollectionsTabs } from '@/components/collections/CollectionsTabs';
import type { ItemDef, ItemType } from '@/types';

const TYPE_META: Record<ItemType, { label: string; variant: 'shield' | 'medallion' }> = {
  weapon: { label: 'Weapons', variant: 'shield' },
  armor: { label: 'Armor', variant: 'shield' },
  accessory: { label: 'Accessories', variant: 'medallion' },
  consumable: { label: 'Consumables', variant: 'medallion' },
  spell: { label: 'Spells', variant: 'medallion' },
};

const RARITY_RANK: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export default function CollectionPage() {
  const { character } = useCharacter();
  const items = useInventoryStore((s) => s.items);
  const loading = useInventoryStore((s) => s.loading);
  const fetchInventory = useInventoryStore((s) => s.fetchInventory);

  useEffect(() => {
    if (character?.uid) fetchInventory(character.uid);
  }, [character?.uid, fetchInventory]);

  const ownedIds = useMemo(() => new Set(items.map((i) => i.itemDefId)), [items]);
  const overall = useMemo(() => collectionProgress(ownedIds), [ownedIds]);

  if (!character) return null;

  const pct = overall.pct;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
          Collections
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {overall.owned} of {overall.total} items collected · {pct}%
        </p>
      </div>

      <CollectionsTabs />

      {/* Overall completion bar */}
      <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        overall.byType.map(({ type }) => (
          <TypeSection
            key={type}
            label={TYPE_META[type].label}
            variant={TYPE_META[type].variant}
            defs={ITEM_CATALOG.filter((d) => d.type === type)}
            ownedIds={ownedIds}
          />
        ))
      )}
    </div>
  );
}

function TypeSection({
  label,
  variant,
  defs,
  ownedIds,
}: {
  label: string;
  variant: 'shield' | 'medallion';
  defs: ItemDef[];
  ownedIds: Set<string>;
}) {
  const owned = defs.filter((d) => ownedIds.has(d.id)).length;
  const sorted = [...defs].sort(
    (a, b) => (RARITY_RANK[a.rarity] ?? 0) - (RARITY_RANK[b.rarity] ?? 0) || a.tier - b.tier,
  );

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
        {label} · {owned}/{defs.length}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {sorted.map((def) => (
          <ItemCard key={def.id} def={def} variant={variant} owned={ownedIds.has(def.id)} />
        ))}
      </div>
    </section>
  );
}

function ItemCard({
  def,
  variant,
  owned,
}: {
  def: ItemDef;
  variant: 'shield' | 'medallion';
  owned: boolean;
}) {
  const art =
    def.type === 'spell' && def.spellMechanics ? (
      <EntityArt
        category="spell"
        id={spellEffectKey(def.spellMechanics.effect)}
        size="lg"
        tint={rarityTint(def.rarity)}
      />
    ) : (
      <EntityArt
        category="item"
        id={def.id}
        variant={variant}
        size="lg"
        tint={rarityTint(def.rarity)}
      />
    );

  return (
    <Card className="flex flex-col items-center text-center gap-2 p-3">
      <div className={owned ? '' : 'opacity-20 grayscale'}>{art}</div>
      {owned ? (
        <>
          <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 leading-tight">
            {def.name}
          </p>
          <p className={`text-[11px] font-medium capitalize ${RARITY_TEXT[def.rarity]}`}>
            {def.rarity}
          </p>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 leading-tight">
            ???
          </p>
          <p className="text-[11px] text-gray-300 dark:text-slate-600 capitalize">{def.rarity}</p>
        </>
      )}
    </Card>
  );
}

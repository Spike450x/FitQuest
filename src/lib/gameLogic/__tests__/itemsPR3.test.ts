import { describe, it, expect } from 'vitest';
import {
  consumableEffectColorClass,
  consumableEffectColorHex,
  describeConsumableEffect,
  ITEM_CATALOG,
  getItemById,
} from '../items';
import { LEGENDARY_ITEM_IDS } from '../../../../functions/src/gameLogic/achievements';
import { ITEM_SILHOUETTES } from '@/components/art/item-silhouettes';
import type { ConsumableEffect } from '@/types';

// ─── New PR3 items registration ──────────────────────────────────────────────

const PR3_WEAPON_IDS = [
  'wooden-club',
  'apprentice-wand',
  'leather-sling',
  'novice-charm',
  'steel-mace',
  'crystal-staff',
  'shortbow',
  'spirit-totem',
  'kris-blade',
  'flameblade',
  'lightning-rod',
  'silver-rapier',
  'moonstaff',
  'starfall-bow',
  'soulreaver',
  'astral-tome',
  'thunderclaws',
  'spirit-channeler',
  'world-ender',
  'cosmic-codex',
  'shadowblade-zenith',
  'crown-of-mind',
];

const PR3_ARMOR_IDS = [
  'cloth-shirt',
  'studded-jerkin',
  'scale-mail',
  'mage-vestments',
  'reflex-leathers',
  'mithril-mail',
  'oracle-robes',
  'silent-cloak',
  'aegis-of-light',
  'shadowstep-coat',
  'guardian-bulwark',
  'starfire-vestments',
];

const PR3_ACCESSORY_IDS = [
  'speed-anklet',
  'focus-pebble',
  'spirit-pendant',
  'agility-band',
  'silver-chalice',
  'rune-bracelet',
  'thief-gloves',
  'wind-walker-boots',
  'sage-circlet',
  'rogues-talisman',
  'tortoise-charm',
  'phoenix-feather',
  'storm-stride',
  'sigil-of-clarity',
  'eye-of-eternity',
  'twin-suns-pendant',
];

const PR3_CONSUMABLE_IDS = [
  'arcane-elixir',
  'titan-elixir',
  'phoenix-draught',
  'battle-stim',
  'spirit-tea',
  'sages-brew',
];

const PR3_NEW_LEGENDARIES = [
  'world-ender',
  'cosmic-codex',
  'shadowblade-zenith',
  'crown-of-mind',
  'guardian-bulwark',
  'starfire-vestments',
  'eye-of-eternity',
  'twin-suns-pendant',
  'phoenix-draught',
];

describe('PR3 catalog — 56 new items registered', () => {
  it('adds 22 weapons / 12 armor / 16 accessories / 6 consumables', () => {
    expect(PR3_WEAPON_IDS).toHaveLength(22);
    expect(PR3_ARMOR_IDS).toHaveLength(12);
    expect(PR3_ACCESSORY_IDS).toHaveLength(16);
    expect(PR3_CONSUMABLE_IDS).toHaveLength(6);
  });

  it('every new id resolves via getItemById', () => {
    const allNew = [
      ...PR3_WEAPON_IDS,
      ...PR3_ARMOR_IDS,
      ...PR3_ACCESSORY_IDS,
      ...PR3_CONSUMABLE_IDS,
    ];
    for (const id of allNew) {
      expect(getItemById(id), `${id} missing from catalog`).toBeDefined();
    }
  });

  it('weapon ids actually live as weapons in the catalog', () => {
    for (const id of PR3_WEAPON_IDS) expect(getItemById(id)?.type).toBe('weapon');
  });

  it('armor ids live as armor', () => {
    for (const id of PR3_ARMOR_IDS) expect(getItemById(id)?.type).toBe('armor');
  });

  it('accessory ids live as accessories', () => {
    for (const id of PR3_ACCESSORY_IDS) expect(getItemById(id)?.type).toBe('accessory');
  });

  it('consumable ids live as consumables and carry an effect', () => {
    for (const id of PR3_CONSUMABLE_IDS) {
      const def = getItemById(id);
      expect(def?.type).toBe('consumable');
      expect(def?.effect).toBeDefined();
    }
  });

  it('every new legendary is in LEGENDARY_ITEM_IDS (functions parity)', () => {
    for (const id of PR3_NEW_LEGENDARIES) {
      expect(LEGENDARY_ITEM_IDS.has(id), `${id} missing from LEGENDARY_ITEM_IDS`).toBe(true);
    }
  });

  it('every new legendary is marked lootOnly', () => {
    for (const id of PR3_NEW_LEGENDARIES) {
      const def = getItemById(id);
      expect(def?.rarity).toBe('legendary');
      expect(def?.lootOnly, `${id} should be lootOnly`).toBe(true);
    }
  });

  it('every new item has a silhouette registered', () => {
    const allNew = [
      ...PR3_WEAPON_IDS,
      ...PR3_ARMOR_IDS,
      ...PR3_ACCESSORY_IDS,
      ...PR3_CONSUMABLE_IDS,
    ];
    for (const id of allNew) {
      expect(ITEM_SILHOUETTES[id], `${id} missing from ITEM_SILHOUETTES`).toBeDefined();
    }
  });
});

describe('Spirit-stat gear coverage (Wizard primary stat)', () => {
  // Spirit was added in PR1 — PR3 must ship enough Spirit-bearing gear so the
  // stat has a build path. Plan requires ≥4 new Spirit items.
  it('PR3 ships at least 4 items with a Spirit bonus', () => {
    const pr3Set = new Set([
      ...PR3_WEAPON_IDS,
      ...PR3_ARMOR_IDS,
      ...PR3_ACCESSORY_IDS,
      ...PR3_CONSUMABLE_IDS,
    ]);
    const spiritItems = ITEM_CATALOG.filter(
      (i) => pr3Set.has(i.id) && (i.statBonuses.spirit ?? 0) > 0,
    );
    expect(spiritItems.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Agility gear coverage repair', () => {
  // Plan requires ≥6 new AGI items to close the previously-flagged AGI gap.
  it('PR3 ships at least 6 items with an Agility bonus', () => {
    const pr3Set = new Set([
      ...PR3_WEAPON_IDS,
      ...PR3_ARMOR_IDS,
      ...PR3_ACCESSORY_IDS,
      ...PR3_CONSUMABLE_IDS,
    ]);
    const agiItems = ITEM_CATALOG.filter(
      (i) => pr3Set.has(i.id) && (i.statBonuses.agility ?? 0) > 0,
    );
    expect(agiItems.length).toBeGreaterThanOrEqual(6);
  });
});

// ─── Consumable-effect helpers ───────────────────────────────────────────────

describe('describeConsumableEffect', () => {
  it('renders single restores with the long resource label', () => {
    expect(describeConsumableEffect({ type: 'restore_hp', amount: 25 })).toBe('+25 HP');
    expect(describeConsumableEffect({ type: 'restore_stamina', amount: 80 })).toBe('+80 Stamina');
    expect(describeConsumableEffect({ type: 'restore_magic', amount: 60 })).toBe('+60 Magic');
  });

  it('renders short labels when short=true', () => {
    expect(describeConsumableEffect({ type: 'restore_stamina', amount: 80 }, true)).toBe(
      '+80 Stam',
    );
    expect(describeConsumableEffect({ type: 'restore_magic', amount: 60 }, true)).toBe('+60 Mag');
  });

  it('renders multi effects as slash-joined per-resource amounts', () => {
    const multi: ConsumableEffect = {
      type: 'multi',
      restores: [
        { resource: 'hp', amount: 30 },
        { resource: 'stamina', amount: 30 },
        { resource: 'magic', amount: 20 },
      ],
    };
    expect(describeConsumableEffect(multi)).toBe('+30 HP / +30 Stamina / +20 Magic');
    expect(describeConsumableEffect(multi, true)).toBe('+30 HP / +30 Stam / +20 Mag');
  });
});

describe('consumable effect color helpers', () => {
  it('returns resource-tinted Tailwind class for single restores', () => {
    expect(consumableEffectColorClass({ type: 'restore_hp', amount: 10 })).toBe('text-emerald-600');
    expect(consumableEffectColorClass({ type: 'restore_stamina', amount: 10 })).toBe(
      'text-amber-600',
    );
    expect(consumableEffectColorClass({ type: 'restore_magic', amount: 10 })).toBe(
      'text-violet-600',
    );
  });

  it('returns mixed Tailwind class for multi restores', () => {
    expect(
      consumableEffectColorClass({
        type: 'multi',
        restores: [
          { resource: 'hp', amount: 10 },
          { resource: 'magic', amount: 10 },
        ],
      }),
    ).toBe('text-sky-600');
  });

  it('returns resource-tinted hex for single restores', () => {
    expect(consumableEffectColorHex({ type: 'restore_hp', amount: 10 })).toBe('#059669');
    expect(consumableEffectColorHex({ type: 'restore_stamina', amount: 10 })).toBe('#d97706');
    expect(consumableEffectColorHex({ type: 'restore_magic', amount: 10 })).toBe('#7c3aed');
  });

  it('returns mixed hex for multi restores', () => {
    expect(
      consumableEffectColorHex({
        type: 'multi',
        restores: [
          { resource: 'hp', amount: 10 },
          { resource: 'magic', amount: 10 },
        ],
      }),
    ).toBe('#0284c7');
  });
});

// ─── Spot-check multi consumable definitions ─────────────────────────────────

describe('multi consumable shape', () => {
  it('battle-stim sums to 30/30/20 across hp/stam/mag', () => {
    const def = getItemById('battle-stim')!;
    expect(def.effect?.type).toBe('multi');
    if (def.effect?.type !== 'multi') return;
    const byRes = Object.fromEntries(def.effect.restores.map((r) => [r.resource, r.amount]));
    expect(byRes.hp).toBe(30);
    expect(byRes.stamina).toBe(30);
    expect(byRes.magic).toBe(20);
  });

  it('sages-brew restores stamina and magic only — no HP', () => {
    const def = getItemById('sages-brew')!;
    if (def.effect?.type !== 'multi') throw new Error('expected multi effect');
    expect(def.effect.restores.find((r) => r.resource === 'hp')).toBeUndefined();
    expect(def.effect.restores.find((r) => r.resource === 'stamina')?.amount).toBe(60);
    expect(def.effect.restores.find((r) => r.resource === 'magic')?.amount).toBe(60);
  });
});

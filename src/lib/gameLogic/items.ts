import type { ConsumableEffect, ItemDef, ItemRarity } from '@/types';

/**
 * Item catalog — five rarity tiers.
 *
 * Tier 1 common    — affordable early-game, small bonuses
 * Tier 2 uncommon  — mid-game, meaningful bonuses
 * Tier 3 rare      — late-game, strong bonuses, expensive
 * Tier 4 epic      — high-end, powerful bonuses, very expensive
 * Tier 5 legendary — best-in-slot, extreme bonuses, or loot-only from hard monsters
 *
 * Stat bonuses from gear feed directly into combat:
 *   weapon    → adds to Attack / Magic rolls (strength / wisdom bonus)
 *   armor     → adds to player defense stat
 *   accessory → mixed utility bonuses
 */

// ── Shared rarity styling (single source of truth) ───────────────────────────
// Classic RPG color scheme: gray → green → blue → purple → orange

export const RARITY_BADGE: Record<ItemRarity, string> = {
  common: 'bg-gray-100 text-gray-500',
  uncommon: 'bg-green-100 text-green-700',
  rare: 'bg-blue-100 text-blue-700',
  epic: 'bg-purple-100 text-purple-700',
  legendary: 'bg-orange-100 text-orange-600',
};

export const RARITY_TEXT: Record<ItemRarity, string> = {
  common: 'text-gray-500',
  uncommon: 'text-green-600',
  rare: 'text-blue-600',
  epic: 'text-purple-600',
  legendary: 'text-orange-500',
};

/**
 * Saturated card-styling tokens (header bg, border, optional glow shadow).
 * Used by playing-card-style components like SpellCard. Keeps rarity color
 * choices in a single file alongside RARITY_BADGE / RARITY_TEXT.
 */
export const RARITY_CARD: Record<ItemRarity, { header: string; border: string; glow: string }> = {
  common: { header: 'bg-gray-500', border: 'border-gray-300', glow: '' },
  uncommon: {
    header: 'bg-green-600',
    border: 'border-green-300',
    glow: 'shadow-md shadow-green-500/20',
  },
  rare: { header: 'bg-blue-600', border: 'border-blue-300', glow: 'shadow-lg shadow-blue-500/30' },
  epic: {
    header: 'bg-purple-600',
    border: 'border-purple-300',
    glow: 'shadow-lg shadow-purple-500/40',
  },
  legendary: {
    header: 'bg-orange-500',
    border: 'border-orange-400',
    glow: 'shadow-xl shadow-orange-500/50',
  },
};

// ── Item catalog ─────────────────────────────────────────────────────────────

export const ITEM_CATALOG: ItemDef[] = [
  // ── Weapons — Common ───────────────────────────────────────────────────────
  {
    id: 'worn-sword',
    name: 'Worn Sword',
    type: 'weapon',
    rarity: 'common',
    tier: 1,
    price: 40,
    statBonuses: { strength: 2 },
    description: 'A dull blade that still bites. +2 Strength.',
  },
  {
    id: 'oak-staff',
    name: 'Oak Staff',
    type: 'weapon',
    rarity: 'common',
    tier: 1,
    price: 40,
    statBonuses: { wisdom: 2 },
    description: 'Carved from a fallen oak. Channels arcane energy. +2 Wisdom.',
  },
  {
    id: 'hunters-bow',
    name: "Hunter's Bow",
    type: 'weapon',
    rarity: 'common',
    tier: 1,
    price: 45,
    statBonuses: { strength: 1, stamina: 1 },
    description: 'Light and reliable. Good for rogues on the move. +1 Strength, +1 Stamina.',
  },

  // ── Weapons — Uncommon ─────────────────────────────────────────────────────
  {
    id: 'iron-sword',
    name: 'Iron Sword',
    type: 'weapon',
    rarity: 'uncommon',
    tier: 2,
    price: 120,
    statBonuses: { strength: 5 },
    description: 'Well-forged iron, properly balanced. +5 Strength.',
  },
  {
    id: 'arcane-tome',
    name: 'Arcane Tome',
    type: 'weapon',
    rarity: 'uncommon',
    tier: 2,
    price: 120,
    statBonuses: { wisdom: 5 },
    description: 'A grimoire of intermediate spells. +5 Wisdom.',
  },
  {
    id: 'twin-daggers',
    name: 'Twin Daggers',
    type: 'weapon',
    rarity: 'uncommon',
    tier: 2,
    price: 130,
    statBonuses: { strength: 3, stamina: 2 },
    description: "Strike twice as fast. A rogue's best friend. +3 Strength, +2 Stamina.",
  },

  // ── Weapons — Rare ─────────────────────────────────────────────────────────
  {
    id: 'dragonbone-blade',
    name: 'Dragonbone Blade',
    type: 'weapon',
    rarity: 'rare',
    tier: 3,
    price: 350,
    statBonuses: { strength: 10 },
    description: "Forged from a dragon's remains. Terrifying attack power. +10 Strength.",
  },
  {
    id: 'staff-of-ages',
    name: 'Staff of Ages',
    type: 'weapon',
    rarity: 'rare',
    tier: 3,
    price: 350,
    statBonuses: { wisdom: 10 },
    description: 'Ancient beyond reckoning. Magic flows through it like water. +10 Wisdom.',
  },
  {
    id: 'shadowfang',
    name: 'Shadowfang',
    type: 'weapon',
    rarity: 'rare',
    tier: 3,
    price: 380,
    statBonuses: { strength: 6, stamina: 4 },
    description: 'Forged in shadow, never seen coming. +6 Strength, +4 Stamina.',
  },

  // ── Weapons — Epic ─────────────────────────────────────────────────────────
  {
    id: 'stormcleaver',
    name: 'Stormcleaver',
    type: 'weapon',
    rarity: 'epic',
    tier: 4,
    price: 700,
    statBonuses: { strength: 14 },
    description: 'Crackles with storm energy. Every swing calls lightning. +14 Strength.',
  },
  {
    id: 'void-tome',
    name: 'Void Tome',
    type: 'weapon',
    rarity: 'epic',
    tier: 4,
    price: 700,
    statBonuses: { wisdom: 14 },
    description: 'Bound with void energy. Arcane mastery incarnate. +14 Wisdom.',
  },
  {
    id: 'phantom-blades',
    name: 'Phantom Blades',
    type: 'weapon',
    rarity: 'epic',
    tier: 4,
    price: 750,
    statBonuses: { strength: 10, stamina: 6 },
    description: 'Twin spectral daggers that phase through armor. +10 Strength, +6 Stamina.',
  },

  // ── Weapons — Legendary ────────────────────────────────────────────────────
  // When adding a new legendary item, also update LEGENDARY_ITEM_IDS in
  // functions/src/gameLogic/achievements.ts — the parity test will catch drift.
  {
    id: 'godslayer',
    name: 'Godslayer',
    type: 'weapon',
    rarity: 'legendary',
    tier: 5,
    price: 2000,
    lootOnly: true,
    statBonuses: { strength: 22 },
    description: "The blade that ended a god's reign. Its edge never dulls. +22 Strength.",
  },
  {
    id: 'the-eternal-grimoire',
    name: 'The Eternal Grimoire',
    type: 'weapon',
    rarity: 'legendary',
    tier: 5,
    price: 2000,
    lootOnly: true,
    statBonuses: { wisdom: 22 },
    description: 'Contains every spell ever written. Limitless arcane potential. +22 Wisdom.',
  },
  {
    id: 'oblivion-edge',
    name: 'Oblivion Edge',
    type: 'weapon',
    rarity: 'legendary',
    tier: 5,
    price: 2200,
    lootOnly: true,
    statBonuses: { strength: 14, stamina: 10 },
    description:
      'A blade from the edge of existence. Unstoppable in skilled hands. +14 Strength, +10 Stamina.',
  },

  // ── Armor — Common ─────────────────────────────────────────────────────────
  {
    id: 'leather-vest',
    name: 'Leather Vest',
    type: 'armor',
    rarity: 'common',
    tier: 1,
    price: 35,
    statBonuses: { defense: 2 },
    description: 'Cheap but it stops a scratch. +2 Defense.',
  },
  {
    id: 'padded-robe',
    name: 'Padded Robe',
    type: 'armor',
    rarity: 'common',
    tier: 1,
    price: 35,
    statBonuses: { defense: 1, health: 1 },
    description: 'Soft layers that cushion blows and aid recovery. +1 Defense, +1 Health.',
  },

  // ── Armor — Uncommon ───────────────────────────────────────────────────────
  {
    id: 'chain-shirt',
    name: 'Chain Shirt',
    type: 'armor',
    rarity: 'uncommon',
    tier: 2,
    price: 110,
    statBonuses: { defense: 5 },
    description: 'Linked rings of steel — solid protection. +5 Defense.',
  },
  {
    id: 'battle-plate',
    name: 'Battle Plate',
    type: 'armor',
    rarity: 'uncommon',
    tier: 2,
    price: 140,
    statBonuses: { defense: 4, health: 2 },
    description: 'Heavy plate favored by warriors. +4 Defense, +2 Health.',
  },

  // ── Armor — Rare ───────────────────────────────────────────────────────────
  {
    id: 'dragonscale-armor',
    name: 'Dragonscale Armor',
    type: 'armor',
    rarity: 'rare',
    tier: 3,
    price: 340,
    statBonuses: { defense: 10 },
    description: 'Scales shed by an ancient dragon. Nearly impenetrable. +10 Defense.',
  },
  {
    id: 'shadowweave-cloak',
    name: 'Shadowweave Cloak',
    type: 'armor',
    rarity: 'rare',
    tier: 3,
    price: 320,
    statBonuses: { defense: 6, stamina: 4 },
    description: 'Woven from shadow itself. Light and evasive. +6 Defense, +4 Stamina.',
  },

  // ── Armor — Epic ───────────────────────────────────────────────────────────
  {
    id: 'titan-plate',
    name: 'Titan Plate',
    type: 'armor',
    rarity: 'epic',
    tier: 4,
    price: 680,
    statBonuses: { defense: 14 },
    description: 'Forged in the heart of a volcano. Near-impenetrable. +14 Defense.',
  },
  {
    id: 'specter-shroud',
    name: 'Specter Shroud',
    type: 'armor',
    rarity: 'epic',
    tier: 4,
    price: 660,
    statBonuses: { defense: 10, stamina: 5 },
    description:
      'Woven from captured wraith-essence. Light as air, tough as iron. +10 Defense, +5 Stamina.',
  },

  // ── Armor — Legendary ─────────────────────────────────────────────────────
  {
    id: 'celestial-aegis',
    name: 'Celestial Aegis',
    type: 'armor',
    rarity: 'legendary',
    tier: 5,
    price: 1800,
    lootOnly: true,
    statBonuses: { defense: 20, health: 6 },
    description:
      'Blessed by celestial beings. Absorbs strikes that should be fatal. +20 Defense, +6 Health.',
  },

  // ── Accessories — Common ───────────────────────────────────────────────────
  {
    id: 'health-charm',
    name: 'Health Charm',
    type: 'accessory',
    rarity: 'common',
    tier: 1,
    price: 30,
    statBonuses: { health: 2 },
    description: 'A small pendant that pulses with vitality. +2 Health.',
  },
  {
    id: 'stamina-band',
    name: 'Stamina Band',
    type: 'accessory',
    rarity: 'common',
    tier: 1,
    price: 30,
    statBonuses: { stamina: 2 },
    description: 'A wristband that keeps you moving. +2 Stamina.',
  },

  // ── Accessories — Uncommon ─────────────────────────────────────────────────
  {
    id: 'ring-of-wisdom',
    name: 'Ring of Wisdom',
    type: 'accessory',
    rarity: 'uncommon',
    tier: 2,
    price: 100,
    statBonuses: { wisdom: 4 },
    description: 'Clear thought, sharper magic. +4 Wisdom.',
  },
  {
    id: 'warriors-pendant',
    name: "Warrior's Pendant",
    type: 'accessory',
    rarity: 'uncommon',
    tier: 2,
    price: 100,
    statBonuses: { strength: 3, defense: 2 },
    description: 'Passed down through warrior bloodlines. +3 Strength, +2 Defense.',
  },

  // ── Accessories — Rare ─────────────────────────────────────────────────────
  {
    id: 'amulet-of-the-champion',
    name: 'Amulet of the Champion',
    type: 'accessory',
    rarity: 'rare',
    tier: 3,
    price: 300,
    statBonuses: { strength: 4, wisdom: 4, defense: 2 },
    description: 'Only the worthy may wear it. +4 Strength, +4 Wisdom, +2 Defense.',
  },
  {
    id: 'lifestone',
    name: 'Lifestone',
    type: 'accessory',
    rarity: 'rare',
    tier: 3,
    price: 280,
    statBonuses: { health: 6, stamina: 4 },
    description: 'Pulses in rhythm with your heartbeat. +6 Health, +4 Stamina.',
  },

  // ── Accessories — Epic ─────────────────────────────────────────────────────
  {
    id: 'ring-of-dominance',
    name: 'Ring of Dominance',
    type: 'accessory',
    rarity: 'epic',
    tier: 4,
    price: 620,
    statBonuses: { strength: 7, wisdom: 5, defense: 4 },
    description:
      'Commands the battlefield. Feared by enemies, respected by allies. +7 Strength, +5 Wisdom, +4 Defense.',
  },
  {
    id: 'emblem-of-valor',
    name: 'Emblem of Valor',
    type: 'accessory',
    rarity: 'epic',
    tier: 4,
    price: 640,
    statBonuses: { strength: 8, defense: 8 },
    description:
      'Awarded to the mightiest champions. Strength and resilience in equal measure. +8 Strength, +8 Defense.',
  },

  // ── Accessories — Legendary ────────────────────────────────────────────────
  {
    id: 'heart-of-the-cosmos',
    name: 'Heart of the Cosmos',
    type: 'accessory',
    rarity: 'legendary',
    tier: 5,
    price: 1600,
    lootOnly: true,
    statBonuses: { strength: 8, wisdom: 8, defense: 6, stamina: 4 },
    description:
      'A fragment of a dead star. Raw universal power in the palm of your hand. +8 Strength, +8 Wisdom, +6 Defense, +4 Stamina.',
  },

  // ── Consumables — HP ───────────────────────────────────────────────────────
  {
    id: 'minor-health-potion',
    name: 'Minor Health Potion',
    type: 'consumable',
    rarity: 'common',
    tier: 1,
    price: 25,
    statBonuses: {},
    effect: { type: 'restore_hp', amount: 25 },
    description: 'A small vial of red liquid. Restores 25 HP.',
  },
  {
    id: 'health-potion',
    name: 'Health Potion',
    type: 'consumable',
    rarity: 'uncommon',
    tier: 2,
    price: 60,
    statBonuses: {},
    effect: { type: 'restore_hp', amount: 50 },
    description: 'A proper health potion. Restores 50 HP.',
  },
  {
    id: 'greater-health-potion',
    name: 'Greater Health Potion',
    type: 'consumable',
    rarity: 'rare',
    tier: 3,
    price: 150,
    statBonuses: {},
    effect: { type: 'restore_hp', amount: 100 },
    description: 'Potent restorative magic. Restores 100 HP.',
  },
  {
    id: 'elixir-of-life',
    name: 'Elixir of Life',
    type: 'consumable',
    rarity: 'epic',
    tier: 4,
    price: 400,
    statBonuses: {},
    effect: { type: 'restore_hp', amount: 200 },
    description: 'Ancient alchemical formula. Restores 200 HP.',
  },

  // ── Consumables — Magic ───────────────────────────────────────────────────
  {
    id: 'minor-magic-potion',
    name: 'Minor Magic Potion',
    type: 'consumable',
    rarity: 'common',
    tier: 1,
    price: 30,
    statBonuses: {},
    effect: { type: 'restore_magic', amount: 15 },
    description: 'A shimmering blue vial. Restores 15 Magic.',
  },
  {
    id: 'magic-potion',
    name: 'Magic Potion',
    type: 'consumable',
    rarity: 'uncommon',
    tier: 2,
    price: 70,
    statBonuses: {},
    effect: { type: 'restore_magic', amount: 30 },
    description: 'Crackling with arcane energy. Restores 30 Magic.',
  },
  {
    id: 'greater-magic-potion',
    name: 'Greater Magic Potion',
    type: 'consumable',
    rarity: 'rare',
    tier: 3,
    price: 160,
    statBonuses: {},
    effect: { type: 'restore_magic', amount: 60 },
    description: 'Pure distilled arcane essence. Restores 60 Magic.',
  },

  // ── Consumables — Stamina ─────────────────────────────────────────────────
  {
    id: 'minor-stamina-potion',
    name: 'Minor Stamina Potion',
    type: 'consumable',
    rarity: 'common',
    tier: 1,
    price: 25,
    statBonuses: {},
    effect: { type: 'restore_stamina', amount: 20 },
    description: 'A fizzing amber vial. Restores 20 Stamina.',
  },
  {
    id: 'stamina-potion',
    name: 'Stamina Potion',
    type: 'consumable',
    rarity: 'uncommon',
    tier: 2,
    price: 60,
    statBonuses: {},
    effect: { type: 'restore_stamina', amount: 40 },
    description: 'Charged with energising alchemical compounds. Restores 40 Stamina.',
  },
  {
    id: 'greater-stamina-potion',
    name: 'Greater Stamina Potion',
    type: 'consumable',
    rarity: 'rare',
    tier: 3,
    price: 140,
    statBonuses: {},
    effect: { type: 'restore_stamina', amount: 80 },
    description: "A master alchemist's formula. Restores 80 Stamina.",
  },

  // ── Spells — Generic (all classes) ───────────────────────────────────────
  {
    id: 'spell-mending-touch',
    name: 'Mending Touch',
    type: 'spell',
    rarity: 'common',
    tier: 1,
    price: 30,
    statBonuses: {},
    description: 'Channel healing energy into yourself. Restores 25 + WIS HP.',
    spellMechanics: {
      requirement: { type: 'sum_gte', diceCount: 2, value: 6 },
      effect: { heal: 25, healScalesWithWisdom: true },
      magicCost: 2,
      classRestriction: 'all',
    },
  },
  {
    id: 'spell-arcane-ward',
    name: 'Arcane Ward',
    type: 'spell',
    rarity: 'common',
    tier: 1,
    price: 35,
    statBonuses: {},
    description: 'Weave a magical barrier that softens the next blow. +5 + WIS Defense this round.',
    spellMechanics: {
      requirement: { type: 'sum_gte', diceCount: 2, value: 7 },
      effect: { defenseBoost: 5, defenseScalesWithWisdom: true },
      magicCost: 2,
      classRestriction: 'all',
    },
  },
  {
    id: 'spell-shock-bolt',
    name: 'Shock Bolt',
    type: 'spell',
    rarity: 'common',
    tier: 1,
    price: 40,
    statBonuses: {},
    description: 'Hurl a crackling bolt of energy at your foe. Deals 14 + WIS bonus damage.',
    spellMechanics: {
      requirement: { type: 'sum_gte', diceCount: 2, value: 7 },
      effect: { damage: 14, damageScalesWithWisdom: true },
      magicCost: 2,
      classRestriction: 'all',
    },
  },
  {
    id: 'spell-energy-tap',
    name: 'Energy Tap',
    type: 'spell',
    rarity: 'uncommon',
    tier: 2,
    price: 80,
    statBonuses: {},
    description: 'Draw ambient mana inward to recharge your body. Restores 35 + WIS Stamina.',
    spellMechanics: {
      requirement: { type: 'sum_gte', diceCount: 2, value: 8 },
      effect: { restoreStamina: 35, staminaScalesWithWisdom: true },
      magicCost: 3,
      classRestriction: 'all',
    },
  },
  {
    id: 'spell-greater-mending',
    name: 'Greater Mending',
    type: 'spell',
    rarity: 'rare',
    tier: 3,
    price: 180,
    statBonuses: {},
    description: 'A potent surge of healing light. Restores 70 + WIS HP.',
    spellMechanics: {
      requirement: { type: 'pair', diceCount: 3 },
      effect: { heal: 70, healScalesWithWisdom: true },
      magicCost: 4,
      classRestriction: 'all',
    },
  },
  {
    id: 'spell-nullify',
    name: 'Nullify',
    type: 'spell',
    rarity: 'uncommon',
    tier: 2,
    price: 90,
    statBonuses: {},
    description: 'Suppress the enemy for one turn — they cannot counter-attack.',
    spellMechanics: {
      requirement: { type: 'exact_value', diceCount: 2, value: 6 },
      effect: { stun: true },
      magicCost: 3,
      classRestriction: 'all',
    },
  },

  // ── Spells — Warrior ──────────────────────────────────────────────────────
  {
    id: 'spell-battle-roar',
    name: 'Battle Roar',
    type: 'spell',
    rarity: 'uncommon',
    tier: 2,
    price: 100,
    statBonuses: {},
    description:
      'A fearsome war cry that amplifies your next strike. +18 bonus damage. (Warrior only)',
    spellMechanics: {
      requirement: { type: 'sum_gte', diceCount: 2, value: 9 },
      effect: { damage: 18 },
      magicCost: 3,
      classRestriction: 'warrior',
    },
  },
  {
    id: 'spell-iron-skin',
    name: 'Iron Skin',
    type: 'spell',
    rarity: 'uncommon',
    tier: 2,
    price: 120,
    statBonuses: {},
    description: 'Harden your body to iron. +12 Defense for this round. (Warrior only)',
    spellMechanics: {
      requirement: { type: 'pair', diceCount: 3 },
      effect: { defenseBoost: 12 },
      magicCost: 3,
      classRestriction: 'warrior',
    },
  },
  {
    id: 'spell-bloodlust',
    name: 'Bloodlust',
    type: 'spell',
    rarity: 'rare',
    tier: 3,
    price: 200,
    statBonuses: {},
    description:
      'Strike with savage fury — pain fuels your recovery. +20 damage, heal 15 HP. (Warrior only)',
    spellMechanics: {
      requirement: { type: 'exact_value', diceCount: 3, value: 6 },
      effect: { damage: 20, heal: 15 },
      magicCost: 4,
      classRestriction: 'warrior',
    },
  },
  {
    id: 'spell-shield-wall',
    name: 'Shield Wall',
    type: 'spell',
    rarity: 'rare',
    tier: 3,
    price: 220,
    statBonuses: {},
    description:
      'A wall of shields that stuns and protects. Stun + +8 Defense this round. (Warrior only)',
    spellMechanics: {
      requirement: { type: 'straight', diceCount: 3, length: 3 },
      effect: { stun: true, defenseBoost: 8 },
      magicCost: 5,
      classRestriction: 'warrior',
    },
  },
  {
    id: 'spell-titans-fury',
    name: "Titan's Fury",
    type: 'spell',
    rarity: 'epic',
    tier: 4,
    price: 500,
    lootOnly: true,
    statBonuses: {},
    description:
      'Unleash the force of a titan. +40 damage, bypasses monster defense. (Warrior only)',
    spellMechanics: {
      requirement: { type: 'three_of_a_kind', diceCount: 4 },
      effect: { damage: 40, bypassMonsterDef: true },
      magicCost: 6,
      classRestriction: 'warrior',
    },
  },

  // ── Spells — Wizard ───────────────────────────────────────────────────────
  {
    id: 'spell-arcane-bolt',
    name: 'Arcane Bolt',
    type: 'spell',
    rarity: 'uncommon',
    tier: 2,
    price: 100,
    statBonuses: {},
    description: 'A concentrated burst of raw arcane force. +20 + WIS bonus damage. (Wizard only)',
    spellMechanics: {
      requirement: { type: 'sum_gte', diceCount: 2, value: 8 },
      effect: { damage: 20, damageScalesWithWisdom: true },
      magicCost: 2,
      classRestriction: 'wizard',
    },
  },
  {
    id: 'spell-mana-surge',
    name: 'Mana Surge',
    type: 'spell',
    rarity: 'uncommon',
    tier: 2,
    price: 120,
    statBonuses: {},
    description:
      'Overflow with mana — deal damage and refuel your body. +15 + WIS damage, restore 25 + WIS Stamina. (Wizard only)',
    spellMechanics: {
      requirement: { type: 'pair', diceCount: 3 },
      effect: {
        damage: 15,
        damageScalesWithWisdom: true,
        restoreStamina: 25,
        staminaScalesWithWisdom: true,
      },
      magicCost: 3,
      classRestriction: 'wizard',
    },
  },
  {
    id: 'spell-frost-nova',
    name: 'Frost Nova',
    type: 'spell',
    rarity: 'rare',
    tier: 3,
    price: 190,
    statBonuses: {},
    description: "Freeze the enemy in place — they can't counter-attack. Stun. (Wizard only)",
    spellMechanics: {
      requirement: { type: 'exact_value', diceCount: 2, value: 6 },
      effect: { stun: true },
      magicCost: 3,
      classRestriction: 'wizard',
    },
  },
  {
    id: 'spell-arcane-torrent',
    name: 'Arcane Torrent',
    type: 'spell',
    rarity: 'rare',
    tier: 3,
    price: 220,
    statBonuses: {},
    description:
      'A relentless stream of arcane energy that tears through defenses. +30 + WIS damage, bypasses defense. (Wizard only)',
    spellMechanics: {
      requirement: { type: 'straight', diceCount: 3, length: 3 },
      effect: { damage: 30, damageScalesWithWisdom: true, bypassMonsterDef: true },
      magicCost: 5,
      classRestriction: 'wizard',
    },
  },
  {
    id: 'spell-void-collapse',
    name: 'Void Collapse',
    type: 'spell',
    rarity: 'epic',
    tier: 4,
    price: 500,
    lootOnly: true,
    statBonuses: {},
    description:
      'Collapse reality on your enemy. +40 + WIS damage, bypass defense, stun. (Wizard only)',
    spellMechanics: {
      requirement: { type: 'three_of_a_kind', diceCount: 4 },
      effect: { damage: 40, damageScalesWithWisdom: true, bypassMonsterDef: true, stun: true },
      magicCost: 7,
      classRestriction: 'wizard',
    },
  },

  // ── Dungeon-exclusive items ───────────────────────────────────────────────
  // Goblin Caves
  {
    id: 'goblin-king-signet',
    name: "Goblin King's Signet",
    type: 'accessory',
    rarity: 'epic',
    tier: 3,
    price: 0,
    statBonuses: { agility: 3, strength: 2 },
    description: '10% chance on physical attack to steal 5 gold.',
    lootOnly: true,
  },
  {
    id: 'scavengers-chain',
    name: "Scavenger's Chain",
    type: 'armor',
    rarity: 'rare',
    tier: 2,
    price: 0,
    statBonuses: { defense: 4, stamina: 2 },
    description: 'Survive one fatal hit per combat at 1 HP.',
    lootOnly: true,
  },
  {
    id: 'flintsteel-dagger',
    name: 'Flintsteel Dagger',
    type: 'weapon',
    rarity: 'uncommon',
    tier: 2,
    price: 0,
    statBonuses: { strength: 4 },
    description: 'Natural d10 roll of 10 deals +5 bonus damage.',
    lootOnly: true,
  },
  // Spider Lair
  {
    id: 'venomfang-bracer',
    name: 'Venomfang Bracer',
    type: 'accessory',
    rarity: 'epic',
    tier: 3,
    price: 0,
    statBonuses: { agility: 5 },
    description: '20% chance on hit to apply venom: 3 dmg/round for 3 rounds, bypassing defense.',
    lootOnly: true,
  },
  {
    id: 'arachnoweave-cloak',
    name: 'Arachnoweave Cloak',
    type: 'armor',
    rarity: 'rare',
    tier: 3,
    price: 0,
    statBonuses: { defense: 3, agility: 4 },
    description: 'Reduces escape-roll failure chance by 15%.',
    lootOnly: true,
  },
  {
    id: 'spiderspun-tome',
    name: 'Spiderspun Tome',
    type: 'accessory',
    rarity: 'epic',
    tier: 3,
    price: 0,
    statBonuses: { wisdom: 6 },
    description: 'Wizard only. Once per combat, if magic would hit 0, retain 10 magic instead.',
    lootOnly: true,
  },
  // Dark Sanctum
  {
    id: 'bone-lattice-armor',
    name: 'Bone Lattice Armor',
    type: 'armor',
    rarity: 'epic',
    tier: 4,
    price: 0,
    statBonuses: { defense: 5, wisdom: 3 },
    description: 'Gain a Bone Shield at combat start absorbing up to 15 damage once.',
    lootOnly: true,
  },
  {
    id: 'necrotic-staff',
    name: 'Necrotic Staff',
    type: 'weapon',
    rarity: 'epic',
    tier: 4,
    price: 0,
    statBonuses: { wisdom: 8 },
    description: 'Wizard only. Magic attacks ignore 4 monster defense.',
    lootOnly: true,
  },
  {
    id: 'wraithbound-ring',
    name: 'Wraithbound Ring',
    type: 'accessory',
    rarity: 'legendary',
    tier: 4,
    price: 0,
    statBonuses: { wisdom: 4, stamina: 4 },
    description: '8% chance per round to restore 8 magic.',
    lootOnly: true,
  },
  // Dragon's Keep
  {
    id: 'draconic-sigil',
    name: 'Draconic Sigil',
    type: 'accessory',
    rarity: 'legendary',
    tier: 5,
    price: 0,
    statBonuses: { strength: 6 },
    description:
      'Once per dungeon run, the first natural d10 roll of 10 after entry deals double damage.',
    lootOnly: true,
  },
  {
    id: 'emberclaw-gauntlets',
    name: 'Emberclaw Gauntlets',
    type: 'weapon',
    rarity: 'epic',
    tier: 4,
    price: 0,
    statBonuses: { strength: 7 },
    description: 'Physical attacks gain +2 ATK when player HP is at or below 40% max.',
    lootOnly: true,
  },
  {
    id: 'scale-dragon-king',
    name: 'Scale of the Dragon King',
    type: 'armor',
    rarity: 'legendary',
    tier: 5,
    price: 0,
    statBonuses: { defense: 8, health: 4 },
    description: 'Reduce all incoming monster damage by 1 (flat, after defense).',
    lootOnly: true,
  },

  // ── Spells — Rogue ────────────────────────────────────────────────────────
  {
    id: 'spell-shadow-strike',
    name: 'Shadow Strike',
    type: 'spell',
    rarity: 'uncommon',
    tier: 2,
    price: 100,
    statBonuses: {},
    description:
      "Blend into shadow and strike — you're harder to hit in return. +15 damage, +6 Defense this round. (Rogue only)",
    spellMechanics: {
      requirement: { type: 'sum_gte', diceCount: 2, value: 8 },
      effect: { damage: 15, defenseBoost: 6 },
      magicCost: 2,
      classRestriction: 'rogue',
    },
  },
  {
    id: 'spell-poison-dart',
    name: 'Poison Dart',
    type: 'spell',
    rarity: 'uncommon',
    tier: 2,
    price: 110,
    statBonuses: {},
    description: 'A dart coated in swift-acting venom. +20 bonus damage. (Rogue only)',
    spellMechanics: {
      requirement: { type: 'exact_value', diceCount: 3, value: 5 },
      effect: { damage: 20 },
      magicCost: 2,
      classRestriction: 'rogue',
    },
  },
  {
    id: 'spell-smoke-veil',
    name: 'Smoke Veil',
    type: 'spell',
    rarity: 'rare',
    tier: 3,
    price: 190,
    statBonuses: {},
    description:
      'Vanish into smoke — enemy is stunned and you recover. Stun, heal 25 + WIS HP. (Rogue only)',
    spellMechanics: {
      requirement: { type: 'pair', diceCount: 3 },
      effect: { stun: true, heal: 25, healScalesWithWisdom: true },
      magicCost: 4,
      classRestriction: 'rogue',
    },
  },
  {
    id: 'spell-venomous-edge',
    name: 'Venomous Edge',
    type: 'spell',
    rarity: 'rare',
    tier: 3,
    price: 210,
    statBonuses: {},
    description:
      'Coat your blade in life-draining venom. +25 damage, 40% returned as HP. (Rogue only)',
    spellMechanics: {
      requirement: { type: 'straight', diceCount: 3, length: 3 },
      effect: { damage: 25, lifestealPct: 0.4 },
      magicCost: 4,
      classRestriction: 'rogue',
    },
  },
  {
    id: 'spell-phantom-assault',
    name: 'Phantom Assault',
    type: 'spell',
    rarity: 'epic',
    tier: 4,
    price: 500,
    lootOnly: true,
    statBonuses: {},
    description:
      'A ghost-strike from nowhere — impossible to defend against. +40 damage, bypass defense, 50% lifesteal. (Rogue only)',
    spellMechanics: {
      requirement: { type: 'three_of_a_kind', diceCount: 4 },
      effect: { damage: 40, bypassMonsterDef: true, lifestealPct: 0.5 },
      magicCost: 6,
      classRestriction: 'rogue',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Content-scaling PR3 — 56 new items (22 weapons / 12 armor / 16 accessories / 6 consumables)
  // Roughly doubles the catalog, fills L11–14 progression, introduces Spirit-stat
  // gear, thickens AGI coverage, and adds elixir-style multi-restore consumables.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── PR3 Weapons — Common ───────────────────────────────────────────────────
  {
    id: 'wooden-club',
    name: 'Wooden Club',
    type: 'weapon',
    rarity: 'common',
    tier: 1,
    price: 35,
    statBonuses: { strength: 2 },
    description: 'A heavy length of oak. Crude but reliable. +2 Strength.',
  },
  {
    id: 'apprentice-wand',
    name: 'Apprentice Wand',
    type: 'weapon',
    rarity: 'common',
    tier: 1,
    price: 40,
    statBonuses: { wisdom: 2 },
    description: 'Tipped with raw quartz. Channels minor magics. +2 Wisdom.',
  },
  {
    id: 'leather-sling',
    name: 'Leather Sling',
    type: 'weapon',
    rarity: 'common',
    tier: 1,
    price: 38,
    statBonuses: { strength: 1, agility: 1 },
    description: 'A simple cord and pouch. Strikes from a distance. +1 Strength, +1 Agility.',
  },
  {
    id: 'novice-charm',
    name: 'Novice Charm',
    type: 'weapon',
    rarity: 'common',
    tier: 1,
    price: 42,
    statBonuses: { spirit: 2 },
    description: 'A handheld focus carved with prayer-marks. +2 Spirit.',
  },

  // ── PR3 Weapons — Uncommon ─────────────────────────────────────────────────
  {
    id: 'steel-mace',
    name: 'Steel Mace',
    type: 'weapon',
    rarity: 'uncommon',
    tier: 2,
    price: 125,
    statBonuses: { strength: 5 },
    description: 'Flanged head, heavy haft. Crushes armor as it bites. +5 Strength.',
  },
  {
    id: 'crystal-staff',
    name: 'Crystal Staff',
    type: 'weapon',
    rarity: 'uncommon',
    tier: 2,
    price: 125,
    statBonuses: { wisdom: 5 },
    description: 'Capped with a humming amethyst. +5 Wisdom.',
  },
  {
    id: 'shortbow',
    name: 'Shortbow',
    type: 'weapon',
    rarity: 'uncommon',
    tier: 2,
    price: 130,
    statBonuses: { strength: 3, agility: 2 },
    description: 'Light enough to draw on the move. +3 Strength, +2 Agility.',
  },
  {
    id: 'spirit-totem',
    name: 'Spirit Totem',
    type: 'weapon',
    rarity: 'uncommon',
    tier: 2,
    price: 125,
    statBonuses: { spirit: 5 },
    description: 'A carved wooden idol, warm to the touch. +5 Spirit.',
  },
  {
    id: 'kris-blade',
    name: 'Kris Blade',
    type: 'weapon',
    rarity: 'uncommon',
    tier: 2,
    price: 135,
    statBonuses: { strength: 3, agility: 3 },
    description: 'Wavy-edged dagger that bleeds wounds open. +3 Strength, +3 Agility.',
  },

  // ── PR3 Weapons — Rare ─────────────────────────────────────────────────────
  {
    id: 'flameblade',
    name: 'Flameblade',
    type: 'weapon',
    rarity: 'rare',
    tier: 3,
    price: 360,
    statBonuses: { strength: 10 },
    description: 'Runed steel that bursts into fire on the swing. +10 Strength.',
  },
  {
    id: 'lightning-rod',
    name: 'Lightning Rod',
    type: 'weapon',
    rarity: 'rare',
    tier: 3,
    price: 360,
    statBonuses: { wisdom: 10 },
    description: 'A copper-wrapped haft that draws the storm. +10 Wisdom.',
  },
  {
    id: 'silver-rapier',
    name: 'Silver Rapier',
    type: 'weapon',
    rarity: 'rare',
    tier: 3,
    price: 370,
    statBonuses: { strength: 6, agility: 5 },
    description: 'A duelist’s blade — fast as breath. +6 Strength, +5 Agility.',
  },
  {
    id: 'moonstaff',
    name: 'Moonstaff',
    type: 'weapon',
    rarity: 'rare',
    tier: 3,
    price: 370,
    statBonuses: { wisdom: 6, spirit: 5 },
    description: 'A staff carved from moon-touched yew. +6 Wisdom, +5 Spirit.',
  },
  {
    id: 'starfall-bow',
    name: 'Starfall Bow',
    type: 'weapon',
    rarity: 'rare',
    tier: 3,
    price: 380,
    statBonuses: { strength: 6, agility: 4 },
    description: 'Looses arrows that streak like falling stars. +6 Strength, +4 Agility.',
  },

  // ── PR3 Weapons — Epic ─────────────────────────────────────────────────────
  {
    id: 'soulreaver',
    name: 'Soulreaver',
    type: 'weapon',
    rarity: 'epic',
    tier: 4,
    price: 720,
    statBonuses: { strength: 14 },
    description: 'A black blade that whispers in dying ears. +14 Strength.',
  },
  {
    id: 'astral-tome',
    name: 'Astral Tome',
    type: 'weapon',
    rarity: 'epic',
    tier: 4,
    price: 720,
    statBonuses: { wisdom: 14 },
    description: 'Pages of star-light, never two the same. +14 Wisdom.',
  },
  {
    id: 'thunderclaws',
    name: 'Thunderclaws',
    type: 'weapon',
    rarity: 'epic',
    tier: 4,
    price: 760,
    statBonuses: { strength: 10, agility: 6 },
    description: 'Twin curved daggers that snap with static. +10 Strength, +6 Agility.',
  },
  {
    id: 'spirit-channeler',
    name: 'Spirit Channeler',
    type: 'weapon',
    rarity: 'epic',
    tier: 4,
    price: 740,
    statBonuses: { wisdom: 10, spirit: 6 },
    description: 'A focus carved from a saint’s rib. +10 Wisdom, +6 Spirit.',
  },

  // ── PR3 Weapons — Legendary ────────────────────────────────────────────────
  {
    id: 'world-ender',
    name: 'World-Ender',
    type: 'weapon',
    rarity: 'legendary',
    tier: 5,
    price: 2200,
    lootOnly: true,
    statBonuses: { strength: 22 },
    description: 'The blade fated to sunder the last city. +22 Strength.',
  },
  {
    id: 'cosmic-codex',
    name: 'Cosmic Codex',
    type: 'weapon',
    rarity: 'legendary',
    tier: 5,
    price: 2200,
    lootOnly: true,
    statBonuses: { wisdom: 22 },
    description: 'A book that reads its reader. +22 Wisdom.',
  },
  {
    id: 'shadowblade-zenith',
    name: 'Shadowblade Zenith',
    type: 'weapon',
    rarity: 'legendary',
    tier: 5,
    price: 2300,
    lootOnly: true,
    statBonuses: { strength: 14, agility: 10 },
    description: 'Twin spectral edges — they strike between heartbeats. +14 Strength, +10 Agility.',
  },
  {
    id: 'crown-of-mind',
    name: 'Crown of Mind',
    type: 'weapon',
    rarity: 'legendary',
    tier: 5,
    price: 2300,
    lootOnly: true,
    statBonuses: { wisdom: 18, spirit: 12 },
    description:
      'A diadem-focus worn at the brow. Magic flows through its bearer. +18 Wisdom, +12 Spirit.',
  },

  // ── PR3 Armor — Common ─────────────────────────────────────────────────────
  {
    id: 'cloth-shirt',
    name: 'Cloth Shirt',
    type: 'armor',
    rarity: 'common',
    tier: 1,
    price: 30,
    statBonuses: { defense: 1, stamina: 1 },
    description: 'Breathes well. Stops nothing. +1 Defense, +1 Stamina.',
  },
  {
    id: 'studded-jerkin',
    name: 'Studded Jerkin',
    type: 'armor',
    rarity: 'common',
    tier: 1,
    price: 40,
    statBonuses: { defense: 2, agility: 1 },
    description: 'Iron studs over hardened leather. +2 Defense, +1 Agility.',
  },

  // ── PR3 Armor — Uncommon ───────────────────────────────────────────────────
  {
    id: 'scale-mail',
    name: 'Scale Mail',
    type: 'armor',
    rarity: 'uncommon',
    tier: 2,
    price: 115,
    statBonuses: { defense: 5 },
    description: 'Overlapping bronze scales. +5 Defense.',
  },
  {
    id: 'mage-vestments',
    name: 'Mage Vestments',
    type: 'armor',
    rarity: 'uncommon',
    tier: 2,
    price: 130,
    statBonuses: { defense: 3, wisdom: 3 },
    description: 'Embroidered with arcane sigils. +3 Defense, +3 Wisdom.',
  },
  {
    id: 'reflex-leathers',
    name: 'Reflex Leathers',
    type: 'armor',
    rarity: 'uncommon',
    tier: 2,
    price: 130,
    statBonuses: { defense: 3, agility: 3 },
    description: 'Cut for movement. Light, quiet, quick. +3 Defense, +3 Agility.',
  },

  // ── PR3 Armor — Rare ───────────────────────────────────────────────────────
  {
    id: 'mithril-mail',
    name: 'Mithril Mail',
    type: 'armor',
    rarity: 'rare',
    tier: 3,
    price: 350,
    statBonuses: { defense: 10 },
    description: 'Featherlight elven mail. +10 Defense.',
  },
  {
    id: 'oracle-robes',
    name: 'Oracle Robes',
    type: 'armor',
    rarity: 'rare',
    tier: 3,
    price: 340,
    statBonuses: { defense: 6, wisdom: 5 },
    description: 'Worn by the temple seers. +6 Defense, +5 Wisdom.',
  },
  {
    id: 'silent-cloak',
    name: 'Silent Cloak',
    type: 'armor',
    rarity: 'rare',
    tier: 3,
    price: 360,
    statBonuses: { defense: 5, agility: 6 },
    description: 'Footsteps fade in its hem. +5 Defense, +6 Agility.',
  },

  // ── PR3 Armor — Epic ───────────────────────────────────────────────────────
  {
    id: 'aegis-of-light',
    name: 'Aegis of Light',
    type: 'armor',
    rarity: 'epic',
    tier: 4,
    price: 700,
    statBonuses: { defense: 14, spirit: 4 },
    description: 'Plate that glows faintly even in shadow. +14 Defense, +4 Spirit.',
  },
  {
    id: 'shadowstep-coat',
    name: 'Shadowstep Coat',
    type: 'armor',
    rarity: 'epic',
    tier: 4,
    price: 680,
    statBonuses: { defense: 10, agility: 8 },
    description: 'A long coat of woven dusk. +10 Defense, +8 Agility.',
  },

  // ── PR3 Armor — Legendary ──────────────────────────────────────────────────
  {
    id: 'guardian-bulwark',
    name: 'Guardian Bulwark',
    type: 'armor',
    rarity: 'legendary',
    tier: 5,
    price: 1900,
    lootOnly: true,
    statBonuses: { defense: 22, health: 8 },
    description: 'Plate forged for a vow that outlived its bearer. +22 Defense, +8 Health.',
  },
  {
    id: 'starfire-vestments',
    name: 'Starfire Vestments',
    type: 'armor',
    rarity: 'legendary',
    tier: 5,
    price: 1900,
    lootOnly: true,
    statBonuses: { defense: 14, wisdom: 10, spirit: 6 },
    description: 'Robes woven from caught starfire. +14 Defense, +10 Wisdom, +6 Spirit.',
  },

  // ── PR3 Accessories — Common ───────────────────────────────────────────────
  {
    id: 'speed-anklet',
    name: 'Speed Anklet',
    type: 'accessory',
    rarity: 'common',
    tier: 1,
    price: 32,
    statBonuses: { agility: 2 },
    description: 'A copper band that quickens the step. +2 Agility.',
  },
  {
    id: 'focus-pebble',
    name: 'Focus Pebble',
    type: 'accessory',
    rarity: 'common',
    tier: 1,
    price: 30,
    statBonuses: { wisdom: 2 },
    description: 'A river stone polished into a focus. +2 Wisdom.',
  },
  {
    id: 'spirit-pendant',
    name: 'Spirit Pendant',
    type: 'accessory',
    rarity: 'common',
    tier: 1,
    price: 32,
    statBonuses: { spirit: 2 },
    description: 'A bone carving on a leather thong. +2 Spirit.',
  },

  // ── PR3 Accessories — Uncommon ─────────────────────────────────────────────
  {
    id: 'agility-band',
    name: 'Agility Band',
    type: 'accessory',
    rarity: 'uncommon',
    tier: 2,
    price: 100,
    statBonuses: { agility: 4 },
    description: 'Tightens the reflexes. +4 Agility.',
  },
  {
    id: 'silver-chalice',
    name: 'Silver Chalice',
    type: 'accessory',
    rarity: 'uncommon',
    tier: 2,
    price: 110,
    statBonuses: { spirit: 3, wisdom: 2 },
    description: 'A small ceremonial cup, ever-warm. +3 Spirit, +2 Wisdom.',
  },
  {
    id: 'rune-bracelet',
    name: 'Rune Bracelet',
    type: 'accessory',
    rarity: 'uncommon',
    tier: 2,
    price: 105,
    statBonuses: { wisdom: 3, spirit: 2 },
    description: 'A circle of carved runes. +3 Wisdom, +2 Spirit.',
  },
  {
    id: 'thief-gloves',
    name: 'Thief Gloves',
    type: 'accessory',
    rarity: 'uncommon',
    tier: 2,
    price: 105,
    statBonuses: { strength: 3, agility: 3 },
    description: 'Soft leather, padded fingertips. +3 Strength, +3 Agility.',
  },

  // ── PR3 Accessories — Rare ─────────────────────────────────────────────────
  {
    id: 'wind-walker-boots',
    name: 'Wind-Walker Boots',
    type: 'accessory',
    rarity: 'rare',
    tier: 3,
    price: 300,
    statBonuses: { agility: 6 },
    description: 'They leave no print, even in snow. +6 Agility.',
  },
  {
    id: 'sage-circlet',
    name: 'Sage Circlet',
    type: 'accessory',
    rarity: 'rare',
    tier: 3,
    price: 310,
    statBonuses: { wisdom: 5, spirit: 4 },
    description: 'A silver band that clears the mind. +5 Wisdom, +4 Spirit.',
  },
  {
    id: 'rogues-talisman',
    name: 'Rogue’s Talisman',
    type: 'accessory',
    rarity: 'rare',
    tier: 3,
    price: 305,
    statBonuses: { agility: 5, strength: 4 },
    description: 'Lucky charm of the thieves’ guild. +5 Agility, +4 Strength.',
  },
  {
    id: 'tortoise-charm',
    name: 'Tortoise Charm',
    type: 'accessory',
    rarity: 'rare',
    tier: 3,
    price: 290,
    statBonuses: { defense: 6, health: 4 },
    description: 'Carved jade tortoise. Slow, sturdy, eternal. +6 Defense, +4 Health.',
  },

  // ── PR3 Accessories — Epic ─────────────────────────────────────────────────
  {
    id: 'phoenix-feather',
    name: 'Phoenix Feather',
    type: 'accessory',
    rarity: 'epic',
    tier: 4,
    price: 640,
    statBonuses: { spirit: 6, wisdom: 6 },
    description: 'A single ember-bright plume. +6 Spirit, +6 Wisdom.',
  },
  {
    id: 'storm-stride',
    name: 'Storm Stride',
    type: 'accessory',
    rarity: 'epic',
    tier: 4,
    price: 660,
    statBonuses: { agility: 8, strength: 4 },
    description: 'Heel-bands that crackle with each step. +8 Agility, +4 Strength.',
  },
  {
    id: 'sigil-of-clarity',
    name: 'Sigil of Clarity',
    type: 'accessory',
    rarity: 'epic',
    tier: 4,
    price: 650,
    statBonuses: { wisdom: 7, spirit: 5 },
    description: 'A pendant that thins the noise of the world. +7 Wisdom, +5 Spirit.',
  },

  // ── PR3 Accessories — Legendary ────────────────────────────────────────────
  {
    id: 'eye-of-eternity',
    name: 'Eye of Eternity',
    type: 'accessory',
    rarity: 'legendary',
    tier: 5,
    price: 1700,
    lootOnly: true,
    statBonuses: { spirit: 10, wisdom: 8, agility: 6 },
    description: 'It sees a moment ahead. +10 Spirit, +8 Wisdom, +6 Agility.',
  },
  {
    id: 'twin-suns-pendant',
    name: 'Twin Suns Pendant',
    type: 'accessory',
    rarity: 'legendary',
    tier: 5,
    price: 1700,
    lootOnly: true,
    statBonuses: { strength: 10, defense: 10, stamina: 6 },
    description:
      'Two golden discs spinning in eternal opposition. +10 Strength, +10 Defense, +6 Stamina.',
  },

  // ── PR3 Consumables — Epic single-resource ─────────────────────────────────
  {
    id: 'arcane-elixir',
    name: 'Arcane Elixir',
    type: 'consumable',
    rarity: 'epic',
    tier: 4,
    price: 420,
    statBonuses: {},
    effect: { type: 'restore_magic', amount: 120 },
    description: 'Pure distilled magic. Restores 120 Magic.',
  },
  {
    id: 'titan-elixir',
    name: 'Titan Elixir',
    type: 'consumable',
    rarity: 'epic',
    tier: 4,
    price: 380,
    statBonuses: {},
    effect: { type: 'restore_stamina', amount: 200 },
    description: 'A draught that floods the limbs with strength. Restores 200 Stamina.',
  },

  // ── PR3 Consumables — Legendary HP ─────────────────────────────────────────
  {
    id: 'phoenix-draught',
    name: 'Phoenix Draught',
    type: 'consumable',
    rarity: 'legendary',
    tier: 5,
    price: 1200,
    lootOnly: true,
    statBonuses: {},
    effect: { type: 'restore_hp', amount: 350 },
    description: 'Bottled phoenix-fire. Restores 350 HP.',
  },

  // ── PR3 Consumables — Utility multi-restore ────────────────────────────────
  {
    id: 'battle-stim',
    name: 'Battle Stim',
    type: 'consumable',
    rarity: 'uncommon',
    tier: 2,
    price: 90,
    statBonuses: {},
    effect: {
      type: 'multi',
      restores: [
        { resource: 'hp', amount: 30 },
        { resource: 'stamina', amount: 30 },
        { resource: 'magic', amount: 20 },
      ],
    },
    description: 'Field-grade stimulant. Restores 30 HP, 30 Stamina, and 20 Magic.',
  },
  {
    id: 'spirit-tea',
    name: 'Spirit Tea',
    type: 'consumable',
    rarity: 'rare',
    tier: 3,
    price: 180,
    statBonuses: {},
    effect: {
      type: 'multi',
      restores: [
        { resource: 'hp', amount: 30 },
        { resource: 'magic', amount: 60 },
      ],
    },
    description: 'Brewed in monasteries from chant-steam. Restores 30 HP and 60 Magic.',
  },
  {
    id: 'sages-brew',
    name: 'Sage’s Brew',
    type: 'consumable',
    rarity: 'epic',
    tier: 4,
    price: 360,
    statBonuses: {},
    effect: {
      type: 'multi',
      restores: [
        { resource: 'stamina', amount: 60 },
        { resource: 'magic', amount: 60 },
      ],
    },
    description: 'Bitter, smoke-dark. Restores 60 Stamina and 60 Magic.',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Content-scaling PR4 — 14 new spells (35-spell catalog).
  // Introduces the `dotDamage` bleed/burn SpellEffect (ticks each offensive round,
  // bypassing defense, stacks with dungeon venom). 11 buyable spells grow the
  // weekly shop rotation; 3 legendary class spells are loot-only and drop from
  // the Ancient Dragon King + the L11–14 arena monsters.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── PR4 Spells — Generic (all classes) ────────────────────────────────────
  {
    id: 'spell-cinder-spark',
    name: 'Cinder Spark',
    type: 'spell',
    rarity: 'uncommon',
    tier: 2,
    price: 110,
    statBonuses: {},
    description:
      'A spark that catches and smoulders. +8 + WIS damage, then burns for 5/round (3 rounds).',
    spellMechanics: {
      requirement: { type: 'sum_gte', diceCount: 2, value: 7 },
      effect: { damage: 8, damageScalesWithWisdom: true, dotDamage: { perRound: 5, rounds: 3 } },
      magicCost: 3,
      classRestriction: 'all',
    },
  },
  {
    id: 'spell-soothing-light',
    name: 'Soothing Light',
    type: 'spell',
    rarity: 'uncommon',
    tier: 2,
    price: 95,
    statBonuses: {},
    description: 'A warm glow that mends and steadies. Restores 35 + WIS HP and 15 Stamina.',
    spellMechanics: {
      requirement: { type: 'sum_gte', diceCount: 2, value: 8 },
      effect: { heal: 35, healScalesWithWisdom: true, restoreStamina: 15 },
      magicCost: 3,
      classRestriction: 'all',
    },
  },
  {
    id: 'spell-emberstorm',
    name: 'Emberstorm',
    type: 'spell',
    rarity: 'rare',
    tier: 3,
    price: 190,
    statBonuses: {},
    description: 'A whirl of burning cinders. +18 + WIS damage, then burns for 8/round (3 rounds).',
    spellMechanics: {
      requirement: { type: 'pair', diceCount: 3 },
      effect: { damage: 18, damageScalesWithWisdom: true, dotDamage: { perRound: 8, rounds: 3 } },
      magicCost: 4,
      classRestriction: 'all',
    },
  },
  {
    id: 'spell-radiant-bulwark',
    name: 'Radiant Bulwark',
    type: 'spell',
    rarity: 'rare',
    tier: 3,
    price: 200,
    statBonuses: {},
    description: 'A shield of holy light. Restores 50 + WIS HP and grants +10 Defense this round.',
    spellMechanics: {
      requirement: { type: 'straight', diceCount: 3, length: 3 },
      effect: { heal: 50, healScalesWithWisdom: true, defenseBoost: 10 },
      magicCost: 5,
      classRestriction: 'all',
    },
  },
  {
    id: 'spell-cataclysm',
    name: 'Cataclysm',
    type: 'spell',
    rarity: 'epic',
    tier: 4,
    price: 520,
    statBonuses: {},
    description:
      'Rain ruin on your foe. +35 + WIS damage, bypasses defense, then burns for 10/round (2 rounds).',
    spellMechanics: {
      requirement: { type: 'three_of_a_kind', diceCount: 4 },
      effect: {
        damage: 35,
        damageScalesWithWisdom: true,
        bypassMonsterDef: true,
        dotDamage: { perRound: 10, rounds: 2 },
      },
      magicCost: 6,
      classRestriction: 'all',
    },
  },
  {
    id: 'spell-divine-sanctuary',
    name: 'Divine Sanctuary',
    type: 'spell',
    rarity: 'epic',
    tier: 4,
    price: 520,
    statBonuses: {},
    description:
      'A sanctum of light — heal, stun, and shield. Restores 90 + WIS HP, stuns, +12 Defense this round.',
    spellMechanics: {
      requirement: { type: 'three_of_a_kind', diceCount: 4 },
      effect: { heal: 90, healScalesWithWisdom: true, stun: true, defenseBoost: 12 },
      magicCost: 6,
      classRestriction: 'all',
    },
  },

  // ── PR4 Spells — Warrior ──────────────────────────────────────────────────
  {
    id: 'spell-rending-cleave',
    name: 'Rending Cleave',
    type: 'spell',
    rarity: 'rare',
    tier: 3,
    price: 210,
    statBonuses: {},
    description:
      'A cleave that opens deep wounds. +22 damage, then bleeds for 8/round (3 rounds). (Warrior only)',
    spellMechanics: {
      requirement: { type: 'exact_value', diceCount: 3, value: 5 },
      effect: { damage: 22, dotDamage: { perRound: 8, rounds: 3 } },
      magicCost: 4,
      classRestriction: 'warrior',
    },
  },
  {
    id: 'spell-seismic-slam',
    name: 'Seismic Slam',
    type: 'spell',
    rarity: 'epic',
    tier: 4,
    price: 520,
    statBonuses: {},
    description:
      'Shatter the ground beneath your foe. +38 damage, stuns, then bleeds for 9/round (2 rounds). (Warrior only)',
    spellMechanics: {
      requirement: { type: 'three_of_a_kind', diceCount: 4 },
      effect: { damage: 38, stun: true, dotDamage: { perRound: 9, rounds: 2 } },
      magicCost: 6,
      classRestriction: 'warrior',
    },
  },

  // ── PR4 Spells — Wizard ───────────────────────────────────────────────────
  {
    id: 'spell-incinerate',
    name: 'Incinerate',
    type: 'spell',
    rarity: 'rare',
    tier: 3,
    price: 210,
    statBonuses: {},
    description:
      'Set your foe ablaze. +16 + WIS damage, then burns hard for 12/round (3 rounds). (Wizard only)',
    spellMechanics: {
      requirement: { type: 'pair', diceCount: 3 },
      effect: { damage: 16, damageScalesWithWisdom: true, dotDamage: { perRound: 12, rounds: 3 } },
      magicCost: 4,
      classRestriction: 'wizard',
    },
  },
  {
    id: 'spell-glacial-prison',
    name: 'Glacial Prison',
    type: 'spell',
    rarity: 'epic',
    tier: 4,
    price: 540,
    statBonuses: {},
    description:
      'Entomb your foe in ice. +30 + WIS damage, bypasses defense, and stuns. (Wizard only)',
    spellMechanics: {
      requirement: { type: 'three_of_a_kind', diceCount: 4 },
      effect: { damage: 30, damageScalesWithWisdom: true, bypassMonsterDef: true, stun: true },
      magicCost: 7,
      classRestriction: 'wizard',
    },
  },

  // ── PR4 Spells — Rogue ────────────────────────────────────────────────────
  {
    id: 'spell-rupture',
    name: 'Rupture',
    type: 'spell',
    rarity: 'rare',
    tier: 3,
    price: 210,
    statBonuses: {},
    description:
      'A vicious cut that won’t clot. +20 damage, bleeds for 7/round (3 rounds), 30% lifesteal. (Rogue only)',
    spellMechanics: {
      requirement: { type: 'straight', diceCount: 3, length: 3 },
      effect: { damage: 20, dotDamage: { perRound: 7, rounds: 3 }, lifestealPct: 0.3 },
      magicCost: 4,
      classRestriction: 'rogue',
    },
  },

  // ── PR4 Spells — Legendary (loot-only, drop from Dragon King + L11–14) ─────
  // When adding a legendary spell, also update LEGENDARY_ITEM_IDS in
  // functions/src/gameLogic/achievements.ts — the parity test will catch drift.
  {
    id: 'spell-worldbreaker',
    name: 'Worldbreaker',
    type: 'spell',
    rarity: 'legendary',
    tier: 5,
    price: 1500,
    lootOnly: true,
    statBonuses: {},
    description:
      'The strike that ends sieges. +60 damage, bypasses defense, and stuns. (Warrior only)',
    spellMechanics: {
      requirement: { type: 'straight', diceCount: 4, length: 4 },
      effect: { damage: 60, bypassMonsterDef: true, stun: true },
      magicCost: 8,
      classRestriction: 'warrior',
    },
  },
  {
    id: 'spell-stellar-collapse',
    name: 'Stellar Collapse',
    type: 'spell',
    rarity: 'legendary',
    tier: 5,
    price: 1500,
    lootOnly: true,
    statBonuses: {},
    description:
      'Collapse a dying star onto your foe. +50 + WIS damage, bypasses defense, then burns for 10/round (3 rounds). (Wizard only)',
    spellMechanics: {
      requirement: { type: 'three_of_a_kind', diceCount: 5 },
      effect: {
        damage: 50,
        damageScalesWithWisdom: true,
        bypassMonsterDef: true,
        dotDamage: { perRound: 10, rounds: 3 },
      },
      magicCost: 9,
      classRestriction: 'wizard',
    },
  },
  {
    id: 'spell-thousand-cuts',
    name: 'Thousand Cuts',
    type: 'spell',
    rarity: 'legendary',
    tier: 5,
    price: 1500,
    lootOnly: true,
    statBonuses: {},
    description:
      'A blur of blades — each one drinks. +35 damage, 60% lifesteal, then bleeds for 8/round (3 rounds). (Rogue only)',
    spellMechanics: {
      requirement: { type: 'pair', diceCount: 4 },
      effect: { damage: 35, lifestealPct: 0.6, dotDamage: { perRound: 8, rounds: 3 } },
      magicCost: 7,
      classRestriction: 'rogue',
    },
  },
];

const ITEM_MAP = new Map(ITEM_CATALOG.map((item) => [item.id, item]));

export function getItemById(id: string): ItemDef | undefined {
  return ITEM_MAP.get(id);
}

// ── Consumable-effect formatting helpers ─────────────────────────────────────
// Single source of truth for how consumable effects render — keeps inventory,
// shop, and combat surfaces in sync as new effect variants (e.g., `multi`) ship.

const RESOURCE_LABEL = { hp: 'HP', stamina: 'Stamina', magic: 'Magic' } as const;
const RESOURCE_LABEL_SHORT = { hp: 'HP', stamina: 'Stam', magic: 'Mag' } as const;

/**
 * Human-readable description of a consumable effect.
 *  - single-restore  → "+25 HP"
 *  - multi-restore   → "+30 HP / +30 Stam / +20 Mag"
 *
 * `short=true` uses abbreviated resource labels so tight badges still fit.
 */
export function describeConsumableEffect(effect: ConsumableEffect, short = false): string {
  const label: Record<'hp' | 'stamina' | 'magic', string> = short
    ? RESOURCE_LABEL_SHORT
    : RESOURCE_LABEL;
  switch (effect.type) {
    case 'restore_hp':
      return `+${effect.amount} ${label.hp}`;
    case 'restore_stamina':
      return `+${effect.amount} ${label.stamina}`;
    case 'restore_magic':
      return `+${effect.amount} ${label.magic}`;
    case 'multi':
      return effect.restores.map((r) => `+${r.amount} ${label[r.resource]}`).join(' / ');
  }
}

const RESOURCE_TAILWIND = {
  hp: 'text-emerald-600',
  stamina: 'text-amber-600',
  magic: 'text-violet-600',
} as const;
const RESOURCE_HEX = { hp: '#059669', stamina: '#d97706', magic: '#7c3aed' } as const;
const MIXED_TAILWIND = 'text-sky-600';
const MIXED_HEX = '#0284c7';

function dominantResource(effect: ConsumableEffect): 'hp' | 'stamina' | 'magic' | 'mixed' {
  if (effect.type === 'restore_hp') return 'hp';
  if (effect.type === 'restore_stamina') return 'stamina';
  if (effect.type === 'restore_magic') return 'magic';
  return 'mixed';
}

/** Tailwind color class for the effect's primary resource (or "mixed" for multi). */
export function consumableEffectColorClass(effect: ConsumableEffect): string {
  const r = dominantResource(effect);
  return r === 'mixed' ? MIXED_TAILWIND : RESOURCE_TAILWIND[r];
}

/** Inline hex color for surfaces that don't render Tailwind utilities (e.g., inline styles). */
export function consumableEffectColorHex(effect: ConsumableEffect): string {
  const r = dominantResource(effect);
  return r === 'mixed' ? MIXED_HEX : RESOURCE_HEX[r];
}

import type { ItemDef, ItemRarity } from '@/types';

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
  uncommon: { header: 'bg-green-600', border: 'border-green-300', glow: '' },
  rare: { header: 'bg-blue-600', border: 'border-blue-300', glow: 'shadow-blue-100' },
  epic: { header: 'bg-purple-600', border: 'border-purple-300', glow: 'shadow-purple-100' },
  legendary: { header: 'bg-orange-500', border: 'border-orange-300', glow: 'shadow-orange-100' },
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
];

export function getItemById(id: string): ItemDef | undefined {
  return ITEM_CATALOG.find((item) => item.id === id);
}

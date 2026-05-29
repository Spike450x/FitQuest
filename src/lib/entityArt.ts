import type { ItemRarity, SpellEffect } from '@/types';
import type { FrameTint } from '@/components/art/HeraldicFrame';
import type { SpellEffectKey } from '@/components/art/silhouettes';

/**
 * Effect → silhouette key for the spell catalog. Mirrors the existing
 * `getSpellEmoji` mapping so the SpellCard's center figure can be a
 * heraldic-framed silhouette instead of an OS emoji.
 */
export function spellEffectKey(effect: SpellEffect): SpellEffectKey {
  if (effect.stun && effect.damage) return 'magic-damage';
  if (effect.stun && effect.heal) return 'stun-heal';
  if (effect.stun) return 'stun';
  if (effect.lifestealPct) return 'lifesteal';
  // Burn / bleed DoT spells use the crackling fire school (sound + art).
  if (effect.dotDamage) return 'fire';
  if (effect.bypassMonsterDef && effect.damage) return 'magic-damage';
  if (effect.damage && effect.heal) return 'fire';
  if (effect.damage) return 'damage';
  if (effect.heal) return 'heal';
  if (effect.restoreStamina) return 'stamina';
  if (effect.defenseBoost) return 'defense';
  return 'damage';
}

/**
 * Rarity → heraldic frame tint. Items inherit the rarity scheme so
 * legendary loot tints orange, epic tints purple, etc.
 */
export function rarityTint(rarity: ItemRarity): FrameTint {
  switch (rarity) {
    case 'common':
      return 'gray';
    case 'uncommon':
      return 'green';
    case 'rare':
      return 'blue';
    case 'epic':
      return 'purple';
    case 'legendary':
      return 'orange';
  }
}

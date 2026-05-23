'use client';

import type { CSSProperties } from 'react';
import { HeraldicFrame, type FrameTint, type FrameVariant } from './HeraldicFrame';
import {
  ABILITY_SILHOUETTES,
  ACHIEVEMENT_SILHOUETTES,
  ACTIVITY_SILHOUETTES,
  CLASS_SILHOUETTES,
  DUNGEON_SILHOUETTES,
  MONSTER_SILHOUETTES,
  SPELL_SILHOUETTES,
  SUBCLASS_SILHOUETTES,
  type SpellEffectKey,
} from './silhouettes';
import { ITEM_SILHOUETTES } from './item-silhouettes';

export type EntityCategory =
  | 'monster'
  | 'class'
  | 'subclass'
  | 'ability'
  | 'spell'
  | 'activity'
  | 'achievement'
  | 'dungeon'
  | 'item';

export type EntitySize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<EntitySize, number> = {
  xs: 24,
  sm: 36,
  md: 56,
  lg: 88,
  xl: 128,
};

interface EntityArtProps {
  category: EntityCategory;
  /** Entity id — e.g. `goblin-scout`, `warrior`, `power-strike`. */
  id: string;
  /** Optional frame variant. Defaults vary by category. */
  variant?: FrameVariant;
  /** Optional tint override. Defaults vary by category. */
  tint?: FrameTint;
  /** Pixel size shorthand. */
  size?: EntitySize;
  /** Optional emoji shown if no silhouette is registered for this id. */
  fallbackEmoji?: string;
  /** Optional ribbon name overlaid on the lower frame. */
  ribbon?: string;
  className?: string;
  style?: CSSProperties;
  /** Decorative — set false to expose to screen readers via `aria-label`. */
  ariaLabel?: string;
}

/**
 * Tint defaults per category — keeps the visual language consistent without
 * forcing every callsite to spell out the color.
 */
function defaultTint(category: EntityCategory, id: string): FrameTint {
  switch (category) {
    case 'monster': {
      // Monsters tint by level / theme of the encounter.
      const ROSE = ['ancient-dragon', 'dark-mage', 'orc-grunt'];
      const SLATE = ['skeleton-warrior', 'stone-troll', 'dark-wolf'];
      const PURPLE = ['cave-spider', 'lich-king'];
      if (ROSE.includes(id)) return 'rose';
      if (SLATE.includes(id)) return 'slate';
      if (PURPLE.includes(id)) return 'purple';
      return 'green';
    }
    case 'class':
      if (id === 'warrior') return 'rose';
      if (id === 'wizard') return 'violet';
      return 'emerald';
    case 'subclass':
      if (['berserker', 'paladin'].includes(id)) return 'rose';
      if (['archmage', 'warlock'].includes(id)) return 'violet';
      return 'emerald';
    case 'ability':
      return 'amber';
    case 'spell':
      return 'violet';
    case 'activity':
      return 'sky';
    case 'achievement':
      return 'amber';
    case 'dungeon':
      if (id === 'goblin-caves') return 'green';
      if (id === 'spider-lair') return 'blue';
      if (id === 'dark-sanctum') return 'purple';
      if (id === 'dragons-keep') return 'orange';
      return 'slate';
    case 'item':
      // For items, the caller should pass a rarity-derived tint explicitly.
      return 'gray';
  }
}

function defaultVariant(category: EntityCategory): FrameVariant {
  switch (category) {
    case 'class':
    case 'subclass':
    case 'dungeon':
      return 'shield';
    case 'achievement':
      return 'medallion';
    case 'spell':
    case 'ability':
      return 'sigil';
    default:
      return 'medallion';
  }
}

function getSilhouette(category: EntityCategory, id: string): (() => React.ReactNode) | undefined {
  switch (category) {
    case 'monster':
      return MONSTER_SILHOUETTES[id];
    case 'class':
      return CLASS_SILHOUETTES[id];
    case 'subclass':
      return SUBCLASS_SILHOUETTES[id];
    case 'ability':
      return ABILITY_SILHOUETTES[id];
    case 'spell':
      return SPELL_SILHOUETTES[id as SpellEffectKey];
    case 'activity':
      return ACTIVITY_SILHOUETTES[id];
    case 'achievement':
      return ACHIEVEMENT_SILHOUETTES[id];
    case 'dungeon':
      return DUNGEON_SILHOUETTES[id];
    case 'item':
      return ITEM_SILHOUETTES[id];
  }
}

/**
 * Canonical render path for every entity portrait, badge, or crest.
 *
 * Renders a heraldic-framed silhouette when a custom figure is registered
 * for `{category, id}`; otherwise renders the supplied emoji fallback so
 * legacy data never shows a broken slot.
 *
 * ```tsx
 * <EntityArt category="monster" id="ancient-dragon" size="lg" fallbackEmoji="🐉" />
 * <EntityArt category="class" id={character.class} size="md" fallbackEmoji={classDef.emoji} />
 * ```
 */
export function EntityArt({
  category,
  id,
  variant,
  tint,
  size = 'md',
  fallbackEmoji,
  ribbon,
  className = '',
  style,
  ariaLabel,
}: EntityArtProps) {
  const px = SIZE_PX[size];
  const Silhouette = getSilhouette(category, id);
  const accessible = ariaLabel
    ? { role: 'img' as const, 'aria-label': ariaLabel }
    : { 'aria-hidden': true as const };

  if (!Silhouette && process.env.NODE_ENV === 'development' && category === 'item') {
    console.warn(
      `[EntityArt] No silhouette for item id="${id}". Add it to ITEM_SILHOUETTES in item-silhouettes.tsx.`,
    );
  }

  if (!Silhouette) {
    // Fallback to the emoji rendered inside the same heraldic frame so the
    // layout doesn't shift between custom-art and legacy entities.
    return (
      <div
        {...accessible}
        className={`relative inline-flex items-center justify-center select-none ${className}`}
        style={{ width: px, height: px, fontSize: Math.round(px * 0.55), ...style }}
      >
        {fallbackEmoji ?? '❓'}
      </div>
    );
  }

  return (
    <div
      {...accessible}
      className={`relative inline-block select-none ${className}`}
      style={{ width: px, height: px, ...style }}
    >
      <HeraldicFrame
        variant={variant ?? defaultVariant(category)}
        tint={tint ?? defaultTint(category, id)}
        ribbon={ribbon}
        width={px}
        height={px}
      >
        <Silhouette />
      </HeraldicFrame>
    </div>
  );
}

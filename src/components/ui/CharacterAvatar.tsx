'use client';

import { EntityArt, type EntitySize } from '@/components/art/EntityArt';
import { resolveAvatar } from '@/lib/gameLogic/avatars';
import type { Character } from '@/types';

interface CharacterAvatarProps {
  character: Pick<Character, 'avatarId' | 'class' | 'name'>;
  size?: EntitySize;
  className?: string;
}

/**
 * Renders a character's chosen preset avatar (or the class crest fallback) via
 * the shared heraldic-art system. Used in the profile header and the layout
 * header button.
 */
export function CharacterAvatar({ character, size = 'md', className }: CharacterAvatarProps) {
  const { id, category, tint } = resolveAvatar(character);
  return (
    <EntityArt
      category={category}
      id={id}
      tint={tint}
      size={size}
      className={className}
      ariaLabel={`${character.name}'s avatar`}
      fallbackEmoji={character.name.charAt(0).toUpperCase()}
    />
  );
}

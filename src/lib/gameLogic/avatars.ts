import type { EntityCategory } from '@/components/art/EntityArt';
import type { FrameTint } from '@/components/art/HeraldicFrame';
import type { Character } from '@/types';

/**
 * Preset avatar catalog. Each option references an already-registered
 * heraldic silhouette ({@link EntityArt}) — there is no image upload and no
 * Firebase Storage. A player's choice is persisted as `Character.avatarId`
 * (the `id` field below); an unset avatar falls back to the class crest.
 */
export interface AvatarOption {
  /** Stored verbatim on `Character.avatarId`. */
  id: string;
  category: EntityCategory;
  label: string;
  tint?: FrameTint;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  // Classes
  { id: 'warrior', category: 'class', label: 'Warrior' },
  { id: 'wizard', category: 'class', label: 'Wizard' },
  { id: 'rogue', category: 'class', label: 'Rogue' },
  // Subclasses
  { id: 'berserker', category: 'subclass', label: 'Berserker' },
  { id: 'paladin', category: 'subclass', label: 'Paladin' },
  { id: 'archmage', category: 'subclass', label: 'Archmage' },
  { id: 'warlock', category: 'subclass', label: 'Warlock' },
  { id: 'assassin', category: 'subclass', label: 'Assassin' },
  { id: 'ranger', category: 'subclass', label: 'Ranger' },
  // Monster crests — for players who'd rather wear the foe's face
  { id: 'ancient-dragon', category: 'monster', label: 'Ancient Dragon' },
  { id: 'lich-king', category: 'monster', label: 'Lich King' },
  { id: 'storm-djinn', category: 'monster', label: 'Storm Djinn' },
  { id: 'skeleton-warrior', category: 'monster', label: 'Skeleton' },
  { id: 'orc-grunt', category: 'monster', label: 'Orc' },
  { id: 'cave-spider', category: 'monster', label: 'Spider' },
  // Achievement crests
  { id: 'dragonheart', category: 'achievement', label: 'Dragonheart' },
  { id: 'legendary-haul', category: 'achievement', label: 'Treasure' },
];

/** Lookup an avatar option by its stored id. */
export function getAvatarOption(id: string | undefined): AvatarOption | undefined {
  if (!id) return undefined;
  return AVATAR_OPTIONS.find((a) => a.id === id);
}

/**
 * Resolves the avatar to render for a character: the chosen preset, or the
 * class crest fallback when none is set (or the stored id is unknown).
 */
export function resolveAvatar(
  character: Pick<Character, 'avatarId' | 'class'>,
): Pick<AvatarOption, 'id' | 'category' | 'tint'> {
  return getAvatarOption(character.avatarId) ?? { id: character.class, category: 'class' };
}

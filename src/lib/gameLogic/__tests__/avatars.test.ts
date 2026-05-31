import { describe, it, expect } from 'vitest';
import { AVATAR_OPTIONS, getAvatarOption, resolveAvatar } from '../avatars';
import {
  CLASS_SILHOUETTES,
  SUBCLASS_SILHOUETTES,
  MONSTER_SILHOUETTES,
  ACHIEVEMENT_SILHOUETTES,
} from '@/components/art/silhouettes';

const REGISTRIES: Record<string, Record<string, unknown>> = {
  class: CLASS_SILHOUETTES,
  subclass: SUBCLASS_SILHOUETTES,
  monster: MONSTER_SILHOUETTES,
  achievement: ACHIEVEMENT_SILHOUETTES,
};

describe('AVATAR_OPTIONS', () => {
  it('every option references a registered silhouette', () => {
    for (const opt of AVATAR_OPTIONS) {
      const registry = REGISTRIES[opt.category];
      expect(registry, `no registry for category ${opt.category}`).toBeDefined();
      expect(registry[opt.id], `missing silhouette for ${opt.category}/${opt.id}`).toBeDefined();
    }
  });

  it('has unique ids', () => {
    const ids = AVATAR_OPTIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getAvatarOption', () => {
  it('returns the matching option', () => {
    expect(getAvatarOption('paladin')?.label).toBe('Paladin');
  });

  it('returns undefined for unknown or empty ids', () => {
    expect(getAvatarOption('does-not-exist')).toBeUndefined();
    expect(getAvatarOption(undefined)).toBeUndefined();
  });
});

describe('resolveAvatar', () => {
  it('falls back to the class crest when no avatar is set', () => {
    expect(resolveAvatar({ class: 'wizard', avatarId: undefined })).toEqual({
      id: 'wizard',
      category: 'class',
    });
  });

  it('falls back to the class crest for an unknown stored id', () => {
    expect(resolveAvatar({ class: 'rogue', avatarId: 'bogus' })).toEqual({
      id: 'rogue',
      category: 'class',
    });
  });

  it('returns the chosen preset when set', () => {
    const resolved = resolveAvatar({ class: 'warrior', avatarId: 'ancient-dragon' });
    expect(resolved.id).toBe('ancient-dragon');
    expect(resolved.category).toBe('monster');
  });
});

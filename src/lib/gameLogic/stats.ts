import { RESTORE, statCap } from './constants';
import type { ActivityType, Stats } from '@/types';

// ─── Resource Restore ─────────────────────────────────────────────────────────

export type ResourceType = 'hp' | 'stamina' | 'magic';

export interface ResourceRestore {
  resourceType: ResourceType;
  amount: number;
}

/**
 * Returns the resource type and raw restore amount for a restoration activity.
 * Nutrition → HP · Sleep → Stamina · Water → Magic · Meditation → Magic.
 * Returns null for pure-mastery activities (run / workout / steps).
 *
 * Meditation is both a mastery activity (builds Spirit) AND a restore activity
 * (restores Magic). The two effects compose — calculateResourceRestore handles
 * the restore half; mastery is awarded separately in the logActivity flow.
 */
export function calculateResourceRestore(
  activityType: ActivityType,
  amount: number,
): ResourceRestore | null {
  switch (activityType) {
    case 'nutrition':
      return { resourceType: 'hp', amount: Math.floor(amount * RESTORE.HP_PER_MEAL) };
    case 'sleep':
      return {
        resourceType: 'stamina',
        amount: Math.floor(amount * RESTORE.STAMINA_PER_SLEEP_HOUR),
      };
    case 'water':
      return { resourceType: 'magic', amount: Math.floor(amount * RESTORE.MAGIC_PER_WATER_GLASS) };
    case 'meditation':
      return {
        resourceType: 'magic',
        amount: Math.floor(amount * RESTORE.MAGIC_PER_MEDITATION_MINUTE),
      };
    default:
      return null;
  }
}

// ─── Stat application ─────────────────────────────────────────────────────────

/** Adds stat gains to existing stats, respecting per-stat caps. */
export function applyStatGains(
  current: Stats,
  gains: Partial<Stats>,
  characterLevel: number,
): Stats {
  return {
    strength: Math.min(
      current.strength + (gains.strength ?? 0),
      statCap('strength', characterLevel),
    ),
    stamina: Math.min(current.stamina + (gains.stamina ?? 0), statCap('stamina', characterLevel)),
    agility: Math.min(
      (current.agility ?? 0) + (gains.agility ?? 0),
      statCap('agility', characterLevel),
    ),
    health: Math.min(current.health + (gains.health ?? 0), statCap('health', characterLevel)),
    wisdom: Math.min(current.wisdom + (gains.wisdom ?? 0), statCap('wisdom', characterLevel)),
    defense: Math.min(
      (current.defense ?? 0) + (gains.defense ?? 0),
      statCap('defense', characterLevel),
    ),
    spirit: Math.min(
      (current.spirit ?? 0) + (gains.spirit ?? 0),
      statCap('spirit', characterLevel),
    ),
  };
}

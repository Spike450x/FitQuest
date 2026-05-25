import { getWeeklyPick } from '@/lib/gameLogic/rotation';
import type { ItemDef } from '@/types';

/** Number of spells shown in the weekly featured rotation. */
export const WEEKLY_SPELL_COUNT = 5;

/**
 * Returns the featured spell lineup for the given ISO week.
 * Pass an explicit weekKey ('YYYY-WW', e.g. '2026-20') for deterministic
 * behavior in tests; omit to use the current UTC ISO week.
 */
export function getWeeklySpells(spells: ItemDef[], weekKey?: string): ItemDef[] {
  return getWeeklyPick(spells, WEEKLY_SPELL_COUNT, weekKey);
}

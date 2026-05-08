'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';
import type { ItemRarity } from '@/types';
import { RARITY_BADGE } from '@/lib/gameLogic/items';

/**
 * Global toast renderer. Mounted once in the root layout.
 *
 * Use the helpers below (`toast.success`, `toastReward`, `toastLoot`) instead
 * of importing `sonner` directly so styling stays centralized.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      duration={3500}
      closeButton={false}
      richColors
      toastOptions={{
        className: 'rounded-xl shadow-lg border text-sm font-medium [&_[data-icon]]:text-base',
      }}
    />
  );
}

// ─── Re-export the base toast API ─────────────────────────────────────────────

export { toast };

// ─── FitQuest-flavored helpers ────────────────────────────────────────────────

/**
 * Reward toast for XP/gold gains. Used after quest claims, combat wins, etc.
 * Shows as a single line: "+250 XP · +75 gold".
 */
export function toastReward(opts: { xp?: number; gold?: number; emoji?: string; title?: string }) {
  const parts: string[] = [];
  if (opts.xp) parts.push(`+${opts.xp} XP`);
  if (opts.gold) parts.push(`+${opts.gold} gold`);
  const description = parts.join(' · ');
  toast.success(opts.title ?? `${opts.emoji ?? '⭐'} Reward earned`, {
    description: description || undefined,
  });
}

/**
 * Loot drop toast. Tinted by rarity; legendary drops get a longer dwell time.
 */
export function toastLoot(itemName: string, rarity: ItemRarity) {
  const dwell = rarity === 'legendary' ? 6000 : rarity === 'epic' ? 5000 : 3500;
  toast(`Loot: ${itemName}`, {
    description: `${rarity[0].toUpperCase()}${rarity.slice(1)} drop`,
    duration: dwell,
    className: `rounded-xl shadow-lg border ${RARITY_BADGE[rarity]} font-medium`,
  });
}

/** PR celebration toast (new personal record on an activity). */
export function toastPersonalRecord(activityLabel: string, value: number, unit: string) {
  toast.success(`🏆 New ${activityLabel} record!`, {
    description: `${value} ${unit}`,
    duration: 5000,
  });
}

/** Streak milestone — reached a new tier (Spark / Blaze / Inferno / Eternal). */
export function toastStreakTier(tierLabel: string, currentStreak: number) {
  toast(`🔥 ${tierLabel} streak unlocked!`, {
    description: `Day ${currentStreak} — bonus loot drops boosted.`,
    duration: 5000,
  });
}

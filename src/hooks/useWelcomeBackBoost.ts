'use client';

import { useCharacterStore } from '@/store/characterStore';
import { shouldOfferWelcomeBack } from '@/lib/gameLogic/streaks';

/**
 * Welcome-back session-scoped flag store.
 *
 * Pure derivation — no Firestore field, no localStorage, no banner-dismiss
 * persistence. The flag is true for the duration of the current session iff
 * the player was absent ≥ WELCOME_BACK_ABSENCE_DAYS AND has no active streak
 * tier. It clears the moment the player logs their first activity that
 * registers a streak update (the streak tier rises ≥ 3 days).
 *
 * Callers (combat XP calc + loot rolls) check this hook before applying the
 * normal streak multipliers and substitute the welcome-back values when
 * active. The dashboard layout mounts a `WelcomeBackBanner` driven by the
 * same condition.
 */
export function useWelcomeBackActive(): boolean {
  const character = useCharacterStore((s) => s.character);
  if (!character) return false;
  return shouldOfferWelcomeBack(
    character.streakData?.lastLogDate,
    character.streakData?.currentStreak ?? 0,
  );
}

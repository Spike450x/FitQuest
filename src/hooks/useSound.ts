'use client';

import { useCallback, useEffect, useState } from 'react';
import * as sounds from '@/lib/sounds';

const STORAGE_KEY = 'fitquest-sound-enabled';

type SoundKey = keyof typeof PLAY_FUNCS;

const PLAY_FUNCS = {
  click: sounds.playClick,
  diceRolling: sounds.playDiceRolling,
  diceSettle: sounds.playDiceSettle,
  attack: sounds.playAttack,
  magic: sounds.playMagic,
  hit: sounds.playHit,
  crit: sounds.playCrit,
  fail: sounds.playFail,
  claim: sounds.playClaim,
  loot: sounds.playLoot,
  levelUp: sounds.playLevelUp,
  victory: sounds.playVictory,
  legendary: sounds.playLegendary,
  achievement: sounds.playAchievement,
  streak: sounds.playStreak,
  personalRecord: sounds.playPersonalRecord,
  // Spell school–themed impact sounds
  spellDamage: sounds.playSpellDamage,
  spellFire: sounds.playSpellFire,
  spellMagicDamage: sounds.playSpellMagicDamage,
  spellHeal: sounds.playSpellHeal,
  spellStun: sounds.playSpellStun,
  spellDefense: sounds.playSpellDefense,
  spellLifesteal: sounds.playSpellLifesteal,
  spellStamina: sounds.playSpellStamina,
} as const;

function readEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Default OFF so we don't ambush first-time visitors with audio.
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Vanilla (non-hook) entry point. Use from toast helpers and other plain-JS
 * call sites where a hook isn't available. Reads the enabled flag from
 * localStorage on every call so it stays in sync with the toggle.
 */
export function playSound(key: SoundKey): void {
  if (!readEnabled()) return;
  try {
    PLAY_FUNCS[key]();
  } catch {
    // Web Audio throws if context is closed; safe to ignore.
  }
}

/**
 * Global sound switch. Reads/writes localStorage so the preference survives
 * across sessions. `play(key)` is the single gated entry point — callers
 * don't need to check enabled state.
 *
 * Audio is unlocked on the user gesture that turns sound on, which satisfies
 * Chrome / Safari's autoplay policy.
 */
export function useSound() {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Sync from localStorage after mount — server always renders as disabled
    // (false) to match the SSR default; this corrects it client-side.
    setEnabled(readEnabled());
    setMounted(true);

    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setEnabled(e.newValue === 'true');
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setSoundEnabled = useCallback(async (next: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Ignore quota / privacy-mode errors.
    }
    if (next) {
      await sounds.unlockAudio();
    }
    setEnabled(next);
  }, []);

  const play = useCallback(
    (key: SoundKey) => {
      if (!enabled) return;
      try {
        PLAY_FUNCS[key]();
      } catch {
        // Web Audio throws if context is closed; safe to ignore.
      }
    },
    [enabled],
  );

  return { enabled, setSoundEnabled, play, mounted };
}

export type { SoundKey };

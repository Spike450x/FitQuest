'use client';

import { useEffect, useRef } from 'react';
import { useCharacterStore } from '@/store/characterStore';
import { updateCharacterDoc } from '@/lib/characterData';
import { captureError } from '@/lib/errors';
import { todayUTC } from '@/lib/gameLogic/streaks';
import { toast } from '@/components/ui/Toaster';

const DAILY_LOGIN_MAX_GOLD = 75;
const DAILY_LOGIN_MAX_XP = 150;

function dailyLoginBonus(level: number): { gold: number; xp: number } {
  const gold = Math.min(DAILY_LOGIN_MAX_GOLD, 25 + 5 * level);
  const xp = Math.min(DAILY_LOGIN_MAX_XP, level * 10);
  return { gold, xp };
}

/**
 * Grants a small daily-login gold + XP bonus the first time a character is
 * loaded each UTC day. Client-authoritative optimistic write (matches the
 * quest / collection achievement pattern from PR5b).
 *
 * Worst-case tampering nets ~75 g/day — negligible vs the 1500 g
 * `legendary-hoarder` reward and the 8 700 g full-catalog achievement payout.
 * If competitive scoring (leaderboards) ever ships, harden this by re-checking
 * `lastLoginGrantedDate` inside `claimCombatVictory` and `logActivity` CF
 * transactions.
 */
export function useDailyLoginBonus() {
  const character = useCharacterStore((s) => s.character);
  const awardXpAndStats = useCharacterStore((s) => s.awardXpAndStats);
  const awardGold = useCharacterStore((s) => s.awardGold);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!character || inFlight.current) return;
    const today = todayUTC();
    if (character.lastLoginGrantedDate === today) return;

    const { gold, xp } = dailyLoginBonus(character.level);
    const charUid = character.uid;

    inFlight.current = true;
    (async () => {
      try {
        // Award via existing store actions (handles level-up, stat caps,
        // resource max updates). Then stamp the date in a single write.
        await awardXpAndStats(xp, {});
        await awardGold(gold);
        await updateCharacterDoc(charUid, { lastLoginGrantedDate: today });
        useCharacterStore.setState((s) => ({
          character: s.character ? { ...s.character, lastLoginGrantedDate: today } : s.character,
        }));
        toast.success(`Daily login bonus +${gold}g +${xp} XP`, {
          description: 'Shows up once per UTC day. Come back tomorrow for another!',
          duration: 6000,
        });
      } catch (err) {
        captureError('useDailyLoginBonus.write', err);
      } finally {
        inFlight.current = false;
      }
    })();
  }, [character, awardXpAndStats, awardGold]);
}

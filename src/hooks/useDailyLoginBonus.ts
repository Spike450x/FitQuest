'use client';

import { useEffect, useRef } from 'react';
import { useCharacterStore } from '@/store/characterStore';
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
 *
 * Write order: stamps `lastLoginGrantedDate` BEFORE awarding XP/gold so a
 * crash between writes can't replay the bonus. If the stamp succeeds and a
 * downstream award throws, the player loses one bonus — accepted trade-off
 * vs. the alternative of duplicating bonuses on every retry.
 */
export function useDailyLoginBonus() {
  // Narrow slices so the effect doesn't fire on every HP/gold/XP field write.
  const uid = useCharacterStore((s) => s.character?.uid);
  const level = useCharacterStore((s) => s.character?.level);
  const lastLoginGrantedDate = useCharacterStore((s) => s.character?.lastLoginGrantedDate);
  const awardXpAndStats = useCharacterStore((s) => s.awardXpAndStats);
  const awardGold = useCharacterStore((s) => s.awardGold);
  const applyCharacterPatch = useCharacterStore((s) => s.applyCharacterPatch);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!uid || level === undefined || inFlight.current) return;
    const today = todayUTC();
    if (lastLoginGrantedDate === today) return;

    const { gold, xp } = dailyLoginBonus(level);

    inFlight.current = true;
    (async () => {
      try {
        // Stamp the date FIRST so a crash between writes can't replay the
        // bonus. The patch action covers the Firestore write + local state
        // setState via the shared functional-updater path.
        await applyCharacterPatch({ lastLoginGrantedDate: today });
        // Now award the actual reward. If either of these throws, the date
        // is already stamped, so the bonus is lost — never duplicated.
        await awardXpAndStats(xp, {});
        await awardGold(gold);
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
  }, [uid, level, lastLoginGrantedDate, applyCharacterPatch, awardXpAndStats, awardGold]);
}

'use client';

import { useEffect, useRef, useState } from 'react';

export interface DamageBurst {
  id: number;
  text: string;
  /** 'monster' or 'player' — controls which side of the panel the number floats from. */
  target: 'monster' | 'player';
  tone: 'damage' | 'heal' | 'crit' | 'block';
}

/**
 * Hook that watches a combat-log array and emits damage-burst events when new
 * entries arrive. Returns the live burst list and a callback to expire them.
 */
export function useCombatBursts(
  log: Array<{
    round: number;
    playerDamage?: number;
    monsterDamage?: number;
    eagleEyeCrit?: boolean;
    divineAegisBlocked?: boolean;
    healAmount?: number;
    soulDrainHeal?: number;
    flatPassiveHeal?: number;
  }>,
) {
  const [bursts, setBursts] = useState<DamageBurst[]>([]);
  const lastSeenRound = useRef<number>(0);
  const idCounter = useRef<number>(1);

  useEffect(() => {
    if (log.length === 0) {
      lastSeenRound.current = 0;
      return;
    }
    const newest = log[log.length - 1];
    if (newest.round <= lastSeenRound.current) return;
    lastSeenRound.current = newest.round;

    const next: DamageBurst[] = [];

    if (newest.playerDamage && newest.playerDamage > 0) {
      next.push({
        id: idCounter.current++,
        text: `−${newest.playerDamage}`,
        target: 'monster',
        tone: newest.eagleEyeCrit ? 'crit' : 'damage',
      });
    }

    if (newest.monsterDamage && newest.monsterDamage > 0) {
      next.push({
        id: idCounter.current++,
        text: `−${newest.monsterDamage}`,
        target: 'player',
        tone: 'damage',
      });
    } else if (newest.divineAegisBlocked) {
      next.push({
        id: idCounter.current++,
        text: 'BLOCK',
        target: 'player',
        tone: 'block',
      });
    }

    const heal =
      (newest.healAmount ?? 0) + (newest.soulDrainHeal ?? 0) + (newest.flatPassiveHeal ?? 0);
    if (heal > 0) {
      next.push({
        id: idCounter.current++,
        text: `+${heal}`,
        target: 'player',
        tone: 'heal',
      });
    }

    if (next.length) setBursts((prev) => [...prev, ...next]);
  }, [log]);

  function expire(id: number) {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }

  return { bursts, expire };
}

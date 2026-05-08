'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface DamageBurst {
  id: number;
  text: string;
  /** 'monster' or 'player' — controls which side of the panel the number floats from. */
  target: 'monster' | 'player';
  tone: 'damage' | 'heal' | 'crit' | 'block';
}

const TONE_CLASS: Record<DamageBurst['tone'], string> = {
  damage: 'text-red-500',
  heal: 'text-emerald-500',
  crit: 'text-amber-500 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]',
  block: 'text-sky-500',
};

const TONE_SIZE: Record<DamageBurst['tone'], string> = {
  damage: 'text-2xl',
  heal: 'text-xl',
  crit: 'text-3xl',
  block: 'text-lg',
};

interface CombatEffectsProps {
  /**
   * Bursts to render. Parent should generate these from RoundEntry data and
   * pass an immutable list (each burst keyed by `id`).
   */
  bursts: DamageBurst[];
  onBurstExpired: (id: number) => void;
}

/**
 * Absolute-positioned overlay rendering floating damage numbers above the
 * combat HP-bar block. Mount this inside a `relative` container.
 */
export function CombatEffects({ bursts, onBurstExpired }: CombatEffectsProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 10, scale: 0.6 }}
            animate={{ opacity: 1, y: -40, scale: 1 }}
            exit={{ opacity: 0, y: -70 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            onAnimationComplete={() => onBurstExpired(b.id)}
            className={`
              absolute font-black tabular-nums ${TONE_CLASS[b.tone]} ${TONE_SIZE[b.tone]}
              ${b.target === 'monster' ? 'right-6 top-2' : 'left-6 top-2'}
            `}
          >
            {b.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
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

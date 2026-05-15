'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { DamageBurst } from '@/hooks/useCombatBursts';

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

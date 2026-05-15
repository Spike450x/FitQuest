'use client';

import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { useCharacterStore } from '@/store/characterStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CLASS_DEFINITIONS, LEVEL_UP } from '@/lib/gameLogic/constants';

/**
 * Watches `level` on the character store and pops a celebration modal when it
 * goes up. Mount once near the top of any authenticated layout. Self-throttles
 * so a single login that pulls a higher level from Firestore on first paint
 * doesn't false-trigger.
 */
export function LevelUpCelebration() {
  const character = useCharacterStore((s) => s.character);
  const previousLevel = useRef<number | null>(null);
  const [showLevel, setShowLevel] = useState<number | null>(null);

  useEffect(() => {
    if (!character) {
      previousLevel.current = null;
      return;
    }
    if (previousLevel.current === null) {
      // First observation — adopt as baseline; don't fire on initial mount.
      previousLevel.current = character.level;
      return;
    }
    if (character.level > previousLevel.current) {
      setShowLevel(character.level);
      if (document.visibilityState === 'visible') {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.4 },
          colors: ['#fbbf24', '#a78bfa', '#34d399', '#60a5fa'],
        });
      }
    }
    previousLevel.current = character.level;
  }, [character]);

  if (!character || showLevel === null) return null;

  const classDef = CLASS_DEFINITIONS[character.class];
  const pointsGained = LEVEL_UP.STAT_POINTS_PER_LEVEL;

  return (
    <Modal open={true} onClose={() => setShowLevel(null)} bare size="md">
      <motion.div
        initial={{ y: 8 }}
        animate={{ y: 0 }}
        className="relative bg-gradient-to-br from-amber-50 via-white to-violet-50 border-2 border-amber-300 rounded-2xl shadow-2xl p-8 text-center overflow-hidden"
      >
        {/* Glow corners */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-violet-200/40 rounded-full blur-3xl" />

        <p className="relative text-5xl mb-2" aria-hidden="true">
          {classDef.emoji}
        </p>
        <p className="relative text-xs uppercase tracking-[0.3em] text-amber-600 font-bold">
          Level Up
        </p>
        <p className="relative text-5xl font-black text-gray-900 my-1 tabular-nums">{showLevel}</p>
        <p className="relative text-sm text-gray-600 mb-5">
          {character.name} reached <span className="font-semibold">Level {showLevel}</span>
        </p>

        <div className="relative bg-white/80 border border-amber-200 rounded-xl px-4 py-3 mb-5 backdrop-blur-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Earned</p>
          <p className="text-sm font-semibold text-gray-800 mt-1">
            +{pointsGained} stat point{pointsGained !== 1 ? 's' : ''} · +{LEVEL_UP.HEALTH_PER_LEVEL}{' '}
            HP · +{LEVEL_UP.DEFENSE_PER_LEVEL} Defense
          </p>
          <p className="text-xs text-gray-500 mt-1">All combat resources fully restored.</p>
        </div>

        <Button variant="primary" size="lg" fullWidth onClick={() => setShowLevel(null)}>
          Continue
        </Button>
      </motion.div>
    </Modal>
  );
}

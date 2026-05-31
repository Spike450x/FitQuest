'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Award } from 'lucide-react';
import { useCharacterStore } from '@/store/characterStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { fireConfetti } from '@/lib/confetti';
import { playSound } from '@/hooks/useSound';
import { reputationRank } from '@/lib/gameLogic/reputation';
import type { ReputationRank } from '@/types';

/**
 * Watches the player's Reputation rank (derived from `lifetimeReputation`, which
 * is monotonic) and pops a celebration when it advances a tier. Mount once near
 * the top of the authenticated layout, beside `LevelUpCelebration`. Adopts the
 * first observation as a baseline so loading a higher rank from Firestore on
 * first paint doesn't false-trigger.
 */
export function RankUpCelebration() {
  const character = useCharacterStore((s) => s.character);
  const applyCharacterPatch = useCharacterStore((s) => s.applyCharacterPatch);
  const previousRankId = useRef<string | null>(null);
  const [shown, setShown] = useState<ReputationRank | null>(null);
  const [equipped, setEquipped] = useState(false);

  useEffect(() => {
    if (!character) {
      previousRankId.current = null;
      return;
    }
    const rank = reputationRank(character.lifetimeReputation ?? 0);
    if (previousRankId.current === null) {
      previousRankId.current = rank.id;
      return;
    }
    if (rank.id !== previousRankId.current) {
      // lifetimeReputation only ever increases, so any rank change is a rank-up.
      setShown(rank);
      setEquipped(false);
      fireConfetti('celebration');
      playSound('levelUp');
    }
    previousRankId.current = rank.id;
  }, [character]);

  if (!character || !shown) return null;

  // The rank just unlocked, so equipping its title is always valid here.
  const alreadyEquipped = character.activeTitle === shown.id;

  function equipTitle() {
    if (!shown) return;
    applyCharacterPatch({ activeTitle: shown.id });
    setEquipped(true);
    playSound('claim');
  }

  return (
    <Modal open={true} onClose={() => setShown(null)} bare size="md" feel="cinematic">
      <motion.div
        initial={{ y: 8 }}
        animate={{ y: 0 }}
        className="relative bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/60 dark:via-slate-900 dark:to-fuchsia-950/40 border-2 border-violet-300 dark:border-violet-700 rounded-2xl shadow-2xl p-8 text-center overflow-hidden"
      >
        {/* Glow corners */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-violet-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-fuchsia-200/40 rounded-full blur-3xl" />

        <div className="relative mb-2 flex justify-center">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/40">
            <Award className="w-8 h-8" aria-hidden="true" />
          </span>
        </div>
        <p className="relative text-xs uppercase tracking-[0.3em] text-violet-600 dark:text-violet-300 font-bold">
          Rank Up
        </p>
        <p className="relative text-4xl font-black text-gray-900 dark:text-slate-100 my-1">
          {shown.label}
        </p>
        <p className="relative text-sm text-gray-600 dark:text-slate-300 mb-5">
          {character.name}&apos;s reputation precedes them
        </p>

        <div className="relative bg-white/80 dark:bg-slate-900/80 border border-violet-200 dark:border-violet-800 rounded-xl px-4 py-3 mb-5 backdrop-blur-sm">
          <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
            New title unlocked
          </p>
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300 mt-1">
            “{shown.title}”
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {equipped || alreadyEquipped
              ? 'Equipped — it shows under your name.'
              : 'Equip it now or pick another from your character sheet.'}
          </p>
        </div>

        {equipped || alreadyEquipped ? (
          <Button variant="primary" size="lg" fullWidth onClick={() => setShown(null)}>
            Continue
          </Button>
        ) : (
          <div className="relative flex flex-col gap-2">
            <Button variant="primary" size="lg" fullWidth onClick={equipTitle}>
              Equip “{shown.title}”
            </Button>
            <button
              type="button"
              onClick={() => setShown(null)}
              className="text-xs font-medium text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors py-1"
            >
              Not now
            </button>
          </div>
        )}
      </motion.div>
    </Modal>
  );
}

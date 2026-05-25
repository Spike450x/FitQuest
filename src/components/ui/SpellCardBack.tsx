'use client';

import { memo } from 'react';
import type { ItemRarity } from '@/types';
import { RARITY_CARD } from '@/lib/gameLogic/items';
import { HeraldicFrame } from '@/components/art/HeraldicFrame';
import { rarityTint } from '@/lib/entityArt';

interface SpellCardBackProps {
  rarity: ItemRarity;
  /** Match the front card's bottom action area so the silhouette stays identical when flipped. */
  hasActionFooter?: boolean;
  className?: string;
}

/**
 * The reverse side of a spell card — a uniform "spellbook" design shared by
 * every spell, in the spirit of Magic: The Gathering's common card back.
 * Centre sigil is the rarity-tinted hexagonal `HeraldicFrame`; five coloured
 * orbs ring the sigil to evoke the magic schools used in the front-face
 * effect tags (heal / defense / stun / damage / lifesteal).
 */
export const SpellCardBack = memo(function SpellCardBack({
  rarity,
  hasActionFooter,
  className = '',
}: SpellCardBackProps) {
  const scheme = RARITY_CARD[rarity];
  const tint = rarityTint(rarity);

  return (
    <div
      className={`flex flex-col rounded-2xl border-2 ${scheme.border} overflow-hidden bg-white dark:bg-slate-900 h-full ${className}`}
    >
      {/* Top wordmark banner — matches the front header band height */}
      <div className={`${scheme.header} px-3 pt-3 pb-2`}>
        <p
          className="text-white font-black text-center tracking-[0.3em] text-sm"
          style={{ fontFamily: 'var(--font-cinzel, serif)' }}
        >
          FITQUEST
        </p>
        <p className="text-white/70 text-[10px] text-center tracking-widest uppercase mt-0.5">
          Arcane Spellbook
        </p>
      </div>

      {/* Body — centred sigil ringed by five magic-school orbs */}
      <div className="flex-1 relative flex items-center justify-center px-4 py-5">
        {/* Central heraldic sigil */}
        <div className="relative w-28 h-28 z-10">
          <HeraldicFrame variant="sigil" tint={tint} className="w-full h-full">
            <g fill="currentColor">
              {/* Stylised sword-and-spark mark */}
              <path d="M 50 22 L 56 30 L 56 60 L 50 66 L 44 60 L 44 30 Z" />
              <path d="M 38 28 L 62 28 L 60 34 L 40 34 Z" />
              <path d="M 50 68 L 47 78 L 53 78 Z" />
              {/* Spark dots radiating from the hilt */}
              <circle cx="32" cy="50" r="2.5" />
              <circle cx="68" cy="50" r="2.5" />
              <circle cx="50" cy="14" r="2.5" />
              <circle cx="26" cy="38" r="1.5" />
              <circle cx="74" cy="38" r="1.5" />
              <circle cx="26" cy="62" r="1.5" />
              <circle cx="74" cy="62" r="1.5" />
            </g>
          </HeraldicFrame>
        </div>

        {/* Five magic-school orbs — MTG-style pentagon arrangement */}
        <SchoolOrb className="absolute top-2 left-1/2 -translate-x-1/2" color="emerald" />
        <SchoolOrb className="absolute top-[28%] right-3" color="blue" />
        <SchoolOrb className="absolute bottom-[18%] right-6" color="cyan" />
        <SchoolOrb className="absolute bottom-[18%] left-6" color="red" />
        <SchoolOrb className="absolute top-[28%] left-3" color="rose" />
      </div>

      {/* Bottom plate — mirrors the front's action-button strip so heights align */}
      {hasActionFooter ? (
        <div className="px-3 pb-3">
          <div
            className={`w-full py-2 text-xs font-semibold rounded-xl text-center text-white tracking-widest ${scheme.header}`}
            style={{ fontFamily: 'var(--font-cinzel, serif)' }}
          >
            SPELLBOOK
          </div>
        </div>
      ) : (
        <div className={`${scheme.header} px-3 py-2 text-center`}>
          <p
            className="text-white/90 text-[10px] tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-cinzel, serif)' }}
          >
            Spellbook
          </p>
        </div>
      )}
    </div>
  );
});

// ─── Magic-school orb ─────────────────────────────────────────────────────────

const ORB_COLORS = {
  emerald: 'bg-emerald-400 dark:bg-emerald-500 shadow-emerald-500/60',
  blue: 'bg-blue-400 dark:bg-blue-500 shadow-blue-500/60',
  cyan: 'bg-cyan-400 dark:bg-cyan-500 shadow-cyan-500/60',
  red: 'bg-red-400 dark:bg-red-500 shadow-red-500/60',
  rose: 'bg-rose-400 dark:bg-rose-500 shadow-rose-500/60',
} as const;

function SchoolOrb({
  color,
  className = '',
}: {
  color: keyof typeof ORB_COLORS;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`block w-3.5 h-3.5 rounded-full ring-1 ring-white/70 dark:ring-slate-900/70 shadow-md ${ORB_COLORS[color]} ${className}`}
    />
  );
}

import { CLASS_DEFINITIONS } from '@/lib/gameLogic/constants';

/**
 * Presentation helpers for the character-sheet Class Traits panel. Turns a raw
 * class stat multiplier (e.g. 0.8 / 1.4) into a player-friendly signed delta and
 * a diverging-bar fill. Pure formatting math — kept out of `gameLogic/` so it
 * isn't subject to the GAME-LOGIC.md export-coverage gate.
 */

/**
 * Largest `|mult − 1|` across every class/stat in `CLASS_DEFINITIONS`. Used to
 * scale the diverging bar so the strongest buff/debuff fills the track edge.
 * Self-adjusts if the multiplier matrix is ever retuned.
 */
export const STAT_MULT_MAX_DEVIATION = Math.max(
  ...Object.values(CLASS_DEFINITIONS).flatMap((def) =>
    Object.values(def.statMultipliers).map((m) => Math.abs(m - 1)),
  ),
);

export interface StatMultiplierDelta {
  /** Signed percentage vs the 1.0 baseline, rounded (e.g. +40, −20, 0). */
  pct: number;
  /** Whether the multiplier helps, hurts, or is neutral. */
  kind: 'buff' | 'debuff' | 'neutral';
  /** 0–1 share of the diverging-bar half-track to fill (scaled to the matrix). */
  fillFraction: number;
}

export function statMultiplierDelta(mult: number): StatMultiplierDelta {
  const pct = Math.round((mult - 1) * 100);
  const kind = mult > 1 ? 'buff' : mult < 1 ? 'debuff' : 'neutral';
  const fillFraction =
    STAT_MULT_MAX_DEVIATION > 0 ? Math.min(1, Math.abs(mult - 1) / STAT_MULT_MAX_DEVIATION) : 0;
  return { pct, kind, fillFraction };
}

/** Signed-percent label for display, e.g. "+40%", "−20%", "±0%". */
export function formatMultiplierPct(pct: number): string {
  if (pct === 0) return '±0%';
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`;
}

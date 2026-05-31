/**
 * Reputation rank math. Reputation is dual-track: a spendable wallet
 * (`Character.spendableReputation`) plus a cumulative lifetime tracker
 * (`Character.lifetimeReputation`). The lifetime value — never spent down —
 * determines the player's visible Rank, so heavy spenders keep their badge.
 *
 * Pure module: no clock, no Firestore. The earn/spend writes live in
 * `bountyStore`; this file only maps a lifetime total to a rank + progress.
 */

import type { ReputationRank } from '@/types';

/** Ascending by threshold. The first entry (Newcomer, 0) is the floor. */
export const REPUTATION_RANKS: ReputationRank[] = [
  { id: 'newcomer', label: 'Newcomer', threshold: 0 },
  { id: 'known', label: 'Known', threshold: 500 },
  { id: 'respected', label: 'Respected', threshold: 1500 },
  { id: 'renowned', label: 'Renowned', threshold: 4000 },
  { id: 'legendary', label: 'Legendary', threshold: 10000 },
];

/** Highest rank whose threshold ≤ lifetime. Negative input clamps to Newcomer. */
export function reputationRank(lifetime: number): ReputationRank {
  const value = Math.max(0, lifetime);
  let current = REPUTATION_RANKS[0];
  for (const rank of REPUTATION_RANKS) {
    if (value >= rank.threshold) current = rank;
    else break;
  }
  return current;
}

/** The next rank up, or null if already at the top (Legendary). */
export function nextReputationRank(lifetime: number): ReputationRank | null {
  const current = reputationRank(lifetime);
  const idx = REPUTATION_RANKS.findIndex((r) => r.id === current.id);
  return REPUTATION_RANKS[idx + 1] ?? null;
}

export interface ReputationProgress {
  rank: ReputationRank;
  next: ReputationRank | null;
  /** Whole-number percent (0–100) toward `next`. 100 when at max rank. */
  pctToNext: number;
  /** Lifetime reputation still needed to reach `next`. 0 when at max rank. */
  remaining: number;
  /** True when the player has reached the highest rank. */
  atMax: boolean;
}

/** Everything the rank progress bar needs in one pure call. */
export function reputationProgress(lifetime: number): ReputationProgress {
  const value = Math.max(0, lifetime);
  const rank = reputationRank(value);
  const next = nextReputationRank(value);

  if (!next) {
    return { rank, next: null, pctToNext: 100, remaining: 0, atMax: true };
  }

  const span = next.threshold - rank.threshold;
  const into = value - rank.threshold;
  const pctToNext = Math.max(0, Math.min(100, Math.round((into / span) * 100)));
  return { rank, next, pctToNext, remaining: Math.max(0, next.threshold - value), atMax: false };
}

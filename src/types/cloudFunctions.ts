import type { ActivityType } from '@/types';

// Shared callable function types — mirrors functions/src/index.ts interfaces.
// Any change to the function's input/output shape must be reflected here.

// ─── claimDungeonRun ──────────────────────────────────────────────────────────

export interface ClaimDungeonRunInput {
  runId: string;
  /**
   * Whether to mark `dungeonRunsToday.legendaryUsed = true` on the character.
   * True for victory, false for retreat/defeat.
   */
  legendaryUsed: boolean;
  /**
   * Final status to stamp on the run document.
   * Victory/retreat → 'completed', defeat → 'abandoned'.
   */
  outcomeStatus: 'completed' | 'abandoned';
}

export interface ClaimDungeonRunResult {
  xp: number;
  gold: number;
  items: string[];
  leveledUp: boolean;
}

export interface LogActivityInput {
  activityType: ActivityType;
  amount: number;
  unit: string;
  /**
   * Client-generated UUID used as the Firestore document ID for the activity log.
   * Ensures that network retries don't create duplicate log entries — Firestore
   * `set` on an existing doc ID is idempotent.
   */
  idempotencyKey: string;
}

export interface LogActivityResult {
  logId: string;
  /** True when the logged amount was within the daily cap and rewards were granted. */
  rewardEligible: boolean;
  /** Eligible portion of `amount` — client uses for quest progress + streak. */
  eligibleAmount: number;
  /** True if this log pushed the daily total to exactly the cap. */
  justHitCap: boolean;
  /** True if a mastery milestone (+1 stat) was awarded. */
  masteryHit: boolean;
  /** Stat label for the milestone toast (e.g. "Strength"). Only set when masteryHit. */
  linkedStatLabel?: string;
  /**
   * Authoritative mastery count after this log. Only set for mastery activities
   * (run/workout/steps). Use this instead of client-estimated count to avoid
   * drift when the character was logged on another device earlier in the same day.
   */
  newMasteryCount?: number;
  /**
   * Set for eligible restore activities (nutrition/sleep/water).
   * amount: how much was actually restored (0 if player was already at max).
   * newValue: the character's new resource value — used for optimistic local state update.
   */
  restored?: {
    resourceType: 'hp' | 'stamina' | 'magic';
    newValue: number;
    amount: number;
  };
}

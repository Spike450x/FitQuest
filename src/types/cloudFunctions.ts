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
  /** Gold from achievements alone — subset of `gold`. Used by the victory screen to show a breakdown. */
  achievementGold: number;
  items: string[];
  leveledUp: boolean;
  /** Achievement IDs earned by this run. Awarded server-side (gold included in `gold`). */
  newAchievements: string[];
  /**
   * True when the post-transaction inventory write failed after XP/gold were already awarded.
   * The run is marked claimed so rewards won't double-award, but items may be missing.
   * Client should show a warning toast prompting the player to re-claim from the dungeon menu.
   */
  inventoryPartial?: boolean;
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
  /** Achievement IDs newly unlocked by this log. */
  newAchievements: string[];
  /** Gold credited from achievement rewards (already added to character.gold). */
  achievementGold: number;
}

// ─── createGarminAuthUrl ──────────────────────────────────────────────────────

export interface CreateGarminAuthUrlInput {
  /** App origin to return the browser to after the OAuth callback completes. */
  returnOrigin: string;
}

export interface CreateGarminAuthUrlResult {
  /** Garmin OAuth 2.0 PKCE authorize URL to navigate the user to. */
  url: string;
}

// ─── claimCombatVictory ───────────────────────────────────────────────────────

export interface ClaimCombatVictoryInput {
  /** XP the client wants to award (already streak-boosted + level-scaled). */
  xpReward: number;
  /** Gold to award. Not capped — only XP is diminished. */
  goldReward: number;
  /** Monster id, persisted on the combat log for analytics + stats page. */
  monsterId: string;
  /** Monster display name, persisted on the combat log. */
  monsterName: string;
  /** Client UUID. The combat log doc id is `${uid}_${idempotencyKey}` so retries are safe. */
  idempotencyKey: string;
  /** True iff the player took no damage during the fight. Drives the `untouched` achievement. */
  flawless?: boolean;
}

export interface ClaimCombatVictoryResult {
  /** XP actually awarded after the daily diminishing-returns multiplier. */
  finalXp: number;
  /** Multiplier applied (1.0 if no cap, down to 0.1 at the 31+ floor). */
  multiplier: number;
  /** Win count BEFORE this victory (today, UTC day). */
  winsTodayBefore: number;
  /** Win count INCLUDING this victory. */
  winsTodayAfter: number;
  /** Whether the XP award caused a level-up. */
  leveledUp: boolean;
  /** Achievement IDs newly unlocked by this win. */
  newAchievements: string[];
  /** Gold credited from achievement rewards (already added to character.gold). */
  achievementGold: number;
}

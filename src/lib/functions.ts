import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type {
  LogActivityInput,
  LogActivityResult,
  ClaimDungeonRunInput,
  ClaimDungeonRunResult,
  ClaimCombatVictoryInput,
  ClaimCombatVictoryResult,
} from '@/types/cloudFunctions';

export const logActivityFn = httpsCallable<LogActivityInput, LogActivityResult>(
  functions,
  'logActivity',
);

const claimDungeonRunFn = httpsCallable<ClaimDungeonRunInput, ClaimDungeonRunResult>(
  functions,
  'claimDungeonRun',
);

const claimCombatVictoryFn = httpsCallable<ClaimCombatVictoryInput, ClaimCombatVictoryResult>(
  functions,
  'claimCombatVictory',
);

/**
 * Calls the claimCombatVictory Cloud Function to apply the daily diminishing-
 * returns multiplier to a combat win and atomically award XP + gold +
 * persist the combat log. The CF is the source of truth for `winsToday`,
 * since clients can't be trusted to count their own wins.
 *
 * Returns the final XP that was actually awarded (may be less than xpReward
 * if the player has farmed more than 10 wins today). Callers should display
 * the multiplier when < 1.0 so the player understands the deduction.
 */
export async function claimCombatVictoryCF(
  input: ClaimCombatVictoryInput,
): Promise<ClaimCombatVictoryResult> {
  const result = await claimCombatVictoryFn(input);
  return result.data;
}

/**
 * Calls the claimDungeonRun Cloud Function to atomically stamp the run as
 * claimed, award XP/gold to the character, and persist inventory items.
 *
 * If the run was already claimed (e.g. a network retry after a succeeded write),
 * this function resolves successfully with the original award amounts set to 0
 * rather than throwing — the caller should treat "already claimed" as a no-op.
 */
export async function claimDungeonRunCF(
  runId: string,
  legendaryUsed: boolean,
  outcomeStatus: 'completed' | 'abandoned',
): Promise<ClaimDungeonRunResult> {
  try {
    const result = await claimDungeonRunFn({ runId, legendaryUsed, outcomeStatus });
    return result.data;
  } catch (err: unknown) {
    // Treat "already-exists" (double-claim on network retry) as a successful no-op
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'functions/already-exists'
    ) {
      return {
        xp: 0,
        gold: 0,
        achievementGold: 0,
        items: [],
        leveledUp: false,
        newAchievements: [],
      };
    }
    throw err;
  }
}

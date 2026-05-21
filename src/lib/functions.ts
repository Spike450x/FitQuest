import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type {
  LogActivityInput,
  LogActivityResult,
  ClaimDungeonRunInput,
  ClaimDungeonRunResult,
} from '@/types/cloudFunctions';

export const logActivityFn = httpsCallable<LogActivityInput, LogActivityResult>(
  functions,
  'logActivity',
);

const claimDungeonRunFn = httpsCallable<ClaimDungeonRunInput, ClaimDungeonRunResult>(
  functions,
  'claimDungeonRun',
);

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

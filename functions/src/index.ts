import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import {
  type ActivityType,
  DAILY_ACTIVITY_CAPS,
  ACTIVITY_AMOUNT_MAX,
  eligibleAmountForRewards,
} from './gameLogic/activityCaps';
import {
  MASTERY_ACTIVITIES,
  MASTERY_CONFIG,
  RESTORE,
  RESTORE_ACTIVITIES,
  isMasteryMilestone,
  statCap,
  type MasteryActivityType,
} from './gameLogic/constants';
import { playerMaxHp, playerMaxStamina, playerMaxMagic } from './gameLogic/combat';
import {
  checkNewActivityAchievements,
  checkNewMasteryAchievements,
  sumAchievementGold,
} from './gameLogic/achievements';

admin.initializeApp();
const db = admin.firestore();

export { claimDungeonRun } from './claimDungeonRun';
export { claimCombatVictory } from './claimCombatVictory';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogActivityInput {
  activityType: ActivityType;
  amount: number;
  unit: string;
  /** Client-generated UUID — used as the activity log doc ID to make retries idempotent. */
  idempotencyKey: string;
}

interface LogActivityResult {
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
   * (run/workout/steps). Use this instead of client-estimated count to avoid drift
   * when the character was logged on another device earlier in the same day.
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

// ─── logActivity callable ─────────────────────────────────────────────────────
//
// Owns the authoritative write sequence for all activity log submissions:
//   1. Server-side aggregate query — cap can't be bypassed via forged client state
//   2. activityLog document write
//   3. Mastery milestone stat award (run/workout/steps) — permanent stat increase
//   4. Resource restore (nutrition/sleep/water) — HP/Stamina/Magic capped at formula max
//
// Quest progress and streak tracking remain client-side (low fraud risk —
// they are counters and timestamps, not permanent stat or resource awards).

export const logActivity = onCall<LogActivityInput, Promise<LogActivityResult>>(
  { minInstances: 1, invoker: 'public' },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be signed in.');
      }

      const { activityType, amount, unit, idempotencyKey } = request.data;
      const uid = request.auth.uid; // authoritative — never from request.data

      // Input validation — mirrors INPUT_CONFIG.max in ActivityLogForm.tsx.
      // Reject obviously bogus values before touching Firestore.
      const validTypes: ActivityType[] = [
        'workout',
        'run',
        'steps',
        'sleep',
        'water',
        'nutrition',
        'meditation',
      ];
      if (!validTypes.includes(activityType)) {
        throw new HttpsError('invalid-argument', `Unknown activityType: ${activityType}`);
      }
      if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
        throw new HttpsError('invalid-argument', 'amount must be a positive finite number.');
      }
      if (amount > ACTIVITY_AMOUNT_MAX[activityType]) {
        throw new HttpsError(
          'invalid-argument',
          `amount ${amount} exceeds maximum ${ACTIVITY_AMOUNT_MAX[activityType]} for ${activityType}.`,
        );
      }
      if (typeof unit !== 'string' || unit.length === 0 || unit.length > 50) {
        throw new HttpsError('invalid-argument', 'unit must be a non-empty string (max 50 chars).');
      }
      if (
        typeof idempotencyKey !== 'string' ||
        idempotencyKey.length < 8 ||
        idempotencyKey.length > 128
      ) {
        throw new HttpsError('invalid-argument', 'idempotencyKey must be a string (8–128 chars).');
      }

      // ── 1. Compute today's already-logged total (server-side, non-bypassable) ──
      // Uses a composite index on (uid, type, loggedAt) — defined in
      // firestore.indexes.json. Deploy the index before deploying this function.
      const now = new Date();
      const startOfDayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

      const todaySnap = await db
        .collection('activityLogs')
        .where('uid', '==', uid)
        .where('type', '==', activityType)
        .where('loggedAt', '>=', startOfDayMs)
        .get();

      const alreadyLoggedToday = todaySnap.docs.reduce(
        (sum, d) => sum + ((d.data().data?.amount as number) ?? 0),
        0,
      );

      const cap = DAILY_ACTIVITY_CAPS[activityType];
      const eligibleAmount = eligibleAmountForRewards(activityType, alreadyLoggedToday, amount);
      const rewardEligible = eligibleAmount > 0;
      const justHitCap = rewardEligible && alreadyLoggedToday + eligibleAmount >= cap;

      // ── 2. Write activity log document ─────────────────────────────────────────
      // Namespace the doc ID with the server-authoritative uid so a client cannot
      // target another user's document by guessing or replaying a known key.
      // Firestore `set` on an existing ID is a no-op write, so retries are safe.
      const logRef = db.collection('activityLogs').doc(`${uid}_${idempotencyKey}`);
      const batch = db.batch();

      batch.set(logRef, {
        id: logRef.id,
        uid,
        type: activityType,
        data: { amount, unit },
        statGains: {},
        xpGained: 0,
        loggedAt: Date.now(),
        rewardEligible,
      });

      const result: LogActivityResult = {
        logId: logRef.id,
        rewardEligible,
        eligibleAmount,
        justHitCap,
        masteryHit: false,
        newAchievements: [],
        achievementGold: 0,
      };

      // ── 3. Fetch character document (restore only — mastery reads inside transaction) ──
      const needsChar = rewardEligible && RESTORE_ACTIVITIES.has(activityType);

      const charRef = db.collection('characters').doc(uid);
      let charData: FirebaseFirestore.DocumentData | undefined;

      if (needsChar) {
        const charSnap = await charRef.get();
        if (!charSnap.exists) {
          throw new HttpsError('not-found', 'Character document not found.');
        }
        charData = charSnap.data();
      }

      // ── 4. Resource restore (nutrition / sleep / water / meditation) ──────────
      // Capped at the formula-derived max (not the Firestore rule ceiling) so a
      // player at max HP can't accumulate extra HP by logging nutrition over and over.
      // Meditation restores Magic just like water — both feed currentMagic, so they
      // stack within the same day.
      if (rewardEligible && RESTORE_ACTIVITIES.has(activityType) && charData) {
        const RESTORE_MAP = {
          nutrition: { field: 'currentHp' as const, rate: RESTORE.HP_PER_MEAL },
          sleep: { field: 'currentStamina' as const, rate: RESTORE.STAMINA_PER_SLEEP_HOUR },
          water: { field: 'currentMagic' as const, rate: RESTORE.MAGIC_PER_WATER_GLASS },
          meditation: {
            field: 'currentMagic' as const,
            rate: RESTORE.MAGIC_PER_MEDITATION_MINUTE,
          },
        } as const;

        const { field, rate } =
          RESTORE_MAP[activityType as 'nutrition' | 'sleep' | 'water' | 'meditation'];
        const resourceType: 'hp' | 'stamina' | 'magic' =
          activityType === 'nutrition' ? 'hp' : activityType === 'sleep' ? 'stamina' : 'magic';

        const restoreAmount = Math.floor(eligibleAmount * rate);

        const stats = charData.stats as { stamina: number; health: number; wisdom: number };
        const equipped = charData.equippedGear as {
          weapon: string | null;
          armor: string | null;
          accessory: string | null;
        } | null;
        const charClass = charData.class as string;

        const maxVal =
          activityType === 'nutrition'
            ? playerMaxHp(stats, equipped)
            : activityType === 'sleep'
              ? playerMaxStamina(stats, equipped)
              : playerMaxMagic(stats.wisdom, charClass);

        const current = (charData[field] as number | undefined) ?? maxVal;
        const newVal = Math.min(current + restoreAmount, maxVal);
        const restored = newVal - current;

        if (restored > 0) {
          batch.update(charRef, { [field]: newVal });
        }

        result.restored = { resourceType, newValue: newVal, amount: restored };
      }

      await batch.commit();

      // ── 4b. Hydration streak (water only) — server-aggregated ─────────────
      // Pre-fetch the past 7 days of water logs once, before the txn, so the
      // achievement checker inside the txn doesn't pay aggregate-query latency
      // under contention. Slightly stale by milliseconds is fine — if a second
      // water log slides in concurrently, the worst case is one missed streak
      // award that the next water log immediately catches.
      let waterStreakDays = 0;
      if (rewardEligible && activityType === 'water') {
        const sevenDaysAgoMs = startOfDayMs - 6 * 86_400_000;
        const recentWaterSnap = await db
          .collection('activityLogs')
          .where('uid', '==', uid)
          .where('type', '==', 'water')
          .where('loggedAt', '>=', sevenDaysAgoMs)
          .get();
        const distinctDays = new Set<string>();
        // Today is counted via the just-committed log (idempotent set above).
        distinctDays.add(new Date(startOfDayMs).toISOString().slice(0, 10));
        for (const d of recentWaterSnap.docs) {
          const ts = d.data().loggedAt as number;
          distinctDays.add(new Date(ts).toISOString().slice(0, 10));
        }
        waterStreakDays = distinctDays.size;
      }

      // ── 4c. Mastery milestone + achievement transaction ──────────────────
      // Single transaction that:
      //   1. Increments the lifetime activity-log counter for this type.
      //   2. Increments masteryCounts if this is a mastery activity, awarding
      //      +1 to the linked stat at each milestone (5/15/25/...).
      //   3. Evaluates activity + mastery achievements against the AFTER state
      //      and merges any new IDs into character.achievements with their
      //      gold rewards. All in one atomic write to avoid TOCTOU.
      if (rewardEligible) {
        await db.runTransaction(async (txn) => {
          const charSnap = await txn.get(charRef);
          if (!charSnap.exists) {
            throw new HttpsError('not-found', 'Character document not found.');
          }
          const freshData = charSnap.data()!;
          const charUpdates: Record<string, unknown> = {};

          // Lifetime activity-log counter
          const lifetimeBefore =
            (freshData.activityLogCounts?.[activityType] as number | undefined) ?? 0;
          const lifetimeAfter = lifetimeBefore + 1;
          charUpdates[`activityLogCounts.${activityType}`] = lifetimeAfter;

          // Mastery counter + linked-stat milestone (mastery activities only)
          const masteryCountsAfter: Partial<
            Record<'workout' | 'run' | 'steps' | 'meditation', number>
          > = {
            workout: freshData.masteryCounts?.workout as number | undefined,
            run: freshData.masteryCounts?.run as number | undefined,
            steps: freshData.masteryCounts?.steps as number | undefined,
            meditation: freshData.masteryCounts?.meditation as number | undefined,
          };
          if (MASTERY_ACTIVITIES.has(activityType)) {
            const type = activityType as MasteryActivityType;
            const config = MASTERY_CONFIG[type];
            const oldCount = (freshData.masteryCounts?.[type] as number | undefined) ?? 0;
            const newCount = oldCount + 1;
            charUpdates[`masteryCounts.${type}`] = newCount;
            masteryCountsAfter[type] = newCount;

            if (isMasteryMilestone(newCount)) {
              const level = (freshData.level as number | undefined) ?? 1;
              const currentStat = (freshData.stats?.[config.linkedStat] as number | undefined) ?? 0;
              charUpdates[`stats.${config.linkedStat}`] = Math.min(
                currentStat + 1,
                statCap(config.linkedStat, level),
              );
              result.masteryHit = true;
              result.linkedStatLabel = config.linkedStatLabel;
            }
            result.newMasteryCount = newCount;
          }

          // Achievement evaluation (activity + mastery — same checker pattern)
          const existingAchievements: string[] = freshData.achievements ?? [];
          const activityUnlocks = checkNewActivityAchievements({
            existing: existingAchievements,
            activityType,
            activityCountAfter: lifetimeAfter,
            waterStreakDays: activityType === 'water' ? waterStreakDays : undefined,
          });
          const masteryUnlocks = MASTERY_ACTIVITIES.has(activityType)
            ? checkNewMasteryAchievements({
                existing: existingAchievements,
                masteryCounts: masteryCountsAfter,
              })
            : [];
          const newAchievements = [...activityUnlocks, ...masteryUnlocks];

          if (newAchievements.length > 0) {
            const achievementGold = sumAchievementGold(newAchievements);
            charUpdates.achievements = [...existingAchievements, ...newAchievements];
            charUpdates.gold = (freshData.gold ?? 0) + achievementGold;
            result.newAchievements = newAchievements;
            result.achievementGold = achievementGold;
          }

          txn.update(charRef, charUpdates);
        });
      }

      return result;
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      // Unhandled errors surface as an opaque "internal" to clients.
      // Re-throw with the original message so the browser console shows a
      // useful detail string rather than a blank "INTERNAL".
      console.error('[logActivity] unhandled error:', err);
      throw new HttpsError('internal', err instanceof Error ? err.message : String(err));
    }
  },
);

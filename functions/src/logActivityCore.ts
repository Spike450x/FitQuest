import { HttpsError } from 'firebase-functions/v2/https';
import {
  type ActivityType,
  DAILY_ACTIVITY_CAPS,
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

// ─── Shared activity-log write core ───────────────────────────────────────────
//
// The authoritative write sequence for every activity log, regardless of source:
//   1. Server-side aggregate query — daily cap can't be bypassed via forged state
//   2. activityLog document write (idempotent on dedupeKey)
//   3. Mastery milestone stat award (run/workout/steps/meditation)
//   4. Resource restore (nutrition/sleep/water/meditation)
//   5. Activity + mastery achievement evaluation
//
// Two callers share this:
//   • logActivity (onCall)  — manual log from the form; dedupeKey = client UUID
//   • garminWebhook (onRequest) — device-synced log; dedupeKey = provider event id
//
// Keeping this in one place guarantees a Garmin-synced workout earns exactly the
// same mastery / restore / achievements as a hand-typed one.

export interface LogActivityCoreInput {
  uid: string;
  activityType: ActivityType;
  amount: number;
  unit: string;
  /**
   * Doc-id suffix: activityLogs/${uid}_${dedupeKey}. A `set` on an existing id
   * is a no-op, so replays (network retry, webhook redelivery) never double-log.
   */
  dedupeKey: string;
  /**
   * Provenance tag for synced logs, e.g. 'garmin'. Omitted from the
   * document entirely for manual logs so their shape is unchanged.
   */
  source?: string;
  /**
   * Activity completion time (ms). Defaults to now. Device imports pass the real
   * completion timestamp so the log lands in the correct UTC day for cap math.
   */
  loggedAt?: number;
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
   * (run/workout/steps/meditation). Use this instead of client-estimated count to
   * avoid drift when the character was logged on another device earlier today.
   */
  newMasteryCount?: number;
  /**
   * Set for eligible restore activities (nutrition/sleep/water/meditation).
   * amount: how much was actually restored (0 if player was already at max).
   * newValue: the character's new resource value — used for optimistic local update.
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

export async function logActivityCore(
  db: FirebaseFirestore.Firestore,
  input: LogActivityCoreInput,
): Promise<LogActivityResult> {
  const { uid, activityType, amount, unit, dedupeKey, source } = input;
  const loggedAtMs = input.loggedAt ?? Date.now();

  // ── 1. Compute the log's-day already-logged total (server-side, non-bypassable) ──
  // Derive the day window from the log's own timestamp so a backdated device
  // import counts against the right day. For manual logs loggedAt ≈ now, so this
  // is identical to the previous `new Date()` behaviour.
  const day = new Date(loggedAtMs);
  const startOfDayMs = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());

  const todaySnap = await db
    .collection('activityLogs')
    .where('uid', '==', uid)
    .where('type', '==', activityType)
    .where('loggedAt', '>=', startOfDayMs)
    .where('loggedAt', '<', startOfDayMs + 86_400_000)
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
  // Namespace the doc ID with the server-authoritative uid so a caller cannot
  // target another user's document by guessing or replaying a known key.
  const logRef = db.collection('activityLogs').doc(`${uid}_${dedupeKey}`);
  const batch = db.batch();

  const logData: Record<string, unknown> = {
    id: logRef.id,
    uid,
    type: activityType,
    data: { amount, unit },
    statGains: {},
    xpGained: 0,
    loggedAt: loggedAtMs,
    rewardEligible,
  };
  // Only stamp `source` for synced logs — manual logs keep their original shape.
  if (source) logData.source = source;
  batch.set(logRef, logData);

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
  // player at max HP can't accumulate extra HP by logging nutrition repeatedly.
  if (rewardEligible && RESTORE_ACTIVITIES.has(activityType) && charData) {
    const RESTORE_MAP = {
      nutrition: { field: 'currentHp' as const, rate: RESTORE.HP_PER_MEAL },
      sleep: { field: 'currentStamina' as const, rate: RESTORE.STAMINA_PER_SLEEP_HOUR },
      water: { field: 'currentMagic' as const, rate: RESTORE.MAGIC_PER_WATER_GLASS },
      meditation: { field: 'currentMagic' as const, rate: RESTORE.MAGIC_PER_MEDITATION_MINUTE },
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
    distinctDays.add(new Date(startOfDayMs).toISOString().slice(0, 10));
    for (const d of recentWaterSnap.docs) {
      const ts = d.data().loggedAt as number;
      distinctDays.add(new Date(ts).toISOString().slice(0, 10));
    }
    waterStreakDays = distinctDays.size;
  }

  // ── 4c. Mastery milestone + achievement transaction ──────────────────
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
      const masteryCountsAfter: Partial<Record<MasteryActivityType, number>> = {
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
}

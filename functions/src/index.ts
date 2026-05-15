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

admin.initializeApp();
const db = admin.firestore();

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogActivityInput {
  activityType: ActivityType;
  amount: number;
  unit: string;
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

export const logActivity = onCall<LogActivityInput, Promise<LogActivityResult>>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }

  const { activityType, amount, unit } = request.data;
  const uid = request.auth.uid; // authoritative — never from request.data

  // Input validation — mirrors INPUT_CONFIG.max in ActivityLogForm.tsx.
  // Reject obviously bogus values before touching Firestore.
  const validTypes: ActivityType[] = ['workout', 'run', 'steps', 'sleep', 'water', 'nutrition'];
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
  const logRef = db.collection('activityLogs').doc();
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
  };

  // ── 3. Fetch character document (mastery + restore both need it) ────────────
  const needsChar =
    rewardEligible &&
    (MASTERY_ACTIVITIES.has(activityType) || RESTORE_ACTIVITIES.has(activityType));

  const charRef = db.collection('characters').doc(uid);
  let charData: FirebaseFirestore.DocumentData | undefined;

  if (needsChar) {
    const charSnap = await charRef.get();
    if (!charSnap.exists) {
      throw new HttpsError('not-found', 'Character document not found.');
    }
    charData = charSnap.data();
  }

  // ── 4. Mastery milestone stat award ────────────────────────────────────────
  // Only for mastery activities (run / workout / steps) when reward-eligible.
  // The mastery count and optional stat increment are written atomically
  // with the activity log in the same batch commit.
  if (rewardEligible && MASTERY_ACTIVITIES.has(activityType) && charData) {
    const type = activityType as MasteryActivityType;
    const config = MASTERY_CONFIG[type];
    const oldCount = (charData.masteryCounts?.[type] as number | undefined) ?? 0;
    const newCount = oldCount + 1;
    const milestoneHit = isMasteryMilestone(newCount);

    const charUpdates: Record<string, unknown> = {
      [`masteryCounts.${type}`]: newCount,
    };

    if (milestoneHit) {
      const level = (charData.level as number | undefined) ?? 1;
      const currentStat = (charData.stats?.[config.linkedStat] as number | undefined) ?? 0;
      charUpdates[`stats.${config.linkedStat}`] = Math.min(
        currentStat + 1,
        statCap(config.linkedStat, level),
      );
      result.masteryHit = true;
      result.linkedStatLabel = config.linkedStatLabel;
    }

    result.newMasteryCount = newCount;
    batch.update(charRef, charUpdates);
  }

  // ── 5. Resource restore (nutrition / sleep / water) ────────────────────────
  // Capped at the formula-derived max (not the Firestore rule ceiling) so a
  // player at max HP can't accumulate extra HP by logging nutrition over and over.
  if (rewardEligible && RESTORE_ACTIVITIES.has(activityType) && charData) {
    const RESTORE_MAP = {
      nutrition: { field: 'currentHp' as const, rate: RESTORE.HP_PER_MEAL },
      sleep: { field: 'currentStamina' as const, rate: RESTORE.STAMINA_PER_SLEEP_HOUR },
      water: { field: 'currentMagic' as const, rate: RESTORE.MAGIC_PER_WATER_GLASS },
    } as const;

    const { field, rate } = RESTORE_MAP[activityType as 'nutrition' | 'sleep' | 'water'];
    const resourceType =
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
  return result;
});

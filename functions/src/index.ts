import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { type ActivityType, ACTIVITY_AMOUNT_MAX } from './gameLogic/activityCaps';
import { logActivityCore, type LogActivityResult } from './logActivityCore';

admin.initializeApp();
const db = admin.firestore();

export { claimDungeonRun } from './claimDungeonRun';
export { claimCombatVictory } from './claimCombatVictory';
export { createGarminAuthUrl, garminOAuthCallback } from './garminConnect';
export { garminWebhook } from './garminWebhook';
export { createStravaAuthUrl, stravaOAuthCallback } from './stravaConnect';
export { stravaWebhook } from './stravaWebhook';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogActivityInput {
  activityType: ActivityType;
  amount: number;
  unit: string;
  /** Client-generated UUID — used as the activity log doc ID to make retries idempotent. */
  idempotencyKey: string;
}

// ─── logActivity callable ─────────────────────────────────────────────────────
//
// Thin auth + input-validation wrapper around `logActivityCore` (shared with the
// garminWebhook device-sync path). The core owns the authoritative write sequence:
// cap enforcement, mastery awards, resource restore, and achievement evaluation.
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

      return await logActivityCore(db, {
        uid,
        activityType,
        amount,
        unit,
        dedupeKey: idempotencyKey,
      });
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

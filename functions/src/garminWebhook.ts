import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { logActivityCore } from './logActivityCore';
import { mapGarminPayload, type GarminPushBody } from './gameLogic/garminMapping';
import type { MappedActivity } from './gameLogic/healthShared';
import {
  HEALTH_SNAPSHOTS_COLLECTION,
  computeDailyDelta,
  dailySnapshotId,
  dailyDeltaDedupeKey,
  eventDedupeKey,
  utcDayKey,
} from './gameLogic/healthDedupe';
import { findUidByGarminUserId } from './healthTokens';

const db = admin.firestore();
const PROVIDER = 'garmin';
const SOURCE = 'garmin';

// Garmin "Push" notifications are NOT HMAC-signed. We authenticate them with a
// shared secret carried in the registered callback URL (?token=…) AND by only
// ingesting records whose Garmin user id maps to a known connection.
//   firebase functions:secrets:set GARMIN_WEBHOOK_TOKEN
const GARMIN_WEBHOOK_TOKEN = defineSecret('GARMIN_WEBHOOK_TOKEN');

// ─── garminWebhook (HTTP) ─────────────────────────────────────────────────────
// Receives Garmin Health API push payloads, maps each summary to a FitQuest
// activity, de-duplicates, and runs the SAME authoritative write path as a
// manual log (logActivityCore). Always replies 2XX once authenticated so Garmin
// doesn't retry-storm; per-record failures are logged and swallowed (idempotent
// doc ids make a later redelivery safe).
export const garminWebhook = onRequest(
  { secrets: [GARMIN_WEBHOOK_TOKEN], invoker: 'public' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const expected = GARMIN_WEBHOOK_TOKEN.value();
    if (!expected) {
      res.status(200).send({ ok: true, processed: 0, note: 'not-configured' });
      return;
    }
    if ((req.query.token as string | undefined) !== expected) {
      res.status(401).send('Invalid token');
      return;
    }

    const body = (req.body ?? {}) as GarminPushBody;
    const mapped = mapGarminPayload(body);

    // Resolve each Garmin user id to a FitQuest uid once (cached per request).
    const uidCache = new Map<string, string | null>();
    let processed = 0;

    for (const { garminUserId, activity } of mapped) {
      if (!garminUserId) continue;
      try {
        let uid = uidCache.get(garminUserId);
        if (uid === undefined) {
          uid = await findUidByGarminUserId(db, garminUserId);
          uidCache.set(garminUserId, uid);
        }
        if (!uid) continue; // unknown user — ignore
        if (await ingest(uid, activity)) processed += 1;
      } catch (err) {
        console.error('[garminWebhook] failed to ingest', activity.sourceId, err);
      }
    }

    res.status(200).send({ ok: true, processed });
  },
);

/** Returns true if a log was written. */
async function ingest(uid: string, activity: MappedActivity): Promise<boolean> {
  if (activity.dedupeMode === 'event') {
    await logActivityCore(db, {
      uid,
      activityType: activity.activityType,
      amount: activity.amount,
      unit: activity.unit,
      dedupeKey: eventDedupeKey(PROVIDER, activity.sourceId),
      source: SOURCE,
      loggedAt: activity.loggedAt,
    });
    return true;
  }

  // 'daily': diff the cumulative value against the stored snapshot; log only
  // the positive delta. Compare-and-set is transactional so concurrent
  // redeliveries can't double-log the same delta.
  const day = utcDayKey(activity.loggedAt);
  const snapRef = db
    .collection(HEALTH_SNAPSHOTS_COLLECTION)
    .doc(dailySnapshotId(uid, PROVIDER, day, activity.activityType));

  const delta = await db.runTransaction(async (txn) => {
    const snap = await txn.get(snapRef);
    const lastValue = (snap.data()?.lastValue as number | undefined) ?? 0;
    const d = computeDailyDelta(lastValue, activity.amount);
    if (d > 0) {
      txn.set(
        snapRef,
        { uid, provider: PROVIDER, day, metric: activity.activityType, lastValue: activity.amount },
        { merge: true },
      );
    }
    return d;
  });

  if (delta <= 0) return false;

  await logActivityCore(db, {
    uid,
    activityType: activity.activityType,
    amount: delta,
    unit: activity.unit,
    dedupeKey: dailyDeltaDedupeKey(PROVIDER, activity.activityType, day, activity.amount),
    source: SOURCE,
    loggedAt: activity.loggedAt,
  });
  return true;
}

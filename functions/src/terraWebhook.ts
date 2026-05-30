import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { logActivityCore } from './logActivityCore';
import { mapTerraPayload, type TerraPayload, type MappedActivity } from './gameLogic/healthMapping';
import {
  HEALTH_SNAPSHOTS_COLLECTION,
  computeDailyDelta,
  dailySnapshotId,
  dailyDeltaDedupeKey,
  eventDedupeKey,
  utcDayKey,
} from './gameLogic/healthDedupe';
import { verifyTerraSignature } from './terraSignature';
import { resolveUidForConnection, upsertConnection } from './healthConnections';

const db = admin.firestore();

// Terra destination signing secret. Set once with:
//   firebase functions:secrets:set TERRA_SIGNING_SECRET
const TERRA_SIGNING_SECRET = defineSecret('TERRA_SIGNING_SECRET');

// ─── terraWebhook (HTTP) ──────────────────────────────────────────────────────
//
// The repository's first HTTP-triggered function. Terra POSTs normalized health
// events here; we verify the HMAC signature against the raw body, map each event
// to a FitQuest activity, de-duplicate, and run the SAME authoritative write path
// as a manual log (logActivityCore). Must reply 2XX or Terra retries (~8× with
// backoff over a day), so per-event failures are logged and swallowed — the
// idempotent doc ids make a later redelivery safe.

export const terraWebhook = onRequest(
  { secrets: [TERRA_SIGNING_SECRET], cors: false, invoker: 'public' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const secret = TERRA_SIGNING_SECRET.value();
    if (!secret) {
      // Not configured yet (scaffold / pre-launch). Acknowledge so Terra's
      // dashboard test doesn't hard-fail, but process nothing.
      console.warn('[terraWebhook] TERRA_SIGNING_SECRET unset — acknowledging without processing.');
      res.status(200).send({ ok: true, processed: 0, note: 'not-configured' });
      return;
    }

    const rawBody: Buffer | string =
      (req as unknown as { rawBody?: Buffer }).rawBody ?? JSON.stringify(req.body ?? {});
    const signature = req.header('terra-signature') ?? undefined;
    if (!verifyTerraSignature(rawBody, signature, secret)) {
      console.warn('[terraWebhook] signature verification failed.');
      res.status(401).send('Invalid signature');
      return;
    }

    let payload: TerraPayload;
    try {
      payload = (typeof req.body === 'object' && req.body) || JSON.parse(rawBody.toString());
    } catch {
      res.status(400).send('Malformed JSON');
      return;
    }

    const uid = await resolveUidForConnection(db, payload.user);
    if (!uid) {
      // Unknown user (e.g. a deauth/connection event for a user we never linked).
      res.status(200).send({ ok: true, processed: 0, note: 'no-linked-user' });
      return;
    }

    const provider = payload.user?.provider ?? 'unknown';
    const source = `terra:${provider}`;

    // Record/refresh the connection on every event — covers Terra's `auth`
    // event (which carries no activity data) so a freshly-connected device
    // appears in the UI before its first workout syncs.
    await upsertConnection(db, {
      uid,
      provider,
      terraUserId: payload.user?.user_id,
    }).catch(() => undefined);

    const mapped = mapTerraPayload(payload);

    let processed = 0;
    for (const activity of mapped) {
      try {
        const didWrite = await ingestActivity(uid, source, provider, activity);
        if (didWrite) processed += 1;
      } catch (err) {
        // Swallow per-event errors so one bad record doesn't force a full-batch
        // redelivery. Logged for observability.
        console.error('[terraWebhook] failed to ingest event', activity.sourceId, err);
      }
    }

    res.status(200).send({ ok: true, processed });
  },
);

/** Returns true if a reward-bearing or new activity log was written. */
async function ingestActivity(
  uid: string,
  source: string,
  provider: string,
  activity: MappedActivity,
): Promise<boolean> {
  if (activity.dedupeMode === 'event') {
    await logActivityCore(db, {
      uid,
      activityType: activity.activityType,
      amount: activity.amount,
      unit: activity.unit,
      dedupeKey: eventDedupeKey(activity.sourceId),
      source,
      loggedAt: activity.loggedAt,
    });
    return true;
  }

  // 'daily': diff the cumulative value against the stored snapshot, log only
  // the positive delta. The compare-and-set is transactional so concurrent
  // redeliveries can't both log the same delta.
  const day = utcDayKey(activity.loggedAt);
  const snapId = dailySnapshotId(uid, provider, day, activity.activityType);
  const snapRef = db.collection(HEALTH_SNAPSHOTS_COLLECTION).doc(snapId);

  const delta = await db.runTransaction(async (txn) => {
    const snap = await txn.get(snapRef);
    const lastValue = (snap.data()?.lastValue as number | undefined) ?? 0;
    const d = computeDailyDelta(lastValue, activity.amount);
    if (d > 0) {
      txn.set(
        snapRef,
        { uid, provider, day, metric: activity.activityType, lastValue: activity.amount },
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
    dedupeKey: dailyDeltaDedupeKey(activity.activityType, day, activity.amount),
    source,
    loggedAt: activity.loggedAt,
  });
  return true;
}

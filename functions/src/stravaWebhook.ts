import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { logActivityCore } from './logActivityCore';
import { mapStravaActivity } from './gameLogic/stravaMapping';
import { eventDedupeKey } from './gameLogic/healthDedupe';
import { findUidByProviderUserId } from './healthTokens';
import { getValidAccessToken, fetchStravaActivity } from './stravaApi';

const db = admin.firestore();
const PROVIDER = 'strava';
const SOURCE = 'strava';

// Strava credentials (for token refresh) + the subscription verify token.
//   firebase functions:secrets:set STRAVA_CLIENT_ID
//   firebase functions:secrets:set STRAVA_CLIENT_SECRET
//   firebase functions:secrets:set STRAVA_VERIFY_TOKEN
const STRAVA_CLIENT_ID = defineSecret('STRAVA_CLIENT_ID');
const STRAVA_CLIENT_SECRET = defineSecret('STRAVA_CLIENT_SECRET');
const STRAVA_VERIFY_TOKEN = defineSecret('STRAVA_VERIFY_TOKEN');

// ─── stravaWebhook (HTTP) ─────────────────────────────────────────────────────
// GET  — subscription validation handshake (echo hub.challenge).
// POST — event notification: a Strava event carries only an object id, so we
// fetch the full activity, map it, and run the SAME authoritative write path as
// a manual log (logActivityCore). Always 200 quickly so Strava doesn't retry-storm.
export const stravaWebhook = onRequest(
  { secrets: [STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_VERIFY_TOKEN], invoker: 'public' },
  async (req, res) => {
    // ── Subscription validation (Strava GETs this when you create the sub) ──
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const challenge = req.query['hub.challenge'];
      const verifyToken = req.query['hub.verify_token'];
      const expected = STRAVA_VERIFY_TOKEN.value();
      if (mode === 'subscribe' && verifyToken === expected && typeof challenge === 'string') {
        res.status(200).json({ 'hub.challenge': challenge });
      } else {
        res.status(403).send('Forbidden');
      }
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // Acknowledge fast; Strava expects a 2XX within seconds. Process inline but
    // swallow per-event errors (idempotent doc ids make a retry safe).
    const event = (req.body ?? {}) as {
      object_type?: string;
      object_id?: number;
      aspect_type?: string;
      owner_id?: number;
    };

    try {
      // Only newly-created activities log rewards. (Updates/deletes are ignored
      // in v1; the create already logged, and amounts rarely change materially.)
      if (
        event.object_type === 'activity' &&
        event.aspect_type === 'create' &&
        event.object_id !== undefined &&
        event.owner_id !== undefined
      ) {
        const uid = await findUidByProviderUserId(db, PROVIDER, String(event.owner_id));
        if (uid) {
          const accessToken = await getValidAccessToken(db, uid, {
            clientId: STRAVA_CLIENT_ID.value(),
            clientSecret: STRAVA_CLIENT_SECRET.value(),
          });
          if (accessToken) {
            const detail = await fetchStravaActivity(accessToken, event.object_id);
            const mapped = detail && mapStravaActivity(detail);
            if (mapped) {
              await logActivityCore(db, {
                uid,
                activityType: mapped.activityType,
                amount: mapped.amount,
                unit: mapped.unit,
                dedupeKey: eventDedupeKey(PROVIDER, mapped.sourceId),
                source: SOURCE,
                loggedAt: mapped.loggedAt,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[stravaWebhook] event processing failed', event.object_id, err);
    }

    res.status(200).send({ ok: true });
  },
);

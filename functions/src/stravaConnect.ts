import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { STRAVA_TOKEN_URL, buildStravaAuthorizeUrl } from './stravaOAuth';
import { createOAuthState } from './garminOAuth';
import { saveOAuthState, consumeOAuthState, saveTokens } from './healthTokens';
import { upsertConnection } from './healthConnections';

const db = admin.firestore();

// Set once with:
//   firebase functions:secrets:set STRAVA_CLIENT_ID
//   firebase functions:secrets:set STRAVA_CLIENT_SECRET
const STRAVA_CLIENT_ID = defineSecret('STRAVA_CLIENT_ID');
const STRAVA_CLIENT_SECRET = defineSecret('STRAVA_CLIENT_SECRET');
// The deployed stravaOAuthCallback URL — its domain must equal the
// "Authorization Callback Domain" in the Strava API app settings.
const STRAVA_REDIRECT_URI = defineString('STRAVA_REDIRECT_URI');

const PROVIDER = 'strava';

interface CreateAuthUrlInput {
  returnOrigin: string;
}
interface CreateAuthUrlResult {
  url: string;
}

// ─── createStravaAuthUrl (callable) ───────────────────────────────────────────
export const createStravaAuthUrl = onCall<CreateAuthUrlInput, Promise<CreateAuthUrlResult>>(
  { secrets: [STRAVA_CLIENT_ID] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in.');

    const clientId = STRAVA_CLIENT_ID.value();
    const redirectUri = STRAVA_REDIRECT_URI.value();
    if (!clientId || !redirectUri) {
      throw new HttpsError('failed-precondition', 'Strava sync is not configured yet.');
    }

    const returnOrigin = request.data?.returnOrigin;
    if (typeof returnOrigin !== 'string' || !/^https?:\/\//.test(returnOrigin)) {
      throw new HttpsError('invalid-argument', 'returnOrigin must be an http(s) origin.');
    }

    const state = createOAuthState();
    await saveOAuthState(db, state, {
      uid: request.auth.uid,
      provider: PROVIDER,
      codeVerifier: '', // Strava uses plain OAuth2 (no PKCE)
      returnOrigin,
    });

    return { url: buildStravaAuthorizeUrl({ clientId, redirectUri, state }) };
  },
);

// ─── stravaOAuthCallback (HTTP) ───────────────────────────────────────────────
// Strava redirects here with ?code & ?state (& ?scope). We exchange the code for
// tokens, persist them (server-only) keyed by the athlete id, write a tokenless
// connection record, then bounce back to the app.
export const stravaOAuthCallback = onRequest(
  { secrets: [STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET], invoker: 'public' },
  async (req, res) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const fail = (origin: string) => res.redirect(`${origin || ''}/profile/connections?error=1`);

    if (!code || !state) {
      res.status(400).send('Missing code/state');
      return;
    }
    const saved = await consumeOAuthState(db, state);
    if (!saved) {
      res.status(400).send('Invalid or expired state');
      return;
    }

    try {
      const tokenRes = await fetch(STRAVA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: STRAVA_CLIENT_ID.value(),
          client_secret: STRAVA_CLIENT_SECRET.value(),
          code,
          grant_type: 'authorization_code',
        }),
      });
      if (!tokenRes.ok) {
        console.error('[stravaOAuthCallback] token exchange failed', tokenRes.status);
        fail(saved.returnOrigin);
        return;
      }
      const token = (await tokenRes.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_at?: number; // epoch seconds
        athlete?: { id?: number };
      };
      if (!token.access_token) {
        fail(saved.returnOrigin);
        return;
      }

      const athleteId = token.athlete?.id !== undefined ? String(token.athlete.id) : undefined;
      await saveTokens(db, {
        uid: saved.uid,
        provider: PROVIDER,
        providerUserId: athleteId,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: token.expires_at ? token.expires_at * 1000 : undefined,
      });
      await upsertConnection(db, { uid: saved.uid, provider: PROVIDER, providerUserId: athleteId });

      res.redirect(`${saved.returnOrigin}/profile/connections?connected=1`);
    } catch (err) {
      console.error('[stravaOAuthCallback] error', err);
      fail(saved.returnOrigin);
    }
  },
);

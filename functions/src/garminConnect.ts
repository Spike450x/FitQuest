import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import {
  GARMIN_TOKEN_URL,
  GARMIN_USER_ID_URL,
  buildAuthorizeUrl,
  createOAuthState,
  createPkcePair,
} from './garminOAuth';
import { saveOAuthState, consumeOAuthState, saveTokens } from './healthTokens';
import { upsertConnection } from './healthConnections';

const db = admin.firestore();

// Set once with:
//   firebase functions:secrets:set GARMIN_CLIENT_ID
//   firebase functions:secrets:set GARMIN_CLIENT_SECRET
const GARMIN_CLIENT_ID = defineSecret('GARMIN_CLIENT_ID');
const GARMIN_CLIENT_SECRET = defineSecret('GARMIN_CLIENT_SECRET');
// The deployed garminOAuthCallback URL — must be whitelisted verbatim in the
// Garmin portal. Set with: firebase functions:config / .env or:
//   firebase deploy ... (then) firebase functions:params:set GARMIN_REDIRECT_URI=...
const GARMIN_REDIRECT_URI = defineString('GARMIN_REDIRECT_URI');

const PROVIDER = 'garmin';

interface CreateGarminAuthUrlInput {
  /** App origin (e.g. https://fitquest.app) to return to after the callback. */
  returnOrigin: string;
}
interface CreateGarminAuthUrlResult {
  url: string;
}

// ─── createGarminAuthUrl (callable) ───────────────────────────────────────────
// Starts the OAuth 2.0 PKCE flow: mints a verifier+state, stashes them server-
// side keyed by `state`, and returns the Garmin authorize URL to redirect to.
export const createGarminAuthUrl = onCall<
  CreateGarminAuthUrlInput,
  Promise<CreateGarminAuthUrlResult>
>({ secrets: [GARMIN_CLIENT_ID] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in.');

  const clientId = GARMIN_CLIENT_ID.value();
  const redirectUri = GARMIN_REDIRECT_URI.value();
  if (!clientId || !redirectUri) {
    throw new HttpsError('failed-precondition', 'Garmin sync is not configured yet.');
  }

  const returnOrigin = request.data?.returnOrigin;
  if (typeof returnOrigin !== 'string' || !/^https?:\/\//.test(returnOrigin)) {
    throw new HttpsError('invalid-argument', 'returnOrigin must be an http(s) origin.');
  }

  const { verifier, challenge } = createPkcePair();
  const state = createOAuthState();
  await saveOAuthState(db, state, {
    uid: request.auth.uid,
    provider: PROVIDER,
    codeVerifier: verifier,
    returnOrigin,
  });

  return { url: buildAuthorizeUrl({ clientId, redirectUri, challenge, state }) };
});

// ─── garminOAuthCallback (HTTP) ───────────────────────────────────────────────
// Garmin redirects the user's browser here with ?code & ?state. We exchange the
// code for tokens (PKCE), fetch the Garmin user id, persist tokens (server-only)
// + a tokenless connection record, then bounce back to the app.
export const garminOAuthCallback = onRequest(
  { secrets: [GARMIN_CLIENT_ID, GARMIN_CLIENT_SECRET], invoker: 'public' },
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
      // ⚠️ VERIFY POST-APPROVAL: token request shape (confidential client with
      // client_secret + PKCE code_verifier). Confirm against your portal docs.
      const tokenRes = await fetch(GARMIN_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: GARMIN_CLIENT_ID.value(),
          client_secret: GARMIN_CLIENT_SECRET.value(),
          code,
          code_verifier: saved.codeVerifier,
          redirect_uri: GARMIN_REDIRECT_URI.value(),
        }),
      });
      if (!tokenRes.ok) {
        console.error('[garminOAuthCallback] token exchange failed', tokenRes.status);
        fail(saved.returnOrigin);
        return;
      }
      const token = (await tokenRes.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };
      if (!token.access_token) {
        fail(saved.returnOrigin);
        return;
      }

      // Fetch the Garmin user id so future pushes can be attributed to this uid.
      const idRes = await fetch(GARMIN_USER_ID_URL, {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const garminUserId = idRes.ok
        ? ((await idRes.json()) as { userId?: string }).userId
        : undefined;

      await saveTokens(db, {
        uid: saved.uid,
        provider: PROVIDER,
        garminUserId,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
      });
      await upsertConnection(db, {
        uid: saved.uid,
        provider: PROVIDER,
        providerUserId: garminUserId,
      });

      res.redirect(`${saved.returnOrigin}/profile/connections?connected=1`);
    } catch (err) {
      console.error('[garminOAuthCallback] error', err);
      fail(saved.returnOrigin);
    }
  },
);

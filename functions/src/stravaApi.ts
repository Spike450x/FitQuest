import { STRAVA_TOKEN_URL, STRAVA_API_BASE } from './stravaOAuth';
import { getTokenDoc, saveTokens } from './healthTokens';
import type { StravaActivity } from './gameLogic/stravaMapping';

const PROVIDER = 'strava';
// Refresh a little early so an in-flight fetch never races the 6-hour expiry.
const EXPIRY_SKEW_MS = 5 * 60 * 1000;

interface StravaCreds {
  clientId: string;
  clientSecret: string;
}

interface StravaTokenResponse {
  access_token?: string;
  refresh_token?: string;
  /** epoch SECONDS */
  expires_at?: number;
}

/**
 * Returns a valid Strava access token for the user, transparently refreshing
 * (and persisting the new tokens) when the stored one is expired/near-expiry.
 * Strava access tokens last only ~6 hours, so this runs on most webhook events.
 */
export async function getValidAccessToken(
  db: FirebaseFirestore.Firestore,
  uid: string,
  creds: StravaCreds,
): Promise<string | null> {
  const doc = await getTokenDoc(db, uid, PROVIDER);
  if (!doc) return null;

  const fresh = doc.expiresAt !== undefined && doc.expiresAt - EXPIRY_SKEW_MS > Date.now();
  if (fresh) return doc.accessToken;
  if (!doc.refreshToken) return doc.accessToken; // best effort

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: doc.refreshToken,
    }),
  });
  if (!res.ok) {
    console.error('[stravaApi] token refresh failed', res.status);
    return doc.accessToken; // let the caller try; a 401 downstream is logged
  }
  const t = (await res.json()) as StravaTokenResponse;
  if (!t.access_token) return doc.accessToken;

  await saveTokens(db, {
    uid,
    provider: PROVIDER,
    providerUserId: doc.providerUserId,
    accessToken: t.access_token,
    refreshToken: t.refresh_token ?? doc.refreshToken,
    expiresAt: t.expires_at ? t.expires_at * 1000 : undefined,
  });
  return t.access_token;
}

/** Fetches a single activity's detail. Returns null on any non-OK response. */
export async function fetchStravaActivity(
  accessToken: string,
  activityId: number | string,
): Promise<StravaActivity | null> {
  const res = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    console.error('[stravaApi] activity fetch failed', activityId, res.status);
    return null;
  }
  return (await res.json()) as StravaActivity;
}

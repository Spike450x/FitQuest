import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

// Terra REST credentials. Set once with:
//   firebase functions:secrets:set TERRA_DEV_ID
//   firebase functions:secrets:set TERRA_API_KEY
const TERRA_DEV_ID = defineSecret('TERRA_DEV_ID');
const TERRA_API_KEY = defineSecret('TERRA_API_KEY');

const TERRA_WIDGET_ENDPOINT = 'https://api.tryterra.co/v2/auth/generateWidgetSession';

// Providers offered in the connect widget. Apple Health is intentionally absent
// — it requires a native iOS shell (Terra's mobile SDK), not the web widget.
const DEFAULT_PROVIDERS = [
  'GARMIN',
  'FITBIT',
  'OURA',
  'WHOOP',
  'GOOGLE',
  'STRAVA',
  'POLAR',
  'SAMSUNG',
  'WITHINGS',
  'SUUNTO',
].join(',');

interface CreateTerraSessionInput {
  /** Absolute URL Terra redirects to after a successful connect. */
  successUrl: string;
  /** Absolute URL Terra redirects to if the user cancels/fails. */
  failureUrl: string;
}

interface CreateTerraSessionResult {
  /** Hosted Terra widget URL to navigate the user to. */
  url: string;
}

// ─── createTerraSession (callable) ────────────────────────────────────────────
//
// Generates a Terra widget session bound to the signed-in uid (reference_id),
// so the eventual webhook can attribute synced data back to this player. Terra
// holds the provider OAuth tokens — we never see or store them.

export const createTerraSession = onCall<
  CreateTerraSessionInput,
  Promise<CreateTerraSessionResult>
>({ secrets: [TERRA_DEV_ID, TERRA_API_KEY] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }

  const devId = TERRA_DEV_ID.value();
  const apiKey = TERRA_API_KEY.value();
  if (!devId || !apiKey) {
    throw new HttpsError(
      'failed-precondition',
      'Health sync is not configured yet. Set TERRA_DEV_ID and TERRA_API_KEY.',
    );
  }

  const { successUrl, failureUrl } = request.data;
  if (!isHttpsUrl(successUrl) || !isHttpsUrl(failureUrl)) {
    throw new HttpsError('invalid-argument', 'successUrl and failureUrl must be https URLs.');
  }

  const uid = request.auth.uid;

  let response: Response;
  try {
    response = await fetch(TERRA_WIDGET_ENDPOINT, {
      method: 'POST',
      headers: {
        'dev-id': devId,
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference_id: uid,
        providers: DEFAULT_PROVIDERS,
        auth_success_redirect_url: successUrl,
        auth_failure_redirect_url: failureUrl,
        language: 'en',
      }),
    });
  } catch (err) {
    console.error('[createTerraSession] network error:', err);
    throw new HttpsError('unavailable', 'Could not reach the health provider.');
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('[createTerraSession] Terra error', response.status, detail);
    throw new HttpsError('internal', `Health provider returned ${response.status}.`);
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new HttpsError('internal', 'Health provider did not return a session URL.');
  }

  return { url: data.url };
});

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

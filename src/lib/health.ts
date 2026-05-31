import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { ConnectAuthUrlInput, ConnectAuthUrlResult } from '@/types/cloudFunctions';

const createGarminAuthUrlFn = httpsCallable<ConnectAuthUrlInput, ConnectAuthUrlResult>(
  functions,
  'createGarminAuthUrl',
);

const createStravaAuthUrlFn = httpsCallable<ConnectAuthUrlInput, ConnectAuthUrlResult>(
  functions,
  'createStravaAuthUrl',
);

/** Feature flag — gates the entire connect surface until provider creds are wired. */
export const HEALTH_SYNC_ENABLED = process.env.NEXT_PUBLIC_HEALTH_SYNC_ENABLED === 'true';

/** Providers offered in the connect UI. */
export type ConnectProvider = 'strava' | 'garmin';

/**
 * Starts a provider OAuth flow and returns the authorize URL to redirect the
 * browser to. The Cloud Function mints + stashes any OAuth state server-side;
 * its callback exchanges the code for tokens (held in the server-only
 * `healthTokens` collection) and bounces the user back to
 * `${returnOrigin}/profile/connections`.
 *
 * - **Strava** is free + self-serve (works today; also pulls Garmin workouts via
 *   the user's Garmin→Strava sync).
 * - **Garmin** requires Garmin Developer Program approval; the callable throws
 *   `failed-precondition` until its secrets are set.
 */
export async function createConnectAuthUrl(
  provider: ConnectProvider,
  input: ConnectAuthUrlInput,
): Promise<ConnectAuthUrlResult> {
  const fn = provider === 'garmin' ? createGarminAuthUrlFn : createStravaAuthUrlFn;
  const result = await fn(input);
  return result.data;
}

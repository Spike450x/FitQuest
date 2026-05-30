import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { CreateGarminAuthUrlInput, CreateGarminAuthUrlResult } from '@/types/cloudFunctions';

const createGarminAuthUrlFn = httpsCallable<CreateGarminAuthUrlInput, CreateGarminAuthUrlResult>(
  functions,
  'createGarminAuthUrl',
);

/** Feature flag — gates the entire connect surface until Garmin creds are wired. */
export const HEALTH_SYNC_ENABLED = process.env.NEXT_PUBLIC_HEALTH_SYNC_ENABLED === 'true';

/**
 * Starts the Garmin OAuth 2.0 PKCE flow and returns the authorize URL to
 * redirect the browser to. The Cloud Function mints + stashes the PKCE
 * verifier server-side; the server-side callback exchanges the code for tokens
 * (we hold them in the server-only `healthTokens` collection) and bounces the
 * user back to `${returnOrigin}/profile/connections`.
 */
export async function createGarminAuthUrl(
  input: CreateGarminAuthUrlInput,
): Promise<CreateGarminAuthUrlResult> {
  const result = await createGarminAuthUrlFn(input);
  return result.data;
}

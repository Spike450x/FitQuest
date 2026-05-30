import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { CreateTerraSessionInput, CreateTerraSessionResult } from '@/types/cloudFunctions';

const createTerraSessionFn = httpsCallable<CreateTerraSessionInput, CreateTerraSessionResult>(
  functions,
  'createTerraSession',
);

/** Feature flag — gates the entire connect surface until Terra creds are wired. */
export const HEALTH_SYNC_ENABLED = process.env.NEXT_PUBLIC_HEALTH_SYNC_ENABLED === 'true';

/**
 * Requests a Terra widget session bound to the signed-in user and returns the
 * hosted URL to redirect the browser to. Terra handles the provider OAuth and
 * holds the tokens; we only ever see the resulting webhook data.
 */
export async function createTerraSession(
  input: CreateTerraSessionInput,
): Promise<CreateTerraSessionResult> {
  const result = await createTerraSessionFn(input);
  return result.data;
}

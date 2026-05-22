/**
 * Retries an async operation with exponential back-off.
 *
 * @param fn        The operation to attempt.
 * @param delaysMs  Milliseconds to wait between attempts. Length determines
 *                  the number of retries (e.g. [1000, 3000] = 2 retries).
 * @param onRetry   Optional callback fired just before each retry sleep,
 *                  receiving the attempt index (1-based).
 * @returns         The resolved value of the first successful attempt.
 * @throws          The last error if every attempt fails. Non-retryable errors
 *                  (see isRetryable) are rethrown immediately with no delay.
 */
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  delaysMs: number[] = STORE_RETRY_DELAYS,
  onRetry?: (attempt: number) => void,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!isRetryable(e)) throw e;
      lastErr = e;
      if (attempt < delaysMs.length) {
        onRetry?.(attempt + 1);
        await new Promise((r) => setTimeout(r, delaysMs[attempt]));
      }
    }
  }
  throw lastErr;
}

/**
 * Shared retry delays used by all Zustand store fetch actions.
 * Tune here to adjust resilience behaviour across the whole app.
 */
export const STORE_RETRY_DELAYS: number[] = [1_000, 3_000];

/**
 * Returns false for Firebase/Firestore error codes that will never succeed on
 * retry (auth failures, bad arguments, missing permissions). Returns true for
 * transient errors (network timeouts, server unavailability) and any unknown
 * error without a code property.
 */
export function isRetryable(error: unknown): boolean {
  if (error == null || typeof error !== 'object' || !('code' in error)) return true;
  const raw = String((error as { code: unknown }).code);
  // Firebase error codes are "prefix/bare-code" (e.g. "firestore/permission-denied").
  const code = raw.includes('/') ? raw.split('/')[1] : raw;
  return !NON_RETRYABLE_CODES.has(code);
}

const NON_RETRYABLE_CODES = new Set([
  'permission-denied',
  'unauthenticated',
  'not-found',
  'invalid-argument',
  'already-exists',
  'failed-precondition',
  'out-of-range',
  'unimplemented',
  'data-loss',
]);

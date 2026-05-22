/**
 * Retries an async operation with exponential back-off.
 *
 * @param fn        The operation to attempt.
 * @param delaysMs  Milliseconds to wait between attempts. Length determines
 *                  the number of retries (e.g. [1000, 3000] = 2 retries).
 * @param onRetry   Optional callback fired just before each retry sleep,
 *                  receiving the attempt index (1-based).
 * @returns         The resolved value of the first successful attempt.
 * @throws          The last error if every attempt fails.
 */
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  delaysMs: number[] = [1_000, 3_000],
  onRetry?: (attempt: number) => void,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt < delaysMs.length) {
        onRetry?.(attempt + 1);
        await new Promise((r) => setTimeout(r, delaysMs[attempt]));
      }
    }
  }
  throw lastErr;
}

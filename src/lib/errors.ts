/**
 * Lightweight error-capture stub. Today it logs to the console; swap the body
 * for Sentry's `captureException` (or equivalent) without touching call sites.
 */
export function captureError(context: string, err: unknown): void {
  console.error(`[${context}]`, err);
}

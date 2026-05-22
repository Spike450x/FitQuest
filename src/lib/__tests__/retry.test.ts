import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry, isRetryable, STORE_RETRY_DELAYS } from '../retry';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── fetchWithRetry ───────────────────────────────────────────────────────────

describe('fetchWithRetry', () => {
  it('returns immediately on first-attempt success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await fetchWithRetry(fn, []);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries after delay and succeeds on second attempt', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('ok');
    const promise = fetchWithRetry(fn, [500]);
    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws the last error after exhausting all retries', async () => {
    const err = new Error('persistent');
    const fn = vi.fn().mockRejectedValue(err);
    const promise = fetchWithRetry(fn, [100, 200]);
    // Attach assertion before advancing timers to avoid unhandled-rejection warning.
    const assertion = expect(promise).rejects.toThrow('persistent');
    await vi.advanceTimersByTimeAsync(300);
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('calls onRetry callback before each retry sleep', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue('done');
    const promise = fetchWithRetry(fn, [100], onRetry);
    await vi.advanceTimersByTimeAsync(100);
    await promise;
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1);
  });

  it('uses exponential delays in order', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('x'));
    const promise = fetchWithRetry(fn, [100, 300]);
    const assertion = expect(promise).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(300);
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('rethrows a non-retryable error immediately without sleeping', async () => {
    const err = Object.assign(new Error('forbidden'), { code: 'firestore/permission-denied' });
    const fn = vi.fn().mockRejectedValue(err);
    // If fetchWithRetry slept it would hang because fake timers are not advanced.
    await expect(fetchWithRetry(fn, [10_000])).rejects.toThrow('forbidden');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('defaults to STORE_RETRY_DELAYS when no delaysMs is provided', async () => {
    const fn = vi.fn().mockResolvedValue('default');
    const result = await fetchWithRetry(fn);
    expect(result).toBe('default');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ─── isRetryable ─────────────────────────────────────────────────────────────

describe('isRetryable', () => {
  it('returns false for permission-denied', () => {
    expect(isRetryable({ code: 'firestore/permission-denied' })).toBe(false);
  });

  it('returns false for unauthenticated', () => {
    expect(isRetryable({ code: 'auth/unauthenticated' })).toBe(false);
  });

  it('returns false for invalid-argument', () => {
    expect(isRetryable({ code: 'functions/invalid-argument' })).toBe(false);
  });

  it('returns false for not-found', () => {
    expect(isRetryable({ code: 'firestore/not-found' })).toBe(false);
  });

  it('returns true for unavailable (transient server error)', () => {
    expect(isRetryable({ code: 'firestore/unavailable' })).toBe(true);
  });

  it('returns true for deadline-exceeded (timeout)', () => {
    expect(isRetryable({ code: 'firestore/deadline-exceeded' })).toBe(true);
  });

  it('returns true for a plain Error with no code property', () => {
    expect(isRetryable(new Error('network failure'))).toBe(true);
  });

  it('returns true for null and non-object values', () => {
    expect(isRetryable(null)).toBe(true);
    expect(isRetryable(undefined)).toBe(true);
    expect(isRetryable('string error')).toBe(true);
  });

  it('handles bare codes without a prefix', () => {
    expect(isRetryable({ code: 'permission-denied' })).toBe(false);
    expect(isRetryable({ code: 'unavailable' })).toBe(true);
  });
});

// ─── STORE_RETRY_DELAYS ───────────────────────────────────────────────────────

describe('STORE_RETRY_DELAYS', () => {
  it('is a two-element array of positive integers', () => {
    expect(STORE_RETRY_DELAYS).toHaveLength(2);
    expect(STORE_RETRY_DELAYS.every((d) => Number.isInteger(d) && d > 0)).toBe(true);
  });

  it('delays increase (backoff, not front-loaded)', () => {
    expect(STORE_RETRY_DELAYS[1]).toBeGreaterThan(STORE_RETRY_DELAYS[0]);
  });
});

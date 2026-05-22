import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from '../retry';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

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
});

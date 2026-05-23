import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { captureError } from '../errors';

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('captureError', () => {
  it('forwards the context and error to console.error', () => {
    const err = new Error('boom');
    captureError('myContext', err);
    expect(consoleErrorSpy).toHaveBeenCalledWith('[myContext]', err);
  });

  it('accepts non-Error values', () => {
    captureError('ctx', 'plain string');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ctx]', 'plain string');
  });

  it('accepts unknown shapes', () => {
    captureError('ctx', { code: 42 });
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ctx]', { code: 42 });
  });
});

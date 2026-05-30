import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { verifyTerraSignature } from '../terraSignature';

const SECRET = 'whsec_test_signing_secret';

function sign(body: string, timestamp: string, secret = SECRET): string {
  const v1 = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${v1}`;
}

describe('verifyTerraSignature', () => {
  const body = JSON.stringify({ type: 'activity', data: [] });
  const ts = '1748600000';

  it('accepts a correctly signed payload', () => {
    expect(verifyTerraSignature(body, sign(body, ts), SECRET)).toBe(true);
  });

  it('accepts a Buffer raw body', () => {
    expect(verifyTerraSignature(Buffer.from(body), sign(body, ts), SECRET)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const header = sign(body, ts);
    expect(verifyTerraSignature(body + ' ', header, SECRET)).toBe(false);
  });

  it('rejects a wrong secret', () => {
    expect(verifyTerraSignature(body, sign(body, ts), 'wrong_secret')).toBe(false);
  });

  it('rejects a mismatched timestamp (signed-over value differs)', () => {
    const header = sign(body, ts);
    const tampered = header.replace(`t=${ts}`, 't=1748600999');
    expect(verifyTerraSignature(body, tampered, SECRET)).toBe(false);
  });

  it('accepts when one of several v1 signatures matches (secret rotation)', () => {
    const good = createHmac('sha256', SECRET).update(`${ts}.${body}`).digest('hex');
    const header = `t=${ts},v1=deadbeef,v1=${good}`;
    expect(verifyTerraSignature(body, header, SECRET)).toBe(true);
  });

  it('rejects a missing or malformed header', () => {
    expect(verifyTerraSignature(body, undefined, SECRET)).toBe(false);
    expect(verifyTerraSignature(body, 'not-a-signature', SECRET)).toBe(false);
    expect(verifyTerraSignature(body, `t=${ts}`, SECRET)).toBe(false);
  });

  it('rejects when the secret is empty', () => {
    expect(verifyTerraSignature(body, sign(body, ts), '')).toBe(false);
  });
});

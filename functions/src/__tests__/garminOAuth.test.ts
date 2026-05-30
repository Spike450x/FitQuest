import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import {
  createPkcePair,
  createOAuthState,
  buildAuthorizeUrl,
  GARMIN_AUTHORIZE_URL,
} from '../garminOAuth';

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('createPkcePair', () => {
  it('derives the challenge as base64url(SHA-256(verifier))', () => {
    const { verifier, challenge } = createPkcePair();
    const expected = base64url(createHash('sha256').update(verifier).digest());
    expect(challenge).toBe(expected);
  });

  it('produces URL-safe, padding-free, high-entropy values', () => {
    const { verifier, challenge } = createPkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(createPkcePair().verifier).not.toBe(verifier); // random each call
  });
});

describe('createOAuthState', () => {
  it('is URL-safe and unique per call', () => {
    const a = createOAuthState();
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(createOAuthState()).not.toBe(a);
  });
});

describe('buildAuthorizeUrl', () => {
  it('includes the PKCE + redirect params on the Garmin authorize endpoint', () => {
    const url = buildAuthorizeUrl({
      clientId: 'cid',
      redirectUri: 'https://example.com/cb',
      challenge: 'chal',
      state: 'st',
    });
    expect(url.startsWith(`${GARMIN_AUTHORIZE_URL}?`)).toBe(true);
    const q = new URL(url).searchParams;
    expect(q.get('response_type')).toBe('code');
    expect(q.get('client_id')).toBe('cid');
    expect(q.get('code_challenge')).toBe('chal');
    expect(q.get('code_challenge_method')).toBe('S256');
    expect(q.get('redirect_uri')).toBe('https://example.com/cb');
    expect(q.get('state')).toBe('st');
  });
});

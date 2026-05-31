import { randomBytes, createHash } from 'crypto';

// Garmin Connect Developer Program — OAuth 2.0 PKCE.
//
// ⚠️ VERIFY POST-APPROVAL: these endpoint URLs match Garmin's published OAuth2
// PKCE spec, but Garmin only releases the authoritative values inside the
// developer portal once your Health API application is approved. Confirm them
// against your portal docs before going live; they are isolated here so a tweak
// is a one-line change. See docs/HEALTH-INTEGRATION.md § "Verify post-approval".
export const GARMIN_AUTHORIZE_URL = 'https://connect.garmin.com/oauth2Confirm';
export const GARMIN_TOKEN_URL = 'https://diauth.garmin.com/di-oauth2-service/oauth/token';
export const GARMIN_USER_ID_URL = 'https://apis.garmin.com/wellness-api/rest/user/id';

export interface PkcePair {
  /** High-entropy secret kept server-side until the callback. */
  verifier: string;
  /** SHA-256 → base64url of the verifier, sent on the authorize request. */
  challenge: string;
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** RFC 7636 PKCE pair (S256). Verifier is 43 chars of base64url entropy. */
export function createPkcePair(): PkcePair {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

/** Opaque CSRF/state token tying an authorize redirect to its callback. */
export function createOAuthState(): string {
  return base64url(randomBytes(24));
}

/** Builds the Garmin authorize URL the browser is redirected to. */
export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  challenge: string;
  state: string;
}): string {
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: params.clientId,
    code_challenge: params.challenge,
    code_challenge_method: 'S256',
    redirect_uri: params.redirectUri,
    state: params.state,
  });
  return `${GARMIN_AUTHORIZE_URL}?${q.toString()}`;
}

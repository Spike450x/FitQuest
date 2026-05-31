// Strava OAuth 2.0 (authorization-code, no PKCE) + API endpoints. Self-serve and
// stable — no partner approval required. Endpoints are public and documented at
// https://developers.strava.com/docs.

export const STRAVA_AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';
export const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
export const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

// `activity:read_all` covers private activities too; `read` is required for the
// athlete profile. We never request write scopes.
export const STRAVA_SCOPE = 'read,activity:read_all';

/** Builds the Strava authorize URL the browser is redirected to. */
export function buildStravaAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const q = new URLSearchParams({
    client_id: params.clientId,
    response_type: 'code',
    redirect_uri: params.redirectUri,
    approval_prompt: 'auto',
    scope: STRAVA_SCOPE,
    state: params.state,
  });
  return `${STRAVA_AUTHORIZE_URL}?${q.toString()}`;
}

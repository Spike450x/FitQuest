// Server-only persistence for provider OAuth tokens and the short-lived OAuth
// state. SECURITY: these collections hold secrets, so Firestore rules deny ALL
// client access (read + write). Only the admin-SDK Cloud Functions touch them.
// The client-readable `healthConnections` doc deliberately holds NO tokens.

export const HEALTH_TOKENS_COLLECTION = 'healthTokens';
export const HEALTH_OAUTH_STATES_COLLECTION = 'healthOAuthStates';

export interface OAuthState {
  uid: string;
  provider: string;
  /** PKCE verifier (Garmin). Empty for plain OAuth2 providers (Strava). */
  codeVerifier: string;
  /** App origin to redirect the browser back to after the callback completes. */
  returnOrigin: string;
}

export interface HealthTokenDoc {
  uid: string;
  provider: string;
  /** The provider's opaque user/athlete id — used to attribute inbound events. */
  providerUserId?: string;
  accessToken: string;
  refreshToken?: string;
  /** epoch ms — Garmin ~3 months, Strava ~6 hours (refresh required). */
  expiresAt?: number;
}

export async function saveOAuthState(
  db: FirebaseFirestore.Firestore,
  state: string,
  data: OAuthState,
): Promise<void> {
  await db
    .collection(HEALTH_OAUTH_STATES_COLLECTION)
    .doc(state)
    .set({ ...data, createdAt: Date.now() });
}

/** Reads + deletes the OAuth state (one-shot). Returns null if missing/expired. */
export async function consumeOAuthState(
  db: FirebaseFirestore.Firestore,
  state: string,
  maxAgeMs = 10 * 60 * 1000,
): Promise<OAuthState | null> {
  const ref = db.collection(HEALTH_OAUTH_STATES_COLLECTION).doc(state);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.delete().catch(() => undefined);
  const data = snap.data()!;
  if (typeof data.createdAt === 'number' && Date.now() - data.createdAt > maxAgeMs) return null;
  return {
    uid: data.uid as string,
    provider: data.provider as string,
    codeVerifier: (data.codeVerifier as string | undefined) ?? '',
    returnOrigin: (data.returnOrigin as string | undefined) ?? '',
  };
}

export async function saveTokens(
  db: FirebaseFirestore.Firestore,
  doc: HealthTokenDoc,
): Promise<void> {
  await db
    .collection(HEALTH_TOKENS_COLLECTION)
    .doc(`${doc.uid}_${doc.provider}`)
    .set({ ...doc, updatedAt: Date.now() }, { merge: true });
}

export async function getTokenDoc(
  db: FirebaseFirestore.Firestore,
  uid: string,
  provider: string,
): Promise<HealthTokenDoc | null> {
  const snap = await db.collection(HEALTH_TOKENS_COLLECTION).doc(`${uid}_${provider}`).get();
  return snap.exists ? (snap.data() as HealthTokenDoc) : null;
}

/** Resolves the FitQuest uid that owns a given provider user/athlete id. */
export async function findUidByProviderUserId(
  db: FirebaseFirestore.Firestore,
  provider: string,
  providerUserId: string,
): Promise<string | null> {
  const snap = await db
    .collection(HEALTH_TOKENS_COLLECTION)
    .where('provider', '==', provider)
    .where('providerUserId', '==', providerUserId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return (snap.docs[0].data().uid as string | undefined) ?? null;
}

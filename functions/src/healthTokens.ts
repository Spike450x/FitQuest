// Server-only persistence for Garmin OAuth tokens and the short-lived PKCE
// state. SECURITY: these collections hold secrets, so Firestore rules deny ALL
// client access (read + write). Only the admin-SDK Cloud Functions touch them.
// The client-readable `healthConnections` doc deliberately holds NO tokens.

export const HEALTH_TOKENS_COLLECTION = 'healthTokens';
export const HEALTH_OAUTH_STATES_COLLECTION = 'healthOAuthStates';

export interface HealthTokenDoc {
  uid: string;
  provider: string;
  garminUserId?: string;
  accessToken: string;
  refreshToken?: string;
  /** epoch ms — Garmin access tokens last ~3 months. */
  expiresAt?: number;
}

export interface OAuthState {
  uid: string;
  provider: string;
  codeVerifier: string;
  /** App origin to redirect the browser back to after the callback completes. */
  returnOrigin: string;
}

/** Persists the PKCE verifier + owner uid against the opaque `state` token. */
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

/** Reads + deletes the PKCE state (one-shot). Returns null if missing/expired. */
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
    codeVerifier: data.codeVerifier as string,
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

/** Resolves the FitQuest uid that owns a given Garmin user id. */
export async function findUidByGarminUserId(
  db: FirebaseFirestore.Firestore,
  garminUserId: string,
): Promise<string | null> {
  const snap = await db
    .collection(HEALTH_TOKENS_COLLECTION)
    .where('garminUserId', '==', garminUserId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return (snap.docs[0].data().uid as string | undefined) ?? null;
}

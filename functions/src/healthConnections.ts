export const HEALTH_CONNECTIONS_COLLECTION = 'healthConnections';

// Client-readable connection record (owner-read; server-write-only via rules).
// Holds NO secrets — OAuth tokens live in the server-only `healthTokens`
// collection. Doc id is `${uid}_${provider}`.

/** Upserts the per-(uid, provider) connection record. Server-only (admin SDK). */
export async function upsertConnection(
  db: FirebaseFirestore.Firestore,
  params: {
    uid: string;
    provider: string;
    providerUserId?: string;
    status?: 'connected' | 'error' | 'disconnected';
  },
): Promise<void> {
  const { uid, provider, providerUserId, status } = params;
  const data: Record<string, unknown> = {
    uid,
    provider,
    status: status ?? 'connected',
    lastSyncAt: Date.now(),
  };
  if (providerUserId) data.providerUserId = providerUserId;
  await db
    .collection(HEALTH_CONNECTIONS_COLLECTION)
    .doc(`${uid}_${provider}`)
    .set(data, { merge: true });
}

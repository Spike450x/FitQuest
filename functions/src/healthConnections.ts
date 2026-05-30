import type { TerraPayload } from './gameLogic/healthMapping';

export const HEALTH_CONNECTIONS_COLLECTION = 'healthConnections';

/**
 * Resolves the FitQuest uid that a Terra webhook payload belongs to.
 *
 * `reference_id` is the value we pass when generating the widget session
 * (always the signed-in uid), so on a signature-verified request it is the
 * authoritative owner. We fall back to a lookup by Terra `user_id` for events
 * that omit the reference (rare — some deauth events), matching a stored
 * connection written on a previous event.
 */
export async function resolveUidForConnection(
  db: FirebaseFirestore.Firestore,
  user: TerraPayload['user'],
): Promise<string | null> {
  const referenceId = user?.reference_id;
  if (referenceId) return referenceId;

  const terraUserId = user?.user_id;
  if (!terraUserId) return null;

  const snap = await db
    .collection(HEALTH_CONNECTIONS_COLLECTION)
    .where('terraUserId', '==', terraUserId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return (snap.docs[0].data().uid as string | undefined) ?? null;
}

/** Upserts the per-(uid, provider) connection record. Server-only (admin SDK). */
export async function upsertConnection(
  db: FirebaseFirestore.Firestore,
  params: { uid: string; provider: string; terraUserId?: string },
): Promise<void> {
  const { uid, provider, terraUserId } = params;
  const data: Record<string, unknown> = {
    uid,
    provider,
    status: 'connected',
    lastSyncAt: Date.now(),
  };
  if (terraUserId) data.terraUserId = terraUserId;
  await db
    .collection(HEALTH_CONNECTIONS_COLLECTION)
    .doc(`${uid}_${provider}`)
    .set(data, { merge: true });
}

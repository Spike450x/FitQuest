import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { HealthConnection } from '@/types';

export const HEALTH_CONNECTIONS_COLLECTION = 'healthConnections';

// CONTRACT: whenever a new optional field is added to HealthConnection, add a
// safe default here. See "Adding a post-MVP schema field" in docs/FIRESTORE.md.
export function normalizeHealthConnection(
  id: string,
  data: Record<string, unknown>,
): HealthConnection {
  return {
    id,
    uid: (data.uid as string | undefined) ?? '',
    provider: (data.provider as string | undefined) ?? 'unknown',
    providerUserId: data.providerUserId as string | undefined,
    status: (data.status as HealthConnection['status'] | undefined) ?? 'connected',
    lastSyncAt: data.lastSyncAt as number | undefined,
  };
}

/**
 * Subscribes to the signed-in user's wearable connections. Connections are
 * written server-side by the Garmin functions, so this is read-only and reflects
 * connect/sync events as they arrive.
 */
export function subscribeToHealthConnections(
  uid: string,
  onData: (connections: HealthConnection[]) => void,
  onError: () => void,
): () => void {
  const q = query(collection(db, HEALTH_CONNECTIONS_COLLECTION), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => normalizeHealthConnection(d.id, d.data()))),
    onError,
  );
}

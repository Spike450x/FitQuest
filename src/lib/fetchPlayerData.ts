import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ActivityLog, ActiveQuest, InventoryItem } from '@/types';

// ─── Field normalizers ────────────────────────────────────────────────────────
// Apply safe defaults for fields added after initial schema — prevents
// undefined from being silently cast as a typed value.

export function normalizeActivityLog(id: string, data: Record<string, unknown>): ActivityLog {
  return {
    ...data,
    id,
    // rewardEligible was added post-MVP; old docs lack the field.
    rewardEligible: (data.rewardEligible as boolean | undefined) ?? true,
  } as ActivityLog;
}

function normalizeActiveQuest(id: string, data: Record<string, unknown>): ActiveQuest {
  return {
    ...data,
    id,
    // progress and null-able timestamps were added in later schema versions.
    progress: (data.progress as number | undefined) ?? 0,
    completedAt: (data.completedAt as number | null | undefined) ?? null,
    claimedAt: (data.claimedAt as number | null | undefined) ?? null,
  } as ActiveQuest;
}

function normalizeInventoryItem(id: string, data: Record<string, unknown>): InventoryItem {
  return {
    ...data,
    id,
    quantity: (data.quantity as number | undefined) ?? 1,
    equipped: (data.equipped as boolean | undefined) ?? false,
  } as InventoryItem;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

export async function fetchActivityLogs(uid: string): Promise<ActivityLog[]> {
  const snap = await getDocs(
    query(
      collection(db, 'activityLogs'),
      where('uid', '==', uid),
      orderBy('loggedAt', 'desc'),
      limit(500),
    ),
  );
  return snap.docs.map((d) => normalizeActivityLog(d.id, d.data()));
}

export async function fetchActiveQuests(uid: string): Promise<ActiveQuest[]> {
  const snap = await getDocs(query(collection(db, 'activeQuests'), where('uid', '==', uid)));
  return snap.docs.map((d) => normalizeActiveQuest(d.id, d.data()));
}

export async function fetchInventoryItems(uid: string): Promise<InventoryItem[]> {
  const snap = await getDocs(query(collection(db, 'inventory'), where('uid', '==', uid)));
  return snap.docs.map((d) => normalizeInventoryItem(d.id, d.data()));
}

export { normalizeActiveQuest, normalizeInventoryItem };

/**
 * Opens a real-time listener for the user's most recent activity logs.
 * Returns the unsubscribe function — call it on cleanup.
 * Centralises the Firebase SDK import so hooks don't hold it directly.
 */
export function subscribeToRecentActivity(
  uid: string,
  count: number,
  onData: (logs: ActivityLog[]) => void,
  onError: () => void,
): () => void {
  const q = query(
    collection(db, 'activityLogs'),
    where('uid', '==', uid),
    orderBy('loggedAt', 'desc'),
    limit(count),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => normalizeActivityLog(d.id, d.data())));
    },
    onError,
  );
}

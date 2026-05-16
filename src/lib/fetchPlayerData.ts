import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ActivityLog, ActiveQuest, InventoryItem } from '@/types';

export async function fetchActivityLogs(uid: string): Promise<ActivityLog[]> {
  const snap = await getDocs(query(collection(db, 'activityLogs'), where('uid', '==', uid)));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      // rewardEligible was added after MVP; old docs lack the field.
      rewardEligible: (data.rewardEligible as boolean | undefined) ?? true,
    } as ActivityLog;
  });
}

export async function fetchActiveQuests(uid: string): Promise<ActiveQuest[]> {
  const snap = await getDocs(query(collection(db, 'activeQuests'), where('uid', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActiveQuest);
}

export async function fetchInventoryItems(uid: string): Promise<InventoryItem[]> {
  const snap = await getDocs(query(collection(db, 'inventory'), where('uid', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InventoryItem);
}

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
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          // rewardEligible was added after MVP; old docs lack the field.
          rewardEligible: (data.rewardEligible as boolean | undefined) ?? true,
        } as ActivityLog;
      });
      onData(items);
    },
    onError,
  );
}

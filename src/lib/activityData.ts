import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { utcDayStartMs } from '@/lib/gameLogic/streaks';
import type { ActivityLog } from '@/types';

export const ACTIVITY_LOGS_COLLECTION = 'activityLogs';

// CONTRACT: whenever a new optional field is added to ActivityLog, add a safe
// default here. See "Adding a post-MVP schema field" in docs/FIRESTORE.md.
export function normalizeActivityLog(id: string, data: Record<string, unknown>): ActivityLog {
  return {
    ...data,
    id,
    rewardEligible: (data.rewardEligible as boolean | undefined) ?? true,
  } as ActivityLog;
}

export async function fetchActivityLogs(uid: string): Promise<ActivityLog[]> {
  const snap = await getDocs(
    query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      where('uid', '==', uid),
      orderBy('loggedAt', 'desc'),
      limit(500),
    ),
  );
  return snap.docs.map((d) => normalizeActivityLog(d.id, d.data()));
}

export async function fetchRecentActivityLogs(uid: string, count: number): Promise<ActivityLog[]> {
  const snap = await getDocs(
    query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      where('uid', '==', uid),
      orderBy('loggedAt', 'desc'),
      limit(count),
    ),
  );
  return snap.docs.map((d) => normalizeActivityLog(d.id, d.data()));
}

/**
 * Fetches all activity logs of a specific type logged today (UTC midnight to now).
 * Used by the cap-proximity indicator in ActivityLogForm to show daily usage.
 * Uses the (uid, type, loggedAt ASC) composite index.
 */
export async function fetchTodayLogsForType(
  uid: string,
  type: string,
  referenceDate: Date = new Date(),
): Promise<ActivityLog[]> {
  const todayStartMs = utcDayStartMs(referenceDate);
  const snap = await getDocs(
    query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      where('uid', '==', uid),
      where('type', '==', type),
      where('loggedAt', '>=', todayStartMs),
      orderBy('loggedAt', 'asc'),
    ),
  );
  return snap.docs.map((d) => normalizeActivityLog(d.id, d.data()));
}

export function subscribeToRecentActivity(
  uid: string,
  count: number,
  onData: (logs: ActivityLog[]) => void,
  onError: () => void,
): () => void {
  const q = query(
    collection(db, ACTIVITY_LOGS_COLLECTION),
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

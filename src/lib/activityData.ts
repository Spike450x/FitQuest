/**
 * Firestore access layer for the activityLogs collection.
 *
 * New activity-log reads/writes for Dungeons (and future features) should live
 * here rather than in fetchPlayerData.ts. Existing callers of fetchActivityLogs
 * and subscribeToRecentActivity in fetchPlayerData.ts remain unchanged — they
 * will be migrated here incrementally.
 */
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { normalizeActivityLog } from '@/lib/fetchPlayerData';
import type { ActivityLog } from '@/types';

export const ACTIVITY_LOGS_COLLECTION = 'activityLogs';

/**
 * Fetches the N most recent activity logs for a user, sorted newest-first.
 * Use this for one-shot reads; for live updates use subscribeToRecentActivity
 * in fetchPlayerData.ts.
 */
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

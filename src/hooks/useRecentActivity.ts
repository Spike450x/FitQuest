import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ActivityLog } from '@/types';

export function useRecentActivity(uid: string | null | undefined, count = 5) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'activityLogs'),
      where('uid', '==', uid),
      orderBy('loggedAt', 'desc'),
      limit(count),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data();
          // rewardEligible was added after MVP; old docs lack the field.
          // Default to true — they were written before caps existed and were always eligible.
          return {
            id: d.id,
            ...data,
            rewardEligible: (data.rewardEligible as boolean | undefined) ?? true,
          } as ActivityLog;
        });
        setLogs(items);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return unsubscribe;
  }, [uid, count]);

  return { logs, loading };
}

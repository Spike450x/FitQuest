'use client';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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

    const q = query(collection(db, 'activityLogs'), where('uid', '==', uid));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as ActivityLog)
          .sort((a, b) => b.loggedAt - a.loggedAt)
          .slice(0, count);
        setLogs(items);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return unsubscribe;
  }, [uid, count]);

  return { logs, loading };
}

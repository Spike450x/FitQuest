import { useEffect, useState } from 'react';
import { subscribeToRecentActivity } from '@/lib/fetchPlayerData';
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

    return subscribeToRecentActivity(
      uid,
      count,
      (items) => {
        setLogs(items);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [uid, count]);

  return { logs, loading };
}

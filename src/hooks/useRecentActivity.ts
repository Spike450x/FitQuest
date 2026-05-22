'use client';

import { useActivityStore } from '@/store/activityStore';

export function useRecentActivity(_uid?: string | null) {
  const logs = useActivityStore((s) => s.recentLogs);
  const loading = useActivityStore((s) => s.loading);
  return { logs, loading };
}

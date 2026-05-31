'use client';

import { useEffect, useState } from 'react';
import { subscribeToHealthConnections } from '@/lib/healthData';
import { HEALTH_SYNC_ENABLED } from '@/lib/health';
import type { HealthConnection } from '@/types';

interface UseHealthConnections {
  connections: HealthConnection[];
  loading: boolean;
  error: boolean;
}

/**
 * Live view of the signed-in user's wearable connections. No-ops (returns an
 * empty, settled state) when the feature flag is off so callers can render
 * unconditionally without extra guards.
 */
export function useHealthConnections(uid: string | null | undefined): UseHealthConnections {
  const [connections, setConnections] = useState<HealthConnection[]>([]);
  const [loading, setLoading] = useState(HEALTH_SYNC_ENABLED);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!HEALTH_SYNC_ENABLED || !uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    const unsub = subscribeToHealthConnections(
      uid,
      (next) => {
        setConnections(next);
        setLoading(false);
      },
      () => {
        setError(true);
        setLoading(false);
      },
    );
    return unsub;
  }, [uid]);

  return { connections, loading, error };
}

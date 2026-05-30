'use client';

import { useEffect, useRef, useState } from 'react';
import { waitForPendingWrites } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

type BannerState = 'hidden' | 'offline' | 'syncing';

export function OfflineBanner() {
  const online = useOnlineStatus();
  const [bannerState, setBannerState] = useState<BannerState>('hidden');
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setBannerState('offline');
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      setBannerState('syncing');
      waitForPendingWrites(db).then(() => setBannerState('hidden'));
    }
  }, [online]);

  if (bannerState === 'hidden') return null;

  if (bannerState === 'syncing') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-center gap-2 bg-emerald-500 text-white text-sm font-medium py-2 px-4 shadow-sm"
      >
        <span aria-hidden="true">🔄</span>
        Reconnected — syncing changes…
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-center justify-center gap-2 bg-amber-500 text-white text-sm font-medium py-2 px-4 shadow-sm"
    >
      <span aria-hidden="true">📡</span>
      You&apos;re offline — queued changes will sync automatically when you reconnect.
    </div>
  );
}

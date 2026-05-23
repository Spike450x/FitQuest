'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Renders a sticky top banner when the browser reports no network connection.
 * Firestore's offline cache queues writes and syncs them automatically on reconnect.
 * Disappears automatically when connectivity is restored.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

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

'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Renders a sticky top banner when the browser reports no network connection.
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
      You&apos;re offline — changes may not save until you reconnect.
    </div>
  );
}

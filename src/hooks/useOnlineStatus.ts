'use client';

import { useEffect, useState } from 'react';

/** Returns true when the browser reports an active network connection. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Initialize from the real browser state (SSR renders as true; useEffect corrects it).
    setOnline(navigator.onLine);

    function handleOnline() {
      setOnline(true);
    }
    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}

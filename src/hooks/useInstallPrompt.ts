'use client';

import { useCallback, useEffect, useState } from 'react';

// Chrome / Edge / Samsung Internet expose this event when the page passes the
// PWA install criteria. iOS Safari doesn't fire it — we detect iOS separately
// and surface a manual instructions message instead.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

type InstallState =
  | { status: 'unsupported' }
  | { status: 'installed' }
  | { status: 'ios' }
  | { status: 'available'; prompt: () => Promise<'accepted' | 'dismissed'> };

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari proprietary
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Surfaces the PWA install prompt where the browser supports it.
 *
 * Behavior:
 * - `available` → call `prompt()` to trigger the native install dialog.
 * - `ios` → no browser API; UI should show manual "Share → Add to Home Screen" hint.
 * - `installed` → already standalone, hide prompts.
 * - `unsupported` → no install path; hide UI entirely.
 */
export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onAppInstalled() {
      setInstalled(true);
      setDeferred(null);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const prompt = useCallback(async (): Promise<'accepted' | 'dismissed'> => {
    if (!deferred) return 'dismissed';
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice.outcome;
  }, [deferred]);

  if (installed) return { status: 'installed' };
  if (deferred) return { status: 'available', prompt };
  if (isIOS()) return { status: 'ios' };
  return { status: 'unsupported' };
}

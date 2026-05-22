'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

const STORAGE_KEY = 'fitquest-install-prompt-dismissed';
const SHOW_DELAY_MS = 12_000;

/**
 * One-time install banner for new visitors who haven't installed yet.
 *
 * Renders a subtle bottom-of-screen card after `SHOW_DELAY_MS` of activity,
 * gives the player a single tap to install, and remembers their dismissal
 * so we don't nag.
 *
 * Mount once in the game layout — auth screens shouldn't see this.
 */
export function InstallBanner() {
  const state = useInstallPrompt();
  const [show, setShow] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (state.status !== 'available') return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // localStorage unavailable — still safe to show; just won't persist.
    }
    const t = setTimeout(() => setShow(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [state.status]);

  function dismiss() {
    setDismissing(true);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Ignore quota / privacy-mode errors.
    }
    setTimeout(() => setShow(false), 200);
  }

  async function install() {
    if (state.status !== 'available') return;
    const outcome = await state.prompt();
    if (outcome === 'accepted') {
      dismiss();
    }
  }

  if (!show || state.status !== 'available') return null;

  return (
    <div
      role="dialog"
      aria-label="Install FitQuest"
      className={`fixed inset-x-0 bottom-20 md:bottom-6 z-30 flex justify-center px-4 transition-all duration-200 ${
        dismissing ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="w-full max-w-md flex items-center gap-3 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-indigo-500/20 dark:shadow-black/40 px-4 py-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/40">
          <Download className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            Install FitQuest
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Add to your home screen for the full-screen game.
          </p>
        </div>
        <button
          type="button"
          onClick={install}
          className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold px-3 py-1.5 transition-all active:scale-[0.98] shadow-sm"
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Download, Smartphone, Check } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { toast } from '@/components/ui/Toaster';

/**
 * Install-as-PWA control. Renders the right affordance for the active platform:
 *  - Chrome / Android / desktop  → button that fires the native install dialog
 *  - iOS Safari                  → instructions panel (Share → Add to Home Screen)
 *  - Already installed           → muted "Installed" badge
 *  - No PWA support              → nothing
 */
export function InstallAppButton() {
  const state = useInstallPrompt();
  const [installing, setInstalling] = useState(false);

  if (state.status === 'unsupported') return null;

  if (state.status === 'installed') {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
        <Check className="w-4 h-4" aria-hidden="true" />
        Installed on this device
      </div>
    );
  }

  if (state.status === 'ios') {
    return (
      <div className="text-sm text-gray-600 dark:text-slate-300 space-y-1">
        <p className="flex items-center gap-2 font-medium">
          <Smartphone className="w-4 h-4" aria-hidden="true" />
          Install on iPhone or iPad
        </p>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Tap the <span aria-label="Share">⬆️</span> Share button below, then{' '}
          <span className="font-semibold">Add to Home Screen</span>.
        </p>
      </div>
    );
  }

  async function handleInstall() {
    if (state.status !== 'available') return;
    setInstalling(true);
    try {
      const outcome = await state.prompt();
      if (outcome === 'accepted') {
        toast.success('FitQuest installed!', {
          description: 'Find it on your home screen.',
        });
      }
    } finally {
      setInstalling(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      disabled={installing}
      className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <Download className="w-4 h-4" aria-hidden="true" />
      {installing ? 'Installing…' : 'Install app'}
    </button>
  );
}

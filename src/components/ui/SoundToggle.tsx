'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useSound } from '@/hooks/useSound';

interface SoundToggleProps {
  variant?: 'icon' | 'full';
  className?: string;
}

/**
 * Light/dark sound switcher. Reads + writes localStorage via `useSound`.
 * Plays a click sound on enable so the user gets immediate audio feedback
 * that things are wired up.
 */
export function SoundToggle({ variant = 'icon', className = '' }: SoundToggleProps) {
  const { enabled, setSoundEnabled, play } = useSound();
  const Icon = enabled ? Volume2 : VolumeX;
  const label = enabled ? 'Mute sound effects' : 'Enable sound effects';

  async function handleToggle() {
    const next = !enabled;
    await setSoundEnabled(next);
    if (next) {
      // Tiny "you're on" confirmation. play() respects the new enabled state.
      setTimeout(() => play('claim'), 50);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={label}
      aria-pressed={enabled}
      title={label}
      className={[
        'inline-flex items-center gap-2 rounded-lg transition-colors',
        'border',
        variant === 'icon' ? 'p-2' : 'px-3 py-1.5 text-sm font-medium',
        // Light
        'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900',
        // Dark
        'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon className="w-4 h-4" aria-hidden="true" strokeWidth={2} />
      {variant === 'full' && <span>{enabled ? 'Sound on' : 'Sound off'}</span>}
    </button>
  );
}

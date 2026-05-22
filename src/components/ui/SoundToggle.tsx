'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useSound } from '@/hooks/useSound';

interface SoundToggleProps {
  variant?: 'icon' | 'full';
  className?: string;
}

/**
 * Sound on/off toggle. Reads + writes localStorage via `useSound`.
 * Plays a click sound on enable so the user gets immediate audio feedback.
 *
 * Until `mounted` is true the button renders as an invisible same-size
 * placeholder so layout is stable and no state-specific content flashes.
 */
export function SoundToggle({ variant = 'icon', className = '' }: SoundToggleProps) {
  const { enabled, setSoundEnabled, play, mounted } = useSound();

  const baseClass = [
    'inline-flex items-center gap-2 rounded-lg transition-colors',
    'border',
    variant === 'icon' ? 'p-2' : 'px-3 py-1.5 text-sm font-medium',
    'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900',
    'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (!mounted) {
    return (
      <button
        type="button"
        aria-hidden="true"
        disabled
        className={`${baseClass} opacity-0 pointer-events-none`}
      >
        <div className="w-4 h-4" />
        {variant === 'full' && (
          <span aria-hidden="true" className="invisible select-none">
            Enable sound effects
          </span>
        )}
      </button>
    );
  }

  async function handleToggle() {
    const next = !enabled;
    await setSoundEnabled(next);
    if (next) {
      setTimeout(() => play('claim'), 50);
    }
  }

  const Icon = enabled ? Volume2 : VolumeX;
  const label = enabled ? 'Mute sound effects' : 'Enable sound effects';

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={label}
      aria-pressed={enabled}
      title={label}
      className={baseClass}
    >
      <Icon className="w-4 h-4" aria-hidden="true" strokeWidth={2} />
      {variant === 'full' && <span>{enabled ? 'Sound on' : 'Sound off'}</span>}
    </button>
  );
}

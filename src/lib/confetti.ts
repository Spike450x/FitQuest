'use client';

import confetti from 'canvas-confetti';

export type ConfettiIntensity = 'subtle' | 'medium' | 'celebration' | 'legendary';

const PRESETS: Record<
  ConfettiIntensity,
  { particleCount: number; spread: number; colors: string[]; bursts?: number }
> = {
  subtle: {
    particleCount: 40,
    spread: 50,
    colors: ['#a78bfa', '#60a5fa', '#34d399'],
  },
  medium: {
    particleCount: 90,
    spread: 65,
    colors: ['#fbbf24', '#a78bfa', '#34d399', '#60a5fa'],
  },
  celebration: {
    particleCount: 140,
    spread: 80,
    colors: ['#fbbf24', '#f59e0b', '#a78bfa', '#34d399', '#60a5fa'],
    bursts: 2,
  },
  legendary: {
    particleCount: 180,
    spread: 90,
    // Gold-heavy palette for legendary moments.
    colors: ['#fbbf24', '#f59e0b', '#fde047', '#fef08a', '#fb923c'],
    bursts: 3,
  },
};

/**
 * Fire confetti at the given intensity. No-ops if the document is hidden or
 * the user has prefers-reduced-motion enabled.
 */
export function fireConfetti(intensity: ConfettiIntensity = 'medium'): void {
  if (typeof document === 'undefined') return;
  if (document.visibilityState !== 'visible') return;
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  ) {
    return;
  }

  const preset = PRESETS[intensity];
  const bursts = preset.bursts ?? 1;

  for (let i = 0; i < bursts; i += 1) {
    setTimeout(() => {
      confetti({
        particleCount: preset.particleCount,
        spread: preset.spread,
        origin: { y: 0.4 },
        colors: preset.colors,
        ticks: 220,
        scalar: intensity === 'legendary' ? 1.2 : 1,
      });
    }, i * 250);
  }
}

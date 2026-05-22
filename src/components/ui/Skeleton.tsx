import type { HTMLAttributes } from 'react';

type Shape = 'line' | 'block' | 'circle' | 'card';

const SHAPE_CLASSES: Record<Shape, string> = {
  line: 'h-3 rounded',
  block: 'rounded-lg',
  circle: 'rounded-full',
  card: 'rounded-xl',
};

type Tone = 'light' | 'dark';

const TONE_CLASSES: Record<Tone, string> = {
  light: 'bg-gray-200/70 before:via-white/70 motion-reduce:bg-gray-200',
  dark: 'bg-slate-800 before:via-slate-700/80 motion-reduce:bg-slate-800',
};

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  shape?: Shape;
  /** Light (default page) or dark (dungeon) backgrounds. */
  tone?: Tone;
  /** Width via Tailwind class (e.g. "w-1/2"); default w-full. */
  width?: string;
  /** Height via Tailwind class. Default depends on shape. */
  height?: string;
}

/**
 * Shimmer-loading placeholder. Replaces ad-hoc `animate-pulse` blocks for a
 * more polished, game-y loading feel. Respects `prefers-reduced-motion`
 * (animation collapses to a static muted block).
 */
export function Skeleton({
  shape = 'block',
  tone = 'light',
  width = 'w-full',
  height,
  className = '',
  ...rest
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        'relative overflow-hidden',
        TONE_CLASSES[tone],
        'before:absolute before:inset-0 before:-translate-x-full',
        'before:bg-gradient-to-r before:from-transparent before:to-transparent',
        'before:animate-[shimmer-sweep_1.6s_ease-in-out_infinite]',
        'motion-reduce:before:animate-none',
        SHAPE_CLASSES[shape],
        width,
        height ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}

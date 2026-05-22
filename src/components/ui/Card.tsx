'use client';

import type { HTMLAttributes, ReactNode } from 'react';

type Variant = 'default' | 'hero' | 'highlight' | 'legendary' | 'dark' | 'flat';
type Padding = 'none' | 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<Variant, string> = {
  // Semantic-token-backed surfaces — automatically theme-swap via CSS vars.
  default: 'bg-surface border border-border-default shadow-card',
  hero: 'relative overflow-hidden bg-gradient-to-br from-indigo-100/80 via-white/90 to-violet-100/80 backdrop-blur-sm border border-indigo-200/80 shadow-lg shadow-indigo-500/10 dark:from-indigo-950/60 dark:via-slate-900/80 dark:to-violet-950/60 dark:border-indigo-800/60 dark:shadow-indigo-900/40',
  highlight:
    'bg-indigo-50/40 border border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800/60',
  legendary:
    'bg-gradient-to-br from-orange-50 via-amber-50/70 to-white border-2 border-orange-300 shadow-glow-legendary dark:from-orange-950/40 dark:via-amber-950/30 dark:to-slate-900 dark:border-orange-700',
  dark: 'bg-slate-900/95 backdrop-blur border border-slate-700 text-slate-100 shadow-elevated shadow-black/30',
  flat: 'bg-surface border border-border-default',
};

const PADDING_CLASSES: Record<Padding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5 sm:p-6',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  padding?: Padding;
  /** When true, card lifts and shadows on hover. */
  interactive?: boolean;
  children?: ReactNode;
}

/**
 * Standard FitQuest surface. Replaces the
 * `bg-white border border-gray-200 rounded-xl` pattern that's repeated dozens
 * of times across screens. Pair with `Heading` for consistent titling.
 */
export function Card({
  variant = 'default',
  padding = 'md',
  interactive = false,
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        'rounded-card',
        VARIANT_CLASSES[variant],
        PADDING_CLASSES[padding],
        interactive
          ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {variant === 'hero' && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-12 w-48 h-48 rounded-full bg-indigo-300/30 blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-12 w-48 h-48 rounded-full bg-violet-300/30 blur-3xl"
          />
        </>
      )}
      {variant === 'hero' ? <div className="relative">{children}</div> : children}
    </div>
  );
}

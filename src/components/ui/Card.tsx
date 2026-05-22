'use client';

import type { HTMLAttributes, ReactNode } from 'react';

type Variant = 'default' | 'hero' | 'highlight' | 'legendary' | 'dark' | 'flat';
type Padding = 'none' | 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<Variant, string> = {
  default: 'bg-white border border-gray-200 shadow-sm',
  hero: 'bg-gradient-to-br from-indigo-50 via-white to-violet-50 border border-indigo-100 shadow-md shadow-indigo-500/10',
  highlight: 'bg-indigo-50/40 border border-indigo-200',
  legendary:
    'bg-gradient-to-br from-orange-50 via-amber-50/70 to-white border-2 border-orange-300 shadow-lg shadow-orange-500/30',
  dark: 'bg-slate-900 border border-slate-700 text-slate-100 shadow-lg shadow-black/30',
  flat: 'bg-white border border-gray-200',
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
        'rounded-xl',
        VARIANT_CLASSES[variant],
        PADDING_CLASSES[padding],
        interactive ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}

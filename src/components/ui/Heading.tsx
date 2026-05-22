'use client';

import type { ReactNode } from 'react';

type Level = 1 | 2 | 3 | 4;

const SIZE_CLASSES: Record<Level, string> = {
  1: 'font-display text-3xl font-bold tracking-tight text-gray-900 dark:text-slate-100',
  2: 'font-display text-xl font-semibold tracking-tight text-gray-900 dark:text-slate-100',
  3: 'text-base font-semibold text-gray-900 dark:text-slate-100',
  4: 'text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400',
};

interface HeadingProps {
  level: Level;
  /** Optional override of the rendered tag (defaults to h{level}). */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  className?: string;
  id?: string;
  children: ReactNode;
}

/**
 * Enforced heading scale. New screens should reach for this rather than
 * sprinkling `text-2xl font-bold` etc. Tier 3 swaps in a fantasy display font
 * here without touching any consumers.
 */
export function Heading({ level, as, className = '', id, children }: HeadingProps) {
  const Tag = (as ?? (`h${level}` as const)) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return (
    <Tag id={id} className={`${SIZE_CLASSES[level]} ${className}`.trim()}>
      {children}
    </Tag>
  );
}

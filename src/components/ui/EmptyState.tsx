'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from './Card';

interface EmptyStateProps {
  /** Decorative emoji or icon. Wrapped in `aria-hidden`. */
  icon?: ReactNode;
  /** Bold title line. */
  title: string;
  /** Secondary explanation. Optional. */
  description?: string;
  /** Optional CTA — either a Link href or a button onClick. */
  cta?: { label: string; href: string } | { label: string; onClick: () => void };
  className?: string;
}

/**
 * Standard "no items here yet" panel. Replaces ad-hoc empty markup so the
 * voice and visual rhythm stay consistent across screens.
 */
export function EmptyState({ icon, title, description, cta, className = '' }: EmptyStateProps) {
  return (
    <Card variant="default" padding="lg" className={`text-center ${className}`}>
      {icon !== undefined && (
        <div className="text-3xl mb-2" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{title}</p>
      {description && (
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{description}</p>
      )}
      {cta &&
        ('href' in cta ? (
          <Link
            href={cta.href}
            className="inline-block mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
          >
            {cta.label} →
          </Link>
        ) : (
          <button
            type="button"
            onClick={cta.onClick}
            className="inline-block mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
          >
            {cta.label}
          </button>
        ))}
    </Card>
  );
}

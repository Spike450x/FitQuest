'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

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
    <div
      className={`bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm ${className}`}
    >
      {icon !== undefined && (
        <div className="text-3xl mb-2" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      {cta &&
        ('href' in cta ? (
          <Link
            href={cta.href}
            className="inline-block mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            {cta.label} →
          </Link>
        ) : (
          <button
            type="button"
            onClick={cta.onClick}
            className="inline-block mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            {cta.label}
          </button>
        ))}
    </div>
  );
}

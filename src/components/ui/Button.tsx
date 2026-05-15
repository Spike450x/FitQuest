'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent shadow-sm',
  secondary: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 shadow-sm',
  danger: 'bg-red-600 hover:bg-red-700 text-white border border-transparent shadow-sm',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 border border-transparent',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-xs px-2.5 py-1.5 rounded-lg',
  md: 'text-sm px-4 py-2 rounded-lg',
  lg: 'text-base px-5 py-2.5 rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** When true, disables the button and shows the `loadingLabel` (or a spinner). */
  loading?: boolean;
  /** Optional text to show in place of children while loading. */
  loadingLabel?: string;
  /** Renders the button at full container width. */
  fullWidth?: boolean;
}

/**
 * Standard FitQuest button. Inline button strings across the codebase should
 * migrate to this primitive over time so variant changes are centralized.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel,
    fullWidth = false,
    disabled,
    className = '',
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="inline-block w-3.5 h-3.5 border-2 border-current border-r-transparent rounded-full animate-spin"
        />
      )}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
    </button>
  );
});

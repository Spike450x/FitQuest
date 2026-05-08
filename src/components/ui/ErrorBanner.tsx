'use client';

interface ErrorBannerProps {
  /** Short user-facing summary. Defaults to a generic load-failure message. */
  title?: string;
  /** Optional detail line (e.g. the underlying error message). */
  message?: string | null;
  /** When provided, renders a Retry button that invokes this callback. */
  onRetry?: () => void;
  className?: string;
}

/**
 * Inline red banner for surfacing fetch/persistence errors. Used by store
 * consumer pages so a network failure no longer looks like an empty state.
 */
export function ErrorBanner({
  title = 'Something went wrong loading this page.',
  message,
  onRetry,
  className = '',
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={`bg-red-50 border border-red-200 rounded-xl px-4 py-3 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-red-700 font-semibold text-sm">{title}</p>
          {message && <p className="text-red-600 text-xs mt-1 break-words">{message}</p>}
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex-shrink-0 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

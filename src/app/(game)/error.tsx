'use client';

import { useEffect } from 'react';
import { captureError } from '@/lib/errors';

export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError('GameError boundary', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="text-6xl">⚠️</div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm">
          The game encountered an unexpected error. Your progress is safe — try refreshing this
          section.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.assign('/dashboard')}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
      {error.digest && (
        <p className="text-xs text-gray-300 dark:text-slate-600 font-mono">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}

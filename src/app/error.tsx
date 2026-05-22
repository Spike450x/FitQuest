'use client';

import { useEffect } from 'react';
import { captureError } from '@/lib/errors';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError('GlobalError boundary', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 text-center px-4 bg-white">
          <div className="text-6xl">💀</div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Critical error</h2>
            <p className="text-sm text-gray-500 max-w-sm">
              Something broke at the root level. This is rare — try reloading the page.
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
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Reload page
            </button>
          </div>
          {error.digest && (
            <p className="text-xs text-gray-300 font-mono">Error ID: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}

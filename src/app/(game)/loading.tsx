import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Shown by Next.js while game-segment pages are streaming or suspended.
 * Matches the typical page structure: a heading block, a stat row, and a
 * content card — generic enough to work as a stand-in for any game screen.
 */
export default function GameLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading…">
      {/* Page heading */}
      <div className="space-y-2">
        <Skeleton shape="line" height="h-8" width="w-48" />
        <Skeleton shape="line" height="h-4" width="w-64" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} shape="card" height="h-20" />
        ))}
      </div>

      {/* Main content card */}
      <Skeleton shape="card" height="h-64" />

      {/* Secondary card */}
      <Skeleton shape="card" height="h-40" />
    </div>
  );
}

import type { CSSProperties } from 'react';

interface BrandMarkProps {
  /** Optional pixel size for the crest. Wordmark scales by `1.6x` of this. */
  size?: number;
  /** Hide the wordmark when only the crest is wanted (e.g. tight mobile nav). */
  iconOnly?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * FitQuest brand mark — sword-on-shield crest beside the wordmark.
 *
 * The crest is a self-contained SVG so it scales crisply and tints with
 * the brand gradient. The wordmark uses the display font defined in
 * `tailwind.config.ts` (`var(--font-cinzel)`).
 *
 * Renders into header bars + auth screens, replacing the previous
 * text-only "FitQuest" anchor.
 */
export function BrandMark({ size = 28, iconOnly = false, className = '', style }: BrandMarkProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      style={style}
      aria-label="FitQuest"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="brand-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="brand-blade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        {/* Shield silhouette */}
        <path
          d="M 50 4 L 92 12 C 92 50, 82 80, 50 96 C 18 80, 8 50, 8 12 Z"
          fill="url(#brand-bg)"
          stroke="#fbbf24"
          strokeWidth="2"
        />
        {/* Sword */}
        <g>
          <rect x="44" y="46" width="12" height="6" fill="#475569" />
          <rect x="48" y="52" width="4" height="22" fill="#78350f" />
          <circle cx="50" cy="78" r="4" fill="#facc15" />
          <path d="M 46 46 L 46 18 L 50 10 L 54 18 L 54 46 Z" fill="url(#brand-blade)" />
        </g>
      </svg>
      {!iconOnly && (
        <span
          className="font-display font-bold tracking-tight"
          style={{ fontSize: Math.round(size * 0.72) }}
        >
          FitQuest
        </span>
      )}
    </span>
  );
}

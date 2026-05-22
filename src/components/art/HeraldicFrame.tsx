'use client';

import type { SVGProps } from 'react';

export type FrameVariant = 'shield' | 'sigil' | 'medallion';
export type FrameTint =
  | 'indigo'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'emerald'
  | 'sky'
  | 'orange'
  | 'slate'
  | 'gray'
  | 'green'
  | 'blue'
  | 'purple';

/**
 * Tint → hex stops for the frame's radial fill + ring color.
 * The silhouette inside paints with `currentColor`, which is set to the
 * frame's `text-*` class so the inner figure tints with the tier color.
 */
const TINTS: Record<FrameTint, { from: string; to: string; ring: string; text: string }> = {
  indigo: { from: '#e0e7ff', to: '#c7d2fe', ring: '#6366f1', text: '#312e81' },
  violet: { from: '#ede9fe', to: '#ddd6fe', ring: '#7c3aed', text: '#4c1d95' },
  rose: { from: '#ffe4e6', to: '#fecdd3', ring: '#e11d48', text: '#881337' },
  amber: { from: '#fef3c7', to: '#fde68a', ring: '#d97706', text: '#78350f' },
  emerald: { from: '#d1fae5', to: '#a7f3d0', ring: '#059669', text: '#064e3b' },
  sky: { from: '#e0f2fe', to: '#bae6fd', ring: '#0284c7', text: '#0c4a6e' },
  orange: { from: '#ffedd5', to: '#fed7aa', ring: '#ea580c', text: '#7c2d12' },
  slate: { from: '#f1f5f9', to: '#e2e8f0', ring: '#475569', text: '#1e293b' },
  gray: { from: '#f3f4f6', to: '#e5e7eb', ring: '#6b7280', text: '#374151' },
  green: { from: '#dcfce7', to: '#bbf7d0', ring: '#16a34a', text: '#14532d' },
  blue: { from: '#dbeafe', to: '#bfdbfe', ring: '#2563eb', text: '#1e3a8a' },
  purple: { from: '#f3e8ff', to: '#e9d5ff', ring: '#9333ea', text: '#581c87' },
};

/**
 * Dark-mode counterparts. Inverted depth — outer dark, inner glow.
 */
const TINTS_DARK: Record<FrameTint, { from: string; to: string; ring: string; text: string }> = {
  indigo: { from: '#312e81', to: '#1e1b4b', ring: '#818cf8', text: '#e0e7ff' },
  violet: { from: '#4c1d95', to: '#2e1065', ring: '#a78bfa', text: '#ede9fe' },
  rose: { from: '#881337', to: '#4c0519', ring: '#fb7185', text: '#ffe4e6' },
  amber: { from: '#78350f', to: '#451a03', ring: '#fbbf24', text: '#fef3c7' },
  emerald: { from: '#064e3b', to: '#022c22', ring: '#34d399', text: '#d1fae5' },
  sky: { from: '#0c4a6e', to: '#082f49', ring: '#38bdf8', text: '#e0f2fe' },
  orange: { from: '#7c2d12', to: '#431407', ring: '#fb923c', text: '#ffedd5' },
  slate: { from: '#1e293b', to: '#020617', ring: '#94a3b8', text: '#e2e8f0' },
  gray: { from: '#374151', to: '#111827', ring: '#9ca3af', text: '#e5e7eb' },
  green: { from: '#14532d', to: '#052e16', ring: '#4ade80', text: '#dcfce7' },
  blue: { from: '#1e3a8a', to: '#172554', ring: '#60a5fa', text: '#dbeafe' },
  purple: { from: '#581c87', to: '#3b0764', ring: '#c084fc', text: '#f3e8ff' },
};

interface HeraldicFrameProps extends SVGProps<SVGSVGElement> {
  variant?: FrameVariant;
  tint?: FrameTint;
  /** Inner figure rendered in `currentColor` — typically a silhouette path */
  children?: React.ReactNode;
  /** Optional ribbon name shown across the frame */
  ribbon?: string;
}

/**
 * Heraldic crest framing — shield / sigil / medallion shapes with a brand
 * gradient fill, tinted ring, and inset sheen. Slot a silhouette in
 * `children` and it paints with `currentColor` against the frame.
 *
 * Theme-aware via a unique `<defs>` id per render — both light + dark
 * gradients are emitted; CSS picks the right one based on the `.dark` class
 * on `<html>`.
 */
export function HeraldicFrame({
  variant = 'shield',
  tint = 'indigo',
  children,
  ribbon,
  ...rest
}: HeraldicFrameProps) {
  // Deterministic id so SVG defs don't collide across many renders.
  const uid = `${variant}-${tint}`;
  const light = TINTS[tint];
  const dark = TINTS_DARK[tint];

  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      {...rest}
    >
      <defs>
        {/* Light theme gradient */}
        <radialGradient id={`gradL-${uid}`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={light.from} />
          <stop offset="100%" stopColor={light.to} />
        </radialGradient>
        {/* Dark theme gradient */}
        <radialGradient id={`gradD-${uid}`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={dark.from} />
          <stop offset="100%" stopColor={dark.to} />
        </radialGradient>
        {/* Inset shadow */}
        <filter id={`inset-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
          <feOffset dy="1" />
          <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.25 0" />
          <feComposite in2="SourceGraphic" operator="over" />
        </filter>
        {/* Frame shape clip-path */}
        <clipPath id={`clip-${uid}`}>
          <FrameShape variant={variant} />
        </clipPath>
        {/* Drop shadow */}
        <filter id={`drop-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
          <feOffset dy="0.6" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0" />
          <feComposite in="SourceGraphic" />
        </filter>
      </defs>

      {/* Light variant — visible by default, hidden in dark */}
      <g className="dark:hidden">
        <FrameShape
          variant={variant}
          fill={`url(#gradL-${uid})`}
          stroke={light.ring}
          strokeWidth={2}
        />
        <g clipPath={`url(#clip-${uid})`} color={light.text}>
          {children}
        </g>
      </g>

      {/* Dark variant — hidden by default, visible under .dark */}
      <g className="hidden dark:block">
        <FrameShape
          variant={variant}
          fill={`url(#gradD-${uid})`}
          stroke={dark.ring}
          strokeWidth={2}
        />
        <g clipPath={`url(#clip-${uid})`} color={dark.text}>
          {children}
        </g>
      </g>

      {/* Optional ribbon name — shown across the lower frame */}
      {ribbon && (
        <g>
          <rect
            x="10"
            y="78"
            width="80"
            height="14"
            rx="2"
            className="fill-white/80 dark:fill-slate-950/70"
          />
          <text
            x="50"
            y="88"
            textAnchor="middle"
            className="fill-slate-700 dark:fill-slate-200"
            style={{
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: 1.2,
              fontFamily: 'var(--font-cinzel, serif)',
            }}
          >
            {ribbon.toUpperCase().slice(0, 14)}
          </text>
        </g>
      )}
    </svg>
  );
}

/**
 * Heraldic frame shape — the underlying path for shield / sigil / medallion.
 * Used both as the rendered backdrop and as a clip-path for the silhouette.
 */
function FrameShape({
  variant,
  ...rest
}: { variant: FrameVariant } & Omit<SVGProps<SVGPathElement>, 'd'>) {
  if (variant === 'medallion') {
    return <circle cx="50" cy="50" r="44" {...(rest as SVGProps<SVGCircleElement>)} />;
  }
  if (variant === 'sigil') {
    // Hexagon — six-sided badge
    return (
      <polygon
        points="50,6 88,28 88,72 50,94 12,72 12,28"
        {...(rest as SVGProps<SVGPolygonElement>)}
      />
    );
  }
  // shield — classic heater shape
  return <path d="M 50 6 L 88 14 C 88 50, 80 78, 50 94 C 20 78, 12 50, 12 14 Z" {...rest} />;
}

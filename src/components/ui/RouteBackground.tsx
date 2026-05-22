'use client';

import { usePathname } from 'next/navigation';

/**
 * Per-route thematic backdrop — adds depth without competing with content.
 *
 * Renders a `fixed` pointer-events-none layer behind everything: a soft
 * radial/linear gradient plus a tileable SVG pattern at low opacity. Each
 * scheme has light + dark variants. Dungeons override the layout's bg
 * directly, so we no-op there.
 *
 * The component is wired into the game layout — main content must sit above
 * it via stacking context, which the existing layout already enforces.
 */

interface Scheme {
  /** Base gradient — paints the page color behind everything else. */
  gradient: string;
  /** Inline SVG pattern, scaled / tinted for the route. */
  pattern: React.ReactNode;
  /** Optional vignette overlay (combat / boss feel). */
  vignette?: boolean;
}

function gradient(light: string, dark: string) {
  return `${light} dark:${dark}`;
}

const SCHEMES: Record<string, Scheme> = {
  dashboard: {
    gradient: gradient(
      'bg-gradient-to-br from-indigo-50 via-white to-violet-50',
      'dark:from-indigo-950/40 dark:via-slate-950 dark:to-violet-950/40',
    ),
    pattern: <CompassRosePattern />,
  },
  character: {
    gradient: gradient(
      'bg-gradient-to-b from-amber-50/60 via-white to-stone-50',
      'dark:from-amber-950/20 dark:via-slate-950 dark:to-stone-950/30',
    ),
    pattern: <ScrollPattern />,
  },
  activities: {
    gradient: gradient(
      'bg-gradient-to-b from-sky-50 via-white to-emerald-50/40',
      'dark:from-sky-950/30 dark:via-slate-950 dark:to-emerald-950/20',
    ),
    pattern: <SunburstPattern />,
  },
  combat: {
    gradient: gradient(
      'bg-gradient-to-b from-rose-50/40 via-white to-slate-100',
      'dark:from-rose-950/30 dark:via-slate-950 dark:to-slate-900',
    ),
    pattern: <ColosseumPattern />,
    vignette: true,
  },
  quests: {
    gradient: gradient(
      'bg-gradient-to-b from-amber-50/70 via-white to-yellow-50/40',
      'dark:from-amber-950/30 dark:via-slate-950 dark:to-yellow-950/20',
    ),
    pattern: <ScrollPattern />,
  },
  inventory: {
    gradient: gradient(
      'bg-gradient-to-br from-stone-50 via-white to-amber-50/40',
      'dark:from-stone-950/40 dark:via-slate-950 dark:to-amber-950/20',
    ),
    pattern: <CrosshatchPattern />,
  },
  shop: {
    gradient: gradient(
      'bg-gradient-to-b from-amber-50/60 via-amber-50/20 to-orange-50/40',
      'dark:from-amber-950/30 dark:via-slate-950 dark:to-orange-950/20',
    ),
    pattern: <WoodGrainPattern />,
  },
  stats: {
    gradient: gradient(
      'bg-gradient-to-br from-slate-50 via-white to-indigo-50/40',
      'dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/30',
    ),
    pattern: <GridPattern />,
  },
  profile: {
    gradient: gradient(
      'bg-gradient-to-b from-indigo-50/30 via-white to-white',
      'dark:from-indigo-950/30 dark:via-slate-950 dark:to-slate-950',
    ),
    pattern: <SigilPattern />,
  },
};

function topLevelSegment(pathname: string): keyof typeof SCHEMES | null {
  // Map the first non-empty segment of the path to a known scheme.
  const seg = pathname.split('/').filter(Boolean)[0];
  if (!seg) return null;
  return seg in SCHEMES ? (seg as keyof typeof SCHEMES) : null;
}

export function RouteBackground() {
  const pathname = usePathname();
  if (!pathname) return null;

  // Dungeons paint their own deep-slate background; we'd double-paint.
  if (pathname.startsWith('/combat/dungeons')) return null;

  const key = topLevelSegment(pathname);
  if (!key) return null;

  const scheme = SCHEMES[key];

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${scheme.gradient} transition-colors duration-300`}
    >
      {scheme.pattern}
      {scheme.vignette && (
        <div className="absolute inset-0 bg-radial-vignette" aria-hidden="true" />
      )}
    </div>
  );
}

// ── Pattern components ───────────────────────────────────────────────────────
// Each pattern is an inline SVG sized to the viewport, kept at low opacity so
// it adds texture without competing with content. Tailwind text-* colors flow
// into `currentColor` so the patterns swap with the light/dark theme.

function PatternLayer({
  children,
  opacity = 'opacity-[0.06]',
}: {
  children: React.ReactNode;
  opacity?: string;
}) {
  return (
    <svg
      className={`absolute inset-0 w-full h-full text-slate-900 dark:text-slate-100 ${opacity}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function CompassRosePattern() {
  return (
    <PatternLayer opacity="opacity-[0.05]">
      <defs>
        <pattern
          id="compass-rose"
          x="0"
          y="0"
          width="240"
          height="240"
          patternUnits="userSpaceOnUse"
        >
          <g stroke="currentColor" strokeWidth="1" fill="none">
            <circle cx="120" cy="120" r="44" />
            <circle cx="120" cy="120" r="24" />
            <line x1="120" y1="60" x2="120" y2="180" />
            <line x1="60" y1="120" x2="180" y2="120" />
            <line x1="78" y1="78" x2="162" y2="162" />
            <line x1="162" y1="78" x2="78" y2="162" />
            <polygon
              points="120,76 126,120 120,164 114,120"
              fill="currentColor"
              fillOpacity="0.25"
            />
            <polygon
              points="76,120 120,114 164,120 120,126"
              fill="currentColor"
              fillOpacity="0.25"
            />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#compass-rose)" />
    </PatternLayer>
  );
}

function ScrollPattern() {
  return (
    <PatternLayer opacity="opacity-[0.05]">
      <defs>
        <pattern id="scroll" x="0" y="0" width="180" height="180" patternUnits="userSpaceOnUse">
          <g stroke="currentColor" strokeWidth="0.8" fill="none">
            <line x1="20" y1="40" x2="160" y2="40" />
            <line x1="20" y1="68" x2="140" y2="68" />
            <line x1="20" y1="96" x2="155" y2="96" />
            <line x1="20" y1="124" x2="130" y2="124" />
            <line x1="20" y1="152" x2="150" y2="152" />
            <circle cx="170" cy="40" r="3" fill="currentColor" fillOpacity="0.4" />
            <circle cx="150" cy="68" r="3" fill="currentColor" fillOpacity="0.4" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#scroll)" />
    </PatternLayer>
  );
}

function SunburstPattern() {
  return (
    <PatternLayer opacity="opacity-[0.07]">
      <defs>
        <radialGradient id="sunburst" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.7" />
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#sunburst)" />
      <g stroke="currentColor" strokeWidth="0.6" opacity="0.5">
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * Math.PI;
          // Rays radiate from the top-center anchor down across the viewport.
          const x2 = 50 + Math.cos(angle - Math.PI / 2) * 80;
          const y2 = Math.sin(angle - Math.PI / 2) * 80 + 40;
          return <line key={i} x1="50%" y1="0%" x2={`${x2}%`} y2={`${y2}%`} />;
        })}
      </g>
    </PatternLayer>
  );
}

function ColosseumPattern() {
  return (
    <PatternLayer opacity="opacity-[0.07]">
      <defs>
        <pattern id="arches" x="0" y="0" width="120" height="160" patternUnits="userSpaceOnUse">
          <g stroke="currentColor" strokeWidth="1" fill="none">
            <path d="M 10 150 L 10 80 A 50 50 0 0 1 110 80 L 110 150" />
            <line x1="10" y1="100" x2="110" y2="100" />
            <line x1="10" y1="150" x2="110" y2="150" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#arches)" />
    </PatternLayer>
  );
}

function CrosshatchPattern() {
  return (
    <PatternLayer opacity="opacity-[0.05]">
      <defs>
        <pattern
          id="hatch"
          x="0"
          y="0"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="12" stroke="currentColor" strokeWidth="0.8" />
        </pattern>
        <pattern
          id="hatch2"
          x="0"
          y="0"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="12"
            stroke="currentColor"
            strokeWidth="0.8"
            opacity="0.6"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hatch)" />
      <rect width="100%" height="100%" fill="url(#hatch2)" />
    </PatternLayer>
  );
}

function WoodGrainPattern() {
  return (
    <PatternLayer opacity="opacity-[0.06]">
      <defs>
        <pattern id="grain" x="0" y="0" width="400" height="80" patternUnits="userSpaceOnUse">
          <g stroke="currentColor" strokeWidth="0.6" fill="none" opacity="0.7">
            <path d="M 0 12 Q 100 8, 200 12 T 400 14" />
            <path d="M 0 28 Q 120 22, 220 28 T 400 30" />
            <path d="M 0 44 Q 80 40, 200 46 T 400 44" />
            <path d="M 0 60 Q 110 56, 210 60 T 400 62" />
            <path d="M 0 76 Q 90 70, 200 76 T 400 76" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grain)" />
    </PatternLayer>
  );
}

function GridPattern() {
  return (
    <PatternLayer opacity="opacity-[0.05]">
      <defs>
        <pattern id="grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.6" />
        </pattern>
        <pattern id="grid-major" x="0" y="0" width="160" height="160" patternUnits="userSpaceOnUse">
          <path
            d="M 160 0 L 0 0 0 160"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.6"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      <rect width="100%" height="100%" fill="url(#grid-major)" />
    </PatternLayer>
  );
}

function SigilPattern() {
  return (
    <PatternLayer opacity="opacity-[0.05]">
      <defs>
        <pattern id="sigil" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
          <g stroke="currentColor" strokeWidth="0.8" fill="none">
            <circle cx="100" cy="100" r="32" />
            <circle cx="100" cy="100" r="20" />
            <polygon points="100,72 124,114 76,114" />
            <line x1="100" y1="68" x2="100" y2="132" />
            <line x1="72" y1="100" x2="128" y2="100" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#sigil)" />
    </PatternLayer>
  );
}

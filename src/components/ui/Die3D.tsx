'use client';

import { useEffect, useState } from 'react';

const DIE_PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [
    [0, 2],
    [2, 0],
  ],
  3: [
    [0, 2],
    [1, 1],
    [2, 0],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
};

const FACE_ROTATIONS: Record<number, string> = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateY(-90deg)',
  3: 'rotateX(90deg)',
  4: 'rotateX(-90deg)',
  5: 'rotateY(90deg)',
  6: 'rotateX(180deg)',
};

// [face position factory (receives half-size in px), pip value on this face]
const FACES: [(h: number) => string, number][] = [
  [(h) => `translateZ(${h}px)`, 1],
  [(h) => `rotateY(180deg) translateZ(${h}px)`, 6],
  [(h) => `rotateY(90deg) translateZ(${h}px)`, 2],
  [(h) => `rotateY(-90deg) translateZ(${h}px)`, 5],
  [(h) => `rotateX(-90deg) translateZ(${h}px)`, 4],
  [(h) => `rotateX(90deg) translateZ(${h}px)`, 3],
];

function randomRotation(): string {
  const x = Math.round(Math.random() * 360);
  const y = Math.round(Math.random() * 360);
  return `rotateX(${x}deg) rotateY(${y}deg)`;
}

export type DieColor = 'indigo' | 'sky' | 'rose' | 'amber' | 'gray' | 'slate' | 'violet';

// Per-color face classes for the `color` prop (action-roll dice use these instead of variant tints)
const COLOR_FACE_CLASSES: Record<DieColor, { spinning: string; settled: string }> = {
  indigo: {
    spinning:
      'bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400',
    settled:
      'bg-white dark:bg-slate-900 border-2 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300',
  },
  sky: {
    spinning:
      'bg-sky-50 dark:bg-sky-950/40 border-2 border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400',
    settled:
      'bg-white dark:bg-slate-900 border-2 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300',
  },
  rose: {
    spinning:
      'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-700 text-rose-500 dark:text-rose-400',
    settled:
      'bg-white dark:bg-slate-900 border-2 border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-300',
  },
  amber: {
    spinning:
      'bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400',
    settled:
      'bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-700 text-amber-700 dark:text-amber-300',
  },
  gray: {
    spinning:
      'bg-gray-50 dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500',
    settled:
      'bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400',
  },
  slate: {
    spinning:
      'bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400',
    settled:
      'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300',
  },
  violet: {
    spinning:
      'bg-violet-50 dark:bg-violet-950/40 border-2 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400',
    settled:
      'bg-white dark:bg-slate-900 border-2 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300',
  },
};

export function Die3D({
  value,
  variant = 'settled',
  size = 'sm',
  format = 'pips',
  color,
}: {
  value: number;
  variant?: 'spinning' | 'settled' | 'highlighted' | 'wildcard';
  /** sm = 28 px · lg = 56 px · xl = 80 px */
  size?: 'sm' | 'lg' | 'xl';
  /** pips = d6 pip faces (default) · number = large numeral on each face (d10 action rolls) */
  format?: 'pips' | 'number';
  /** When set, overrides the variant-based face tint with a fixed color scheme. */
  color?: DieColor;
}) {
  const isWildcard = value === 0 || variant === 'wildcard';
  const isSpinning = variant === 'spinning' && !isWildcard;

  const S = size === 'xl' ? 80 : size === 'lg' ? 56 : 28;
  const half = S / 2;
  const borderRadius = size === 'xl' ? '16px' : size === 'lg' ? '12px' : '6px';
  const pipSize = size === 'lg' ? 'w-3 h-3' : 'w-1.5 h-1.5';
  const gridPad = size === 'lg' ? 'p-2' : 'p-1';
  const numTextSize = size === 'xl' ? 'text-4xl' : size === 'lg' ? 'text-3xl' : 'text-xl';

  const [cubeTransform, setCubeTransform] = useState(randomRotation);

  useEffect(() => {
    if (!isSpinning) {
      if (!isWildcard) {
        // Number format: always orient to front face; pip format: show matching pip face
        setCubeTransform(
          format === 'number' ? FACE_ROTATIONS[1] : (FACE_ROTATIONS[value] ?? FACE_ROTATIONS[1]),
        );
      }
      return;
    }
    const id = setInterval(() => setCubeTransform(randomRotation()), 75);
    return () => clearInterval(id);
  }, [isSpinning, isWildcard, value, format]);

  const faceClass = isWildcard
    ? 'bg-gray-50 dark:bg-slate-900 border-2 border-dashed border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600'
    : color
      ? COLOR_FACE_CLASSES[color][variant === 'spinning' ? 'spinning' : 'settled']
      : variant === 'spinning'
        ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-700 text-rose-500 dark:text-rose-400'
        : variant === 'highlighted'
          ? 'bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 text-amber-600 dark:text-amber-400'
          : 'bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300';

  const containerClass = [
    'shrink-0 transition-transform duration-150',
    variant === 'highlighted' ? 'scale-110 shadow-md shadow-amber-100 dark:shadow-amber-900' : '',
    variant === 'spinning' ? 'shadow-md shadow-rose-200 dark:shadow-rose-900' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass} style={{ width: S, height: S, perspective: S * 10 }}>
      <div
        style={{
          width: S,
          height: S,
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: cubeTransform,
          transition: isSpinning ? 'none' : 'transform 500ms ease-out',
        }}
      >
        {FACES.map(([faceTx, faceVal]) => (
          <div
            key={faceVal}
            style={{
              position: 'absolute',
              inset: 0,
              transform: faceTx(half),
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              borderRadius,
            }}
            className={faceClass}
          >
            {isWildcard ? (
              <div className="flex items-center justify-center w-full h-full text-xs font-bold">
                ?
              </div>
            ) : format === 'number' ? (
              <div className="flex flex-col items-center justify-center w-full h-full">
                <span className={`${numTextSize} font-black leading-none`}>{value}</span>
                {size === 'xl' && (
                  <span className="text-xs font-semibold opacity-40 mt-1 tracking-widest">d10</span>
                )}
              </div>
            ) : (
              <div className={`grid grid-cols-3 grid-rows-3 w-full h-full ${gridPad}`}>
                {Array.from({ length: 9 }, (_, idx) => {
                  const row = Math.floor(idx / 3);
                  const col = idx % 3;
                  const pips = DIE_PIPS[faceVal] ?? [];
                  const hasPip = pips.some(([r, c]) => r === row && c === col);
                  return (
                    <div key={idx} className="flex items-center justify-center">
                      {hasPip && <div className={`rounded-full bg-current ${pipSize}`} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';

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

// [face position transform (template with HALF placeholder), pip value on this face]
const FACES: [string, number][] = [
  ['translateZ(HALF)', 1],
  ['rotateY(180deg) translateZ(HALF)', 6],
  ['rotateY(90deg) translateZ(HALF)', 2],
  ['rotateY(-90deg) translateZ(HALF)', 5],
  ['rotateX(-90deg) translateZ(HALF)', 4],
  ['rotateX(90deg) translateZ(HALF)', 3],
];

function randomRotation(): string {
  const x = Math.round(Math.random() * 360);
  const y = Math.round(Math.random() * 360);
  return `rotateX(${x}deg) rotateY(${y}deg)`;
}

export function Die3D({
  value,
  variant = 'settled',
  size = 'sm',
}: {
  value: number;
  variant?: 'spinning' | 'settled' | 'highlighted' | 'wildcard';
  size?: 'sm' | 'lg';
}) {
  const isWildcard = value === 0 || variant === 'wildcard';
  const isSpinning = variant === 'spinning' && !isWildcard;

  const S = size === 'lg' ? 56 : 28;
  const half = S / 2;
  const borderRadius = size === 'lg' ? '12px' : '6px';
  const pipSize = size === 'lg' ? 'w-3 h-3' : 'w-1.5 h-1.5';
  const gridPad = size === 'lg' ? 'p-2' : 'p-1';

  const [cubeTransform, setCubeTransform] = useState(randomRotation);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isSpinning) {
      intervalRef.current = setInterval(() => {
        setCubeTransform(randomRotation());
      }, 75);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!isWildcard) {
      setCubeTransform(FACE_ROTATIONS[value] ?? FACE_ROTATIONS[1]);
    }
  }, [isSpinning, isWildcard, value]);

  const faceClass = isWildcard
    ? 'bg-gray-50 dark:bg-slate-900 border-2 border-dashed border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600'
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
    <div className={containerClass} style={{ width: S, height: S, perspective: S * 5 }}>
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
              transform: faceTx.replace(/HALF/g, `${half}px`),
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

'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { xpProgress } from '@/lib/gameLogic/xp';

interface XPBarProps {
  xp: number;
  level: number;
  xpToNextLevel: number;
}

export function XPBar({ xp, level, xpToNextLevel }: XPBarProps) {
  const progress = xpProgress(xp, level);
  const pct = Math.round(progress * 100);
  const reduce = useReducedMotion();

  // Flash when XP changes for satisfying "ding" feedback.
  const [flash, setFlash] = useState(false);
  const lastXpRef = useRef(xp);
  useEffect(() => {
    if (reduce) {
      lastXpRef.current = xp;
      return;
    }
    if (xp !== lastXpRef.current) {
      lastXpRef.current = xp;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 700);
      return () => clearTimeout(t);
    }
  }, [xp, reduce]);

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-indigo-600 dark:text-indigo-300 mb-1 font-medium tabular-nums">
        <span className="font-display tracking-wide">Level {level}</span>
        <span>
          {xp.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP
        </span>
      </div>
      <div className="relative w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Experience: level ${level}, ${xp} of ${xpToNextLevel} XP`}
          className={`h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700 ease-out ${
            flash ? 'shadow-[0_0_12px_rgba(99,102,241,0.7)]' : ''
          }`}
          style={{ width: `${pct}%` }}
        />
        {/* Shimmer pass on flash */}
        {flash && !reduce && (
          <span
            className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent shimmer rounded-full"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}

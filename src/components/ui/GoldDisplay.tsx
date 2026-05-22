'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface GoldDisplayProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  /** When true, tween between value changes; defaults to true. */
  animate?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<GoldDisplayProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl font-bold',
};

export function GoldDisplay({ amount, size = 'md', animate = true }: GoldDisplayProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(amount);
  const fromRef = useRef(amount);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (reduce || !animate) {
      setDisplay(amount);
      fromRef.current = amount;
      return;
    }
    const from = fromRef.current;
    if (from === amount) return;

    setPulse(true);
    const start = performance.now();
    const duration = 700;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (amount - from) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = amount;
        setTimeout(() => setPulse(false), 250);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [amount, animate, reduce]);

  return (
    <span
      className={`inline-flex items-center gap-1 text-amber-400 tabular-nums transition-transform ${SIZE_CLASSES[size]} ${
        pulse ? 'scale-110 text-amber-500' : ''
      }`}
    >
      <span className="text-amber-300">&#9670;</span>
      {display.toLocaleString()}
    </span>
  );
}

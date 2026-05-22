'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  /** Tween duration in ms (default 900). */
  duration?: number;
  /** Prefix rendered before the number (e.g. "+"). */
  prefix?: string;
  /** Suffix rendered after the number. */
  suffix?: string;
  /** Optional className for the span. */
  className?: string;
  /** Decimal places to show (default 0 — integer counter). */
  decimals?: number;
}

/**
 * Counter that tweens from 0 (or the previous value) to `value` over `duration` ms.
 * Respects prefers-reduced-motion — snaps to the final value in that case.
 */
export function AnimatedNumber({
  value,
  duration = 900,
  prefix = '',
  suffix = '',
  className = '',
  decimals = 0,
}: AnimatedNumberProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }

    const from = fromRef.current;
    const to = value;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

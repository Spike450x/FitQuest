'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ComponentProps, KeyboardEvent, MouseEvent } from 'react';
import { useReducedMotion } from 'framer-motion';
import { SpellCard } from './SpellCard';
import { SpellCardBack } from './SpellCardBack';
import type { ItemRarity } from '@/types';

const SHIMMER_TINT: Record<ItemRarity, string> = {
  common: '180, 180, 190',
  uncommon: '80, 180, 110',
  rare: '90, 140, 220',
  epic: '170, 90, 220',
  legendary: '220, 170, 50',
};

const DEPTH_SHADOW: Record<ItemRarity, string> = {
  common: '100, 100, 110',
  uncommon: '50, 140, 80',
  rare: '60, 100, 200',
  epic: '130, 50, 200',
  legendary: '200, 140, 30',
};

type PremiumSpellCardProps = ComponentProps<typeof SpellCard>;

/**
 * Premium spell card — hover-tilt + shimmer (existing) plus an MTG-style
 * front/back flip. The action button on the front face stops propagation,
 * so clicking Buy / Equip / Cast never triggers the flip.
 */
export function PremiumSpellCard({ def, className = '', ...rest }: PremiumSpellCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);
  const willChangeCleanupRef = useRef<(() => void) | null>(null);
  const tiltRef = useRef({ x: 0, y: 0 });

  const [isFlipped, setIsFlipped] = useState(false);
  const reduceMotion = useReducedMotion();

  const { tint, restShadow, hoverShadow } = useMemo(() => {
    const t = SHIMMER_TINT[def.rarity];
    const d = DEPTH_SHADOW[def.rarity];
    return {
      tint: t,
      restShadow: `0 4px 12px -2px rgba(${d}, 0.35), 0 2px 4px rgba(0,0,0,0.1)`,
      hoverShadow: `0 12px 28px -4px rgba(${d}, 0.55), 0 4px 8px rgba(0,0,0,0.2)`,
    };
  }, [def.rarity]);

  const applyTransform = useCallback(
    (flipped: boolean, tiltX: number, tiltY: number, lifted: boolean) => {
      const el = innerRef.current;
      if (!el) return;
      const baseFlip = flipped ? 180 : 0;
      const lift = lifted ? -4 : 0;
      el.style.transform = `translateY(${lift}px) rotateY(${baseFlip + tiltY}deg) rotateX(${tiltX}deg)`;
    },
    [],
  );

  function handleMouseEnter() {
    const el = wrapperRef.current;
    if (!el) return;
    if (willChangeCleanupRef.current) {
      willChangeCleanupRef.current();
      willChangeCleanupRef.current = null;
    }
    el.style.willChange = 'transform';
    if (innerRef.current) innerRef.current.style.transition = 'none';
  }

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el = wrapperRef.current;
    const inner = innerRef.current;
    const sh = shimmerRef.current;
    if (!el || !inner || !sh) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    inner.style.transition = 'none';
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotY = (x - 0.5) * 20;
    const rotX = -(y - 0.5) * 20;
    tiltRef.current = { x: rotX, y: rotY };
    applyTransform(isFlipped, rotX, rotY, true);
    el.style.boxShadow = hoverShadow;
    const isDark = document.documentElement.classList.contains('dark');
    sh.style.mixBlendMode = isDark ? 'screen' : 'overlay';
    sh.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(${tint}, ${isDark ? 0.15 : 0.25}) 0%, transparent 60%)`;
  }

  function handleMouseLeave() {
    const el = wrapperRef.current;
    const inner = innerRef.current;
    const sh = shimmerRef.current;
    if (!el || !inner || !sh) return;
    const transitionDuration = reduceMotion ? '0ms' : '300ms';
    inner.style.transition = `transform ${transitionDuration} ease-out`;
    el.style.transition = `box-shadow ${transitionDuration} ease-out`;
    tiltRef.current = { x: 0, y: 0 };
    applyTransform(isFlipped, 0, 0, false);
    el.style.boxShadow = restShadow;
    sh.style.background = 'none';
    const cleanup = (ev: TransitionEvent) => {
      if (ev.propertyName !== 'transform') return;
      el.style.willChange = 'auto';
      inner.removeEventListener('transitionend', cleanup);
      willChangeCleanupRef.current = null;
    };
    willChangeCleanupRef.current = () => inner.removeEventListener('transitionend', cleanup);
    inner.addEventListener('transitionend', cleanup);
  }

  const toggleFlip = useCallback(() => {
    setIsFlipped((prev) => {
      const next = !prev;
      const inner = innerRef.current;
      if (inner) {
        inner.style.transition = reduceMotion
          ? 'none'
          : 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)';
      }
      applyTransform(next, tiltRef.current.x, tiltRef.current.y, false);
      return next;
    });
  }, [applyTransform, reduceMotion]);

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    // Ignore clicks that originated on the inner action button (it stops
    // propagation in SpellCard, but guard here too for safety on touch UAs
    // that synthesise click events differently).
    if ((e.target as HTMLElement).closest('button')) return;
    toggleFlip();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      // Let buttons handle their own Enter/Space presses
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      e.preventDefault();
      toggleFlip();
    }
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative rounded-2xl ${className}`}
      style={{
        boxShadow: restShadow,
        perspective: '1000px',
        cursor: 'pointer',
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isFlipped}
      aria-label={`${def.name} card, showing ${isFlipped ? 'back' : 'front'}. Click to flip.`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={innerRef}
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          transition: reduceMotion ? 'none' : 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Front face — interactive spell card */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          aria-hidden={isFlipped}
        >
          <SpellCard def={def} {...rest} disableShadow />
          <div
            ref={shimmerRef}
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{ mixBlendMode: 'overlay' }}
          />
        </div>

        {/* Back face — uniform spellbook design */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          aria-hidden={!isFlipped}
        >
          <SpellCardBack rarity={def.rarity} hasActionFooter={Boolean(rest.actionLabel)} />
        </div>
      </div>
    </div>
  );
}

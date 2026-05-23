'use client';

import { useRef, useMemo } from 'react';
import type { ComponentProps } from 'react';
import { SpellCard } from './SpellCard';
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

export function PremiumSpellCard({ def, className = '', ...rest }: PremiumSpellCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);
  const willChangeCleanupRef = useRef<(() => void) | null>(null);

  const { tint, restShadow, hoverShadow } = useMemo(() => {
    const t = SHIMMER_TINT[def.rarity];
    const d = DEPTH_SHADOW[def.rarity];
    return {
      tint: t,
      restShadow: `0 4px 12px -2px rgba(${d}, 0.35), 0 2px 4px rgba(0,0,0,0.1)`,
      hoverShadow: `0 12px 28px -4px rgba(${d}, 0.55), 0 4px 8px rgba(0,0,0,0.2)`,
    };
  }, [def.rarity]);

  function handleMouseEnter() {
    const el = wrapperRef.current;
    if (!el) return;
    // Cancel any pending willChange cleanup from a prior mouseleave
    if (willChangeCleanupRef.current) {
      willChangeCleanupRef.current();
      willChangeCleanupRef.current = null;
    }
    el.style.willChange = 'transform';
    el.style.transition = 'none';
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = wrapperRef.current;
    const sh = shimmerRef.current;
    if (!el || !sh) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    el.style.transition = 'none';
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotY = (x - 0.5) * 20;
    const rotX = -(y - 0.5) * 20;
    el.style.transform = `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
    el.style.boxShadow = hoverShadow;
    const isDark = document.documentElement.classList.contains('dark');
    sh.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(${tint}, ${isDark ? 0.15 : 0.35}) 0%, transparent 60%)`;
  }

  function handleMouseLeave() {
    const el = wrapperRef.current;
    const sh = shimmerRef.current;
    if (!el || !sh) return;
    el.style.transition = 'transform 300ms ease-out, box-shadow 300ms ease-out';
    el.style.transform = 'translateY(0px)';
    el.style.boxShadow = restShadow;
    sh.style.background = 'none';
    const cleanup = (e: TransitionEvent) => {
      if (e.propertyName !== 'transform') return;
      el.style.willChange = 'auto';
      el.removeEventListener('transitionend', cleanup);
      willChangeCleanupRef.current = null;
    };
    willChangeCleanupRef.current = () => el.removeEventListener('transitionend', cleanup);
    el.addEventListener('transitionend', cleanup);
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{ boxShadow: restShadow }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <SpellCard def={def} {...rest} disableShadow />
      <div
        ref={shimmerRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ mixBlendMode: 'screen' }}
      />
    </div>
  );
}

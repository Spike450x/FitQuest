'use client';

import { useRef } from 'react';
import { SpellCard } from './SpellCard';
import type { ItemDef } from '@/types';

const SHIMMER_TINT: Record<string, string> = {
  common: '180, 180, 190',
  uncommon: '80, 180, 110',
  rare: '90, 140, 220',
  epic: '170, 90, 220',
  legendary: '220, 170, 50',
};

const DEPTH_SHADOW: Record<string, string> = {
  common: '100, 100, 110',
  uncommon: '50, 140, 80',
  rare: '60, 100, 200',
  epic: '130, 50, 200',
  legendary: '200, 140, 30',
};

interface PremiumSpellCardProps {
  def: ItemDef;
  wisdomValue?: number;
  isEquipped?: boolean;
  affordable?: boolean;
  disabled?: boolean;
  acting?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function PremiumSpellCard({ def, className = '', ...rest }: PremiumSpellCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);

  const tint = SHIMMER_TINT[def.rarity] ?? SHIMMER_TINT.common;
  const depth = DEPTH_SHADOW[def.rarity] ?? DEPTH_SHADOW.common;
  const restShadow = `0 4px 12px -2px rgba(${depth}, 0.35), 0 2px 4px rgba(0,0,0,0.1)`;
  const hoverShadow = `0 12px 28px -4px rgba(${depth}, 0.55), 0 4px 8px rgba(0,0,0,0.2)`;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = wrapperRef.current;
    const sh = shimmerRef.current;
    if (!el || !sh) return;
    el.style.transition = 'none';
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotY = (x - 0.5) * 20;
    const rotX = -(y - 0.5) * 20;
    el.style.transform = `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
    el.style.boxShadow = hoverShadow;
    sh.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(${tint}, 0.35) 0%, transparent 60%)`;
  }

  function handleMouseLeave() {
    const el = wrapperRef.current;
    const sh = shimmerRef.current;
    if (!el || !sh) return;
    el.style.transition = 'transform 300ms ease-out, box-shadow 300ms ease-out';
    el.style.transform = 'translateY(0px)';
    el.style.boxShadow = restShadow;
    sh.style.background = 'none';
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{ boxShadow: restShadow, willChange: 'transform' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <SpellCard def={def} {...rest} className="shadow-none" />
      <div
        ref={shimmerRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ mixBlendMode: 'screen' }}
      />
    </div>
  );
}

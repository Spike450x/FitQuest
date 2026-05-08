'use client';

import type { ItemDef, SpellEffect } from '@/types';
import { describeRequirement } from '@/lib/gameLogic/spells';
import { RARITY_BADGE, RARITY_CARD } from '@/lib/gameLogic/items';

// ─── Effect → emoji ───────────────────────────────────────────────────────────

function getSpellEmoji(effect: SpellEffect): string {
  if (effect.stun && effect.damage) return '💫';
  if (effect.stun && effect.heal) return '✨';
  if (effect.stun) return '❄️';
  if (effect.lifestealPct) return '🩸';
  if (effect.bypassMonsterDef && effect.damage) return '💀';
  if (effect.damage && effect.heal) return '🔥';
  if (effect.damage) return '⚡';
  if (effect.heal) return '💚';
  if (effect.restoreStamina) return '⚡';
  if (effect.defenseBoost) return '🛡️';
  return '✨';
}

// ─── Effect tag list ──────────────────────────────────────────────────────────

interface EffectTag {
  label: string;
  color: string;
}

function buildEffectTags(effect: SpellEffect, wisdom?: number): EffectTag[] {
  const tags: EffectTag[] = [];

  if (effect.damage) {
    const base = effect.damage;
    const label = effect.damageScalesWithWisdom
      ? wisdom !== undefined
        ? `${base} + ${wisdom} WIS = ${base + wisdom} dmg`
        : `${base} + WIS dmg`
      : `${base} dmg`;
    tags.push({ label: `⚡ ${label}`, color: 'bg-red-50 text-red-700' });
  }

  if (effect.heal) {
    const base = effect.heal;
    const label = effect.healScalesWithWisdom
      ? wisdom !== undefined
        ? `${base} + ${wisdom} WIS = ${base + wisdom} heal`
        : `${base} + WIS heal`
      : `${base} heal`;
    tags.push({ label: `💚 ${label}`, color: 'bg-emerald-50 text-emerald-700' });
  }

  if (effect.restoreStamina) {
    const base = effect.restoreStamina;
    const label = effect.staminaScalesWithWisdom
      ? wisdom !== undefined
        ? `${base} + ${wisdom} WIS = ${base + wisdom} stamina`
        : `${base} + WIS stamina`
      : `${base} stamina`;
    tags.push({ label: `⚡ ${label}`, color: 'bg-amber-50 text-amber-700' });
  }

  if (effect.defenseBoost) {
    const base = effect.defenseBoost;
    const label = effect.defenseScalesWithWisdom
      ? wisdom !== undefined
        ? `+${base} + ${wisdom} WIS = +${base + wisdom} def`
        : `+${base} + WIS def`
      : `+${base} def`;
    tags.push({ label: `🛡️ ${label}`, color: 'bg-blue-50 text-blue-700' });
  }

  if (effect.stun) {
    tags.push({ label: '❄️ Stun', color: 'bg-cyan-50 text-cyan-700' });
  }

  if (effect.bypassMonsterDef) {
    tags.push({ label: '💀 Bypasses defense', color: 'bg-gray-100 text-gray-600' });
  }

  if (effect.lifestealPct) {
    tags.push({
      label: `🩸 ${Math.round(effect.lifestealPct * 100)}% lifesteal`,
      color: 'bg-rose-50 text-rose-700',
    });
  }

  return tags;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SpellCardProps {
  def: ItemDef;
  /** Player's current wisdom stat — shows computed values when provided. */
  wisdomValue?: number;
  /** Whether this spell is in the player's equipped loadout. */
  isEquipped?: boolean;
  /** When false (and defined), renders magic cost in red (can't afford). */
  affordable?: boolean;
  /** Disables the action button. */
  disabled?: boolean;
  /** Shows a loading indicator on the action button. */
  acting?: boolean;
  /** Label for the primary action button. Omit to hide the button. */
  actionLabel?: string;
  /** Handler for the primary action button. */
  onAction?: () => void;
  /** Extra classes on the outer wrapper. */
  className?: string;
}

export function SpellCard({
  def,
  wisdomValue,
  isEquipped,
  affordable,
  disabled,
  acting,
  actionLabel,
  onAction,
  className = '',
}: SpellCardProps) {
  if (!def.spellMechanics) return null;
  const sm = def.spellMechanics;
  const scheme = RARITY_CARD[def.rarity];
  const emoji = getSpellEmoji(sm.effect);
  const effectTags = buildEffectTags(sm.effect, wisdomValue);
  const costColor = affordable === false ? 'text-red-300' : 'text-white/80';

  return (
    <div
      className={`flex flex-col rounded-2xl border-2 ${scheme.border} shadow-md ${scheme.glow ? `shadow-md ${scheme.glow}` : ''} overflow-hidden bg-white ${className}`}
    >
      {/* ── Card header (colored by rarity) ───────────────────────────────── */}
      <div className={`${scheme.header} px-3 pt-3 pb-2`}>
        {/* Top row: cost badge TL + cost badge TR (playing card corners) */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col items-center leading-none">
            <span className="text-white font-black text-lg leading-none">✨</span>
            <span className="text-white font-bold text-sm leading-none">{sm.magicCost}</span>
          </div>
          <div className="flex flex-col items-center leading-none opacity-50 rotate-180">
            <span className="text-white font-black text-lg leading-none">✨</span>
            <span className="text-white font-bold text-sm leading-none">{sm.magicCost}</span>
          </div>
        </div>

        {/* Spell name */}
        <p className="text-white font-bold text-base text-center mt-1 leading-tight">{def.name}</p>

        {/* Rarity + class */}
        <div className="flex items-center justify-center gap-1.5 mt-1 flex-wrap">
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${RARITY_BADGE[def.rarity]}`}
          >
            {def.rarity}
          </span>
          {sm.classRestriction !== 'all' && (
            <span className="text-xs text-white/80 font-medium capitalize">
              {sm.classRestriction} only
            </span>
          )}
          {isEquipped && (
            <span className="text-xs bg-white/20 text-white font-medium px-1.5 py-0.5 rounded-full">
              ✓ Equipped
            </span>
          )}
        </div>
      </div>

      {/* ── Card body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-3 py-3 gap-2">
        {/* Center symbol */}
        <div className="text-center">
          <span className="text-4xl" role="img" aria-hidden="true">
            {emoji}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 text-center leading-snug">
          {def.description.replace(/ \([^)]+only\)/, '')}
        </p>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Dice requirement */}
        <div className="bg-violet-50 border border-violet-200 rounded-lg px-2 py-1.5 text-center">
          <p className="text-xs text-violet-700 font-semibold">
            🎲 {describeRequirement(sm.requirement)}
          </p>
        </div>

        {/* Effect tags */}
        {effectTags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center">
            {effectTags.map((tag) => (
              <span
                key={tag.label}
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${tag.color}`}
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Action button ─────────────────────────────────────────────────────── */}
      {actionLabel && (
        <div className="px-3 pb-3">
          <button
            onClick={onAction}
            disabled={disabled || acting}
            className={`w-full py-2 text-xs font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed
              ${scheme.header} text-white hover:opacity-90`}
          >
            {acting ? '…' : actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

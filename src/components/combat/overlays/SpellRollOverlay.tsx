'use client';

import { useEffect, useState } from 'react';
import { Die3D } from '@/components/ui/Die3D';
import { playSound } from '@/hooks/useSound';
import { describeRequirement, getHighlightedSpellDiceIndices } from '@/lib/gameLogic/spells';
import { spellEffectKey } from '@/lib/entityArt';
import type { ItemDef } from '@/types';
import type { SpellEffectKey } from '@/components/art/silhouettes';
import type { SoundKey } from '@/hooks/useSound';

const SPELL_FLASH_BG: Record<SpellEffectKey, string> = {
  damage: 'bg-rose-500',
  fire: 'bg-orange-500',
  'magic-damage': 'bg-violet-500',
  heal: 'bg-emerald-500',
  stun: 'bg-amber-400',
  'stun-heal': 'bg-amber-400',
  defense: 'bg-sky-500',
  lifesteal: 'bg-purple-600',
  stamina: 'bg-amber-400',
};

const SPELL_SOUND: Record<SpellEffectKey, SoundKey> = {
  damage: 'spellDamage',
  fire: 'spellFire',
  'magic-damage': 'spellMagicDamage',
  heal: 'spellHeal',
  stun: 'spellStun',
  'stun-heal': 'spellStun',
  defense: 'spellDefense',
  lifesteal: 'spellLifesteal',
  stamina: 'spellStamina',
};

/**
 * Spell roll overlay — animates the spell's dice (count from the requirement)
 * then reveals whether the requirement was met. Effect summary shown on hit.
 * Calls `onDismiss` when the player taps Continue.
 */
export function SpellRollOverlay({
  spellDef,
  dice,
  requirementMet,
  monsterRoll,
  monsterStunned,
  monsterDamage,
  onDismiss,
}: {
  spellDef: ItemDef;
  dice: number[];
  requirementMet: boolean;
  /** Monster's raw d10 roll for the counter-attack (0 if stunned). */
  monsterRoll: number;
  /** True when the spell stunned the monster, skipping the counter-attack. */
  monsterStunned: boolean;
  /** Damage the monster dealt to the player (0 if stunned). */
  monsterDamage: number;
  onDismiss: () => Promise<void>;
}) {
  const sm = spellDef.spellMechanics!;
  const effectKey = spellEffectKey(sm.effect);
  const [phase, setPhase] = useState<'spinning' | 'settling' | 'result'>('spinning');
  const [displayDice, setDisplayDice] = useState<number[]>(() =>
    Array.from({ length: dice.length }, () => Math.ceil(Math.random() * 6)),
  );
  const [settled, setSettled] = useState<boolean[]>(() => dice.map(() => false));
  const [resultVisible, setResultVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  const highlighted = requirementMet ? getHighlightedSpellDiceIndices(dice, sm.requirement) : [];

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayDice(Array.from({ length: dice.length }, () => Math.ceil(Math.random() * 6)));
    }, 75);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setPhase('settling');
    }, 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'settling') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    dice.forEach((val, i) => {
      timers.push(
        setTimeout(() => {
          if (i === 0) playSound('diceSettle');
          setDisplayDice((prev) => {
            const next = [...prev];
            next[i] = val;
            return next;
          });
          setSettled((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, i * 140),
      );
    });
    timers.push(
      setTimeout(
        () => {
          setPhase('result');
          setTimeout(() => setResultVisible(true), 50);
        },
        dice.length * 140 + 300,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, dice]);

  // Flash + school sound when result is revealed
  useEffect(() => {
    if (phase !== 'result') return;
    setFlashActive(true);
    const t = setTimeout(() => setFlashActive(false), 350);
    playSound(requirementMet ? SPELL_SOUND[effectKey] : 'fail');
    return () => clearTimeout(t);
  }, [phase, requirementMet, effectKey]);

  async function handleDismiss() {
    setDismissing(true);
    await onDismiss();
  }

  const effectTags: string[] = [];
  const eff = sm.effect;
  if (eff.damage)
    effectTags.push(`${eff.damage} dmg${eff.bypassMonsterDef ? ' (bypass DEF)' : ''}`);
  if (eff.heal) effectTags.push(`+${eff.heal} HP`);
  if (eff.restoreStamina) effectTags.push(`+${eff.restoreStamina} Stamina`);
  if (eff.stun) effectTags.push('Stun enemy');
  if (eff.defenseBoost) effectTags.push(`+${eff.defenseBoost} DEF this round`);
  if (eff.lifestealPct) effectTags.push(`${(eff.lifestealPct * 100) | 0}% lifesteal`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      {/* School-themed screen flash on result reveal */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${SPELL_FLASH_BG[effectKey]}`}
        style={{ opacity: flashActive ? 0.18 : 0 }}
        aria-hidden
      />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl px-6 py-7 shadow-2xl mx-4 max-w-xs w-full space-y-5 text-center">
        <p className="text-xs font-bold text-violet-400 uppercase tracking-widest">
          {phase === 'spinning'
            ? 'Casting…'
            : phase === 'settling'
              ? 'Resolving…'
              : requirementMet
                ? 'Spell Cast!'
                : 'Fizzled!'}
        </p>

        <p className="text-base font-bold text-violet-800">✨ {spellDef.name}</p>

        <div className="flex justify-center gap-2 flex-wrap">
          {displayDice.map((d, i) => {
            const isSettled = settled[i];
            const isHighlighted = isSettled && highlighted.includes(i);
            return (
              <Die3D
                key={i}
                value={d}
                size="lg"
                variant={!isSettled ? 'spinning' : isHighlighted ? 'highlighted' : 'settled'}
              />
            );
          })}
        </div>

        <p className="text-xs text-gray-400 dark:text-slate-500">
          {describeRequirement(sm.requirement)}
        </p>

        <div
          className={`space-y-3 transition-opacity duration-300 ${resultVisible ? 'opacity-100' : 'opacity-0'} ${phase === 'result' ? '' : 'pointer-events-none'}`}
        >
          {requirementMet ? (
            <div className="space-y-2">
              <p className="text-lg font-bold text-violet-700">Requirement Met!</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {effectTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-violet-100 text-violet-700 font-semibold px-2.5 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-lg font-bold text-gray-400 dark:text-slate-500">Fizzled</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Dice didn&apos;t meet the requirement — magic spent, no effect
              </p>
            </div>
          )}

          {/* Monster counter-attack — mirrors ActionRollOverlay's enemy section */}
          <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 px-4 py-3 space-y-1.5">
            {monsterStunned ? (
              <p className="text-xs font-semibold text-amber-500">Monster stunned — no counter</p>
            ) : (
              <>
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Monster strikes back
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Die3D value={monsterRoll || 1} size="sm" variant="settled" color="rose" />
                  <span className="text-sm font-semibold text-red-500">−{monsterDamage} HP</span>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
          >
            {dismissing ? 'Applying…' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Die3D } from '@/components/ui/Die3D';
import { playSound } from '@/hooks/useSound';
import type { AbilityDef, DicePattern } from '@/lib/gameLogic/abilities';
import type { MonsterSpecialMove } from '@/types';
import { getHighlightedDiceIndices, PATTERN_LABEL, abilityTags } from '../AbilityReference';
import { MonsterCounterPanel, CritFlourish } from './MonsterCounterPanel';

/**
 * Ability roll overlay — animates 6d6 then reveals matched pattern (or fizzle).
 * Two-step: player result → "Next →" → monster counter screen → "Continue →".
 * Calls `onDismiss` when the player taps the final Continue button.
 */
interface FormulaBreakdown {
  avgRoll: number;
  statBonus: number;
  gearBonus: number;
  baseHit: number;
  damageMultiplier: number;
  rawDamage: number;
  monsterDef: number;
}

export function DiceRollOverlay({
  dice,
  pattern,
  ability,
  formulaBreakdown,
  monsterRoll,
  monsterAtk,
  monsterDamage,
  monsterStunned,
  dodged,
  monsterAttackType,
  playerDefFailed,
  playerDefStat,
  monsterSpecial,
  monsterChargingPrimed,
  playerStunnedApplied,
  spiritCrit,
  spiritCritMultiplier,
  outcome,
  onDismiss,
}: {
  dice: number[];
  pattern: DicePattern | null;
  ability: AbilityDef | null;
  /** Damage formula intermediates — shown when an ability hit resolves. */
  formulaBreakdown?: FormulaBreakdown;
  /** Monster's raw d10 counter-attack roll (0 when stunned). */
  monsterRoll: number;
  /** Effective monster ATK for the formula display. */
  monsterAtk?: number;
  /** Actual damage the monster dealt to the player (0 if stunned/dodged). */
  monsterDamage: number;
  /** True when the ability stunned the monster, skipping the counter. */
  monsterStunned: boolean;
  /** Rogue dodged the counter-attack — damage fully negated. */
  dodged?: boolean;
  /** Damage school of the monster's counter (drives the 🔮/⚔️ tag). */
  monsterAttackType?: 'physical' | 'magic';
  /** Player's DEF failed on the counter (physical only). */
  playerDefFailed?: boolean;
  /** Player's effective DEF — shown in the "DEF held" counter line. */
  playerDefStat?: number;
  /** Special move the monster fired on its counter (heavy / pierce / burst / drain). */
  monsterSpecial?: MonsterSpecialMove | null;
  /** A telegraphed special the monster began winding up this round (the tell). */
  monsterChargingPrimed?: MonsterSpecialMove | null;
  /** A `stun` special landed — the player will skip their next turn. */
  playerStunnedApplied?: boolean;
  /** Spirit crit fired on the ability's damage. */
  spiritCrit?: boolean;
  /** Multiplier applied when spiritCrit fired. */
  spiritCritMultiplier?: number;
  /** Fight outcome after this round resolves. */
  outcome?: 'win' | 'loss' | null;
  onDismiss: () => Promise<void>;
}) {
  const [phase, setPhase] = useState<'spinning' | 'settling' | 'result'>('spinning');
  const [displayDice, setDisplayDice] = useState<number[]>(() =>
    Array.from({ length: 6 }, () => Math.ceil(Math.random() * 6)),
  );
  const [settled, setSettled] = useState<boolean[]>([false, false, false, false, false, false]);
  const [resultVisible, setResultVisible] = useState(false);
  const [playerDone, setPlayerDone] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const fizzled = ability === null;
  const highlighted = getHighlightedDiceIndices(dice, pattern);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayDice(Array.from({ length: 6 }, () => Math.ceil(Math.random() * 6)));
    }, 75);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setPhase('settling');
    }, 1100);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

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
        }, i * 130),
      );
    });
    timers.push(
      setTimeout(
        () => {
          setPhase('result');
          setTimeout(() => setResultVisible(true), 40);
        },
        dice.length * 130 + 350,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, dice]);

  async function handleDismiss() {
    setDismissing(true);
    await onDismiss();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl px-6 py-7 shadow-2xl mx-4 max-w-xs w-full space-y-5 text-center">
        {!playerDone ? (
          <>
            {/* STEP 1: Player's ability roll result */}
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
              {phase === 'spinning'
                ? 'Rolling dice…'
                : phase === 'settling'
                  ? 'Revealing…'
                  : fizzled
                    ? 'No Pattern — Fizzle'
                    : 'Pattern Matched!'}
            </p>

            <div className="flex flex-wrap justify-center gap-2">
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

            <div
              className={`transition-opacity duration-300 ${resultVisible ? 'opacity-100' : 'opacity-0'}`}
            >
              {fizzled ? (
                <div className="space-y-1.5">
                  <p className="text-2xl font-bold text-gray-400 dark:text-slate-500">Fizzle!</p>
                  <p className="text-sm text-gray-400 dark:text-slate-500">
                    No matching pattern — basic hit landed
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-3">
                    <span className="text-3xl">{ability!.emoji}</span>
                    <div className="text-left">
                      <p className="font-bold text-rose-700 dark:text-rose-300 text-base leading-tight">
                        {ability!.name}
                      </p>
                      <p className="text-xs text-rose-400 dark:text-rose-500 mt-0.5">
                        {PATTERN_LABEL[pattern!]}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {abilityTags(ability!).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-rose-100 text-rose-700 font-semibold px-2.5 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {formulaBreakdown && (
                    <div className="text-left rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 px-3 py-2.5 space-y-0.5">
                      <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                        Damage formula
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        avg 6d6{' '}
                        <span className="font-semibold text-gray-700 dark:text-slate-200">
                          {formulaBreakdown.avgRoll}
                        </span>{' '}
                        + stat{' '}
                        <span className="font-semibold text-gray-700 dark:text-slate-200">
                          {formulaBreakdown.statBonus}
                        </span>
                        {formulaBreakdown.gearBonus > 0 && (
                          <>
                            {' '}
                            + gear{' '}
                            <span className="font-semibold text-gray-700 dark:text-slate-200">
                              {formulaBreakdown.gearBonus}
                            </span>
                          </>
                        )}{' '}
                        ={' '}
                        <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                          {formulaBreakdown.baseHit}
                        </span>{' '}
                        base
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        ×{formulaBreakdown.damageMultiplier.toFixed(1)} ={' '}
                        <span className="font-semibold text-gray-700 dark:text-slate-200">
                          {formulaBreakdown.rawDamage}
                        </span>{' '}
                        raw
                        {formulaBreakdown.monsterDef > 0 && (
                          <>
                            {' '}
                            − DEF{' '}
                            <span className="font-semibold text-gray-700 dark:text-slate-200">
                              {formulaBreakdown.monsterDef}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {spiritCrit && (
                <div className="mt-2">
                  <CritFlourish multiplier={spiritCritMultiplier} />
                </div>
              )}
            </div>

            {resultVisible && (
              <button
                onClick={() => setPlayerDone(true)}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                Next →
              </button>
            )}
          </>
        ) : (
          <>
            {/* STEP 2: Monster counter-attack */}
            <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">
              ⚔️ Enemy Counter-Attack
            </p>
            <MonsterCounterPanel
              monsterRoll={monsterRoll}
              monsterAtk={monsterAtk}
              monsterDamage={monsterDamage}
              monsterStunned={monsterStunned}
              dodged={dodged}
              monsterAttackType={monsterAttackType}
              playerDefFailed={playerDefFailed}
              playerDefStat={playerDefStat}
              monsterSpecial={monsterSpecial}
              chargingPrimed={monsterChargingPrimed}
              playerStunnedApplied={playerStunnedApplied}
              outcome={outcome}
              dieSize="lg"
            />
            <button
              onClick={handleDismiss}
              disabled={dismissing}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
            >
              {dismissing ? 'Applying…' : 'Continue →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

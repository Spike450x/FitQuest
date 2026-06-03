'use client';

import { useEffect, useState } from 'react';
import { Die3D } from '@/components/ui/Die3D';
import type { MonsterSpecialMove } from '@/types';

/**
 * Shared monster counter-attack panel for the ability + spell overlays. Renders
 * the enemy's d10 counter with a consistent vocabulary across every action:
 * stun, dodge, physical/magic damage-type tag, DEF-fail, special moves, and the
 * fallen state. The die spins then settles so the enemy's roll is ALWAYS shown
 * on a real counter (suppressed only on stun/dodge/kill, where no hit lands).
 *
 * The attack overlay (`ActionRollOverlay`) keeps its own two-phase animated die
 * but uses the same labels so all surfaces read identically.
 */
export function MonsterCounterPanel({
  monsterRoll,
  monsterDamage,
  monsterStunned,
  dodged,
  monsterAttackType = 'physical',
  playerDefFailed,
  playerDefStat,
  monsterAtk,
  manaBarrierAbsorbed,
  monsterSpecial,
  chargingPrimed,
  playerStunnedApplied,
  outcome,
  dieSize = 'sm',
}: {
  monsterRoll: number;
  monsterDamage: number;
  monsterStunned: boolean;
  dodged?: boolean;
  monsterAttackType?: 'physical' | 'magic';
  playerDefFailed?: boolean;
  /** Player's effective DEF — shown in the "DEF held" line for full parity with ActionRollOverlay. */
  playerDefStat?: number;
  /** Effective monster ATK for the damage formula line. */
  monsterAtk?: number;
  /** HP the Wizard's Mana Barrier absorbed — shown in the formula to explain the gap. */
  manaBarrierAbsorbed?: number;
  /** Special move the monster fired on this counter (heavy / pierce / burst / drain). */
  monsterSpecial?: MonsterSpecialMove | null;
  /** A telegraphed special the monster began winding up this round (the tell). */
  chargingPrimed?: MonsterSpecialMove | null;
  /** A `stun` special landed — the player will skip their next turn. */
  playerStunnedApplied?: boolean;
  outcome?: 'win' | 'loss' | null;
  /** Die prominence — ability/spell overlays pass `'lg'` so the enemy roll reads clearly. */
  dieSize?: 'sm' | 'lg' | 'xl';
}) {
  const isMagic = monsterAttackType === 'magic';
  const showDie = !monsterStunned && !dodged && outcome !== 'win';
  const prominent = dieSize !== 'sm';

  // Spin the enemy die, then settle on the rolled value — so the player always
  // SEES the monster roll on a landed counter (parity with the attack overlay's
  // two-phase die). A prominent die spins a touch longer for visual weight.
  const [dieVal, setDieVal] = useState<number>(() => Math.ceil(Math.random() * 10));
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!showDie) return;
    setSettled(false);
    const interval = setInterval(() => setDieVal(Math.ceil(Math.random() * 10)), 70);
    const stop = setTimeout(
      () => {
        clearInterval(interval);
        setDieVal(monsterRoll || 1);
        setSettled(true);
      },
      prominent ? 700 : 520,
    );
    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [showDie, monsterRoll, prominent]);

  // A win means the monster died this round — no counter-attack happens.
  if (outcome === 'win') {
    return (
      <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          🏆 Monster slain!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 px-4 py-3 space-y-1.5">
      {monsterStunned ? (
        <p className="text-xs font-semibold text-amber-500">😵 Monster stunned — no counter</p>
      ) : dodged ? (
        <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">
          💨 Dodged! No damage taken
        </p>
      ) : (
        <>
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
            {prominent ? '⚔️ Enemy counter roll' : 'Monster strikes back'}
            {isMagic ? (
              <span className="text-violet-500"> · 🔮 magic</span>
            ) : (
              <span className="text-rose-400"> · ⚔️ physical</span>
            )}
          </p>
          {monsterSpecial && (
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {monsterSpecial.emoji} {monsterSpecial.name}!
            </p>
          )}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Die3D
              value={dieVal}
              size={dieSize}
              format="number"
              variant={settled ? 'settled' : 'spinning'}
              color="rose"
            />
            <span className="text-sm font-semibold text-red-500">−{monsterDamage} HP</span>
            {isMagic ? (
              <span className="text-[11px] text-violet-400">ignores armor</span>
            ) : monsterSpecial?.effect.kind === 'pierce' ? (
              <span className="text-[11px] text-orange-500 font-semibold">🗡️ armor sundered</span>
            ) : playerDefFailed ? (
              <span className="text-[11px] text-orange-500 font-semibold">💥 DEF failed</span>
            ) : (
              <span className="text-[11px] text-gray-400 dark:text-slate-500">
                🛡️ {playerDefStat != null ? `${playerDefStat} ` : ''}DEF held
              </span>
            )}
          </div>
          {monsterSpecial?.effect.kind === 'drain' && (
            <p className="text-[11px] text-fuchsia-500 font-semibold">🩸 drained your life</p>
          )}
          {monsterAtk != null && (
            <p className="text-[11px] font-mono text-gray-400 dark:text-slate-500 text-center">
              {monsterAtk} ATK
              {isMagic || monsterSpecial?.effect.kind === 'pierce'
                ? isMagic
                  ? ' (magic)'
                  : ' (pierced)'
                : playerDefFailed
                  ? ` − 0 DEF`
                  : ` − ${playerDefStat ?? 0} DEF`}
              {manaBarrierAbsorbed != null && manaBarrierAbsorbed > 0
                ? ` − ${manaBarrierAbsorbed} 🔮 barrier`
                : ''}
              {' = '}
              {monsterDamage} dmg
            </p>
          )}
        </>
      )}
      {playerStunnedApplied && (
        <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
          😵 You are stunned — you&apos;ll lose your next turn!
        </p>
      )}
      {chargingPrimed && (
        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
          ⚡ {chargingPrimed.emoji} {chargingPrimed.name} is winding up — brace next turn!
        </p>
      )}
      {outcome === 'loss' && (
        <p className="text-sm font-semibold text-red-600">💀 You have fallen...</p>
      )}
    </div>
  );
}

/**
 * Spirit-crit flourish — a small badge shared by every offensive overlay so a
 * crit reads the same whether it fired on an attack, ability, or spell.
 */
export function CritFlourish({ multiplier }: { multiplier?: number }) {
  return (
    <p className="text-sm font-bold text-amber-500">
      ✦ Spirit Crit{multiplier ? ` ×${multiplier.toFixed(2)}` : ''}
    </p>
  );
}

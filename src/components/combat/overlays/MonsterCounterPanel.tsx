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
  /** Player's effective DEF — shown in the formula line for full parity with ActionRollOverlay. */
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
  /** Die prominence — ability/spell overlays pass `'lg'` or `'xl'` for a full-size centered die. */
  dieSize?: 'sm' | 'lg' | 'xl';
}) {
  const isMagic = monsterAttackType === 'magic';
  const showDie = !monsterStunned && !dodged && outcome !== 'win';
  // 'sm' = compact inline chip; anything larger = full-panel prominent layout
  const prominent = dieSize !== 'sm';

  const [dieVal, setDieVal] = useState<number>(() => Math.ceil(Math.random() * 10));
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!showDie) return;
    setSettled(false);
    const interval = setInterval(() => setDieVal(Math.ceil(Math.random() * 10)), 70);
    // Prominent die spins longer so the player can "watch" the enemy roll — matches
    // the ~950 ms the player's own die spins in ActionRollOverlay.
    const stop = setTimeout(
      () => {
        clearInterval(interval);
        setDieVal(monsterRoll || 1);
        setSettled(true);
      },
      prominent ? 900 : 520,
    );
    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [showDie, monsterRoll, prominent]);

  // Win: monster died this round — no counter happens.
  if (outcome === 'win') {
    return (
      <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-center">
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          🏆 Monster slain!
        </p>
      </div>
    );
  }

  // Stunned or dodged: monster's counter is negated — show a compact notice.
  if (monsterStunned || dodged) {
    return (
      <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 px-4 py-3 text-center space-y-1.5">
        {monsterStunned ? (
          <p className="text-sm font-semibold text-amber-500">😵 Monster stunned — no counter</p>
        ) : (
          <p className="text-sm font-semibold text-teal-600 dark:text-teal-400">
            💨 Dodged! No damage taken
          </p>
        )}
        {chargingPrimed && (
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
            ⚡ {chargingPrimed.emoji} {chargingPrimed.name} is winding up — brace next turn!
          </p>
        )}
      </div>
    );
  }

  // Normal hit: prominent layout mirrors ActionRollOverlay's monster phase.
  if (prominent) {
    return (
      <div className="space-y-3 text-center">
        {/* Special move name */}
        {monsterSpecial && (
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
            {monsterSpecial.emoji} {monsterSpecial.name}!
          </p>
        )}

        {/* Die — centered and large, matching the attack overlay's xl monster die */}
        <div className="flex justify-center">
          <Die3D
            value={dieVal}
            size="xl"
            format="number"
            variant={settled ? 'settled' : 'spinning'}
            color="rose"
          />
        </div>

        {/* Damage formula: ATK − DEF = DMG (same vocabulary as ActionRollOverlay) */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {monsterAtk != null && (
            <>
              <span
                className={`font-semibold text-sm ${isMagic ? 'text-violet-500' : 'text-rose-500'}`}
              >
                {isMagic ? '🔮' : '⚔️'} {monsterAtk} ATK
              </span>
              {isMagic ? (
                <span className="text-violet-400 font-semibold text-sm">· ignores armor</span>
              ) : monsterSpecial?.effect.kind === 'pierce' ? (
                <span className="text-orange-500 font-semibold text-sm">· 🗡️ armor sundered</span>
              ) : playerDefFailed ? (
                <span className="text-orange-500 font-semibold text-sm">· 💥 DEF failed!</span>
              ) : (
                <>
                  <span className="text-gray-300 dark:text-slate-600 font-bold">−</span>
                  <span className="text-gray-400 dark:text-slate-500 text-sm">
                    🛡️ {playerDefStat ?? 0} DEF
                  </span>
                </>
              )}
              {manaBarrierAbsorbed != null && manaBarrierAbsorbed > 0 && (
                <>
                  <span className="text-gray-300 dark:text-slate-600 font-bold">−</span>
                  <span className="text-violet-400 text-sm">🔮 {manaBarrierAbsorbed} barrier</span>
                </>
              )}
              <span className="text-gray-300 dark:text-slate-600 font-bold">=</span>
            </>
          )}
          <span className="text-rose-700 dark:text-rose-400 font-black text-4xl leading-none">
            {monsterDamage}
          </span>
          <span className="text-gray-400 dark:text-slate-500 text-sm">dmg</span>
        </div>

        {monsterSpecial?.effect.kind === 'drain' && (
          <p className="text-xs text-fuchsia-500 font-semibold">🩸 drained your life</p>
        )}
        {playerStunnedApplied && (
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
            😵 You are stunned — you&apos;ll lose your next turn!
          </p>
        )}
        {chargingPrimed && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
              ⚡ {chargingPrimed.emoji} {chargingPrimed.name} is winding up — brace next turn!
            </p>
          </div>
        )}
        {outcome === 'loss' && (
          <p className="text-sm font-semibold text-red-600">💀 You have fallen...</p>
        )}
      </div>
    );
  }

  // Compact (sm) layout — used inline inside the attack overlay's chip row.
  return (
    <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 px-4 py-3 space-y-1.5">
      <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
        Monster strikes back
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
      <div className="flex items-center gap-2 flex-wrap">
        <Die3D
          value={dieVal}
          size="sm"
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

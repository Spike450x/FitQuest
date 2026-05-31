'use client';

import { Die3D } from '@/components/ui/Die3D';

/**
 * Shared monster counter-attack panel for the ability + spell overlays. Renders
 * the enemy's d10 counter with a consistent vocabulary across every action:
 * stun, dodge, physical/magic damage-type tag, DEF-fail, and the fallen state.
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
  outcome,
}: {
  monsterRoll: number;
  monsterDamage: number;
  monsterStunned: boolean;
  dodged?: boolean;
  monsterAttackType?: 'physical' | 'magic';
  playerDefFailed?: boolean;
  outcome?: 'win' | 'loss' | null;
}) {
  const isMagic = monsterAttackType === 'magic';

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
            Monster strikes back
            {isMagic ? (
              <span className="text-violet-500"> · 🔮 magic</span>
            ) : (
              <span className="text-rose-400"> · ⚔️ physical</span>
            )}
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Die3D value={monsterRoll || 1} size="sm" variant="settled" color="rose" />
            <span className="text-sm font-semibold text-red-500">−{monsterDamage} HP</span>
            {isMagic ? (
              <span className="text-[11px] text-violet-400">ignores armor</span>
            ) : playerDefFailed ? (
              <span className="text-[11px] text-orange-500 font-semibold">💥 DEF failed</span>
            ) : (
              <span className="text-[11px] text-gray-400 dark:text-slate-500">🛡️ DEF held</span>
            )}
          </div>
        </>
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

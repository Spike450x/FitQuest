'use client';

import { useEffect, useState } from 'react';
import { Die3D } from '@/components/ui/Die3D';
import { CritFlourish } from './MonsterCounterPanel';
import type { MonsterDef } from '@/types';
import type { PendingAction } from '../types';

/**
 * Two-phase overlay for attack/magic/rest/meditate: player roll → Continue →
 * monster roll → Continue → apply. Single-phase for run: both dice shown
 * together. Calls `pending.applyResult` when the player taps the final
 * Continue button.
 */
export function ActionRollOverlay({
  pending,
  monster,
  playerDefStat,
}: {
  pending: PendingAction;
  monster: MonsterDef;
  playerDefStat: number;
}) {
  type OverlayPhase =
    | 'player_spin'
    | 'player_result'
    | 'monster_spin'
    | 'monster_result'
    | 'run_spin'
    | 'run_result';

  const isRun = pending.actionType === 'run';
  const isAttack = pending.actionType === 'attack';
  const isRest = pending.actionType === 'rest';
  const isMeditate = pending.actionType === 'meditate';
  const isRecovery = isRest || isMeditate;
  const dieColor: 'indigo' | 'violet' | 'sky' | 'slate' = isAttack
    ? 'indigo'
    : isRest
      ? 'sky'
      : isMeditate
        ? 'slate'
        : 'violet';

  const [phase, setPhase] = useState<OverlayPhase>(isRun ? 'run_spin' : 'player_spin');
  const [playerDie, setPlayerDie] = useState<number>(() => Math.ceil(Math.random() * 10));
  const [monsterDie, setMonsterDie] = useState<number>(() => Math.ceil(Math.random() * 10));
  const [resultVisible, setResultVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlayerDie(Math.ceil(Math.random() * 10));
      if (isRun) setMonsterDie(Math.ceil(Math.random() * 10));
    }, 80);

    const stopSpin = setTimeout(() => {
      clearInterval(interval);
      setPlayerDie(pending.dice[0]);
      if (isRun) {
        setMonsterDie(pending.dice[1] ?? 1);
        setPhase('run_result');
      } else {
        setPhase('player_result');
      }
      setTimeout(() => setResultVisible(true), 120);
    }, 950);

    return () => {
      clearInterval(interval);
      clearTimeout(stopSpin);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'monster_spin') return;
    setResultVisible(false);

    const interval = setInterval(() => {
      setMonsterDie(Math.ceil(Math.random() * 10));
    }, 80);

    const stopSpin = setTimeout(() => {
      clearInterval(interval);
      setMonsterDie(pending.monsterRoll ?? 5);
      setPhase('monster_result');
      setTimeout(() => setResultVisible(true), 120);
    }, 750);

    return () => {
      clearInterval(interval);
      clearTimeout(stopSpin);
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleContinue() {
    if (phase === 'player_result') {
      if (isRecovery || pending.outcome !== 'win') {
        setPhase('monster_spin');
      } else {
        setDismissing(true);
        await pending.applyResult();
      }
    } else {
      setDismissing(true);
      await pending.applyResult();
    }
  }

  const isMonsterPhase = phase === 'monster_spin' || phase === 'monster_result';
  const isWin = pending.outcome === 'win';
  const isLoss = pending.outcome === 'loss';
  // The counter's effective school — a `burst` special turns a physical monster's
  // hit into magic, so prefer the resolved `monsterAttackType` from the payload.
  const isMagicMonster =
    (pending.monsterAttackType ?? monster.attackType ?? 'physical') === 'magic';
  const special = pending.monsterSpecial;

  const headerText = isRun
    ? phase === 'run_spin'
      ? 'Rolling escape…'
      : pending.escaped
        ? 'You escaped!'
        : 'Blocked!'
    : isMonsterPhase
      ? phase === 'monster_spin'
        ? 'Monster strikes while you recover…'
        : isLoss
          ? 'You fell…'
          : "Monster's free attack!"
      : isRecovery
        ? phase === 'player_spin'
          ? isRest
            ? 'Resting…'
            : 'Meditating…'
          : isRest
            ? '🛌 Rest'
            : '🧘 Meditate'
        : phase === 'player_spin'
          ? `Rolling ${isAttack ? 'attack' : 'magic'}…`
          : isWin
            ? 'Victory!'
            : `${isAttack ? 'Attack' : 'Magic'} roll`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl px-6 py-7 shadow-2xl mx-4 max-w-xs w-full space-y-5 text-center">
        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
          {headerText}
        </p>

        {isRun ? (
          <div className="flex justify-center items-end gap-6">
            <div className="flex flex-col items-center gap-1.5">
              <Die3D
                value={playerDie}
                format="number"
                size="xl"
                color="amber"
                variant={phase === 'run_spin' ? 'spinning' : 'settled'}
              />
              <p className="text-xs font-semibold text-amber-600">You</p>
            </div>
            <p className="text-xl font-bold text-gray-300 dark:text-slate-600 mb-6">vs</p>
            <div className="flex flex-col items-center gap-1.5">
              <Die3D
                value={monsterDie}
                format="number"
                size="xl"
                color="gray"
                variant={phase === 'run_spin' ? 'spinning' : 'settled'}
              />
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500">Monster</p>
            </div>
          </div>
        ) : isMonsterPhase ? (
          <div className="flex justify-center">
            <Die3D
              value={monsterDie}
              format="number"
              size="xl"
              color="rose"
              variant={phase === 'monster_spin' ? 'spinning' : 'settled'}
            />
          </div>
        ) : (
          <div className="flex justify-center">
            <Die3D
              value={playerDie}
              format="number"
              size="xl"
              color={dieColor}
              variant={phase === 'player_spin' ? 'spinning' : 'settled'}
            />
          </div>
        )}

        <div
          className={`space-y-3 transition-opacity duration-300 ${resultVisible ? 'opacity-100' : 'opacity-0'} ${resultVisible ? '' : 'pointer-events-none'}`}
        >
          {pending.dodged ? (
            <p className="text-base font-semibold text-teal-600 dark:text-teal-400">
              💨 Dodged! You took no damage
            </p>
          ) : isRun ? (
            pending.escaped ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                You rolled higher — flee successful
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Monster rolled higher — hit for{' '}
                <span className="font-semibold text-red-500">{pending.monsterDamage} dmg</span>
                {isMagicMonster ? (
                  <span className="text-violet-500"> · 🔮 magic (ignores armor)</span>
                ) : pending.playerDefFailed ? (
                  <span className="text-orange-500"> · 💥 DEF failed</span>
                ) : (
                  <span className="text-gray-400 dark:text-slate-500"> · 🛡️ DEF held</span>
                )}
              </p>
            )
          ) : isMonsterPhase ? (
            <div className="space-y-2">
              {special && (
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {special.emoji} {special.name}!
                </p>
              )}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span
                  className={`font-semibold ${isMagicMonster ? 'text-violet-500' : 'text-rose-500'}`}
                >
                  {isMagicMonster ? '🔮' : '⚔️'} {monster.attack} ATK
                </span>
                {isMagicMonster ? (
                  <span className="text-violet-400 font-semibold text-sm">· ignores armor</span>
                ) : special?.effect.kind === 'pierce' ? (
                  <span className="text-orange-500 font-semibold text-sm">· 🗡️ armor sundered</span>
                ) : isRecovery ? (
                  <span className="text-orange-500 font-semibold text-sm">· 💥 Free attack!</span>
                ) : pending.playerDefFailed ? (
                  <span className="text-orange-500 font-semibold text-sm">· 💥 DEF failed!</span>
                ) : (
                  <>
                    <span className="text-gray-300 dark:text-slate-600 font-bold">−</span>
                    <span className="text-gray-400 dark:text-slate-500 text-sm">
                      🛡️ {playerDefStat} DEF
                    </span>
                  </>
                )}
                <span className="text-gray-300 dark:text-slate-600 font-bold">=</span>
                <span className="text-rose-700 font-black text-2xl">{pending.monsterDamage}</span>
                <span className="text-gray-400 dark:text-slate-500 text-sm">dmg</span>
              </div>
              {pending.playerStunnedApplied && (
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  😵 You are stunned — you&apos;ll lose your next turn!
                </p>
              )}
              {pending.monsterChargingPrimed && (
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
                  ⚡ {pending.monsterChargingPrimed.emoji} {pending.monsterChargingPrimed.name} is
                  winding up — brace next turn!
                </p>
              )}
              {isLoss && (
                <p className="text-sm font-semibold text-red-600">💀 You have fallen...</p>
              )}
            </div>
          ) : isRecovery ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span
                  className={`text-2xl font-black ${isRest ? 'text-sky-600' : 'text-slate-600'}`}
                >
                  {playerDie}
                </span>
                {isRest ? (
                  <>
                    <span className="text-gray-300 dark:text-slate-600 font-bold">×</span>
                    <span className="text-sky-500 font-semibold">3</span>
                    <span className="text-gray-300 dark:text-slate-600 font-bold">=</span>
                    <span className="text-sky-700 font-black text-2xl">
                      {pending.recoveredStamina}
                    </span>
                    <span className="text-gray-400 dark:text-slate-500 text-sm">stamina</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-300 dark:text-slate-600 font-bold">+</span>
                    <span className="text-slate-500 font-semibold">🧠 WIS</span>
                    <span className="text-gray-300 dark:text-slate-600 font-bold">=</span>
                    <span className="text-slate-700 font-black text-2xl">
                      {pending.recoveredMagic}
                    </span>
                    <span className="text-gray-400 dark:text-slate-500 text-sm">magic</span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Monster strikes while you recover…
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span
                  className={`text-2xl font-black ${isAttack ? 'text-indigo-600' : 'text-violet-600'}`}
                >
                  {playerDie}
                </span>
                <span className="text-gray-300 dark:text-slate-600 font-bold">+</span>
                <span
                  className={`font-semibold ${isAttack ? 'text-indigo-500' : 'text-violet-500'}`}
                >
                  {pending.attackBonusLabel === 'WIS' ? '🔮' : '⚔️'} {pending.attackBonus}
                </span>
                {pending.monsterDefFailed ? (
                  <span className="text-orange-500 font-semibold text-sm">· 💥 DEF broke!</span>
                ) : (
                  <>
                    <span className="text-gray-300 dark:text-slate-600 font-bold">−</span>
                    <span className="text-gray-400 dark:text-slate-500 text-sm">
                      🛡️ {monster.defense}
                    </span>
                  </>
                )}
                <span className="text-gray-300 dark:text-slate-600 font-bold">=</span>
                <span className="text-gray-900 dark:text-slate-100 font-black text-2xl">
                  {pending.playerDamage}
                </span>
                <span className="text-gray-400 dark:text-slate-500 text-sm">dmg</span>
              </div>
              {pending.spiritCrit && <CritFlourish multiplier={pending.spiritCritMultiplier} />}
              {isWin && <p className="text-sm font-semibold text-emerald-600">🏆 Monster slain!</p>}
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={dismissing}
            className={`w-full disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-xl transition-colors ${
              isRun
                ? 'bg-amber-500 hover:bg-amber-600'
                : isMonsterPhase
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : isRest
                    ? 'bg-sky-500 hover:bg-sky-600'
                    : isMeditate
                      ? 'bg-slate-600 hover:bg-slate-700'
                      : isAttack
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-violet-600 hover:bg-violet-700'
            }`}
          >
            {dismissing ? 'Applying…' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}

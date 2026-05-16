'use client';

import { useState } from 'react';
import { useCharacterStore } from '@/store/characterStore';
import type { Character } from '@/types';

type AllocStat = 'strength' | 'wisdom' | 'agility' | 'stamina';

const ALLOC_OPTIONS: {
  stat: AllocStat;
  label: string;
  icon: string;
  color: string;
  description: string;
}[] = [
  {
    stat: 'strength',
    label: 'Strength',
    icon: '⚔️',
    color: 'border-red-300 bg-red-50 hover:bg-red-100 text-red-800',
    description: 'Increases physical attack damage',
  },
  {
    stat: 'wisdom',
    label: 'Wisdom',
    icon: '🧠',
    color: 'border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800',
    description: 'Increases magic attack damage',
  },
  {
    stat: 'agility',
    label: 'Agility',
    icon: '🌬️',
    color: 'border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800',
    description: 'Improves chance to escape combat',
  },
  {
    stat: 'stamina',
    label: 'Stamina',
    icon: '⚡',
    color: 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800',
    description: 'Increases HP pool and stamina for abilities',
  },
];

interface StatAllocModalProps {
  character: Character;
}

export function StatAllocModal({ character }: StatAllocModalProps) {
  const allocateStatPoint = useCharacterStore((s) => s.allocateStatPoint);
  const [allocating, setAllocating] = useState<AllocStat | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<AllocStat | null>(null);

  const pending = character.pendingStatPoints ?? 0;
  if (pending <= 0) return null;

  async function handleAlloc(stat: AllocStat) {
    if (allocating) return;
    if (pendingConfirm !== stat) {
      setPendingConfirm(stat);
      return;
    }
    setPendingConfirm(null);
    setAllocating(stat);
    await allocateStatPoint(stat);
    setAllocating(null);
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">⬆️</span>
        <h3 className="font-bold text-amber-800 text-lg">Level Up!</h3>
        {pending > 1 && (
          <span className="ml-auto text-xs bg-amber-400 text-white font-bold px-2 py-0.5 rounded-full">
            {pending} points
          </span>
        )}
      </div>
      <p className="text-sm text-amber-700 mb-4">
        Choose a stat to increase. You have <span className="font-bold">{pending}</span> unspent{' '}
        {pending === 1 ? 'point' : 'points'}.
        {pendingConfirm && (
          <span className="block mt-1 text-amber-800 font-semibold">
            Tap again to confirm.{' '}
            <button
              className="underline font-normal text-amber-600"
              onClick={() => setPendingConfirm(null)}
            >
              Cancel
            </button>
          </span>
        )}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {ALLOC_OPTIONS.map(({ stat, label, icon, color, description }) => {
          const isConfirming = pendingConfirm === stat;
          return (
            <button
              key={stat}
              onClick={() => handleAlloc(stat)}
              disabled={!!allocating}
              className={`flex flex-col items-start gap-0.5 border-2 rounded-xl px-4 py-3 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isConfirming
                  ? 'border-amber-500 bg-amber-100 ring-2 ring-amber-400 text-amber-900'
                  : color
              }`}
            >
              <span className="font-bold text-sm flex items-center gap-1.5">
                {icon} {label}
                <span className="font-normal opacity-70 ml-0.5">
                  ({character.stats[stat] ?? 0})
                </span>
              </span>
              <span className="text-xs opacity-70">{description}</span>
              {allocating === stat && <span className="text-xs font-semibold mt-0.5">Saving…</span>}
              {isConfirming && !allocating && (
                <span className="text-xs font-bold mt-0.5 text-amber-700">Confirm +1?</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

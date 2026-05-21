'use client';

import { use, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCharacter } from '@/hooks/useCharacter';
import { useDungeonStore } from '@/store/dungeonStore';
import {
  DUNGEON_TIERS,
  generateDungeonLayout,
  getWeekSeed,
  isLegendaryEligible,
} from '@/lib/gameLogic/dungeons';
import { playerMaxHp, playerMaxStamina, playerMaxMagic } from '@/lib/gameLogic/combat';
import type { DungeonTierId, DungeonRoomType } from '@/types';

const VALID_TIERS: DungeonTierId[] = [
  'goblin-caves',
  'spider-lair',
  'dark-sanctum',
  'dragons-keep',
];

function roomIcon(type: DungeonRoomType): string {
  if (type === 'combat') return '⚔';
  if (type === 'stat-check') return '🔍';
  if (type === 'rest') return '?';
  return '💀';
}

function ResourceBar({
  label,
  current,
  max,
  barColor,
  textColor,
}: {
  label: string;
  current: number;
  max: number;
  barColor: string;
  textColor: string;
}) {
  const pct = Math.min(100, Math.round((current / max) * 100));
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className={textColor}>{label}</span>
        <span className={textColor}>
          {current}/{max}
        </span>
      </div>
      <div className="bg-slate-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function TierEntryPage({ params }: { params: Promise<{ tierId: string }> }) {
  const { tierId } = use(params);
  if (!VALID_TIERS.includes(tierId as DungeonTierId)) notFound();
  const id = tierId as DungeonTierId;
  const tier = DUNGEON_TIERS[id];

  const { character } = useCharacter();
  const { startRun, loading } = useDungeonStore();
  const router = useRouter();
  const [entering, setEntering] = useState(false);

  if (!character) return null;

  const maxHp = playerMaxHp(character);
  const maxSta = playerMaxStamina(character);
  const maxMag = playerMaxMagic(character);
  const curHp = character.currentHp ?? maxHp;
  const curSta = character.currentStamina ?? maxSta;
  const curMag = character.currentMagic ?? maxMag;
  const hpGate = curHp / maxHp >= 0.5;
  const canAfford = character.gold >= tier.entryFee;
  const canEnter = hpGate && canAfford && !loading && !entering;
  const legendary = isLegendaryEligible(character.dungeonRunsToday);

  const previewRooms = generateDungeonLayout(id, getWeekSeed());

  async function handleEnter() {
    if (!canEnter) return;
    setEntering(true);
    const runId = await startRun(id, character!);
    if (runId) {
      router.push('/combat/dungeons/run');
    } else {
      setEntering(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 pb-24">
      <Link href="/combat/dungeons" className="text-slate-400 text-sm mb-4 inline-block">
        ← Dungeons
      </Link>

      <h1 className="text-2xl font-bold text-white mb-1">{tier.name}</h1>
      <p className="text-slate-400 text-sm mb-4">
        Lv. {tier.recLevelMin}
        {tier.recLevelMax ? `–${tier.recLevelMax}` : '+'} · {tier.minRooms}–{tier.maxRooms} rooms +
        boss
      </p>

      {/* Resources */}
      <div className="bg-slate-800 rounded-xl p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">
            Your Resources
          </span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              hpGate ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
            }`}
          >
            {hpGate ? '✓ HP ≥50%' : '✗ HP <50% — heal before entering'}
          </span>
        </div>
        <ResourceBar
          label="❤ HP"
          current={curHp}
          max={maxHp}
          barColor="bg-red-500"
          textColor="text-red-400"
        />
        <ResourceBar
          label="⚡ Stamina"
          current={curSta}
          max={maxSta}
          barColor="bg-orange-500"
          textColor="text-orange-400"
        />
        <ResourceBar
          label="✨ Magic"
          current={curMag}
          max={maxMag}
          barColor="bg-indigo-500"
          textColor="text-indigo-400"
        />
      </div>

      {/* Entry fee + legendary eligibility */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 bg-slate-800 rounded-xl p-3 text-center">
          <div className="text-yellow-400 font-bold">{tier.entryFee} 🪙</div>
          <div className="text-slate-500 text-xs">You have {character.gold}</div>
        </div>
        <div className="flex-1 bg-slate-800 rounded-xl p-3 text-center">
          <div
            className={`text-sm font-semibold ${legendary ? 'text-yellow-400' : 'text-slate-500'}`}
          >
            {legendary ? '★ Legendary eligible' : 'Legendary locked'}
          </div>
          <div className="text-slate-500 text-xs">
            {legendary ? '1st run today' : 'Run 2 today'}
          </div>
        </div>
      </div>

      {/* Room layout preview */}
      <div className="bg-slate-800 rounded-xl p-4 mb-4">
        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
          This Week&apos;s Layout
        </div>
        <div className="flex items-center gap-1 justify-center flex-wrap">
          {previewRooms.map((room, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  room.type === 'boss'
                    ? 'bg-orange-900 border-2 border-orange-600'
                    : 'bg-slate-700 border border-slate-600'
                }`}
              >
                {roomIcon(room.type)}
              </div>
              {i < previewRooms.length - 1 && <div className="w-3 h-0.5 bg-slate-600" />}
            </div>
          ))}
        </div>
        <div className="text-center text-slate-500 text-xs mt-2">
          ⚔ combat · 🔍 stat check · ? rest · 💀 boss
        </div>
      </div>

      {/* Champion slots (stub) */}
      <div className="bg-slate-800 rounded-xl p-4 mb-6">
        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
          Champion Slots <span className="text-slate-600 font-normal">(Coming Soon)</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-dashed border-slate-700 rounded-lg p-3 text-center"
            >
              <div className="text-xl">🔒</div>
              <div className="text-slate-600 text-xs mt-1">Locked</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleEnter}
        disabled={!canEnter}
        className={`w-full py-4 rounded-xl text-base font-bold transition-colors ${
          canEnter
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
        }`}
      >
        {entering ? 'Entering…' : `Enter ${tier.name} · ${tier.entryFee} 🪙`}
      </button>
      {!hpGate && (
        <p className="text-red-400 text-xs text-center mt-2">
          Need ≥50% HP. Log meals to restore HP.
        </p>
      )}
      {!canAfford && <p className="text-red-400 text-xs text-center mt-2">Not enough gold.</p>}
    </div>
  );
}

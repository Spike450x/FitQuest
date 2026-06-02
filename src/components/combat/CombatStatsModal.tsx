'use client';

import { StatBar } from '@/components/character/StatBar';
import { STAT_BAR_CONFIG, STAT_BAR_MAX } from '@/components/character/statConfig';
import {
  effectiveStat,
  gearDefenseBonus,
  playerMaxHp,
  playerMaxMagic,
  playerMaxStamina,
} from '@/lib/gameLogic/combat';
import { DefenseIcon } from '@/components/art/stat-icons';
import type { Character, MonsterDef } from '@/types';

interface PlayerStats {
  character: Character;
  currentHp: number;
  currentStamina: number;
  currentMagic: number;
}

interface MonsterStats {
  def: MonsterDef;
  bonusAtk?: number;
  bonusDef?: number;
  currentHp: number;
}

function ResourceRow({
  label,
  current,
  max,
  color,
  icon,
}: {
  label: string;
  current: number;
  max: number;
  color: string;
  icon: string;
}) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="flex items-center gap-1.5 text-gray-700 dark:text-slate-200 font-medium">
          {icon} {label}
        </span>
        <span className="font-semibold tabular-nums text-gray-700 dark:text-slate-200">
          {current}
          <span className="text-gray-400 dark:text-slate-500 font-normal text-xs"> / {max}</span>
        </span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PlayerPanel({ stats }: { stats: PlayerStats }) {
  const { character, currentHp, currentStamina, currentMagic } = stats;
  const maxHp = playerMaxHp(character);
  const maxStamina = playerMaxStamina(character);
  const maxMagic = playerMaxMagic(character);
  const effDef = effectiveStat(character, 'defense') + gearDefenseBonus(character);

  return (
    <div className="space-y-4">
      <div className="text-center pb-2 border-b border-gray-100 dark:border-slate-700">
        <p className="text-base font-bold text-gray-800 dark:text-slate-100 capitalize">
          {character.name}
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-500 capitalize">
          Level {character.level} {character.class}
        </p>
      </div>

      <div className="space-y-2.5">
        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
          Resources
        </p>
        <ResourceRow label="Health" current={currentHp} max={maxHp} color="bg-rose-400" icon="❤️" />
        <ResourceRow
          label="Stamina"
          current={currentStamina}
          max={maxStamina}
          color="bg-amber-400"
          icon="⚡"
        />
        <ResourceRow
          label="Magic"
          current={currentMagic}
          max={maxMagic}
          color="bg-violet-400"
          icon="✨"
        />
      </div>

      <div className="space-y-2.5">
        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
          Combat Stats (effective)
        </p>
        {STAT_BAR_CONFIG.map((cfg) => (
          <StatBar
            key={cfg.key}
            label={cfg.label}
            value={effectiveStat(character, cfg.key)}
            max={STAT_BAR_MAX}
            color={cfg.color}
            icon={cfg.icon}
          />
        ))}
        <StatBar
          label="Defense"
          value={effDef}
          max={STAT_BAR_MAX}
          color="bg-gray-400"
          icon={<DefenseIcon className="w-4 h-4 text-gray-500" />}
        />
      </div>
    </div>
  );
}

const SPECIAL_EFFECT_LABEL: Record<string, string> = {
  heavy: 'Heavy strike',
  pierce: 'Pierce armor',
  burst: 'Magic burst',
  drain: 'Life drain',
  stun: 'Stun',
};

function MonsterPanel({ stats }: { stats: MonsterStats }) {
  const { def, bonusAtk = 0, bonusDef = 0, currentHp } = stats;
  const hpPct = Math.min((currentHp / def.hp) * 100, 100);
  const isLowHp = hpPct <= 30;

  return (
    <div className="space-y-4">
      <div className="text-center pb-2 border-b border-gray-100 dark:border-slate-700">
        <p className="text-base font-bold text-gray-800 dark:text-slate-100">{def.name}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500">Level {def.level} monster</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
          Health
        </p>
        <div className="flex justify-between text-sm font-semibold tabular-nums">
          <span className={isLowHp ? 'text-red-500' : 'text-gray-700 dark:text-slate-200'}>
            {currentHp}
          </span>
          <span className="text-gray-400 dark:text-slate-500 font-normal text-xs self-end">
            / {def.hp}
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${isLowHp ? 'bg-red-400' : 'bg-slate-500'}`}
            style={{ width: `${hpPct}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
          Stats
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide">
              ATK
            </p>
            <p className="font-bold text-gray-800 dark:text-slate-100">
              {def.attack + bonusAtk}
              {bonusAtk > 0 && (
                <span className="text-[10px] text-orange-500 font-normal ml-1">
                  +{bonusAtk} enrage
                </span>
              )}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide">
              DEF
            </p>
            <p className="font-bold text-gray-800 dark:text-slate-100">
              {def.defense + bonusDef}
              {bonusDef > 0 && (
                <span className="text-[10px] text-sky-500 font-normal ml-1">
                  +{bonusDef} harden
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">
            Attack Type
          </p>
          <p className="text-sm font-semibold">
            {(def.attackType ?? 'physical') === 'magic' ? (
              <span className="text-violet-600 dark:text-violet-400">🔮 Magic · ignores armor</span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400">⚔️ Physical</span>
            )}
          </p>
        </div>
      </div>

      {def.passive && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
            Passive
          </p>
          <p className="text-sm text-gray-700 dark:text-slate-200">
            <span className="font-semibold">{def.passive.label}</span>
            {' · '}
            <span className="text-gray-500 dark:text-slate-400 text-xs">
              {def.passive.id === 'thorns' && `${def.passive.value}% damage reflected`}
              {def.passive.id === 'regen' && `+${def.passive.value} HP/round`}
              {def.passive.id === 'vampiric' && `${def.passive.value}% lifesteal`}
              {def.passive.id === 'siphon' && `-${def.passive.value} stamina/hit`}
              {def.passive.id === 'armor-pierce' && `-${def.passive.value} player DEF`}
            </span>
          </p>
        </div>
      )}

      {def.active && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
            Active Ability
          </p>
          <p className="text-sm text-gray-700 dark:text-slate-200">
            <span className="font-semibold">{def.active.label}</span>
            {' · '}
            <span className="text-gray-500 dark:text-slate-400 text-xs">
              triggers at ≤{Math.round(def.active.triggerPct * 100)}% HP
            </span>
          </p>
        </div>
      )}

      {def.specialMoves && def.specialMoves.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
            Special Moves
          </p>
          <div className="space-y-1">
            {def.specialMoves.map((sm) => (
              <div key={sm.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 dark:text-slate-200">
                  {sm.emoji} <span className="font-semibold">{sm.name}</span>
                  {' · '}
                  <span className="text-gray-500 dark:text-slate-400">
                    {SPECIAL_EFFECT_LABEL[sm.effect.kind] ?? sm.effect.kind}
                  </span>
                </span>
                <span className="text-gray-400 dark:text-slate-500 tabular-nums">
                  {Math.round(sm.chance * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center italic">
        Monsters don&apos;t have stamina or magic pools
      </p>
    </div>
  );
}

export function CombatStatsModal({
  which,
  playerStats,
  monsterStats,
  onClose,
}: {
  which: 'player' | 'monster';
  playerStats?: PlayerStats;
  monsterStats?: MonsterStats;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />
      <div className="relative bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl px-5 py-6 shadow-2xl mx-0 sm:mx-4 w-full sm:max-w-sm max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Close stats"
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 text-xl font-bold leading-none"
        >
          ×
        </button>
        {which === 'player' && playerStats && <PlayerPanel stats={playerStats} />}
        {which === 'monster' && monsterStats && <MonsterPanel stats={monsterStats} />}
      </div>
    </div>
  );
}

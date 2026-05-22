'use client';

import { useCharacter } from '@/hooks/useCharacter';
import { Card } from '@/components/ui/Card';
import { MASTERY_CONFIG, nextMasteryMilestone, RESTORE } from '@/lib/gameLogic/constants';
import { playerMaxHp, playerMaxStamina, playerMaxMagic } from '@/lib/gameLogic/combat';
import type { MasteryActivityType } from '@/lib/gameLogic/constants';

const MASTERY_ITEMS: { type: MasteryActivityType; icon: string }[] = [
  { type: 'workout', icon: '🏋️' },
  { type: 'run', icon: '🏃' },
  { type: 'steps', icon: '👟' },
];

export function ActivitySidePanel() {
  const { character } = useCharacter();
  if (!character) return null;

  const maxHp = playerMaxHp(character);
  const maxStamina = playerMaxStamina(character);
  const maxMagic = playerMaxMagic(character);
  const currentHp = character.currentHp ?? maxHp;
  const currentStamina = character.currentStamina ?? maxStamina;
  const currentMagic = character.currentMagic ?? maxMagic;

  return (
    <div className="space-y-4">
      {/* Mastery Progress */}
      <Card variant="default" padding="lg">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Mastery Progress
        </h3>
        <div className="space-y-4">
          {MASTERY_ITEMS.map(({ type, icon }) => {
            const config = MASTERY_CONFIG[type];
            const count = character.masteryCounts?.[type] ?? 0;
            const next = nextMasteryMilestone(count);
            const prevMilestone = count < 5 ? 0 : Math.floor((count - 5) / 10) * 10 + 5;
            const rangeSize = next - prevMilestone;
            const progress = count - prevMilestone;
            const pct = Math.min(100, Math.round((progress / rangeSize) * 100));

            return (
              <div key={type} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {icon} {config.linkedStatLabel}
                  </span>
                  <span className="text-xs text-gray-400 tabular-nums">
                    {count} / {next}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-indigo-400 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  {next - count} more → +1 {config.linkedStatLabel}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-300 mt-4 border-t border-gray-100 pt-3">
          Milestones at 5 sessions, then every 10 thereafter
        </p>
      </Card>

      {/* Current Resources */}
      <Card variant="default" padding="lg">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Resources
        </h3>
        <div className="space-y-4">
          <ResourceBar
            label="HP"
            icon="❤️"
            current={currentHp}
            max={maxHp}
            color="bg-rose-400"
            note={`+${RESTORE.HP_PER_MEAL} per meal (nutrition)`}
          />
          <ResourceBar
            label="Stamina"
            icon="⚡"
            current={currentStamina}
            max={maxStamina}
            color="bg-amber-400"
            note={`+${RESTORE.STAMINA_PER_SLEEP_HOUR} per sleep hour`}
          />
          <ResourceBar
            label="Magic"
            icon="✨"
            current={currentMagic}
            max={maxMagic}
            color="bg-violet-400"
            note={`+${RESTORE.MAGIC_PER_WATER_GLASS} per glass of water`}
          />
        </div>
      </Card>
    </div>
  );
}

function ResourceBar({
  label,
  icon,
  current,
  max,
  color,
  note,
}: {
  label: string;
  icon: string;
  current: number;
  max: number;
  color: string;
  note: string;
}) {
  const pct = Math.min(100, Math.round((current / max) * 100));
  const isFull = current >= max;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-gray-700 font-medium">
          {icon} {label}
        </span>
        <span
          className={`text-xs font-semibold tabular-nums ${isFull ? 'text-emerald-600' : 'text-gray-600'}`}
        >
          {current}
          <span className="text-gray-300 font-normal"> / {max}</span>
          {isFull && <span className="ml-1 text-emerald-500">✓</span>}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${isFull ? 'bg-emerald-400' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">{note}</p>
    </div>
  );
}

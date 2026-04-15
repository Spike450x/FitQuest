"use client";

import { XPBar } from "@/components/ui/XPBar";
import { GoldDisplay } from "@/components/ui/GoldDisplay";
import { StatBar } from "./StatBar";
import { CLASS_DEFINITIONS } from "@/lib/gameLogic/constants";
import { playerMaxStamina, totalGearBonuses } from "@/lib/gameLogic/combat";
import type { Character } from "@/types";

// The three primary combat stats shown as bars
const STAT_CONFIG = [
  { key: "strength" as const, label: "Strength", icon: "⚔️", color: "bg-red-400" },
  { key: "wisdom" as const,   label: "Wisdom",   icon: "🧠", color: "bg-blue-400" },
  { key: "agility" as const,  label: "Agility",  icon: "🌬️", color: "bg-teal-400" },
];

interface CharacterCardProps {
  character: Character;
}

export function CharacterCard({ character }: CharacterCardProps) {
  const classDef = CLASS_DEFINITIONS[character.class];
  const gearBonuses = totalGearBonuses(character.equippedGear);
  const maxStamina = playerMaxStamina(character);
  const currentStamina = character.currentStamina ?? maxStamina;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{character.name}</h2>
          <p className="text-sm text-indigo-600 mt-0.5 font-medium">
            {classDef.emoji} {classDef.label} · Level {character.level}
          </p>
        </div>
        <GoldDisplay amount={character.gold} size="md" />
      </div>

      {/* XP Bar */}
      <XPBar xp={character.xp} level={character.level} xpToNextLevel={character.xpToNextLevel} />

      {/* Stamina bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-1.5 text-gray-700">
            <span>⚡</span>
            <span className="font-medium">Stamina</span>
          </span>
          <span className="text-gray-700 font-semibold text-sm tabular-nums">
            {currentStamina}
            <span className="text-gray-400 font-normal text-xs"> / {maxStamina}</span>
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-amber-400"
            style={{ width: `${Math.min((currentStamina / maxStamina) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Primary stat bars */}
      <div className="space-y-3 pt-1 border-t border-gray-100">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide pt-1">Stats</p>
        {STAT_CONFIG.map(({ key, label, icon, color }) => {
          const base = character.stats[key] ?? 0;
          const bonus = gearBonuses[key] ?? 0;
          return (
            <StatBar
              key={key}
              label={label}
              value={base + bonus}
              max={50}
              color={color}
              icon={icon}
              suffix={bonus > 0 ? `+${bonus} gear` : undefined}
            />
          );
        })}
      </div>

      {/* Equipped gear summary */}
      <div className="pt-1 border-t border-gray-100">
        <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Equipped</p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {(["weapon", "armor", "accessory"] as const).map((slot) => (
            <div key={slot} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
              <p className="text-gray-400 capitalize">{slot}</p>
              <p className="text-gray-700 mt-0.5 truncate font-medium">
                {character.equippedGear[slot] ?? "—"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

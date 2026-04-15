"use client";

import { useCharacter } from "@/hooks/useCharacter";
import { CharacterCard } from "@/components/character/CharacterCard";
import { CLASS_DEFINITIONS } from "@/lib/gameLogic/constants";

export default function CharacterPage() {
  const { character, loading } = useCharacter();

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!character) {
    return (
      <div className="text-center py-12 text-gray-400">
        No character found. Something went wrong.
      </div>
    );
  }

  const classDef = CLASS_DEFINITIONS[character.class];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Character Sheet</h1>

      <CharacterCard character={character} />

      {/* Class details */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-1">
          {classDef.emoji} {classDef.label} — Class Bonuses
        </h3>
        <p className="text-sm text-gray-500 mb-4">{classDef.description}</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {(
            [
              ["Strength", classDef.statMultipliers.strength],
              ["Wisdom",   classDef.statMultipliers.wisdom],
              ["Agility",  classDef.statMultipliers.agility],
              ["Stamina",  classDef.statMultipliers.stamina],
              ["Health",   classDef.statMultipliers.health],
              ["Defense",  classDef.statMultipliers.defense],
            ] as [string, number][]
          ).map(([stat, mult]) => (
            <div key={stat} className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400">{stat}</p>
              <p
                className={`font-bold mt-0.5 ${mult > 1 ? "text-indigo-600" : mult < 1 ? "text-red-400" : "text-gray-600"}`}
              >
                ×{mult.toFixed(1)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats explanation */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">How Stats Work</h3>
        <div className="space-y-3 text-sm text-gray-500">
          <p><span className="text-red-500 font-medium">Strength</span> — Increases from workouts. Powers your physical attacks in combat.</p>
          <p><span className="text-blue-500 font-medium">Wisdom</span> — Increases from nutrition. Powers your magic attacks in combat.</p>
          <p><span className="text-teal-500 font-medium">Agility</span> — Increases from running and steps. Adds a bonus to your escape roll when running away.</p>
          <p><span className="text-amber-500 font-medium">Stamina</span> — Increases from cardio and training. Raises your max HP <em>and</em> your ability stamina pool — more uses of your class abilities per fight.</p>
          <p><span className="text-pink-500 font-medium">Health</span> — Increases from sleep and hydration. Raises max HP.</p>
          <p><span className="text-indigo-500 font-medium">Defense</span> — Increases from workouts and sleep. Reduces damage from monster attacks. Has a 25% chance to be bypassed each round.</p>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-100 rounded w-48" />
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="h-6 bg-gray-100 rounded w-32" />
        <div className="h-2.5 bg-gray-100 rounded w-full" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

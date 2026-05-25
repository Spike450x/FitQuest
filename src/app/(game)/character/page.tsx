'use client';

import { useCharacter } from '@/hooks/useCharacter';
import { CharacterCard } from '@/components/character/CharacterCard';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { CLASS_DEFINITIONS } from '@/lib/gameLogic/constants';
import {
  StrengthIcon,
  WisdomIcon,
  AgilityIcon,
  StaminaIcon,
  HealthIcon,
  DefenseIcon,
} from '@/components/art/stat-icons';

export default function CharacterPage() {
  const { character, loading } = useCharacter();

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!character) {
    return (
      <div className="text-center py-12 text-gray-400 dark:text-slate-500">
        No character found. Something went wrong.
      </div>
    );
  }

  const classDef = CLASS_DEFINITIONS[character.class];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
        Character Sheet
      </h1>

      <CharacterCard character={character} />

      {/* Lower two-column row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Class details */}
        <Card variant="default" padding="lg">
          <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-1">
            {classDef.emoji} {classDef.label} — Class Bonuses
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">{classDef.description}</p>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['Strength', classDef.statMultipliers.strength],
                ['Wisdom', classDef.statMultipliers.wisdom],
                ['Agility', classDef.statMultipliers.agility],
                ['Stamina', classDef.statMultipliers.stamina],
                ['Health', classDef.statMultipliers.health],
                ['Defense', classDef.statMultipliers.defense],
              ] as [string, number][]
            ).map(([stat, mult]) => (
              <div
                key={stat}
                className="bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg p-3 text-center"
              >
                <p className="text-xs text-gray-400 dark:text-slate-500">{stat}</p>
                <p
                  className={`font-bold mt-0.5 ${mult > 1 ? 'text-indigo-600' : mult < 1 ? 'text-red-400' : 'text-gray-600 dark:text-slate-300'}`}
                >
                  ×{mult.toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Stats explanation */}
        <Card variant="default" padding="lg">
          <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-4">How Stats Work</h3>
          <div className="space-y-3 text-sm text-gray-500 dark:text-slate-400">
            {[
              {
                Icon: StrengthIcon,
                color: 'text-red-500',
                label: 'Strength',
                desc: 'Increases from workouts. Powers your physical attacks in combat.',
              },
              {
                Icon: WisdomIcon,
                color: 'text-blue-500',
                label: 'Wisdom',
                desc: 'Increases from nutrition. Powers your magic attacks in combat.',
              },
              {
                Icon: AgilityIcon,
                color: 'text-teal-500',
                label: 'Agility',
                desc: 'Increases from running and steps. Adds a bonus to your escape roll when running away.',
              },
              {
                Icon: StaminaIcon,
                color: 'text-amber-500',
                label: 'Stamina',
                desc: (
                  <>
                    Increases from cardio and training. Raises your max HP <em>and</em> your ability
                    stamina pool — more uses of your class abilities per fight.
                  </>
                ),
              },
              {
                Icon: HealthIcon,
                color: 'text-pink-500',
                label: 'Health',
                desc: 'Increases from sleep and hydration. Raises max HP.',
              },
              {
                Icon: DefenseIcon,
                color: 'text-indigo-500',
                label: 'Defense',
                desc: 'Increases from workouts and sleep. Reduces damage from monster attacks. Has a 25% chance to be bypassed each round.',
              },
            ].map(({ Icon, color, label, desc }) => (
              <div key={label} className="flex items-start gap-2.5">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                <p>
                  <span className={`font-medium ${color}`}>{label}</span> — {desc}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton shape="line" height="h-8" width="w-48" />
      <Card variant="default" padding="lg">
        <div className="space-y-4">
          <Skeleton shape="line" height="h-6" width="w-32" />
          <Skeleton shape="line" height="h-2.5" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} shape="line" height="h-4" />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

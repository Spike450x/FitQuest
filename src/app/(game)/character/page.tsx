'use client';

import type { Stats } from '@/types';
import { useCharacter } from '@/hooks/useCharacter';
import { CharacterCard } from '@/components/character/CharacterCard';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { CLASS_DAMAGE_TAKEN, CLASS_DEFINITIONS, COMBAT } from '@/lib/gameLogic/constants';
import { classDodgeChance } from '@/lib/gameLogic/combat';
import {
  StrengthIcon,
  WisdomIcon,
  AgilityIcon,
  StaminaIcon,
  HealthIcon,
  DefenseIcon,
  SpiritIcon,
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
  const isRogue = character.class === 'rogue';
  const isWizard = character.class === 'wizard';
  const dodgePct = Math.round(classDodgeChance(character) * 100);
  const magicTaken = CLASS_DAMAGE_TAKEN[character.class].magic;

  // What each stat actually drives in combat — paired with the (now real)
  // class multiplier so the sheet matches the mechanics.
  const STAT_TRAITS: { key: keyof Stats; label: string; effect: string }[] = [
    { key: 'strength', label: 'Strength', effect: 'Physical attack & ability damage' },
    { key: 'wisdom', label: 'Wisdom', effect: 'Magic damage & magic pool' },
    {
      key: 'agility',
      label: 'Agility',
      effect: isRogue ? 'Escape rolls & dodge chance' : 'Escape rolls',
    },
    { key: 'spirit', label: 'Spirit', effect: 'Spell & ability crit' },
    { key: 'stamina', label: 'Stamina', effect: 'Ability pool (+ some HP)' },
    { key: 'health', label: 'Health', effect: 'Max HP' },
    { key: 'defense', label: 'Defense', effect: 'Physical damage taken' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
        Character Sheet
      </h1>

      <CharacterCard character={character} />

      {/* Lower two-column row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Class traits — the real combat multipliers + class-only perks */}
        <Card variant="default" padding="lg">
          <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-1">
            {classDef.emoji} {classDef.label} — Class Traits
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">{classDef.description}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
            Your class scales each stat&rsquo;s effect in combat. Higher is stronger; a value below
            ×1.0 is a weakness. These apply to every fight.
          </p>
          <div className="space-y-1.5">
            {STAT_TRAITS.map(({ key, label, effect }) => {
              const mult = classDef.statMultipliers[key];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-slate-200">{label}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{effect}</p>
                  </div>
                  <span
                    className={`font-bold shrink-0 ${
                      mult > 1
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : mult < 1
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-gray-500 dark:text-slate-400'
                    }`}
                  >
                    ×{mult.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Class-only perks that aren't stat multipliers */}
          <div className="mt-4 space-y-2">
            {isWizard && (
              <div className="rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900 px-3 py-2">
                <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                  🔮 Arcane Reserves
                </p>
                <p className="text-xs text-violet-600/80 dark:text-violet-400/80">
                  +{COMBAT.WIZARD_MAGIC_BONUS} max magic on top of your Wisdom pool.
                </p>
              </div>
            )}
            {isRogue && (
              <div className="rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900 px-3 py-2">
                <p className="text-sm font-medium text-teal-700 dark:text-teal-300">💨 Evasion</p>
                <p className="text-xs text-teal-600/80 dark:text-teal-400/80">
                  {dodgePct}% chance to fully dodge a monster hit (scales with Agility, cap{' '}
                  {Math.round(COMBAT.ROGUE_DODGE_CAP * 100)}%).
                </p>
              </div>
            )}
            {magicTaken !== 1 && (
              <div
                className={`rounded-lg px-3 py-2 border ${
                  magicTaken > 1
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900'
                    : 'bg-sky-50 dark:bg-sky-950/40 border-sky-100 dark:border-sky-900'
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    magicTaken > 1
                      ? 'text-rose-700 dark:text-rose-300'
                      : 'text-sky-700 dark:text-sky-300'
                  }`}
                >
                  🔮 {magicTaken > 1 ? 'Weak to Magic' : 'Magic Ward'}
                </p>
                <p
                  className={`text-xs ${
                    magicTaken > 1
                      ? 'text-rose-600/80 dark:text-rose-400/80'
                      : 'text-sky-600/80 dark:text-sky-400/80'
                  }`}
                >
                  {magicTaken > 1
                    ? `Take ${Math.round((magicTaken - 1) * 100)}% more damage from magic attacks (they ignore your armor).`
                    : `Take ${Math.round((1 - magicTaken) * 100)}% less damage from magic attacks.`}
                </p>
              </div>
            )}
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 px-3 py-2">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                ⭐ {character.subclass ? 'Subclass active' : 'Subclass at level 10'}
              </p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                {character.subclass
                  ? 'Your subclass adds powerful combat passives on top of these traits.'
                  : 'Reach level 10 to choose a subclass with powerful combat passives.'}
              </p>
            </div>
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
                desc: 'Increases from running and steps. Adds a bonus to your escape roll — and Rogues also gain a chance to dodge monster hits entirely.',
              },
              {
                Icon: StaminaIcon,
                color: 'text-amber-500',
                label: 'Stamina',
                desc: (
                  <>
                    Increases from cardio and training. Drives your <em>ability stamina pool</em> —
                    more uses of your class abilities per fight — and adds a little max HP.
                  </>
                ),
              },
              {
                Icon: HealthIcon,
                color: 'text-pink-500',
                label: 'Health',
                desc: 'Increases from sleep and hydration. Your primary max-HP stat.',
              },
              {
                Icon: DefenseIcon,
                color: 'text-indigo-500',
                label: 'Defense',
                desc: 'Increases from workouts and sleep. Reduces damage from monster attacks (scaled by your class multiplier). Has a 25% chance to be bypassed each round.',
              },
              {
                Icon: SpiritIcon,
                color: 'text-violet-500',
                label: 'Spirit',
                desc: 'Increases from meditation. Each point adds +1% spell and ability crit chance (cap 40%) and +0.5% crit damage (cap +25%).',
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

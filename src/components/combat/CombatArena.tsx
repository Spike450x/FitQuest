'use client';

import { motion } from 'framer-motion';
import { CombatEffects } from './CombatEffects';
import { EntityArt, type EntityCategory } from '@/components/art/EntityArt';
import type { DamageBurst } from '@/hooks/useCombatBursts';

interface AvatarProps {
  /** Entity art category — 'class' for the player, 'monster' for foes. */
  artCategory: EntityCategory;
  /** Stable id used by the art lookup. */
  artId: string;
  /** Emoji fallback if no custom silhouette is registered for `artId`. */
  emoji: string;
  name: string;
  hp: number;
  maxHp: number;
  defense: number;
  /** Tailwind color stop used for the HP bar fill. */
  hpColor: string;
  /** Last damage taken — triggers a brief flash when it ticks up. */
  damageKey?: string;
  /** Side hint used so the portrait can flip its facing direction. */
  side: 'left' | 'right';
  /** Optional sub-line under the HP bar (defense breakdown, hunting count, etc.) */
  sub?: React.ReactNode;
}

/**
 * Big colored portrait frame with HP bar underneath. Used in `CombatArena`
 * to give both combatants a focal point on the screen instead of two
 * stacked HP bars that read like an admin form.
 */
function Avatar({
  artCategory,
  artId,
  emoji,
  name,
  hp,
  maxHp,
  defense,
  hpColor,
  damageKey,
  side,
  sub,
}: AvatarProps) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const fainted = hp <= 0;
  const low = hp / maxHp <= 0.3 && !fainted;
  // Monsters face the player — mirror the right-side portrait.
  const facingTransform = side === 'right' ? 'scale-x-[-1]' : '';

  return (
    <div className="flex-1 min-w-0 flex flex-col items-center gap-2">
      <motion.div
        key={`portrait-${damageKey}`}
        animate={
          damageKey
            ? {
                x: side === 'left' ? [0, -6, 6, -3, 3, 0] : [0, 6, -6, 3, -3, 0],
                rotate: [0, side === 'left' ? -2 : 2, 0],
              }
            : {}
        }
        transition={{ duration: 0.4 }}
        className={`relative w-24 h-24 sm:w-28 sm:h-28 shadow-lg rounded-2xl ${
          fainted ? 'grayscale opacity-50' : ''
        } ${low ? 'animate-pulse' : ''}`}
      >
        <div className={`${facingTransform} w-full h-full`}>
          <EntityArt
            category={artCategory}
            id={artId}
            size="lg"
            fallbackEmoji={emoji}
            ariaLabel={name}
            className="w-full h-full"
          />
        </div>
      </motion.div>
      <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 truncate max-w-full">
        {name}
      </p>
      <div className="w-full">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-mono font-semibold text-gray-700 dark:text-slate-200 tabular-nums">
            {hp} / {maxHp}
          </span>
          <span className="text-gray-400 dark:text-slate-500 font-medium">🛡 {defense}</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <motion.div
            className={`h-full ${hpColor} rounded-full`}
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          />
        </div>
        {sub && (
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 leading-tight">{sub}</p>
        )}
      </div>
    </div>
  );
}

interface CombatArenaProps {
  /** Player display props */
  player: {
    name: string;
    /** Class id — drives custom-art lookup (`warrior` / `wizard` / `rogue`). */
    classId: string;
    /** Emoji fallback if no class silhouette is registered yet. */
    emoji: string;
    hp: number;
    maxHp: number;
    defense: number;
  };
  /** Monster display props */
  monster: {
    name: string;
    /** Monster id — drives custom-art lookup. */
    id: string;
    /** Emoji fallback if no monster silhouette is registered yet. */
    emoji: string;
    hp: number;
    maxHp: number;
    defense: number;
  };
  /** Floating-damage bursts to overlay (player-targeted on left, monster on right). */
  bursts: DamageBurst[];
  onBurstExpired: (id: number) => void;
  /** Re-keyable hash so the avatars shake when fresh damage arrives. */
  shakeKey?: string;
  /** Optional pity-tracker hint shown under the monster portrait. */
  monsterSub?: React.ReactNode;
}

/**
 * Side-by-side player vs monster portraits with HP bars. Replaces the
 * 3-stacked-HP-bars layout that read like a form. Floating damage numbers
 * from `CombatEffects` overlay the appropriate side.
 */
export function CombatArena({
  player,
  monster,
  bursts,
  onBurstExpired,
  shakeKey,
  monsterSub,
}: CombatArenaProps) {
  return (
    <div className="relative bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl p-4 sm:p-6 shadow-lg dark:shadow-black/30 overflow-visible">
      {/* Floating damage numbers — positioned over left/right sides */}
      <CombatEffects bursts={bursts} onBurstExpired={onBurstExpired} />

      <div className="flex items-center justify-between gap-3">
        <Avatar
          side="left"
          artCategory="class"
          artId={player.classId}
          emoji={player.emoji}
          name={`You · ${player.name}`}
          hp={player.hp}
          maxHp={player.maxHp}
          defense={player.defense}
          hpColor="bg-gradient-to-r from-rose-400 to-rose-500"
          damageKey={shakeKey ? `${shakeKey}-player` : undefined}
        />

        {/* VS divider */}
        <div className="flex flex-col items-center gap-1 shrink-0 px-1">
          <span
            className="font-display text-base sm:text-lg font-bold tracking-widest text-gray-400 dark:text-slate-500"
            aria-hidden="true"
          >
            VS
          </span>
          <span className="text-2xl" aria-hidden="true">
            ⚔️
          </span>
        </div>

        <Avatar
          side="right"
          artCategory="monster"
          artId={monster.id}
          emoji={monster.emoji}
          name={monster.name}
          hp={monster.hp}
          maxHp={monster.maxHp}
          defense={monster.defense}
          hpColor="bg-gradient-to-r from-slate-500 to-slate-600"
          damageKey={shakeKey ? `${shakeKey}-monster` : undefined}
          sub={monsterSub}
        />
      </div>
    </div>
  );
}

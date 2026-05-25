'use client';

import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { EntityArt } from '@/components/art/EntityArt';
import { getItemById, RARITY_BADGE, RARITY_CARD } from '@/lib/gameLogic/items';
import { MONSTER_EMOJI } from './MonsterCard';
import type { PendingRewards } from './types';

export function BattleResultsModal({
  pending,
  onClaim,
  claiming,
}: {
  pending: PendingRewards;
  onClaim: () => void;
  claiming: boolean;
}) {
  const emoji = MONSTER_EMOJI[pending.monster.id] ?? '👾';

  return (
    <div
      data-testid="combat-victory-modal"
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
    >
      <div className="relative bg-gradient-to-br from-white dark:from-slate-900 via-indigo-50/40 dark:via-indigo-950/30 to-violet-50/60 dark:to-violet-950/20 backdrop-blur-sm border border-indigo-100 dark:border-indigo-900 rounded-2xl shadow-2xl shadow-indigo-500/30 w-full max-w-sm p-6 animate-[fadeIn_0.3s_ease-out] overflow-hidden">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-12 w-40 h-40 rounded-full bg-indigo-300/30 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -left-12 w-40 h-40 rounded-full bg-violet-300/30 blur-3xl"
        />
        <div className="relative space-y-4">
          <div className="text-center space-y-2 flex flex-col items-center">
            <EntityArt
              category="monster"
              id={pending.monster.id}
              size="lg"
              fallbackEmoji={emoji}
              ariaLabel={`Defeated ${pending.monster.name}`}
              className="drop-shadow-md"
            />
            <p className="font-display text-4xl font-bold text-indigo-700 dark:text-indigo-300 tracking-wider uppercase drop-shadow-sm">
              Victory!
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {emoji} {pending.monster.name} defeated
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl p-3 text-center shadow-sm">
              <AnimatedNumber
                value={pending.xpReward}
                prefix="+"
                className="text-3xl font-bold text-indigo-600 dark:text-indigo-400"
              />
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider font-semibold">
                XP
              </p>
              {pending.streakMultiplier > 1.0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                  🔥 ×{pending.streakMultiplier.toFixed(2)} streak
                </p>
              )}
            </div>
            <div className="flex-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 rounded-xl p-3 text-center shadow-sm">
              <AnimatedNumber
                value={pending.goldReward}
                prefix="+"
                className="text-3xl font-bold text-amber-500"
              />
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider font-semibold">
                Gold
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              Loot
            </p>
            {pending.droppedItems.length > 0 ? (
              pending.droppedItems.map((itemId, idx) => {
                const def = getItemById(itemId);
                if (!def) return null;
                const card = RARITY_CARD[def.rarity];
                const isLegendary = def.rarity === 'legendary';
                return (
                  <motion.div
                    key={itemId}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + idx * 0.12, duration: 0.3, ease: 'easeOut' }}
                    className={`flex items-center justify-between bg-white dark:bg-slate-900 border ${card.border} ${card.glow} rounded-lg px-3 py-2 ${
                      isLegendary ? 'animate-legendary-glow' : ''
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-800 dark:text-slate-100">
                      📦 {def.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {def.lootOnly && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                          ✦ Drop Only
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${RARITY_BADGE[def.rarity]}`}
                      >
                        {def.rarity}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <p className="text-xs text-gray-400 dark:text-slate-500 italic">
                No loot dropped this time.
              </p>
            )}
          </div>

          <button
            onClick={onClaim}
            disabled={claiming}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg hover:shadow-indigo-500/40 disabled:opacity-50 disabled:hover:shadow-none text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98]"
          >
            {claiming ? 'Claiming…' : 'Claim Rewards'}
          </button>
        </div>
      </div>
    </div>
  );
}

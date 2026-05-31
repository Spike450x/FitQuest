'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

// ─── Dungeon tab helpers ───────────────────────────────────────────────────────

type CombatTab = 'arena' | 'dungeons';

function CombatModeTab({
  active,
  onChange,
}: {
  active: CombatTab;
  onChange: (t: CombatTab) => void;
}) {
  return (
    <div className="flex bg-slate-800 rounded-lg p-1 mb-4">
      {(['arena', 'dungeons'] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors capitalize ${
            active === tab
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {tab === 'arena' ? '⚔ Arena' : '🏰 Dungeons'}
        </button>
      ))}
    </div>
  );
}

function DungeonLobbyInline() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="text-5xl">🏰</div>
      <p className="text-slate-300 text-sm">Enter weekly dungeon runs for escalating loot.</p>
      <Link
        href="/combat/dungeons"
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
      >
        Open Dungeon Lobby →
      </Link>
    </div>
  );
}
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCharacter } from '@/hooks/useCharacter';
import { useCharacterStore } from '@/store/characterStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { MONSTER_CATALOG } from '@/lib/gameLogic/monsters';
import { getDailyPick, rotationExpiresAt, formatCountdown } from '@/lib/gameLogic/rotation';
import {
  playerMaxHp,
  playerMaxStamina,
  playerMaxMagic,
  gearDefenseBonus,
  monsterXpScaling,
  combatXpDailyMultiplier,
  combatWinsUntilNextPenalty,
} from '@/lib/gameLogic/combat';
import {
  getStreakLootMultiplier,
  getStreakXpMultiplier,
  WELCOME_BACK_LOOT_MULTIPLIER,
  WELCOME_BACK_XP_MULTIPLIER,
} from '@/lib/gameLogic/streaks';
import { resolveActiveTitle } from '@/lib/gameLogic/reputation';
import { useWelcomeBackActive } from '@/hooks/useWelcomeBackBoost';
import { getItemById, RARITY_BADGE, RARITY_CARD } from '@/lib/gameLogic/items';
import { ACHIEVEMENTS } from '@/lib/gameLogic/achievements';
import { getSubclassDef } from '@/lib/gameLogic/passives';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Card } from '@/components/ui/Card';
import { CombatArena } from '@/components/combat/CombatArena';
import { ActionRollOverlay } from '@/components/combat/overlays/ActionRollOverlay';
import { DiceRollOverlay } from '@/components/combat/overlays/DiceRollOverlay';
import { SpellRollOverlay } from '@/components/combat/overlays/SpellRollOverlay';
import { BattleResultsModal } from '@/components/combat/BattleResultsModal';
import { MonsterCard, MONSTER_EMOJI } from '@/components/combat/MonsterCard';
import { AbilityReference } from '@/components/combat/AbilityReference';
import { HpBar } from '@/components/combat/HpBar';
import { LastActionSummary } from '@/components/combat/LastActionSummary';
import { BattleLogEntry } from '@/components/combat/BattleLogEntry';
import { CombatActionBar } from '@/components/combat/CombatActionBar';
import { useCombatEncounter } from '@/hooks/useCombatEncounter';
import { fireConfetti } from '@/lib/confetti';
import { playSound } from '@/hooks/useSound';
import { useTodayKey } from '@/hooks/useTodayKey';
import { toast, toastReward, toastLoot } from '@/components/ui/Toaster';
import { claimCombatVictoryCF } from '@/lib/functions';
import { fetchRecentCombatLogs } from '@/lib/combatData';
import { COMBAT, CLASS_DEFINITIONS } from '@/lib/gameLogic/constants';
import { useCombatStore } from '@/store/combatStore';
import type { Character, MonsterDef } from '@/types';
import type { PendingRewards } from '@/components/combat/types';

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Thin wrapper that handles the loading-state null guard before mounting the
 * body. `useCombatEncounter` reads `character.currentHp` in its initializer,
 * which would crash during static prerender or before the auth state resolves
 * — keeping the hook inside `CombatPageBody` (mounted only when character is
 * non-null) avoids that.
 */
export default function CombatPage() {
  const { character } = useCharacter();
  if (!character) return null;
  return <CombatPageBody character={character} />;
}

function CombatPageBody({ character }: { character: Character }) {
  const router = useRouter();

  const todayKey = useTodayKey();
  const dailyMonsters = useMemo(() => getDailyPick(MONSTER_CATALOG, 4, todayKey), [todayKey]);

  const awardXpAndStats = useCharacterStore((s) => s.awardXpAndStats);
  const awardGold = useCharacterStore((s) => s.awardGold);
  const setHpLocal = useCharacterStore((s) => s.setHpLocal);
  const updateCurrentHp = useCharacterStore((s) => s.updateCurrentHp);
  const setStaminaLocal = useCharacterStore((s) => s.setStaminaLocal);
  const updateCurrentStamina = useCharacterStore((s) => s.updateCurrentStamina);
  const setMagicLocal = useCharacterStore((s) => s.setMagicLocal);
  const updateCurrentMagic = useCharacterStore((s) => s.updateCurrentMagic);
  const resetCharacter = useCharacterStore((s) => s.resetCharacter);
  const updateMonsterPity = useCharacterStore((s) => s.updateMonsterPity);
  const inventoryItems = useInventoryStore((s) => s.items);
  const fetchInventory = useInventoryStore((s) => s.fetchInventory);
  const awardLoot = useInventoryStore((s) => s.awardLoot);
  const consumeItem = useInventoryStore((s) => s.useConsumable);
  const replenishSpellCharges = useInventoryStore((s) => s.replenishSpellCharges);

  const [combatTab, setCombatTab] = useState<CombatTab>('arena');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'dungeons') setCombatTab('dungeons');
  }, []);

  function handleCombatTabChange(tab: CombatTab) {
    setCombatTab(tab);
    window.history.replaceState({}, '', tab === 'arena' ? '/combat' : '/combat?tab=dungeons');
  }
  const [activeMonster, setActiveMonster] = useState<MonsterDef | null>(null);
  const [pendingRewards, setPendingRewards] = useState<PendingRewards | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [winsToday, setWinsToday] = useState<number>(0);
  const [showItemPanel, setShowItemPanel] = useState(false);
  const [showAbilityGuide, setShowAbilityGuide] = useState(false);
  const [showSpellPanel, setShowSpellPanel] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!character?.uid) return;
    const startOfDay = Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
    );
    fetchRecentCombatLogs(character.uid, 50).then((logs) => {
      if (cancelled) return;
      setWinsToday(logs.filter((l) => l.loggedAt >= startOfDay).length);
    });
    return () => {
      cancelled = true;
    };
  }, [character?.uid]);

  // Lock nav and guard page unload while a fight is in progress
  useEffect(() => {
    const active = activeMonster !== null && !pendingRewards;
    useCombatStore.getState().setCombatActive(active);
    if (!active) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [activeMonster, pendingRewards]);

  // Ensure the flag is cleared if the component unmounts mid-fight
  useEffect(() => {
    return () => useCombatStore.getState().setCombatActive(false);
  }, []);

  // Fire confetti when a victory modal appears
  useEffect(() => {
    if (!pendingRewards) return;
    const rarities = pendingRewards.droppedItems
      .map((id) => getItemById(id)?.rarity)
      .filter((r): r is NonNullable<typeof r> => !!r);
    const hasLegendary = rarities.includes('legendary');
    const hasEpic = rarities.includes('epic');
    fireConfetti(hasLegendary ? 'legendary' : hasEpic ? 'celebration' : 'subtle');
    playSound(hasLegendary ? 'legendary' : 'victory');
  }, [pendingRewards]);

  useEffect(() => {
    if (character?.uid) fetchInventory(character.uid);
  }, [character?.uid, fetchInventory]);

  const maxHp = useMemo(() => (character ? playerMaxHp(character) : 0), [character]);
  const maxStamina = useMemo(() => (character ? playerMaxStamina(character) : 0), [character]);
  const maxMagic = useMemo(() => (character ? playerMaxMagic(character) : 0), [character]);
  const consumables = useMemo(
    () =>
      character
        ? inventoryItems.filter((i) => {
            const def = getItemById(i.itemDefId);
            return def?.type === 'consumable' && i.equipped;
          })
        : [],
    [character, inventoryItems],
  );
  const equippedSpells = useMemo(
    () =>
      character
        ? inventoryItems
            .filter((i) => i.equipped)
            .map((i) => ({ invItem: i, def: getItemById(i.itemDefId) }))
            .filter((x) => x.def?.type === 'spell' && x.def.spellMechanics !== undefined)
        : [],
    [character, inventoryItems],
  );

  // Welcome-back session boost — active iff the player was absent ≥ 14 days
  // and has no active streak tier. While active, loot + XP get a flat bump that
  // overrides the normal streak multipliers (which are 1.0× at currentStreak = 0).
  const welcomeBackActive = useWelcomeBackActive();

  // Streak-based loot multiplier — applied to rare+ item drop chances on win.
  // Welcome-back boost takes precedence at currentStreak = 0 (the only state in
  // which it can be active, by design).
  const baseStreakLoot = getStreakLootMultiplier(character?.streakData?.currentStreak ?? 0);
  const streakMultiplier = welcomeBackActive
    ? Math.max(baseStreakLoot, WELCOME_BACK_LOOT_MULTIPLIER)
    : baseStreakLoot;

  /** Pity counter for the active monster — drives the legendary soft-boost in rollLoot. */
  function getPityFor(monsterId: string): number {
    return character?.legendaryDryStreak?.[monsterId] ?? 0;
  }

  /** Captures streak + level-scaling multipliers at call-time. */
  function getStreakBoost(): { multiplier: number; boost: (monster: MonsterDef) => number } {
    const streak = character?.streakData?.currentStreak ?? 0;
    const baseXp = getStreakXpMultiplier(streak);
    const multiplier = welcomeBackActive ? Math.max(baseXp, WELCOME_BACK_XP_MULTIPLIER) : baseXp;
    const playerLevel = character?.level ?? 1;
    return {
      multiplier,
      boost: (monster) =>
        Math.round(monster.xpReward * multiplier * monsterXpScaling(playerLevel, monster.level)),
    };
  }

  // ─── Encounter hook — only mounted when a monster is active ────────────────
  const encounter = useCombatEncounter({
    monster: activeMonster ?? dailyMonsters[0],
    character,
    maxHp,
    maxStamina,
    maxMagic,
    streakMultiplier,
    getPityFor,
    consumeItem,
    onResourceChange: ({ hp, stamina, magic }) => {
      setHpLocal(hp);
      setStaminaLocal(stamina);
      setMagicLocal(magic);
    },
    onVictory: async ({ finalHp, finalStamina, finalMagic, monster, droppedItems, flawless }) => {
      await updateCurrentHp(finalHp);
      await updateCurrentStamina(finalStamina);
      await updateCurrentMagic(finalMagic);
      // Replenish spell charges — arena fights always reset charges between encounters
      await replenishSpellCharges();
      const { multiplier: streakMult, boost: streakBoost } = getStreakBoost();
      setPendingRewards({
        xpReward: streakBoost(monster),
        streakMultiplier: streakMult,
        goldReward: monster.goldReward,
        droppedItems,
        monster,
        uid: character.uid,
        flawless,
      });
    },
    onDefeat: async ({ finalHp, finalStamina, finalMagic }) => {
      await updateCurrentHp(finalHp);
      await updateCurrentStamina(finalStamina);
      await updateCurrentMagic(finalMagic);
      await replenishSpellCharges();
    },
    onFlee: async ({ finalHp, finalStamina, finalMagic }) => {
      await updateCurrentHp(finalHp);
      await updateCurrentStamina(finalStamina);
      await updateCurrentMagic(finalMagic);
      await replenishSpellCharges();
    },
  });

  // Defeat sting
  const fightOutcome = encounter.fightState.outcome ?? null;
  useEffect(() => {
    if (fightOutcome === 'loss') playSound('fail');
  }, [fightOutcome]);

  function enterFight(monster: MonsterDef) {
    setActiveMonster(monster);
    setShowItemPanel(false);
    setShowSpellPanel(false);
  }

  function backToArena() {
    setActiveMonster(null);
  }

  async function handleClaimRewards() {
    if (!pendingRewards) return;
    playSound('claim');
    setClaiming(true);

    const { xpReward, goldReward, droppedItems, monster: defeated, uid, flawless } = pendingRewards;
    const gotLegendary = droppedItems.some((id) => {
      const def = getItemById(id);
      return def?.rarity === 'legendary';
    });

    let claim: Awaited<ReturnType<typeof claimCombatVictoryCF>>;
    try {
      claim = await claimCombatVictoryCF({
        xpReward,
        goldReward,
        monsterId: defeated.id,
        monsterName: defeated.name,
        idempotencyKey: crypto.randomUUID(),
        flawless,
      });
    } catch {
      toast.error("Couldn't reach the server — tap Claim Rewards again", {
        description: 'Nothing was awarded yet. Your rewards are waiting.',
      });
      setClaiming(false);
      return;
    }

    const { finalXp, multiplier, winsTodayAfter, newAchievements, achievementGold } = claim;
    setWinsToday(winsTodayAfter);
    setPendingRewards(null);

    let lootSyncFailed = false;

    try {
      try {
        await awardXpAndStats(finalXp, {});
        await awardGold(goldReward);
      } catch (err) {
        console.error('[handleClaimRewards] local stat sync failed:', err);
      }

      try {
        await awardLoot(uid, droppedItems);
      } catch (err) {
        console.error('[handleClaimRewards] loot sync failed:', err);
        lootSyncFailed = true;
      }

      try {
        await updateMonsterPity(defeated.id, gotLegendary);
      } catch (err) {
        console.error('[handleClaimRewards] pity update failed:', err);
      }

      toastReward({
        emoji: '⚔️',
        title: `Defeated ${defeated.name}!`,
        xp: finalXp,
        gold: goldReward + achievementGold,
      });

      if (newAchievements.length > 0) {
        for (const id of newAchievements) {
          const def = ACHIEVEMENTS[id as keyof typeof ACHIEVEMENTS];
          if (def) {
            toast.success(`Achievement unlocked: ${def.name}`, {
              description: `${def.emoji} +${def.goldReward}g — ${def.description}`,
              duration: 7000,
            });
          }
        }
      }

      if (lootSyncFailed) {
        toast.warning('Inventory sync failed — refresh inventory to see your drop', {
          description: 'Your XP and gold were awarded.',
          duration: 8000,
        });
      }

      if (multiplier < 1.0) {
        toast.warning(
          `Daily combat XP at ${Math.round(multiplier * 100)}% — win #${winsTodayAfter} today`,
          {
            description: 'Take a break or log activities to keep XP gains meaningful.',
            duration: 6000,
          },
        );
      }

      if (!lootSyncFailed) {
        for (const itemId of droppedItems) {
          const def = getItemById(itemId);
          if (def && (def.rarity === 'epic' || def.rarity === 'legendary')) {
            toastLoot(def.name, def.rarity);
          }
        }
      }
    } finally {
      setClaiming(false);
    }
  }

  async function handleBeginAgain() {
    setResetting(true);
    try {
      await resetCharacter();
      router.push('/dashboard');
    } catch {
      setResetting(false);
    }
  }

  // ── Fighting view ──────────────────────────────────────────────────────────
  if (activeMonster) {
    const {
      fightState,
      pending,
      bursts,
      expireBurst,
      usingItem,
      rollingAction,
      actions,
      spellChargesUsed,
    } = encounter;
    const { monster, playerHp, playerStamina, playerMagic, monsterHp, log, outcome, droppedItems } =
      fightState;
    const emoji = MONSTER_EMOJI[monster.id] ?? '👾';
    const fightOver = outcome !== null;
    const playerDefStat = (character.stats.defense ?? 0) + gearDefenseBonus(character);
    const lastEntry = log[log.length - 1] ?? null;

    return (
      <div className="space-y-4">
        {/* Outcome banner */}
        {outcome === 'win' && (
          <div className="rounded-xl p-6 text-center bg-gradient-to-br from-indigo-100 dark:from-indigo-950/60 via-violet-50 dark:via-violet-950/40 to-amber-50 dark:to-amber-950/30 border border-indigo-200 dark:border-indigo-800 shadow-lg shadow-indigo-500/10">
            <p className="text-5xl mb-2 drop-shadow-md">⚔️</p>
            <p className="font-display text-4xl font-bold text-indigo-700 dark:text-indigo-300 tracking-wider uppercase drop-shadow-sm">
              Victory!
            </p>
            <p className="text-sm text-violet-600 dark:text-violet-300 font-semibold italic mt-1">
              {character.name}, “
              {resolveActiveTitle(character.lifetimeReputation ?? 0, character.activeTitle)}”
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              vs. {emoji} {monster.name}
            </p>
          </div>
        )}
        {outcome === 'loss' && (
          <div className="rounded-xl p-6 text-center bg-gradient-to-br from-red-100 dark:from-red-950/60 via-red-50 dark:via-red-950/30 to-gray-100 dark:to-slate-900 border border-red-300 dark:border-red-900 shadow-lg shadow-red-500/20">
            <p className="text-5xl mb-2 grayscale-[30%]">💀</p>
            <p className="font-display text-4xl font-bold text-red-700 dark:text-red-400 tracking-wider uppercase">
              You Have Fallen
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
              Defeated by {emoji} {monster.name}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-2">
              Your level and stats have been reset.
            </p>
          </div>
        )}
        {outcome === 'fled' && (
          <div className="rounded-xl p-5 text-center bg-gradient-to-br from-amber-50 dark:from-amber-950/40 to-yellow-50 dark:to-amber-950/20 border border-amber-200 dark:border-amber-900">
            <p className="text-4xl mb-1">🏃</p>
            <p className="font-display text-3xl font-bold text-amber-700 dark:text-amber-400 tracking-wide uppercase">
              Escaped!
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              You fled from {emoji} {monster.name} with {playerHp} HP remaining.
            </p>
          </div>
        )}

        {/* Rewards summary shown after modal is claimed */}
        {outcome === 'win' && !pendingRewards && (
          <Card variant="default" padding="md">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 mb-3 uppercase tracking-wider">
              Rewards Claimed
            </p>
            <div className="flex gap-3">
              <div className="flex-1 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg p-3 text-center">
                <AnimatedNumber
                  value={monster.xpReward}
                  prefix="+"
                  className="text-2xl font-bold text-indigo-600 dark:text-indigo-400"
                />
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">XP</p>
              </div>
              <div className="flex-1 bg-amber-50 dark:bg-amber-950/40 rounded-lg p-3 text-center">
                <AnimatedNumber
                  value={monster.goldReward}
                  prefix="+"
                  className="text-2xl font-bold text-amber-500"
                />
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Gold</p>
              </div>
            </div>
            {droppedItems.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                  Loot Added to Inventory
                </p>
                {droppedItems.map((itemId, idx) => {
                  const def = getItemById(itemId);
                  if (!def) return null;
                  const card = RARITY_CARD[def.rarity];
                  return (
                    <motion.div
                      key={`${itemId}-${idx}`}
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: idx * 0.18, duration: 0.4, ease: 'easeOut' }}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 border-2 ${card.border} ${card.glow ? `shadow-md ${card.glow}` : 'bg-gray-50 dark:bg-slate-900'}`}
                    >
                      <span className="text-xs font-semibold text-gray-800 dark:text-slate-100">
                        📦 {def.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${RARITY_BADGE[def.rarity]}`}
                      >
                        {def.rarity}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* ── Arena: side-by-side player + monster portraits with HP bars ── */}
        {(() => {
          const playerEmoji = CLASS_DEFINITIONS[character.class].emoji;
          const pity = getPityFor(monster.id);
          const pityActive = pity >= 10;
          const pityBoost = pityActive ? Math.min(Math.round((pity - 10) * 0.02 * 100), 85) : 0;
          const monsterSub =
            pity > 0 ? (
              <span className={pityActive ? 'text-orange-600 dark:text-orange-400' : ''}>
                {pityActive ? '🔥' : '🎯'} {pity} kill{pity !== 1 ? 's' : ''}
                {pityActive && ` · +${pityBoost}% legendary`}
              </span>
            ) : null;
          return (
            <CombatArena
              shakeKey={`${log.length}-${lastEntry?.playerDamage ?? 0}-${lastEntry?.monsterDamage ?? 0}`}
              bursts={bursts}
              onBurstExpired={expireBurst}
              player={{
                name: character.name,
                classId: character.class,
                emoji: playerEmoji,
                hp: playerHp,
                maxHp,
                defense: playerDefStat,
              }}
              monster={{
                name: monster.name,
                id: monster.id,
                emoji,
                hp: monsterHp,
                maxHp: monster.hp,
                defense: monster.defense,
                passive: monster.passive,
                activeLabel:
                  fightState.activeUsed && monster.active ? monster.active.label : undefined,
              }}
              monsterSub={monsterSub}
            />
          );
        })()}

        {/* Player-only resources — Stamina + Magic */}
        <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-3">
          <HpBar label="⚡ Stamina" current={playerStamina} max={maxStamina} color="bg-amber-400" />
          <HpBar
            label="✨ Magic"
            current={playerMagic}
            max={maxMagic}
            color="bg-violet-400"
            sub={
              equippedSpells.length === 0
                ? 'No spells equipped — visit Inventory'
                : `${equippedSpells.length} spell${equippedSpells.length !== 1 ? 's' : ''} ready`
            }
          />
        </div>

        {/* Last roll summary */}
        {lastEntry && (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
              Last Action — Round {lastEntry.round}
            </p>
            <LastActionSummary entry={lastEntry} monster={monster} />
          </div>
        )}

        {/* Battle log */}
        {log.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 mb-3 uppercase tracking-wider">
              Battle Log · {log.length} {log.length === 1 ? 'round' : 'rounds'}
            </p>
            <ul className="space-y-3 max-h-52 overflow-y-auto pr-1">
              {[...log].reverse().map((entry) => (
                <BattleLogEntry key={entry.round} entry={entry} monster={monster} emoji={emoji} />
              ))}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        {!fightOver ? (
          <CombatActionBar
            character={character}
            fightState={fightState}
            maxStamina={maxStamina}
            maxMagic={maxMagic}
            equippedSpells={equippedSpells}
            consumables={consumables}
            rollingAction={rollingAction}
            usingItem={usingItem}
            showSpellPanel={showSpellPanel}
            showItemPanel={showItemPanel}
            setShowSpellPanel={setShowSpellPanel}
            setShowItemPanel={setShowItemPanel}
            onAttack={actions.attack}
            onMagic={actions.magic}
            onAbility={actions.rollAbility}
            onCastSpell={actions.castSpell}
            onRest={actions.rest}
            onMeditate={actions.meditate}
            onUseItem={actions.useItem}
            onFlee={actions.flee}
            spellChargesUsed={spellChargesUsed}
          />
        ) : outcome === 'loss' ? (
          <button
            onClick={handleBeginAgain}
            disabled={resetting}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {resetting ? 'Resetting…' : 'Begin Again'}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              onClick={backToArena}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 sm:py-2.5 rounded-lg transition-colors"
            >
              {outcome === 'fled' ? 'Back to Arena' : 'Fight Again'}
            </button>
            <Link
              href="/dashboard"
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-indigo-300 text-gray-700 dark:text-slate-200 font-semibold py-3 sm:py-2.5 rounded-lg transition-colors text-center"
            >
              Dashboard
            </Link>
          </div>
        )}

        {/* Battle results modal */}
        {pendingRewards && (
          <BattleResultsModal
            pending={pendingRewards}
            onClaim={handleClaimRewards}
            claiming={claiming}
          />
        )}

        {/* Overlays */}
        {pending.action && (
          <ActionRollOverlay
            pending={pending.action}
            monster={monster}
            playerDefStat={playerDefStat}
          />
        )}
        {pending.ability && (
          <DiceRollOverlay
            dice={pending.ability.dice}
            pattern={pending.ability.pattern}
            ability={pending.ability.ability}
            formulaBreakdown={pending.ability.formulaBreakdown}
            onDismiss={pending.ability.applyResult}
          />
        )}
        {pending.spell && (
          <SpellRollOverlay
            spellDef={pending.spell.spellDef}
            dice={pending.spell.dice}
            requirementMet={pending.spell.requirementMet}
            monsterRoll={pending.spell.monsterRoll}
            monsterStunned={pending.spell.monsterStunned}
            monsterDamage={pending.spell.monsterDamage}
            onDismiss={pending.spell.applyResult}
          />
        )}

        {/* Collapsible ability guide */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowAbilityGuide((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 dark:bg-slate-900 transition-colors"
          >
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              🎲 Ability Guide
            </p>
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {showAbilityGuide ? '▲ hide' : '▼ show'}
            </span>
          </button>
          {showAbilityGuide && (
            <div className="px-4 pb-4">
              <AbilityReference characterClass={character.class} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Monster select view ────────────────────────────────────────────────────
  const currentHp = character.currentHp ?? maxHp;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
            Combat Arena
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Current HP:{' '}
            <span
              className={`font-semibold ${currentHp < maxHp * 0.4 ? 'text-red-500' : 'text-gray-700 dark:text-slate-200'}`}
            >
              {currentHp}/{maxHp}
            </span>
            {currentHp < maxHp && (
              <span className="text-gray-400 dark:text-slate-500">
                {' '}
                — log sleep or water to recover
              </span>
            )}
          </p>
        </div>
        <div className="text-right shrink-0 space-y-2">
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
              Today&apos;s Encounters
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Resets in {formatCountdown(rotationExpiresAt())} (UTC)
            </p>
          </div>
          {(() => {
            const mult = combatXpDailyMultiplier(winsToday);
            const next = combatWinsUntilNextPenalty(winsToday);
            const tint =
              mult >= 1.0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-200'
                : mult >= 0.5
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-200';
            return (
              <div
                className={`inline-flex flex-col items-end gap-0.5 rounded-lg border px-2.5 py-1.5 text-[11px] ${tint}`}
                title="Daily combat XP cap — diminishing returns past 5 wins/day"
              >
                <span className="font-semibold">
                  XP gain: <span className="tabular-nums">×{mult.toFixed(2)}</span>
                  <span className="ml-1.5 opacity-70 tabular-nums">
                    ({winsToday} win{winsToday !== 1 ? 's' : ''} today)
                  </span>
                </span>
                {next ? (
                  <span className="opacity-80">
                    <span className="tabular-nums">{next.remaining}</span> until ×
                    {next.nextMultiplier.toFixed(2)}
                  </span>
                ) : (
                  <span className="opacity-80">Daily floor reached</span>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      <CombatModeTab active={combatTab} onChange={handleCombatTabChange} />

      {combatTab === 'dungeons' ? (
        <DungeonLobbyInline />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dailyMonsters.map((monster) => (
              <MonsterCard
                key={monster.id}
                monster={monster}
                playerLevel={character.level}
                dryStreak={getPityFor(monster.id)}
                onFight={enterFight}
              />
            ))}
          </div>

          {/* Ability reference card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                🎲 Ability Guide · <span className="capitalize">{character.class}</span>
              </p>
              {character.subclass &&
                (() => {
                  const sd = getSubclassDef(character.subclass);
                  return sd ? (
                    <span className="text-xs font-semibold text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 rounded-full px-2.5 py-0.5">
                      {sd.emoji} {sd.name}
                    </span>
                  ) : null;
                })()}
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">
              Roll 6d6 and spend {COMBAT.ABILITY_STAMINA_COST} stamina. Hit one of these patterns to
              unleash your class ability.
              {character.subclass && ' Subclass passives apply automatically.'}
            </p>
            <AbilityReference characterClass={character.class} />
          </div>
        </>
      )}
    </div>
  );
}

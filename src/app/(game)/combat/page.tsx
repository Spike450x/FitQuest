'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
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
  calculateRound,
  rollRunAway,
  gearAttackBonus,
  gearDefenseBonus,
  LEGENDARY_PITY_THRESHOLD,
  resolveRoundOutcome,
  monsterXpScaling,
  combatXpDailyMultiplier,
  combatWinsUntilNextPenalty,
} from '@/lib/gameLogic/combat';
import { getStreakLootMultiplier, getStreakXpMultiplier } from '@/lib/gameLogic/streaks';
import { getItemById, RARITY_BADGE, RARITY_CARD } from '@/lib/gameLogic/items';
import { resolveAbility, getAbility } from '@/lib/gameLogic/abilities';
import {
  resolveSpell,
  describeRequirement,
  getHighlightedSpellDiceIndices,
} from '@/lib/gameLogic/spells';
import {
  getSubclassDef,
  applyOutgoingPassives,
  resolveLifesteal,
  getAbilityStaminaCost,
  getMomentumRestore,
  checkExecute,
  getEffectiveSpellCost,
  canBloodPact,
} from '@/lib/gameLogic/passives';
import { SpellCard } from '@/components/ui/SpellCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Card } from '@/components/ui/Card';
import { CombatEffects } from '@/components/combat/CombatEffects';
import { CombatArena } from '@/components/combat/CombatArena';
import { EntityArt } from '@/components/art/EntityArt';
import { rarityTint } from '@/lib/entityArt';
import { fireConfetti } from '@/lib/confetti';
import { playSound } from '@/hooks/useSound';
import { useCombatBursts } from '@/hooks/useCombatBursts';
import { useTodayKey } from '@/hooks/useTodayKey';
import { toast, toastReward, toastLoot } from '@/components/ui/Toaster';
import { claimCombatVictoryCF } from '@/lib/functions';
import { fetchRecentCombatLogs } from '@/lib/combatData';
import { COMBAT, CLASS_DEFINITIONS } from '@/lib/gameLogic/constants';
import type { MonsterDef, ItemDef, SpellDiceRequirement } from '@/types';
import type { DicePattern, AbilityDef } from '@/lib/gameLogic/abilities';

// ─── Types ────────────────────────────────────────────────────────────────────

type RoundAction = 'attack' | 'magic' | 'run_failed' | 'ability' | 'spell' | 'rest' | 'meditate';

interface RoundEntry {
  round: number;
  action: RoundAction;
  playerHpAfter: number;
  monsterHpAfter: number;
  // attack / magic
  roll?: number;
  attackBonus?: number;
  attackBonusLabel?: 'STR' | 'WIS';
  playerDamage?: number;
  monsterDamage?: number;
  playerDefFailed?: boolean;
  monsterDefFailed?: boolean;
  // run away (failed)
  playerRunRoll?: number;
  agilityBonus?: number;
  monsterRunRoll?: number;
  // ability roll
  abilityName?: string;
  abilityEmoji?: string;
  abilityPattern?: DicePattern | null;
  abilityFizzled?: boolean;
  abilityDice?: number[];
  healAmount?: number;
  monsterStunned?: boolean;
  staminaCost?: number;
  // spell cast
  spellName?: string;
  spellDice?: number[];
  spellRequirementMet?: boolean;
  spellMagicCost?: number;
  spellDiceReq?: SpellDiceRequirement;
  spellStaminaRestored?: number;
  defenseBoost?: number;
  // rest / meditate
  recoveryRoll?: number;
  recoveredStamina?: number;
  recoveredMagic?: number;
  // passive events
  eagleEyeCrit?: boolean;
  divineAegisBlocked?: boolean;
  soulDrainHeal?: number;
  hemorrhageDrain?: number;
  executeTriggered?: boolean;
  momentumRestore?: number;
  manaBarrierAbsorbed?: number;
  perRoundHpRestore?: number;
  perRoundMagicRestore?: number;
  bloodPactUsed?: boolean;
  flatPassiveHeal?: number;
}

interface FightState {
  monster: MonsterDef;
  playerHp: number;
  playerStartHp: number;
  playerStamina: number;
  playerMagic: number;
  monsterHp: number;
  log: RoundEntry[];
  outcome: 'win' | 'loss' | 'fled' | null;
  droppedItems: string[];
  /** True until the first class ability roll is confirmed this fight. */
  isFirstAbility: boolean;
  /** True once Execute (Assassin) has fired once this fight. */
  executeUsed: boolean;
}

interface PendingSpell {
  spellDef: ItemDef;
  dice: number[];
  requirementMet: boolean;
  applyResult: () => Promise<void>;
}

interface PendingAction {
  actionType: 'attack' | 'magic' | 'run' | 'rest' | 'meditate';
  dice: number[]; // [roll] for attack/magic/rest/meditate · [playerRoll, monsterRoll] for run
  monsterRoll?: number; // monster's d10 roll for counter-attack animation
  attackBonus?: number;
  attackBonusLabel?: 'STR' | 'WIS';
  playerDamage?: number;
  monsterDamage?: number;
  playerDefFailed?: boolean;
  monsterDefFailed?: boolean;
  escaped?: boolean; // run only
  recoveredStamina?: number; // rest only
  recoveredMagic?: number; // meditate only
  outcome?: 'win' | 'loss' | null;
  applyResult: () => Promise<void>;
}

interface PendingAbility {
  dice: number[];
  pattern: DicePattern | null;
  ability: AbilityDef | null;
  applyResult: () => Promise<void>;
}

interface PendingRewards {
  xpReward: number;
  /** Streak multiplier applied to xpReward at kill-time (1.0 = no boost). */
  streakMultiplier: number;
  goldReward: number;
  droppedItems: string[];
  monster: MonsterDef;
  uid: string;
}

// ─── Display config ───────────────────────────────────────────────────────────

const MONSTER_EMOJI: Record<string, string> = {
  'goblin-scout': '👺',
  'giant-rat': '🐀',
  'forest-goblin': '👹',
  'orc-grunt': '👊',
  'cave-spider': '🕷️',
  'skeleton-warrior': '💀',
  'dark-wolf': '🐺',
  'stone-troll': '🗿',
  'dark-mage': '🧙',
  'lich-king': '☠️',
  'ancient-dragon': '🐉',
};

// 4 monsters rotate daily — same lineup for all players on the same day.

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CombatPage() {
  const router = useRouter();
  const { character } = useCharacter();

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

  const [combatTab, setCombatTab] = useState<CombatTab>('arena');

  // Persist tab in URL so back-navigation restores the correct tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'dungeons') setCombatTab('dungeons');
  }, []);

  function handleCombatTabChange(tab: CombatTab) {
    setCombatTab(tab);
    window.history.replaceState({}, '', tab === 'arena' ? '/combat' : '/combat?tab=dungeons');
  }
  const [phase, setPhase] = useState<'select' | 'fighting'>('select');
  const [fightState, setFightState] = useState<FightState | null>(null);
  const [rollingAction, setRollingAction] = useState<
    'attack' | 'magic' | 'run' | 'ability' | 'rest' | 'meditate' | null
  >(null);
  const [pendingRewards, setPendingRewards] = useState<PendingRewards | null>(null);

  // Fire confetti when a victory modal appears. Intensity escalates with the
  // best dropped rarity so legendary kills feel meaningfully different.
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
  const [claiming, setClaiming] = useState(false);
  const [resetting, setResetting] = useState(false);
  // Today's combat win count — drives the diminishing-returns badge. Loaded
  // once on mount; incremented locally on each claim so the UI updates
  // immediately without an extra round-trip. Server is the source of truth
  // (see claimCombatVictory CF) — this is display-only.
  const [winsToday, setWinsToday] = useState<number>(0);
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
  const [showItemPanel, setShowItemPanel] = useState(false);
  const [usingItem, setUsingItem] = useState<string | null>(null);
  const [showAbilityGuide, setShowAbilityGuide] = useState(false);
  const [showSpellPanel, setShowSpellPanel] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [pendingAbility, setPendingAbility] = useState<PendingAbility | null>(null);
  const [pendingSpell, setPendingSpell] = useState<PendingSpell | null>(null);

  // Fire dice-rattle sound whenever any roll overlay opens.
  useEffect(() => {
    if (pendingAction || pendingAbility || pendingSpell) {
      playSound('diceRoll');
    }
  }, [pendingAction, pendingAbility, pendingSpell]);

  // Defeat sting — wins are sounded via the pendingRewards effect below.
  const fightOutcome = fightState?.outcome ?? null;
  useEffect(() => {
    if (fightOutcome === 'loss') playSound('fail');
  }, [fightOutcome]);

  // Combat-juice: floating damage numbers driven by the round log
  const { bursts, expire } = useCombatBursts(fightState?.log ?? []);

  // Streak-based loot multiplier — applied to rare+ item drop chances on win
  const streakMultiplier = getStreakLootMultiplier(character?.streakData?.currentStreak ?? 0);

  /** Pity counter for the active monster — drives the legendary soft-boost in rollLoot. */
  function getPityFor(monsterId: string): number {
    return character?.legendaryDryStreak?.[monsterId] ?? 0;
  }

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

  if (!character) return null;

  /** Captures the streak + level-scaling multipliers at call-time and returns both
   *  the streak multiplier (for UI display) and a boost function that takes the
   *  defeated monster and applies streak × monster-level scaling. Call once per
   *  kill so every consumer (modal, toast, award) sees the same number —
   *  snapshotting here prevents mid-victory-screen streak ticks from changing
   *  the displayed reward. */
  function getStreakBoost(): { multiplier: number; boost: (monster: MonsterDef) => number } {
    const streak = character?.streakData?.currentStreak ?? 0;
    const multiplier = getStreakXpMultiplier(streak);
    const playerLevel = character?.level ?? 1;
    return {
      multiplier,
      boost: (monster) =>
        Math.round(monster.xpReward * multiplier * monsterXpScaling(playerLevel, monster.level)),
    };
  }

  function enterFight(monster: MonsterDef) {
    const startHp = character!.currentHp ?? maxHp;
    const startStamina = character!.currentStamina ?? maxStamina;
    const startMagic = character!.currentMagic ?? maxMagic;
    setFightState({
      monster,
      playerHp: startHp,
      playerStartHp: startHp,
      playerStamina: startStamina,
      playerMagic: startMagic,
      monsterHp: monster.hp,
      log: [],
      outcome: null,
      droppedItems: [],
      isFirstAbility: true,
      executeUsed: false,
    });
    setPhase('fighting');
  }

  function handleAction(actionType: 'attack' | 'magic' | 'run') {
    if (!fightState || !character || rollingAction !== null || fightState.outcome !== null) return;

    setRollingAction(actionType);

    const snapshot = fightState;
    const uid = character.uid;

    // ── Run away ───────────────────────────────────────────────────────────────
    if (actionType === 'run') {
      const { playerRoll, agilityBonus, monsterRoll, escaped, monsterDamage, playerDefFailed } =
        rollRunAway(character, snapshot.monster);

      if (escaped) {
        setPendingAction({
          actionType: 'run',
          dice: [playerRoll, monsterRoll],
          escaped: true,
          outcome: null,
          applyResult: async () => {
            const finalHp = snapshot.playerHp;
            const finalStamina = snapshot.playerStamina;
            setHpLocal(finalHp);
            setStaminaLocal(finalStamina);
            setMagicLocal(snapshot.playerMagic);
            await updateCurrentHp(finalHp);
            await updateCurrentStamina(finalStamina);
            await updateCurrentMagic(snapshot.playerMagic);
            setFightState((prev) => prev && { ...prev, outcome: 'fled' });
            setPendingAction(null);
            setRollingAction(null);
          },
        });
        return;
      }

      const newPlayerHp = Math.max(0, snapshot.playerHp - monsterDamage);
      const runOutcome = newPlayerHp === 0 ? 'loss' : null;
      const entry: RoundEntry = {
        round: snapshot.log.length + 1,
        action: 'run_failed',
        playerRunRoll: playerRoll,
        agilityBonus,
        monsterRunRoll: monsterRoll,
        monsterDamage,
        playerDefFailed,
        playerHpAfter: newPlayerHp,
        monsterHpAfter: snapshot.monsterHp,
      };

      setPendingAction({
        actionType: 'run',
        dice: [playerRoll, monsterRoll],
        escaped: false,
        monsterDamage,
        playerDefFailed,
        outcome: runOutcome,
        applyResult: async () => {
          setFightState({
            ...snapshot,
            playerHp: newPlayerHp,
            log: [...snapshot.log, entry],
            outcome: runOutcome,
          });
          setHpLocal(newPlayerHp);
          setStaminaLocal(snapshot.playerStamina);
          if (runOutcome === 'loss') {
            await updateCurrentHp(0);
            await updateCurrentStamina(snapshot.playerStamina);
          }
          setPendingAction(null);
          setRollingAction(null);
        },
      });
      return;
    }

    // ── Attack / Magic ─────────────────────────────────────────────────────────
    const {
      roll,
      attackBonus,
      attackBonusLabel,
      playerDamage: basePlayerDamage,
      monsterDamage: baseMonsterDamage,
      monsterRoll,
      playerDefFailed,
      monsterDefFailed,
    } = calculateRound(character, snapshot.monster, actionType);

    // ── Outgoing passives (Battle-Hardened, Bloodlust, Eagle Eye) ─────────────
    const passiveCtx = {
      currentHpPct: snapshot.playerHp / maxHp,
      currentMagic: snapshot.playerMagic,
      isFirstAbility: snapshot.isFirstAbility,
      executeUsed: snapshot.executeUsed,
      roll,
    };
    const outgoing = applyOutgoingPassives(character, basePlayerDamage, passiveCtx);
    const playerDamage = outgoing.damage;

    // ── Warlock Soul Drain on attack damage ────────────────────────────────────
    const { soulDrainHeal: attackSoulDrain } = resolveLifesteal(character, 0, playerDamage);

    const newMonsterHp = Math.max(0, snapshot.monsterHp - playerDamage);

    // ── Post-damage pipeline (incoming passives, per-round passives, outcome) ──
    const healedHp = Math.min(snapshot.playerHp + attackSoulDrain, maxHp);
    const roundResult = resolveRoundOutcome({
      newMonsterHp,
      preIncomingPlayerHp: healedHp,
      playerMagicBeforeBarrier: snapshot.playerMagic,
      rawMonsterDamage: baseMonsterDamage,
      passiveCtx,
      snapshot,
      character,
      maxHp,
      maxMagic,
      streakMultiplier,
      getPityFor,
    });
    const { incoming, perRound, finalPlayerHp, finalPlayerMagic, outcome, droppedItems } =
      roundResult;
    const actualMonsterDamage = incoming.damage;

    const entry: RoundEntry = {
      round: snapshot.log.length + 1,
      action: actionType,
      roll,
      attackBonus,
      attackBonusLabel,
      playerDamage,
      monsterDamage: actualMonsterDamage,
      playerDefFailed,
      monsterDefFailed,
      playerHpAfter: finalPlayerHp,
      monsterHpAfter: newMonsterHp,
      eagleEyeCrit: outgoing.eagleEyeCrit,
      divineAegisBlocked: incoming.divineAegisBlocked,
      manaBarrierAbsorbed: incoming.magicDrained > 0 ? incoming.magicDrained : undefined,
      soulDrainHeal: attackSoulDrain > 0 ? attackSoulDrain : undefined,
      perRoundHpRestore:
        perRound.hpRestore > 0 && outcome === null ? perRound.hpRestore : undefined,
      perRoundMagicRestore:
        perRound.magicRestore > 0 && outcome === null ? perRound.magicRestore : undefined,
    };

    setPendingAction({
      actionType,
      dice: [roll],
      monsterRoll,
      attackBonus,
      attackBonusLabel,
      playerDamage,
      monsterDamage: actualMonsterDamage,
      playerDefFailed,
      monsterDefFailed,
      outcome,
      applyResult: async () => {
        setFightState({
          ...snapshot,
          playerHp: finalPlayerHp,
          monsterHp: newMonsterHp,
          playerMagic: finalPlayerMagic,
          log: [...snapshot.log, entry],
          outcome,
          droppedItems,
        });
        setHpLocal(finalPlayerHp);
        setStaminaLocal(snapshot.playerStamina);
        setMagicLocal(finalPlayerMagic);
        if (outcome !== null) {
          await updateCurrentHp(finalPlayerHp);
          await updateCurrentStamina(snapshot.playerStamina);
          await updateCurrentMagic(finalPlayerMagic);
          if (outcome === 'win') {
            const { multiplier: streakMult, boost: streakBoost } = getStreakBoost();
            setPendingRewards({
              xpReward: streakBoost(snapshot.monster),
              streakMultiplier: streakMult,
              goldReward: snapshot.monster.goldReward,
              droppedItems,
              monster: snapshot.monster,
              uid,
            });
          }
        }
        setPendingAction(null);
        setRollingAction(null);
      },
    });
  }

  function handleAbility() {
    if (!fightState || !character || rollingAction !== null || fightState.outcome !== null) return;

    // ── Actual stamina cost (Rogue Opening Strike: 0; Berserker Frenzy: halved) ─
    const actualStaminaCost = getAbilityStaminaCost(
      character,
      COMBAT.ABILITY_STAMINA_COST,
      fightState.isFirstAbility,
    );
    if (fightState.playerStamina < actualStaminaCost) return;

    // Lock other actions immediately — overlay handles the rest
    setRollingAction('ability');

    // Resolve dice + base damage (subclass mods + Lethal Opener applied inside)
    const resolution = resolveAbility(character, fightState.monster, fightState.isFirstAbility);
    const fizzled = resolution.ability === null;

    // ── Outgoing passives (Battle-Hardened, Bloodlust; Eagle Eye skipped for abilities) ─
    const abilityCtx = {
      currentHpPct: fightState.playerHp / maxHp,
      currentMagic: fightState.playerMagic,
      isFirstAbility: fightState.isFirstAbility,
      executeUsed: fightState.executeUsed,
      roll: undefined as number | undefined, // Eagle Eye only on d10 attacks
    };
    const outgoing = applyOutgoingPassives(character, resolution.playerDamage, abilityCtx);
    const effectivePlayerDamage = outgoing.damage;

    // ── Lifesteal: Hemorrhage + Soul Drain ────────────────────────────────────
    const { totalPct, hemorrhageDrain, soulDrainHeal } = resolveLifesteal(
      character,
      resolution.ability?.lifestealPct ?? 0,
      effectivePlayerDamage,
    );
    const lifestealHeal = Math.round(effectivePlayerDamage * totalPct);
    const totalHeal = lifestealHeal + soulDrainHeal + resolution.flatPassiveHeal;

    // ── Execute (Assassin) — instant kill when monster drops to ≤15% HP ──────
    const monsterHpBefore = fightState.monsterHp;
    let newMonsterHp = Math.max(0, monsterHpBefore - effectivePlayerDamage - hemorrhageDrain);
    const executeTriggered = checkExecute(
      character,
      monsterHpBefore,
      newMonsterHp,
      fightState.monster.hp,
      fightState.executeUsed,
    );
    if (executeTriggered) newMonsterHp = 0;

    const killedMonster = newMonsterHp === 0;

    // ── Post-damage pipeline (incoming passives, per-round passives, outcome) ──
    const healedHp = Math.min(fightState.playerHp + totalHeal, maxHp);
    const roundResult = resolveRoundOutcome({
      newMonsterHp,
      preIncomingPlayerHp: healedHp,
      playerMagicBeforeBarrier: fightState.playerMagic,
      rawMonsterDamage: resolution.monsterDamage,
      passiveCtx: abilityCtx,
      snapshot: fightState,
      character,
      maxHp,
      maxMagic,
      streakMultiplier,
      getPityFor,
    });
    const { incoming, perRound, finalPlayerHp, finalPlayerMagic, outcome, droppedItems } =
      roundResult;
    const actualMonsterDamage = incoming.damage;

    // ── Warrior Momentum — restore stamina on ability kill ────────────────────
    const momentumRestore = getMomentumRestore(character, killedMonster);
    // ── Fizzle refund — half-cost back when the dice yield no pattern ─────────
    const fizzleRefund = fizzled ? COMBAT.FIZZLE_STAMINA_REFUND : 0;
    const newStamina = Math.min(
      Math.max(0, fightState.playerStamina - actualStaminaCost + fizzleRefund) + momentumRestore,
      maxStamina,
    );

    const snapshot = fightState;
    const uid = character.uid;

    const entry: RoundEntry = {
      round: fightState.log.length + 1,
      action: 'ability',
      playerDamage: effectivePlayerDamage,
      monsterDamage: actualMonsterDamage,
      playerDefFailed: resolution.playerDefFailed,
      playerHpAfter: finalPlayerHp,
      monsterHpAfter: newMonsterHp,
      abilityName: resolution.ability?.name,
      abilityEmoji: resolution.ability?.emoji,
      abilityPattern: resolution.pattern,
      abilityFizzled: fizzled,
      abilityDice: resolution.dice,
      healAmount: totalHeal > 0 ? totalHeal : undefined,
      monsterStunned: resolution.monsterStunned,
      staminaCost: actualStaminaCost,
      soulDrainHeal: soulDrainHeal > 0 ? soulDrainHeal : undefined,
      hemorrhageDrain: hemorrhageDrain > 0 ? hemorrhageDrain : undefined,
      executeTriggered: executeTriggered || undefined,
      divineAegisBlocked: incoming.divineAegisBlocked || undefined,
      manaBarrierAbsorbed: incoming.magicDrained > 0 ? incoming.magicDrained : undefined,
      momentumRestore: momentumRestore > 0 ? momentumRestore : undefined,
      flatPassiveHeal: resolution.flatPassiveHeal > 0 ? resolution.flatPassiveHeal : undefined,
      perRoundHpRestore:
        perRound.hpRestore > 0 && outcome === null ? perRound.hpRestore : undefined,
      perRoundMagicRestore:
        perRound.magicRestore > 0 && outcome === null ? perRound.magicRestore : undefined,
    };

    setPendingAbility({
      dice: resolution.dice,
      pattern: resolution.pattern,
      ability: resolution.ability,
      applyResult: async () => {
        const nextState: FightState = {
          ...snapshot,
          playerHp: finalPlayerHp,
          playerStamina: newStamina,
          playerMagic: finalPlayerMagic,
          monsterHp: newMonsterHp,
          log: [...snapshot.log, entry],
          outcome,
          droppedItems,
          isFirstAbility: false,
          executeUsed: snapshot.executeUsed || executeTriggered,
        };
        setFightState(nextState);
        setHpLocal(finalPlayerHp);
        setStaminaLocal(newStamina);
        setMagicLocal(finalPlayerMagic);

        if (outcome !== null) {
          await updateCurrentHp(finalPlayerHp);
          await updateCurrentStamina(newStamina);
          await updateCurrentMagic(finalPlayerMagic);
          if (outcome === 'win') {
            const { multiplier: streakMult, boost: streakBoost } = getStreakBoost();
            setPendingRewards({
              xpReward: streakBoost(snapshot.monster),
              streakMultiplier: streakMult,
              goldReward: snapshot.monster.goldReward,
              droppedItems,
              monster: snapshot.monster,
              uid,
            });
          }
        }

        setPendingAbility(null);
        setRollingAction(null);
      },
    });
  }

  function handleCastSpell(spellDef: ItemDef) {
    if (!fightState || !character || rollingAction !== null || fightState.outcome !== null) return;
    const sm = spellDef.spellMechanics;
    if (!sm) return;

    // ── Archmage discount; Blood Pact (Warlock) alternate payment ──────────────
    const effectiveMagicCost = getEffectiveSpellCost(character, sm.magicCost);
    const useBloodPact = canBloodPact(
      character,
      effectiveMagicCost,
      fightState.playerMagic,
      fightState.playerHp,
    );
    if (!useBloodPact && fightState.playerMagic < effectiveMagicCost) return;

    setShowSpellPanel(false);
    setRollingAction('ability'); // re-use lock

    const snapshot = fightState;
    const uid = character.uid;

    const resolution = resolveSpell(sm.effect, sm.requirement, character, snapshot.monster);

    // ── Magic / HP payment ─────────────────────────────────────────────────────
    const newMagic = useBloodPact
      ? snapshot.playerMagic
      : Math.max(0, snapshot.playerMagic - effectiveMagicCost);
    const bloodPactHpCost = useBloodPact ? 10 : 0;

    // ── Warlock Soul Drain on spell damage ─────────────────────────────────────
    const { soulDrainHeal: spellSoulDrain } = resolveLifesteal(
      character,
      0,
      resolution.playerDamage,
    );

    const newMonsterHp = Math.max(0, snapshot.monsterHp - resolution.playerDamage);

    // ── Post-damage pipeline (incoming passives, per-round passives, outcome) ──
    const spellCtx = {
      currentHpPct: snapshot.playerHp / maxHp,
      currentMagic: newMagic,
      isFirstAbility: snapshot.isFirstAbility,
      executeUsed: snapshot.executeUsed,
    };
    const healedHp = Math.min(
      snapshot.playerHp + resolution.healAmount + spellSoulDrain - bloodPactHpCost,
      maxHp,
    );
    const roundResult = resolveRoundOutcome({
      newMonsterHp,
      preIncomingPlayerHp: healedHp,
      playerMagicBeforeBarrier: newMagic,
      rawMonsterDamage: resolution.monsterDamage,
      passiveCtx: spellCtx,
      snapshot,
      character,
      maxHp,
      maxMagic,
      streakMultiplier,
      getPityFor,
    });
    const { incoming, perRound, finalPlayerHp, finalPlayerMagic, outcome, droppedItems } =
      roundResult;
    const actualMonsterDamage = incoming.damage;
    const newStamina = Math.min(snapshot.playerStamina + resolution.staminaRestored, maxStamina);

    const totalSpellHeal = resolution.healAmount + spellSoulDrain;

    const entry: RoundEntry = {
      round: snapshot.log.length + 1,
      action: 'spell',
      spellName: spellDef.name,
      spellDice: resolution.dice,
      spellRequirementMet: resolution.requirementMet,
      spellMagicCost: effectiveMagicCost,
      spellDiceReq: sm.requirement,
      playerDamage: resolution.playerDamage,
      monsterDamage: actualMonsterDamage,
      healAmount: totalSpellHeal > 0 ? totalSpellHeal : undefined,
      spellStaminaRestored: resolution.staminaRestored,
      monsterStunned: resolution.monsterStunned,
      defenseBoost: resolution.defenseBoost,
      playerDefFailed: resolution.playerDefFailed,
      playerHpAfter: finalPlayerHp,
      monsterHpAfter: newMonsterHp,
      soulDrainHeal: spellSoulDrain > 0 ? spellSoulDrain : undefined,
      divineAegisBlocked: incoming.divineAegisBlocked || undefined,
      manaBarrierAbsorbed: incoming.magicDrained > 0 ? incoming.magicDrained : undefined,
      bloodPactUsed: useBloodPact || undefined,
      perRoundHpRestore:
        perRound.hpRestore > 0 && outcome === null ? perRound.hpRestore : undefined,
      perRoundMagicRestore:
        perRound.magicRestore > 0 && outcome === null ? perRound.magicRestore : undefined,
    };

    setPendingSpell({
      spellDef,
      dice: resolution.dice,
      requirementMet: resolution.requirementMet,
      applyResult: async () => {
        const nextState: FightState = {
          ...snapshot,
          playerHp: finalPlayerHp,
          playerStamina: newStamina,
          playerMagic: finalPlayerMagic,
          monsterHp: newMonsterHp,
          log: [...snapshot.log, entry],
          outcome,
          droppedItems,
        };
        setFightState(nextState);
        setHpLocal(finalPlayerHp);
        setStaminaLocal(newStamina);
        setMagicLocal(finalPlayerMagic);

        if (outcome !== null) {
          await updateCurrentHp(finalPlayerHp);
          await updateCurrentStamina(newStamina);
          await updateCurrentMagic(finalPlayerMagic);
          if (outcome === 'win') {
            const { multiplier: streakMult, boost: streakBoost } = getStreakBoost();
            setPendingRewards({
              xpReward: streakBoost(snapshot.monster),
              streakMultiplier: streakMult,
              goldReward: snapshot.monster.goldReward,
              droppedItems,
              monster: snapshot.monster,
              uid,
            });
          }
        }

        setPendingSpell(null);
        setRollingAction(null);
      },
    });
  }

  async function handleClaimRewards() {
    if (!pendingRewards) return;
    playSound('claim');
    setClaiming(true);

    const { xpReward, goldReward, droppedItems, monster: defeated, uid } = pendingRewards;
    const gotLegendary = droppedItems.some((id) => {
      const def = getItemById(id);
      return def?.rarity === 'legendary';
    });

    // Step 1 — server-authoritative claim (idempotent CF — safe to retry if this throws)
    let claim: Awaited<ReturnType<typeof claimCombatVictoryCF>>;
    try {
      claim = await claimCombatVictoryCF({
        xpReward,
        goldReward,
        monsterId: defeated.id,
        monsterName: defeated.name,
        idempotencyKey: crypto.randomUUID(),
      });
    } catch {
      toast.error("Couldn't reach the server — tap Claim Rewards again", {
        description: 'Nothing was awarded yet. Your rewards are waiting.',
      });
      setClaiming(false);
      return; // keep modal open — retry is safe
    }

    const { finalXp, multiplier, winsTodayAfter } = claim;
    setWinsToday(winsTodayAfter);

    // CF succeeded — dismiss modal now. No double-award possible from here on.
    setPendingRewards(null);

    let lootSyncFailed = false;

    try {
      // Step 2 — local store sync (best-effort; CF already persisted to Firestore)
      // Note: awardXpAndStats/awardGold swallow errors internally — catch kept for safety if that changes
      try {
        await awardXpAndStats(finalXp, {});
        await awardGold(goldReward);
      } catch (err) {
        console.error('[handleClaimRewards] local stat sync failed:', err);
      }

      // Step 3 — loot (best-effort; flag failure so inventory reconciles on next load)
      try {
        await awardLoot(uid, droppedItems);
      } catch (err) {
        console.error('[handleClaimRewards] loot sync failed:', err);
        lootSyncFailed = true;
      }

      // Step 4 — pity bookkeeping (silent; non-critical)
      try {
        await updateMonsterPity(defeated.id, gotLegendary);
      } catch (err) {
        console.error('[handleClaimRewards] pity update failed:', err);
      }

      // Surface result
      toastReward({
        emoji: '⚔️',
        title: `Defeated ${defeated.name}!`,
        xp: finalXp,
        gold: goldReward,
      });

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

  async function handleUseItem(inventoryItemId: string) {
    if (!fightState || !character || usingItem || fightState.outcome !== null) return;
    setUsingItem(inventoryItemId);
    setShowItemPanel(false);
    const { hpGained, staminaGained, magicGained } = await consumeItem(
      inventoryItemId,
      fightState.playerHp,
      maxHp,
      fightState.playerStamina,
      maxStamina,
      fightState.playerMagic,
      maxMagic,
    );
    // Compute final values before setFightState so both the local-state setter
    // and the store setter use the same numbers (avoids stale-closure mismatch).
    const newHp =
      hpGained > 0 ? Math.min(fightState.playerHp + hpGained, maxHp) : fightState.playerHp;
    const newStamina =
      staminaGained > 0
        ? Math.min(fightState.playerStamina + staminaGained, maxStamina)
        : fightState.playerStamina;
    const newMagic =
      magicGained > 0
        ? Math.min(fightState.playerMagic + magicGained, maxMagic)
        : fightState.playerMagic;
    setFightState((prev) => {
      if (!prev) return prev;
      return { ...prev, playerHp: newHp, playerStamina: newStamina, playerMagic: newMagic };
    });
    if (hpGained > 0) setHpLocal(newHp);
    if (staminaGained > 0) setStaminaLocal(newStamina);
    if (magicGained > 0) setMagicLocal(newMagic);
    setUsingItem(null);
  }

  function handleRecovery(type: 'rest' | 'meditate') {
    if (!fightState || !character || rollingAction !== null || fightState.outcome !== null) return;

    setRollingAction(type);
    const snapshot = fightState;
    const recoveryRoll = Math.ceil(Math.random() * 10);

    // ── What does the player recover? ──────────────────────────────────────
    let recoveredStamina = 0;
    let recoveredMagic = 0;
    if (type === 'rest') {
      const raw = recoveryRoll * 3;
      recoveredStamina = Math.min(raw, maxStamina - snapshot.playerStamina);
    } else {
      const raw = recoveryRoll + (character.stats.wisdom ?? 0);
      recoveredMagic = Math.min(raw, maxMagic - snapshot.playerMagic);
    }

    // ── Monster gets a free attack (player's defense bypassed) ────────────
    const monsterRoll = Math.ceil(Math.random() * 10);
    const monsterDamage = Math.max(1, snapshot.monster.attack + monsterRoll);
    const newPlayerHp = Math.max(0, snapshot.playerHp - monsterDamage);
    const lossOutcome: 'loss' | null = newPlayerHp === 0 ? 'loss' : null;

    const entry: RoundEntry = {
      round: snapshot.log.length + 1,
      action: type,
      recoveryRoll,
      recoveredStamina,
      recoveredMagic,
      monsterDamage,
      playerHpAfter: newPlayerHp,
      monsterHpAfter: snapshot.monsterHp,
    };

    setPendingAction({
      actionType: type,
      dice: [recoveryRoll],
      monsterRoll,
      monsterDamage,
      recoveredStamina,
      recoveredMagic,
      outcome: lossOutcome,
      applyResult: async () => {
        const newStamina = snapshot.playerStamina + recoveredStamina;
        const newMagic = snapshot.playerMagic + recoveredMagic;
        setFightState({
          ...snapshot,
          playerHp: newPlayerHp,
          playerStamina: newStamina,
          playerMagic: newMagic,
          log: [...snapshot.log, entry],
          outcome: lossOutcome,
        });
        setHpLocal(newPlayerHp);
        setStaminaLocal(newStamina);
        setMagicLocal(newMagic);
        if (lossOutcome === 'loss') {
          await updateCurrentHp(0);
          await updateCurrentStamina(newStamina);
          await updateCurrentMagic(newMagic);
        }
        setPendingAction(null);
        setRollingAction(null);
      },
    });
  }

  function backToArena() {
    setPhase('select');
    setFightState(null);
  }

  // ── Fighting view ──────────────────────────────────────────────────────────
  if (phase === 'fighting' && fightState) {
    const {
      monster,
      playerHp,
      playerStartHp,
      playerStamina,
      playerMagic,
      monsterHp,
      log,
      outcome,
      droppedItems,
    } = fightState;
    const emoji = MONSTER_EMOJI[monster.id] ?? '👾';
    const fightOver = outcome !== null;
    const isRolling = rollingAction !== null;
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
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
              vs. {emoji} {monster.name}
            </p>
          </div>
        )}
        {outcome === 'loss' && (
          <div className="rounded-xl p-6 text-center bg-gradient-to-br from-red-100 via-red-50 to-gray-100 border border-red-300 shadow-lg shadow-red-500/20">
            <p className="text-5xl mb-2 grayscale-[30%]">💀</p>
            <p className="font-display text-4xl font-bold text-red-700 tracking-wider uppercase">
              You Have Fallen
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
              Defeated by {emoji} {monster.name}
            </p>
            <p className="text-sm text-amber-600 font-medium mt-2">
              Your level and stats have been reset.
            </p>
          </div>
        )}
        {outcome === 'fled' && (
          <div className="rounded-xl p-5 text-center bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200">
            <p className="text-4xl mb-1">🏃</p>
            <p className="font-display text-3xl font-bold text-amber-700 tracking-wide uppercase">
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
          const pityActive = pity >= LEGENDARY_PITY_THRESHOLD;
          const pityBoost = pityActive
            ? Math.min(Math.round((pity - LEGENDARY_PITY_THRESHOLD) * 0.02 * 100), 85)
            : 0;
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
              onBurstExpired={expire}
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
              }}
              monsterSub={monsterSub}
            />
          );
        })()}

        {/* Player-only resources — Stamina + Magic */}
        <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-3">
          {(() => {
            const staCost = getAbilityStaminaCost(
              character,
              COMBAT.ABILITY_STAMINA_COST,
              fightState.isFirstAbility,
            );
            return (
              <HpBar
                label="⚡ Stamina"
                current={playerStamina}
                max={maxStamina}
                color="bg-amber-400"
                sub={`${staCost} per ability · ${Math.floor(playerStamina / Math.max(staCost, 1))} uses remaining`}
              />
            );
          })()}
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
          <div className="space-y-2">
            {/* Row 1: Attack (full width) */}
            <ActionButton
              label="⚔️ Attack"
              sublabel={(() => {
                const stat = Math.floor(character.stats.strength * COMBAT.STRENGTH_ATTACK_FACTOR);
                const gear = gearAttackBonus(character, 'attack');
                return gear > 0 ? `d10 + ${stat} STR + ${gear} gear` : `d10 + ${stat} STR`;
              })()}
              onClick={() => handleAction('attack')}
              loading={rollingAction === 'attack'}
              disabled={isRolling}
              color="indigo"
              fullWidth
            />
            {/* Row 2: Roll Ability + Cast Spell */}
            <div className="grid grid-cols-2 gap-2">
              {(() => {
                const staCost = getAbilityStaminaCost(
                  character,
                  COMBAT.ABILITY_STAMINA_COST,
                  fightState.isFirstAbility,
                );
                const canAbility = playerStamina >= staCost;
                return (
                  <ActionButton
                    label="🎲 Roll Ability"
                    sublabel={
                      !canAbility
                        ? `Not enough stamina (need ${staCost})`
                        : staCost === 0
                          ? 'FREE this roll · 6d6 class ability'
                          : `Costs ${staCost} sta · 6d6 class ability`
                    }
                    onClick={handleAbility}
                    loading={rollingAction === 'ability'}
                    disabled={isRolling || !canAbility}
                    color="rose"
                  />
                );
              })()}
              <ActionButton
                label="✨ Cast Spell"
                sublabel={
                  equippedSpells.length === 0
                    ? 'No spells equipped'
                    : `${equippedSpells.length} spell${equippedSpells.length !== 1 ? 's' : ''} · ${playerMagic}✨ left`
                }
                onClick={() => {
                  setShowSpellPanel((v) => !v);
                  setShowItemPanel(false);
                }}
                loading={false}
                disabled={isRolling || equippedSpells.length === 0}
                color="violet"
              />
            </div>
            {/* Row 3: Rest + Meditate */}
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                label="🛌 Rest"
                sublabel={
                  playerStamina >= maxStamina
                    ? 'Stamina already full'
                    : `Roll d10 × 3 sta · monster free attack`
                }
                onClick={() => handleRecovery('rest')}
                loading={rollingAction === 'rest'}
                disabled={isRolling || playerStamina >= maxStamina}
                color="sky"
              />
              <ActionButton
                label="🧘 Meditate"
                sublabel={
                  playerMagic >= maxMagic
                    ? 'Magic already full'
                    : `Roll d10 + WIS magic · monster free attack`
                }
                onClick={() => handleRecovery('meditate')}
                loading={rollingAction === 'meditate'}
                disabled={isRolling || playerMagic >= maxMagic}
                color="slate"
              />
            </div>
            {/* Row 4: Use Item + Run Away */}
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                label={usingItem ? 'Using…' : '🧪 Use Item'}
                sublabel={
                  consumables.length === 0 ? 'None in pack' : `${consumables.length} in pack`
                }
                onClick={() => {
                  setShowItemPanel((v) => !v);
                  setShowSpellPanel(false);
                }}
                loading={!!usingItem}
                disabled={isRolling || consumables.length === 0}
                color="emerald"
              />
              <ActionButton
                label="🏃 Run Away"
                sublabel={(() => {
                  const agi = Math.floor(
                    (character.stats.agility ?? 0) * COMBAT.AGILITY_ESCAPE_FACTOR,
                  );
                  return agi > 0 ? `d10 + ${agi} AGI vs monster` : 'd10 vs monster to flee';
                })()}
                onClick={() => handleAction('run')}
                loading={rollingAction === 'run'}
                disabled={isRolling}
                color="amber"
              />
            </div>
            {/* Spell selection panel */}
            {showSpellPanel && (
              <div className="bg-white dark:bg-slate-900 border border-violet-200 rounded-xl p-3 shadow-sm space-y-3">
                <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider">
                  ✨ Choose a Spell — {playerMagic} magic remaining
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {equippedSpells.map(({ invItem, def }) => {
                    if (!def?.spellMechanics) return null;
                    const sm = def.spellMechanics;
                    const effectiveCost = getEffectiveSpellCost(character, sm.magicCost);
                    const affordable = playerMagic >= effectiveCost;
                    const bloodPactAvail = canBloodPact(
                      character,
                      effectiveCost,
                      playerMagic,
                      playerHp,
                    );
                    const classOk =
                      sm.classRestriction === 'all' || sm.classRestriction === character.class;
                    const canCast = (affordable || bloodPactAvail) && classOk;
                    const actionLabel = !classOk
                      ? `${sm.classRestriction} only`
                      : bloodPactAvail
                        ? 'Cast (Blood Pact −10 HP)'
                        : !affordable
                          ? 'Not enough magic'
                          : 'Cast Spell';
                    return (
                      <SpellCard
                        key={invItem.id}
                        def={def}
                        wisdomValue={character.stats.wisdom}
                        affordable={affordable || bloodPactAvail}
                        disabled={!canCast || isRolling}
                        actionLabel={actionLabel}
                        onAction={() => canCast && handleCastSpell(def)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {/* Consumable selection panel */}
            {showItemPanel && (
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 shadow-sm space-y-1.5">
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                  Choose a Consumable
                </p>
                {consumables.map((invItem) => {
                  const def = getItemById(invItem.itemDefId);
                  if (!def?.effect) return null;
                  return (
                    <button
                      key={invItem.id}
                      onClick={() => handleUseItem(invItem.id)}
                      disabled={!!usingItem}
                      className="w-full flex items-center justify-between bg-gray-50 dark:bg-slate-900 hover:bg-emerald-50 border border-gray-200 dark:border-slate-700 hover:border-emerald-300 rounded-lg px-3 py-2 text-left transition-colors disabled:opacity-40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-800 dark:text-slate-100">
                          🧪 {def.name}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${RARITY_BADGE[def.rarity]}`}
                        >
                          {def.rarity}
                        </span>
                      </div>
                      <span
                        className="text-xs font-semibold shrink-0"
                        style={{
                          color:
                            def.effect.type === 'restore_stamina'
                              ? '#d97706'
                              : def.effect.type === 'restore_magic'
                                ? '#7c3aed'
                                : '#059669',
                        }}
                      >
                        +{def.effect.amount}{' '}
                        {def.effect.type === 'restore_stamina'
                          ? 'Stamina'
                          : def.effect.type === 'restore_magic'
                            ? 'Magic'
                            : 'HP'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : outcome === 'loss' ? (
          <button
            onClick={handleBeginAgain}
            disabled={resetting}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {resetting ? 'Resetting…' : 'Begin Again'}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={backToArena}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {outcome === 'fled' ? 'Back to Arena' : 'Fight Again'}
            </button>
            <Link
              href="/dashboard"
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-indigo-300 text-gray-700 dark:text-slate-200 font-semibold py-2.5 rounded-lg transition-colors text-center"
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

        {/* Action roll overlay (attack / magic / run) */}
        {pendingAction && (
          <ActionRollOverlay
            pending={pendingAction}
            monster={monster}
            playerDefStat={playerDefStat}
          />
        )}

        {/* Ability roll overlay */}
        {pendingAbility && (
          <DiceRollOverlay
            dice={pendingAbility.dice}
            pattern={pendingAbility.pattern}
            ability={pendingAbility.ability}
            onDismiss={pendingAbility.applyResult}
          />
        )}

        {/* Spell roll overlay */}
        {pendingSpell && (
          <SpellRollOverlay
            spellDef={pendingSpell.spellDef}
            dice={pendingSpell.dice}
            requirementMet={pendingSpell.requirementMet}
            onDismiss={pendingSpell.applyResult}
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
          {/* Daily combat XP cap badge — surfaces the diminishing-returns
              multiplier before the player commits to a fight. */}
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
                title="Daily combat XP cap — diminishing returns past 10 wins/day"
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

// ─── Action Button ────────────────────────────────────────────────────────────

function ActionButton({
  label,
  sublabel,
  onClick,
  loading,
  disabled,
  color,
  fullWidth,
}: {
  label: string;
  sublabel: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  color: 'indigo' | 'violet' | 'amber' | 'emerald' | 'rose' | 'sky' | 'slate';
  fullWidth?: boolean;
}) {
  const base =
    'rounded-xl py-3 px-4 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed';
  const colors = {
    indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    violet: 'bg-violet-600 hover:bg-violet-700 text-white',
    amber: 'bg-amber-500 hover:bg-amber-600 text-white',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    rose: 'bg-rose-600 hover:bg-rose-700 text-white',
    sky: 'bg-sky-500 hover:bg-sky-600 text-white',
    slate: 'bg-slate-600 hover:bg-slate-700 text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${colors[color]} ${fullWidth ? 'w-full' : ''}`}
    >
      <p className="font-bold text-sm">{loading ? 'Rolling…' : label}</p>
      <p className="text-xs opacity-70 mt-0.5">{sublabel}</p>
    </button>
  );
}

// ─── Last Action Summary ──────────────────────────────────────────────────────

function LastActionSummary({ entry, monster }: { entry: RoundEntry; monster: MonsterDef }) {
  if (entry.action === 'run_failed') {
    return (
      <div className="text-sm space-y-1">
        <p>
          <span className="text-amber-600 font-medium">🏃 Ran — </span>
          <span className="font-mono text-amber-700">
            You rolled {entry.playerRunRoll}
            {(entry.agilityBonus ?? 0) > 0 && (
              <>
                {' '}
                + <span className="text-green-600">{entry.agilityBonus} AGI</span> ={' '}
                {(entry.playerRunRoll ?? 0) + (entry.agilityBonus ?? 0)}
              </>
            )}
          </span>
          <span className="text-gray-400 dark:text-slate-500"> vs </span>
          <span className="font-mono text-gray-600 dark:text-slate-300">
            Monster rolled {entry.monsterRunRoll}
          </span>
          <span className="text-red-600 font-semibold"> · Failed to escape</span>
        </p>
        {(entry.monsterDamage ?? 0) > 0 && (
          <p className="text-red-500">
            Monster hit for {entry.monsterDamage} dmg
            {entry.playerDefFailed ? (
              <span className="text-orange-500 font-semibold"> · 💥 Your DEF failed!</span>
            ) : (
              <span className="text-gray-400 dark:text-slate-500"> · 🛡️ DEF held</span>
            )}
          </p>
        )}
      </div>
    );
  }

  if (entry.action === 'spell') {
    const met = entry.spellRequirementMet;
    return (
      <div className="text-sm space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(entry.spellDice ?? []).map((d, i) => {
            const hi = entry.spellDiceReq
              ? getHighlightedSpellDiceIndices(entry.spellDice ?? [], entry.spellDiceReq)
              : [];
            return (
              <DieFace
                key={i}
                value={d}
                size="sm"
                variant={hi.includes(i) ? 'highlighted' : 'settled'}
              />
            );
          })}
          <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">
            {met ? '✓ Requirement met!' : '✗ Fizzled'}
          </span>
        </div>
        <p>
          <span
            className={`font-bold ${met ? 'text-violet-600' : 'text-gray-400 dark:text-slate-500'}`}
          >
            ✨ {entry.spellName}
          </span>
          {!met && (
            <span className="text-gray-400 dark:text-slate-500 font-medium">
              {' '}
              — Fizzled (magic spent)
            </span>
          )}
          {met && entry.monsterStunned && (
            <span className="text-amber-500 font-semibold"> · 😵 Monster stunned!</span>
          )}
          {met && (entry.playerDamage ?? 0) > 0 && (
            <span className="text-gray-800 dark:text-slate-100 font-semibold">
              {' '}
              → {entry.playerDamage} dmg
            </span>
          )}
          {met && (entry.healAmount ?? 0) > 0 && (
            <span className="text-emerald-600 font-semibold"> · +{entry.healAmount} HP</span>
          )}
          {met && (entry.spellStaminaRestored ?? 0) > 0 && (
            <span className="text-amber-500 font-semibold">
              {' '}
              · +{entry.spellStaminaRestored} Stamina
            </span>
          )}
          {met && (entry.defenseBoost ?? 0) > 0 && (
            <span className="text-blue-500 font-semibold">
              {' '}
              · +{entry.defenseBoost} DEF this round
            </span>
          )}
        </p>
        <p className="text-xs text-violet-400">✨ {entry.spellMagicCost} magic spent</p>
        {(entry.monsterDamage ?? 0) > 0 && (
          <p className="text-red-500">
            Monster hit back for {entry.monsterDamage} dmg
            {entry.playerDefFailed ? (
              <span className="text-orange-500 font-semibold"> · 💥 Your DEF failed!</span>
            ) : (
              <span className="text-gray-400 dark:text-slate-500"> · 🛡️ DEF held</span>
            )}
          </p>
        )}
        {entry.monsterStunned && (entry.monsterDamage ?? 0) === 0 && (
          <p className="text-amber-500 text-xs">
            Monster was stunned — no counter-attack this round.
          </p>
        )}
      </div>
    );
  }

  if (entry.action === 'ability') {
    return (
      <div className="text-sm space-y-2">
        {/* Dice display */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(() => {
            const hi = getHighlightedDiceIndices(
              entry.abilityDice ?? [],
              entry.abilityPattern ?? null,
            );
            return (entry.abilityDice ?? []).map((d, i) => (
              <DieFace
                key={i}
                value={d}
                size="sm"
                variant={hi.includes(i) ? 'highlighted' : 'settled'}
              />
            ));
          })()}
          <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">
            {entry.abilityFizzled
              ? '— no pattern (fizzle)'
              : `— ${entry.abilityPattern?.replace(/_/g, ' ')}`}
          </span>
        </div>
        {/* Ability name + damage */}
        {entry.abilityFizzled ? (
          <p className="text-gray-500 dark:text-slate-400">
            <span className="font-medium text-rose-500">Fizzle! </span>
            Basic hit for{' '}
            <span className="font-semibold text-gray-800 dark:text-slate-100">
              {entry.playerDamage} dmg
            </span>
          </p>
        ) : (
          <p>
            <span className="font-bold text-rose-600">
              {entry.abilityEmoji} {entry.abilityName}
            </span>
            {entry.monsterStunned && (
              <span className="text-amber-500 font-semibold"> · 😵 Monster stunned!</span>
            )}
            <span className="text-gray-800 dark:text-slate-100 font-semibold">
              {' '}
              → {entry.playerDamage} dmg
            </span>
            {(entry.healAmount ?? 0) > 0 && (
              <span className="text-emerald-600 font-semibold">
                {' '}
                · +{entry.healAmount} HP restored
              </span>
            )}
          </p>
        )}
        {(entry.monsterDamage ?? 0) > 0 && (
          <p className="text-red-500">
            Monster hit back for {entry.monsterDamage} dmg
            {entry.playerDefFailed ? (
              <span className="text-orange-500 font-semibold"> · 💥 Your DEF failed!</span>
            ) : (
              <span className="text-gray-400 dark:text-slate-500"> · 🛡️ DEF held</span>
            )}
          </p>
        )}
        {entry.monsterStunned && (entry.monsterDamage ?? 0) === 0 && (
          <p className="text-amber-500 text-xs">
            Monster was stunned — no counter-attack this round.
          </p>
        )}
      </div>
    );
  }

  if (entry.action === 'rest' || entry.action === 'meditate') {
    const isRest = entry.action === 'rest';
    return (
      <div className="text-sm space-y-1">
        <p>
          <span className={`font-medium ${isRest ? 'text-sky-600' : 'text-slate-600'}`}>
            {isRest ? '🛌 Rested' : '🧘 Meditated'} (rolled {entry.recoveryRoll})
          </span>
          {isRest && (entry.recoveredStamina ?? 0) > 0 && (
            <span className="text-sky-700 font-semibold"> → +{entry.recoveredStamina} Stamina</span>
          )}
          {!isRest && (entry.recoveredMagic ?? 0) > 0 && (
            <span className="text-slate-700 font-semibold"> → +{entry.recoveredMagic} Magic</span>
          )}
        </p>
        <p className="text-red-500">
          {isRest ? '🛌' : '🧘'} Monster free attack for{' '}
          <span className="font-semibold">{entry.monsterDamage} dmg</span>
          <span className="text-orange-500 font-semibold"> · 💥 No defense</span>
        </p>
      </div>
    );
  }

  return (
    <div className="text-sm space-y-1">
      <p>
        <span
          className={`font-medium ${entry.action === 'magic' ? 'text-violet-600' : 'text-indigo-600'}`}
        >
          🎲 {entry.roll}
        </span>
        <span className="text-gray-400 dark:text-slate-500"> + </span>
        <span className="font-mono text-emerald-600">
          {entry.attackBonusLabel === 'WIS' ? '🔮' : '⚔️'} {entry.attackBonus}{' '}
          {entry.attackBonusLabel}
        </span>
        {entry.monsterDefFailed ? (
          <span className="text-orange-500 font-semibold"> · 💥 DEF broke!</span>
        ) : (
          <>
            <span className="text-gray-400 dark:text-slate-500"> − </span>
            <span className="font-mono text-gray-500 dark:text-slate-400">
              🛡️ {monster.defense}
            </span>
          </>
        )}
        <span className="text-gray-800 dark:text-slate-100 font-semibold">
          {' '}
          = {entry.playerDamage} dmg
        </span>
      </p>
      {(entry.monsterDamage ?? 0) > 0 && (
        <p className="text-red-500">
          Monster hit back for {entry.monsterDamage} dmg
          {entry.playerDefFailed ? (
            <span className="text-orange-500 font-semibold"> · 💥 Your DEF failed!</span>
          ) : (
            <span className="text-gray-400 dark:text-slate-500"> · 🛡️ DEF held</span>
          )}
        </p>
      )}
    </div>
  );
}

// ─── Battle Log Entry ─────────────────────────────────────────────────────────

function BattleLogEntry({
  entry,
  monster,
  emoji,
}: {
  entry: RoundEntry;
  monster: MonsterDef;
  emoji: string;
}) {
  return (
    <li className="text-sm border-l-2 border-indigo-100 dark:border-indigo-900 pl-3 space-y-0.5">
      <p className="text-xs font-semibold text-gray-400 dark:text-slate-500">
        Round {entry.round} · {entry.action === 'attack' && '⚔️ Attack'}
        {entry.action === 'magic' && '🔮 Magic'}
        {entry.action === 'run_failed' && '🏃 Run (failed)'}
        {entry.action === 'ability' &&
          (entry.abilityFizzled ? '🎲 Ability (fizzle)' : `🎲 ${entry.abilityName ?? 'Ability'}`)}
        {entry.action === 'spell' &&
          (entry.spellRequirementMet ? `✨ ${entry.spellName}` : `✨ ${entry.spellName} (fizzle)`)}
        {entry.action === 'rest' && '🛌 Rest'}
        {entry.action === 'meditate' && '🧘 Meditate'}
      </p>

      {entry.action === 'run_failed' ? (
        <>
          <p>
            <span className="text-amber-600">You rolled {entry.playerRunRoll}</span>
            <span className="text-gray-400 dark:text-slate-500">
              {' '}
              vs Monster rolled {entry.monsterRunRoll}
            </span>
            <span className="text-red-500 font-medium"> · Blocked</span>
          </p>
          {(entry.monsterDamage ?? 0) > 0 && (
            <p>
              <span className="text-red-500">
                {emoji} hit for {entry.monsterDamage} dmg
              </span>
              {entry.playerDefFailed ? (
                <span className="text-orange-500"> · 💥 DEF failed</span>
              ) : (
                <span className="text-gray-400 dark:text-slate-500"> · 🛡️ held</span>
              )}
            </p>
          )}
        </>
      ) : entry.action === 'spell' ? (
        <>
          <div className="flex items-center gap-1 flex-wrap">
            {(entry.spellDice ?? []).map((d, i) => {
              const hi = entry.spellDiceReq
                ? getHighlightedSpellDiceIndices(entry.spellDice ?? [], entry.spellDiceReq)
                : [];
              return (
                <DieFace
                  key={i}
                  value={d}
                  size="sm"
                  variant={hi.includes(i) ? 'highlighted' : 'settled'}
                />
              );
            })}
            <span className="text-xs text-gray-400 dark:text-slate-500 ml-0.5">
              {entry.spellRequirementMet ? '(✓ hit)' : '(✗ fizzle)'}
            </span>
          </div>
          <p>
            <span className="text-violet-600 font-medium">
              ✨ {entry.spellRequirementMet ? `${entry.playerDamage ?? 0} dmg` : 'fizzled'}
            </span>
            {entry.monsterStunned && <span className="text-amber-500"> · stunned</span>}
            {(entry.healAmount ?? 0) > 0 && (
              <span className="text-emerald-600"> · +{entry.healAmount} HP</span>
            )}
            {(entry.spellStaminaRestored ?? 0) > 0 && (
              <span className="text-amber-500"> · +{entry.spellStaminaRestored} Stam</span>
            )}
            {entry.monsterHpAfter === 0 && (
              <span className="text-emerald-600 font-semibold"> · Slain!</span>
            )}
          </p>
          {(entry.monsterDamage ?? 0) > 0 && (
            <p>
              <span className="text-red-500">
                {emoji} hit for {entry.monsterDamage} dmg
              </span>
              {entry.playerDefFailed ? (
                <span className="text-orange-500"> · 💥 DEF failed</span>
              ) : (
                <span className="text-gray-400 dark:text-slate-500"> · 🛡️ held</span>
              )}
              {entry.playerHpAfter === 0 && (
                <span className="text-red-600 font-semibold"> · You fell!</span>
              )}
            </p>
          )}
        </>
      ) : entry.action === 'ability' ? (
        <>
          <div className="flex items-center gap-1 flex-wrap">
            {(() => {
              const hi = getHighlightedDiceIndices(
                entry.abilityDice ?? [],
                entry.abilityPattern ?? null,
              );
              return (entry.abilityDice ?? []).map((d, i) => (
                <DieFace
                  key={i}
                  value={d}
                  size="sm"
                  variant={hi.includes(i) ? 'highlighted' : 'settled'}
                />
              ));
            })()}
            <span className="text-gray-400 dark:text-slate-500 text-xs ml-0.5">
              {entry.abilityFizzled ? '(fizzle)' : `(${entry.abilityPattern?.replace(/_/g, ' ')})`}
            </span>
          </div>
          <p>
            <span className="text-rose-600 font-medium">
              {entry.abilityEmoji} {entry.playerDamage} dmg
            </span>
            {entry.monsterStunned && <span className="text-amber-500"> · stunned</span>}
            {(entry.healAmount ?? 0) > 0 && (
              <span className="text-emerald-600"> · +{entry.healAmount} HP</span>
            )}
            {entry.monsterHpAfter === 0 && (
              <span className="text-emerald-600 font-semibold"> · Slain!</span>
            )}
          </p>
          {(entry.monsterDamage ?? 0) > 0 && (
            <p>
              <span className="text-red-500">
                {emoji} hit for {entry.monsterDamage} dmg
              </span>
              {entry.playerDefFailed ? (
                <span className="text-orange-500"> · 💥 DEF failed</span>
              ) : (
                <span className="text-gray-400 dark:text-slate-500"> · 🛡️ held</span>
              )}
              {entry.playerHpAfter === 0 && (
                <span className="text-red-600 font-semibold"> · You fell!</span>
              )}
            </p>
          )}
        </>
      ) : entry.action === 'rest' || entry.action === 'meditate' ? (
        <>
          <p>
            {entry.action === 'rest' ? (
              <span className="text-sky-600">
                +{entry.recoveredStamina} stamina (d10={entry.recoveryRoll})
              </span>
            ) : (
              <span className="text-slate-600">
                +{entry.recoveredMagic} magic (d10={entry.recoveryRoll})
              </span>
            )}
          </p>
          <p>
            <span className="text-red-500">
              {emoji} free attack for {entry.monsterDamage} dmg
            </span>
            <span className="text-orange-500"> · 💥 no defense</span>
            {entry.playerHpAfter === 0 && (
              <span className="text-red-600 font-semibold"> · You fell!</span>
            )}
          </p>
        </>
      ) : (
        <>
          <p>
            <span
              className={
                entry.action === 'magic'
                  ? 'text-violet-600 font-medium'
                  : 'text-indigo-600 font-medium'
              }
            >
              🎲 {entry.roll}
            </span>
            <span className="text-gray-400 dark:text-slate-500">
              {' '}
              ({entry.roll} + {entry.attackBonusLabel === 'WIS' ? '🔮' : '⚔️'}
              {entry.attackBonus}
            </span>
            {entry.monsterDefFailed ? (
              <span className="text-orange-500"> · 💥 DEF broke!</span>
            ) : (
              <span className="text-gray-400 dark:text-slate-500"> − 🛡️{monster.defense}</span>
            )}
            <span className="text-gray-400 dark:text-slate-500">)</span>
            <span className="text-gray-800 dark:text-slate-100 font-medium">
              {' '}
              → {entry.playerDamage} dmg
            </span>
            {entry.monsterHpAfter === 0 && (
              <span className="text-emerald-600 font-semibold"> · Slain!</span>
            )}
          </p>
          {(entry.monsterDamage ?? 0) > 0 && (
            <p>
              <span className="text-red-500">
                {emoji} hit for {entry.monsterDamage} dmg
              </span>
              {entry.playerDefFailed ? (
                <span className="text-orange-500"> · 💥 DEF failed</span>
              ) : (
                <span className="text-gray-400 dark:text-slate-500"> · 🛡️ held</span>
              )}
              {entry.playerHpAfter === 0 && (
                <span className="text-red-600 font-semibold"> · You fell!</span>
              )}
            </p>
          )}
        </>
      )}
    </li>
  );
}

// ─── HP Bar ───────────────────────────────────────────────────────────────────

function HpBar({
  label,
  current,
  max,
  color,
  sub,
}: {
  label: string;
  current: number;
  max: number;
  color: string;
  sub?: string;
}) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
        <span className="font-medium">{label}</span>
        <span className="font-mono font-semibold text-gray-700 dark:text-slate-200">
          {current} / {max}
        </span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Die Face ────────────────────────────────────────────────────────────────
// Renders a physical die pip layout for values 1–6; value 0 = wildcard slot.

const DIE_PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [
    [0, 2],
    [2, 0],
  ],
  3: [
    [0, 2],
    [1, 1],
    [2, 0],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
};

function DieFace({
  value,
  variant = 'settled',
  size = 'sm',
}: {
  value: number;
  variant?: 'spinning' | 'settled' | 'highlighted' | 'wildcard';
  size?: 'sm' | 'lg';
}) {
  const isWildcard = value === 0 || variant === 'wildcard';
  const pips = isWildcard ? [] : (DIE_PIPS[value] ?? DIE_PIPS[1]);

  const s =
    size === 'lg'
      ? { die: 'w-14 h-14 rounded-2xl', grid: 'p-2', pip: 'w-3 h-3' }
      : { die: 'w-7 h-7 rounded-xl', grid: 'p-1', pip: 'w-1.5 h-1.5' };

  const v = {
    spinning:
      'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-700 text-rose-500 dark:text-rose-400 shadow-md shadow-rose-200 dark:shadow-rose-900',
    settled:
      'bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300',
    highlighted:
      'bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 text-amber-600 dark:text-amber-400 scale-110 shadow-md shadow-amber-100 dark:shadow-amber-900',
    wildcard:
      'bg-gray-50 dark:bg-slate-900 border-2 border-dashed border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600',
  };

  return (
    <div
      className={`relative transition-all duration-150 shrink-0 ${s.die} ${v[isWildcard ? 'wildcard' : variant]}`}
    >
      {isWildcard ? (
        <div className="flex items-center justify-center w-full h-full text-xs font-bold">?</div>
      ) : (
        <div className={`grid grid-cols-3 grid-rows-3 w-full h-full ${s.grid}`}>
          {Array.from({ length: 9 }, (_, idx) => {
            const row = Math.floor(idx / 3);
            const col = idx % 3;
            const hasPip = pips.some(([r, c]) => r === row && c === col);
            return (
              <div key={idx} className="flex items-center justify-center">
                {hasPip && <div className={`rounded-full bg-current ${s.pip}`} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Dice roll overlay ────────────────────────────────────────────────────────

// ─── D10 Face ─────────────────────────────────────────────────────────────────
// D10s show numbers, not pips. Rounded square with large numeral + "d10" label.

function D10Face({
  value,
  variant = 'settled',
  color = 'indigo',
}: {
  value: number;
  variant?: 'spinning' | 'settled';
  color?: 'indigo' | 'violet' | 'amber' | 'gray' | 'rose' | 'sky' | 'slate';
}) {
  const colorTokens: Record<string, Record<string, string>> = {
    indigo: {
      spinning:
        'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-200 dark:shadow-indigo-900',
      settled:
        'bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300',
    },
    violet: {
      spinning:
        'bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 shadow-lg shadow-violet-200 dark:shadow-violet-900',
      settled:
        'bg-white dark:bg-slate-900 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300',
    },
    amber: {
      spinning:
        'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 shadow-lg shadow-amber-200 dark:shadow-amber-900',
      settled:
        'bg-white dark:bg-slate-900 border-amber-400 dark:border-amber-700 text-amber-700 dark:text-amber-300 shadow-md shadow-amber-100 dark:shadow-amber-900',
    },
    gray: {
      spinning:
        'bg-gray-50 dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500',
      settled:
        'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400',
    },
    rose: {
      spinning:
        'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 shadow-lg shadow-rose-200 dark:shadow-rose-900',
      settled:
        'bg-white dark:bg-slate-900 border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-300 shadow-md shadow-rose-100 dark:shadow-rose-900',
    },
    sky: {
      spinning:
        'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400 shadow-lg shadow-sky-200 dark:shadow-sky-900',
      settled:
        'bg-white dark:bg-slate-900 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 shadow-md shadow-sky-100 dark:shadow-sky-900',
    },
    slate: {
      spinning:
        'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 shadow-lg shadow-slate-200 dark:shadow-slate-900',
      settled:
        'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 shadow-md shadow-slate-100 dark:shadow-slate-900',
    },
  };

  return (
    <div
      className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-200 select-none ${colorTokens[color][variant]}`}
    >
      <span className="text-4xl font-black leading-none">{value}</span>
      <span className="text-xs font-semibold opacity-40 mt-1 tracking-widest">d10</span>
    </div>
  );
}

// ─── Action Roll Overlay ──────────────────────────────────────────────────────
// Two-phase for attack/magic/rest/meditate: player roll → Continue → monster → Continue → apply
// Single-phase for run: both dice shown together.

function ActionRollOverlay({
  pending,
  monster,
  playerDefStat,
}: {
  pending: PendingAction;
  monster: MonsterDef;
  playerDefStat: number;
}) {
  type OverlayPhase =
    | 'player_spin'
    | 'player_result'
    | 'monster_spin'
    | 'monster_result'
    | 'run_spin'
    | 'run_result';

  const isRun = pending.actionType === 'run';
  const isAttack = pending.actionType === 'attack';
  const isRest = pending.actionType === 'rest';
  const isMeditate = pending.actionType === 'meditate';
  const isRecovery = isRest || isMeditate;
  const dieColor: 'indigo' | 'violet' | 'sky' | 'slate' = isAttack
    ? 'indigo'
    : isRest
      ? 'sky'
      : isMeditate
        ? 'slate'
        : 'violet';

  const [phase, setPhase] = useState<OverlayPhase>(isRun ? 'run_spin' : 'player_spin');
  const [playerDie, setPlayerDie] = useState<number>(() => Math.ceil(Math.random() * 10));
  const [monsterDie, setMonsterDie] = useState<number>(() => Math.ceil(Math.random() * 10));
  const [resultVisible, setResultVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  // ── Initial spin (player die or both run dice) — runs once on mount ────────
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayerDie(Math.ceil(Math.random() * 10));
      if (isRun) setMonsterDie(Math.ceil(Math.random() * 10));
    }, 80);

    const stopSpin = setTimeout(() => {
      clearInterval(interval);
      setPlayerDie(pending.dice[0]);
      if (isRun) {
        setMonsterDie(pending.dice[1] ?? 1);
        setPhase('run_result');
      } else {
        setPhase('player_result');
      }
      setTimeout(() => setResultVisible(true), 120);
    }, 950);

    return () => {
      clearInterval(interval);
      clearTimeout(stopSpin);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Monster spin — triggered when phase becomes "monster_spin" ────────────
  useEffect(() => {
    if (phase !== 'monster_spin') return;
    setResultVisible(false);

    const interval = setInterval(() => {
      setMonsterDie(Math.ceil(Math.random() * 10));
    }, 80);

    const stopSpin = setTimeout(() => {
      clearInterval(interval);
      setMonsterDie(pending.monsterRoll ?? 5);
      setPhase('monster_result');
      setTimeout(() => setResultVisible(true), 120);
    }, 750);

    return () => {
      clearInterval(interval);
      clearTimeout(stopSpin);
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleContinue() {
    if (phase === 'player_result') {
      // Recovery always goes to monster phase; attack only if monster survived
      if (isRecovery || pending.outcome !== 'win') {
        setPhase('monster_spin');
      } else {
        setDismissing(true);
        await pending.applyResult();
      }
    } else {
      // run_result or monster_result → apply everything
      setDismissing(true);
      await pending.applyResult();
    }
  }

  const isMonsterPhase = phase === 'monster_spin' || phase === 'monster_result';
  const isWin = pending.outcome === 'win';
  const isLoss = pending.outcome === 'loss';

  const headerText = isRun
    ? phase === 'run_spin'
      ? 'Rolling escape…'
      : pending.escaped
        ? 'You escaped!'
        : 'Blocked!'
    : isMonsterPhase
      ? phase === 'monster_spin'
        ? 'Monster strikes while you recover…'
        : isLoss
          ? 'You fell…'
          : "Monster's free attack!"
      : isRecovery
        ? phase === 'player_spin'
          ? isRest
            ? 'Resting…'
            : 'Meditating…'
          : isRest
            ? '🛌 Rest'
            : '🧘 Meditate'
        : phase === 'player_spin'
          ? `Rolling ${isAttack ? 'attack' : 'magic'}…`
          : isWin
            ? 'Victory!'
            : `${isAttack ? 'Attack' : 'Magic'} roll`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl px-6 py-7 shadow-2xl mx-4 max-w-xs w-full space-y-5 text-center">
        {/* Header */}
        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
          {headerText}
        </p>

        {/* Die(s) */}
        {isRun ? (
          <div className="flex justify-center items-end gap-6">
            <div className="flex flex-col items-center gap-1.5">
              <D10Face
                value={playerDie}
                variant={phase === 'run_spin' ? 'spinning' : 'settled'}
                color="amber"
              />
              <p className="text-xs font-semibold text-amber-600">You</p>
            </div>
            <p className="text-xl font-bold text-gray-300 dark:text-slate-600 mb-6">vs</p>
            <div className="flex flex-col items-center gap-1.5">
              <D10Face
                value={monsterDie}
                variant={phase === 'run_spin' ? 'spinning' : 'settled'}
                color="gray"
              />
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500">Monster</p>
            </div>
          </div>
        ) : isMonsterPhase ? (
          <div className="flex justify-center">
            <D10Face
              value={monsterDie}
              variant={phase === 'monster_spin' ? 'spinning' : 'settled'}
              color="rose"
            />
          </div>
        ) : (
          <div className="flex justify-center">
            <D10Face
              value={playerDie}
              variant={phase === 'player_spin' ? 'spinning' : 'settled'}
              color={dieColor}
            />
          </div>
        )}

        {/* Result panel — fades in after die settles */}
        <div
          className={`space-y-3 transition-opacity duration-300 ${resultVisible ? 'opacity-100' : 'opacity-0'} ${resultVisible ? '' : 'pointer-events-none'}`}
        >
          {isRun ? (
            pending.escaped ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                You rolled higher — flee successful
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Monster rolled higher — hit for{' '}
                <span className="font-semibold text-red-500">{pending.monsterDamage} dmg</span>
                {pending.playerDefFailed ? (
                  <span className="text-orange-500"> · 💥 DEF failed</span>
                ) : (
                  <span className="text-gray-400 dark:text-slate-500"> · 🛡️ DEF held</span>
                )}
              </p>
            )
          ) : isMonsterPhase ? (
            /* Monster counter-attack result */
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="font-semibold text-rose-500">⚔️ {monster.attack} ATK</span>
                {isRecovery ? (
                  <span className="text-orange-500 font-semibold text-sm">· 💥 Free attack!</span>
                ) : pending.playerDefFailed ? (
                  <span className="text-orange-500 font-semibold text-sm">· 💥 DEF failed!</span>
                ) : (
                  <>
                    <span className="text-gray-300 dark:text-slate-600 font-bold">−</span>
                    <span className="text-gray-400 dark:text-slate-500 text-sm">
                      🛡️ {playerDefStat} DEF
                    </span>
                  </>
                )}
                <span className="text-gray-300 dark:text-slate-600 font-bold">=</span>
                <span className="text-rose-700 font-black text-2xl">{pending.monsterDamage}</span>
                <span className="text-gray-400 dark:text-slate-500 text-sm">dmg</span>
              </div>
              {isLoss && (
                <p className="text-sm font-semibold text-red-600">💀 You have fallen...</p>
              )}
            </div>
          ) : isRecovery ? (
            /* Rest / Meditate result */
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span
                  className={`text-2xl font-black ${isRest ? 'text-sky-600' : 'text-slate-600'}`}
                >
                  {playerDie}
                </span>
                {isRest ? (
                  <>
                    <span className="text-gray-300 dark:text-slate-600 font-bold">×</span>
                    <span className="text-sky-500 font-semibold">3</span>
                    <span className="text-gray-300 dark:text-slate-600 font-bold">=</span>
                    <span className="text-sky-700 font-black text-2xl">
                      {pending.recoveredStamina}
                    </span>
                    <span className="text-gray-400 dark:text-slate-500 text-sm">stamina</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-300 dark:text-slate-600 font-bold">+</span>
                    <span className="text-slate-500 font-semibold">🧠 WIS</span>
                    <span className="text-gray-300 dark:text-slate-600 font-bold">=</span>
                    <span className="text-slate-700 font-black text-2xl">
                      {pending.recoveredMagic}
                    </span>
                    <span className="text-gray-400 dark:text-slate-500 text-sm">magic</span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Monster strikes while you recover…
              </p>
            </div>
          ) : (
            /* Player attack/magic result */
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span
                  className={`text-2xl font-black ${isAttack ? 'text-indigo-600' : 'text-violet-600'}`}
                >
                  {playerDie}
                </span>
                <span className="text-gray-300 dark:text-slate-600 font-bold">+</span>
                <span
                  className={`font-semibold ${isAttack ? 'text-indigo-500' : 'text-violet-500'}`}
                >
                  {pending.attackBonusLabel === 'WIS' ? '🔮' : '⚔️'} {pending.attackBonus}
                </span>
                {pending.monsterDefFailed ? (
                  <span className="text-orange-500 font-semibold text-sm">· 💥 DEF broke!</span>
                ) : (
                  <>
                    <span className="text-gray-300 dark:text-slate-600 font-bold">−</span>
                    <span className="text-gray-400 dark:text-slate-500 text-sm">
                      🛡️ {monster.defense}
                    </span>
                  </>
                )}
                <span className="text-gray-300 dark:text-slate-600 font-bold">=</span>
                <span className="text-gray-900 dark:text-slate-100 font-black text-2xl">
                  {pending.playerDamage}
                </span>
                <span className="text-gray-400 dark:text-slate-500 text-sm">dmg</span>
              </div>
              {isWin && <p className="text-sm font-semibold text-emerald-600">🏆 Monster slain!</p>}
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={dismissing}
            className={`w-full disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-xl transition-colors ${
              isRun
                ? 'bg-amber-500 hover:bg-amber-600'
                : isMonsterPhase
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : isRest
                    ? 'bg-sky-500 hover:bg-sky-600'
                    : isMeditate
                      ? 'bg-slate-600 hover:bg-slate-700'
                      : isAttack
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-violet-600 hover:bg-violet-700'
            }`}
          >
            {dismissing ? 'Applying…' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Returns the indices of dice that contribute to the detected pattern. */
function getHighlightedDiceIndices(dice: number[], pattern: DicePattern | null): number[] {
  if (!pattern) return [];

  // Build value → [indices] map
  const indexMap = new Map<number, number[]>();
  dice.forEach((d, i) => {
    const existing = indexMap.get(d);
    if (existing) existing.push(i);
    else indexMap.set(d, [i]);
  });

  switch (pattern) {
    case 'four_of_a_kind': {
      let best: number[] = [];
      indexMap.forEach((idxs) => {
        if (idxs.length >= 4) best = idxs;
      });
      return best.slice(0, 4);
    }
    case 'three_of_a_kind': {
      let best: number[] = [];
      indexMap.forEach((idxs) => {
        if (idxs.length >= 3 && idxs.length > best.length) best = idxs;
      });
      return best.slice(0, 3);
    }
    case 'full_house': {
      const groups: number[][] = [];
      indexMap.forEach((idxs) => groups.push(idxs));
      groups.sort((a, b) => b.length - a.length);
      return [...(groups[0]?.slice(0, 3) ?? []), ...(groups[1]?.slice(0, 2) ?? [])];
    }
    case 'large_straight': {
      for (let start = 1; start <= 2; start++) {
        const idxs: number[] = [];
        let valid = true;
        for (let offset = 0; offset < 5; offset++) {
          const found = indexMap.get(start + offset)?.[0];
          if (found === undefined) {
            valid = false;
            break;
          }
          idxs.push(found);
        }
        if (valid) return idxs;
      }
      return [];
    }
    case 'small_straight': {
      for (let start = 1; start <= 3; start++) {
        const idxs: number[] = [];
        let valid = true;
        for (let offset = 0; offset < 4; offset++) {
          const found = indexMap.get(start + offset)?.[0];
          if (found === undefined) {
            valid = false;
            break;
          }
          idxs.push(found);
        }
        if (valid) return idxs;
      }
      return [];
    }
  }
}

function DiceRollOverlay({
  dice,
  pattern,
  ability,
  onDismiss,
}: {
  dice: number[];
  pattern: DicePattern | null;
  ability: AbilityDef | null;
  onDismiss: () => Promise<void>;
}) {
  const [phase, setPhase] = useState<'spinning' | 'settling' | 'result'>('spinning');
  const [displayDice, setDisplayDice] = useState<number[]>(() =>
    Array.from({ length: 6 }, () => Math.ceil(Math.random() * 6)),
  );
  const [settled, setSettled] = useState<boolean[]>([false, false, false, false, false, false]);
  const [resultVisible, setResultVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const fizzled = ability === null;
  const highlighted = getHighlightedDiceIndices(dice, pattern);

  // Phase 1 — spinning: rapidly cycle values until timeout
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayDice(Array.from({ length: 6 }, () => Math.ceil(Math.random() * 6)));
    }, 75);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setPhase('settling');
    }, 1100);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []); // intentionally empty — run once on mount

  // Phase 2 — settling: lock each die onto its final value one by one
  useEffect(() => {
    if (phase !== 'settling') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    dice.forEach((val, i) => {
      timers.push(
        setTimeout(() => {
          setDisplayDice((prev) => {
            const next = [...prev];
            next[i] = val;
            return next;
          });
          setSettled((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, i * 130),
      );
    });
    // Show result panel shortly after last die settles
    timers.push(
      setTimeout(
        () => {
          setPhase('result');
          setTimeout(() => setResultVisible(true), 40); // slight delay to trigger fade
        },
        dice.length * 130 + 350,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, dice]);

  async function handleDismiss() {
    setDismissing(true);
    await onDismiss();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl px-6 py-7 shadow-2xl mx-4 max-w-xs w-full space-y-5 text-center">
        {/* Phase label */}
        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
          {phase === 'spinning'
            ? 'Rolling dice…'
            : phase === 'settling'
              ? 'Revealing…'
              : fizzled
                ? 'No Pattern — Fizzle'
                : 'Pattern Matched!'}
        </p>

        {/* Dice row */}
        <div className="flex justify-center gap-2">
          {displayDice.map((d, i) => {
            const isSettled = settled[i];
            const isHighlighted = isSettled && highlighted.includes(i);
            return (
              <DieFace
                key={i}
                value={d}
                size="lg"
                variant={!isSettled ? 'spinning' : isHighlighted ? 'highlighted' : 'settled'}
              />
            );
          })}
        </div>

        {/* Result — fades in after all dice settle */}
        <div
          className={`transition-opacity duration-300 ${resultVisible ? 'opacity-100' : 'opacity-0'} ${phase === 'result' ? '' : 'pointer-events-none'}`}
        >
          {fizzled ? (
            <div className="space-y-1.5">
              <p className="text-2xl font-bold text-gray-400 dark:text-slate-500">Fizzle!</p>
              <p className="text-sm text-gray-400 dark:text-slate-500">
                No matching pattern — basic hit landed
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-3">
                <span className="text-3xl">{ability!.emoji}</span>
                <div className="text-left">
                  <p className="font-bold text-rose-700 dark:text-rose-300 text-base leading-tight">
                    {ability!.name}
                  </p>
                  <p className="text-xs text-rose-400 dark:text-rose-500 mt-0.5">
                    {PATTERN_LABEL[pattern!]}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {abilityTags(ability!).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-rose-100 text-rose-700 font-semibold px-2.5 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="mt-4 w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
          >
            {dismissing ? 'Applying…' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Spell Roll Overlay ───────────────────────────────────────────────────────

function SpellRollOverlay({
  spellDef,
  dice,
  requirementMet,
  onDismiss,
}: {
  spellDef: ItemDef;
  dice: number[];
  requirementMet: boolean;
  onDismiss: () => Promise<void>;
}) {
  const sm = spellDef.spellMechanics!;
  const [phase, setPhase] = useState<'spinning' | 'settling' | 'result'>('spinning');
  const [displayDice, setDisplayDice] = useState<number[]>(() =>
    Array.from({ length: dice.length }, () => Math.ceil(Math.random() * 6)),
  );
  const [settled, setSettled] = useState<boolean[]>(() => dice.map(() => false));
  const [resultVisible, setResultVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const highlighted = requirementMet ? getHighlightedSpellDiceIndices(dice, sm.requirement) : [];

  // Phase 1 — spin
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayDice(Array.from({ length: dice.length }, () => Math.ceil(Math.random() * 6)));
    }, 75);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setPhase('settling');
    }, 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 2 — settle each die
  useEffect(() => {
    if (phase !== 'settling') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    dice.forEach((val, i) => {
      timers.push(
        setTimeout(() => {
          setDisplayDice((prev) => {
            const next = [...prev];
            next[i] = val;
            return next;
          });
          setSettled((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, i * 140),
      );
    });
    timers.push(
      setTimeout(
        () => {
          setPhase('result');
          setTimeout(() => setResultVisible(true), 50);
        },
        dice.length * 140 + 300,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, dice]);

  async function handleDismiss() {
    setDismissing(true);
    await onDismiss();
  }

  // Build effect summary tags
  const effectTags: string[] = [];
  const eff = sm.effect;
  if (eff.damage)
    effectTags.push(`${eff.damage} dmg${eff.bypassMonsterDef ? ' (bypass DEF)' : ''}`);
  if (eff.heal) effectTags.push(`+${eff.heal} HP`);
  if (eff.restoreStamina) effectTags.push(`+${eff.restoreStamina} Stamina`);
  if (eff.stun) effectTags.push('Stun enemy');
  if (eff.defenseBoost) effectTags.push(`+${eff.defenseBoost} DEF this round`);
  if (eff.lifestealPct) effectTags.push(`${(eff.lifestealPct * 100) | 0}% lifesteal`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl px-6 py-7 shadow-2xl mx-4 max-w-xs w-full space-y-5 text-center">
        <p className="text-xs font-bold text-violet-400 uppercase tracking-widest">
          {phase === 'spinning'
            ? 'Casting…'
            : phase === 'settling'
              ? 'Resolving…'
              : requirementMet
                ? 'Spell Cast!'
                : 'Fizzled!'}
        </p>

        {/* Spell name */}
        <p className="text-base font-bold text-violet-800">✨ {spellDef.name}</p>

        {/* Dice */}
        <div className="flex justify-center gap-2 flex-wrap">
          {displayDice.map((d, i) => {
            const isSettled = settled[i];
            const isHighlighted = isSettled && highlighted.includes(i);
            return (
              <DieFace
                key={i}
                value={d}
                size="lg"
                variant={!isSettled ? 'spinning' : isHighlighted ? 'highlighted' : 'settled'}
              />
            );
          })}
        </div>

        {/* Requirement label */}
        <p className="text-xs text-gray-400 dark:text-slate-500">
          {describeRequirement(sm.requirement)}
        </p>

        {/* Result panel */}
        <div
          className={`space-y-3 transition-opacity duration-300 ${resultVisible ? 'opacity-100' : 'opacity-0'} ${phase === 'result' ? '' : 'pointer-events-none'}`}
        >
          {requirementMet ? (
            <div className="space-y-2">
              <p className="text-lg font-bold text-violet-700">Requirement Met!</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {effectTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-violet-100 text-violet-700 font-semibold px-2.5 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-lg font-bold text-gray-400 dark:text-slate-500">Fizzled</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Dice didn&apos;t meet the requirement — magic spent, no effect
              </p>
            </div>
          )}

          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
          >
            {dismissing ? 'Applying…' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ability Reference ────────────────────────────────────────────────────────

const ABILITY_PATTERNS: Array<{
  pattern: DicePattern;
  diceExample: number[]; // 0 = wildcard die
  requirement: string;
}> = [
  { pattern: 'four_of_a_kind', diceExample: [4, 4, 4, 4, 0, 0], requirement: '4+ matching dice' },
  {
    pattern: 'large_straight',
    diceExample: [2, 3, 4, 5, 6, 0],
    requirement: '5 consecutive (e.g. 2-3-4-5-6)',
  },
  {
    pattern: 'full_house',
    diceExample: [3, 3, 3, 5, 5, 0],
    requirement: '3 matching + 2 matching',
  },
  {
    pattern: 'small_straight',
    diceExample: [1, 2, 3, 4, 0, 0],
    requirement: '4 consecutive (e.g. 1-2-3-4)',
  },
  { pattern: 'three_of_a_kind', diceExample: [6, 6, 6, 0, 0, 0], requirement: '3+ matching dice' },
];

const PATTERN_LABEL: Record<DicePattern, string> = {
  four_of_a_kind: 'Four of a Kind',
  large_straight: 'Large Straight',
  full_house: 'Full House',
  small_straight: 'Small Straight',
  three_of_a_kind: 'Three of a Kind',
};

function abilityTags(ability: AbilityDef): string[] {
  const tags: string[] = [`${ability.damageMultiplier}× damage`];
  if (ability.bypassMonsterDef && ability.bypassPlayerDef) {
    tags.push('ignores all DEF');
  } else if (ability.bypassMonsterDef) {
    tags.push('bypasses DEF');
  }
  if (ability.stunMonster) tags.push('stuns enemy');
  if (ability.lifestealPct > 0) tags.push(`${(ability.lifestealPct * 100) | 0}% lifesteal`);
  return tags;
}

function AbilityReference({ characterClass }: { characterClass: string }) {
  return (
    <div className="space-y-0">
      {ABILITY_PATTERNS.map(({ pattern, diceExample, requirement }, idx) => {
        const ability = getAbility(characterClass, pattern);
        if (!ability) return null;
        const tags = abilityTags(ability);
        return (
          <div
            key={pattern}
            className={`flex items-start gap-3 py-2.5 ${idx < ABILITY_PATTERNS.length - 1 ? 'border-b border-gray-100 dark:border-slate-800' : ''}`}
          >
            {/* Dice example */}
            <div className="flex gap-1 shrink-0 pt-0.5">
              {diceExample.map((d, i) => (
                <DieFace
                  key={i}
                  value={d}
                  variant={d === 0 ? 'wildcard' : 'highlighted'}
                  size="sm"
                />
              ))}
            </div>

            {/* Ability info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-800 dark:text-slate-100">
                  {ability.emoji} {ability.name}
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  {PATTERN_LABEL[pattern]}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{requirement}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium px-1.5 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Monster Card ─────────────────────────────────────────────────────────────

function MonsterCard({
  monster,
  playerLevel,
  dryStreak = 0,
  onFight,
}: {
  monster: MonsterDef;
  playerLevel: number;
  dryStreak?: number;
  onFight: (m: MonsterDef) => void;
}) {
  const emoji = MONSTER_EMOJI[monster.id] ?? '👾';
  const levelDiff = monster.level - playerLevel;
  const diffLabel = levelDiff <= -2 ? 'Easy' : levelDiff <= 1 ? 'Fair' : 'Hard';
  const diffColor =
    levelDiff <= -2 ? 'text-emerald-500' : levelDiff <= 1 ? 'text-amber-500' : 'text-red-500';
  const pityActive = dryStreak >= LEGENDARY_PITY_THRESHOLD;
  const pityBoostPct = pityActive
    ? Math.min(
        Math.round((dryStreak - LEGENDARY_PITY_THRESHOLD) * 0.02 * 100),
        Math.round((0.95 - 0.1) * 100), // visual cap based on a 10% base chance
      )
    : 0;
  // Difficulty-tinted border + glow so harder fights pop visually.
  const tierClass =
    levelDiff <= -2
      ? 'border-emerald-200/70 dark:border-emerald-900/60 hover:shadow-emerald-500/20'
      : levelDiff <= 1
        ? 'border-amber-200/70 dark:border-amber-900/60 hover:shadow-amber-500/20'
        : 'border-rose-300/70 dark:border-rose-800/70 hover:shadow-rose-500/30 shadow-rose-500/10';

  return (
    <div
      className={`bg-white dark:bg-slate-900 border-2 rounded-xl p-4 shadow-sm space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg group ${tierClass}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="transition-transform group-hover:scale-110 group-hover:-rotate-3">
            <EntityArt
              category="monster"
              id={monster.id}
              size="md"
              fallbackEmoji={emoji}
              ariaLabel={monster.name}
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">{monster.name}</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Level {monster.level} ·{' '}
              <span className={`font-medium ${diffColor}`}>{diffLabel}</span>
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-indigo-600 font-semibold">+{monster.xpReward} XP</p>
          <p className="text-xs text-amber-500 font-semibold">+{monster.goldReward} 💰</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-slate-400">{monster.description}</p>
      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-slate-500">
        <span>❤️ {monster.hp} HP</span>
        <span>⚔️ {monster.attack} ATK</span>
        <span>🛡️ {monster.defense} DEF</span>
      </div>
      {/* Hunting / pity badge — only shown when the player has fought this monster before */}
      {dryStreak > 0 && (
        <div
          className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 border ${
            pityActive
              ? 'bg-orange-50 border-orange-200 text-orange-700'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
          title={
            pityActive
              ? `Legendary drop chance is boosted +${pityBoostPct}% after ${dryStreak} dry kills`
              : `${LEGENDARY_PITY_THRESHOLD - dryStreak} more kills until legendary pity kicks in`
          }
        >
          <span>{pityActive ? '🔥' : '🎯'}</span>
          <span>
            Hunting · {dryStreak} kill{dryStreak !== 1 ? 's' : ''}
          </span>
          {pityActive && (
            <span className="ml-auto font-semibold text-orange-600">
              +{pityBoostPct}% legendary
            </span>
          )}
        </div>
      )}
      <button
        onClick={() => onFight(monster)}
        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:shadow-md hover:shadow-indigo-500/40 text-white text-sm font-bold py-2 rounded-lg transition-all active:scale-[0.98]"
      >
        Fight!
      </button>
    </div>
  );
}

// ─── Battle Results Modal ─────────────────────────────────────────────────────

function BattleResultsModal({
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="relative bg-gradient-to-br from-white dark:from-slate-900 via-indigo-50/40 dark:via-indigo-950/30 to-violet-50/60 dark:to-violet-950/20 backdrop-blur-sm border border-indigo-100 dark:border-indigo-900 rounded-2xl shadow-2xl shadow-indigo-500/30 w-full max-w-sm p-6 animate-[fadeIn_0.3s_ease-out] overflow-hidden">
        {/* Decorative blur orbs */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-12 w-40 h-40 rounded-full bg-indigo-300/30 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -left-12 w-40 h-40 rounded-full bg-violet-300/30 blur-3xl"
        />
        <div className="relative space-y-4">
          {/* Header */}
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

          {/* XP + Gold */}
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

          {/* Loot */}
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

          {/* Claim button */}
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

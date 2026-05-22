'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCharacter } from '@/hooks/useCharacter';
import { useCharacterStore } from '@/store/characterStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { useDungeonStore } from '@/store/dungeonStore';
import { MONSTER_CATALOG } from '@/lib/gameLogic/monsters';
import {
  DUNGEON_TIERS,
  DUNGEON_BOSSES,
  VENOMFANG_BRACER_ID,
  resolveStatCheckOptions,
  statCheckFailureDamage,
  checkVenomProc,
  applyVenomTick,
  createPoisonedStatus,
  initialEnrageState,
  evaluateBossEnrage,
  bossEffectiveAtk,
  applyNecroShield,
  dragonIgnoresDef,
  getWeekSeed,
} from '@/lib/gameLogic/dungeons';
import { claimDungeonRunCF } from '@/lib/functions';
import { ACHIEVEMENTS } from '@/lib/gameLogic/achievements';
import { toastAchievement } from '@/components/ui/Toaster';
import { fireConfetti } from '@/lib/confetti';
import type { AchievementId } from '@/types';
import type { ClaimDungeonRunResult } from '@/types/cloudFunctions';
import {
  calculateRound,
  rollRunAway,
  rollLoot,
  playerMaxHp,
  playerMaxStamina,
  playerMaxMagic,
} from '@/lib/gameLogic/combat';
import { getItemById, RARITY_BADGE, RARITY_CARD } from '@/lib/gameLogic/items';
import type {
  DungeonRoomType,
  MonsterDef,
  PoisonedStatus,
  BossEnrageState,
  DungeonRoomDef,
} from '@/types';

// ─── Types ─────────────────────────────────────────────────────────────────────

type RunPhase =
  | 'loading'
  | 'combat'
  | 'stat-check'
  | 'rest'
  | 'transition'
  | 'boss'
  | 'victory'
  | 'defeat';

interface RoomResult {
  xp: number;
  gold: number;
  items: string[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getMonsterById(monsterId: string): MonsterDef | undefined {
  return MONSTER_CATALOG.find((m) => m.id === monsterId);
}

function roomIcon(type: DungeonRoomType): string {
  if (type === 'combat') return '⚔';
  if (type === 'stat-check') return '🔍';
  if (type === 'rest') return '?';
  return '💀';
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function MiniBar({
  value,
  max,
  label,
  color,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const isLow = pct < 30;
  const isCritical = pct < 15;
  const barColor = isCritical ? 'bg-red-500' : isLow ? 'bg-amber-400' : color;
  return (
    <div className="flex-1">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-slate-400">{label}</span>
        <span
          className={`font-semibold ${isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-slate-300'}`}
        >
          {value}/{max}
        </span>
      </div>
      <div className="bg-slate-700 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ProgressChain({
  rooms,
  currentRoom,
  phase,
}: {
  rooms: DungeonRoomDef[];
  currentRoom: number;
  phase: RunPhase;
}) {
  return (
    <div className="flex items-center gap-1 justify-center flex-wrap py-2">
      {rooms.map((room, i) => {
        const isCleared = room.cleared;
        const isCurrent = i === currentRoom;
        const isDefeated = phase === 'defeat' && i === currentRoom;
        let nodeClass =
          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border';
        if (isDefeated) {
          nodeClass += ' bg-red-900 border-red-500 text-red-300';
        } else if (isCleared) {
          nodeClass += ' bg-green-900 border-green-600 text-green-300';
        } else if (isCurrent) {
          nodeClass +=
            room.type === 'boss'
              ? ' bg-orange-900 border-orange-500 text-orange-300 shadow-lg shadow-orange-900'
              : ' bg-indigo-700 border-indigo-400 text-white shadow-lg shadow-indigo-900';
        } else {
          nodeClass += ' bg-slate-800 border-slate-600 text-slate-500';
        }

        return (
          <div key={i} className="flex items-center gap-1">
            <div className={nodeClass}>{isCleared && !isDefeated ? '✓' : roomIcon(room.type)}</div>
            {i < rooms.length - 1 && <div className="w-2 h-0.5 bg-slate-700" />}
          </div>
        );
      })}
    </div>
  );
}

function LootCard({ itemId, index }: { itemId: string; index: number }) {
  const def = getItemById(itemId);
  if (!def) return null;
  const card = RARITY_CARD[def.rarity];
  const isLegendary = def.rarity === 'legendary';
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 border-2 ${card.border} ${
        card.glow ? `shadow-md ${card.glow}` : 'bg-slate-800'
      } ${isLegendary ? 'animate-pulse' : ''}`}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <span className="text-xs font-semibold text-slate-200">📦 {def.name}</span>
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${RARITY_BADGE[def.rarity]}`}
      >
        {def.rarity}
      </span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DungeonRunPage() {
  const router = useRouter();
  const { character } = useCharacter();
  const { fetchCharacter } = useCharacterStore();
  const { fetchInventory } = useInventoryStore();
  const { activeRun, fetchActiveRun, advanceRoom, completeRun, abandonRun } = useDungeonStore();

  // ── Local run state ────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<RunPhase>('loading');
  const [playerHp, setPlayerHp] = useState(0);
  const [playerStamina, setPlayerStamina] = useState(0);
  const [playerMagic, setPlayerMagic] = useState(0);
  const [monsterHp, setMonsterHp] = useState(0);
  const [poisoned, setPoisoned] = useState<PoisonedStatus | null>(null);
  const [enrageState, setEnrageState] = useState<BossEnrageState>(initialEnrageState());
  const [enrageMessage, setEnrageMessage] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [roomResult, setRoomResult] = useState<RoomResult>({ xp: 0, gold: 0, items: [] });
  const [claiming, setClaiming] = useState(false);
  const [fleeing, setFleeing] = useState(false);
  const [fleeFailed, setFleeFailed] = useState(false);
  const [returning, setReturning] = useState(false);
  const [acting, setActing] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimDungeonRunResult | null>(null);
  const [cumulativeXp, setCumulativeXp] = useState(0);
  const [cumulativeGold, setCumulativeGold] = useState(0);
  const [allItems, setAllItems] = useState<string[]>([]);

  const maxHp = character ? playerMaxHp(character) : 1;
  const maxSta = character ? playerMaxStamina(character) : 1;
  const maxMag = character ? playerMaxMagic(character) : 1;

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  const bootstrap = useCallback(async () => {
    if (!character) return;
    const run =
      activeRun ?? (await fetchActiveRun(character.uid), useDungeonStore.getState().activeRun);
    if (!run) {
      router.push('/combat/dungeons');
      return;
    }
    // Sync local HP/Stamina/Magic from the persisted run
    setPlayerHp(run.currentHp);
    setPlayerStamina(run.currentStamina);
    setPlayerMagic(run.currentMagic);
    setCumulativeXp(run.cumulativeXp);
    setCumulativeGold(run.cumulativeGold);
    setAllItems(run.allDroppedItems);

    const room = run.rooms[run.currentRoom];
    enterRoom(room.type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.uid]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  function enterRoom(type: DungeonRoomType) {
    if (!activeRun && !useDungeonStore.getState().activeRun) return;
    const run = activeRun ?? useDungeonStore.getState().activeRun!;
    const room = run.rooms[run.currentRoom];

    setLog([]);
    setRoomResult({ xp: 0, gold: 0, items: [] });
    setPoisoned(null);
    setEnrageState(initialEnrageState());
    setEnrageMessage(null);

    if (type === 'combat' || type === 'boss') {
      const monsterId = room.monsterId;
      const monsterDef =
        type === 'boss'
          ? DUNGEON_BOSSES[run.tierId]
          : monsterId
            ? getMonsterById(monsterId)
            : undefined;
      if (monsterDef) {
        setMonsterHp(monsterDef.hp);
      }
      setPhase(type === 'boss' ? 'boss' : 'combat');
    } else if (type === 'stat-check') {
      setPhase('stat-check');
    } else {
      setPhase('rest');
    }
  }

  // ── Combat helpers ─────────────────────────────────────────────────────────
  function getCurrentMonster(): MonsterDef | undefined {
    const run = activeRun ?? useDungeonStore.getState().activeRun;
    if (!run) return undefined;
    const room = run.rooms[run.currentRoom];
    if (room.type === 'boss') return DUNGEON_BOSSES[run.tierId];
    return room.monsterId ? getMonsterById(room.monsterId) : undefined;
  }

  async function handleAttack() {
    if (!character || !activeRun || acting) return;
    const run = activeRun;
    const room = run.rooms[run.currentRoom];
    const isBossRoom = room.type === 'boss';
    const monsterBase = getCurrentMonster();
    if (!monsterBase) return;

    setActing(true);

    let curMonsterHp = monsterHp;
    let curPoisoned = poisoned;
    let curEnrage = enrageState;
    let newLog = [...log];

    // Venom tick at start of round
    if (curPoisoned && curPoisoned.roundsRemaining > 0) {
      const { newMonsterHp, newPoisoned } = applyVenomTick(curMonsterHp, curPoisoned);
      const venomDmg = curMonsterHp - newMonsterHp;
      curMonsterHp = newMonsterHp;
      curPoisoned = newPoisoned.roundsRemaining > 0 ? newPoisoned : null;
      if (venomDmg > 0) {
        newLog = [`☠ Venom ticks for ${venomDmg} damage`, ...newLog];
      }
    }

    // Boss enrage: apply effective ATK
    const effectiveMonster: MonsterDef = isBossRoom
      ? { ...monsterBase, attack: bossEffectiveAtk(run.tierId, monsterBase.attack, curEnrage) }
      : monsterBase;

    // Dragon ignore-DEF: pass defense=0 to calculateRound
    const monsterForCalc: MonsterDef =
      isBossRoom && dragonIgnoresDef(curEnrage)
        ? { ...effectiveMonster, defense: 0 }
        : effectiveMonster;

    const roundResult = calculateRound(character, monsterForCalc, 'attack');
    let playerDmgToMonster = roundResult.playerDamage;

    // Necro shield: absorb incoming player damage
    let shieldNote = '';
    if (isBossRoom && curEnrage.triggered && curEnrage.necroShieldHp > 0) {
      const { absorbed, shieldHpLeft, damageToBoss } = applyNecroShield(
        playerDmgToMonster,
        curEnrage.necroShieldHp,
      );
      playerDmgToMonster = damageToBoss;
      curEnrage = { ...curEnrage, necroShieldHp: shieldHpLeft };
      if (absorbed > 0) shieldNote = ` (${absorbed} absorbed by shield)`;
    }

    const newMonsterHp = Math.max(0, curMonsterHp - playerDmgToMonster);
    const monsterDmgToPlayer = roundResult.monsterDamage;
    const newPlayerHp = Math.max(0, playerHp - monsterDmgToPlayer);

    // Venom proc after player attack
    if (!curPoisoned) {
      const hasVenom = character.equippedGear.accessory === VENOMFANG_BRACER_ID;
      if (checkVenomProc(hasVenom)) {
        curPoisoned = createPoisonedStatus();
        newLog = ['🕷 Venom applied!', ...newLog];
      }
    }

    // Boss enrage evaluation after damage
    if (isBossRoom) {
      const { next, message } = evaluateBossEnrage(
        run.tierId,
        newMonsterHp,
        monsterBase.hp,
        curEnrage,
      );
      curEnrage = next;
      if (message) setEnrageMessage(message);
    }

    newLog = [
      `⚔ You deal ${playerDmgToMonster} dmg${shieldNote} · Monster hits for ${monsterDmgToPlayer} dmg`,
      ...newLog,
    ];

    setMonsterHp(newMonsterHp);
    setPlayerHp(newPlayerHp);
    setPoisoned(curPoisoned);
    setEnrageState(curEnrage);
    setLog(newLog);

    if (newMonsterHp <= 0) {
      // Monster dead — roll loot
      const tier = DUNGEON_TIERS[run.tierId];
      const rawLootTable = isBossRoom
        ? DUNGEON_BOSSES[run.tierId].bossLootTable
        : monsterBase.lootTable;
      // Strip legendaries from boss loot when the player is on their 2nd run today
      const lootTable =
        isBossRoom && !run.legendaryEligible
          ? rawLootTable.filter(({ itemId }) => getItemById(itemId)?.rarity !== 'legendary')
          : rawLootTable;
      const dropped = rollLoot(lootTable);
      const xp = Math.round(monsterBase.xpReward * tier.xpMultiplier);
      const gold = monsterBase.goldReward;

      const updatedRooms = run.rooms.map((r, i) =>
        i === run.currentRoom
          ? { ...r, cleared: true, lootAwarded: dropped, xpAwarded: xp, goldAwarded: gold }
          : r,
      );

      await advanceRoom({
        clearedRooms: updatedRooms,
        newHp: newPlayerHp,
        newStamina: playerStamina,
        newMagic: playerMagic,
        xpEarned: xp,
        goldEarned: gold,
        itemsDropped: dropped,
      });

      const newCumXp = cumulativeXp + xp;
      const newCumGold = cumulativeGold + gold;
      const newAllItems = [...allItems, ...dropped];
      setCumulativeXp(newCumXp);
      setCumulativeGold(newCumGold);
      setAllItems(newAllItems);
      setRoomResult({ xp, gold, items: dropped });

      if (isBossRoom) {
        setPhase('victory');
      } else {
        setPhase('transition');
      }
    } else if (newPlayerHp <= 0) {
      // Don't call abandonRun here — that nulls activeRun and prevents the
      // defeat screen from rendering. Move cleanup to the "Return" button.
      setPhase('defeat');
    }

    setActing(false);
  }

  async function handleStatCheckPass() {
    if (!character || !activeRun || acting) return;
    const run = activeRun;
    setActing(true);

    const updatedRooms = run.rooms.map((r, i) =>
      i === run.currentRoom ? { ...r, cleared: true } : r,
    );

    await advanceRoom({
      clearedRooms: updatedRooms,
      newHp: playerHp,
      newStamina: playerStamina,
      newMagic: playerMagic,
      xpEarned: 0,
      goldEarned: 0,
      itemsDropped: [],
    });

    setRoomResult({ xp: 0, gold: 0, items: [] });
    setPhase('transition');
    setActing(false);
  }

  async function handleStatCheckFail() {
    if (!character || !activeRun || acting) return;
    const run = activeRun;
    setActing(true);

    const dmg = statCheckFailureDamage(run.tierId, maxHp);
    const newHp = Math.max(0, playerHp - dmg);
    setPlayerHp(newHp);

    const updatedRooms = run.rooms.map((r, i) =>
      i === run.currentRoom ? { ...r, cleared: true } : r,
    );

    if (newHp <= 0) {
      // Don't call abandonRun here — that nulls activeRun and prevents the
      // defeat screen from rendering. Move cleanup to the "Return" button.
      setPhase('defeat');
      setActing(false);
      return;
    }

    await advanceRoom({
      clearedRooms: updatedRooms,
      newHp: newHp,
      newStamina: playerStamina,
      newMagic: playerMagic,
      xpEarned: 0,
      goldEarned: 0,
      itemsDropped: [],
    });

    setRoomResult({ xp: 0, gold: 0, items: [] });
    setLog([`💥 Stat check failed — ${dmg} HP damage!`]);
    setPhase('transition');
    setActing(false);
  }

  async function handleRestContinue() {
    if (!character || !activeRun || acting) return;
    const run = activeRun;
    setActing(true);

    const staRestore = Math.round(maxSta * 0.3);
    const magRestore = Math.round(maxMag * 0.3);
    const newSta = Math.min(playerStamina + staRestore, maxSta);
    const newMag = Math.min(playerMagic + magRestore, maxMag);
    setPlayerStamina(newSta);
    setPlayerMagic(newMag);

    const updatedRooms = run.rooms.map((r, i) =>
      i === run.currentRoom ? { ...r, cleared: true } : r,
    );

    await advanceRoom({
      clearedRooms: updatedRooms,
      newHp: playerHp,
      newStamina: newSta,
      newMagic: newMag,
      xpEarned: 0,
      goldEarned: 0,
      itemsDropped: [],
    });

    setRoomResult({ xp: 0, gold: 0, items: [] });
    setLog([`🌿 Rested — +${staRestore} Stamina, +${magRestore} Magic`]);
    setPhase('transition');
    setActing(false);
  }

  function handleAdvanceToNextRoom() {
    const run = useDungeonStore.getState().activeRun;
    if (!run) return;
    const nextRoom = run.rooms[run.currentRoom];
    // currentRoom was already bumped by advanceRoom in the store
    enterRoom(nextRoom.type);
  }

  async function handleRetreat() {
    if (!character || !activeRun || claiming) return;
    if (activeRun.claimed) {
      router.push('/combat/dungeons');
      return;
    }
    setClaiming(true);
    try {
      await claimDungeonRunCF(activeRun.id, false, 'completed');
      await Promise.all([fetchCharacter(character.uid, true), fetchInventory(character.uid)]);
      await completeRun(character.uid, false);
      router.push('/combat/dungeons');
    } finally {
      setClaiming(false);
    }
  }

  async function handleFlee() {
    if (!character || !activeRun || acting || claiming || fleeing) return;
    const monster = getCurrentMonster();
    if (!monster) return;

    const { escaped, monsterDamage } = rollRunAway(character, monster);

    if (!escaped) {
      const newHp = Math.max(0, playerHp - monsterDamage);
      setPlayerHp(newHp);
      setLog([`💨 Flee failed! ${monster.name} strikes for ${monsterDamage} dmg.`, ...log]);
      setFleeFailed(true);
      setTimeout(() => setFleeFailed(false), 700);
      if (newHp <= 0) setPhase('defeat');
      return;
    }

    setFleeing(true);
    try {
      if (!activeRun.claimed) {
        await claimDungeonRunCF(activeRun.id, false, 'completed');
        await Promise.all([fetchCharacter(character.uid, true), fetchInventory(character.uid)]);
      }
      await completeRun(character.uid, false);
      router.push('/combat/dungeons');
    } finally {
      setFleeing(false);
    }
  }

  async function handleClaimVictory() {
    if (!character || !activeRun || claiming) return;
    if (activeRun.claimed) {
      router.push('/combat/dungeons');
      return;
    }
    setClaiming(true);
    const legendaryUsed = activeRun.legendaryEligible;
    try {
      const result = await claimDungeonRunCF(activeRun.id, legendaryUsed, 'completed');
      await Promise.all([fetchCharacter(character.uid, true), fetchInventory(character.uid)]);
      await completeRun(character.uid, legendaryUsed);

      fireConfetti(legendaryUsed ? 'legendary' : 'celebration');

      // Achievement badges + gold were awarded atomically by the CF.
      // fetchCharacter above already reflects the updated state; just fire toasts.
      for (const id of result.newAchievements) {
        const def = ACHIEVEMENTS[id as AchievementId];
        if (def) toastAchievement(def.emoji, def.name, def.goldReward);
      }

      if (result.leveledUp || result.newAchievements.length > 0) {
        setClaimResult(result);
      } else {
        router.push('/combat/dungeons');
      }
    } finally {
      setClaiming(false);
    }
  }

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!character) return null;

  const run = activeRun;

  if (phase === 'loading' || !run) {
    return (
      <div className="min-h-screen bg-slate-900 p-4 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading dungeon…</div>
      </div>
    );
  }

  const tier = DUNGEON_TIERS[run.tierId];
  const currentRoom = run.rooms[run.currentRoom];
  const isLastRoom = run.currentRoom === run.rooms.length - 1;

  // ── Defeat ─────────────────────────────────────────────────────────────────
  if (phase === 'defeat') {
    return (
      <div className="min-h-screen bg-slate-900 p-4 pb-24">
        <div className="bg-red-950 border border-red-800 rounded-xl p-5 text-center mb-4">
          <div className="text-4xl mb-2">💀</div>
          <div className="text-2xl font-bold text-red-400 mb-1">You Fell</div>
          <div className="text-red-300 text-sm">
            In Room {run.currentRoom + 1} of {tier.name}
          </div>
        </div>

        <ProgressChain rooms={run.rooms} currentRoom={run.currentRoom} phase="defeat" />

        <div className="bg-slate-800 rounded-xl p-4 mb-4 text-center">
          <div className="text-slate-400 text-xs mb-2">
            Rewards from cleared rooms are still yours.
          </div>
          <div className="flex justify-center gap-6">
            <div>
              <div className="text-indigo-400 font-bold text-lg">{cumulativeXp}</div>
              <div className="text-slate-500 text-xs">XP Saved</div>
            </div>
            <div>
              <div className="text-yellow-400 font-bold text-lg">{cumulativeGold}</div>
              <div className="text-slate-500 text-xs">Gold Saved</div>
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            if (!character || returning) return;
            setReturning(true);
            try {
              if (!activeRun?.claimed) {
                await claimDungeonRunCF(activeRun!.id, false, 'abandoned');
                await Promise.all([
                  fetchCharacter(character.uid, true),
                  fetchInventory(character.uid),
                ]);
              }
              await abandonRun(character.uid);
              router.push('/combat/dungeons');
            } finally {
              setReturning(false);
            }
          }}
          disabled={returning}
          className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 font-semibold py-4 rounded-xl transition-colors"
        >
          {returning ? 'Saving rewards…' : 'Return to Dungeons'}
        </button>
      </div>
    );
  }

  // ── Boss Victory ──────────────────────────────────────────────────────────
  if (phase === 'victory') {
    const boss = DUNGEON_BOSSES[run.tierId];
    return (
      <div className="min-h-screen bg-slate-900 p-4 pb-24">
        <div className="bg-gradient-to-br from-orange-950 to-amber-950 border border-orange-700 rounded-xl p-5 text-center mb-4">
          <div className="text-4xl mb-2">🏆</div>
          <div className="text-2xl font-bold text-orange-300 mb-1">CLEARED</div>
          <div className="text-orange-200 text-sm font-semibold">{boss.name} defeated</div>
          <div className="text-orange-400 text-xs mt-1">{tier.name}</div>
        </div>

        {/* Run summary */}
        <div className="bg-slate-800 rounded-xl p-4 mb-4">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
            Run Summary
          </div>
          <div className="flex gap-4 mb-3">
            <div className="flex-1 text-center">
              <div className="text-indigo-400 font-bold text-xl">{cumulativeXp}</div>
              <div className="text-slate-500 text-xs">Total XP</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-yellow-400 font-bold text-xl">
                {claimResult ? claimResult.gold : cumulativeGold}
              </div>
              <div className="text-slate-500 text-xs">Total Gold</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-slate-300 font-bold text-xl">{run.rooms.length}</div>
              <div className="text-slate-500 text-xs">Rooms</div>
            </div>
          </div>

          {/* Gold breakdown — visible after claiming when achievements added bonus gold */}
          {claimResult != null && claimResult.achievementGold > 0 && (
            <div className="flex items-center justify-center gap-2 text-xs mb-3 border-t border-slate-700 pt-2">
              <span className="text-slate-500">
                Dungeon{' '}
                <span className="text-yellow-500 font-semibold">
                  {claimResult.gold - claimResult.achievementGold}g
                </span>
              </span>
              <span className="text-slate-600">+</span>
              <span className="text-slate-500">
                Achievements{' '}
                <span className="text-amber-400 font-semibold">{claimResult.achievementGold}g</span>
              </span>
            </div>
          )}

          {allItems.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">
                Loot Earned
              </div>
              {allItems.map((itemId, i) => (
                <LootCard key={`${itemId}-${i}`} itemId={itemId} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Legendary eligibility */}
        <div className="bg-slate-800 rounded-xl p-3 mb-4 text-center">
          {run.legendaryEligible ? (
            <span className="text-yellow-400 text-sm font-semibold">
              ★ Legendary loot was eligible this run
            </span>
          ) : (
            <span className="text-slate-500 text-sm">
              Legendary loot was locked (2nd run today)
            </span>
          )}
        </div>

        {/* Level-up banner — shown after claiming if the run triggered a level-up */}
        {claimResult?.leveledUp && (
          <div className="bg-gradient-to-br from-yellow-900 to-amber-950 border-2 border-yellow-500 rounded-xl p-5 mb-4 text-center">
            <div className="text-4xl mb-1">⬆</div>
            <div className="text-2xl font-bold text-yellow-300">LEVEL UP!</div>
            <div className="text-yellow-400 text-sm mt-1">You are now Level {character.level}</div>
          </div>
        )}

        {claimResult ? (
          <button
            onClick={() => router.push('/combat/dungeons')}
            className="w-full py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-base transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleClaimVictory}
            disabled={claiming}
            className="w-full py-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-base transition-colors"
          >
            {claiming ? 'Claiming…' : 'Claim Rewards'}
          </button>
        )}
      </div>
    );
  }

  // ── Active run view ────────────────────────────────────────────────────────
  const monster = phase === 'combat' || phase === 'boss' ? getCurrentMonster() : undefined;

  return (
    <div className="min-h-screen bg-slate-900 p-4 pb-24">
      {/* Progress chain */}
      <ProgressChain rooms={run.rooms} currentRoom={run.currentRoom} phase={phase} />

      {/* Room context strip */}
      <div className="text-center text-slate-400 text-xs mb-1">
        Room {run.currentRoom + 1} of {run.rooms.length} · {tier.name}
      </div>

      {/* Enrage strip */}
      {enrageMessage && (
        <div className="bg-red-950 border border-red-700 rounded-lg px-3 py-2 text-center mb-2">
          <span className="text-red-300 text-xs font-bold">🔥 {enrageMessage}</span>
        </div>
      )}

      {/* Resource bars */}
      <div className="bg-slate-800 rounded-xl p-3 mb-4 flex gap-3">
        <MiniBar value={playerHp} max={maxHp} label="❤ HP" color="bg-red-500" />
        <MiniBar value={playerStamina} max={maxSta} label="⚡ STA" color="bg-orange-500" />
        <MiniBar value={playerMagic} max={maxMag} label="✨ MAG" color="bg-indigo-500" />
      </div>

      {/* ── Combat / Boss room ─────────────────────────────────────────────────── */}
      {(phase === 'combat' || phase === 'boss') && monster && (
        <div className="space-y-4">
          {/* Monster card */}
          <div
            className={`rounded-xl p-4 border ${
              phase === 'boss'
                ? 'bg-gradient-to-br from-orange-950 to-slate-900 border-orange-800'
                : 'bg-slate-800 border-slate-700'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div
                  className={`font-bold text-sm ${phase === 'boss' ? 'text-orange-300' : 'text-slate-200'}`}
                >
                  {phase === 'boss' ? '💀 BOSS · ' : ''}
                  {monster.name}
                </div>
                <div className="text-slate-500 text-xs">Lv. {monster.level}</div>
              </div>
              {poisoned && poisoned.roundsRemaining > 0 && (
                <span className="text-green-400 text-xs bg-green-950 px-2 py-0.5 rounded-full border border-green-800">
                  ☠ Poisoned ({poisoned.roundsRemaining})
                </span>
              )}
            </div>
            {/* Monster HP bar */}
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-400">HP</span>
              <span className="text-slate-400">
                {monsterHp}/{monster.hp}
              </span>
            </div>
            <div className="bg-slate-700 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-slate-400 transition-all"
                style={{ width: `${Math.min(100, Math.round((monsterHp / monster.hp) * 100))}%` }}
              />
            </div>
          </div>

          {/* Battle log */}
          {log.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 max-h-32 overflow-y-auto">
              {log.map((entry, i) => (
                <div key={i} className="text-slate-400 text-xs py-0.5">
                  {entry}
                </div>
              ))}
            </div>
          )}

          {/* Combat actions */}
          <div className={phase === 'boss' ? '' : 'grid grid-cols-2 gap-3'}>
            <button
              onClick={handleAttack}
              disabled={acting || fleeing}
              className={`py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-base transition-colors ${phase === 'boss' ? 'w-full' : ''}`}
            >
              {acting ? 'Rolling…' : '⚔ Attack'}
            </button>
            {phase !== 'boss' && (
              <button
                onClick={handleFlee}
                disabled={acting || fleeing}
                className={`py-4 rounded-xl disabled:opacity-50 font-semibold text-sm transition-all duration-200 ${
                  fleeFailed
                    ? 'bg-red-900 ring-2 ring-red-500 text-red-300'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {fleeing ? 'Fleeing…' : '💨 Flee'}
              </button>
            )}
          </div>
          {phase !== 'boss' && (
            <p className="text-slate-600 text-xs text-center -mt-1">
              Flee uses Agility — may fail, monster gets a hit
            </p>
          )}
        </div>
      )}

      {/* ── Stat check room ───────────────────────────────────────────────────── */}
      {phase === 'stat-check' && character && (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-amber-900 rounded-xl p-4">
            <div className="text-amber-400 text-sm font-bold mb-1">🔍 Stat Check</div>
            <div className="text-slate-400 text-xs mb-4">
              Choose your path. Passing requires meeting the stat threshold.
            </div>

            <div className="space-y-2">
              {resolveStatCheckOptions(
                run.tierId,
                character,
                run.currentRoom * 100 + run.weekSeed,
              ).map((opt) => (
                <button
                  key={opt.path}
                  onClick={
                    opt.passes
                      ? handleStatCheckPass
                      : opt.isAttemptAnyway
                        ? handleStatCheckFail
                        : undefined
                  }
                  disabled={(!opt.passes && !opt.isAttemptAnyway) || acting}
                  className={`w-full text-left rounded-lg px-4 py-3 border transition-colors ${
                    opt.passes
                      ? 'bg-green-950 border-green-700 hover:bg-green-900'
                      : opt.isAttemptAnyway
                        ? 'bg-amber-950 border-amber-800 hover:bg-amber-900'
                        : 'bg-slate-700 border-slate-600 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div
                        className={`text-sm font-semibold ${
                          opt.passes
                            ? 'text-green-300'
                            : opt.isAttemptAnyway
                              ? 'text-amber-300'
                              : 'text-slate-500'
                        }`}
                      >
                        {opt.label}
                      </div>
                      <div className="text-slate-400 text-xs mt-0.5">
                        {opt.path.toUpperCase()} · Need {opt.threshold} · You have {opt.playerStat}
                      </div>
                    </div>
                    <div
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        opt.passes
                          ? 'bg-green-900 text-green-400'
                          : opt.isAttemptAnyway
                            ? 'bg-amber-900 text-amber-400'
                            : 'bg-slate-600 text-slate-400'
                      }`}
                    >
                      {opt.passes ? 'PASS' : opt.isAttemptAnyway ? 'ATTEMPT' : 'FAIL'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Rest room ─────────────────────────────────────────────────────────── */}
      {phase === 'rest' && (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-green-900 rounded-xl p-5 text-center">
            <div className="text-3xl mb-2">🌿</div>
            <div className="text-green-300 font-bold text-sm mb-1">Rest Site</div>
            <div className="text-slate-400 text-xs mb-4">
              Take a moment to recover. Restores 30% Stamina and 30% Magic.
            </div>
            <div className="flex justify-center gap-6 mb-4">
              <div className="text-center">
                <div className="text-orange-400 font-bold">+{Math.round(maxSta * 0.3)}</div>
                <div className="text-slate-500 text-xs">Stamina</div>
              </div>
              <div className="text-center">
                <div className="text-indigo-400 font-bold">+{Math.round(maxMag * 0.3)}</div>
                <div className="text-slate-500 text-xs">Magic</div>
              </div>
            </div>
            <button
              onClick={handleRestContinue}
              disabled={acting}
              className="w-full py-3 rounded-xl bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-semibold transition-colors"
            >
              {acting ? 'Resting…' : '🌿 Rest & Continue'}
            </button>
          </div>
        </div>
      )}

      {/* ── Transition interstitial ───────────────────────────────────────────── */}
      {phase === 'transition' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="text-green-400 text-xs font-bold uppercase tracking-wide mb-2">
              ✓ Room Cleared
            </div>

            {/* Room result */}
            {(roomResult.xp > 0 || roomResult.gold > 0) && (
              <div className="flex gap-3 mb-3">
                {roomResult.xp > 0 && (
                  <div className="flex-1 bg-indigo-950 rounded-lg p-2 text-center">
                    <div className="text-indigo-400 font-bold">+{roomResult.xp}</div>
                    <div className="text-slate-500 text-xs">XP</div>
                  </div>
                )}
                {roomResult.gold > 0 && (
                  <div className="flex-1 bg-amber-950 rounded-lg p-2 text-center">
                    <div className="text-yellow-400 font-bold">+{roomResult.gold}</div>
                    <div className="text-slate-500 text-xs">Gold</div>
                  </div>
                )}
              </div>
            )}

            {/* Loot from this room */}
            {roomResult.items.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {roomResult.items.map((itemId, i) => (
                  <LootCard key={`${itemId}-${i}`} itemId={itemId} index={i} />
                ))}
              </div>
            )}

            {/* Log note (e.g. stat check failure damage) */}
            {log.length > 0 && (
              <div className="bg-slate-900 rounded-lg px-3 py-2 mb-3">
                {log.map((entry, i) => (
                  <div key={i} className="text-slate-400 text-xs">
                    {entry}
                  </div>
                ))}
              </div>
            )}

            {/* Running totals */}
            <div className="text-slate-500 text-xs text-center mb-1">
              Run total: {cumulativeXp} XP · {cumulativeGold} Gold
            </div>
          </div>

          {/* HP/Stamina/Magic mini-bars */}
          <div className="bg-slate-800 rounded-xl p-3 flex gap-3">
            <MiniBar value={playerHp} max={maxHp} label="❤ HP" color="bg-red-500" />
            <MiniBar value={playerStamina} max={maxSta} label="⚡ STA" color="bg-orange-500" />
            <MiniBar value={playerMagic} max={maxMag} label="✨ MAG" color="bg-indigo-500" />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleRetreat}
              disabled={claiming}
              className="py-3 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 font-semibold text-sm transition-colors"
            >
              {claiming ? 'Retreating…' : '↩ Retreat with Loot'}
            </button>
            {!isLastRoom ? (
              <button
                onClick={handleAdvanceToNextRoom}
                disabled={claiming}
                className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
              >
                Advance →
              </button>
            ) : (
              <button
                disabled
                className="py-3 rounded-xl bg-slate-700 text-slate-500 font-semibold text-sm cursor-not-allowed"
              >
                End of Run
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCharacter } from '@/hooks/useCharacter';
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
} from '@/lib/gameLogic/dungeons';
import { claimDungeonRunCF } from '@/lib/functions';
import { ACHIEVEMENTS } from '@/lib/gameLogic/achievements';
import { toast, toastAchievement } from '@/components/ui/Toaster';
import { fireConfetti } from '@/lib/confetti';
import { playSound } from '@/hooks/useSound';
import type { AchievementId } from '@/types';
import type { ClaimDungeonRunResult } from '@/types/cloudFunctions';
import {
  rollLoot,
  playerMaxHp,
  playerMaxStamina,
  playerMaxMagic,
  gearDefenseBonus,
} from '@/lib/gameLogic/combat';
import { getItemById, RARITY_BADGE, RARITY_CARD } from '@/lib/gameLogic/items';
import { CombatArena } from '@/components/combat/CombatArena';
import { CombatActionBar } from '@/components/combat/CombatActionBar';
import { HpBar } from '@/components/combat/HpBar';
import { LastActionSummary } from '@/components/combat/LastActionSummary';
import { BattleLogEntry } from '@/components/combat/BattleLogEntry';
import { ActionRollOverlay } from '@/components/combat/overlays/ActionRollOverlay';
import { DiceRollOverlay } from '@/components/combat/overlays/DiceRollOverlay';
import { SpellRollOverlay } from '@/components/combat/overlays/SpellRollOverlay';
import { useCombatEncounter } from '@/hooks/useCombatEncounter';
import { useCombatStore } from '@/store/combatStore';
import { refreshPlayerState } from '@/lib/refreshPlayerState';
import { getStreakLootMultiplier } from '@/lib/gameLogic/streaks';
import { CLASS_DEFINITIONS } from '@/lib/gameLogic/constants';
import type {
  DungeonRoomType,
  MonsterDef,
  PoisonedStatus,
  BossEnrageState,
  DungeonRoomDef,
} from '@/types';
import type { CombatModifiers, FightState } from '@/components/combat/types';

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
      } ${isLegendary ? 'animate-legendary-glow' : ''}`}
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

// ─── Combat phase shell — mounted when phase is 'combat' or 'boss' ────────────

interface DungeonCombatShellProps {
  monster: MonsterDef;
  isBossRoom: boolean;
  character: NonNullable<ReturnType<typeof useCharacter>['character']>;
  maxHp: number;
  maxStamina: number;
  maxMagic: number;
  initialHp: number;
  initialStamina: number;
  initialMagic: number;
  /** Notified each round so the dungeon page can mirror values for the resource strip. */
  onResourceMirror: (snapshot: { hp: number; stamina: number; magic: number }) => void;
  onVictory: (ctx: {
    droppedItems: string[];
    finalHp: number;
    finalStamina: number;
    finalMagic: number;
  }) => Promise<void>;
  onDefeat: (ctx: { finalHp: number; finalStamina: number; finalMagic: number }) => void;
  onFlee: (ctx: { finalHp: number; finalStamina: number; finalMagic: number }) => Promise<void>;
}

/**
 * Dungeon combat encounter — full action parity with the arena, with
 * dungeon-specific Venom DoT + boss enrage layered in via `CombatModifiers`.
 *
 * The shell is keyed on the active monster so per-encounter state (FightState,
 * enrage, venom) resets cleanly between rooms.
 */
function DungeonCombatShell({
  monster,
  isBossRoom,
  character,
  maxHp,
  maxStamina,
  maxMagic,
  initialHp,
  initialStamina,
  initialMagic,
  onResourceMirror,
  onVictory,
  onDefeat,
  onFlee,
}: DungeonCombatShellProps) {
  const inventoryItems = useInventoryStore((s) => s.items);
  const consumeItem = useInventoryStore((s) => s.useConsumable);

  const [poisoned, setPoisoned] = useState<PoisonedStatus | null>(null);
  const [enrageState, setEnrageState] = useState<BossEnrageState>(() => initialEnrageState());
  const [enrageBanner, setEnrageBanner] = useState<string | null>(null);
  const [showSpellPanel, setShowSpellPanel] = useState(false);
  const [showItemPanel, setShowItemPanel] = useState(false);

  const equippedSpells = useMemo(
    () =>
      inventoryItems
        .filter((i) => i.equipped)
        .map((i) => ({ invItem: i, def: getItemById(i.itemDefId) }))
        .filter((x) => x.def?.type === 'spell' && x.def.spellMechanics !== undefined),
    [inventoryItems],
  );
  const consumables = useMemo(
    () =>
      inventoryItems.filter((i) => {
        const def = getItemById(i.itemDefId);
        return def?.type === 'consumable' && i.equipped;
      }),
    [inventoryItems],
  );

  // Loot multiplier (streak) — applies to monster drops inside dungeons too
  const streakMultiplier = getStreakLootMultiplier(character.streakData?.currentStreak ?? 0);
  // Dungeons don't use the legendary-pity counter (loot is filtered by tier),
  // so always return 0.
  const getPityFor = useCallback(() => 0, []);

  // Stable reference to the latest state slices for the modifiers closure.
  // Modifier hooks read from these on every action — must capture latest.
  const modifiers = useMemo<CombatModifiers>(() => {
    const tierId = isBossRoom
      ? (Object.keys(DUNGEON_BOSSES) as Array<keyof typeof DUNGEON_BOSSES>).find(
          (k) => DUNGEON_BOSSES[k].id === monster.id,
        )
      : undefined;

    return {
      preActionTick: (state: FightState) => {
        if (!poisoned || poisoned.roundsRemaining <= 0) return { state };
        const { newMonsterHp, newPoisoned } = applyVenomTick(state.monsterHp, poisoned);
        const venomDmg = state.monsterHp - newMonsterHp;
        setPoisoned(newPoisoned.roundsRemaining > 0 ? newPoisoned : null);
        return {
          state: { ...state, monsterHp: newMonsterHp },
          log: venomDmg > 0 ? `☠ Venom ticks for ${venomDmg} damage` : undefined,
        };
      },

      effectiveMonster: (base: MonsterDef) => {
        if (!isBossRoom || !tierId) return base;
        const atk = bossEffectiveAtk(tierId, base.attack, enrageState);
        const def = dragonIgnoresDef(enrageState) ? 0 : base.defense;
        return { ...base, attack: atk, defense: def };
      },

      absorbPlayerDamage: (damage: number) => {
        if (!isBossRoom || !enrageState.triggered || enrageState.necroShieldHp <= 0) {
          return { damage };
        }
        const { absorbed, shieldHpLeft, damageToBoss } = applyNecroShield(
          damage,
          enrageState.necroShieldHp,
        );
        if (shieldHpLeft !== enrageState.necroShieldHp) {
          setEnrageState((prev) => ({ ...prev, necroShieldHp: shieldHpLeft }));
        }
        return {
          damage: damageToBoss,
          log: absorbed > 0 ? `🛡 Shield absorbed ${absorbed} damage` : undefined,
        };
      },

      postRoundHook: (state: FightState, ctx) => {
        let logLine: string | undefined;
        let banner: string | undefined;

        // Venom proc — only on direct attack (matches legacy dungeon behaviour)
        if (ctx.actionKind === 'attack' && !poisoned) {
          const hasVenom = character.equippedGear.accessory === VENOMFANG_BRACER_ID;
          if (checkVenomProc(hasVenom)) {
            setPoisoned(createPoisonedStatus());
            logLine = '🕷 Venom applied!';
          }
        }

        // Boss enrage evaluation
        if (isBossRoom && tierId) {
          const { next, message } = evaluateBossEnrage(
            tierId,
            state.monsterHp,
            monster.hp,
            enrageState,
          );
          if (
            next.triggered !== enrageState.triggered ||
            next.necroShieldHp !== enrageState.necroShieldHp ||
            next.dragonIgnoreDefRoundsLeft !== enrageState.dragonIgnoreDefRoundsLeft
          ) {
            setEnrageState(next);
          }
          if (message) {
            banner = message;
          }
        }

        return { state, log: logLine, bannerMessage: banner };
      },

      fleeDisabled: isBossRoom,
    };
  }, [isBossRoom, monster.id, monster.hp, poisoned, enrageState, character.equippedGear.accessory]);

  const encounter = useCombatEncounter({
    monster,
    character,
    maxHp,
    maxStamina,
    maxMagic,
    initial: { hp: initialHp, stamina: initialStamina, magic: initialMagic },
    modifiers,
    streakMultiplier,
    getPityFor,
    consumeItem,
    onResourceChange: onResourceMirror,
    onVictory: async ({ droppedItems, finalHp, finalStamina, finalMagic }) => {
      await onVictory({ droppedItems, finalHp, finalStamina, finalMagic });
    },
    onDefeat: ({ finalHp, finalStamina, finalMagic }) => {
      onDefeat({ finalHp, finalStamina, finalMagic });
    },
    onFlee: async ({ finalHp, finalStamina, finalMagic }) => {
      await onFlee({ finalHp, finalStamina, finalMagic });
    },
    onBannerMessage: (msg) => setEnrageBanner(msg),
  });

  const { fightState, pending, bursts, expireBurst, usingItem, rollingAction, actions } = encounter;
  const playerEmoji = CLASS_DEFINITIONS[character.class].emoji;
  const playerDefStat = (character.stats.defense ?? 0) + gearDefenseBonus(character);
  const lastEntry = fightState.log[fightState.log.length - 1] ?? null;

  return (
    <div className="space-y-4">
      {enrageBanner && (
        <div className="bg-red-950 border border-red-700 rounded-lg px-3 py-2 text-center">
          <span className="text-red-300 text-xs font-bold">🔥 {enrageBanner}</span>
        </div>
      )}

      {/* Side-by-side battle portraits */}
      <CombatArena
        shakeKey={`${fightState.log.length}-${lastEntry?.playerDamage ?? 0}-${lastEntry?.monsterDamage ?? 0}`}
        bursts={bursts}
        onBurstExpired={expireBurst}
        player={{
          name: character.name,
          classId: character.class,
          emoji: playerEmoji,
          hp: fightState.playerHp,
          maxHp,
          defense: playerDefStat,
        }}
        monster={{
          name: isBossRoom ? `💀 ${monster.name}` : monster.name,
          id: monster.id,
          emoji: isBossRoom ? '🐲' : '👹',
          hp: fightState.monsterHp,
          maxHp: monster.hp,
          defense: monster.defense,
        }}
        monsterSub={
          poisoned && poisoned.roundsRemaining > 0 ? (
            <span className="text-emerald-300">☠ Poisoned ({poisoned.roundsRemaining})</span>
          ) : null
        }
      />

      {/* Player-only resources */}
      <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-3 space-y-2">
        <HpBar
          label="⚡ Stamina"
          current={fightState.playerStamina}
          max={maxStamina}
          color="bg-amber-400"
        />
        <HpBar
          label="✨ Magic"
          current={fightState.playerMagic}
          max={maxMagic}
          color="bg-violet-400"
        />
      </div>

      {/* Last roll summary */}
      {lastEntry && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
            Last Action — Round {lastEntry.round}
          </p>
          <LastActionSummary entry={lastEntry} monster={monster} />
        </div>
      )}

      {/* Battle log */}
      {fightState.log.length > 0 && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
            Battle Log · {fightState.log.length} {fightState.log.length === 1 ? 'round' : 'rounds'}
          </p>
          <ul className="space-y-3 max-h-52 overflow-y-auto pr-1">
            {[...fightState.log].reverse().map((entry) => (
              <BattleLogEntry
                key={entry.round}
                entry={entry}
                monster={monster}
                emoji={isBossRoom ? '🐲' : '👹'}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Actions — only while the encounter is live */}
      {fightState.outcome === null && (
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
          modifiers={modifiers}
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
          onDismiss={pending.ability.applyResult}
        />
      )}
      {pending.spell && (
        <SpellRollOverlay
          spellDef={pending.spell.spellDef}
          dice={pending.spell.dice}
          requirementMet={pending.spell.requirementMet}
          onDismiss={pending.spell.applyResult}
        />
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DungeonRunPage() {
  const router = useRouter();
  const { character } = useCharacter();
  const { activeRun, fetchActiveRun, advanceRoom, completeRun, abandonRun } = useDungeonStore();

  const [phase, setPhase] = useState<RunPhase>('loading');
  const [playerHp, setPlayerHp] = useState(0);
  const [playerStamina, setPlayerStamina] = useState(0);
  const [playerMagic, setPlayerMagic] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [roomResult, setRoomResult] = useState<RoomResult>({ xp: 0, gold: 0, items: [] });
  const [claiming, setClaiming] = useState(false);
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

  // Lock nav and guard page unload while a combat or boss room is active
  useEffect(() => {
    const active = phase === 'combat' || phase === 'boss';
    useCombatStore.getState().setCombatActive(active);
    if (!active) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [phase]);

  // Ensure the flag is cleared if the component unmounts mid-fight
  useEffect(() => {
    return () => useCombatStore.getState().setCombatActive(false);
  }, []);

  function enterRoom(type: DungeonRoomType) {
    setLog([]);
    setRoomResult({ xp: 0, gold: 0, items: [] });

    if (type === 'combat') setPhase('combat');
    else if (type === 'boss') setPhase('boss');
    else if (type === 'stat-check') setPhase('stat-check');
    else setPhase('rest');
  }

  function getCurrentMonster(): MonsterDef | undefined {
    const run = activeRun ?? useDungeonStore.getState().activeRun;
    if (!run) return undefined;
    const room = run.rooms[run.currentRoom];
    if (room.type === 'boss') return DUNGEON_BOSSES[run.tierId];
    return room.monsterId ? getMonsterById(room.monsterId) : undefined;
  }

  // ── Encounter callbacks (passed into DungeonCombatShell) ──────────────────

  const handleCombatVictory = useCallback(
    async (ctx: {
      droppedItems: string[];
      finalHp: number;
      finalStamina: number;
      finalMagic: number;
    }) => {
      const run = useDungeonStore.getState().activeRun;
      if (!character || !run) return;
      const room = run.rooms[run.currentRoom];
      const isBossRoom = room.type === 'boss';
      const monsterBase = isBossRoom
        ? DUNGEON_BOSSES[run.tierId]
        : room.monsterId
          ? getMonsterById(room.monsterId)
          : undefined;
      if (!monsterBase) return;

      // Tier-multiplied XP. Boss loot table is in the boss def; non-boss uses the monster's table.
      const tier = DUNGEON_TIERS[run.tierId];
      const rawLootTable = isBossRoom
        ? DUNGEON_BOSSES[run.tierId].bossLootTable
        : monsterBase.lootTable;
      const lootTable =
        isBossRoom && !run.legendaryEligible
          ? rawLootTable.filter(({ itemId }) => getItemById(itemId)?.rarity !== 'legendary')
          : rawLootTable;
      // Re-roll loot from the room's loot table — the hook drops items from the
      // monster's own table (typically empty for dungeon mobs), so we override
      // with the tier-aware boss/room table here. This matches legacy behaviour.
      const dropped = ctx.droppedItems.length > 0 ? ctx.droppedItems : rollLoot(lootTable);
      const xp = Math.round(monsterBase.xpReward * tier.xpMultiplier);
      const gold = monsterBase.goldReward;

      const updatedRooms = run.rooms.map((r, i) =>
        i === run.currentRoom
          ? { ...r, cleared: true, lootAwarded: dropped, xpAwarded: xp, goldAwarded: gold }
          : r,
      );

      await advanceRoom({
        clearedRooms: updatedRooms,
        newHp: ctx.finalHp,
        newStamina: ctx.finalStamina,
        newMagic: ctx.finalMagic,
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
      setPlayerHp(ctx.finalHp);
      setPlayerStamina(ctx.finalStamina);
      setPlayerMagic(ctx.finalMagic);

      if (isBossRoom) setPhase('victory');
      else setPhase('transition');
    },
    [character, advanceRoom, cumulativeXp, cumulativeGold, allItems],
  );

  const handleCombatDefeat = useCallback(
    (ctx: { finalHp: number; finalStamina: number; finalMagic: number }) => {
      setPlayerHp(ctx.finalHp);
      setPlayerStamina(ctx.finalStamina);
      setPlayerMagic(ctx.finalMagic);
      setPhase('defeat');
    },
    [],
  );

  const handleCombatFlee = useCallback(
    async (ctx: { finalHp: number; finalStamina: number; finalMagic: number }) => {
      if (!character) return;
      setPlayerHp(ctx.finalHp);
      setPlayerStamina(ctx.finalStamina);
      setPlayerMagic(ctx.finalMagic);
      const run = useDungeonStore.getState().activeRun;
      if (!run) {
        router.push('/combat/dungeons');
        return;
      }
      try {
        if (!run.claimed) {
          const result = await claimDungeonRunCF(run.id, false, 'completed');
          if (result.inventoryPartial) {
            toast.warning("Some loot didn't save — re-claim from the dungeon menu to retry.");
          }
          await refreshPlayerState(character.uid);
        }
        await completeRun(character.uid, false);
        router.push('/combat/dungeons');
      } catch (err) {
        console.error('[dungeon flee] claim failed', err);
      }
    },
    [character, completeRun, router],
  );

  // ── Non-combat room handlers ───────────────────────────────────────────────

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
      const result = await claimDungeonRunCF(activeRun.id, false, 'completed');
      if (result.inventoryPartial) {
        toast.warning("Some loot didn't save — re-claim from the dungeon menu to retry.");
      }
      await refreshPlayerState(character.uid);
      await completeRun(character.uid, false);
      router.push('/combat/dungeons');
    } catch (err) {
      console.error('[dungeon retreat] claim failed', err);
      toast.error('Failed to save retreat rewards — please try again.');
    } finally {
      setClaiming(false);
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
      if (result.inventoryPartial) {
        toast.warning("Some loot didn't save — re-claim from the dungeon menu to retry.");
      }
      await refreshPlayerState(character.uid);
      await completeRun(character.uid, legendaryUsed);

      fireConfetti(legendaryUsed ? 'legendary' : 'celebration');
      playSound(legendaryUsed ? 'legendary' : 'victory');

      for (const id of result.newAchievements) {
        const def = ACHIEVEMENTS[id as AchievementId];
        if (def) toastAchievement(def.emoji, def.name, def.goldReward);
      }

      if (result.leveledUp || result.newAchievements.length > 0) {
        setClaimResult(result);
      } else {
        router.push('/combat/dungeons');
      }
    } catch (err) {
      console.error('[dungeon claim victory] failed', err);
      toast.error('Failed to claim rewards — please try again.');
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
                const result = await claimDungeonRunCF(activeRun!.id, false, 'abandoned');
                if (result.inventoryPartial) {
                  toast.warning("Some loot didn't save — re-claim from the dungeon menu to retry.");
                }
                await refreshPlayerState(character.uid);
              }
              await abandonRun(character.uid);
              router.push('/combat/dungeons');
            } catch (err) {
              console.error('[dungeon defeat] claim failed', err);
              toast.error('Failed to save rewards — please try again.');
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
  const isBossRoom = currentRoom.type === 'boss';

  return (
    <div className="min-h-screen bg-slate-900 p-4 pb-24">
      <ProgressChain rooms={run.rooms} currentRoom={run.currentRoom} phase={phase} />

      <div className="text-center text-slate-400 text-xs mb-1">
        Room {run.currentRoom + 1} of {run.rooms.length} · {tier.name}
      </div>

      {/* Resource bars (HP/Stamina/Magic) — shown above combat shell */}
      <div className="bg-slate-800 rounded-xl p-3 mb-4 flex gap-3">
        <HpBar variant="mini" label="❤ HP" current={playerHp} max={maxHp} color="bg-red-500" />
        <HpBar
          variant="mini"
          label="⚡ STA"
          current={playerStamina}
          max={maxSta}
          color="bg-orange-500"
        />
        <HpBar
          variant="mini"
          label="✨ MAG"
          current={playerMagic}
          max={maxMag}
          color="bg-indigo-500"
        />
      </div>

      {/* ── Combat / Boss room ───────────────────────────────────────────── */}
      {(phase === 'combat' || phase === 'boss') && monster && (
        <DungeonCombatShell
          // key on monster id + room index so per-encounter state cleanly resets
          key={`${monster.id}-${run.currentRoom}`}
          monster={monster}
          isBossRoom={isBossRoom}
          character={character}
          maxHp={maxHp}
          maxStamina={maxSta}
          maxMagic={maxMag}
          initialHp={playerHp}
          initialStamina={playerStamina}
          initialMagic={playerMagic}
          onResourceMirror={({ hp, stamina, magic }) => {
            setPlayerHp(hp);
            setPlayerStamina(stamina);
            setPlayerMagic(magic);
          }}
          onVictory={handleCombatVictory}
          onDefeat={handleCombatDefeat}
          onFlee={handleCombatFlee}
        />
      )}

      {/* ── Stat check room ──────────────────────────────────────────────── */}
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

      {/* ── Rest room ────────────────────────────────────────────────────── */}
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

      {/* ── Transition interstitial ──────────────────────────────────────── */}
      {phase === 'transition' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="text-green-400 text-xs font-bold uppercase tracking-wide mb-2">
              ✓ Room Cleared
            </div>

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

            {roomResult.items.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {roomResult.items.map((itemId, i) => (
                  <LootCard key={`${itemId}-${i}`} itemId={itemId} index={i} />
                ))}
              </div>
            )}

            {log.length > 0 && (
              <div className="bg-slate-900 rounded-lg px-3 py-2 mb-3">
                {log.map((entry, i) => (
                  <div key={i} className="text-slate-400 text-xs">
                    {entry}
                  </div>
                ))}
              </div>
            )}

            <div className="text-slate-500 text-xs text-center mb-1">
              Run total: {cumulativeXp} XP · {cumulativeGold} Gold
            </div>
          </div>

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

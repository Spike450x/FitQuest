'use client';

/**
 * Combat encounter hook — owns `FightState`, pending-overlay state, and the
 * `actions.*` API used by both the arena page and the dungeon run page.
 *
 * The hook is store-agnostic: it calls `onResourceChange({ hp, stamina, magic })`
 * after every applied result so the page can mirror values into the character
 * store (arena) or local view state (dungeon). It NEVER calls Cloud Functions —
 * the page wires `onVictory` / `onDefeat` / `onFlee` to whichever claim path
 * the caller needs (`claimCombatVictoryCF` for arena, `advanceRoom` for
 * dungeon).
 *
 * Modifiers (venom DoT, boss enrage, Necro Shield, Dragon ignore-DEF) are
 * passed through `CombatModifiers` and injected into the resolvers — see
 * `src/lib/gameLogic/combatActions.ts` for the hook slots they fire in.
 *
 * IMPORTANT: `onResourceChange` is a *local mirror* signal. Do NOT use it to
 * trigger Firestore writes — combat rounds fire it many times per fight and
 * the per-round cadence would burn Firestore quota. Persistence belongs in
 * `onVictory` / `onDefeat` / `onFlee` (called exactly once per encounter).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCombatBursts } from '@/hooks/useCombatBursts';
import { playSound } from '@/hooks/useSound';
import {
  resolveAbilityAction,
  resolveAttackAction,
  resolveFleeAction,
  resolveMeditateAction,
  resolveRestAction,
  resolveSpellAction,
  resolveUseItemAction,
  type ActionInput,
  type ActionResolution,
} from '@/lib/gameLogic/combatActions';
import { getSpellMaxCharges } from '@/lib/gameLogic/spells';
import type { Character, ItemDef, MonsterDef } from '@/types';
import type {
  CombatModifiers,
  FightState,
  PendingAbility,
  PendingAction,
  PendingSpell,
} from '@/components/combat/types';

export type RollingActionKind = 'attack' | 'magic' | 'run' | 'ability' | 'rest' | 'meditate' | null;

export interface VictoryContext {
  droppedItems: string[];
  finalHp: number;
  finalStamina: number;
  finalMagic: number;
  monster: MonsterDef;
}

export interface DefeatContext {
  finalHp: number;
  finalStamina: number;
  finalMagic: number;
}

export interface FleeContext {
  finalHp: number;
  finalStamina: number;
  finalMagic: number;
}

export interface UseCombatEncounterOptions {
  monster: MonsterDef;
  character: Character;
  maxHp: number;
  maxStamina: number;
  maxMagic: number;
  initial?: { hp?: number; stamina?: number; magic?: number };
  /**
   * Starting charge-use counts keyed by inventory item id — used by the
   * dungeon page to restore per-room charge state from Firestore. Arena always
   * omits this (every fight starts with full charges).
   */
  initialChargesUsed?: Record<string, number>;
  modifiers?: CombatModifiers;
  streakMultiplier: number;
  getPityFor: (monsterId: string) => number;
  /**
   * Consume a stack of an inventory item and return how much of each stat was
   * gained. The hook awaits this when `actions.useItem` is called.
   */
  consumeItem: (
    invItemId: string,
    playerHp: number,
    maxHp: number,
    playerStamina: number,
    maxStamina: number,
    playerMagic: number,
    maxMagic: number,
  ) => Promise<{ hpGained: number; staminaGained: number; magicGained: number }>;
  /** Local mirror — runs every applyResult. Do NOT persist Firestore here. */
  onResourceChange?: (snapshot: { hp: number; stamina: number; magic: number }) => void;
  onVictory?: (ctx: VictoryContext) => void | Promise<void>;
  onDefeat?: (ctx: DefeatContext) => void | Promise<void>;
  onFlee?: (ctx: FleeContext) => void | Promise<void>;
  /** Emitted whenever a modifier returned a banner message (enrage trigger). */
  onBannerMessage?: (msg: string) => void;
}

export interface UseCombatEncounterReturn {
  fightState: FightState;
  rollingAction: RollingActionKind;
  pending: {
    action: PendingAction | null;
    ability: PendingAbility | null;
    spell: PendingSpell | null;
  };
  bursts: ReturnType<typeof useCombatBursts>['bursts'];
  expireBurst: (id: number) => void;
  usingItem: string | null;
  /** Charges used per inventory item id this encounter. Used by UI to render dots. */
  spellChargesUsed: Record<string, number>;
  actions: {
    attack: () => void;
    magic: () => void;
    rollAbility: () => void;
    /** `invItemId` is the InventoryItem.id — needed to track per-item charges. */
    castSpell: (spellDef: ItemDef, invItemId: string) => void;
    rest: () => void;
    meditate: () => void;
    useItem: (invItemId: string) => Promise<void>;
    flee: () => void;
  };
}

function makeInitialFightState(
  monster: MonsterDef,
  character: Character,
  maxHp: number,
  maxStamina: number,
  maxMagic: number,
  initial?: { hp?: number; stamina?: number; magic?: number },
): FightState {
  const startHp = initial?.hp ?? character.currentHp ?? maxHp;
  const startStamina = initial?.stamina ?? character.currentStamina ?? maxStamina;
  const startMagic = initial?.magic ?? character.currentMagic ?? maxMagic;
  return {
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
    activeUsed: false,
    monsterBonusAtk: 0,
    monsterBonusDef: 0,
  };
}

export function useCombatEncounter(opts: UseCombatEncounterOptions): UseCombatEncounterReturn {
  const {
    monster,
    character,
    maxHp,
    maxStamina,
    maxMagic,
    initial,
    initialChargesUsed,
    modifiers,
    streakMultiplier,
    getPityFor,
    consumeItem,
    onResourceChange,
    onVictory,
    onDefeat,
    onFlee,
    onBannerMessage,
  } = opts;

  const [fightState, setFightState] = useState<FightState>(() =>
    makeInitialFightState(monster, character, maxHp, maxStamina, maxMagic, initial),
  );
  const [rollingAction, setRollingAction] = useState<RollingActionKind>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [pendingAbility, setPendingAbility] = useState<PendingAbility | null>(null);
  const [pendingSpell, setPendingSpell] = useState<PendingSpell | null>(null);
  const [usingItem, setUsingItem] = useState<string | null>(null);

  // ── Spell charge tracking ──────────────────────────────────────────────────
  // Keyed by InventoryItem.id → number of charges used this encounter.
  // Resets to initialChargesUsed whenever the monster changes (i.e., new fight).
  const [spellChargesUsed, setSpellChargesUsed] = useState<Record<string, number>>(
    () => initialChargesUsed ?? {},
  );
  const prevMonsterIdRef = useRef(monster.id);
  useEffect(() => {
    if (monster.id !== prevMonsterIdRef.current) {
      prevMonsterIdRef.current = monster.id;
      setSpellChargesUsed(initialChargesUsed ?? {});
    }
  }, [monster.id, initialChargesUsed]);

  // Fire dice-rattle sound whenever any roll overlay opens
  useEffect(() => {
    if (pendingAction || pendingAbility || pendingSpell) {
      playSound('diceRolling');
    }
  }, [pendingAction, pendingAbility, pendingSpell]);

  const { bursts, expire } = useCombatBursts(fightState.log);

  function buildInput(): ActionInput {
    return {
      state: fightState,
      character,
      maxHp,
      maxStamina,
      maxMagic,
      streakMultiplier,
      getPityFor,
      modifiers,
    };
  }

  /** Commit a resolved action's nextState + fire callbacks. */
  async function commit(res: ActionResolution) {
    const { nextState, bannerMessage } = res;
    setFightState(nextState);
    onResourceChange?.({
      hp: nextState.playerHp,
      stamina: nextState.playerStamina,
      magic: nextState.playerMagic,
    });
    if (bannerMessage) onBannerMessage?.(bannerMessage);

    if (nextState.outcome === 'win') {
      await onVictory?.({
        droppedItems: nextState.droppedItems,
        finalHp: nextState.playerHp,
        finalStamina: nextState.playerStamina,
        finalMagic: nextState.playerMagic,
        monster: nextState.monster,
      });
    } else if (nextState.outcome === 'loss') {
      await onDefeat?.({
        finalHp: nextState.playerHp,
        finalStamina: nextState.playerStamina,
        finalMagic: nextState.playerMagic,
      });
    } else if (nextState.outcome === 'fled') {
      await onFlee?.({
        finalHp: nextState.playerHp,
        finalStamina: nextState.playerStamina,
        finalMagic: nextState.playerMagic,
      });
    }
  }

  function dispatch(res: ActionResolution, kind: RollingActionKind) {
    setRollingAction(kind);
    if (res.pending.kind === 'action') {
      setPendingAction({
        ...res.pending.payload,
        applyResult: async () => {
          setPendingAction(null);
          setRollingAction(null);
          await commit(res);
        },
      });
    } else if (res.pending.kind === 'ability') {
      setPendingAbility({
        ...res.pending.payload,
        applyResult: async () => {
          setPendingAbility(null);
          setRollingAction(null);
          await commit(res);
        },
      });
    } else if (res.pending.kind === 'spell') {
      setPendingSpell({
        ...res.pending.payload,
        applyResult: async () => {
          setPendingSpell(null);
          setRollingAction(null);
          await commit(res);
        },
      });
    } else {
      // Immediate apply, no overlay
      void commit(res).finally(() => setRollingAction(null));
    }
  }

  function attack() {
    if (rollingAction !== null || fightState.outcome !== null) return;
    dispatch(resolveAttackAction(buildInput(), 'attack'), 'attack');
  }
  function magic() {
    if (rollingAction !== null || fightState.outcome !== null) return;
    dispatch(resolveAttackAction(buildInput(), 'magic'), 'magic');
  }
  function rollAbility() {
    if (rollingAction !== null || fightState.outcome !== null) return;
    // Stamina gate handled at the page level (button is disabled)
    dispatch(resolveAbilityAction(buildInput()), 'ability');
  }
  function castSpell(spellDef: ItemDef, invItemId: string) {
    if (rollingAction !== null || fightState.outcome !== null) return;
    const sm = spellDef.spellMechanics;
    if (!sm) return;
    // Charge gate — defensive check; UI already hides depleted spells.
    const max = getSpellMaxCharges(spellDef.rarity);
    const used = spellChargesUsed[invItemId] ?? 0;
    if (used >= max) return;
    setSpellChargesUsed((prev) => ({ ...prev, [invItemId]: used + 1 }));
    dispatch(resolveSpellAction(buildInput(), spellDef), 'ability');
  }
  function rest() {
    if (rollingAction !== null || fightState.outcome !== null) return;
    dispatch(resolveRestAction(buildInput()), 'rest');
  }
  function meditate() {
    if (rollingAction !== null || fightState.outcome !== null) return;
    dispatch(resolveMeditateAction(buildInput()), 'meditate');
  }
  function flee() {
    if (rollingAction !== null || fightState.outcome !== null) return;
    dispatch(resolveFleeAction(buildInput()), 'run');
  }

  async function useItem(invItemId: string) {
    if (usingItem || fightState.outcome !== null) return;
    setUsingItem(invItemId);
    try {
      const { hpGained, staminaGained, magicGained } = await consumeItem(
        invItemId,
        fightState.playerHp,
        maxHp,
        fightState.playerStamina,
        maxStamina,
        fightState.playerMagic,
        maxMagic,
      );
      const res = resolveUseItemAction(buildInput(), hpGained, staminaGained, magicGained);
      // No overlay — commit immediately (skip log/outcome handling).
      setFightState(res.nextState);
      onResourceChange?.({
        hp: res.nextState.playerHp,
        stamina: res.nextState.playerStamina,
        magic: res.nextState.playerMagic,
      });
    } finally {
      setUsingItem(null);
    }
  }

  const actions = useMemo(
    () => ({ attack, magic, rollAbility, castSpell, rest, meditate, useItem, flee }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      fightState,
      character,
      modifiers,
      streakMultiplier,
      rollingAction,
      usingItem,
      spellChargesUsed,
    ],
  );

  return {
    fightState,
    rollingAction,
    pending: {
      action: pendingAction,
      ability: pendingAbility,
      spell: pendingSpell,
    },
    bursts,
    expireBurst: expire,
    usingItem,
    spellChargesUsed,
    actions,
  };
}

/**
 * Pure resolver layer for player combat actions.
 *
 * Each `resolveXAction` takes the current FightState + character + modifiers
 * and returns a fresh `ActionResolution` describing the new state, the log
 * entry, and the overlay payload to render (if any). The resolvers do NOT
 * touch React state, Firestore, or any Cloud Function — those side-effects
 * live in the `useCombatEncounter` hook and the page that mounts it.
 *
 * The `CombatModifiers` seam lets dungeons inject venom DoT, boss enrage,
 * Necro Shield, and Dragon ignore-DEF behaviour without forking the math.
 * Arena passes `modifiers = undefined` and gets identity short-circuits at
 * every hook slot — so behaviour is bit-identical to the legacy inline
 * handlers in `src/app/(game)/combat/page.tsx`.
 */
import type { Character, ItemDef, MonsterDef } from '@/types';
import type {
  CombatModifiers,
  FightState,
  PendingAbility,
  PendingAction,
  PendingSpell,
  RoundEntry,
} from '@/components/combat/types';
import { calculateRound, resolveRoundOutcome, rollRunAway } from './combat';
import { resolveAbility } from './abilities';
import { resolveSpell } from './spells';
import {
  applyOutgoingPassives,
  canBloodPact,
  checkExecute,
  getAbilityStaminaCost,
  getEffectiveSpellCost,
  getMomentumRestore,
  resolveLifesteal,
} from './passives';
import { COMBAT } from './constants';

// ─── Shared input / output shapes ──────────────────────────────────────────────

export interface ActionInput {
  state: FightState;
  character: Character;
  maxHp: number;
  maxStamina: number;
  maxMagic: number;
  streakMultiplier: number;
  getPityFor: (monsterId: string) => number;
  modifiers?: CombatModifiers;
}

export type PendingPayload =
  | { kind: 'action'; payload: Omit<PendingAction, 'applyResult'> }
  | { kind: 'ability'; payload: Omit<PendingAbility, 'applyResult'> }
  | { kind: 'spell'; payload: Omit<PendingSpell, 'applyResult'> }
  | { kind: 'none' };

export interface ActionResolution {
  /** New fight state to commit when the overlay's Continue button is tapped. */
  nextState: FightState;
  /** Log entry appended after the result is applied. */
  logEntry: RoundEntry;
  /** Overlay descriptor — `kind: 'none'` means "no overlay, apply immediately". */
  pending: PendingPayload;
  /** Banner message returned by `modifiers.postRoundHook` (enrage trigger). */
  bannerMessage?: string;
}

// ─── Internal: pre-action / post-action hooks ─────────────────────────────────

interface PreActionResult {
  state: FightState;
  notes: string[];
  effectiveMonster: MonsterDef;
}

function runPreAction(input: ActionInput): PreActionResult {
  const notes: string[] = [];
  let state = input.state;

  if (input.modifiers?.preActionTick) {
    const tick = input.modifiers.preActionTick(state);
    state = tick.state;
    if (tick.log) notes.push(tick.log);
  }

  const effectiveMonster =
    input.modifiers?.effectiveMonster?.(state.monster, state) ?? state.monster;

  return { state, notes, effectiveMonster };
}

function runAbsorb(
  input: ActionInput,
  state: FightState,
  rawDamage: number,
): { damage: number; notes: string[] } {
  if (!input.modifiers?.absorbPlayerDamage) return { damage: rawDamage, notes: [] };
  const result = input.modifiers.absorbPlayerDamage(rawDamage, state);
  return { damage: result.damage, notes: result.log ? [result.log] : [] };
}

function runPostRound(
  input: ActionInput,
  state: FightState,
  actionKind: 'attack' | 'magic' | 'ability' | 'spell',
): { state: FightState; notes: string[]; bannerMessage?: string } {
  if (!input.modifiers?.postRoundHook) return { state, notes: [] };
  const result = input.modifiers.postRoundHook(state, { actionKind });
  return {
    state: result.state,
    notes: result.log ? [result.log] : [],
    bannerMessage: result.bannerMessage,
  };
}

// ─── resolveAttackAction (attack / magic) ─────────────────────────────────────

export function resolveAttackAction(
  input: ActionInput,
  mode: 'attack' | 'magic',
): ActionResolution {
  const { character, maxHp, maxMagic, streakMultiplier, getPityFor } = input;
  const pre = runPreAction(input);
  const stateForRound = pre.state;

  const {
    roll,
    attackBonus,
    attackBonusLabel,
    playerDamage: basePlayerDamage,
    monsterDamage: baseMonsterDamage,
    monsterRoll,
    playerDefFailed,
    monsterDefFailed,
  } = calculateRound(character, pre.effectiveMonster, mode);

  const passiveCtx = {
    currentHpPct: stateForRound.playerHp / maxHp,
    currentMagic: stateForRound.playerMagic,
    isFirstAbility: stateForRound.isFirstAbility,
    executeUsed: stateForRound.executeUsed,
    roll,
  };
  const outgoing = applyOutgoingPassives(character, basePlayerDamage, passiveCtx);
  let playerDamage = outgoing.damage;

  // Modifier: shield-style absorption (Necro Shield)
  const absorb = runAbsorb(input, stateForRound, playerDamage);
  playerDamage = absorb.damage;

  // Warlock Soul Drain on attack damage
  const { soulDrainHeal: attackSoulDrain } = resolveLifesteal(character, 0, playerDamage);

  const newMonsterHp = Math.max(0, stateForRound.monsterHp - playerDamage);

  const healedHp = Math.min(stateForRound.playerHp + attackSoulDrain, maxHp);
  const roundResult = resolveRoundOutcome({
    newMonsterHp,
    preIncomingPlayerHp: healedHp,
    playerMagicBeforeBarrier: stateForRound.playerMagic,
    rawMonsterDamage: baseMonsterDamage,
    passiveCtx,
    snapshot: { monster: stateForRound.monster, droppedItems: stateForRound.droppedItems },
    character,
    maxHp,
    maxMagic,
    streakMultiplier,
    getPityFor,
  });
  const { incoming, perRound, finalPlayerHp, finalPlayerMagic, outcome, droppedItems } =
    roundResult;
  const actualMonsterDamage = incoming.damage;

  // Compose intermediate state for postRoundHook (with new monster HP and incoming damage applied)
  const interimState: FightState = {
    ...stateForRound,
    monsterHp: newMonsterHp,
    playerHp: finalPlayerHp,
    playerMagic: finalPlayerMagic,
  };
  const post = runPostRound(input, interimState, mode);

  const modifierNotes = [...pre.notes, ...absorb.notes, ...post.notes];

  const logEntry: RoundEntry = {
    round: stateForRound.log.length + 1,
    action: mode,
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
    perRoundHpRestore: perRound.hpRestore > 0 && outcome === null ? perRound.hpRestore : undefined,
    perRoundMagicRestore:
      perRound.magicRestore > 0 && outcome === null ? perRound.magicRestore : undefined,
    modifierNotes: modifierNotes.length > 0 ? modifierNotes : undefined,
  };

  const nextState: FightState = {
    ...post.state,
    log: [...stateForRound.log, logEntry],
    outcome,
    droppedItems,
  };

  return {
    nextState,
    logEntry,
    bannerMessage: post.bannerMessage,
    pending: {
      kind: 'action',
      payload: {
        actionType: mode,
        dice: [roll],
        monsterRoll,
        attackBonus,
        attackBonusLabel,
        playerDamage,
        monsterDamage: actualMonsterDamage,
        playerDefFailed,
        monsterDefFailed,
        outcome,
      },
    },
  };
}

// ─── resolveAbilityAction ──────────────────────────────────────────────────────

export function resolveAbilityAction(input: ActionInput): ActionResolution {
  const { character, maxHp, maxStamina, maxMagic, streakMultiplier, getPityFor } = input;
  const pre = runPreAction(input);
  const stateForRound = pre.state;

  const actualStaminaCost = getAbilityStaminaCost(
    character,
    COMBAT.ABILITY_STAMINA_COST,
    stateForRound.isFirstAbility,
  );

  const resolution = resolveAbility(character, pre.effectiveMonster, stateForRound.isFirstAbility);
  const fizzled = resolution.ability === null;

  const abilityCtx = {
    currentHpPct: stateForRound.playerHp / maxHp,
    currentMagic: stateForRound.playerMagic,
    isFirstAbility: stateForRound.isFirstAbility,
    executeUsed: stateForRound.executeUsed,
    roll: undefined as number | undefined,
  };
  const outgoing = applyOutgoingPassives(character, resolution.playerDamage, abilityCtx);
  let effectivePlayerDamage = outgoing.damage;

  // Modifier: absorb (Necro Shield)
  const absorb = runAbsorb(input, stateForRound, effectivePlayerDamage);
  effectivePlayerDamage = absorb.damage;

  const { totalPct, hemorrhageDrain, soulDrainHeal } = resolveLifesteal(
    character,
    resolution.ability?.lifestealPct ?? 0,
    effectivePlayerDamage,
  );
  const lifestealHeal = Math.round(effectivePlayerDamage * totalPct);
  const totalHeal = lifestealHeal + soulDrainHeal + resolution.flatPassiveHeal;

  const monsterHpBefore = stateForRound.monsterHp;
  let newMonsterHp = Math.max(0, monsterHpBefore - effectivePlayerDamage - hemorrhageDrain);
  const executeTriggered = checkExecute(
    character,
    monsterHpBefore,
    newMonsterHp,
    stateForRound.monster.hp,
    stateForRound.executeUsed,
  );
  if (executeTriggered) newMonsterHp = 0;

  const killedMonster = newMonsterHp === 0;

  const healedHp = Math.min(stateForRound.playerHp + totalHeal, maxHp);
  const roundResult = resolveRoundOutcome({
    newMonsterHp,
    preIncomingPlayerHp: healedHp,
    playerMagicBeforeBarrier: stateForRound.playerMagic,
    rawMonsterDamage: resolution.monsterDamage,
    passiveCtx: abilityCtx,
    snapshot: { monster: stateForRound.monster, droppedItems: stateForRound.droppedItems },
    character,
    maxHp,
    maxMagic,
    streakMultiplier,
    getPityFor,
  });
  const { incoming, perRound, finalPlayerHp, finalPlayerMagic, outcome, droppedItems } =
    roundResult;
  const actualMonsterDamage = incoming.damage;

  const momentumRestore = getMomentumRestore(character, killedMonster);
  const fizzleRefund = fizzled ? COMBAT.FIZZLE_STAMINA_REFUND : 0;
  const newStamina = Math.min(
    Math.max(0, stateForRound.playerStamina - actualStaminaCost + fizzleRefund) + momentumRestore,
    maxStamina,
  );

  const interimState: FightState = {
    ...stateForRound,
    monsterHp: newMonsterHp,
    playerHp: finalPlayerHp,
    playerStamina: newStamina,
    playerMagic: finalPlayerMagic,
  };
  const post = runPostRound(input, interimState, 'ability');
  const modifierNotes = [...pre.notes, ...absorb.notes, ...post.notes];

  const logEntry: RoundEntry = {
    round: stateForRound.log.length + 1,
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
    perRoundHpRestore: perRound.hpRestore > 0 && outcome === null ? perRound.hpRestore : undefined,
    perRoundMagicRestore:
      perRound.magicRestore > 0 && outcome === null ? perRound.magicRestore : undefined,
    modifierNotes: modifierNotes.length > 0 ? modifierNotes : undefined,
  };

  const nextState: FightState = {
    ...post.state,
    log: [...stateForRound.log, logEntry],
    outcome,
    droppedItems,
    isFirstAbility: false,
    executeUsed: stateForRound.executeUsed || executeTriggered,
  };

  return {
    nextState,
    logEntry,
    bannerMessage: post.bannerMessage,
    pending: {
      kind: 'ability',
      payload: {
        dice: resolution.dice,
        pattern: resolution.pattern,
        ability: resolution.ability,
        formulaBreakdown: resolution.formulaBreakdown,
      },
    },
  };
}

// ─── resolveSpellAction ────────────────────────────────────────────────────────

export function resolveSpellAction(input: ActionInput, spellDef: ItemDef): ActionResolution {
  const { character, maxHp, maxStamina, maxMagic, streakMultiplier, getPityFor } = input;
  const sm = spellDef.spellMechanics!;
  const pre = runPreAction(input);
  const stateForRound = pre.state;

  const effectiveMagicCost = getEffectiveSpellCost(character, sm.magicCost);
  const useBloodPact = canBloodPact(
    character,
    effectiveMagicCost,
    stateForRound.playerMagic,
    stateForRound.playerHp,
  );

  const resolution = resolveSpell(sm.effect, sm.requirement, character, pre.effectiveMonster);

  const newMagic = useBloodPact
    ? stateForRound.playerMagic
    : Math.max(0, stateForRound.playerMagic - effectiveMagicCost);
  const bloodPactHpCost = useBloodPact ? 10 : 0;

  // Warlock Soul Drain on spell damage
  const { soulDrainHeal: spellSoulDrain } = resolveLifesteal(character, 0, resolution.playerDamage);

  // Absorb (Necro Shield) — applies to raw spell damage
  const absorb = runAbsorb(input, stateForRound, resolution.playerDamage);
  const damageToMonster = absorb.damage;

  const newMonsterHp = Math.max(0, stateForRound.monsterHp - damageToMonster);

  const spellCtx = {
    currentHpPct: stateForRound.playerHp / maxHp,
    currentMagic: newMagic,
    isFirstAbility: stateForRound.isFirstAbility,
    executeUsed: stateForRound.executeUsed,
  };
  const healedHp = Math.min(
    stateForRound.playerHp + resolution.healAmount + spellSoulDrain - bloodPactHpCost,
    maxHp,
  );
  const roundResult = resolveRoundOutcome({
    newMonsterHp,
    preIncomingPlayerHp: healedHp,
    playerMagicBeforeBarrier: newMagic,
    rawMonsterDamage: resolution.monsterDamage,
    passiveCtx: spellCtx,
    snapshot: { monster: stateForRound.monster, droppedItems: stateForRound.droppedItems },
    character,
    maxHp,
    maxMagic,
    streakMultiplier,
    getPityFor,
  });
  const { incoming, perRound, finalPlayerHp, finalPlayerMagic, outcome, droppedItems } =
    roundResult;
  const actualMonsterDamage = incoming.damage;
  const newStamina = Math.min(stateForRound.playerStamina + resolution.staminaRestored, maxStamina);

  const totalSpellHeal = resolution.healAmount + spellSoulDrain;

  const interimState: FightState = {
    ...stateForRound,
    monsterHp: newMonsterHp,
    playerHp: finalPlayerHp,
    playerStamina: newStamina,
    playerMagic: finalPlayerMagic,
  };
  const post = runPostRound(input, interimState, 'spell');
  const modifierNotes = [...pre.notes, ...absorb.notes, ...post.notes];

  const logEntry: RoundEntry = {
    round: stateForRound.log.length + 1,
    action: 'spell',
    spellName: spellDef.name,
    spellDice: resolution.dice,
    spellRequirementMet: resolution.requirementMet,
    spellMagicCost: effectiveMagicCost,
    spellDiceReq: sm.requirement,
    playerDamage: damageToMonster,
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
    perRoundHpRestore: perRound.hpRestore > 0 && outcome === null ? perRound.hpRestore : undefined,
    perRoundMagicRestore:
      perRound.magicRestore > 0 && outcome === null ? perRound.magicRestore : undefined,
    modifierNotes: modifierNotes.length > 0 ? modifierNotes : undefined,
  };

  const nextState: FightState = {
    ...post.state,
    log: [...stateForRound.log, logEntry],
    outcome,
    droppedItems,
  };

  return {
    nextState,
    logEntry,
    bannerMessage: post.bannerMessage,
    pending: {
      kind: 'spell',
      payload: {
        spellDef,
        dice: resolution.dice,
        requirementMet: resolution.requirementMet,
        monsterRoll: resolution.monsterRoll,
        monsterStunned: resolution.monsterStunned,
        monsterDamage: resolution.monsterDamage,
      },
    },
  };
}

// ─── resolveMeditateAction / resolveRestAction ────────────────────────────────

function resolveRecoveryAction(input: ActionInput, type: 'rest' | 'meditate'): ActionResolution {
  const { character, maxStamina, maxMagic } = input;
  // No preActionTick on recovery — venom DoT only ticks on offensive actions.
  // (Arena-parity choice: recovery actions never modify monster HP.)
  const state = input.state;

  const recoveryRoll = Math.ceil(Math.random() * 10);

  let recoveredStamina = 0;
  let recoveredMagic = 0;
  if (type === 'rest') {
    const raw = recoveryRoll * 3;
    recoveredStamina = Math.min(raw, maxStamina - state.playerStamina);
  } else {
    const raw = recoveryRoll + (character.stats.wisdom ?? 0);
    recoveredMagic = Math.min(raw, maxMagic - state.playerMagic);
  }

  // Monster gets a free attack (player's defense bypassed). Boss enrage ATK
  // boost applies here too — use effectiveMonster so Spider/Dragon hit harder.
  const effectiveMonster =
    input.modifiers?.effectiveMonster?.(state.monster, state) ?? state.monster;
  const monsterRoll = Math.ceil(Math.random() * 10);
  const monsterDamage = Math.max(1, effectiveMonster.attack + monsterRoll);
  const newPlayerHp = Math.max(0, state.playerHp - monsterDamage);
  const lossOutcome: 'loss' | null = newPlayerHp === 0 ? 'loss' : null;

  const newStamina = state.playerStamina + recoveredStamina;
  const newMagic = state.playerMagic + recoveredMagic;

  const logEntry: RoundEntry = {
    round: state.log.length + 1,
    action: type,
    recoveryRoll,
    recoveredStamina,
    recoveredMagic,
    monsterDamage,
    playerHpAfter: newPlayerHp,
    monsterHpAfter: state.monsterHp,
  };

  const nextState: FightState = {
    ...state,
    playerHp: newPlayerHp,
    playerStamina: newStamina,
    playerMagic: newMagic,
    log: [...state.log, logEntry],
    outcome: lossOutcome,
  };

  return {
    nextState,
    logEntry,
    pending: {
      kind: 'action',
      payload: {
        actionType: type,
        dice: [recoveryRoll],
        monsterRoll,
        monsterDamage,
        recoveredStamina,
        recoveredMagic,
        outcome: lossOutcome,
      },
    },
  };
}

export function resolveMeditateAction(input: ActionInput): ActionResolution {
  return resolveRecoveryAction(input, 'meditate');
}

export function resolveRestAction(input: ActionInput): ActionResolution {
  return resolveRecoveryAction(input, 'rest');
}

// ─── resolveFleeAction ─────────────────────────────────────────────────────────

export function resolveFleeAction(input: ActionInput): ActionResolution {
  const { character } = input;
  const state = input.state;

  // Flee uses the BASE monster def for the roll (boss enrage is irrelevant if you escape).
  const { playerRoll, agilityBonus, monsterRoll, escaped, monsterDamage, playerDefFailed } =
    rollRunAway(character, state.monster);

  if (escaped) {
    const nextState: FightState = { ...state, outcome: 'fled' };
    return {
      nextState,
      logEntry: {
        round: state.log.length + 1,
        action: 'run_failed', // unused for escaped — UI shows "Escaped!" via outcome
        playerRunRoll: playerRoll,
        agilityBonus,
        monsterRunRoll: monsterRoll,
        playerHpAfter: state.playerHp,
        monsterHpAfter: state.monsterHp,
      },
      pending: {
        kind: 'action',
        payload: {
          actionType: 'run',
          dice: [playerRoll, monsterRoll],
          escaped: true,
          outcome: null,
        },
      },
    };
  }

  const newPlayerHp = Math.max(0, state.playerHp - monsterDamage);
  const runOutcome: 'loss' | null = newPlayerHp === 0 ? 'loss' : null;
  const logEntry: RoundEntry = {
    round: state.log.length + 1,
    action: 'run_failed',
    playerRunRoll: playerRoll,
    agilityBonus,
    monsterRunRoll: monsterRoll,
    monsterDamage,
    playerDefFailed,
    playerHpAfter: newPlayerHp,
    monsterHpAfter: state.monsterHp,
  };

  return {
    nextState: {
      ...state,
      playerHp: newPlayerHp,
      log: [...state.log, logEntry],
      outcome: runOutcome,
    },
    logEntry,
    pending: {
      kind: 'action',
      payload: {
        actionType: 'run',
        dice: [playerRoll, monsterRoll],
        escaped: false,
        monsterDamage,
        playerDefFailed,
        outcome: runOutcome,
      },
    },
  };
}

// ─── resolveUseItemAction ──────────────────────────────────────────────────────

/**
 * Synchronous portion of consumable use — caller is expected to have already
 * resolved how much each stat is restored (the inventory store's `useConsumable`
 * mutates Firestore + returns the gained amounts). This resolver just clamps
 * and produces the next FightState. No overlay is shown.
 */
export function resolveUseItemAction(
  input: ActionInput,
  hpGained: number,
  staminaGained: number,
  magicGained: number,
): ActionResolution {
  const { maxHp, maxStamina, maxMagic } = input;
  const state = input.state;
  const newHp = hpGained > 0 ? Math.min(state.playerHp + hpGained, maxHp) : state.playerHp;
  const newStamina =
    staminaGained > 0
      ? Math.min(state.playerStamina + staminaGained, maxStamina)
      : state.playerStamina;
  const newMagic =
    magicGained > 0 ? Math.min(state.playerMagic + magicGained, maxMagic) : state.playerMagic;

  return {
    nextState: {
      ...state,
      playerHp: newHp,
      playerStamina: newStamina,
      playerMagic: newMagic,
    },
    // Items don't produce a round entry today — matches arena behaviour.
    logEntry: {
      round: state.log.length,
      action: 'attack',
      playerHpAfter: newHp,
      monsterHpAfter: state.monsterHp,
    },
    pending: { kind: 'none' },
  };
}

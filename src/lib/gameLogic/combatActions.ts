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
import {
  calculateRound,
  effectiveAttackType,
  effectiveStat,
  incomingMonsterDamage,
  monsterArmorPierce,
  monsterSiphonAmount,
  monsterSpecialDrainHeal,
  resolveCounterSpecial,
  resolveRoundOutcome,
  rollClassDodge,
  rollFleeIntercept,
  rollLoot,
  rollRunAway,
  rollSpellCrit,
  type CounterSpecialResolution,
} from './combat';
import type { MonsterSpecialMove } from '@/types';
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
import { COMBAT, CLASS_DAMAGE_TAKEN } from './constants';

// ─── Monster passive / active helpers ─────────────────────────────────────────

/** Returns effective monster stats with permanent active boosts applied. */
function getMonsterEffectiveStats(monster: MonsterDef, state: FightState): MonsterDef {
  const bonusAtk = state.monsterBonusAtk ?? 0;
  const bonusDef = state.monsterBonusDef ?? 0;
  if (!bonusAtk && !bonusDef) return monster;
  return { ...monster, attack: monster.attack + bonusAtk, defense: monster.defense + bonusDef };
}

/** Maximum HP the monster can be healed up to, factoring in summon-add bonuses. */
function effectiveMonsterMaxHp(state: FightState): number {
  return state.monster.hp + (state.monsterBonusHp ?? 0);
}

/** Heals the monster by its regen value, capped at effective max HP. */
function applyMonsterRegen(state: FightState): { state: FightState; regenAmount: number } {
  const passive = state.monster.passive;
  if (!passive || passive.id !== 'regen') return { state, regenAmount: 0 };
  const cap = effectiveMonsterMaxHp(state);
  const regenAmount = Math.min(passive.value, cap - state.monsterHp);
  if (regenAmount <= 0) return { state, regenAmount: 0 };
  return { state: { ...state, monsterHp: state.monsterHp + regenAmount }, regenAmount };
}

/** Reflects a % of player damage as thorns damage back to the player. */
function calcThornsDamage(monster: MonsterDef, playerDamage: number): number {
  const passive = monster.passive;
  if (!passive || passive.id !== 'thorns' || playerDamage <= 0) return 0;
  return Math.ceil((playerDamage * passive.value) / 100);
}

/** Heals monster from a % of its own counter-attack damage (vampiric). */
function calcVampiricHeal(
  monster: MonsterDef,
  monsterDamage: number,
  monsterHp: number,
  maxHp: number,
): number {
  const passive = monster.passive;
  if (!passive || passive.id !== 'vampiric' || monsterDamage <= 0) return 0;
  const heal = Math.ceil((monsterDamage * passive.value) / 100);
  return Math.min(heal, maxHp - monsterHp);
}

/** Detects a first-time HP-threshold crossing and returns the active's effect. */
function checkMonsterActive(
  monster: MonsterDef,
  hpBefore: number,
  hpAfter: number,
  activeUsed: boolean,
): {
  triggered: boolean;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
  bonusHeal: number;
  label: string;
} {
  const none = { triggered: false, bonusAtk: 0, bonusDef: 0, bonusHp: 0, bonusHeal: 0, label: '' };
  if (!monster.active || activeUsed || hpAfter === 0) return none;
  const threshold = monster.active.triggerPct * monster.hp;
  if (hpBefore > threshold && hpAfter <= threshold) {
    const { id, value, label } = monster.active;
    return {
      triggered: true,
      bonusAtk: id === 'enrage' ? value : 0,
      bonusDef: id === 'harden' ? value : 0,
      bonusHp: id === 'summon-add' ? value : 0,
      bonusHeal: id === 'heal' ? value : 0,
      label,
    };
  }
  return none;
}

/**
 * HP the monster actually heals from a `drain` special this round, capped by
 * the headroom left after summon-add and vampiric have already healed it.
 * Returns 0 when the monster is dead, the special isn't a drain, or no hit
 * landed. Mirrors the way `calcVampiricHeal` is capped.
 */
function calcSpecialDrain(
  special: MonsterSpecialMove | null,
  monsterDamage: number,
  hpAfterPriorHeals: number,
  maxHp: number,
): number {
  if (hpAfterPriorHeals === 0) return 0;
  const raw = monsterSpecialDrainHeal(special, monsterDamage);
  if (raw <= 0) return 0;
  return Math.min(raw, maxHp - hpAfterPriorHeals);
}

/**
 * Combined per-counter self-heal (vampiric + drain) capped at a fraction of the
 * monster's max HP — a guardrail so a future monster that stacks both can't
 * runaway-heal off a single big hit. No current monster stacks both, so this
 * essentially never binds today (a `monsterSpecials` test asserts the latter).
 */
function cappedMonsterSelfHeal(vampiric: number, drain: number, maxHp: number): number {
  const cap = Math.ceil(maxHp * COMBAT.MONSTER_SELF_HEAL_CAP_FRACTION);
  return Math.min(vampiric + drain, cap);
}

/**
 * The telegraph/charge + stun outcome for one offensive round.
 *
 * `monsterSwung` is true when the monster actually made its counter this round
 * (i.e. it was not killed and not stunned by the player). A Rogue dodge still
 * counts as a swing (the monster attacked; the player evaded), so a charge it
 * was holding is still consumed and a fresh telegraph can still wind up.
 */
interface ChargeOutcome {
  /** Telegraphed special to carry into next round (FightState.monsterCharging). */
  nextCharging: MonsterSpecialMove | null;
  /** A pending charge was cancelled because the monster was stunned/killed first. */
  fizzledCharge: MonsterSpecialMove | null;
  /** A telegraphed special newly wound up this round (drives the "winding up" tell). */
  primed: MonsterSpecialMove | null;
  /** A `stun` special landed on a real hit → the player skips next turn. */
  stunApplied: boolean;
}

function resolveChargeOutcome(
  state: FightState,
  specialRes: CounterSpecialResolution,
  monsterSwung: boolean,
  actualMonsterDamage: number,
  outcome: 'win' | 'loss' | 'fled' | null,
): ChargeOutcome {
  if (!monsterSwung) {
    // Monster didn't counter (player stunned or killed it) → any held charge is
    // cancelled and nothing new winds up.
    return {
      nextCharging: null,
      fizzledCharge: state.monsterCharging ?? null,
      primed: null,
      stunApplied: false,
    };
  }
  const stunApplied =
    specialRes.effective?.effect.kind === 'stun' && actualMonsterDamage > 0 && outcome === null;
  return {
    nextCharging: specialRes.nextCharging,
    fizzledCharge: null,
    primed: specialRes.primed,
    stunApplied,
  };
}

/**
 * Log-entry fields describing the monster special that fired this round.
 * Suppressed entirely when no special landed a hit (stun / dodge / kill).
 */
function monsterSpecialLogFields(
  special: MonsterSpecialMove | null,
  monsterDamage: number,
  drainHeal: number,
): {
  monsterSpecialName?: string;
  monsterSpecialEmoji?: string;
  monsterSpecialDrain?: number;
} {
  if (!special || monsterDamage <= 0) return {};
  return {
    monsterSpecialName: special.name,
    monsterSpecialEmoji: special.emoji,
    monsterSpecialDrain: drainHeal > 0 ? drainHeal : undefined,
  };
}

/** Log fields for the telegraph "winding up" tell + a landed stun, this round. */
function chargeLogFields(charge: ChargeOutcome): {
  monsterSpecialPrimedName?: string;
  monsterSpecialPrimedEmoji?: string;
  playerStunnedApplied?: boolean;
} {
  return {
    monsterSpecialPrimedName: charge.primed?.name,
    monsterSpecialPrimedEmoji: charge.primed?.emoji,
    playerStunnedApplied: charge.stunApplied || undefined,
  };
}

/** Modifier-log note for a telegraphed charge that fizzled (monster stunned mid-windup). */
function fizzleChargeNote(monsterName: string, charge: ChargeOutcome): string | null {
  return charge.fizzledCharge
    ? `${monsterName}'s ${charge.fizzledCharge.name} fizzles — windup interrupted!`
    : null;
}

/**
 * Decide whether a low-HP monster bolts this round. Fires only when the fight
 * continues, the monster has a `flee` profile, it survived at/below its flee
 * threshold, RNG lands under its chance, fleeing isn't disabled (dungeon rooms
 * need a kill), and a stun did NOT land this round (one disruption at a time).
 */
export function checkMonsterFlee(
  monster: MonsterDef,
  monsterHpFinal: number,
  maxMonsterHp: number,
  outcome: 'win' | 'loss' | 'fled' | null,
  modifiers: CombatModifiers | undefined,
  stunApplied: boolean,
  rng: () => number = Math.random,
): boolean {
  const flee = monster.flee;
  if (!flee || outcome !== null || stunApplied || modifiers?.monsterFleeDisabled) return false;
  if (monsterHpFinal <= 0 || monsterHpFinal > flee.thresholdPct * maxMonsterHp) return false;
  return rng() < flee.chance;
}

/**
 * Player stamina drain from a monster's siphon passive, applied each round the
 * monster actually lands a hit. Bounded by remaining stamina.
 */
function calcSiphonDrain(
  monster: MonsterDef,
  monsterDamage: number,
  playerStamina: number,
): number {
  if (monsterDamage <= 0) return 0;
  const raw = monsterSiphonAmount(monster);
  if (raw <= 0) return 0;
  return Math.min(raw, playerStamina);
}

/**
 * Tick all active spell bleed/burn DoTs on the monster: apply this round's
 * damage (capped at current HP), decrement each timer, and drop expired entries.
 * Returns the new monsterHp, the surviving DoT list, total damage dealt, and a
 * human-readable note. Pure — caller commits the result into FightState.
 */
function tickMonsterDots(state: FightState): {
  monsterHp: number;
  monsterDots: FightState['monsterDots'];
  damage: number;
  note?: string;
} {
  const dots = state.monsterDots ?? [];
  if (dots.length === 0 || state.monsterHp <= 0) {
    return { monsterHp: state.monsterHp, monsterDots: dots, damage: 0 };
  }
  const rawDamage = dots.reduce((sum, d) => sum + d.perRound, 0);
  const damage = Math.min(rawDamage, state.monsterHp);
  const survivors = dots
    .map((d) => ({ ...d, roundsRemaining: d.roundsRemaining - 1 }))
    .filter((d) => d.roundsRemaining > 0);
  const note = damage > 0 ? `${state.monster.name} suffers ${damage} bleed damage.` : undefined;
  return { monsterHp: state.monsterHp - damage, monsterDots: survivors, damage, note };
}

/**
 * Add or refresh a spell DoT on the monster. Re-casting the same spell (same
 * `key`) replaces its prior stack; different spells stack as separate entries.
 */
function applyMonsterDot(
  dots: FightState['monsterDots'],
  entry: { key: string; label: string; perRound: number; roundsRemaining: number },
): FightState['monsterDots'] {
  const others = (dots ?? []).filter((d) => d.key !== entry.key);
  return [...others, entry];
}

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
  regenAmount: number;
  /** Spell bleed/burn DoT damage dealt to the monster at the start of this action. */
  dotDamage: number;
}

function runPreAction(input: ActionInput): PreActionResult {
  const notes: string[] = [];
  let state = input.state;

  // Dungeon pre-action tick (venom DoT, etc.) runs first.
  if (input.modifiers?.preActionTick) {
    const tick = input.modifiers.preActionTick(state);
    state = tick.state;
    if (tick.log) notes.push(tick.log);
  }

  // Monster regen heals before the player attacks.
  const { state: stateAfterRegen, regenAmount } = applyMonsterRegen(state);
  if (regenAmount > 0) {
    state = stateAfterRegen;
    notes.push(`${state.monster.name} regenerates ${regenAmount} HP.`);
  }

  // Spell bleed/burn DoTs tick after the monster's own regen so a bleed can
  // eat into freshly-regenerated HP. Stacks independently with dungeon venom.
  const dot = tickMonsterDots(state);
  if (dot.damage > 0) {
    state = { ...state, monsterHp: dot.monsterHp, monsterDots: dot.monsterDots };
    if (dot.note) notes.push(dot.note);
  } else if ((state.monsterDots?.length ?? 0) > 0) {
    state = { ...state, monsterDots: dot.monsterDots };
  }

  // Apply permanent active buffs (enrage/harden) before dungeon modifier override.
  const baseEffective = getMonsterEffectiveStats(state.monster, state);
  const effectiveMonster =
    input.modifiers?.effectiveMonster?.(baseEffective, state) ?? baseEffective;

  return { state, notes, effectiveMonster, regenAmount, dotDamage: dot.damage };
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

  // Telegraph: a charged special fires this round; a freshly-rolled telegraphed
  // one only winds up (does not apply now). Instant pierce/drain apply on the spot.
  const specialRes = resolveCounterSpecial(stateForRound.monster, stateForRound.monsterCharging);

  const {
    roll,
    attackBonus,
    attackBonusLabel,
    playerDamage: basePlayerDamage,
    monsterDamage: baseMonsterDamage,
    monsterRoll,
    playerDefFailed,
    monsterDefFailed,
    monsterSpecial,
  } = calculateRound(character, pre.effectiveMonster, mode, specialRes.effective);

  const passiveCtx = {
    currentHpPct: stateForRound.playerHp / maxHp,
    currentMagic: stateForRound.playerMagic,
    isFirstAbility: stateForRound.isFirstAbility,
    executeUsed: stateForRound.executeUsed,
    roll,
  };
  const outgoing = applyOutgoingPassives(character, basePlayerDamage, passiveCtx);
  let playerDamage = outgoing.damage;

  // Spirit crit — basic attacks/magic can now crit just like abilities and spells,
  // fires only when the strike actually deals damage. Stacks on outgoing passives.
  const attackCrit =
    playerDamage > 0
      ? rollSpellCrit(effectiveStat(character, 'spirit'), playerDamage)
      : { damage: playerDamage, crit: false, multiplier: 1 };
  playerDamage = attackCrit.damage;

  // Modifier: shield-style absorption (Necro Shield)
  const absorb = runAbsorb(input, stateForRound, playerDamage);
  playerDamage = absorb.damage;

  // Warlock Soul Drain on attack damage
  const { soulDrainHeal: attackSoulDrain } = resolveLifesteal(character, 0, playerDamage);

  const monsterHpBefore = stateForRound.monsterHp;
  const newMonsterHp = Math.max(0, monsterHpBefore - playerDamage);

  // Monster thorns: reflect damage to player (before resolveRoundOutcome so we know the amount).
  const thornDamage = calcThornsDamage(stateForRound.monster, playerDamage);

  // Active trigger: one-shot ability fires when monster HP crosses the threshold.
  const activeResult = checkMonsterActive(
    stateForRound.monster,
    monsterHpBefore,
    newMonsterHp,
    stateForRound.activeUsed ?? false,
  );

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
  const {
    incoming,
    perRound,
    finalPlayerHp: rawFinalPlayerHp,
    finalPlayerMagic,
    outcome: rawOutcome,
    droppedItems,
  } = roundResult;
  const actualMonsterDamage = incoming.damage;

  // Apply thorns on top of monster counter-attack.
  const finalPlayerHp =
    thornDamage > 0 ? Math.max(0, rawFinalPlayerHp - thornDamage) : rawFinalPlayerHp;

  // Siphon: monster drains stamina each round it lands a hit.
  const siphonDrain = calcSiphonDrain(
    stateForRound.monster,
    actualMonsterDamage,
    stateForRound.playerStamina,
  );
  const staminaAfterSiphon = stateForRound.playerStamina - siphonDrain;
  const outcome = rawOutcome === 'win' ? 'win' : finalPlayerHp === 0 ? 'loss' : rawOutcome;

  // summon-add: when the active fires, monster gains flat HP (current + cap).
  const summonAddHp = activeResult.bonusHp;
  const newMaxMonsterHp =
    stateForRound.monster.hp + (stateForRound.monsterBonusHp ?? 0) + summonAddHp;
  const hpAfterSummon = newMonsterHp + summonAddHp;

  // Vampiric: monster heals from the damage it dealt (skip if monster is dead).
  const vampiricHeal =
    hpAfterSummon === 0
      ? 0
      : calcVampiricHeal(
          stateForRound.monster,
          actualMonsterDamage,
          hpAfterSummon,
          newMaxMonsterHp,
        );
  // Special `drain`: monster heals from this counter's damage, stacking on top
  // of vampiric within the same HP cap (combined cap guards against runaway heal).
  const specialDrainHeal = calcSpecialDrain(
    monsterSpecial,
    actualMonsterDamage,
    hpAfterSummon + vampiricHeal,
    newMaxMonsterHp,
  );
  const selfHeal = cappedMonsterSelfHeal(vampiricHeal, specialDrainHeal, newMaxMonsterHp);
  const monsterHpFinal = Math.min(
    newMaxMonsterHp,
    hpAfterSummon + selfHeal + activeResult.bonusHeal,
  );

  // Telegraph/charge + stun outcome. Basic attacks never stun the monster, so it
  // swung this round iff it survived (outcome !== 'win').
  const charge = resolveChargeOutcome(
    stateForRound,
    specialRes,
    outcome !== 'win',
    actualMonsterDamage,
    outcome,
  );
  const fizzleNote = fizzleChargeNote(stateForRound.monster.name, charge);
  const monsterFleeing = checkMonsterFlee(
    stateForRound.monster,
    monsterHpFinal,
    newMaxMonsterHp,
    outcome,
    input.modifiers,
    charge.stunApplied,
  );

  const interimState: FightState = {
    ...stateForRound,
    monsterHp: monsterHpFinal,
    playerHp: finalPlayerHp,
    playerStamina: staminaAfterSiphon,
    playerMagic: finalPlayerMagic,
    activeUsed: (stateForRound.activeUsed ?? false) || activeResult.triggered,
    monsterBonusAtk: (stateForRound.monsterBonusAtk ?? 0) + activeResult.bonusAtk,
    monsterBonusDef: (stateForRound.monsterBonusDef ?? 0) + activeResult.bonusDef,
    monsterBonusHp: (stateForRound.monsterBonusHp ?? 0) + summonAddHp,
  };
  const post = runPostRound(input, interimState, mode);

  const modifierNotes = [...pre.notes, ...absorb.notes, ...post.notes];
  if (fizzleNote) modifierNotes.push(fizzleNote);
  if (activeResult.bonusHeal > 0)
    modifierNotes.push(`${stateForRound.monster.name} recovers ${activeResult.bonusHeal} HP!`);
  if (monsterFleeing) modifierNotes.push(`${stateForRound.monster.name} looks ready to bolt!`);

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
    monsterHpAfter: monsterHpFinal,
    spiritCrit: attackCrit.crit || undefined,
    spiritCritMultiplier: attackCrit.crit ? attackCrit.multiplier : undefined,
    eagleEyeCrit: outgoing.eagleEyeCrit,
    divineAegisBlocked: incoming.divineAegisBlocked,
    manaBarrierAbsorbed: incoming.magicDrained > 0 ? incoming.magicDrained : undefined,
    soulDrainHeal: attackSoulDrain > 0 ? attackSoulDrain : undefined,
    perRoundHpRestore: perRound.hpRestore > 0 && outcome === null ? perRound.hpRestore : undefined,
    perRoundMagicRestore:
      perRound.magicRestore > 0 && outcome === null ? perRound.magicRestore : undefined,
    thornsDamage: thornDamage > 0 ? thornDamage : undefined,
    monsterRegen: pre.regenAmount > 0 ? pre.regenAmount : undefined,
    monsterVampiric: vampiricHeal > 0 ? vampiricHeal : undefined,
    monsterActiveTriggered: activeResult.triggered ? activeResult.label : undefined,
    monsterSiphon: siphonDrain > 0 ? siphonDrain : undefined,
    monsterArmorPierce:
      actualMonsterDamage > 0 && monsterArmorPierce(stateForRound.monster) > 0
        ? monsterArmorPierce(stateForRound.monster)
        : undefined,
    monsterSummonAddHp: summonAddHp > 0 ? summonAddHp : undefined,
    monsterDotDamage: pre.dotDamage > 0 ? pre.dotDamage : undefined,
    dodged: roundResult.dodged || undefined,
    monsterAttackType:
      actualMonsterDamage > 0
        ? effectiveAttackType(stateForRound.monster, monsterSpecial)
        : undefined,
    ...monsterSpecialLogFields(monsterSpecial, actualMonsterDamage, specialDrainHeal),
    ...chargeLogFields(charge),
    modifierNotes: modifierNotes.length > 0 ? modifierNotes : undefined,
  };

  const activeMessage = activeResult.triggered
    ? `${stateForRound.monster.name}: ${activeResult.label}!`
    : undefined;
  const bannerMessage =
    [post.bannerMessage, activeMessage].filter(Boolean).join(' · ') || undefined;

  const nextState: FightState = {
    ...post.state,
    log: [...stateForRound.log, logEntry],
    outcome,
    droppedItems,
    monsterHp: monsterHpFinal,
    playerHp: finalPlayerHp,
    playerStamina: staminaAfterSiphon,
    monsterCharging: charge.nextCharging,
    playerStunned: charge.stunApplied,
    monsterFleeing,
  };

  return {
    nextState,
    logEntry,
    bannerMessage,
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
        dodged: roundResult.dodged || undefined,
        monsterSpecial: actualMonsterDamage > 0 ? monsterSpecial : null,
        monsterChargingPrimed: charge.primed,
        playerStunnedApplied: charge.stunApplied || undefined,
        monsterAttackType:
          actualMonsterDamage > 0
            ? effectiveAttackType(stateForRound.monster, monsterSpecial)
            : undefined,
        classDamageTakenMult: (() => {
          const school = effectiveAttackType(stateForRound.monster, monsterSpecial);
          const mult = CLASS_DAMAGE_TAKEN[character.class][school];
          return mult !== 1 ? mult : undefined;
        })(),
        spiritCrit: attackCrit.crit || undefined,
        spiritCritMultiplier: attackCrit.crit ? attackCrit.multiplier : undefined,
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

  // Telegraph: charged special fires now; a freshly-rolled telegraphed one only
  // winds up. resolveAbility ignores the special when the ability stuns the monster.
  const specialRes = resolveCounterSpecial(stateForRound.monster, stateForRound.monsterCharging);
  const resolution = resolveAbility(
    character,
    pre.effectiveMonster,
    stateForRound.isFirstAbility,
    specialRes.effective,
  );
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

  // Spirit crit — fires only on a successful ability (non-fizzle) that actually
  // deals damage. Stacks on top of Eagle Eye and other outgoing passive procs.
  const abilityCrit =
    !fizzled && effectivePlayerDamage > 0
      ? rollSpellCrit(effectiveStat(character, 'spirit'), effectivePlayerDamage)
      : { damage: effectivePlayerDamage, crit: false, multiplier: 1 };
  effectivePlayerDamage = abilityCrit.damage;

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

  // Thorns + active check (based on post-attack monster HP).
  const thornDamage = calcThornsDamage(stateForRound.monster, effectivePlayerDamage);
  const activeResult = checkMonsterActive(
    stateForRound.monster,
    monsterHpBefore,
    newMonsterHp,
    stateForRound.activeUsed ?? false,
  );

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
  const {
    incoming,
    perRound,
    finalPlayerHp: rawFinalPlayerHp,
    finalPlayerMagic,
    outcome: rawOutcome,
    droppedItems,
  } = roundResult;
  const actualMonsterDamage = incoming.damage;

  const finalPlayerHp =
    thornDamage > 0 ? Math.max(0, rawFinalPlayerHp - thornDamage) : rawFinalPlayerHp;
  const outcome = rawOutcome === 'win' ? 'win' : finalPlayerHp === 0 ? 'loss' : rawOutcome;

  // summon-add: when the active fires, monster gains flat HP (current + cap).
  const summonAddHp = activeResult.bonusHp;
  const newMaxMonsterHp =
    stateForRound.monster.hp + (stateForRound.monsterBonusHp ?? 0) + summonAddHp;
  const hpAfterSummon = newMonsterHp + summonAddHp;

  const vampiricHeal =
    hpAfterSummon === 0
      ? 0
      : calcVampiricHeal(
          stateForRound.monster,
          actualMonsterDamage,
          hpAfterSummon,
          newMaxMonsterHp,
        );
  const specialDrainHeal = calcSpecialDrain(
    resolution.monsterSpecial,
    actualMonsterDamage,
    hpAfterSummon + vampiricHeal,
    newMaxMonsterHp,
  );
  const selfHeal = cappedMonsterSelfHeal(vampiricHeal, specialDrainHeal, newMaxMonsterHp);
  const monsterHpFinal = Math.min(
    newMaxMonsterHp,
    hpAfterSummon + selfHeal + activeResult.bonusHeal,
  );

  // Telegraph/charge + stun: the monster swung iff it survived and the ability
  // didn't stun it (a player-stun on the monster cancels any held charge).
  const charge = resolveChargeOutcome(
    stateForRound,
    specialRes,
    outcome !== 'win' && !resolution.monsterStunned,
    actualMonsterDamage,
    outcome,
  );
  const fizzleNote = fizzleChargeNote(stateForRound.monster.name, charge);
  const monsterFleeing = checkMonsterFlee(
    stateForRound.monster,
    monsterHpFinal,
    newMaxMonsterHp,
    outcome,
    input.modifiers,
    charge.stunApplied,
  );

  const momentumRestore = getMomentumRestore(character, killedMonster);
  const fizzleRefund = fizzled ? COMBAT.FIZZLE_STAMINA_REFUND : 0;
  // Siphon drains stamina each round the monster lands a hit — applied AFTER
  // the ability-cost subtraction and momentum restore so it can fully empty
  // the pool if the monster hits hard enough.
  const staminaBeforeSiphon = Math.min(
    Math.max(0, stateForRound.playerStamina - actualStaminaCost + fizzleRefund) + momentumRestore,
    maxStamina,
  );
  const siphonDrain = calcSiphonDrain(
    stateForRound.monster,
    actualMonsterDamage,
    staminaBeforeSiphon,
  );
  const newStamina = staminaBeforeSiphon - siphonDrain;

  const interimState: FightState = {
    ...stateForRound,
    monsterHp: monsterHpFinal,
    playerHp: finalPlayerHp,
    playerStamina: newStamina,
    playerMagic: finalPlayerMagic,
    activeUsed: (stateForRound.activeUsed ?? false) || activeResult.triggered,
    monsterBonusAtk: (stateForRound.monsterBonusAtk ?? 0) + activeResult.bonusAtk,
    monsterBonusDef: (stateForRound.monsterBonusDef ?? 0) + activeResult.bonusDef,
    monsterBonusHp: (stateForRound.monsterBonusHp ?? 0) + summonAddHp,
  };
  const post = runPostRound(input, interimState, 'ability');
  const modifierNotes = [...pre.notes, ...absorb.notes, ...post.notes];
  if (fizzleNote) modifierNotes.push(fizzleNote);
  if (activeResult.bonusHeal > 0)
    modifierNotes.push(`${stateForRound.monster.name} recovers ${activeResult.bonusHeal} HP!`);
  if (monsterFleeing) modifierNotes.push(`${stateForRound.monster.name} looks ready to bolt!`);

  const logEntry: RoundEntry = {
    round: stateForRound.log.length + 1,
    action: 'ability',
    playerDamage: effectivePlayerDamage,
    monsterDamage: actualMonsterDamage,
    playerDefFailed: resolution.playerDefFailed,
    playerHpAfter: finalPlayerHp,
    monsterHpAfter: monsterHpFinal,
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
    thornsDamage: thornDamage > 0 ? thornDamage : undefined,
    monsterRegen: pre.regenAmount > 0 ? pre.regenAmount : undefined,
    monsterVampiric: vampiricHeal > 0 ? vampiricHeal : undefined,
    monsterActiveTriggered: activeResult.triggered ? activeResult.label : undefined,
    monsterSiphon: siphonDrain > 0 ? siphonDrain : undefined,
    monsterArmorPierce:
      actualMonsterDamage > 0 && monsterArmorPierce(stateForRound.monster) > 0
        ? monsterArmorPierce(stateForRound.monster)
        : undefined,
    monsterSummonAddHp: summonAddHp > 0 ? summonAddHp : undefined,
    monsterDotDamage: pre.dotDamage > 0 ? pre.dotDamage : undefined,
    spiritCrit: abilityCrit.crit || undefined,
    spiritCritMultiplier: abilityCrit.crit ? abilityCrit.multiplier : undefined,
    dodged: roundResult.dodged || undefined,
    monsterAttackType:
      actualMonsterDamage > 0
        ? effectiveAttackType(stateForRound.monster, resolution.monsterSpecial)
        : undefined,
    ...monsterSpecialLogFields(resolution.monsterSpecial, actualMonsterDamage, specialDrainHeal),
    ...chargeLogFields(charge),
    modifierNotes: modifierNotes.length > 0 ? modifierNotes : undefined,
  };

  const activeMessage = activeResult.triggered
    ? `${stateForRound.monster.name}: ${activeResult.label}!`
    : undefined;
  const bannerMessageAbility =
    [post.bannerMessage, activeMessage].filter(Boolean).join(' · ') || undefined;

  const nextState: FightState = {
    ...post.state,
    log: [...stateForRound.log, logEntry],
    outcome,
    droppedItems,
    isFirstAbility: false,
    // 1-round cooldown: the new log length + cooldown; Roll Ability is gated until
    // the player has taken at least one other action.
    abilityReadyOnRound: stateForRound.log.length + 1 + COMBAT.ABILITY_COOLDOWN_ROUNDS,
    executeUsed: stateForRound.executeUsed || executeTriggered,
    monsterHp: monsterHpFinal,
    playerHp: finalPlayerHp,
    monsterCharging: charge.nextCharging,
    playerStunned: charge.stunApplied,
    monsterFleeing,
  };

  return {
    nextState,
    logEntry,
    bannerMessage: bannerMessageAbility,
    pending: {
      kind: 'ability',
      payload: {
        dice: resolution.dice,
        pattern: resolution.pattern,
        ability: resolution.ability,
        formulaBreakdown: resolution.formulaBreakdown,
        monsterRoll: resolution.monsterRoll,
        monsterStunned: resolution.monsterStunned,
        monsterDamage: actualMonsterDamage,
        dodged: roundResult.dodged || undefined,
        monsterAttackType:
          actualMonsterDamage > 0
            ? effectiveAttackType(stateForRound.monster, resolution.monsterSpecial)
            : undefined,
        monsterSpecial: actualMonsterDamage > 0 ? resolution.monsterSpecial : null,
        monsterChargingPrimed: charge.primed,
        playerStunnedApplied: charge.stunApplied || undefined,
        playerDefFailed: resolution.playerDefFailed,
        spiritCrit: abilityCrit.crit || undefined,
        spiritCritMultiplier: abilityCrit.crit ? abilityCrit.multiplier : undefined,
        outcome,
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

  // Telegraph: charged special fires now; a freshly-rolled telegraphed one only
  // winds up. resolveSpell ignores the special when the spell stuns the monster.
  const specialRes = resolveCounterSpecial(stateForRound.monster, stateForRound.monsterCharging);
  const resolution = resolveSpell(
    sm.effect,
    sm.requirement,
    character,
    pre.effectiveMonster,
    specialRes.effective,
  );

  const newMagic = useBloodPact
    ? stateForRound.playerMagic
    : Math.max(0, stateForRound.playerMagic - effectiveMagicCost);
  const bloodPactHpCost = useBloodPact ? 10 : 0;

  // Warlock Soul Drain on spell damage
  const { soulDrainHeal: spellSoulDrain } = resolveLifesteal(character, 0, resolution.playerDamage);

  // Spirit crit — fires only on a successful cast (requirement met) that
  // actually deals damage. Heal-only and stun-only spells never crit.
  const spellCrit =
    resolution.requirementMet && resolution.playerDamage > 0
      ? rollSpellCrit(effectiveStat(character, 'spirit'), resolution.playerDamage)
      : { damage: resolution.playerDamage, crit: false, multiplier: 1 };

  // Absorb (Necro Shield) — applies to the crit'd spell damage.
  const absorb = runAbsorb(input, stateForRound, spellCrit.damage);
  const damageToMonster = absorb.damage;

  const monsterHpBeforeSpell = stateForRound.monsterHp;
  const newMonsterHp = Math.max(0, monsterHpBeforeSpell - damageToMonster);

  const thornDamageSpell = calcThornsDamage(stateForRound.monster, damageToMonster);
  const activeResultSpell = checkMonsterActive(
    stateForRound.monster,
    monsterHpBeforeSpell,
    newMonsterHp,
    stateForRound.activeUsed ?? false,
  );

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
  const {
    incoming,
    perRound,
    finalPlayerHp: rawFinalHpSpell,
    finalPlayerMagic,
    outcome: rawOutcomeSpell,
    droppedItems,
  } = roundResult;
  const actualMonsterDamage = incoming.damage;

  const finalPlayerHp =
    thornDamageSpell > 0 ? Math.max(0, rawFinalHpSpell - thornDamageSpell) : rawFinalHpSpell;
  const outcome =
    rawOutcomeSpell === 'win' ? 'win' : finalPlayerHp === 0 ? 'loss' : rawOutcomeSpell;

  // summon-add: when the active fires, monster gains flat HP (current + cap).
  const summonAddHp = activeResultSpell.bonusHp;
  const newMaxMonsterHp =
    stateForRound.monster.hp + (stateForRound.monsterBonusHp ?? 0) + summonAddHp;
  const hpAfterSummon = newMonsterHp + summonAddHp;

  const vampiricHealSpell =
    hpAfterSummon === 0
      ? 0
      : calcVampiricHeal(
          stateForRound.monster,
          actualMonsterDamage,
          hpAfterSummon,
          newMaxMonsterHp,
        );
  const specialDrainHealSpell = calcSpecialDrain(
    resolution.monsterSpecial,
    actualMonsterDamage,
    hpAfterSummon + vampiricHealSpell,
    newMaxMonsterHp,
  );
  const selfHealSpell = cappedMonsterSelfHeal(
    vampiricHealSpell,
    specialDrainHealSpell,
    newMaxMonsterHp,
  );
  const monsterHpFinalSpell = Math.min(
    newMaxMonsterHp,
    hpAfterSummon + selfHealSpell + activeResultSpell.bonusHeal,
  );

  // Telegraph/charge + stun: the monster swung iff it survived and the spell
  // didn't stun it (a player-stun on the monster cancels any held charge).
  const charge = resolveChargeOutcome(
    stateForRound,
    specialRes,
    outcome !== 'win' && !resolution.monsterStunned,
    actualMonsterDamage,
    outcome,
  );
  const fizzleNote = fizzleChargeNote(stateForRound.monster.name, charge);
  const monsterFleeing = checkMonsterFlee(
    stateForRound.monster,
    monsterHpFinalSpell,
    newMaxMonsterHp,
    outcome,
    input.modifiers,
    charge.stunApplied,
  );

  // Siphon: drain stamina each round the monster lands a hit. Applied AFTER
  // the spell's own restoreStamina effect so a "restore stamina" spell is not
  // immediately drained back down to zero by a same-round counter.
  const staminaAfterRestore = Math.min(
    stateForRound.playerStamina + resolution.staminaRestored,
    maxStamina,
  );
  const siphonDrain = calcSiphonDrain(
    stateForRound.monster,
    actualMonsterDamage,
    staminaAfterRestore,
  );
  const newStamina = staminaAfterRestore - siphonDrain;

  const totalSpellHeal = resolution.healAmount + spellSoulDrain;

  // Bleed/burn: apply the spell's DoT to the still-living monster. Keyed by spell
  // id so re-casting refreshes rather than infinitely stacks the same spell.
  const dotDef = sm.effect.dotDamage;
  const nextMonsterDots =
    resolution.requirementMet && dotDef && monsterHpFinalSpell > 0
      ? applyMonsterDot(stateForRound.monsterDots, {
          key: spellDef.id,
          label: spellDef.name,
          perRound: dotDef.perRound,
          roundsRemaining: dotDef.rounds,
        })
      : stateForRound.monsterDots;

  const interimState: FightState = {
    ...stateForRound,
    monsterHp: monsterHpFinalSpell,
    playerHp: finalPlayerHp,
    playerStamina: newStamina,
    playerMagic: finalPlayerMagic,
    activeUsed: (stateForRound.activeUsed ?? false) || activeResultSpell.triggered,
    monsterBonusAtk: (stateForRound.monsterBonusAtk ?? 0) + activeResultSpell.bonusAtk,
    monsterBonusDef: (stateForRound.monsterBonusDef ?? 0) + activeResultSpell.bonusDef,
    monsterBonusHp: (stateForRound.monsterBonusHp ?? 0) + summonAddHp,
    monsterDots: nextMonsterDots,
  };
  const post = runPostRound(input, interimState, 'spell');
  const modifierNotes = [...pre.notes, ...absorb.notes, ...post.notes];
  if (fizzleNote) modifierNotes.push(fizzleNote);
  if (activeResultSpell.bonusHeal > 0)
    modifierNotes.push(`${stateForRound.monster.name} recovers ${activeResultSpell.bonusHeal} HP!`);
  if (monsterFleeing) modifierNotes.push(`${stateForRound.monster.name} looks ready to bolt!`);

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
    monsterHpAfter: monsterHpFinalSpell,
    soulDrainHeal: spellSoulDrain > 0 ? spellSoulDrain : undefined,
    divineAegisBlocked: incoming.divineAegisBlocked || undefined,
    manaBarrierAbsorbed: incoming.magicDrained > 0 ? incoming.magicDrained : undefined,
    bloodPactUsed: useBloodPact || undefined,
    spiritCrit: spellCrit.crit || undefined,
    spiritCritMultiplier: spellCrit.crit ? spellCrit.multiplier : undefined,
    perRoundHpRestore: perRound.hpRestore > 0 && outcome === null ? perRound.hpRestore : undefined,
    perRoundMagicRestore:
      perRound.magicRestore > 0 && outcome === null ? perRound.magicRestore : undefined,
    thornsDamage: thornDamageSpell > 0 ? thornDamageSpell : undefined,
    monsterRegen: pre.regenAmount > 0 ? pre.regenAmount : undefined,
    monsterVampiric: vampiricHealSpell > 0 ? vampiricHealSpell : undefined,
    monsterActiveTriggered: activeResultSpell.triggered ? activeResultSpell.label : undefined,
    monsterSiphon: siphonDrain > 0 ? siphonDrain : undefined,
    monsterArmorPierce:
      actualMonsterDamage > 0 && monsterArmorPierce(stateForRound.monster) > 0
        ? monsterArmorPierce(stateForRound.monster)
        : undefined,
    monsterSummonAddHp: summonAddHp > 0 ? summonAddHp : undefined,
    monsterDotDamage: pre.dotDamage > 0 ? pre.dotDamage : undefined,
    dodged: roundResult.dodged || undefined,
    monsterAttackType:
      actualMonsterDamage > 0
        ? effectiveAttackType(stateForRound.monster, resolution.monsterSpecial)
        : undefined,
    ...monsterSpecialLogFields(
      resolution.monsterSpecial,
      actualMonsterDamage,
      specialDrainHealSpell,
    ),
    ...chargeLogFields(charge),
    modifierNotes: modifierNotes.length > 0 ? modifierNotes : undefined,
  };

  const activeMessageSpell = activeResultSpell.triggered
    ? `${stateForRound.monster.name}: ${activeResultSpell.label}!`
    : undefined;
  const bannerMessageSpell =
    [post.bannerMessage, activeMessageSpell].filter(Boolean).join(' · ') || undefined;

  const nextState: FightState = {
    ...post.state,
    log: [...stateForRound.log, logEntry],
    outcome,
    droppedItems,
    monsterHp: monsterHpFinalSpell,
    playerHp: finalPlayerHp,
    monsterCharging: charge.nextCharging,
    playerStunned: charge.stunApplied,
    monsterFleeing,
  };

  return {
    nextState,
    logEntry,
    bannerMessage: bannerMessageSpell,
    pending: {
      kind: 'spell',
      payload: {
        spellDef,
        dice: resolution.dice,
        requirementMet: resolution.requirementMet,
        monsterRoll: resolution.monsterRoll,
        monsterStunned: resolution.monsterStunned,
        monsterDamage: actualMonsterDamage,
        dodged: roundResult.dodged || undefined,
        monsterAttackType:
          actualMonsterDamage > 0
            ? effectiveAttackType(stateForRound.monster, resolution.monsterSpecial)
            : undefined,
        monsterSpecial: actualMonsterDamage > 0 ? resolution.monsterSpecial : null,
        monsterChargingPrimed: charge.primed,
        playerStunnedApplied: charge.stunApplied || undefined,
        playerDefFailed: resolution.playerDefFailed,
        outcome,
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
    // Effective WIS (class multiplier applied) so a Wizard's WIS bonus boosts
    // meditate, matching every other combat formula that scales off wisdom.
    const raw = recoveryRoll + effectiveStat(character, 'wisdom');
    recoveredMagic = Math.min(raw, maxMagic - state.playerMagic);
  }

  // Monster gets a free attack (player's defense bypassed). Boss enrage ATK
  // boost applies here too — use effectiveMonster so Spider/Dragon hit harder.
  const baseRecoveryMonster = getMonsterEffectiveStats(state.monster, state);
  const effectiveMonster =
    input.modifiers?.effectiveMonster?.(baseRecoveryMonster, state) ?? baseRecoveryMonster;
  const monsterRoll = Math.ceil(Math.random() * 10);
  // Rogue dodge applies even to the free recovery-window hit. The free attack
  // bypasses player defense (effDef = 0) but the damage-school multiplier still
  // applies via incomingMonsterDamage.
  const dodged = rollClassDodge(character);
  const monsterDamage = dodged
    ? 0
    : incomingMonsterDamage(character, effectiveMonster, effectiveMonster.attack + monsterRoll, 0);
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
    dodged: dodged || undefined,
    monsterAttackType: monsterDamage > 0 ? (effectiveMonster.attackType ?? 'physical') : undefined,
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
        dodged: dodged || undefined,
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

// ─── resolveStunnedSkipAction ─────────────────────────────────────────────────

/**
 * The player is stunned: they forfeit this turn and the monster lands one
 * **undefended** free hit (effDef 0, like the recovery free-hit; Rogue dodge
 * still applies). The hit **never rolls a special** — no chain-stun. Clears
 * `playerStunned`. No regen/DoT/charge interaction — it is a dead turn.
 */
export function resolveStunnedSkipAction(input: ActionInput): ActionResolution {
  const { character } = input;
  const state = input.state;

  const baseMonster = getMonsterEffectiveStats(state.monster, state);
  const effectiveMonster = input.modifiers?.effectiveMonster?.(baseMonster, state) ?? baseMonster;
  const monsterRoll = Math.ceil(Math.random() * 10);
  const dodged = rollClassDodge(character);
  // No special argument → no special on the skip hit (prevents stun-locking).
  const monsterDamage = dodged
    ? 0
    : incomingMonsterDamage(character, effectiveMonster, effectiveMonster.attack + monsterRoll, 0);
  const newPlayerHp = Math.max(0, state.playerHp - monsterDamage);
  const lossOutcome: 'loss' | null = newPlayerHp === 0 ? 'loss' : null;

  const logEntry: RoundEntry = {
    round: state.log.length + 1,
    action: 'stunned',
    playerSkipped: true,
    monsterDamage,
    dodged: dodged || undefined,
    monsterAttackType: monsterDamage > 0 ? (effectiveMonster.attackType ?? 'physical') : undefined,
    playerHpAfter: newPlayerHp,
    monsterHpAfter: state.monsterHp,
  };

  const nextState: FightState = {
    ...state,
    playerHp: newPlayerHp,
    log: [...state.log, logEntry],
    outcome: lossOutcome,
    playerStunned: false,
  };

  // No roll overlay — the action bar's "Stunned" panel + its Continue button is
  // the acknowledgment; the log + last-action recap show the free hit instantly.
  return { nextState, logEntry, pending: { kind: 'none' } };
}

// ─── resolveInterceptAction ───────────────────────────────────────────────────

/**
 * Intercept a fleeing monster. The player rolls d10 + Agility vs the monster's
 * flee roll (`rollFleeIntercept`): **caught** → the monster is slain instantly,
 * `outcome: 'win'` with a full loot roll (→ `onVictory`); **missed** → it escapes,
 * `outcome: 'fled'` with no rewards (→ `onFlee`). Animated via the two-die run
 * display in `ActionRollOverlay` (`intercept` flag). Clears `monsterFleeing`.
 */
export function resolveInterceptAction(input: ActionInput): ActionResolution {
  const { character, streakMultiplier, getPityFor } = input;
  const state = input.state;
  const { playerRoll, agilityBonus, monsterRoll, caught } = rollFleeIntercept(
    character,
    state.monster,
  );

  const droppedItems = caught
    ? rollLoot(state.monster.lootTable, streakMultiplier, getPityFor(state.monster.id))
    : state.droppedItems;

  const logEntry: RoundEntry = {
    round: state.log.length + 1,
    action: 'intercept',
    playerRunRoll: playerRoll,
    agilityBonus,
    monsterRunRoll: monsterRoll,
    interceptCaught: caught,
    playerHpAfter: state.playerHp,
    monsterHpAfter: caught ? 0 : state.monsterHp,
  };

  const nextState: FightState = {
    ...state,
    log: [...state.log, logEntry],
    monsterFleeing: false,
    monsterHp: caught ? 0 : state.monsterHp,
    droppedItems,
    outcome: caught ? 'win' : 'fled',
  };

  return {
    nextState,
    logEntry,
    pending: {
      kind: 'action',
      payload: {
        actionType: 'run',
        dice: [playerRoll, monsterRoll],
        intercept: true,
        interceptCaught: caught,
        outcome: caught ? 'win' : null,
      },
    },
  };
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

  // Rogue dodge applies to the failed-escape free hit too.
  const dodged = rollClassDodge(character);
  const effectiveMonsterDamage = dodged ? 0 : monsterDamage;
  const newPlayerHp = Math.max(0, state.playerHp - effectiveMonsterDamage);
  const runOutcome: 'loss' | null = newPlayerHp === 0 ? 'loss' : null;
  const logEntry: RoundEntry = {
    round: state.log.length + 1,
    action: 'run_failed',
    playerRunRoll: playerRoll,
    agilityBonus,
    monsterRunRoll: monsterRoll,
    monsterDamage: effectiveMonsterDamage,
    dodged: dodged || undefined,
    monsterAttackType:
      effectiveMonsterDamage > 0 ? (state.monster.attackType ?? 'physical') : undefined,
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
        monsterDamage: effectiveMonsterDamage,
        dodged: dodged || undefined,
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

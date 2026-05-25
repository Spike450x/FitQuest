import type { MonsterDef, ItemDef, SpellDiceRequirement } from '@/types';
import type { DicePattern, AbilityDef } from '@/lib/gameLogic/abilities';

// ─── Combat round action types ──────────────────────────────────────────────────

export type RoundAction =
  | 'attack'
  | 'magic'
  | 'run_failed'
  | 'ability'
  | 'spell'
  | 'rest'
  | 'meditate';

export interface RoundEntry {
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
  // monster passive / active events
  thornsDamage?: number;
  monsterRegen?: number;
  monsterVampiric?: number;
  monsterActiveTriggered?: string;
  /** Extra free-form log lines surfaced by combat modifiers (venom tick, shield absorb, etc.). */
  modifierNotes?: string[];
}

export interface FightState {
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
  /** True once the monster's one-shot active ability has fired. */
  activeUsed?: boolean;
  /** Permanent ATK boost from monster active (enrage). */
  monsterBonusAtk?: number;
  /** Permanent DEF boost from monster active (harden). */
  monsterBonusDef?: number;
}

// ─── Pending overlay payloads ───────────────────────────────────────────────────

export interface PendingAction {
  actionType: 'attack' | 'magic' | 'run' | 'rest' | 'meditate';
  /** [roll] for attack/magic/rest/meditate · [playerRoll, monsterRoll] for run. */
  dice: number[];
  monsterRoll?: number;
  attackBonus?: number;
  attackBonusLabel?: 'STR' | 'WIS';
  playerDamage?: number;
  monsterDamage?: number;
  playerDefFailed?: boolean;
  monsterDefFailed?: boolean;
  escaped?: boolean;
  recoveredStamina?: number;
  recoveredMagic?: number;
  outcome?: 'win' | 'loss' | null;
  applyResult: () => Promise<void>;
}

export interface PendingAbility {
  dice: number[];
  pattern: DicePattern | null;
  ability: AbilityDef | null;
  /** Formula intermediates for the overlay breakdown — only present on ability hit (not fizzle). */
  formulaBreakdown?: {
    avgRoll: number;
    statBonus: number;
    gearBonus: number;
    baseHit: number;
    damageMultiplier: number;
    rawDamage: number;
    monsterDef: number;
  };
  applyResult: () => Promise<void>;
}

export interface PendingSpell {
  spellDef: ItemDef;
  dice: number[];
  requirementMet: boolean;
  /** Monster's d10 counter-attack roll (0 if stunned). */
  monsterRoll: number;
  /** Whether the monster was stunned and skipped its counter-attack. */
  monsterStunned: boolean;
  /** Actual damage dealt to the player by the counter-attack (0 if stunned). */
  monsterDamage: number;
  applyResult: () => Promise<void>;
}

export interface PendingRewards {
  xpReward: number;
  /** Streak multiplier applied to xpReward at kill-time (1.0 = no boost). */
  streakMultiplier: number;
  goldReward: number;
  droppedItems: string[];
  monster: MonsterDef;
  uid: string;
}

// ─── Combat modifiers (dungeon-specific seam) ──────────────────────────────────

/**
 * Optional hooks that customise the combat pipeline per-encounter. Arena passes
 * `undefined` and resolvers short-circuit each hook to identity. Dungeons
 * provide a `CombatModifiers` to inject venom DoT, boss enrage, Necro Shield,
 * Dragon ignore-DEF, and to disable Flee in boss rooms.
 *
 * Each hook is pure: it receives the relevant state slice and returns the new
 * value plus an optional log line. Modifiers MAY hold a closure over external
 * React state (e.g. `enrageState`), but the modifier object itself should be
 * memoised so stale closures do not leak between rounds.
 */
export interface CombatModifiers {
  /**
   * Called at the START of every player action (attack/magic/ability/spell)
   * before the monster's HP is read for damage calculation. Use for tickers
   * that should land before the player's strike (venom DoT).
   */
  preActionTick?: (state: FightState) => { state: FightState; log?: string };

  /**
   * Derives the effective MonsterDef passed into `calculateRound` / `resolveAbility`
   * / `resolveSpell`. Use to swap the boss's ATK upward (Spider/Dragon enrage)
   * or to zero DEF (Dragon ignore-DEF).
   */
  effectiveMonster?: (base: MonsterDef, state: FightState) => MonsterDef;

  /**
   * Called AFTER the player's raw damage is computed but BEFORE it lands on
   * the monster. Use to absorb damage (Necro Shield).
   */
  absorbPlayerDamage?: (damage: number, state: FightState) => { damage: number; log?: string };

  /**
   * Called AFTER monster HP has been updated for the round. Use to re-evaluate
   * enrage triggers, apply per-action procs (venom on attack), or surface a
   * banner message.
   */
  postRoundHook?: (
    state: FightState,
    ctx: { actionKind: 'attack' | 'magic' | 'ability' | 'spell' },
  ) => { state: FightState; log?: string; bannerMessage?: string };

  /** Hide the Flee button (boss rooms). */
  fleeDisabled?: boolean;

  /** Hide Rest/Meditate buttons (reserved — currently arena+dungeon both allow). */
  recoveryDisabled?: boolean;
}

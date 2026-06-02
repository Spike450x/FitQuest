import type { MonsterDef, ItemDef, SpellDiceRequirement, MonsterSpecialMove } from '@/types';
import type { DicePattern, AbilityDef } from '@/lib/gameLogic/abilities';

// ─── Combat round action types ──────────────────────────────────────────────────

export type RoundAction =
  | 'attack'
  | 'magic'
  | 'run_failed'
  | 'ability'
  | 'spell'
  | 'rest'
  | 'meditate'
  | 'stunned'
  | 'intercept';

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
  /** Rogue dodged this round's monster hit — damage fully negated. */
  dodged?: boolean;
  /** Damage school of the monster's counter-attack this round (for the log tag). */
  monsterAttackType?: 'physical' | 'magic';
  /** Special move the monster fired on its counter this round (name for the log). */
  monsterSpecialName?: string;
  /** Emoji of the monster special that fired this round. */
  monsterSpecialEmoji?: string;
  /** HP the monster healed from a `drain` special this round. */
  monsterSpecialDrain?: number;
  /** A telegraphed special the monster began *winding up* this round (name). */
  monsterSpecialPrimedName?: string;
  /** Emoji of the telegraphed special the monster began winding up this round. */
  monsterSpecialPrimedEmoji?: string;
  /** True when a `stun` special landed this round — the player will skip next turn. */
  playerStunnedApplied?: boolean;
  /** True on the synthetic `stunned` round where the player forfeits their turn. */
  playerSkipped?: boolean;
  /** Intercept outcome on a monster-flee round: true = caught (slain), false = it escaped. */
  interceptCaught?: boolean;
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
  /** Spell or ability crit fired (Spirit-driven). True when the damage was boosted. */
  spiritCrit?: boolean;
  /** Multiplier applied when spiritCrit fired (1 + bonus, e.g. 1.15 for +15%). */
  spiritCritMultiplier?: number;
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
  /** Stamina drained by a monster's `siphon` passive this round. */
  monsterSiphon?: number;
  /** Effective player-DEF reduction from a monster's `armor-pierce` passive. */
  monsterArmorPierce?: number;
  /** HP added to the monster when `summon-add` active fires. */
  monsterSummonAddHp?: number;
  /** Total spell bleed/burn DoT damage dealt to the monster at the start of this round. */
  monsterDotDamage?: number;
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
  /**
   * Log length (round index) at which Roll Ability becomes available again. The
   * action is gated until `log.length >= abilityReadyOnRound`. Set on every
   * ability roll to `log.length + COMBAT.ABILITY_COOLDOWN_ROUNDS`.
   */
  abilityReadyOnRound?: number;
  /** True once Execute (Assassin) has fired once this fight. */
  executeUsed: boolean;
  /** True once the monster's one-shot active ability has fired. */
  activeUsed?: boolean;
  /** Permanent ATK boost from monster active (enrage). */
  monsterBonusAtk?: number;
  /** Permanent DEF boost from monster active (harden). */
  monsterBonusDef?: number;
  /** One-time HP boost the monster received from `summon-add` (raises both cur + cap). */
  monsterBonusHp?: number;
  /**
   * Active spell bleed/burn DoTs on the monster. Each ticks `perRound` damage
   * (bypassing defense) at the start of the player's offensive actions until
   * `roundsRemaining` reaches 0, then it is dropped. Keyed by spell id so
   * re-casting the same spell refreshes its entry; different spells stack.
   */
  monsterDots?: Array<{ key: string; label: string; perRound: number; roundsRemaining: number }>;
  /**
   * A telegraphed special (heavy / burst / stun) the monster is winding up. Set
   * on the round it is rolled (the counter that round is a normal hit); the
   * charged special FIRES on the next offensive round's counter, then clears.
   * Cancelled if the monster is stunned or killed before it fires.
   */
  monsterCharging?: MonsterSpecialMove | null;
  /**
   * True when a monster `stun` special landed — the player's next action is
   * forfeited (a synthetic `stunned` round) and the monster gets one undefended
   * free hit. Cleared by `resolveStunnedSkipAction`.
   */
  playerStunned?: boolean;
  /**
   * A low-HP monster is trying to flee. The player's next action is replaced by a
   * single intercept roll (`resolveInterceptAction`): out-roll the flee → instant
   * kill + full rewards; lose → it escapes with no rewards.
   */
  monsterFleeing?: boolean;
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
  /** This is a flee-intercept roll (player d10 + AGI vs the monster's flee roll). */
  intercept?: boolean;
  /** Intercept landed — the fleeing monster was caught (slain). */
  interceptCaught?: boolean;
  /** Rogue dodged the incoming monster hit — damage fully negated. */
  dodged?: boolean;
  /** Special move the monster fired on its counter (null/absent when none). */
  monsterSpecial?: MonsterSpecialMove | null;
  /** A telegraphed special the monster began *winding up* this round (overlay tell). */
  monsterChargingPrimed?: MonsterSpecialMove | null;
  /** A `stun` special landed — the player will skip their next turn. */
  playerStunnedApplied?: boolean;
  /** Damage school of the counter — magic when a `burst` special fired. */
  monsterAttackType?: 'physical' | 'magic';
  /**
   * Class-specific damage-taken multiplier for the counter's school. Used by
   * the overlay to show the hidden scaling factor in the formula display.
   * Only meaningful when ≠ 1 (identity), e.g. Warrior magic ×1.3.
   */
  classDamageTakenMult?: number;
  /** Spirit crit fired on a basic attack/magic strike (boosted player damage). */
  spiritCrit?: boolean;
  /** Multiplier applied when spiritCrit fired (1 + bonus, e.g. 1.15 for +15%). */
  spiritCritMultiplier?: number;
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
  /** Monster's raw d10 counter-attack roll (0 when stunned). */
  monsterRoll: number;
  /** True when the ability stunned the monster, skipping the counter-attack. */
  monsterStunned: boolean;
  /** Actual damage the monster dealt to the player this round (0 if stunned/dodged). */
  monsterDamage: number;
  /** Rogue dodged the counter-attack — damage fully negated. */
  dodged?: boolean;
  /** Damage school of the monster's counter-attack (drives the 🔮/⚔️ tag). */
  monsterAttackType?: 'physical' | 'magic';
  /** Special move the monster fired on its counter (null/absent when none). */
  monsterSpecial?: MonsterSpecialMove | null;
  /** A telegraphed special the monster began *winding up* this round (overlay tell). */
  monsterChargingPrimed?: MonsterSpecialMove | null;
  /** A `stun` special landed — the player will skip their next turn. */
  playerStunnedApplied?: boolean;
  /** Player's DEF failed on the counter (physical only — surfaces the 💥 tag). */
  playerDefFailed?: boolean;
  /** Spirit crit fired on the ability's damage. */
  spiritCrit?: boolean;
  /** Multiplier applied when spiritCrit fired. */
  spiritCritMultiplier?: number;
  /** Fight outcome after this round resolves. */
  outcome?: 'win' | 'loss' | null;
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
  /** Rogue dodged the counter-attack — damage fully negated (overrides monsterDamage display). */
  dodged?: boolean;
  /** Damage school of the monster's counter (drives the 🔮/⚔️ tag). */
  monsterAttackType?: 'physical' | 'magic';
  /** Special move the monster fired on its counter (null/absent when none). */
  monsterSpecial?: MonsterSpecialMove | null;
  /** A telegraphed special the monster began *winding up* this round (overlay tell). */
  monsterChargingPrimed?: MonsterSpecialMove | null;
  /** A `stun` special landed — the player will skip their next turn. */
  playerStunnedApplied?: boolean;
  /** Player's DEF failed on the counter (physical only — surfaces the 💥 tag). */
  playerDefFailed?: boolean;
  /** Fight outcome after this round resolves — drives the "Monster slain!" panel. */
  outcome?: 'win' | 'loss' | null;
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
  /** True iff the player did not take any damage during the fight. Drives the `untouched` achievement. */
  flawless: boolean;
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

  /** Disable MONSTER fleeing (dungeon rooms require a kill to advance). */
  monsterFleeDisabled?: boolean;

  /** Hide Rest/Meditate buttons (reserved — currently arena+dungeon both allow). */
  recoveryDisabled?: boolean;
}

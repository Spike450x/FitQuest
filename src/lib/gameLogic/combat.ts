import { COMBAT, CLASS_DEFINITIONS } from './constants';
import { getItemById } from './items';
import type { Character, EquippedGear, MonsterDef, Stats } from '@/types';
import {
  getEscapeBonus,
  hasSureEscape,
  applyIncomingPassives,
  getPerRoundPassives,
} from './passives';
import type { PassiveContext, IncomingPassiveResult, PerRoundPassives } from './passives';

// ─── Effective (class-scaled) stats ────────────────────────────────────────────
// The character sheet advertises per-class stat multipliers (Warrior STR ×1.5,
// Wizard DEF ×0.7, Rogue AGI ×1.5, …). `effectiveStat` is the single source of
// truth that makes those multipliers REAL: every combat and resource-pool
// formula consumes the effective value, not the raw stat. Gear bonuses are
// class-neutral and are added flat by the caller (never scaled here).
//
// PARITY: the resource-pool consumers (playerMaxHp/Stamina/Magic) are mirrored
// in functions/src/gameLogic/combat.ts — keep the multiplier math in sync.

/**
 * A character's effective value for a stat in combat: base stat scaled by the
 * class multiplier (`CLASS_DEFINITIONS[class].statMultipliers`), floored at 0.
 */
export function effectiveStat(
  character: Pick<Character, 'stats' | 'class'>,
  statKey: keyof Stats,
): number {
  const base = Math.max(0, character.stats[statKey] ?? 0);
  const mult = CLASS_DEFINITIONS[character.class].statMultipliers[statKey];
  return Math.floor(base * mult);
}

// ─── Rogue dodge ───────────────────────────────────────────────────────────────
// The one piece of class identity that can't be expressed as a stat multiplier:
// a Rogue's Agility grants a chance to fully negate an incoming monster hit.

/**
 * Chance (0–1) that the Rogue dodges an incoming monster hit. Scales with the
 * Rogue's *effective* Agility and is capped; zero for every other class.
 */
export function classDodgeChance(character: Pick<Character, 'stats' | 'class'>): number {
  if (character.class !== 'rogue') return 0;
  const agility = effectiveStat(character, 'agility');
  return Math.min(COMBAT.ROGUE_DODGE_CAP, agility * COMBAT.ROGUE_DODGE_PER_AGILITY);
}

/** Roll whether a Rogue dodges this monster hit. RNG injected so tests can pin it. */
export function rollClassDodge(
  character: Pick<Character, 'stats' | 'class'>,
  rng: () => number = Math.random,
): boolean {
  const chance = classDodgeChance(character);
  return chance > 0 && rng() < chance;
}

/**
 * Total magic pool available to the player.
 * Scales with effective wisdom; wizards receive an additional flat class bonus.
 */
export function playerMaxMagic(character: Pick<Character, 'stats' | 'class'>): number {
  return (
    COMBAT.BASE_MAGIC +
    effectiveStat(character, 'wisdom') * COMBAT.MAGIC_PER_WISDOM +
    (character.class === 'wizard' ? COMBAT.WIZARD_MAGIC_BONUS : 0)
  );
}

// ─── Spirit-based crit math ──────────────────────────────────────────────────
// Spirit drives both the *chance* a successful spell or ability rolls a critical
// hit and the *damage multiplier* applied when one fires. Stays well below the
// damage swings from base stats — designed as a spike layer, not a replacement
// for STR/WIS scaling.
//
// PARITY: must match functions/src/gameLogic/combat.ts (logActivity branch).
// The crit math currently runs client-side only because the Cloud Function
// doesn't resolve combat damage, but the helpers live in the parity copy so
// future server-side combat moves don't desync.

/** Spirit needed per +1% crit chance. */
export const SPIRIT_PER_CRIT_CHANCE = 1;
/** Spirit needed per +0.5% crit damage. */
export const SPIRIT_PER_CRIT_DAMAGE = 1;
/** Maximum crit chance regardless of Spirit (0–1 fraction). */
export const MAX_SPELL_CRIT_CHANCE = 0.4;
/** Maximum crit damage multiplier (1 + extra). */
export const MAX_SPELL_CRIT_DAMAGE_MULT = 1.25;

/**
 * Probability (0–1) that a successful spell or ability roll triggers a crit,
 * given the character's Spirit stat. +1% per point of Spirit, capped at 40%.
 */
export function spellCritChance(spirit: number): number {
  const raw = (Math.max(0, spirit) / SPIRIT_PER_CRIT_CHANCE) * 0.01;
  return Math.min(MAX_SPELL_CRIT_CHANCE, raw);
}

/**
 * Damage multiplier applied when a crit fires (1 = no boost). +0.5% per point
 * of Spirit, capped at +25%.
 */
export function spellCritDamage(spirit: number): number {
  const raw = 1 + (Math.max(0, spirit) / SPIRIT_PER_CRIT_DAMAGE) * 0.005;
  return Math.min(MAX_SPELL_CRIT_DAMAGE_MULT, raw);
}

/**
 * Helper for combat resolvers: given Spirit, roll the crit and return the
 * effective damage and crit flag. RNG is injected so tests can pin it.
 */
export function rollSpellCrit(
  spirit: number,
  baseDamage: number,
  rng: () => number = Math.random,
): { damage: number; crit: boolean; multiplier: number } {
  if (baseDamage <= 0) return { damage: baseDamage, crit: false, multiplier: 1 };
  const chance = spellCritChance(spirit);
  if (rng() >= chance) return { damage: baseDamage, crit: false, multiplier: 1 };
  const multiplier = spellCritDamage(spirit);
  return { damage: Math.round(baseDamage * multiplier), crit: true, multiplier };
}

// ─── Gear stat aggregation ────────────────────────────────────────────────────

/**
 * Sums stat bonuses from every equipped item (weapon + armor + accessory).
 * Used as the single source of truth for gear contributions to all calculations.
 */
export function totalGearBonuses(equippedGear: EquippedGear | null | undefined): Partial<Stats> {
  const result: Partial<Stats> = {};
  if (!equippedGear) return result;
  for (const itemId of [equippedGear.weapon, equippedGear.armor, equippedGear.accessory]) {
    if (!itemId) continue;
    const def = getItemById(itemId);
    if (!def) continue;
    for (const [key, val] of Object.entries(def.statBonuses) as [keyof Stats, number][]) {
      result[key] = (result[key] ?? 0) + (val ?? 0);
    }
  }
  return result;
}

// ─── Gear bonus helpers ───────────────────────────────────────────────────────

/**
 * Total STR or WIS bonus from all equipped items.
 * Includes weapon AND accessories (e.g. Warrior's Pendant gives +3 STR).
 * attackMode "attack" = physical (uses STR gear), "magic" = magical (uses WIS gear).
 */
export function gearAttackBonus(character: Character, attackMode: 'attack' | 'magic'): number {
  const bonuses = totalGearBonuses(character.equippedGear);
  return attackMode === 'magic' ? (bonuses.wisdom ?? 0) : (bonuses.strength ?? 0);
}

/**
 * Total DEF bonus from all equipped items.
 * Stacks with the character's base defense stat.
 */
export function gearDefenseBonus(character: Character): number {
  return totalGearBonuses(character.equippedGear).defense ?? 0;
}

/**
 * Returns the flat reduction to player effective defense from a monster's
 * `armor-pierce` passive. Zero for any other passive (or no passive).
 */
export function monsterArmorPierce(monster: MonsterDef): number {
  return monster.passive?.id === 'armor-pierce' ? monster.passive.value : 0;
}

/**
 * Player's effective defense for a monster's counter-attack, after applying the
 * monster's `armor-pierce` passive (if any). Stat + gear sum, minus the pierce
 * value, floored at 0.
 *
 * `defFailed` short-circuits to 0 — a failed defense block already zeroes
 * effective DEF, so pierce can't reduce it further.
 */
export function effectivePlayerDefenseVsMonster(
  character: Character,
  monster: MonsterDef,
  defFailed: boolean,
): number {
  if (defFailed) return 0;
  // Effective DEF (class-scaled) + flat gear DEF. The class multiplier here is
  // the incoming damage affinity — Wizard DEF ×0.7 = "weak to physical",
  // Warrior DEF ×1.5 = tanky.
  const totalDef = effectiveStat(character, 'defense') + gearDefenseBonus(character);
  return Math.max(0, totalDef - monsterArmorPierce(monster));
}

/**
 * Returns the flat stamina drain from a monster's `siphon` passive, applied
 * when the monster lands a hit on the player. Zero for any other passive.
 */
export function monsterSiphonAmount(monster: MonsterDef): number {
  return monster.passive?.id === 'siphon' ? monster.passive.value : 0;
}

/** Roll a d10 — returns a value between ATTACK_RNG_MIN (1) and ATTACK_RNG_MAX (10) inclusive. */
export function rollD10(): number {
  return (
    Math.floor(Math.random() * (COMBAT.ATTACK_RNG_MAX - COMBAT.ATTACK_RNG_MIN + 1)) +
    COMBAT.ATTACK_RNG_MIN
  );
}

/**
 * Multiplier applied to a monster's base `xpReward` based on the player's
 * level relative to the monster's level. Closes the XP cliff at level 10
 * (top-tier monsters used to give flat 320 XP regardless of player level).
 *
 * Only **top-tier** monsters (level ≥ 8) benefit from level scaling — low-
 * level mobs stay at base XP so grinding the Goblin Scout at level 20 never
 * becomes optimal. Past the monster's level, the player gets +8% XP per
 * level over the monster, capped at 2.0× (reached at +12 levels).
 *
 * Examples:
 *   playerLevel=10, monsterLevel=10  → 1.00× (no change)
 *   playerLevel=15, monsterLevel=10  → 1.40×
 *   playerLevel=25, monsterLevel=10  → 2.00× (cap)
 *   playerLevel=20, monsterLevel=3   → 1.00× (low-tier mobs ignored)
 */
export function monsterXpScaling(playerLevel: number, monsterLevel: number): number {
  if (monsterLevel < 8) return 1.0;
  const delta = Math.max(0, playerLevel - monsterLevel);
  return Math.min(2.0, 1 + 0.08 * delta);
}

/**
 * Diminishing-returns multiplier on combat XP based on how many battles the
 * player has already won today (UTC day). Discourages grinding loops without
 * hard-capping play — players who genuinely want to fight all day still get
 * something, just not at full rate.
 *
 * `winsToday` is the count BEFORE this win — so it is 0 on the very first
 * kill of the day.
 *
 *   wins 0–9   (1st through 10th win) → 1.0×
 *   wins 10–19 (11th through 20th)   → 0.5×
 *   wins 20–29 (21st through 30th)   → 0.25×
 *   wins 30+   (31st and beyond)     → 0.1×
 *
 * Mirrored server-side in `claimCombatVictory` Cloud Function — see
 * `functions/src/gameLogic/combatXp.ts` for the parity copy that enforces
 * the same curve at award time. A parity test guards the two copies.
 */
export function combatXpDailyMultiplier(winsToday: number): number {
  if (winsToday < 5) return 1.0;
  if (winsToday < 15) return 0.5;
  if (winsToday < 25) return 0.25;
  return 0.1;
}

/**
 * The number of wins before the next diminishing-returns tier kicks in.
 * Used for "N wins until 0.5× XP" UI badges on the combat page.
 * Returns `null` past the final tier (player is already at 0.1×).
 */
export function combatWinsUntilNextPenalty(winsToday: number): {
  remaining: number;
  nextMultiplier: number;
} | null {
  if (winsToday < 5) return { remaining: 5 - winsToday, nextMultiplier: 0.5 };
  if (winsToday < 15) return { remaining: 15 - winsToday, nextMultiplier: 0.25 };
  if (winsToday < 25) return { remaining: 25 - winsToday, nextMultiplier: 0.1 };
  return null;
}

/**
 * Total HP available to the player. Uses effective (class-scaled) stamina and
 * health; gear bonuses are added flat. Mirrored in functions/ (pool parity).
 */
export function playerMaxHp(
  character: Pick<Character, 'stats' | 'equippedGear' | 'class'>,
): number {
  const gear = totalGearBonuses(character.equippedGear);
  return (
    COMBAT.BASE_HP +
    (effectiveStat(character, 'stamina') + (gear.stamina ?? 0)) * COMBAT.HP_PER_STAMINA +
    (effectiveStat(character, 'health') + (gear.health ?? 0)) * COMBAT.HP_PER_HEALTH
  );
}

/**
 * Stamina pool available at the start of a fight. Uses effective (class-scaled)
 * stamina; gear bonuses are added flat. Mirrored in functions/ (pool parity).
 */
export function playerMaxStamina(
  character: Pick<Character, 'stats' | 'equippedGear' | 'class'>,
): number {
  const gear = totalGearBonuses(character.equippedGear);
  return (
    COMBAT.BASE_STAMINA +
    (effectiveStat(character, 'stamina') + (gear.stamina ?? 0)) * COMBAT.STAMINA_PER_STAT
  );
}

/**
 * Calculate one interactive round of combat for Attack or Magic actions.
 *
 * attackMode:
 *   "attack" — physical strike, uses Strength (warrior/rogue playstyle)
 *   "magic"  — magical strike, uses Wisdom  (wizard playstyle, or any class with high WIS)
 *
 * Each defender has a DEFENSE_FAIL_CHANCE of their defense being bypassed entirely.
 *
 * Monster damage in this path is deterministic: flat monster.attack minus player defense.
 * The monster's d10 roll (monsterRoll) is returned for UI animation only — it does NOT
 * affect damage here. Ability and spell resolutions (abilities.ts / spells.ts) add the
 * monster roll to damage for more chaos on those riskier actions.
 */
export function calculateRound(
  character: Character,
  monster: MonsterDef,
  attackMode: 'attack' | 'magic',
): {
  roll: number;
  attackBonus: number;
  attackBonusLabel: 'STR' | 'WIS';
  playerDamage: number;
  monsterRoll: number;
  monsterDamage: number;
  playerDefFailed: boolean;
  monsterDefFailed: boolean;
} {
  const roll = rollD10();

  const statBonus =
    attackMode === 'magic'
      ? Math.floor(effectiveStat(character, 'wisdom') * COMBAT.WISDOM_ATTACK_FACTOR)
      : Math.floor(effectiveStat(character, 'strength') * COMBAT.STRENGTH_ATTACK_FACTOR);
  const weaponBonus = gearAttackBonus(character, attackMode);
  const attackBonus = statBonus + weaponBonus;
  const attackBonusLabel = attackMode === 'magic' ? 'WIS' : 'STR';

  // Monster's defense might fail
  const monsterDefFailed = Math.random() < COMBAT.DEFENSE_FAIL_CHANCE;
  const effectiveMonsterDef = monsterDefFailed ? 0 : monster.defense;
  const playerDamage = Math.max(COMBAT.MIN_DAMAGE, attackBonus + roll - effectiveMonsterDef);

  // Monster rolls its own d10 for its counter-attack
  const monsterRoll = rollD10();

  // Player's defense might fail (stat + gear), and monster's armor-pierce
  // passive reduces what gets through.
  const playerDefFailed = Math.random() < COMBAT.DEFENSE_FAIL_CHANCE;
  const effectivePlayerDef = effectivePlayerDefenseVsMonster(character, monster, playerDefFailed);
  const monsterDamage = Math.max(COMBAT.MIN_DAMAGE, monster.attack - effectivePlayerDef);

  return {
    roll,
    attackBonus,
    attackBonusLabel,
    playerDamage,
    monsterRoll,
    monsterDamage,
    playerDefFailed,
    monsterDefFailed,
  };
}

/**
 * Number of dry kills before pity bonus starts ramping legendary chance.
 * Below this, pure RNG; above, every additional kill adds LEGENDARY_PITY_STEP.
 */
export const LEGENDARY_PITY_THRESHOLD = 10;
/** Additive bonus (per kill above threshold) to a legendary's drop probability. */
export const LEGENDARY_PITY_STEP = 0.02;

/**
 * Roll the loot table for a defeated monster.
 * Each entry is an independent Bernoulli trial — items can each drop (or not)
 * regardless of what else drops. Returns the item IDs that were awarded.
 *
 * streakMultiplier — from the player's active Blessing (streak tier).
 * Applied exclusively to items of rarity "rare", "epic", or "legendary";
 * common and uncommon item chances are unchanged.
 *
 * legendaryDryStreak — kills against this monster since the last legendary
 * drop. Each kill above LEGENDARY_PITY_THRESHOLD adds LEGENDARY_PITY_STEP
 * (additive) to legendary item chances only. Effective chance is still capped
 * at 0.95 so there is always some RNG even at max streak/pity.
 */
export function rollLoot(
  lootTable: Array<{ itemId: string; chance: number }>,
  streakMultiplier = 1.0,
  legendaryDryStreak = 0,
): string[] {
  const RARE_PLUS = new Set(['rare', 'epic', 'legendary']);
  const pityBonus =
    legendaryDryStreak > LEGENDARY_PITY_THRESHOLD
      ? (legendaryDryStreak - LEGENDARY_PITY_THRESHOLD) * LEGENDARY_PITY_STEP
      : 0;

  return lootTable
    .filter(({ itemId, chance }) => {
      const item = getItemById(itemId);
      if (!item) return Math.random() < chance;

      const isRarePlus = RARE_PLUS.has(item.rarity);
      const isLegendary = item.rarity === 'legendary';
      const baseBoosted = isRarePlus ? chance * streakMultiplier : chance;
      const withPity = isLegendary ? baseBoosted + pityBonus : baseBoosted;
      const effectiveChance = Math.min(withPity, 0.95);
      return Math.random() < effectiveChance;
    })
    .map(({ itemId }) => itemId);
}

/**
 * Attempt to run away from combat.
 * Player rolls d10 + Agility bonus vs monster rolls d10.
 * If player total > monsterRoll: escaped — no damage taken.
 * If player total <= monsterRoll: failed — monster attacks, player defense applies.
 */
export function rollRunAway(
  character: Character,
  monster: MonsterDef,
): {
  playerRoll: number;
  agilityBonus: number;
  monsterRoll: number;
  escaped: boolean;
  monsterDamage: number;
  playerDefFailed: boolean;
} {
  const playerRoll = rollD10();
  const gear = totalGearBonuses(character.equippedGear);
  // Effective (class-scaled) Agility + flat gear Agility.
  const effectiveAgility = effectiveStat(character, 'agility') + (gear.agility ?? 0);
  const agilityBonus = Math.floor(effectiveAgility * COMBAT.AGILITY_ESCAPE_FACTOR);
  // Ghost Step (Assassin/Ranger): additional agility-based escape bonus
  const ghostStepBonus = getEscapeBonus(character);
  const monsterRoll = rollD10();
  // Sure Escape (Ranger): always succeeds
  const escaped =
    hasSureEscape(character) || playerRoll + agilityBonus + ghostStepBonus > monsterRoll;

  let monsterDamage = 0;
  let playerDefFailed = false;

  if (!escaped) {
    // Failed escape: monster gets a free hit (armor-pierce applies).
    playerDefFailed = Math.random() < COMBAT.DEFENSE_FAIL_CHANCE;
    const effectivePlayerDef = effectivePlayerDefenseVsMonster(character, monster, playerDefFailed);
    monsterDamage = Math.max(COMBAT.MIN_DAMAGE, monster.attack - effectivePlayerDef);
  }

  return { playerRoll, agilityBonus, monsterRoll, escaped, monsterDamage, playerDefFailed };
}

// ─── resolveRoundOutcome ──────────────────────────────────────────────────────

export interface RoundOutcomeInput {
  /** Monster HP after player damage is applied. */
  newMonsterHp: number;
  /** Player HP after lifesteal/heals but before incoming monster damage. */
  preIncomingPlayerHp: number;
  /** Player magic after spell cost but before Mana Barrier drain. */
  playerMagicBeforeBarrier: number;
  /** Raw monster counter-attack damage before passives. Pass 0 if monster is dead. */
  rawMonsterDamage: number;
  /** Passive evaluation context for the current round. */
  passiveCtx: PassiveContext;
  snapshot: { monster: MonsterDef; droppedItems: string[] };
  character: Character;
  maxHp: number;
  maxMagic: number;
  streakMultiplier: number;
  getPityFor: (monsterId: string) => number;
  /** RNG for the Rogue dodge roll (injectable for tests). Defaults to Math.random. */
  dodgeRng?: () => number;
}

export interface RoundOutcomeResult {
  killedMonster: boolean;
  incoming: IncomingPassiveResult;
  perRound: PerRoundPassives;
  finalPlayerHp: number;
  finalPlayerMagic: number;
  outcome: 'win' | 'loss' | null;
  droppedItems: string[];
  /** True when a Rogue dodged this round's monster hit (damage fully negated). */
  dodged: boolean;
}

/**
 * Shared post-damage pipeline for all three combat action handlers
 * (attack/magic, ability, spell). Computes incoming passives, per-round
 * passives, final HP/magic, round outcome, and loot — in one place.
 */
export function resolveRoundOutcome(input: RoundOutcomeInput): RoundOutcomeResult {
  const {
    newMonsterHp,
    preIncomingPlayerHp,
    playerMagicBeforeBarrier,
    rawMonsterDamage,
    passiveCtx,
    snapshot,
    character,
    maxHp,
    maxMagic,
    streakMultiplier,
    getPityFor,
    dodgeRng,
  } = input;

  const killedMonster = newMonsterHp === 0;

  const incoming = killedMonster
    ? ({
        damage: 0,
        magicDrained: 0,
        divineAegisBlocked: false,
        ironWillActive: false,
      } satisfies IncomingPassiveResult)
    : applyIncomingPassives(character, rawMonsterDamage, passiveCtx);

  // Rogue dodge — fully negate the incoming hit (and any Mana Barrier drain it
  // would have caused). Only rolls when a hit would actually land.
  let dodged = false;
  if (!killedMonster && incoming.damage > 0 && rollClassDodge(character, dodgeRng)) {
    dodged = true;
    incoming.damage = 0;
    incoming.magicDrained = 0;
    incoming.divineAegisBlocked = false;
  }

  const perRound = getPerRoundPassives(character);

  const newPlayerHpRaw = Math.max(0, preIncomingPlayerHp - incoming.damage);
  const outcome: 'win' | 'loss' | null =
    newPlayerHpRaw === 0 ? 'loss' : killedMonster ? 'win' : null;

  const finalPlayerHp =
    outcome === null ? Math.min(newPlayerHpRaw + perRound.hpRestore, maxHp) : newPlayerHpRaw;

  const magicAfterBarrier = Math.max(0, playerMagicBeforeBarrier - incoming.magicDrained);
  const finalPlayerMagic =
    outcome === null
      ? Math.min(magicAfterBarrier + perRound.magicRestore, maxMagic)
      : magicAfterBarrier;

  const droppedItems = killedMonster
    ? rollLoot(snapshot.monster.lootTable, streakMultiplier, getPityFor(snapshot.monster.id))
    : snapshot.droppedItems;

  return {
    killedMonster,
    incoming,
    perRound,
    finalPlayerHp,
    finalPlayerMagic,
    outcome,
    droppedItems,
    dodged,
  };
}

import type { Character, CharacterSubclass, CharacterClass } from "@/types";
import type { AbilityDef } from "./abilities";

// ─── Passive Context ──────────────────────────────────────────────────────────
//
// Snapshot of fight state required to evaluate HP-conditional and resource
// passives. Passed in from the combat page — not stored in game logic files.

export interface PassiveContext {
  /** Player's current HP as a fraction of max (0–1). */
  currentHpPct: number;
  /** Player's current magic pool. */
  currentMagic: number;
  /** True for the first class-ability roll of this fight. */
  isFirstAbility: boolean;
  /** True once Execute has fired this fight (Assassin). */
  executeUsed: boolean;
  /** Raw d10 roll value — undefined when called from ability/spell contexts. */
  roll?: number;
}

// ─── Subclass Catalog ─────────────────────────────────────────────────────────

export interface SubclassDef {
  id: CharacterSubclass;
  parentClass: CharacterClass;
  name: string;
  emoji: string;
  tagline: string;
  passives: string[];
  abilityChanges: string[];
}

export const SUBCLASS_CATALOG: Record<CharacterClass, [SubclassDef, SubclassDef]> = {
  warrior: [
    {
      id: "berserker",
      parentClass: "warrior",
      name: "Berserker",
      emoji: "🪓",
      tagline: "The lower your HP, the harder you hit. Ability cost halved.",
      passives: [
        "Bloodlust — +8% damage per 25% HP lost (up to +32% at near death)",
        "Frenzy — Ability stamina cost 10 → 5",
        "Iron Will — Below 30% HP, take 20% less incoming damage",
        "Battle-Hardened — Every 5 DEF adds +2 to all attack damage",
      ],
      abilityChanges: ["Berserker Rage: 4× damage (up from 3×)"],
    },
    {
      id: "paladin",
      parentClass: "warrior",
      name: "Paladin",
      emoji: "🛡️",
      tagline: "Endure everything. Block attacks by divine will and heal each round.",
      passives: [
        "Divine Aegis — 15% chance per round to fully negate incoming damage",
        "Sacred Vow — Restore 8 HP at the end of each round survived",
        "Iron Will — Below 30% HP, take 20% less incoming damage",
        "Battle-Hardened — Every 5 DEF adds +2 to all attack damage",
      ],
      abilityChanges: [
        "Shield Slam: also heals 15 HP",
        "Unstoppable: also heals 25 HP",
      ],
    },
  ],
  wizard: [
    {
      id: "archmage",
      parentClass: "wizard",
      name: "Archmage",
      emoji: "🔮",
      tagline: "Maximum spell output. Spells hit harder, cost less, magic regens faster.",
      passives: [
        "Arcane Amplification — All spell damage +⌊WIS÷8⌋ bonus",
        "Arcane Mastery — Spell damage ×1.25, spell costs −1 (min 1)",
        "Scholarly — Restore 3 magic per round (base is 2)",
        "Mana Barrier — Up to 10 incoming damage per round absorbed by magic pool",
      ],
      abilityChanges: ["Meteor: also stuns", "Time Warp: 3× damage (up from 2.5×)"],
    },
    {
      id: "warlock",
      parentClass: "wizard",
      name: "Warlock",
      emoji: "💀",
      tagline: "Drain life from every hit. Spend HP when magic runs dry.",
      passives: [
        "Soul Drain — 20% of ALL damage dealt (attacks + abilities) returned as HP",
        "Blood Pact — Spend 10 HP instead of magic to cast any spell",
        "Arcane Amplification — All spell damage +⌊WIS÷8⌋ bonus",
        "Mana Barrier — Up to 10 incoming damage per round absorbed by magic pool",
      ],
      abilityChanges: [
        "Arcane Bolt: +20% lifesteal added",
        "Mana Surge: +30% lifesteal added",
      ],
    },
  ],
  rogue: [
    {
      id: "assassin",
      parentClass: "rogue",
      name: "Assassin",
      emoji: "☠️",
      tagline: "One perfect strike. First ability hits 2× harder. Drop a monster below 15% HP and finish it instantly.",
      passives: [
        "Lethal Opener — First class ability each fight deals 2× damage",
        "Execute — Ability dropping monster below 15% HP kills it instantly (once/fight)",
        "Opening Strike — First ability of the fight costs 0 stamina",
        "Hemorrhage — Lifesteal abilities drain an extra 15% from the enemy",
        "Ghost Step — +⌊AGI÷4⌋ bonus to escape rolls",
      ],
      abilityChanges: [
        "Backstab: now bypasses monster defense",
        "Assassinate: 4× damage (up from 3×)",
      ],
    },
    {
      id: "ranger",
      parentClass: "rogue",
      name: "Ranger",
      emoji: "🏹",
      tagline: "Precise and elusive. Crits on high rolls. Always escapes safely.",
      passives: [
        "Eagle Eye — Rolling 9 or 10 on a d10 attack deals 2× damage",
        "Sure Escape — Retreat always succeeds (no monster counter-attack)",
        "Opening Strike — First ability of the fight costs 0 stamina",
        "Hemorrhage — Lifesteal abilities drain an extra 15% from the enemy",
        "Ghost Step — +⌊AGI÷4⌋ bonus to escape rolls",
      ],
      abilityChanges: [
        "Blade Dance: lifesteal 30% → 55%",
        "Death Mark: also stuns",
      ],
    },
  ],
};

export function getSubclassDef(subclass: CharacterSubclass): SubclassDef | undefined {
  for (const [a, b] of Object.values(SUBCLASS_CATALOG)) {
    if (a.id === subclass) return a;
    if (b.id === subclass) return b;
  }
  return undefined;
}

// ─── Subclass Ability Modifications ──────────────────────────────────────────
//
// Applied inside resolveAbility BEFORE damage is calculated.
// Returns a shallow copy of the ability with subclass tweaks applied.

export interface ModifiedAbility extends AbilityDef {
  /** Flat HP healed at end of the ability round (Paladin subclass bonuses). */
  flatHeal: number;
}

export function applySubclassAbilityMods(
  character: Character,
  ability: AbilityDef,
): ModifiedAbility {
  const mod: ModifiedAbility = { ...ability, flatHeal: 0 };
  const sub = character.subclass;
  if (!sub) return mod;

  switch (sub) {
    // ── Warrior: Berserker ─────────────────────────────────────────────────────
    case "berserker":
      if (ability.id === "berserker-rage") mod.damageMultiplier = 4;
      break;

    // ── Warrior: Paladin ──────────────────────────────────────────────────────
    case "paladin":
      if (ability.id === "shield-slam")  mod.flatHeal = 15;
      if (ability.id === "unstoppable")  mod.flatHeal = 25;
      break;

    // ── Wizard: Archmage ──────────────────────────────────────────────────────
    case "archmage":
      if (ability.id === "meteor")     mod.stunMonster = true;
      if (ability.id === "time-warp")  mod.damageMultiplier = 3;
      break;

    // ── Wizard: Warlock ───────────────────────────────────────────────────────
    case "warlock":
      // Arcane Bolt gets 20% lifesteal; Mana Surge gets 30%
      if (ability.id === "arcane-bolt") mod.lifestealPct = Math.max(mod.lifestealPct, 0.20);
      if (ability.id === "mana-surge")  mod.lifestealPct = Math.max(mod.lifestealPct, 0.30);
      break;

    // ── Rogue: Assassin ───────────────────────────────────────────────────────
    case "assassin":
      if (ability.id === "backstab")    mod.bypassMonsterDef = true;
      if (ability.id === "assassinate") mod.damageMultiplier = 4;
      break;

    // ── Rogue: Ranger ─────────────────────────────────────────────────────────
    case "ranger":
      if (ability.id === "blade-dance") mod.lifestealPct = 0.55;
      if (ability.id === "death-mark")  mod.stunMonster = true;
      break;
  }

  return mod;
}

// ─── Ability Stamina Cost ─────────────────────────────────────────────────────

/**
 * Returns the ACTUAL stamina cost for triggering a class ability this round.
 *
 * Rogue — Opening Strike: first ability of the fight is FREE (cost 0).
 * Berserker — Frenzy: ability cost halved (10 → 5).
 */
export function getAbilityStaminaCost(
  character: Character,
  baseCost: number,
  isFirstAbility: boolean,
): number {
  // Opening Strike — all subclassed rogues: first ability costs 0 stamina
  if (character.class === "rogue" && character.subclass && isFirstAbility) return 0;
  // Frenzy — Berserker: ability cost halved
  if (character.subclass === "berserker") return Math.floor(baseCost / 2);
  return baseCost;
}

// ─── Outgoing Damage Passives ─────────────────────────────────────────────────
//
// Applied to player's outgoing damage AFTER base calculation.
// Call once for regular attacks (pass roll for Eagle Eye) and once for abilities
// (omit roll — Eagle Eye only triggers on d10 attacks, not 6d6 ability rolls).

export interface OutgoingPassiveResult {
  damage: number;
  battleHardenedBonus: number; // flat DEF-based bonus added
  bloodlustMultiplier: number; // multiplier from HP loss (1.0 = no bonus)
  eagleEyeCrit: boolean;       // Ranger — rolled 9+ on d10
}

export function applyOutgoingPassives(
  character: Character,
  baseDamage: number,
  ctx: PassiveContext,
): OutgoingPassiveResult {
  let damage = baseDamage;
  let battleHardenedBonus = 0;
  let bloodlustMultiplier = 1.0;
  let eagleEyeCrit = false;

  // ── All subclassed Warriors ───────────────────────────────────────────────────
  if (character.class === "warrior" && character.subclass) {
    // Battle-Hardened: every 5 DEF → +2 damage
    const defBonus = Math.floor((character.stats.defense ?? 0) / 5) * 2;
    damage += defBonus;
    battleHardenedBonus = defBonus;

    // Berserker — Bloodlust: +8% per 25% HP lost (max +32%)
    if (character.subclass === "berserker") {
      const hpLostPct = 1 - ctx.currentHpPct;
      const tiers = Math.min(Math.floor(hpLostPct / 0.25), 4);
      bloodlustMultiplier = 1 + tiers * 0.08;
      damage = Math.round(damage * bloodlustMultiplier);
    }
  }

  // ── All subclassed Rogues ─────────────────────────────────────────────────────
  if (character.class === "rogue" && character.subclass) {
    // Ranger — Eagle Eye: d10 roll of 9 or 10 → 2× damage (regular attacks only)
    if (character.subclass === "ranger" && ctx.roll !== undefined && ctx.roll >= 9) {
      damage = Math.round(damage * 2);
      eagleEyeCrit = true;
    }
  }

  return { damage, battleHardenedBonus, bloodlustMultiplier, eagleEyeCrit };
}

// ─── Outgoing Ability Damage Passives ─────────────────────────────────────────

/**
 * Extra multiplier applied exclusively to class ABILITY damage.
 *
 * Assassin — Lethal Opener: first ability of the fight deals 2× damage.
 */
export function getAbilityDamageMultiplier(
  character: Character,
  isFirstAbility: boolean,
): number {
  if (character.subclass === "assassin" && isFirstAbility) return 2;
  return 1;
}

// ─── Incoming Damage Passives ─────────────────────────────────────────────────
//
// Applied to damage the PLAYER receives after the monster's attack is resolved.

export interface IncomingPassiveResult {
  damage: number;
  /** HP actually absorbed from magic pool (Mana Barrier). */
  magicDrained: number;
  /** True when Divine Aegis fully blocked the hit. */
  divineAegisBlocked: boolean;
  /** True when Iron Will reduced damage. */
  ironWillActive: boolean;
}

export function applyIncomingPassives(
  character: Character,
  rawDamage: number,
  ctx: PassiveContext,
): IncomingPassiveResult {
  let damage = rawDamage;
  let magicDrained = 0;
  let divineAegisBlocked = false;
  let ironWillActive = false;

  // ── All subclassed Warriors ───────────────────────────────────────────────────
  if (character.class === "warrior" && character.subclass) {
    // Iron Will: below 30% HP → −20% incoming damage
    if (ctx.currentHpPct < 0.30) {
      damage = Math.round(damage * 0.80);
      ironWillActive = true;
    }

    // Paladin — Divine Aegis: 15% chance to fully negate damage
    if (character.subclass === "paladin" && Math.random() < 0.15) {
      damage = 0;
      divineAegisBlocked = true;
    }
  }

  // ── All Wizards ─────────────────────────────────────────────────────────────
  // Mana Barrier is a base wizard class feature (not subclass-gated).
  // Both Archmage and Warlock list it as a perk in the UI, but it's always active
  // for any wizard who has currentMagic available.
  if (character.class === "wizard") {
    if (ctx.currentMagic > 0 && damage > 0) {
      const absorbed = Math.min(10, damage, ctx.currentMagic);
      damage -= absorbed;
      magicDrained = absorbed;
    }
  }

  return { damage, magicDrained, divineAegisBlocked, ironWillActive };
}

// ─── Lifesteal Passives ───────────────────────────────────────────────────────
//
// Call with the ability's base lifestealPct.
// Returns the FINAL lifesteal fraction AND the extra damage drained from monster.
//
// Hemorrhage (all Rogues): if the ability already has lifesteal, add +0.15.
//   The extra 0.15 is ALSO subtracted from the monster's HP (true drain effect).
//
// Soul Drain (Warlock): 20% of ALL damage returns as HP, even 0-lifesteal abilities.

export interface LifestealResult {
  /** Total lifesteal fraction to apply for player HP restoration. */
  totalPct: number;
  /** Extra HP drained from monster by Hemorrhage (on top of playerDamage). */
  hemorrhageDrain: number;
  /** Extra HP healed by Soul Drain (Warlock, on top of lifesteal). */
  soulDrainHeal: number;
}

export function resolveLifesteal(
  character: Character,
  baseLifestealPct: number,
  playerDamage: number,
): LifestealResult {
  let totalPct = baseLifestealPct;
  let hemorrhageDrain = 0;
  let soulDrainHeal = 0;

  // Hemorrhage — all subclassed rogues: +15% lifesteal AND deals extra drain damage to monster
  if (character.class === "rogue" && character.subclass && baseLifestealPct > 0) {
    totalPct += 0.15;
    hemorrhageDrain = Math.round(playerDamage * 0.15);
  }

  // Warlock — Soul Drain: 20% of all damage heals player (independent of lifesteal)
  if (character.subclass === "warlock" && playerDamage > 0) {
    soulDrainHeal = Math.round(playerDamage * 0.20);
  }

  return { totalPct, hemorrhageDrain, soulDrainHeal };
}

// ─── Spell Damage Passives ────────────────────────────────────────────────────

/**
 * Applies wizard passives to raw spell damage.
 * Arcane Amplification (+WIS/8) applies to all wizards.
 * Arcane Mastery (×1.25) applies only to Archmage.
 */
export function applySpellDamagePassives(
  character: Character,
  rawDamage: number,
): number {
  if (character.class !== "wizard" || rawDamage <= 0) return rawDamage;
  let d = rawDamage;
  // Arcane Amplification — all wizards
  d += Math.floor((character.stats.wisdom ?? 0) / 8);
  // Archmage — Arcane Mastery
  if (character.subclass === "archmage") d = Math.round(d * 1.25);
  return d;
}

/**
 * Returns effective spell magic cost after Archmage discount.
 * Archmage — Arcane Mastery: costs −1 (minimum 1).
 */
export function getEffectiveSpellCost(
  character: Character,
  baseCost: number,
): number {
  if (character.subclass === "archmage") return Math.max(1, baseCost - 1);
  return baseCost;
}

/**
 * Returns true when a Warlock can pay a spell's cost with HP instead of magic.
 * Blood Pact: spends 10 HP; player must have > 10 HP to use this.
 */
export function canBloodPact(
  character: Character,
  spellCost: number,
  currentMagic: number,
  currentHp: number,
): boolean {
  return (
    character.subclass === "warlock" &&
    currentMagic < spellCost &&
    currentHp > 10
  );
}

// ─── Per-Round Passive Resources ──────────────────────────────────────────────
//
// Applied at the END of each round in which the player survives (outcome === null).

export interface PerRoundPassives {
  /** Magic points restored this round. */
  magicRestore: number;
  /** HP restored this round (Sacred Vow). */
  hpRestore: number;
}

export function getPerRoundPassives(character: Character): PerRoundPassives {
  let magicRestore = 0;
  let hpRestore = 0;

  // All Wizards — base magic regeneration: +2/round; Archmage (Scholarly) upgrades to +3/round
  if (character.class === "wizard") {
    magicRestore = character.subclass === "archmage" ? 3 : 2;
  }

  // Paladin — Sacred Vow: +8 HP restored at the end of each survived round
  if (character.subclass === "paladin") {
    hpRestore = 8;
  }

  return { magicRestore, hpRestore };
}

// ─── Momentum (Warrior) ───────────────────────────────────────────────────────

/**
 * Returns the stamina restored when a warrior ability scores a killing blow.
 * Momentum passive: killing blow with an ability restores 15 stamina.
 */
export function getMomentumRestore(character: Character, abilityKill: boolean): number {
  if (character.class === "warrior" && abilityKill) return 15;
  return 0;
}

// ─── Execute (Assassin) ───────────────────────────────────────────────────────

/**
 * Returns true if the Assassin's Execute passive should trigger this round.
 * Fires when an ability would reduce monster HP to ≤15% of its maximum.
 * Only fires once per fight.
 */
export function checkExecute(
  character: Character,
  monsterHpBefore: number,
  monsterHpAfter: number,
  monsterMaxHp: number,
  executeUsed: boolean,
): boolean {
  if (character.subclass !== "assassin") return false;
  if (executeUsed) return false;
  if (monsterHpBefore <= 0 || monsterHpAfter < 0) return false;
  return monsterHpAfter <= Math.ceil(monsterMaxHp * 0.15);
}

// ─── Ghost Step / Sure Escape (Rogue) ────────────────────────────────────────

/**
 * Extra flat bonus added to the player's escape roll (Ghost Step).
 * All rogues get +⌊AGI÷4⌋.
 */
export function getEscapeBonus(character: Character): number {
  // Ghost Step — all subclassed rogues: +⌊AGI÷4⌋ escape bonus
  if (character.class !== "rogue" || !character.subclass) return 0;
  return Math.floor((character.stats.agility ?? 0) / 4);
}

/**
 * Returns true when the Ranger's Sure Escape passive guarantees a successful flee
 * regardless of the dice roll.
 */
export function hasSureEscape(character: Character): boolean {
  return character.subclass === "ranger";
}

import type { SpellDiceRequirement, SpellEffect } from "@/types";
import { gearDefenseBonus, rollD10 } from "./combat";
import { COMBAT } from "./constants";
import type { Character, MonsterDef } from "@/types";
import { applySpellDamagePassives } from "./passives";

// ─── Dice check ───────────────────────────────────────────────────────────────

/** Roll N six-sided dice, returning an array of face values (1–6). */
export function rollSpellDice(count: number): number[] {
  return Array.from({ length: count }, () => Math.ceil(Math.random() * 6));
}

/**
 * Return true if the dice roll satisfies the spell's requirement.
 * Each requirement type is an independent check against the provided dice array.
 */
export function checkRequirement(req: SpellDiceRequirement, dice: number[]): boolean {
  switch (req.type) {
    case "sum_gte": {
      const sum = dice.reduce((a, b) => a + b, 0);
      return sum >= (req.value ?? 0);
    }
    case "exact_value": {
      return dice.some((d) => d === req.value);
    }
    case "pair": {
      const counts = new Map<number, number>();
      for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
      return Array.from(counts.values()).some((c) => c >= 2);
    }
    case "three_of_a_kind": {
      const counts = new Map<number, number>();
      for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
      return Array.from(counts.values()).some((c) => c >= 3);
    }
    case "straight": {
      const needed = req.length ?? 3;
      const unique = Array.from(new Set(dice)).sort((a, b) => a - b);
      // Slide a window of `needed` consecutive integers across the unique sorted values
      for (let i = 0; i <= unique.length - needed; i++) {
        let run = true;
        for (let j = 1; j < needed; j++) {
          if (unique[i + j] !== unique[i] + j) { run = false; break; }
        }
        if (run) return true;
      }
      return false;
    }
  }
}

// ─── Human-readable requirement label ─────────────────────────────────────────

/** Short one-line description of the dice requirement, shown on spell cards. */
export function describeRequirement(req: SpellDiceRequirement): string {
  const d = `${req.diceCount}d6`;
  switch (req.type) {
    case "sum_gte":        return `Roll ${d} — total ≥ ${req.value}`;
    case "exact_value":    return `Roll ${d} — get at least one ${req.value}`;
    case "pair":           return `Roll ${d} — get any pair`;
    case "three_of_a_kind": return `Roll ${d} — get three of a kind`;
    case "straight":       return `Roll ${d} — get a straight of ${req.length ?? 3}`;
  }
}

// ─── Spell resolution ─────────────────────────────────────────────────────────

export interface SpellResolution {
  dice: number[];
  requirementMet: boolean;
  /** Extra damage dealt to monster (after defense, if applicable). */
  playerDamage: number;
  /** HP restored to player. */
  healAmount: number;
  /** Stamina restored to player. */
  staminaRestored: number;
  /** Whether the monster is stunned (skips counter-attack). */
  monsterStunned: boolean;
  /** Extra defense bonus applied to this round's incoming monster attack. */
  defenseBoost: number;
  /** Damage the monster deals back to the player (0 if stunned). */
  monsterDamage: number;
  /** Whether the player's defense was bypassed by the monster this round. */
  playerDefFailed: boolean;
}

/**
 * Resolve a spell cast: roll dice, check requirement, apply effect.
 * If the requirement is not met the spell fizzles — magic is still consumed
 * but no effect is applied. Monster always retaliates unless stunned.
 */
export function resolveSpell(
  effect: SpellEffect,
  req: SpellDiceRequirement,
  character: Character,
  monster: MonsterDef,
): SpellResolution {
  const dice = rollSpellDice(req.diceCount);
  const requirementMet = checkRequirement(req, dice);

  let playerDamage = 0;
  let healAmount = 0;
  let staminaRestored = 0;
  let monsterStunned = false;
  let defenseBoost = 0;

  const wis = character.stats.wisdom ?? 0;

  if (requirementMet) {
    // ── Deal damage ──────────────────────────────────────────────────────────
    if (effect.damage) {
      const baseRaw = effect.damage + (effect.damageScalesWithWisdom ? wis : 0);
      // Apply wizard passives (Arcane Amplification, Archmage ×1.25) to raw pre-defense damage
      const raw = applySpellDamagePassives(character, baseRaw);
      playerDamage = effect.bypassMonsterDef
        ? raw
        : Math.max(1, raw - monster.defense);
    }

    // ── Lifesteal: heal a fraction of damage dealt ───────────────────────────
    if (effect.lifestealPct && playerDamage > 0) {
      healAmount += Math.round(playerDamage * effect.lifestealPct);
    }

    // ── Flat heal ────────────────────────────────────────────────────────────
    if (effect.heal) {
      healAmount += effect.heal + (effect.healScalesWithWisdom ? wis : 0);
    }

    staminaRestored = (effect.restoreStamina ?? 0) + (effect.staminaScalesWithWisdom ? wis : 0);
    monsterStunned  = effect.stun ?? false;
    defenseBoost    = (effect.defenseBoost ?? 0) + (effect.defenseScalesWithWisdom ? wis : 0);
  }

  // ── Monster counter-attack (skipped if stunned) ──────────────────────────
  let monsterDamage = 0;
  let playerDefFailed = false;
  if (!monsterStunned) {
    const monsterRoll = rollD10();
    const totalDef = (character.stats.defense ?? 0) + gearDefenseBonus(character) + defenseBoost;
    playerDefFailed = Math.random() < COMBAT.DEFENSE_FAIL_CHANCE;
    const effectiveDef = playerDefFailed ? 0 : totalDef;
    monsterDamage = Math.max(COMBAT.MIN_DAMAGE, monster.attack + monsterRoll - effectiveDef);
  }

  return {
    dice,
    requirementMet,
    playerDamage,
    healAmount,
    staminaRestored,
    monsterStunned,
    defenseBoost,
    monsterDamage,
    playerDefFailed,
  };
}

// ─── Highlight helper ─────────────────────────────────────────────────────────

/**
 * Returns the indices of dice that contributed to satisfying the requirement.
 * Used to highlight matching dice in the UI.
 */
export function getHighlightedSpellDiceIndices(
  dice: number[],
  req: SpellDiceRequirement,
): number[] {
  if (!checkRequirement(req, dice)) return [];

  switch (req.type) {
    case "sum_gte": return dice.map((_, i) => i); // all dice contribute to the sum
    case "exact_value": return dice.reduce<number[]>((acc, d, i) => {
      if (d === req.value) acc.push(i);
      return acc;
    }, []);
    case "pair":
    case "three_of_a_kind": {
      const counts = new Map<number, number[]>();
      dice.forEach((d, i) => {
        if (!counts.has(d)) counts.set(d, []);
        counts.get(d)!.push(i);
      });
      const needed = req.type === "pair" ? 2 : 3;
      for (const indices of Array.from(counts.values())) {
        if (indices.length >= needed) return indices.slice(0, needed);
      }
      return [];
    }
    case "straight": {
      const needed = req.length ?? 3;
      const unique = Array.from(new Set(dice)).sort((a, b) => a - b);
      for (let i = 0; i <= unique.length - needed; i++) {
        let run = true;
        for (let j = 1; j < needed; j++) {
          if (unique[i + j] !== unique[i] + j) { run = false; break; }
        }
        if (run) {
          const matchValues = new Set(unique.slice(i, i + needed));
          return dice.reduce<number[]>((acc, d, idx) => {
            if (matchValues.has(d)) { matchValues.delete(d); acc.push(idx); }
            return acc;
          }, []);
        }
      }
      return [];
    }
  }
}

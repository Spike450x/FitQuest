import type { CharacterClass, Stats, ActivityType } from '@/types';

// ─── Class Definitions ────────────────────────────────────────────────────────

export const CLASS_DEFINITIONS: Record<
  CharacterClass,
  {
    label: string;
    description: string;
    emoji: string;
    startingStats: Stats;
    statMultipliers: Stats;
  }
> = {
  warrior: {
    label: 'Warrior',
    description:
      'Masters of physical combat. Heavy plate armor and a shield give them the highest natural defense. Best for tanking through long fights.',
    emoji: '⚔️',
    startingStats: {
      strength: 8,
      stamina: 6,
      agility: 4,
      health: 7,
      wisdom: 3,
      defense: 6,
      spirit: 3,
    },
    statMultipliers: {
      strength: 1.4,
      stamina: 1.1,
      agility: 0.85,
      health: 1.2,
      wisdom: 0.8,
      defense: 1.35,
      spirit: 0.9,
    },
  },
  wizard: {
    label: 'Wizard',
    description:
      'Glass cannon in cloth robes. Lowest defense in the game — kill fast with magic or die. Wisdom grows rapidly from nutrition and mindfulness.',
    emoji: '🧙',
    // +2 health vs the original (6→8) — the lowest-defense class needed a
    // small HP cushion so early-game encounters aren't one-shot reset tickets.
    startingStats: {
      strength: 3,
      stamina: 5,
      agility: 6,
      health: 8,
      wisdom: 8,
      defense: 1,
      spirit: 7,
    },
    statMultipliers: {
      strength: 0.8,
      stamina: 0.95,
      agility: 1.0,
      health: 1.0,
      wisdom: 1.4,
      defense: 0.8,
      spirit: 1.25,
    },
  },
  rogue: {
    label: 'Rogue',
    description:
      'Light leather armor and quick reflexes. Agility is their edge — harder to catch and easier to escape. High stamina fuels relentless special attacks.',
    emoji: '🗡️',
    startingStats: {
      strength: 5,
      stamina: 8,
      agility: 8,
      health: 5,
      wisdom: 6,
      defense: 3,
      spirit: 3,
    },
    statMultipliers: {
      strength: 1.2,
      stamina: 1.4,
      agility: 1.4,
      health: 0.9,
      wisdom: 1.0,
      defense: 1.05,
      spirit: 1.1,
    },
  },
};

/**
 * Per-class incoming-damage multiplier by damage school. This is the **magic
 * axis** of the combat triangle: physical damage is already governed entirely
 * by effective DEF (so the Warrior's high DEF / Wizard's low DEF do the work
 * there — no extra physical multiplier, which would double-penalize the
 * Wizard). Magic, by contrast, **ignores armor**, so this table is where it
 * gets its texture: the high-DEF Warrior fears casters (×1.3), the Wizard's
 * arcane wards shrug magic off (×0.75), and the Rogue is neutral (it leans on
 * dodge instead). 1.0 = neutral. Tunable via the balance model.
 */
export const CLASS_DAMAGE_TAKEN: Record<CharacterClass, { physical: number; magic: number }> = {
  warrior: { physical: 1.0, magic: 1.3 },
  wizard: { physical: 1.0, magic: 0.75 },
  rogue: { physical: 1.0, magic: 1.0 },
};

// ─── Activity Definitions ─────────────────────────────────────────────────────

export const ACTIVITY_DEFINITIONS = {
  workout: {
    label: 'Workout',
    description: 'Resistance training, weightlifting, or gym session',
    unit: 'minutes',
  },
  run: { label: 'Run', description: 'Running or jogging, tracked in miles', unit: 'miles' },
  steps: { label: 'Steps', description: 'Daily step count', unit: 'steps' },
  sleep: { label: 'Sleep', description: 'Hours of sleep (7–9 is optimal)', unit: 'hours' },
  water: { label: 'Water', description: 'Glasses of water (8oz each)', unit: 'glasses' },
  nutrition: { label: 'Nutrition', description: 'Healthy meals logged', unit: 'meals' },
  meditation: {
    label: 'Meditation',
    description: 'Mindful breathing or focus sessions, tracked in minutes',
    unit: 'minutes',
  },
} as const;

// ─── Resource Restore (via activities) ───────────────────────────────────────
// Sleep restores Stamina · Water restores Magic · Nutrition restores HP ·
// Meditation also restores Magic (stacks with Water).
// These are capped at the player's current maximum — logging when full does nothing.

export const RESTORE = {
  /** HP restored per healthy meal logged. 3 meals = +60 HP. */
  HP_PER_MEAL: 20,
  /** Stamina restored per hour of sleep. 8h = +40 stamina. */
  STAMINA_PER_SLEEP_HOUR: 5,
  /** Magic restored per glass of water. 8 glasses = +40 magic. */
  MAGIC_PER_WATER_GLASS: 5,
  /** Magic restored per minute of meditation. 30 min = +6 magic. */
  MAGIC_PER_MEDITATION_MINUTE: 0.2,
};

// ─── Mastery System ───────────────────────────────────────────────────────────
// Logging run/workout/steps/meditation builds mastery toward permanent +1 stat
// milestones. Open-ended: milestones fire at log 5, then every 10 forever
// (5, 15, 25, …).

export type MasteryActivityType = 'run' | 'workout' | 'steps' | 'meditation';

export const MASTERY_ACTIVITIES = new Set<ActivityType>(['run', 'workout', 'steps', 'meditation']);
export const RESTORE_ACTIVITIES = new Set<ActivityType>([
  'nutrition',
  'sleep',
  'water',
  'meditation',
]);

export const MASTERY_CONFIG: Record<
  MasteryActivityType,
  { linkedStat: 'agility' | 'strength' | 'wisdom' | 'spirit'; linkedStatLabel: string }
> = {
  run: { linkedStat: 'agility', linkedStatLabel: 'Agility' },
  workout: { linkedStat: 'strength', linkedStatLabel: 'Strength' },
  steps: { linkedStat: 'wisdom', linkedStatLabel: 'Wisdom' },
  meditation: { linkedStat: 'spirit', linkedStatLabel: 'Spirit' },
};

/** Returns true if this log count hits a mastery milestone (5, 15, 25, 35, …). */
export function isMasteryMilestone(count: number): boolean {
  return count === 5 || (count > 5 && (count - 5) % 10 === 0);
}

/** Returns the next milestone log count above the given count. */
export function nextMasteryMilestone(count: number): number {
  if (count < 5) return 5;
  return Math.floor((count - 5) / 10) * 10 + 15;
}

// ─── Level-Up Bonuses ─────────────────────────────────────────────────────────

export const LEVEL_UP = {
  /** Health stat auto-increased per level gained. */
  HEALTH_PER_LEVEL: 1,
  /** Defense stat auto-increased per level gained. */
  DEFENSE_PER_LEVEL: 1,
  /** Player-choice stat points awarded per level gained. */
  STAT_POINTS_PER_LEVEL: 1,
};

// ─── XP / Leveling ────────────────────────────────────────────────────────────
// Note: these are calculation functions co-located here so constants and their
// derived formulas stay in one place. Pure data lives above; pure XP math lives
// in xp.ts, but xpToNextLevel must be here because constants.ts itself uses it
// (LEVEL_UP block) and xp.ts imports FROM here to avoid a circular dependency.

/** XP required to reach a given level from the previous level. */
export function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

/** Flat cap for primary combat stats: Strength, Wisdom, Agility. */
export const PRIMARY_STAT_CAP = 50;

// ─── Quests ───────────────────────────────────────────────────────────────────

/**
 * Gold cost to reroll a single quest. Replaces the quest with a new pick from
 * the appropriate pool (daily/weekly), excluding the player's currently-active
 * questDefIds so they get genuine variety. Gold sink + variety pressure-valve
 * for players who roll a quest they can't complete today.
 */
export const QUEST_REROLL_BASE = 100;

/**
 * Reroll cost scales with character level so the daily/weekly quest pools
 * stay "cheap variety" for new players while costing high-level cherry-pickers
 * proportionally more. With the post-PR5a pool sizes (61 daily / 31 weekly),
 * a flat 100g lets endgame players churn through the highest-XP entries with
 * negligible gold pressure — this stepped scale restores that pressure.
 *
 *   Level 1–4  → 100g
 *   Level 5–9  → 100g (Math.floor(5/5) = 1)
 *   Level 10–14 → 200g
 *   Level 15+  → 300g
 */
export function questRerollCost(level: number): number {
  return QUEST_REROLL_BASE * Math.max(1, Math.floor(level / 5));
}

/**
 * Level-scaled cap for secondary stats: Stamina, Health, Defense.
 * Formula: level × 5 + 10 (so level 1 cap = 15, level 10 cap = 60).
 */
export function maxStatForLevel(level: number): number {
  return level * 5 + 10;
}

/** Returns the stat cap for a given stat key at the character's current level. */
export function statCap(stat: keyof import('@/types').Stats, level: number): number {
  if (stat === 'strength' || stat === 'wisdom' || stat === 'agility' || stat === 'spirit')
    return PRIMARY_STAT_CAP;
  return maxStatForLevel(level);
}

// ─── Combat ──────────────────────────────────────────────────────────────────

export const COMBAT = {
  /** Base HP before stamina/health bonuses. */
  BASE_HP: 50,
  /**
   * HP gained per point of stamina. Health is the primary HP stat (×2); stamina
   * contributes a smaller amount and mainly drives the ability pool. This split
   * keeps the Rogue's high Stamina multiplier from doubling as a tankiness buff.
   */
  HP_PER_STAMINA: 1,
  /** HP gained per point of health — the primary max-HP stat. */
  HP_PER_HEALTH: 2,
  /** RNG range added to attack rolls (d10). */
  ATTACK_RNG_MIN: 1,
  ATTACK_RNG_MAX: 10,
  /** Strength contribution to physical attack (full stat value). */
  STRENGTH_ATTACK_FACTOR: 1.0,
  /** Wisdom contribution to magic attack (full stat value). */
  WISDOM_ATTACK_FACTOR: 1.0,
  /** Agility contribution to escape roll when running away (full stat value). */
  AGILITY_ESCAPE_FACTOR: 1.0,
  /**
   * Rogue-only: dodge chance gained per point of *effective* Agility. A dodged
   * hit is fully negated (0 damage). Every other class has no dodge.
   */
  ROGUE_DODGE_PER_AGILITY: 0.005,
  /** Maximum Rogue dodge chance regardless of Agility (0–1 fraction). */
  ROGUE_DODGE_CAP: 0.25,
  /** Minimum damage dealt per hit. */
  MIN_DAMAGE: 1,
  /**
   * Probability (0–1) that a defender's defense stat is bypassed entirely.
   * Applies to both player defense and monster defense each round.
   * At 0.25: defense fails 1 in 4 attacks.
   */
  DEFENSE_FAIL_CHANCE: 0.25,
  /** Base stamina pool available at the start of every fight. */
  BASE_STAMINA: 20,
  /** Stamina pool points per point of stamina stat. */
  STAMINA_PER_STAT: 5,
  /** Stamina cost to trigger a special class ability. */
  ABILITY_STAMINA_COST: 10,
  /**
   * Stamina refunded when an ability roll fizzles (no dice pattern matched).
   * Half the full cost — the player is still penalized for the failed gambit
   * but not so harshly that abilities feel disposable.
   */
  FIZZLE_STAMINA_REFUND: 5,
  // ── Magic (spell system) ───────────────────────────────────────────────────
  /** Base magic pool before wisdom bonuses. */
  BASE_MAGIC: 20,
  /** Magic pool points per point of wisdom stat. */
  MAGIC_PER_WISDOM: 3,
  /** Extra magic awarded to wizards (class bonus). */
  WIZARD_MAGIC_BONUS: 10,
  /** Maximum number of spells a player can have equipped when entering combat. */
  MAX_EQUIPPED_SPELLS: 5,
  /** Maximum number of consumables a player can have packed when entering combat. */
  MAX_EQUIPPED_CONSUMABLES: 5,
  /**
   * Charges per equipped spell per combat encounter (arena) or dungeon run
   * (dungeons). Flat across all rarities — charges reset after every arena
   * fight and only at rest sites inside a dungeon.
   */
  SPELL_MAX_CHARGES: 3,
};

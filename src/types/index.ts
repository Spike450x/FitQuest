// ─── Achievements ─────────────────────────────────────────────────────────────

export type AchievementId =
  | 'dungeon-initiate'
  | 'goblin-slayer'
  | 'web-walker'
  | 'dark-arts'
  | 'dragonheart'
  | 'legendary-haul';

// ─── Character ───────────────────────────────────────────────────────────────

export type CharacterClass = 'warrior' | 'wizard' | 'rogue';

export type CharacterSubclass =
  | 'berserker' // warrior
  | 'paladin' // warrior
  | 'archmage' // wizard
  | 'warlock' // wizard
  | 'assassin' // rogue
  | 'ranger'; // rogue

export interface Stats {
  strength: number;
  stamina: number;
  agility: number;
  health: number;
  wisdom: number;
  defense: number;
  /**
   * Primary stat (cap 50) — drives spell/ability crit chance and crit damage.
   * Built via Meditation mastery (parallel to Steps→Wisdom). Optional on the
   * interface so legacy character docs still typecheck; readers must use
   * `(stats.spirit ?? 0)`. Backfilled by characterStore.fetchCharacter once
   * per legacy doc, mirroring the agility migration.
   */
  spirit?: number;
}

export interface EquippedGear {
  weapon: string | null;
  armor: string | null;
  accessory: string | null;
}

export interface Character {
  uid: string;
  name: string;
  class: CharacterClass;
  level: number;
  xp: number;
  xpToNextLevel: number;
  gold: number;
  stats: Stats;
  equippedGear: EquippedGear;
  createdAt: number; // unix ms
  currentHp?: number; // persists between battles; undefined = full HP
  currentStamina?: number; // persists between battles; undefined = full stamina
  currentMagic?: number; // persists between battles; undefined = full magic
  pendingStatPoints?: number; // unspent level-up stat points; 0 = none pending
  subclass?: CharacterSubclass; // chosen at level 10; undefined = not yet chosen
  /** Log counts for mastery activities — incremented on each log, milestones grant +1 stat. */
  masteryCounts?: Partial<Record<'run' | 'workout' | 'steps' | 'meditation', number>>;
  /**
   * Per-monster legendary dry streak — kills since the last legendary drop from
   * that monster. Drives the pity system in rollLoot(): once it climbs past
   * LEGENDARY_PITY_THRESHOLD, every additional kill gets a soft boost to its
   * legendary chance. Resets to 0 on a legendary drop.
   */
  legendaryDryStreak?: Record<string, number>;
  /**
   * Per-monster kill tally for the bestiary surface (PR5). Incremented every
   * time a monster is defeated (arena or dungeon). `firstKilledAt` is the unix
   * ms timestamp of the first kill — used to greet the player with a "new
   * monster" toast on initial discovery.
   */
  monstersKilled?: Record<string, { killCount: number; firstKilledAt: number }>;
  dungeonRunsToday?: DungeonRunsToday;
  activeDungeonRunId?: string | null;
  achievements?: AchievementId[];
  streakData?: {
    currentStreak: number;
    longestStreak: number;
    lastLogDate: string; // "YYYY-MM-DD" UTC
    /** Grace-day shields available; consumed instead of resetting on a single missed day. */
    shields?: number;
    /** Last shield refill date ("YYYY-MM-DD" UTC) — refills weekly. */
    shieldsRefilledOn?: string;
  };
  personalRecords?: Partial<
    Record<
      ActivityType,
      {
        value: number;
        loggedAt: number; // unix ms
        unit: string;
      }
    >
  >;
}

// ─── Activity ────────────────────────────────────────────────────────────────

export type ActivityType =
  | 'workout'
  | 'run'
  | 'steps'
  | 'sleep'
  | 'water'
  | 'nutrition'
  | 'meditation';

export interface ActivityLog {
  id: string;
  uid: string;
  type: ActivityType;
  data: Record<string, number | string>;
  statGains: Partial<Stats>;
  xpGained: number;
  loggedAt: number;
  /**
   * True when the logged amount was within the daily cap and XP / stat rewards
   * were actually granted. False when the log was over-cap (recorded for
   * streak/PR purposes only). The Firestore rule enforces that a false value
   * can never be paired with xpGained > 0 or non-empty statGains, preventing
   * a client from skipping the cap check and forging reward-bearing logs.
   */
  rewardEligible: boolean;
}

// ─── Items ───────────────────────────────────────────────────────────────────

export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'spell';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** Effect applied when a consumable item is used (potions, elixirs). */
/**
 * Single-resource restores use `restore_hp | restore_stamina | restore_magic` with a
 * flat `amount`. Multi-resource elixirs use `multi` with an array of per-resource
 * restore steps — each step is applied in order by `inventoryStore.useConsumable`
 * and totals roll up into the `{ hpGained, staminaGained, magicGained }` return shape.
 */
export type ConsumableEffect =
  | { type: 'restore_hp' | 'restore_stamina' | 'restore_magic'; amount: number }
  | {
      type: 'multi';
      restores: Array<{ resource: 'hp' | 'stamina' | 'magic'; amount: number }>;
    };

// ─── Spell system ─────────────────────────────────────────────────────────────

export type SpellDiceRequirementType =
  | 'sum_gte' // sum of all dice ≥ value
  | 'exact_value' // at least one die shows exactly value
  | 'pair' // any two dice show the same value
  | 'three_of_a_kind' // any three dice show the same value
  | 'straight'; // N consecutive distinct values among the dice

export interface SpellDiceRequirement {
  type: SpellDiceRequirementType;
  diceCount: number; // how many d6 to roll (2, 3, or 4)
  value?: number; // for sum_gte: the minimum sum; for exact_value: the face required
  length?: number; // for straight: how many consecutive values needed (default 3)
}

/** The in-combat effect applied when a spell's dice requirement is met. */
export interface SpellEffect {
  damage?: number; // extra damage dealt to monster
  damageScalesWithWisdom?: boolean; // if true, adds character.stats.wisdom to damage
  heal?: number; // HP restored to player
  healScalesWithWisdom?: boolean; // if true, adds character.stats.wisdom to heal
  restoreStamina?: number; // stamina restored to player
  staminaScalesWithWisdom?: boolean; // if true, adds character.stats.wisdom to stamina restore
  stun?: boolean; // monster skips its counter-attack this round
  defenseBoost?: number; // +N defense applied to player for this round's monster hit
  defenseScalesWithWisdom?: boolean; // if true, adds character.stats.wisdom to defenseBoost
  bypassMonsterDef?: boolean; // monster defense is ignored when dealing spell damage
  lifestealPct?: number; // fraction (0–1) of damage dealt returned as HP
}

/** All configuration needed to cast and resolve a spell in combat. */
export interface SpellConfig {
  requirement: SpellDiceRequirement;
  effect: SpellEffect;
  magicCost: number;
  classRestriction: CharacterClass | 'all';
}

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  statBonuses: Partial<Stats>;
  price: number;
  tier: number;
  description: string;
  effect?: ConsumableEffect;
  /** Spell configuration — only present when type === "spell". */
  spellMechanics?: SpellConfig;
  /** If true, item can only be obtained via monster loot — never appears in the shop. */
  lootOnly?: boolean;
}

export interface InventoryItem {
  id: string;
  itemDefId: string;
  quantity: number;
  equipped: boolean;
  acquiredAt: number;
  /**
   * Remaining spell charges for this fight or dungeon run.
   * `undefined` means full (COMBAT.SPELL_MAX_CHARGES). Only set on spell
   * items; gear and consumables never carry this field.
   */
  charges?: number;
}

// ─── Quests ──────────────────────────────────────────────────────────────────

export type QuestType = 'daily' | 'weekly';

export interface QuestReward {
  xp: number;
  gold: number;
  itemId?: string;
}

/** A single activity requirement within a quest. */
export interface QuestTarget {
  activityType: ActivityType;
  target: number;
  unit: string;
}

export interface QuestDef {
  id: string;
  name: string;
  description: string;
  type: QuestType;
  /** Primary requirement. Progress is tracked in `ActiveQuest.progress`. */
  requirement: QuestTarget;
  /**
   * Additional targets for multi-activity quests. Progress for each target is
   * tracked in `ActiveQuest.extraProgress` keyed by `activityType`. A quest is
   * complete only when ALL targets (primary + extra) have been reached.
   */
  extraTargets?: QuestTarget[];
  rewards: QuestReward;
}

export interface ActiveQuest {
  id: string;
  uid: string;
  questDefId: string;
  /** Progress toward `QuestDef.requirement`. */
  progress: number;
  /**
   * Progress toward each entry in `QuestDef.extraTargets`, keyed by
   * `activityType`. Only present on multi-target quests.
   */
  extraProgress?: Record<string, number>;
  completedAt: number | null;
  claimedAt: number | null;
  expiresAt: number;
  rewards: QuestReward;
  /**
   * The XP actually awarded at claim time (post-level-scaling + streak multiplier).
   * Stamped by `questStore.claimReward`. Absent on quests claimed before this field
   * was introduced — fall back to `rewards.xp` (base definition value) in that case.
   */
  rewardedXp?: number;
  /**
   * The gold actually awarded at claim time (post-level-scaling).
   * Same provenance as `rewardedXp`.
   */
  rewardedGold?: number;
}

// ─── Combat ──────────────────────────────────────────────────────────────────

/** Permanent passive trait active every offensive round. */
export type MonsterPassiveId = 'thorns' | 'regen' | 'vampiric' | 'siphon' | 'armor-pierce';

export interface MonsterPassive {
  id: MonsterPassiveId;
  /** Human-readable label shown as a badge on the monster portrait. */
  label: string;
  /**
   * Numeric magnitude:
   *   thorns       — % of incoming player damage reflected back (integer 0–100)
   *   regen        — flat HP healed each offensive round
   *   vampiric     — % of monster counter-attack damage returned as HP (integer 0–100)
   *   siphon       — flat stamina drained from player per landed monster hit
   *   armor-pierce — flat reduction to player effective defense vs this monster
   */
  value: number;
}

/** One-shot ability triggered once when monster HP falls below a threshold. */
export type MonsterActiveId = 'enrage' | 'harden' | 'summon-add';

export interface MonsterActive {
  id: MonsterActiveId;
  /** HP fraction (0–1) of max HP that triggers the active. */
  triggerPct: number;
  /** Short label surfaced as a combat-log note and arena badge after triggering. */
  label: string;
  /**
   * Numeric magnitude:
   *   enrage     — permanent ATK boost on trigger
   *   harden     — permanent DEF boost on trigger
   *   summon-add — one-time HP bonus added to current and max monster HP
   */
  value: number;
}

export interface MonsterDef {
  id: string;
  name: string;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  xpReward: number;
  goldReward: number;
  lootTable: Array<{ itemId: string; chance: number }>;
  description: string;
  passive?: MonsterPassive;
  active?: MonsterActive;
}

/**
 * Summary of one round in a completed fight — reserved for a future battle-summary
 * screen or server-side replay. The active combat page uses its own RoundEntry type
 * (local to combat/page.tsx) for live rendering and does not currently consume these.
 */
export interface CombatRound {
  round: number;
  playerDamage: number;
  monsterDamage: number;
  playerHpRemaining: number;
  monsterHpRemaining: number;
}

/** Full summary of a completed fight. See CombatRound note above. */
export interface CombatResult {
  outcome: 'win' | 'loss';
  rounds: CombatRound[];
  rewards: { xp: number; gold: number; itemId?: string };
}

// ─── Dungeons ─────────────────────────────────────────────────────────────────

export type DungeonTierId = 'goblin-caves' | 'spider-lair' | 'dark-sanctum' | 'dragons-keep';

export type DungeonRoomType = 'combat' | 'stat-check' | 'rest' | 'boss';

export interface DungeonRoomDef {
  type: DungeonRoomType;
  /** monsterId from MONSTER_CATALOG or DUNGEON_BOSSES — present for combat and boss rooms. */
  monsterId?: string;
  cleared: boolean;
  lootAwarded: string[];
  xpAwarded: number;
  goldAwarded: number;
}

export interface DungeonRun {
  id: string;
  uid: string;
  tierId: DungeonTierId;
  weekSeed: number;
  status: 'active' | 'completed' | 'abandoned';
  currentRoom: number;
  rooms: DungeonRoomDef[];
  currentHp: number;
  currentStamina: number;
  currentMagic: number;
  legendaryEligible: boolean;
  cumulativeXp: number;
  cumulativeGold: number;
  allDroppedItems: string[];
  startedAt: number;
  completedAt: number | null;
  /** True after the player has claimed rewards. Prevents double-award on re-open. */
  claimed?: boolean;
}

export interface DungeonRunsToday {
  date: string; // 'YYYY-MM-DD' UTC
  count: number; // runs started today (0–2)
  legendaryUsed: boolean;
}

/** Active venom DoT applied to a monster during a dungeon run combat room. */
export interface PoisonedStatus {
  roundsRemaining: number;
  damagePerRound: number;
}

/** Tracks boss enrage state across rounds in a dungeon run. */
export interface BossEnrageState {
  triggered: boolean;
  /** Dragon King: how many rounds of ignore-DEF remain (0 when inactive). */
  dragonIgnoreDefRoundsLeft: number;
  /** Necromancer: HP remaining in the one-time absorb shield (0 when spent). */
  necroShieldHp: number;
}

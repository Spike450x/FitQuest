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
  masteryCounts?: Partial<Record<'run' | 'workout' | 'steps', number>>;
  streakData?: {
    currentStreak: number;
    longestStreak: number;
    lastLogDate: string; // "YYYY-MM-DD" UTC
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

export type ActivityType = 'workout' | 'run' | 'steps' | 'sleep' | 'water' | 'nutrition';

export interface ActivityLog {
  id: string;
  uid: string;
  type: ActivityType;
  data: Record<string, number | string>;
  statGains: Partial<Stats>;
  xpGained: number;
  loggedAt: number;
}

// ─── Items ───────────────────────────────────────────────────────────────────

export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'spell';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** Effect applied when a consumable item is used (potions, elixirs). */
export interface ConsumableEffect {
  type: 'restore_hp' | 'restore_stamina' | 'restore_magic';
  amount: number;
}

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
}

// ─── Quests ──────────────────────────────────────────────────────────────────

export type QuestType = 'daily' | 'weekly';

export interface QuestReward {
  xp: number;
  gold: number;
  itemId?: string;
}

export interface QuestDef {
  id: string;
  name: string;
  description: string;
  type: QuestType;
  requirement: {
    activityType: ActivityType;
    target: number;
    unit: string;
  };
  rewards: QuestReward;
}

export interface ActiveQuest {
  id: string;
  uid: string;
  questDefId: string;
  progress: number;
  completedAt: number | null;
  claimedAt: number | null;
  expiresAt: number;
  rewards: QuestReward;
}

// ─── Combat ──────────────────────────────────────────────────────────────────

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

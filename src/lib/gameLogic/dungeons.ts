import type {
  DungeonTierId,
  DungeonRoomDef,
  DungeonRoomType,
  PoisonedStatus,
  BossEnrageState,
  Character,
  MonsterDef,
} from '@/types';
import { totalGearBonuses } from './combat';

// ─── Tier definitions ─────────────────────────────────────────────────────────

export interface DungeonTierDef {
  id: DungeonTierId;
  name: string;
  entryFee: number;
  xpMultiplier: number;
  minRooms: number;
  maxRooms: number;
  recLevelMin: number;
  recLevelMax: number | null;
  monsterPool: string[];
  statCheckThresholds: { str: number; wis: number; agi: number };
  failureDamagePct: number;
}

export const DUNGEON_TIERS: Record<DungeonTierId, DungeonTierDef> = {
  'goblin-caves': {
    id: 'goblin-caves',
    name: 'Goblin Caves',
    entryFee: 50,
    xpMultiplier: 1.5,
    minRooms: 3,
    maxRooms: 5,
    recLevelMin: 1,
    recLevelMax: 5,
    monsterPool: ['goblin-scout', 'giant-rat', 'forest-goblin'],
    statCheckThresholds: { str: 12, wis: 10, agi: 10 },
    failureDamagePct: 0.1,
  },
  'spider-lair': {
    id: 'spider-lair',
    name: 'Spider Lair',
    entryFee: 100,
    xpMultiplier: 1.6,
    minRooms: 3,
    maxRooms: 6,
    recLevelMin: 4,
    recLevelMax: 8,
    monsterPool: ['cave-spider', 'forest-goblin', 'orc-grunt'],
    statCheckThresholds: { str: 16, wis: 14, agi: 14 },
    failureDamagePct: 0.15,
  },
  'dark-sanctum': {
    id: 'dark-sanctum',
    name: 'Dark Sanctum',
    entryFee: 200,
    xpMultiplier: 1.75,
    minRooms: 4,
    maxRooms: 6,
    recLevelMin: 7,
    recLevelMax: 10,
    monsterPool: ['skeleton-warrior', 'dark-wolf', 'dark-mage'],
    statCheckThresholds: { str: 19, wis: 16, agi: 16 },
    failureDamagePct: 0.2,
  },
  'dragons-keep': {
    id: 'dragons-keep',
    name: "Dragon's Keep",
    entryFee: 400,
    xpMultiplier: 2.0,
    minRooms: 4,
    maxRooms: 7,
    recLevelMin: 10,
    recLevelMax: null,
    monsterPool: ['stone-troll', 'dark-mage', 'ancient-dragon'],
    statCheckThresholds: { str: 25, wis: 21, agi: 21 },
    failureDamagePct: 0.25,
  },
};

// ─── Boss definitions ─────────────────────────────────────────────────────────

export interface DungeonBossDef extends MonsterDef {
  enrageTriggerPct: number | null;
  enrageDescription: string | null;
  bossLootTable: Array<{ itemId: string; chance: number }>;
}

export const DUNGEON_BOSSES: Record<DungeonTierId, DungeonBossDef> = {
  'goblin-caves': {
    id: 'boss-goblin-king',
    name: 'The Goblin King',
    level: 7,
    hp: 140,
    attack: 18,
    defense: 8,
    xpReward: 150,
    goldReward: 80,
    lootTable: [],
    bossLootTable: [
      { itemId: 'goblin-king-signet', chance: 0.35 },
      { itemId: 'scavengers-chain', chance: 0.45 },
      { itemId: 'flintsteel-dagger', chance: 0.6 },
    ],
    description: 'The self-styled king of the caves. Crude but dangerous.',
    enrageTriggerPct: null,
    enrageDescription: null,
  },
  'spider-lair': {
    id: 'boss-broodmother',
    name: 'The Broodmother',
    level: 10,
    hp: 200,
    attack: 22,
    defense: 11,
    xpReward: 240,
    goldReward: 120,
    lootTable: [],
    bossLootTable: [
      { itemId: 'venomfang-bracer', chance: 0.3 },
      { itemId: 'arachnoweave-cloak', chance: 0.45 },
      { itemId: 'spiderspun-tome', chance: 0.25 },
    ],
    description: 'The nest-mother. She grows stronger when threatened.',
    enrageTriggerPct: 0.25,
    enrageDescription: 'Enraged — +5 ATK permanently',
  },
  'dark-sanctum': {
    id: 'boss-necromancer',
    name: 'The High Necromancer',
    level: 11,
    hp: 280,
    attack: 28,
    defense: 14,
    xpReward: 360,
    goldReward: 180,
    lootTable: [],
    bossLootTable: [
      { itemId: 'bone-lattice-armor', chance: 0.35 },
      { itemId: 'necrotic-staff', chance: 0.25 },
      { itemId: 'wraithbound-ring', chance: 0.15 },
    ],
    description: "The Sanctum's master. At half HP a dark shield envelops him.",
    enrageTriggerPct: 0.5,
    enrageDescription: 'Necro Shield active — absorbing up to 30 damage',
  },
  'dragons-keep': {
    id: 'boss-dragon-king',
    name: 'The Ancient Dragon King',
    level: 15,
    hp: 380,
    attack: 36,
    defense: 18,
    xpReward: 550,
    goldReward: 300,
    lootTable: [],
    bossLootTable: [
      { itemId: 'draconic-sigil', chance: 0.2 },
      { itemId: 'emberclaw-gauntlets', chance: 0.35 },
      { itemId: 'scale-dragon-king', chance: 0.15 },
    ],
    description: 'An ancient dragon-king. At 30% HP he ignores your armor for 3 rounds.',
    enrageTriggerPct: 0.3,
    enrageDescription: 'Dragon Enraged — ignoring DEF for 3 rounds',
  },
};

// ─── Seeded PRNG ──────────────────────────────────────────────────────────────

/** Deterministic PRNG (mulberry32). Returns a function that produces values in [0, 1). */
export function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

/** ISO week number for a UTC timestamp (ms). Used to derive the weekly seed. */
export function getWeekNumber(nowMs: number = Date.now()): number {
  const d = new Date(nowMs);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Returns the seed for the current week.
 * Combines year × 100 + weekNumber so it rolls over each year.
 */
export function getWeekSeed(nowMs: number = Date.now()): number {
  const d = new Date(nowMs);
  const year = d.getUTCFullYear();
  return year * 100 + getWeekNumber(nowMs);
}

// ─── Layout generation ────────────────────────────────────────────────────────

/**
 * Generates the room sequence for a dungeon tier, deterministically from a seed.
 * The boss room is always last. Rest rooms are 0 or 1 per dungeon.
 * Returns DungeonRoomDef[] with cleared=false and empty awards.
 */
export function generateDungeonLayout(tierId: DungeonTierId, weekSeed: number): DungeonRoomDef[] {
  const tier = DUNGEON_TIERS[tierId];
  const rand = mulberry32(
    weekSeed * 31 + tierId.split('').reduce((a, c) => a + c.charCodeAt(0), 0),
  );

  const roomCount = tier.minRooms + Math.floor(rand() * (tier.maxRooms - tier.minRooms + 1));
  const includeRest = rand() < 0.5;
  const restPosition = includeRest ? Math.floor(rand() * roomCount) : -1;

  const rooms: DungeonRoomDef[] = [];
  let hasStatCheck = false;

  for (let i = 0; i < roomCount; i++) {
    if (i === restPosition) {
      rooms.push({ type: 'rest', cleared: false, lootAwarded: [], xpAwarded: 0, goldAwarded: 0 });
      continue;
    }
    let type: DungeonRoomType;
    if (!hasStatCheck && i === roomCount - 2) {
      // Force a stat check if none placed yet and only 1 non-boss room remains
      type = 'stat-check';
    } else {
      type = rand() < 0.3 ? 'stat-check' : 'combat';
    }
    if (type === 'stat-check') hasStatCheck = true;

    let monsterId: string | undefined;
    if (type === 'combat') {
      monsterId = tier.monsterPool[Math.floor(rand() * tier.monsterPool.length)];
    }
    rooms.push({ type, monsterId, cleared: false, lootAwarded: [], xpAwarded: 0, goldAwarded: 0 });
  }

  // Boss room always last
  const boss = DUNGEON_BOSSES[tierId];
  rooms.push({
    type: 'boss',
    monsterId: boss.id,
    cleared: false,
    lootAwarded: [],
    xpAwarded: 0,
    goldAwarded: 0,
  });

  return rooms;
}

// ─── Stat check resolution ────────────────────────────────────────────────────

export type StatCheckPath = 'str' | 'wis' | 'agi';

export interface StatCheckOption {
  path: StatCheckPath;
  label: string;
  threshold: number;
  playerStat: number;
  passes: boolean;
  isAttemptAnyway: boolean;
}

/**
 * Resolves which stat check paths are available for a given tier.
 * STR is always present; one of WIS/AGI is always present; third path is seeded.
 */
export function resolveStatCheckOptions(
  tierId: DungeonTierId,
  character: Character,
  roomSeed: number,
): StatCheckOption[] {
  const tier = DUNGEON_TIERS[tierId];
  const gear = totalGearBonuses(character.equippedGear);

  const stats = {
    str: character.stats.strength + (gear.strength ?? 0),
    wis: character.stats.wisdom + (gear.wisdom ?? 0),
    agi: character.stats.agility + (gear.agility ?? 0),
  };

  const rand = mulberry32(roomSeed);
  const secondPath: StatCheckPath = rand() < 0.5 ? 'wis' : 'agi';
  const thirdPath: StatCheckPath = secondPath === 'wis' ? 'agi' : 'wis';
  const showThird = rand() < 0.5;

  const paths: StatCheckPath[] = ['str', secondPath, ...(showThird ? [thirdPath] : [])];

  const labels: Record<StatCheckPath, string> = {
    str: 'Force it open',
    wis: 'Decipher the runes',
    agi: 'Slip through the gap',
  };

  const options: StatCheckOption[] = paths.map((path) => ({
    path,
    label: labels[path],
    threshold: tier.statCheckThresholds[path],
    playerStat: stats[path],
    passes: stats[path] >= tier.statCheckThresholds[path],
    isAttemptAnyway: false,
  }));

  const anyPass = options.some((o) => o.passes);
  if (!anyPass) {
    // Mark closest-fail as attempt-anyway
    const sorted = [...options].sort(
      (a, b) => b.playerStat - b.threshold - (a.playerStat - a.threshold),
    );
    const closest = sorted[0];
    const idx = options.findIndex((o) => o.path === closest.path);
    options[idx] = { ...options[idx], isAttemptAnyway: true };
  }

  return options;
}

/** HP damage dealt when a player attempts a failed stat check. */
export function statCheckFailureDamage(tierId: DungeonTierId, maxHp: number): number {
  return Math.round(DUNGEON_TIERS[tierId].failureDamagePct * maxHp);
}

// ─── Loot helpers ─────────────────────────────────────────────────────────────

export type LootRarityFilter =
  | 'common-uncommon'
  | 'uncommon-rare'
  | 'rare-epic'
  | 'epic-legendary'
  | 'epic-legendary-locked';

/** Returns the rarity filter for a given room index (0-indexed; boss handled separately). */
export function roomLootFilter(roomIndex: number): LootRarityFilter {
  if (roomIndex === 0) return 'common-uncommon';
  if (roomIndex === 1) return 'uncommon-rare';
  return 'rare-epic';
}

// ─── Venom DoT helpers ────────────────────────────────────────────────────────

/** 20% proc chance. Returns true if venom should be applied this hit. */
export function checkVenomProc(hasVenomfangBracer: boolean): boolean {
  if (!hasVenomfangBracer) return false;
  return Math.random() < 0.2;
}

/** Apply one venom tick. Returns updated monster HP and status (rounds ticked down by 1). */
export function applyVenomTick(
  monsterHp: number,
  poisoned: PoisonedStatus,
): { newMonsterHp: number; newPoisoned: PoisonedStatus } {
  const newMonsterHp = Math.max(0, monsterHp - poisoned.damagePerRound);
  const newPoisoned: PoisonedStatus = {
    ...poisoned,
    roundsRemaining: poisoned.roundsRemaining - 1,
  };
  return { newMonsterHp, newPoisoned };
}

/** Returns a fresh PoisonedStatus when venom proc fires. */
export function createPoisonedStatus(): PoisonedStatus {
  return { roundsRemaining: 3, damagePerRound: 3 };
}

// ─── Boss enrage helpers ──────────────────────────────────────────────────────

export function initialEnrageState(): BossEnrageState {
  return { triggered: false, dragonIgnoreDefRoundsLeft: 0, necroShieldHp: 0 };
}

/**
 * Evaluates boss enrage transitions after a round.
 * Returns the updated BossEnrageState and an optional UI message.
 */
export function evaluateBossEnrage(
  tierId: DungeonTierId,
  bossCurrentHp: number,
  bossMaxHp: number,
  prev: BossEnrageState,
): { next: BossEnrageState; message: string | null } {
  const boss = DUNGEON_BOSSES[tierId];
  if (boss.enrageTriggerPct === null || prev.triggered) {
    // Tick Dragon King's ignore-DEF counter down each round after enrage
    if (tierId === 'dragons-keep' && prev.dragonIgnoreDefRoundsLeft > 0) {
      return {
        next: { ...prev, dragonIgnoreDefRoundsLeft: prev.dragonIgnoreDefRoundsLeft - 1 },
        message: null,
      };
    }
    return { next: prev, message: null };
  }

  const triggerThreshold = boss.enrageTriggerPct * bossMaxHp;
  if (bossCurrentHp > triggerThreshold) return { next: prev, message: null };

  // Trigger enrage
  const next: BossEnrageState = { ...prev, triggered: true };
  if (tierId === 'dark-sanctum') {
    next.necroShieldHp = 30;
  } else if (tierId === 'dragons-keep') {
    next.dragonIgnoreDefRoundsLeft = 3;
  }
  return { next, message: boss.enrageDescription };
}

/**
 * Returns the effective ATK for the boss given enrage state.
 * Called before calculateRound so the MonsterDef passed in has the right ATK.
 */
export function bossEffectiveAtk(
  tierId: DungeonTierId,
  baseAtk: number,
  enrage: BossEnrageState,
): number {
  if (!enrage.triggered) return baseAtk;
  if (tierId === 'spider-lair') return baseAtk + 5;
  if (tierId === 'dragons-keep') return baseAtk + 8;
  return baseAtk;
}

/**
 * Absorbs incoming player damage through the Necromancer shield.
 * Returns remaining shield HP and how much damage actually landed on the boss.
 */
export function applyNecroShield(
  incomingDamage: number,
  shieldHp: number,
): { absorbed: number; shieldHpLeft: number; damageToBoss: number } {
  if (shieldHp <= 0) return { absorbed: 0, shieldHpLeft: 0, damageToBoss: incomingDamage };
  const absorbed = Math.min(incomingDamage, shieldHp);
  return { absorbed, shieldHpLeft: shieldHp - absorbed, damageToBoss: incomingDamage - absorbed };
}

/**
 * True if the Dragon King's ignore-DEF effect is active this round.
 * When active, pass defense=0 to calculateRound for the player side.
 */
export function dragonIgnoresDef(enrage: BossEnrageState): boolean {
  return enrage.dragonIgnoreDefRoundsLeft > 0;
}

// ─── Daily limit helpers ──────────────────────────────────────────────────────

import type { DungeonRunsToday } from '@/types';

export function todayUTCDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function canStartDungeonRun(runsToday: DungeonRunsToday | undefined): boolean {
  if (!runsToday) return true;
  if (runsToday.date !== todayUTCDate()) return true;
  return runsToday.count < 2;
}

export function isLegendaryEligible(runsToday: DungeonRunsToday | undefined): boolean {
  if (!runsToday) return true;
  if (runsToday.date !== todayUTCDate()) return true;
  return !runsToday.legendaryUsed;
}

export function nextDungeonRunsToday(runsToday: DungeonRunsToday | undefined): DungeonRunsToday {
  const today = todayUTCDate();
  if (!runsToday || runsToday.date !== today) {
    return { date: today, count: 1, legendaryUsed: false };
  }
  return { ...runsToday, count: runsToday.count + 1 };
}

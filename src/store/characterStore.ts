import { create } from 'zustand';
import { captureError } from '@/lib/errors';
import { fetchWithRetry, STORE_RETRY_DELAYS } from '@/lib/retry';
import { getCharacterDoc, createCharacterDoc, updateCharacterDoc } from '@/lib/characterData';
import { updateUserDisplayName } from '@/lib/auth';
import { MONSTER_CATALOG } from '@/lib/gameLogic/monsters';
import {
  CLASS_DEFINITIONS,
  xpToNextLevel,
  LEVEL_UP,
  statCap,
  maxStatForLevel,
  MASTERY_CONFIG,
  type MasteryActivityType,
} from '@/lib/gameLogic/constants';
import { playerMaxHp, playerMaxStamina, playerMaxMagic } from '@/lib/gameLogic/combat';
import { applyXp } from '@/lib/gameLogic/xp';
import { applyStatGains } from '@/lib/gameLogic/stats';
import { computeNewStreak, todayUTC } from '@/lib/gameLogic/streaks';
import type { Character, CharacterClass, CharacterSubclass, Stats, ActivityType } from '@/types';

interface CharacterStore {
  character: Character | null;
  loading: boolean;
  error: string | null;
  /** Unix ms timestamp of the last successful fetchCharacter call. Used to debounce redundant re-fetches. */
  lastFetchedAt: number | null;

  // Actions
  /**
   * Load character from Firestore. Skips the read if the same uid was fetched
   * within the last 30 s unless `force` is true. Pass `force: true` after a
   * Cloud Function write that may have updated the character document.
   */
  fetchCharacter: (uid: string, force?: boolean) => Promise<void>;
  createCharacter: (uid: string, name: string, characterClass: CharacterClass) => Promise<void>;
  awardXpAndStats: (xpGained: number, statGains: Partial<Stats>) => Promise<number>;
  awardGold: (amount: number) => Promise<void>;
  /** Instantly updates HP in local state only — no Firestore write. Use for live header during combat. */
  setHpLocal: (hp: number) => void;
  /** Persists current HP to Firestore. Call at end of combat or on retreat. */
  updateCurrentHp: (hp: number) => Promise<void>;
  /** Instantly updates stamina in local state only — no Firestore write. */
  setStaminaLocal: (stamina: number) => void;
  /** Persists current stamina to Firestore. Call at end of combat. */
  updateCurrentStamina: (stamina: number) => Promise<void>;
  /** Instantly updates magic in local state only — no Firestore write. */
  setMagicLocal: (magic: number) => void;
  /** Persists current magic to Firestore. Call at end of combat. */
  updateCurrentMagic: (magic: number) => Promise<void>;
  /**
   * Spend one pending stat point on the given stat.
   * Does nothing if pendingStatPoints === 0.
   */
  allocateStatPoint: (
    stat: 'strength' | 'wisdom' | 'agility' | 'stamina' | 'spirit',
  ) => Promise<void>;
  /** Resets level, XP, and stats back to class starting values (death penalty). */
  resetCharacter: () => Promise<void>;
  /**
   * Updates the player's streak after an activity log and checks for a new
   * personal record on that activity type. Persists both in a single Firestore
   * write. Returns true if a new personal record was set.
   */
  persistStreakAndRecord: (
    activityType: ActivityType,
    value: number,
    unit: string,
  ) => Promise<boolean>;
  /**
   * Optimistically applies a server-confirmed mastery result to local state —
   * no Firestore write. Call after the `logActivity` Cloud Function returns.
   * Mirrors what the function wrote: masteryCounts[activityType] = newCount,
   * and if milestoneHit, stats[linkedStat]++ (capped as usual).
   */
  applyMasteryLocal: (
    activityType: MasteryActivityType,
    newCount: number,
    milestoneHit: boolean,
  ) => void;
  /**
   * Optimistically applies a server-confirmed resource restore to local state —
   * no Firestore write. Call after the `logActivity` Cloud Function returns with
   * a `restored` result. `newValue` is the authoritative value from the function.
   */
  applyRestoreLocal: (resourceType: 'hp' | 'stamina' | 'magic', newValue: number) => void;
  /** Permanently records the chosen subclass. Can only be called once (level 10). */
  chooseSubclass: (subclass: CharacterSubclass) => Promise<void>;
  /**
   * Update the legendary dry-streak counter for a monster after combat resolves.
   * Increments on a kill with no legendary drop; resets to 0 on a legendary
   * drop. Drives the pity system in rollLoot().
   */
  updateMonsterPity: (monsterId: string, gotLegendary: boolean) => Promise<void>;
  /** Updates the character's display name in Firestore and Firebase Auth, then syncs local state. */
  updateName: (uid: string, name: string) => Promise<void>;
  /**
   * Shallow-merge `patch` into the character document and local state. Owns the
   * Firestore write + functional setState pattern, so callers can't accidentally
   * clobber a concurrent write with a stale snapshot. Use this for any
   * client-authoritative write that doesn't have purpose-specific level-up or
   * resource-cap logic (those have their own actions: `awardXpAndStats`,
   * `updateCurrentHp`, etc.).
   *
   * - No-op when there is no character loaded.
   * - When `opts.skipFirestore` is true, only the in-memory state mutates —
   *   useful for tests and for callers that already wrote to Firestore another
   *   way (e.g. an authoritative CF result).
   */
  applyCharacterPatch: (
    patch: Partial<Character>,
    opts?: { skipFirestore?: boolean },
  ) => Promise<void>;
  clear: () => void;
}

const FETCH_TTL_MS = 30_000;

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  character: null,
  loading: false,
  error: null,
  lastFetchedAt: null,

  fetchCharacter: async (uid, force = false) => {
    const { character, lastFetchedAt } = get();
    if (
      !force &&
      character?.uid === uid &&
      lastFetchedAt !== null &&
      Date.now() - lastFetchedAt < FETCH_TTL_MS
    ) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const data = await fetchWithRetry(() => getCharacterDoc(uid), STORE_RETRY_DELAYS);
      if (data) {
        set({ character: data, loading: false, lastFetchedAt: Date.now() });
      } else {
        set({ character: null, loading: false, lastFetchedAt: null });
      }
    } catch (e) {
      captureError('characterStore.fetchCharacter', e);
      set({ error: (e as Error).message, loading: false });
    }
  },

  createCharacter: async (uid, name, characterClass) => {
    set({ loading: true, error: null });
    try {
      const classDef = CLASS_DEFINITIONS[characterClass];
      const level = 1;
      const character: Character = {
        uid,
        name: name.trim(),
        class: characterClass,
        level,
        xp: 0,
        xpToNextLevel: xpToNextLevel(level),
        gold: 50, // starting gold
        stats: { ...classDef.startingStats },
        equippedGear: { weapon: null, armor: null, accessory: null },
        createdAt: Date.now(),
      };
      await createCharacterDoc(uid, character);
      set({ character, loading: false });
    } catch (e) {
      captureError('characterStore.createCharacter', e);
      set({ error: (e as Error).message, loading: false });
    }
  },

  awardXpAndStats: async (xpGained, statGains) => {
    const { character } = get();
    if (!character) return 0;

    try {
      const { level, xp, xpToNextLevel: nextXp, levelsGained } = applyXp(character, xpGained);
      let newStats = applyStatGains(character.stats, statGains, level);

      const updated: Partial<Character> = {
        level,
        xp,
        xpToNextLevel: nextXp,
        stats: newStats,
      };

      // ── Level-up bonuses ──────────────────────────────────────────────────────
      if (levelsGained > 0) {
        const newCap = maxStatForLevel(level);
        // Auto-increase health and defense per level gained
        newStats = {
          ...newStats,
          health: Math.min(newStats.health + LEVEL_UP.HEALTH_PER_LEVEL * levelsGained, newCap),
          defense: Math.min(newStats.defense + LEVEL_UP.DEFENSE_PER_LEVEL * levelsGained, newCap),
        };
        updated.stats = newStats;

        // Award player-choice stat points
        updated.pendingStatPoints =
          (character.pendingStatPoints ?? 0) + LEVEL_UP.STAT_POINTS_PER_LEVEL * levelsGained;

        // Level-up fully restores all combat resources to the new (possibly higher) max.
        updated.currentHp = playerMaxHp({ stats: newStats, equippedGear: character.equippedGear });
        updated.currentStamina = playerMaxStamina({
          stats: newStats,
          equippedGear: character.equippedGear,
        });
        updated.currentMagic = playerMaxMagic({ stats: newStats, class: character.class });
      }

      await updateCharacterDoc(character.uid, updated);
      set({ character: { ...character, ...updated } });

      return levelsGained;
    } catch (e) {
      captureError('characterStore.awardXpAndStats', e);
      return 0;
    }
  },

  awardGold: async (amount) => {
    const { character } = get();
    if (!character) return;

    try {
      const newGold = character.gold + amount;
      await updateCharacterDoc(character.uid, { gold: newGold });
      set({ character: { ...character, gold: newGold } });
    } catch (e) {
      captureError('characterStore.awardGold', e);
    }
  },

  setHpLocal: (hp) => {
    const { character } = get();
    if (!character) return;
    set({ character: { ...character, currentHp: hp } });
  },

  updateCurrentHp: async (hp) => {
    const { character } = get();
    if (!character) return;
    try {
      await updateCharacterDoc(character.uid, { currentHp: hp });
      set({ character: { ...character, currentHp: hp } });
    } catch (e) {
      captureError('characterStore.updateCurrentHp', e);
    }
  },

  setStaminaLocal: (stamina) => {
    const { character } = get();
    if (!character) return;
    set({ character: { ...character, currentStamina: stamina } });
  },

  updateCurrentStamina: async (stamina) => {
    const { character } = get();
    if (!character) return;
    try {
      await updateCharacterDoc(character.uid, { currentStamina: stamina });
      set({ character: { ...character, currentStamina: stamina } });
    } catch (e) {
      captureError('characterStore.updateCurrentStamina', e);
    }
  },

  setMagicLocal: (magic) => {
    const { character } = get();
    if (!character) return;
    set({ character: { ...character, currentMagic: magic } });
  },

  updateCurrentMagic: async (magic) => {
    const { character } = get();
    if (!character) return;
    try {
      await updateCharacterDoc(character.uid, { currentMagic: magic });
      set({ character: { ...character, currentMagic: magic } });
    } catch (e) {
      captureError('characterStore.updateCurrentMagic', e);
    }
  },

  allocateStatPoint: async (stat) => {
    const { character } = get();
    if (!character) return;
    const pending = character.pendingStatPoints ?? 0;
    if (pending <= 0) return;

    try {
      const newStats: Stats = {
        ...character.stats,
        [stat]: Math.min((character.stats[stat] ?? 0) + 1, statCap(stat, character.level)),
      };
      const newPending = pending - 1;
      await updateCharacterDoc(character.uid, { stats: newStats, pendingStatPoints: newPending });
      set({ character: { ...character, stats: newStats, pendingStatPoints: newPending } });
    } catch (e) {
      captureError('characterStore.allocateStatPoint', e);
    }
  },

  resetCharacter: async () => {
    const { character } = get();
    if (!character) return;

    try {
      const classDef = CLASS_DEFINITIONS[character.class];
      const level = 1;
      const resetStats = { ...classDef.startingStats };
      const resetHp = playerMaxHp({
        stats: resetStats,
        equippedGear: { weapon: null, armor: null, accessory: null },
      });

      const reset: Partial<Character> = {
        level,
        xp: 0,
        xpToNextLevel: xpToNextLevel(level),
        stats: resetStats,
        currentHp: resetHp,
      };

      await updateCharacterDoc(character.uid, reset);
      set({ character: { ...character, ...reset } });
    } catch (e) {
      captureError('characterStore.resetCharacter', e);
    }
  },

  persistStreakAndRecord: async (activityType, value, unit) => {
    const { character } = get();
    if (!character) return false;

    try {
      const today = todayUTC();
      const newStreakData = computeNewStreak(character.streakData, today);

      const currentPr = character.personalRecords?.[activityType];
      const isNewRecord = !currentPr || value > currentPr.value;

      const updates: Partial<Character> = { streakData: newStreakData };
      if (isNewRecord) {
        updates.personalRecords = {
          ...character.personalRecords,
          [activityType]: { value, loggedAt: Date.now(), unit },
        };
      }

      await updateCharacterDoc(character.uid, updates);
      set({ character: { ...character, ...updates } });

      return isNewRecord;
    } catch (e) {
      captureError('characterStore.persistStreakAndRecord', e);
      return false;
    }
  },

  applyMasteryLocal: (activityType, newCount, milestoneHit) => {
    const { character } = get();
    if (!character) return;

    const updates: Partial<Character> = {
      masteryCounts: { ...character.masteryCounts, [activityType]: newCount },
    };

    if (milestoneHit) {
      const { linkedStat } = MASTERY_CONFIG[activityType];
      updates.stats = {
        ...character.stats,
        [linkedStat]: Math.min(
          (character.stats[linkedStat] ?? 0) + 1,
          statCap(linkedStat, character.level),
        ),
      };
    }

    set({ character: { ...character, ...updates } });
  },

  applyRestoreLocal: (resourceType, newValue) => {
    const { character } = get();
    if (!character) return;
    const field =
      resourceType === 'hp'
        ? 'currentHp'
        : resourceType === 'stamina'
          ? 'currentStamina'
          : 'currentMagic';
    set({ character: { ...character, [field]: newValue } });
  },

  chooseSubclass: async (subclass) => {
    const { character } = get();
    if (!character) return;
    if (character.level < 10 || character.subclass) return;
    try {
      await updateCharacterDoc(character.uid, { subclass });
      set({ character: { ...character, subclass } });
    } catch (e) {
      captureError('characterStore.chooseSubclass', e);
    }
  },

  updateMonsterPity: async (monsterId, gotLegendary) => {
    const { character } = get();
    if (!character) return;

    try {
      const current = character.legendaryDryStreak?.[monsterId] ?? 0;
      const next = gotLegendary ? 0 : current + 1;

      // Prune keys for monsters no longer in the catalog so the map stays bounded
      // as the catalog evolves. Runs inline with the write — no extra reads needed.
      const validIds = new Set(MONSTER_CATALOG.map((m) => m.id));
      const pruned = Object.fromEntries(
        Object.entries({ ...character.legendaryDryStreak, [monsterId]: next }).filter(([id]) =>
          validIds.has(id),
        ),
      );

      // Bestiary tally — increment kill count and stamp first-killed timestamp
      // on initial discovery. Stays bounded by the same MONSTER_CATALOG prune.
      const existingKill = character.monstersKilled?.[monsterId];
      const nowMs = Date.now();
      const nextKilled = {
        killCount: (existingKill?.killCount ?? 0) + 1,
        firstKilledAt: existingKill?.firstKilledAt ?? nowMs,
      };
      const monstersKilled = Object.fromEntries(
        Object.entries({ ...character.monstersKilled, [monsterId]: nextKilled }).filter(([id]) =>
          validIds.has(id),
        ),
      );

      await updateCharacterDoc(character.uid, {
        legendaryDryStreak: pruned,
        monstersKilled,
      });
      set({
        character: { ...character, legendaryDryStreak: pruned, monstersKilled },
      });
    } catch (e) {
      captureError('characterStore.updateMonsterPity', e);
    }
  },

  updateName: async (uid, name) => {
    try {
      await updateCharacterDoc(uid, { name });
      await updateUserDisplayName(name);
      set((state) => ({
        character: state.character ? { ...state.character, name } : null,
      }));
    } catch (e) {
      captureError('characterStore.updateName', e);
    }
  },

  applyCharacterPatch: async (patch, opts) => {
    const { character } = get();
    if (!character) return;
    try {
      if (!opts?.skipFirestore) {
        await updateCharacterDoc(character.uid, patch);
      }
      set((state) => ({
        character: state.character ? { ...state.character, ...patch } : null,
      }));
    } catch (e) {
      captureError('characterStore.applyCharacterPatch', e);
    }
  },

  clear: () => set({ character: null, loading: false, error: null, lastFetchedAt: null }),
}));

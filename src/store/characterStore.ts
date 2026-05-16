import { create } from 'zustand';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  CLASS_DEFINITIONS,
  xpToNextLevel,
  LEVEL_UP,
  statCap,
  MASTERY_CONFIG,
  isMasteryMilestone,
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
  allocateStatPoint: (stat: 'strength' | 'wisdom' | 'agility' | 'stamina') => Promise<void>;
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
      const snap = await getDoc(doc(db, 'characters', uid));
      if (snap.exists()) {
        const data = snap.data() as Character;
        // Backfill: agility was added after launch; old character docs don't have it.
        if (!data.stats?.agility) {
          const startingAgility = CLASS_DEFINITIONS[data.class].startingStats.agility;
          data.stats = { ...data.stats, agility: startingAgility };
          await updateDoc(doc(db, 'characters', uid), { 'stats.agility': startingAgility });
        }
        set({ character: data, loading: false, lastFetchedAt: Date.now() });
      } else {
        set({ character: null, loading: false, lastFetchedAt: null });
      }
    } catch (e) {
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
      await setDoc(doc(db, 'characters', uid), character);
      set({ character, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  awardXpAndStats: async (xpGained, statGains) => {
    const { character } = get();
    if (!character) return 0;

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
      const newCap = level * 5 + 10;
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

    await updateDoc(doc(db, 'characters', character.uid), updated);
    set({ character: { ...character, ...updated } });

    return levelsGained;
  },

  awardGold: async (amount) => {
    const { character } = get();
    if (!character) return;

    const newGold = character.gold + amount;
    await updateDoc(doc(db, 'characters', character.uid), { gold: newGold });
    set({ character: { ...character, gold: newGold } });
  },

  setHpLocal: (hp) => {
    const { character } = get();
    if (!character) return;
    set({ character: { ...character, currentHp: hp } });
  },

  updateCurrentHp: async (hp) => {
    const { character } = get();
    if (!character) return;

    await updateDoc(doc(db, 'characters', character.uid), { currentHp: hp });
    set({ character: { ...character, currentHp: hp } });
  },

  setStaminaLocal: (stamina) => {
    const { character } = get();
    if (!character) return;
    set({ character: { ...character, currentStamina: stamina } });
  },

  updateCurrentStamina: async (stamina) => {
    const { character } = get();
    if (!character) return;
    await updateDoc(doc(db, 'characters', character.uid), { currentStamina: stamina });
    set({ character: { ...character, currentStamina: stamina } });
  },

  setMagicLocal: (magic) => {
    const { character } = get();
    if (!character) return;
    set({ character: { ...character, currentMagic: magic } });
  },

  updateCurrentMagic: async (magic) => {
    const { character } = get();
    if (!character) return;
    await updateDoc(doc(db, 'characters', character.uid), { currentMagic: magic });
    set({ character: { ...character, currentMagic: magic } });
  },

  allocateStatPoint: async (stat) => {
    const { character } = get();
    if (!character) return;
    const pending = character.pendingStatPoints ?? 0;
    if (pending <= 0) return;

    const newStats: Stats = {
      ...character.stats,
      [stat]: Math.min((character.stats[stat] ?? 0) + 1, statCap(stat, character.level)),
    };
    const newPending = pending - 1;
    await updateDoc(doc(db, 'characters', character.uid), {
      stats: newStats,
      pendingStatPoints: newPending,
    });
    set({ character: { ...character, stats: newStats, pendingStatPoints: newPending } });
  },

  resetCharacter: async () => {
    const { character } = get();
    if (!character) return;

    const classDef = CLASS_DEFINITIONS[character.class];
    const level = 1;
    const resetStats = { ...classDef.startingStats };
    // Use the canonical HP formula so this stays in sync with playerMaxHp()
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

    await updateDoc(doc(db, 'characters', character.uid), reset);
    set({ character: { ...character, ...reset } });
  },

  persistStreakAndRecord: async (activityType, value, unit) => {
    const { character } = get();
    if (!character) return false;

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

    await updateDoc(doc(db, 'characters', character.uid), updates);
    set({ character: { ...character, ...updates } });

    return isNewRecord;
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
    // Guard: only allow if level >= 10 and subclass not already chosen
    if (character.level < 10 || character.subclass) return;
    await updateDoc(doc(db, 'characters', character.uid), { subclass });
    set({ character: { ...character, subclass } });
  },

  updateMonsterPity: async (monsterId, gotLegendary) => {
    const { character } = get();
    if (!character) return;
    const current = character.legendaryDryStreak?.[monsterId] ?? 0;
    const next = gotLegendary ? 0 : current + 1;
    const newDryStreak = { ...character.legendaryDryStreak, [monsterId]: next };
    // NOTE (R5): legendaryDryStreak accumulates one key per monster ever fought.
    // At current catalog size (~10 monsters) this is fine. Revisit when the monster
    // catalog exceeds ~50 entries (e.g. when Dungeons ships) — prune keys that no
    // longer appear in MONSTER_CATALOG to keep the character document lean.
    await updateDoc(doc(db, 'characters', character.uid), {
      legendaryDryStreak: newDryStreak,
    });
    set({ character: { ...character, legendaryDryStreak: newDryStreak } });
  },

  updateName: async (uid, name) => {
    await updateDoc(doc(db, 'characters', uid), { name });
    if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: name });
    set((state) => ({
      character: state.character ? { ...state.character, name } : null,
    }));
  },

  clear: () => set({ character: null, error: null, lastFetchedAt: null }),
}));

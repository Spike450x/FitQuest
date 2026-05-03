import { create } from "zustand";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CLASS_DEFINITIONS, xpToNextLevel, LEVEL_UP, statCap, MASTERY_CONFIG, isMasteryMilestone, type MasteryActivityType } from "@/lib/gameLogic/constants";
import { playerMaxHp, playerMaxStamina, playerMaxMagic } from "@/lib/gameLogic/combat";
import { applyXp } from "@/lib/gameLogic/xp";
import { applyStatGains } from "@/lib/gameLogic/stats";
import { computeNewStreak, todayUTC } from "@/lib/gameLogic/streaks";
import type { Character, CharacterClass, CharacterSubclass, Stats, ActivityType } from "@/types";

interface CharacterStore {
  character: Character | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchCharacter: (uid: string) => Promise<void>;
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
  /**
   * Restore stamina by the given amount (capped at max).
   * Persists immediately — called after activities like sleep, water, nutrition.
   */
  restoreStamina: (amount: number) => Promise<void>;
  /** Instantly updates magic in local state only — no Firestore write. */
  setMagicLocal: (magic: number) => void;
  /** Persists current magic to Firestore. Call at end of combat. */
  updateCurrentMagic: (magic: number) => Promise<void>;
  /**
   * Spend one pending stat point on the given stat.
   * Does nothing if pendingStatPoints === 0.
   */
  allocateStatPoint: (stat: "strength" | "wisdom" | "agility" | "stamina") => Promise<void>;
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
    unit: string
  ) => Promise<boolean>;
  /**
   * Restore HP by the given amount (capped at max).
   * Persists immediately — called after nutrition logging.
   */
  restoreHp: (amount: number) => Promise<void>;
  /**
   * Restore magic by the given amount (capped at max).
   * Persists immediately — called after water logging.
   */
  restoreMagic: (amount: number) => Promise<void>;
  /**
   * Increment the mastery log count for a mastery activity (run/workout/steps).
   * If the new count hits a milestone, awards +1 to the linked stat automatically.
   * Returns true if a milestone was hit.
   */
  awardMastery: (activityType: MasteryActivityType) => Promise<boolean>;
  /** Permanently records the chosen subclass. Can only be called once (level 10). */
  chooseSubclass: (subclass: CharacterSubclass) => Promise<void>;
  clear: () => void;
}

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  character: null,
  loading: false,
  error: null,

  fetchCharacter: async (uid) => {
    set({ loading: true, error: null });
    try {
      const snap = await getDoc(doc(db, "characters", uid));
      if (snap.exists()) {
        const data = snap.data() as Character;
        // Backfill: agility was added after launch; old character docs don't have it.
        if (!data.stats?.agility) {
          const startingAgility = CLASS_DEFINITIONS[data.class].startingStats.agility;
          data.stats = { ...data.stats, agility: startingAgility };
          await updateDoc(doc(db, "characters", uid), { "stats.agility": startingAgility });
        }
        set({ character: data, loading: false });
      } else {
        set({ character: null, loading: false });
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
      await setDoc(doc(db, "characters", uid), character);
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
        health:  Math.min(newStats.health  + LEVEL_UP.HEALTH_PER_LEVEL  * levelsGained, newCap),
        defense: Math.min(newStats.defense + LEVEL_UP.DEFENSE_PER_LEVEL * levelsGained, newCap),
      };
      updated.stats = newStats;

      // Award player-choice stat points
      updated.pendingStatPoints =
        (character.pendingStatPoints ?? 0) + LEVEL_UP.STAT_POINTS_PER_LEVEL * levelsGained;

      // Level-up fully restores all combat resources to the new (possibly higher) max.
      updated.currentHp = playerMaxHp({ stats: newStats, equippedGear: character.equippedGear });
      updated.currentStamina = playerMaxStamina({ stats: newStats, equippedGear: character.equippedGear });
      updated.currentMagic = playerMaxMagic({ stats: newStats, class: character.class });
    }

    await updateDoc(doc(db, "characters", character.uid), updated);
    set({ character: { ...character, ...updated } });

    return levelsGained;
  },

  awardGold: async (amount) => {
    const { character } = get();
    if (!character) return;

    const newGold = character.gold + amount;
    await updateDoc(doc(db, "characters", character.uid), { gold: newGold });
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

    await updateDoc(doc(db, "characters", character.uid), { currentHp: hp });
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
    await updateDoc(doc(db, "characters", character.uid), { currentStamina: stamina });
    set({ character: { ...character, currentStamina: stamina } });
  },

  restoreStamina: async (amount) => {
    const { character } = get();
    if (!character || amount <= 0) return;
    const max = playerMaxStamina(character);
    const current = character.currentStamina ?? max;
    const newStamina = Math.min(current + amount, max);
    if (newStamina === current) return; // already full
    await updateDoc(doc(db, "characters", character.uid), { currentStamina: newStamina });
    set({ character: { ...character, currentStamina: newStamina } });
  },

  setMagicLocal: (magic) => {
    const { character } = get();
    if (!character) return;
    set({ character: { ...character, currentMagic: magic } });
  },

  updateCurrentMagic: async (magic) => {
    const { character } = get();
    if (!character) return;
    await updateDoc(doc(db, "characters", character.uid), { currentMagic: magic });
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
    await updateDoc(doc(db, "characters", character.uid), {
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
    const resetHp = playerMaxHp({ stats: resetStats, equippedGear: { weapon: null, armor: null, accessory: null } });

    const reset: Partial<Character> = {
      level,
      xp: 0,
      xpToNextLevel: xpToNextLevel(level),
      stats: resetStats,
      currentHp: resetHp,
    };

    await updateDoc(doc(db, "characters", character.uid), reset);
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

    await updateDoc(doc(db, "characters", character.uid), updates);
    set({ character: { ...character, ...updates } });

    return isNewRecord;
  },

  restoreHp: async (amount) => {
    const { character } = get();
    if (!character || amount <= 0) return;
    const max = playerMaxHp(character);
    const current = character.currentHp ?? max;
    const newHp = Math.min(current + amount, max);
    if (newHp === current) return; // already full
    await updateDoc(doc(db, "characters", character.uid), { currentHp: newHp });
    set({ character: { ...character, currentHp: newHp } });
  },

  restoreMagic: async (amount) => {
    const { character } = get();
    if (!character || amount <= 0) return;
    const max = playerMaxMagic(character);
    const current = character.currentMagic ?? max;
    const newMagic = Math.min(current + amount, max);
    if (newMagic === current) return; // already full
    await updateDoc(doc(db, "characters", character.uid), { currentMagic: newMagic });
    set({ character: { ...character, currentMagic: newMagic } });
  },

  awardMastery: async (activityType) => {
    const { character } = get();
    if (!character) return false;

    const oldCount = character.masteryCounts?.[activityType] ?? 0;
    const newCount = oldCount + 1;
    const milestoneHit = isMasteryMilestone(newCount);

    const updates: Partial<Character> = {
      masteryCounts: { ...character.masteryCounts, [activityType]: newCount },
    };

    if (milestoneHit) {
      const { linkedStat } = MASTERY_CONFIG[activityType];
      updates.stats = {
        ...character.stats,
        [linkedStat]: Math.min((character.stats[linkedStat] ?? 0) + 1, statCap(linkedStat, character.level)),
      };
    }

    await updateDoc(doc(db, "characters", character.uid), updates);
    set({ character: { ...character, ...updates } });

    return milestoneHit;
  },

  chooseSubclass: async (subclass) => {
    const { character } = get();
    if (!character) return;
    // Guard: only allow if level >= 10 and subclass not already chosen
    if (character.level < 10 || character.subclass) return;
    await updateDoc(doc(db, "characters", character.uid), { subclass });
    set({ character: { ...character, subclass } });
  },

  clear: () => set({ character: null, error: null }),
}));

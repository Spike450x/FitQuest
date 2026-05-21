import { create } from 'zustand';
import { captureError } from '@/lib/errors';
import {
  createDungeonRunDoc,
  getDungeonRunDoc,
  getActiveDungeonRun,
  updateDungeonRunProgress,
  finalizeDungeonRun,
} from '@/lib/dungeonData';
import { updateCharacterDoc } from '@/lib/characterData';
import {
  generateDungeonLayout,
  getWeekSeed,
  canStartDungeonRun,
  isLegendaryEligible,
  nextDungeonRunsToday,
  DUNGEON_TIERS,
} from '@/lib/gameLogic/dungeons';
import { playerMaxHp, playerMaxStamina, playerMaxMagic } from '@/lib/gameLogic/combat';
import type { DungeonRun, DungeonRoomDef, DungeonTierId, Character } from '@/types';

interface DungeonStore {
  activeRun: DungeonRun | null;
  loading: boolean;
  error: string | null;

  /** Fetch the active run from Firestore. Call on dungeon lobby mount. */
  fetchActiveRun: (uid: string) => Promise<void>;

  /**
   * Start a new dungeon run. Deducts the entry fee and creates the run document.
   * Returns the new run's ID, or null if the player cannot start (HP gate, daily limit, gold).
   */
  startRun: (tierId: DungeonTierId, character: Character) => Promise<string | null>;

  /** Advance to the next room after clearing the current one. Persists state. */
  advanceRoom: (updates: {
    clearedRooms: DungeonRoomDef[];
    newHp: number;
    newStamina: number;
    newMagic: number;
    xpEarned: number;
    goldEarned: number;
    itemsDropped: string[];
  }) => Promise<void>;

  /** Mark the run completed and clear active run from store. */
  completeRun: (uid: string, legendaryUsed: boolean) => Promise<void>;

  /** Mark the run abandoned and clear active run from store. */
  abandonRun: (uid: string) => Promise<void>;

  clearError: () => void;
}

export const useDungeonStore = create<DungeonStore>((set, get) => ({
  activeRun: null,
  loading: false,
  error: null,

  fetchActiveRun: async (uid) => {
    set({ loading: true, error: null });
    try {
      const run = await getActiveDungeonRun(uid);
      if (run?.claimed) {
        // Run was claimed but not finalized — process died between claim stamp and
        // completeRun. The claimDungeonRun Cloud Function eliminates this race in
        // the normal flow; this handles legacy client-only claims. Finalize quietly.
        await finalizeDungeonRun(run.id, 'completed');
        set({ activeRun: null, loading: false });
        return;
      }
      set({ activeRun: run, loading: false });
    } catch (err) {
      captureError('dungeonStore.fetchActiveRun', err);
      set({ error: 'Failed to load dungeon run.', loading: false });
    }
  },

  startRun: async (tierId, character) => {
    const tier = DUNGEON_TIERS[tierId];
    const runsToday = character.dungeonRunsToday;
    const maxHp = playerMaxHp(character);

    if (!canStartDungeonRun(runsToday)) return null;
    if ((character.currentHp ?? maxHp) < maxHp * 0.5) return null;
    if (character.gold < tier.entryFee) return null;

    set({ loading: true, error: null });
    try {
      const weekSeed = getWeekSeed();
      const rooms = generateDungeonLayout(tierId, weekSeed);
      const eligible = isLegendaryEligible(runsToday);
      const newRunsToday = nextDungeonRunsToday(runsToday);

      const runId = await createDungeonRunDoc(
        character.uid,
        tierId,
        rooms,
        weekSeed,
        eligible,
        character.currentHp ?? maxHp,
        character.currentStamina ?? playerMaxStamina(character),
        character.currentMagic ?? playerMaxMagic(character),
      );

      // Deduct entry fee and record run start on character
      await updateCharacterDoc(character.uid, {
        gold: character.gold - tier.entryFee,
        dungeonRunsToday: newRunsToday,
        activeDungeonRunId: runId,
      });

      const run = await getDungeonRunDoc(runId);
      set({ activeRun: run, loading: false });
      return runId;
    } catch (err) {
      captureError('dungeonStore.startRun', err);
      set({ error: 'Failed to start dungeon run.', loading: false });
      return null;
    }
  },

  advanceRoom: async ({
    clearedRooms,
    newHp,
    newStamina,
    newMagic,
    xpEarned,
    goldEarned,
    itemsDropped,
  }) => {
    const { activeRun } = get();
    if (!activeRun) return;

    const nextRoom = activeRun.currentRoom + 1;
    const cumXp = activeRun.cumulativeXp + xpEarned;
    const cumGold = activeRun.cumulativeGold + goldEarned;
    const allItems = [...activeRun.allDroppedItems, ...itemsDropped];

    const updates = {
      currentRoom: nextRoom,
      rooms: clearedRooms,
      currentHp: newHp,
      currentStamina: newStamina,
      currentMagic: newMagic,
      cumulativeXp: cumXp,
      cumulativeGold: cumGold,
      allDroppedItems: allItems,
    };

    try {
      await updateDungeonRunProgress(activeRun.id, updates);
      set({ activeRun: { ...activeRun, ...updates } });
    } catch (err) {
      captureError('dungeonStore.advanceRoom', err);
    }
  },

  completeRun: async (uid, legendaryUsed) => {
    const { activeRun } = get();
    if (!activeRun) return;
    try {
      await finalizeDungeonRun(activeRun.id, 'completed');
      // Update character: clear active run id, mark legendary used if applicable.
      // Dot-notation key 'dungeonRunsToday.legendaryUsed' is a valid Firestore
      // field path accepted by updateDoc — it patches only that sub-field without
      // overwriting the rest of the dungeonRunsToday map.
      await updateCharacterDoc(uid, {
        activeDungeonRunId: null,
        ...(legendaryUsed ? { 'dungeonRunsToday.legendaryUsed': true } : {}),
      });
      set({ activeRun: null });
    } catch (err) {
      captureError('dungeonStore.completeRun', err);
    }
  },

  abandonRun: async (uid) => {
    const { activeRun } = get();
    if (!activeRun) return;
    try {
      await finalizeDungeonRun(activeRun.id, 'abandoned');
      await updateCharacterDoc(uid, { activeDungeonRunId: null });
      set({ activeRun: null });
    } catch (err) {
      captureError('dungeonStore.abandonRun', err);
    }
  },

  clearError: () => set({ error: null }),
}));

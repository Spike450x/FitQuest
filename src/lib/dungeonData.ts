import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DungeonRun, DungeonRoomDef, DungeonTierId } from '@/types';

export const DUNGEON_RUNS_COLLECTION = 'dungeonRuns';

/** Create a new run document. Returns the Firestore doc ID. */
export async function createDungeonRunDoc(
  uid: string,
  tierId: DungeonTierId,
  rooms: DungeonRoomDef[],
  weekSeed: number,
  legendaryEligible: boolean,
  startHp: number,
  startStamina: number,
  startMagic: number,
): Promise<string> {
  const ref = await addDoc(collection(db, DUNGEON_RUNS_COLLECTION), {
    uid,
    tierId,
    weekSeed,
    status: 'active',
    currentRoom: 0,
    rooms,
    currentHp: startHp,
    currentStamina: startStamina,
    currentMagic: startMagic,
    legendaryEligible,
    cumulativeXp: 0,
    cumulativeGold: 0,
    allDroppedItems: [],
    startedAt: Date.now(),
    completedAt: null,
  } satisfies Omit<DungeonRun, 'id'>);
  return ref.id;
}

/** Fetch a single run by ID. Returns null if not found. */
export async function getDungeonRunDoc(runId: string): Promise<DungeonRun | null> {
  const snap = await getDoc(doc(db, DUNGEON_RUNS_COLLECTION, runId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<DungeonRun, 'id'>) };
}

/** Fetch the active run for a user, or null if none. */
export async function getActiveDungeonRun(uid: string): Promise<DungeonRun | null> {
  const snap = await getDocs(
    query(
      collection(db, DUNGEON_RUNS_COLLECTION),
      where('uid', '==', uid),
      where('status', '==', 'active'),
      orderBy('startedAt', 'desc'),
      limit(1),
    ),
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<DungeonRun, 'id'>) };
}

/** Persist room progress after clearing a room. */
export async function updateDungeonRunProgress(
  runId: string,
  updates: {
    currentRoom: number;
    rooms: DungeonRoomDef[];
    currentHp: number;
    currentStamina: number;
    currentMagic: number;
    cumulativeXp: number;
    cumulativeGold: number;
    allDroppedItems: string[];
  },
): Promise<void> {
  await updateDoc(doc(db, DUNGEON_RUNS_COLLECTION, runId), updates);
}

/** Mark a run as completed or abandoned. */
export async function finalizeDungeonRun(
  runId: string,
  status: 'completed' | 'abandoned',
): Promise<void> {
  await updateDoc(doc(db, DUNGEON_RUNS_COLLECTION, runId), {
    status,
    completedAt: Date.now(),
  });
}

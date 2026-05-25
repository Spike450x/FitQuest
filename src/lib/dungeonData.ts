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
import type { DungeonRun, DungeonRoomDef, DungeonRoomType, DungeonTierId } from '@/types';

export const DUNGEON_RUNS_COLLECTION = 'dungeonRuns';

/**
 * Strips any keys whose value is undefined before writing to Firestore.
 * Firestore throws on undefined in nested array objects. Using the generic
 * Object.entries filter means any future optional field on DungeonRoomDef is
 * handled automatically without touching this function.
 */
function normalizeRoomDef(room: DungeonRoomDef): DungeonRoomDef {
  return Object.fromEntries(
    Object.entries(room).filter(([, v]) => v !== undefined),
  ) as DungeonRoomDef;
}

/**
 * Converts a raw Firestore record into a fully-typed DungeonRun with safe
 * defaults for every field. Mirrors the normalizeCharacter pattern so schema
 * evolution in existing documents doesn't produce undefined at runtime.
 */
export function normalizeDungeonRun(id: string, raw: Record<string, unknown>): DungeonRun {
  const rooms = Array.isArray(raw.rooms)
    ? (raw.rooms as Record<string, unknown>[]).map((r): DungeonRoomDef => {
        const room: DungeonRoomDef = {
          type: (r.type as DungeonRoomType) ?? 'combat',
          cleared: r.cleared === true,
          lootAwarded: Array.isArray(r.lootAwarded) ? (r.lootAwarded as string[]) : [],
          xpAwarded: typeof r.xpAwarded === 'number' ? r.xpAwarded : 0,
          goldAwarded: typeof r.goldAwarded === 'number' ? r.goldAwarded : 0,
        };
        if (typeof r.monsterId === 'string') room.monsterId = r.monsterId;
        return room;
      })
    : [];
  return {
    id,
    uid: typeof raw.uid === 'string' ? raw.uid : '',
    tierId: (raw.tierId as DungeonTierId) ?? 'goblin-caves',
    weekSeed: typeof raw.weekSeed === 'number' ? raw.weekSeed : 0,
    status: (raw.status as DungeonRun['status']) ?? 'active',
    currentRoom: typeof raw.currentRoom === 'number' ? raw.currentRoom : 0,
    rooms,
    currentHp: typeof raw.currentHp === 'number' ? raw.currentHp : 0,
    currentStamina: typeof raw.currentStamina === 'number' ? raw.currentStamina : 0,
    currentMagic: typeof raw.currentMagic === 'number' ? raw.currentMagic : 0,
    legendaryEligible: raw.legendaryEligible === true,
    cumulativeXp: typeof raw.cumulativeXp === 'number' ? raw.cumulativeXp : 0,
    cumulativeGold: typeof raw.cumulativeGold === 'number' ? raw.cumulativeGold : 0,
    allDroppedItems: Array.isArray(raw.allDroppedItems) ? (raw.allDroppedItems as string[]) : [],
    startedAt: typeof raw.startedAt === 'number' ? raw.startedAt : 0,
    completedAt: typeof raw.completedAt === 'number' ? raw.completedAt : null,
    claimed: raw.claimed === true,
  };
}

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
    rooms: rooms.map(normalizeRoomDef),
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
  return normalizeDungeonRun(snap.id, snap.data() as Record<string, unknown>);
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
  return normalizeDungeonRun(d.id, d.data() as Record<string, unknown>);
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
  await updateDoc(doc(db, DUNGEON_RUNS_COLLECTION, runId), {
    ...updates,
    rooms: updates.rooms.map(normalizeRoomDef),
  });
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

/** Atomically mark a run as rewards-claimed. Call before awarding XP/gold/items. */
export async function claimDungeonRunRewards(runId: string): Promise<void> {
  await updateDoc(doc(db, DUNGEON_RUNS_COLLECTION, runId), { claimed: true });
}

/** Fetch the most recent completed/abandoned runs for a user. Uses uid+startedAt DESC index. */
export async function getRecentDungeonRuns(uid: string, count = 10): Promise<DungeonRun[]> {
  const snap = await getDocs(
    query(
      collection(db, DUNGEON_RUNS_COLLECTION),
      where('uid', '==', uid),
      orderBy('startedAt', 'desc'),
      limit(count),
    ),
  );
  return snap.docs.map((d) => normalizeDungeonRun(d.id, d.data() as Record<string, unknown>));
}

import { collection, addDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ActiveQuest } from '@/types';

const ACTIVE_QUESTS = 'activeQuests';

// CONTRACT: whenever a new optional field is added to ActiveQuest, add a safe
// default here. See "Adding a post-MVP schema field" in docs/FIRESTORE.md.
export function normalizeActiveQuest(id: string, data: Record<string, unknown>): ActiveQuest {
  return {
    ...data,
    id,
    // progress and null-able timestamps were added in later schema versions.
    progress: (data.progress as number | undefined) ?? 0,
    completedAt: (data.completedAt as number | null | undefined) ?? null,
    claimedAt: (data.claimedAt as number | null | undefined) ?? null,
  } as ActiveQuest;
}

export async function fetchActiveQuests(uid: string): Promise<ActiveQuest[]> {
  const snap = await getDocs(query(collection(db, ACTIVE_QUESTS), where('uid', '==', uid)));
  return snap.docs.map((d) => normalizeActiveQuest(d.id, d.data()));
}

export async function addActiveQuestDoc(data: Omit<ActiveQuest, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, ACTIVE_QUESTS), data);
  return ref.id;
}

export async function updateActiveQuestDoc(
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  await updateDoc(doc(db, ACTIVE_QUESTS, id), data);
}

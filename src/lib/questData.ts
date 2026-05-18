import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ActiveQuest } from '@/types';

const ACTIVE_QUESTS = 'activeQuests';

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

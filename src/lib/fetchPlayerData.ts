import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ActivityLog, ActiveQuest, InventoryItem } from '@/types';

export async function fetchActivityLogs(uid: string): Promise<ActivityLog[]> {
  const snap = await getDocs(query(collection(db, 'activityLogs'), where('uid', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityLog);
}

export async function fetchActiveQuests(uid: string): Promise<ActiveQuest[]> {
  const snap = await getDocs(query(collection(db, 'activeQuests'), where('uid', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActiveQuest);
}

export async function fetchInventoryItems(uid: string): Promise<InventoryItem[]> {
  const snap = await getDocs(query(collection(db, 'inventory'), where('uid', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InventoryItem);
}

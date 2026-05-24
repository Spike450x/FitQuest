import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const COMBAT_LOGS_COLLECTION = 'combatLogs';

export interface CombatLog {
  id: string;
  uid: string;
  monsterId: string;
  monsterName: string;
  xp: number;
  gold: number;
  loggedAt: number;
}

export async function fetchRecentCombatLogs(uid: string, count: number): Promise<CombatLog[]> {
  const snap = await getDocs(
    query(
      collection(db, COMBAT_LOGS_COLLECTION),
      where('uid', '==', uid),
      orderBy('loggedAt', 'desc'),
      limit(count),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CombatLog, 'id'>) }));
}

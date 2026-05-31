import { collection, addDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ActiveBounty } from '@/types';

const ACTIVE_BOUNTIES = 'activeBounties';

// CONTRACT: whenever a new optional field is added to ActiveBounty, add a safe
// default here. See "Adding a post-MVP schema field" in docs/FIRESTORE.md.
export function normalizeActiveBounty(id: string, data: Record<string, unknown>): ActiveBounty {
  return {
    ...data,
    id,
    progress: (data.progress as number | undefined) ?? 0,
    completedAt: (data.completedAt as number | null | undefined) ?? null,
    claimedAt: (data.claimedAt as number | null | undefined) ?? null,
    // combatMonsterId passes through (undefined on standing bounties);
    // combatWonAt defaults to null for hunt bounties not yet won.
    combatWonAt: (data.combatWonAt as number | null | undefined) ?? null,
  } as ActiveBounty;
}

export async function fetchActiveBounties(uid: string): Promise<ActiveBounty[]> {
  const snap = await getDocs(query(collection(db, ACTIVE_BOUNTIES), where('uid', '==', uid)));
  return snap.docs.map((d) => normalizeActiveBounty(d.id, d.data()));
}

export async function addActiveBountyDoc(data: Omit<ActiveBounty, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, ACTIVE_BOUNTIES), data);
  return ref.id;
}

export async function updateActiveBountyDoc(
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  await updateDoc(doc(db, ACTIVE_BOUNTIES, id), data);
}

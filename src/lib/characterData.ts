import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Character } from '@/types';

const CHARACTERS = 'characters';

const REQUIRED_CHAR_FIELDS = [
  'name',
  'class',
  'level',
  'xp',
  'xpToNextLevel',
  'gold',
  'stats',
  'equippedGear',
  'createdAt',
] as const;

/**
 * Applies safe defaults for optional post-MVP fields that may be absent on
 * documents created before those fields were introduced. Throws a descriptive
 * error if a required field is missing, surfacing data corruption early rather
 * than letting the app crash later with a confusing undefined-access error.
 */
export function normalizeCharacter(uid: string, raw: Record<string, unknown>): Character {
  for (const field of REQUIRED_CHAR_FIELDS) {
    if (raw[field] === undefined) {
      throw new Error(`Character document (uid=${uid}) is missing required field: "${field}"`);
    }
  }
  return {
    ...(raw as unknown as Character),
    uid,
    pendingStatPoints: (raw.pendingStatPoints as number | undefined) ?? 0,
    masteryCounts: (raw.masteryCounts as Character['masteryCounts']) ?? {},
    legendaryDryStreak: (raw.legendaryDryStreak as Record<string, number>) ?? {},
  };
}

export async function getCharacterDoc(uid: string): Promise<Character | null> {
  const snap = await getDoc(doc(db, CHARACTERS, uid));
  if (!snap.exists()) return null;
  return normalizeCharacter(uid, snap.data());
}

export async function createCharacterDoc(uid: string, character: Character): Promise<void> {
  await setDoc(doc(db, CHARACTERS, uid), character);
}

export async function updateCharacterDoc(
  uid: string,
  data: Partial<Character> | Record<string, unknown>,
): Promise<void> {
  await updateDoc(doc(db, CHARACTERS, uid), data as Record<string, unknown>);
}

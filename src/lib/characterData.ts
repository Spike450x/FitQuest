import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CLASS_DEFINITIONS } from '@/lib/gameLogic/constants';
import type { Character, CharacterClass, Stats } from '@/types';

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
  const classDef = CLASS_DEFINITIONS[raw.class as CharacterClass];
  const rawStats = raw.stats as Partial<Stats>;
  return {
    ...(raw as unknown as Character),
    uid,
    stats: {
      ...(rawStats as Stats),
      // `in` check (not `??`) so a stored zero is preserved. Today no class
      // ships with `spirit: 0` or `agility: 0`, but if one is introduced later
      // the `??` form would silently re-backfill on every fetch.
      agility:
        'agility' in rawStats ? (rawStats.agility as number) : classDef.startingStats.agility,
      spirit: 'spirit' in rawStats ? (rawStats.spirit as number) : classDef.startingStats.spirit,
    },
    pendingStatPoints: (raw.pendingStatPoints as number | undefined) ?? 0,
    masteryCounts: (raw.masteryCounts as Character['masteryCounts']) ?? {},
    legendaryDryStreak: (raw.legendaryDryStreak as Record<string, number>) ?? {},
    monstersKilled: (raw.monstersKilled as Character['monstersKilled']) ?? {},
    totalCombatWins: (raw.totalCombatWins as number | undefined) ?? 0,
    activityLogCounts: (raw.activityLogCounts as Character['activityLogCounts']) ?? {},
    totalQuestsClaimed: (raw.totalQuestsClaimed as number | undefined) ?? 0,
    weeklyQuestsClaimed: (raw.weeklyQuestsClaimed as Character['weeklyQuestsClaimed']) ?? undefined,
  };
}

export async function getCharacterDoc(uid: string): Promise<Character | null> {
  const snap = await getDoc(doc(db, CHARACTERS, uid));
  if (!snap.exists()) return null;
  const raw = snap.data();

  // Persist post-MVP stat additions back to Firestore on first read, so
  // server-side readers (Cloud Functions, future scripts) see the same shape
  // the React app sees. Idempotent — subsequent reads skip the write.
  const rawStats = raw.stats as Partial<Stats> | undefined;
  const classDef = CLASS_DEFINITIONS[raw.class as CharacterClass];
  const backfill: Record<string, number> = {};
  // `in` check (not `??`) so a stored zero is never re-overwritten by the
  // class default on every read. Mirrors the normalizeCharacter logic above.
  if (!rawStats || !('agility' in rawStats)) {
    backfill['stats.agility'] = classDef.startingStats.agility;
  }
  if (!rawStats || !('spirit' in rawStats)) {
    backfill['stats.spirit'] = classDef.startingStats.spirit;
  }
  if (Object.keys(backfill).length > 0) {
    await updateDoc(doc(db, CHARACTERS, uid), backfill);
  }

  return normalizeCharacter(uid, raw);
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

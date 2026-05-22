import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { applyXp, LEVEL_UP, statCapForLevel } from './gameLogic/xp';
import {
  playerMaxHp,
  playerMaxStamina,
  playerMaxMagic,
  combatXpDailyMultiplier,
} from './gameLogic/combat';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClaimCombatVictoryInput {
  /** XP the client wants to award (already streak-boosted + level-scaled). */
  xpReward: number;
  /** Gold to award. Not capped — only XP is diminished. */
  goldReward: number;
  /** Monster id, persisted on the combat log for analytics + stats page. */
  monsterId: string;
  /** Monster display name, persisted on the combat log. */
  monsterName: string;
  /** Idempotency token from the client. Reused on retry; the same key never double-awards. */
  idempotencyKey: string;
}

interface ClaimCombatVictoryResult {
  /** XP actually awarded after the diminishing-returns multiplier. */
  finalXp: number;
  /** The multiplier applied (1.0 if no cap, down to 0.1 at the 31+ floor). */
  multiplier: number;
  /** Number of wins this player had completed today BEFORE this one. */
  winsTodayBefore: number;
  /** Number of wins this player has completed today INCLUDING this one. */
  winsTodayAfter: number;
  /** Whether the XP award caused a level-up. */
  leveledUp: boolean;
}

// ─── claimCombatVictory callable ──────────────────────────────────────────────
//
// Server-authoritative combat-victory award. The client snapshots the kill-
// time XP (after streak boost + monster-level scaling) and POSTs it here;
// the CF queries today's combat logs, applies the daily diminishing-returns
// multiplier, and atomically writes the character + log docs.
//
// Why server-side: a client-only cap is trivially bypassable (open devtools,
// rewrite the counter). The combatLogs collection is the source of truth for
// today's win count — clients can't lie about a count derived from documents
// they don't control.
//
// Idempotency: keyed on `${uid}_${idempotencyKey}` so a retry on flaky
// network never double-awards. The combat log doc has a deterministic id;
// re-runs short-circuit with the previously-awarded amounts.

export const claimCombatVictory = onCall<
  ClaimCombatVictoryInput,
  Promise<ClaimCombatVictoryResult>
>({ minInstances: 1 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }

  const uid = request.auth.uid;
  const { xpReward, goldReward, monsterId, monsterName, idempotencyKey } = request.data;

  // ── Validation ───────────────────────────────────────────────────────────
  if (!Number.isFinite(xpReward) || xpReward < 0 || xpReward > 5000) {
    throw new HttpsError('invalid-argument', 'xpReward out of range.');
  }
  if (!Number.isFinite(goldReward) || goldReward < 0 || goldReward > 5000) {
    throw new HttpsError('invalid-argument', 'goldReward out of range.');
  }
  if (!monsterId || typeof monsterId !== 'string' || monsterId.length > 64) {
    throw new HttpsError('invalid-argument', 'monsterId invalid.');
  }
  if (!monsterName || typeof monsterName !== 'string' || monsterName.length > 64) {
    throw new HttpsError('invalid-argument', 'monsterName invalid.');
  }
  if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.length > 128) {
    throw new HttpsError('invalid-argument', 'idempotencyKey invalid.');
  }

  const db = admin.firestore();
  const now = Date.now();
  const startOfDayMs = Date.UTC(
    new Date(now).getUTCFullYear(),
    new Date(now).getUTCMonth(),
    new Date(now).getUTCDate(),
  );

  // ── Idempotency short-circuit ────────────────────────────────────────────
  // The combat log doc is keyed by (uid + idempotencyKey) so a retry from
  // the client returns the previously-awarded result without double-writing.
  const combatLogRef = db.collection('combatLogs').doc(`${uid}_${idempotencyKey}`);
  const existingLog = await combatLogRef.get();
  if (existingLog.exists) {
    const data = existingLog.data() as {
      xp: number;
      multiplier?: number;
      winsTodayAfter?: number;
    };
    return {
      finalXp: data.xp,
      multiplier: data.multiplier ?? 1.0,
      winsTodayBefore: (data.winsTodayAfter ?? 1) - 1,
      winsTodayAfter: data.winsTodayAfter ?? 1,
      leveledUp: false, // not tracked in the log — a duplicate request can't trigger a fresh level-up
    };
  }

  // ── Aggregate query: how many wins has this player completed today? ─────
  // Index: combatLogs (uid ASC, loggedAt DESC) — already deployed.
  const todayLogsSnap = await db
    .collection('combatLogs')
    .where('uid', '==', uid)
    .where('loggedAt', '>=', startOfDayMs)
    .get();
  const winsTodayBefore = todayLogsSnap.size;
  const multiplier = combatXpDailyMultiplier(winsTodayBefore);
  const finalXp = Math.round(xpReward * multiplier);

  // ── Transaction: update character (XP + gold + level-up bookkeeping) ────
  const charRef = db.collection('characters').doc(uid);
  let leveledUp = false;

  await db.runTransaction(async (txn) => {
    const charSnap = await txn.get(charRef);
    if (!charSnap.exists) {
      throw new HttpsError('not-found', 'Character not found.');
    }
    const charData = charSnap.data() as {
      level: number;
      xp: number;
      gold: number;
      stats: {
        strength: number;
        wisdom: number;
        agility: number;
        stamina: number;
        health: number;
        defense: number;
      };
      equippedGear?: { weapon: string | null; armor: string | null; accessory: string | null };
      class: string;
      currentHp?: number;
      currentStamina?: number;
      currentMagic?: number;
      pendingStatPoints?: number;
    };

    const { level, xp, xpToNextLevel, levelsGained } = applyXp(
      { level: charData.level, xp: charData.xp },
      finalXp,
    );
    leveledUp = levelsGained > 0;

    const updates: Record<string, unknown> = {
      level,
      xp,
      xpToNextLevel,
      gold: (charData.gold ?? 0) + goldReward,
    };

    if (levelsGained > 0) {
      // Mirror awardXpAndStats: auto-stat bumps + resource restore.
      const newStats = { ...charData.stats };
      // Health auto-grows; defense auto-grows.
      newStats.health = Math.min(
        statCapForLevel('health', level),
        (newStats.health ?? 0) + LEVEL_UP.HEALTH_PER_LEVEL * levelsGained,
      );
      newStats.defense = Math.min(
        statCapForLevel('defense', level),
        (newStats.defense ?? 0) + LEVEL_UP.DEFENSE_PER_LEVEL * levelsGained,
      );
      updates.stats = newStats;
      updates.pendingStatPoints =
        (charData.pendingStatPoints ?? 0) + LEVEL_UP.STAT_POINTS_PER_LEVEL * levelsGained;
      updates.currentHp = playerMaxHp(newStats, charData.equippedGear);
      updates.currentStamina = playerMaxStamina(newStats, charData.equippedGear);
      updates.currentMagic = playerMaxMagic(newStats.wisdom, charData.class);
    }

    txn.update(charRef, updates);
  });

  // ── Post-transaction: write the combat log (separate collection) ─────────
  // Outside the txn so an indexed read doesn't compete with the character write,
  // and so a retry can use the deterministic doc id to short-circuit.
  await combatLogRef.set({
    id: combatLogRef.id,
    uid,
    monsterId,
    monsterName,
    xp: finalXp,
    gold: goldReward,
    loggedAt: now,
    multiplier,
    winsTodayAfter: winsTodayBefore + 1,
  });

  return {
    finalXp,
    multiplier,
    winsTodayBefore,
    winsTodayAfter: winsTodayBefore + 1,
    leveledUp,
  };
});

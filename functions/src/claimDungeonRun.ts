import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { applyXp, LEVEL_UP, statCapForLevel } from './gameLogic/xp';
import { playerMaxHp, playerMaxStamina, playerMaxMagic } from './gameLogic/combat';
import { ACHIEVEMENT_GOLD, checkNewAchievements } from './gameLogic/achievements';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClaimDungeonRunInput {
  runId: string;
  /**
   * Whether to mark `dungeonRunsToday.legendaryUsed = true` on the character.
   * True for victory, false for retreat/defeat — preserves existing per-outcome
   * semantics from the client-side flow this CF replaces.
   */
  legendaryUsed: boolean;
  /**
   * Final status to stamp on the run document.
   * Victory/retreat → 'completed', defeat → 'abandoned'.
   */
  outcomeStatus: 'completed' | 'abandoned';
}

interface ClaimDungeonRunResult {
  xp: number;
  gold: number;
  achievementGold: number;
  items: string[];
  leveledUp: boolean;
  newAchievements: string[];
}

// ─── claimDungeonRun callable ─────────────────────────────────────────────────
//
// Atomically claims rewards for a finished dungeon run in a single transaction:
//   1. Validates run ownership and prevents double-claim
//   2. Stamps claimed, status, completedAt on the run doc
//   3. Applies cumulativeXp + cumulativeGold to the character (with level-up logic)
//   4. Clears activeDungeonRunId and optionally marks legendaryUsed
// After the transaction: awards inventory items (create new docs for items not
// already owned — mirrors the equipment branch of awardLoot in inventoryStore).

export const claimDungeonRun = onCall<ClaimDungeonRunInput, Promise<ClaimDungeonRunResult>>(
  { minInstances: 1 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }

    const { runId, legendaryUsed, outcomeStatus } = request.data;
    const uid = request.auth.uid; // authoritative — never from request.data

    // Input validation
    if (typeof runId !== 'string' || runId.length === 0 || runId.length > 128) {
      throw new HttpsError('invalid-argument', 'runId must be a non-empty string (max 128 chars).');
    }
    if (typeof legendaryUsed !== 'boolean') {
      throw new HttpsError('invalid-argument', 'legendaryUsed must be a boolean.');
    }
    if (outcomeStatus !== 'completed' && outcomeStatus !== 'abandoned') {
      throw new HttpsError('invalid-argument', 'outcomeStatus must be "completed" or "abandoned".');
    }

    const db = admin.firestore();
    const runRef = db.collection('dungeonRuns').doc(runId);
    const charRef = db.collection('characters').doc(uid);

    let awardedXp = 0;
    let awardedGold = 0;
    let droppedItems: string[] = [];
    let didLevelUp = false;
    let earnedAchievements: string[] = [];

    // Captured inside the transaction when the run is already claimed.
    // Used to recover inventory items that may have been lost if the CF crashed
    // after the transaction committed but before the post-transaction write completed.
    let alreadyClaimedDrops: string[] | null = null;

    // ── Transaction: stamp run + update character atomically ──────────────────
    await db.runTransaction(async (txn) => {
      const [runSnap, charSnap] = await Promise.all([txn.get(runRef), txn.get(charRef)]);

      if (!runSnap.exists) {
        throw new HttpsError('not-found', 'Dungeon run not found.');
      }
      if (!charSnap.exists) {
        throw new HttpsError('not-found', 'Character document not found.');
      }

      const runData = runSnap.data()!;

      // Ownership check — uid on the doc must match the caller
      if (runData.uid !== uid) {
        throw new HttpsError('permission-denied', 'You do not own this dungeon run.');
      }

      // Idempotency guard — already claimed. Capture allDroppedItems so the
      // post-transaction block can recover any items that were not written if
      // the previous call crashed between the transaction commit and the
      // inventory write. Return without writes (read-only transaction).
      if (runData.claimed === true) {
        alreadyClaimedDrops = (runData.allDroppedItems as string[]) ?? [];
        return;
      }

      // Only active runs can be claimed — if already finalized, refuse
      if (runData.status !== 'active') {
        throw new HttpsError(
          'failed-precondition',
          `Dungeon run has status "${runData.status as string}" and cannot be claimed.`,
        );
      }

      const charData = charSnap.data()!;
      awardedXp = (runData.cumulativeXp as number) ?? 0;
      awardedGold = (runData.cumulativeGold as number) ?? 0;
      droppedItems = (runData.allDroppedItems as string[]) ?? [];

      // ── Achievement check (inside transaction so gold + badge stamp are atomic) ──
      const existingAchievements = (charData.achievements as string[] | undefined) ?? [];
      earnedAchievements = checkNewAchievements(
        runData.tierId as string,
        existingAchievements,
        droppedItems,
        outcomeStatus,
      );
      const achievementGold = earnedAchievements.reduce(
        (sum, id) => sum + (ACHIEVEMENT_GOLD[id] ?? 0),
        0,
      );
      awardedGold += achievementGold;

      // ── Stamp run as claimed + finalized ────────────────────────────────────
      txn.update(runRef, {
        claimed: true,
        status: outcomeStatus,
        completedAt: Date.now(),
      });

      // ── Compute XP / level-up ───────────────────────────────────────────────
      const { level, xp, xpToNextLevel, levelsGained } = applyXp(
        {
          level: (charData.level as number | undefined) ?? 1,
          xp: (charData.xp as number | undefined) ?? 0,
        },
        awardedXp,
      );

      if (levelsGained > 0) didLevelUp = true;

      const charUpdates: Record<string, unknown> = {
        level,
        xp,
        xpToNextLevel,
        // awardedGold already includes achievement gold added above
        gold: ((charData.gold as number | undefined) ?? 0) + awardedGold,
        activeDungeonRunId: null,
        ...(legendaryUsed ? { 'dungeonRunsToday.legendaryUsed': true } : {}),
        ...(earnedAchievements.length > 0
          ? { achievements: [...existingAchievements, ...earnedAchievements] }
          : {}),
      };

      // ── Level-up bonuses ────────────────────────────────────────────────────
      if (levelsGained > 0) {
        const stats = charData.stats as {
          strength: number;
          wisdom: number;
          agility: number;
          stamina: number;
          health: number;
          defense: number;
        };
        const equippedGear =
          (charData.equippedGear as {
            weapon: string | null;
            armor: string | null;
            accessory: string | null;
          } | null) ?? null;
        const charClass = (charData.class as string | undefined) ?? 'warrior';

        const newHealth = Math.min(
          stats.health + LEVEL_UP.HEALTH_PER_LEVEL * levelsGained,
          statCapForLevel('health', level),
        );
        const newDefense = Math.min(
          stats.defense + LEVEL_UP.DEFENSE_PER_LEVEL * levelsGained,
          statCapForLevel('defense', level),
        );
        const newStats = { ...stats, health: newHealth, defense: newDefense };

        charUpdates['stats'] = newStats;
        charUpdates['pendingStatPoints'] =
          ((charData.pendingStatPoints as number | undefined) ?? 0) +
          LEVEL_UP.STAT_POINTS_PER_LEVEL * levelsGained;

        // Full resource restore on level-up (mirrors awardXpAndStats)
        charUpdates['currentHp'] = playerMaxHp(newStats, equippedGear);
        charUpdates['currentStamina'] = playerMaxStamina(newStats, equippedGear);
        charUpdates['currentMagic'] = playerMaxMagic(stats.wisdom, charClass);
      }

      txn.update(charRef, charUpdates);
    });

    // ── Already-claimed path: recover any unawarded inventory items ───────────
    // If a previous call succeeded in the transaction (claimed=true, XP/gold
    // awarded) but crashed before finishing the inventory write, the items in
    // allDroppedItems were never granted. Re-attempt the write using the same
    // skip-already-owned logic so re-runs are safe. Then throw already-exists
    // so the client treats the call as a no-op (XP/gold are not re-awarded).
    if (alreadyClaimedDrops !== null) {
      // TypeScript loses track of let mutations made inside async callbacks;
      // the cast is safe — alreadyClaimedDrops is always string[] here.
      const drops = alreadyClaimedDrops as string[];
      if (drops.length > 0) {
        const inventoryRef = db.collection('inventory');
        const existingSnap = await inventoryRef.where('uid', '==', uid).get();
        const ownedDefIds = new Set<string>(
          existingSnap.docs.map((d) => d.data().itemDefId as string),
        );
        const newItems = [...new Set(drops)].filter((id) => !ownedDefIds.has(id));
        if (newItems.length > 0) {
          const acquiredAt = Date.now();
          await Promise.all(
            newItems.map((itemDefId) =>
              inventoryRef.add({ uid, itemDefId, quantity: 1, equipped: false, acquiredAt }),
            ),
          );
        }
      }
      throw new HttpsError('already-exists', 'Dungeon run rewards have already been claimed.');
    }

    // ── Post-transaction: award inventory items ────────────────────────────────
    // Dungeon loot is exclusively equipment items (no consumables in boss/room
    // loot tables). We mirror the equipment branch of inventoryStore.awardLoot:
    // skip items the player already owns, create docs for new items in parallel.
    //
    // These writes happen outside the transaction intentionally — the run is already
    // marked claimed, so a partial failure here won't cause double-XP/gold. Callers
    // should call fetchInventory() after the CF returns to refresh local state.
    // On failure we set inventoryPartial so the client can warn the player.
    let inventoryPartial = false;
    if (droppedItems.length > 0) {
      try {
        const inventoryRef = db.collection('inventory');

        // Fetch only this player's inventory to check what they already own
        const existingSnap = await inventoryRef.where('uid', '==', uid).get();
        const ownedDefIds = new Set<string>(
          existingSnap.docs.map((d) => d.data().itemDefId as string),
        );

        // Deduplicate drops (same item can't realistically appear twice in one run,
        // but guard against it anyway)
        const newItems = [...new Set(droppedItems)].filter((id) => !ownedDefIds.has(id));

        if (newItems.length > 0) {
          const acquiredAt = Date.now();
          await Promise.all(
            newItems.map((itemDefId) =>
              inventoryRef.add({
                uid,
                itemDefId,
                quantity: 1,
                equipped: false,
                acquiredAt,
              }),
            ),
          );
        }
      } catch (err) {
        // XP and gold are already committed — don't fail the whole call.
        // Signal to the client that items may be missing so it can prompt a retry.
        console.error('claimDungeonRun: inventory write failed after transaction', err);
        inventoryPartial = true;
      }
    }

    return {
      xp: awardedXp,
      gold: awardedGold,
      achievementGold: earnedAchievements.reduce((sum, id) => sum + (ACHIEVEMENT_GOLD[id] ?? 0), 0),
      items: droppedItems,
      leveledUp: didLevelUp,
      newAchievements: earnedAchievements,
      ...(inventoryPartial && { inventoryPartial: true }),
    };
  },
);

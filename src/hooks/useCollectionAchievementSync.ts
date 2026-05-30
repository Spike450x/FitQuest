'use client';

import { useEffect, useRef } from 'react';
import { useCharacterStore } from '@/store/characterStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { updateCharacterDoc } from '@/lib/characterData';
import { captureError } from '@/lib/errors';
import { checkCollectionAchievements, sumAchievementGold } from '@/lib/gameLogic/achievements';
import { bestiaryProgress } from '@/lib/gameLogic/collections';

/**
 * Client-authoritative sync for collection-category achievements:
 *   - bestiary-complete    — every monster + boss discovered
 *   - legendary-hoarder    — every legendary item owned simultaneously
 *   - armory               — 15+ unique gear items owned at once
 *   - arcane-archive       — every spell in the catalog owned
 *
 * These four live outside the server-authoritative path because they read
 * client-derived state (inventory + bestiary progress). Worst-case tamper is
 * a few hundred gold per fabricated unlock — trivial vs the gold economy.
 * If leaderboards or competitive scoring ever ship, fold the same check into
 * the `claimCombatVictory` / `logActivity` CF transactions to re-validate.
 *
 * Runs once on character/inventory change. Skips if the achievements are
 * already held (single Set lookup), and writes only when at least one is
 * newly unlocked.
 */
export function useCollectionAchievementSync() {
  const character = useCharacterStore((s) => s.character);
  const items = useInventoryStore((s) => s.items);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!character || inFlight.current) return;

    const existing = new Set(character.achievements ?? []);
    // Cheap short-circuit — all three already unlocked → nothing to do.
    if (
      existing.has('bestiary-complete') &&
      existing.has('legendary-hoarder') &&
      existing.has('armory')
    ) {
      return;
    }

    const progress = bestiaryProgress(character);
    const bestiaryComplete =
      progress.monstersDiscovered >= progress.totalMonsters &&
      progress.bossesDefeated >= progress.totalBosses;

    const ownedItemIds = new Set(items.map((i) => i.itemDefId));

    const unlocked = checkCollectionAchievements({
      existing,
      ownedItemIds,
      bestiaryComplete,
    });

    if (unlocked.length === 0) return;

    const goldDelta = sumAchievementGold(unlocked);
    const newAchievements = [...(character.achievements ?? []), ...unlocked];
    const newGold = (character.gold ?? 0) + goldDelta;

    inFlight.current = true;
    (async () => {
      try {
        await updateCharacterDoc(character.uid, {
          achievements: newAchievements,
          gold: newGold,
        });
        useCharacterStore.setState({
          character: { ...character, achievements: newAchievements, gold: newGold },
        });
      } catch (err) {
        captureError('useCollectionAchievementSync.write', err);
      } finally {
        inFlight.current = false;
      }
    })();
  }, [character, items]);
}

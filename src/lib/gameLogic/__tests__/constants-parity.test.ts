/**
 * Drift-detection tests for constants duplicated between src/ and functions/.
 *
 * Two sets of values are copied rather than shared (the functions package
 * cannot import from @/ path aliases):
 *
 *   1. RESTORE rates — src/lib/gameLogic/constants.ts ↔ functions/src/gameLogic/constants.ts
 *   2. GEAR_STAT_BONUSES — functions/src/gameLogic/items.ts is a hand-curated subset of
 *      the client ITEM_CATALOG. Only stamina/health bonuses are needed by the server for
 *      resource-max calculations.
 *
 * A failing test here means one copy drifted and the server-side resource-restore or
 * HP/Stamina cap calculation will differ from what the client UI shows.
 */

import { describe, it, expect } from 'vitest';
import { RESTORE as CLIENT_RESTORE } from '../constants';
import { RESTORE as FN_RESTORE } from '../../../../functions/src/gameLogic/constants';
import { GEAR_STAT_BONUSES } from '../../../../functions/src/gameLogic/items';
import { ITEM_CATALOG } from '../items';

describe('RESTORE rates parity — src vs functions copy', () => {
  it('HP_PER_MEAL matches', () => {
    expect(FN_RESTORE.HP_PER_MEAL).toBe(CLIENT_RESTORE.HP_PER_MEAL);
  });

  it('STAMINA_PER_SLEEP_HOUR matches', () => {
    expect(FN_RESTORE.STAMINA_PER_SLEEP_HOUR).toBe(CLIENT_RESTORE.STAMINA_PER_SLEEP_HOUR);
  });

  it('MAGIC_PER_WATER_GLASS matches', () => {
    expect(FN_RESTORE.MAGIC_PER_WATER_GLASS).toBe(CLIENT_RESTORE.MAGIC_PER_WATER_GLASS);
  });
});

describe('GEAR_STAT_BONUSES parity — functions copy vs client ITEM_CATALOG', () => {
  it('every item ID in GEAR_STAT_BONUSES exists in ITEM_CATALOG', () => {
    const catalogIds = new Set(ITEM_CATALOG.map((i) => i.id));
    for (const id of Object.keys(GEAR_STAT_BONUSES)) {
      expect(
        catalogIds.has(id),
        `Item "${id}" in GEAR_STAT_BONUSES not found in ITEM_CATALOG`,
      ).toBe(true);
    }
  });

  it('stamina and health stat bonuses match ITEM_CATALOG for every tracked item', () => {
    for (const [id, bonuses] of Object.entries(GEAR_STAT_BONUSES)) {
      const def = ITEM_CATALOG.find((i) => i.id === id);
      if (!def) continue; // caught by the existence test above

      if (bonuses.stamina !== undefined) {
        expect(
          def.statBonuses.stamina ?? 0,
          `stamina mismatch for "${id}": catalog=${def.statBonuses.stamina ?? 0}, functions=${bonuses.stamina}`,
        ).toBe(bonuses.stamina);
      }

      if (bonuses.health !== undefined) {
        expect(
          def.statBonuses.health ?? 0,
          `health mismatch for "${id}": catalog=${def.statBonuses.health ?? 0}, functions=${bonuses.health}`,
        ).toBe(bonuses.health);
      }
    }
  });

  it('every gear item with stamina/health bonuses in ITEM_CATALOG is tracked in GEAR_STAT_BONUSES', () => {
    const trackedIds = new Set(Object.keys(GEAR_STAT_BONUSES));
    const gearTypes = new Set(['weapon', 'armor', 'accessory']);

    for (const item of ITEM_CATALOG) {
      if (!gearTypes.has(item.type)) continue;
      const hasStamina = (item.statBonuses.stamina ?? 0) > 0;
      const hasHealth = (item.statBonuses.health ?? 0) > 0;
      if (hasStamina || hasHealth) {
        expect(
          trackedIds.has(item.id),
          `Item "${item.id}" has stamina/health bonus in ITEM_CATALOG but is missing from GEAR_STAT_BONUSES`,
        ).toBe(true);
      }
    }
  });
});

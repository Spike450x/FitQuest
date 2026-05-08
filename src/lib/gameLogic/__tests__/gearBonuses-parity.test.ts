/**
 * Drift-detection test for the duplicated gear stat-bonus lookup.
 *
 * `functions/src/gameLogic/items.ts` exports `GEAR_STAT_BONUSES` — a minimal
 * copy of the `stamina` and `health` bonuses from each item in `ITEM_CATALOG`.
 * The Cloud Function uses it to compute `playerMaxHp` and `playerMaxStamina`
 * server-side without copying the full ~60-item catalog.
 *
 * This test asserts that for every item in `ITEM_CATALOG` whose `statBonuses`
 * include a non-zero `stamina` or `health`, `GEAR_STAT_BONUSES` carries the
 * same values. A failing test means a new gear item was added to `src/` but
 * the functions copy was forgotten — which would silently under-cap the
 * player's resource max in the function.
 */

import { describe, it, expect } from 'vitest';
import { ITEM_CATALOG } from '../items';
import { GEAR_STAT_BONUSES } from '../../../../functions/src/gameLogic/items';

describe('GEAR_STAT_BONUSES parity — src ITEM_CATALOG vs functions copy', () => {
  // Build the source-of-truth lookup from ITEM_CATALOG, keeping only items
  // with a stamina or health bonus (the only stats that affect resource max).
  const expected: Record<string, { stamina?: number; health?: number }> = {};
  for (const item of ITEM_CATALOG) {
    const stamina = item.statBonuses.stamina;
    const health = item.statBonuses.health;
    if (!stamina && !health) continue;
    expected[item.id] = {};
    if (stamina) expected[item.id].stamina = stamina;
    if (health) expected[item.id].health = health;
  }

  it('every catalog item with stamina/health is in GEAR_STAT_BONUSES', () => {
    for (const id of Object.keys(expected)) {
      expect(GEAR_STAT_BONUSES[id]).toBeDefined();
    }
  });

  it('GEAR_STAT_BONUSES values match the catalog', () => {
    for (const [id, bonuses] of Object.entries(expected)) {
      expect(GEAR_STAT_BONUSES[id]).toEqual(bonuses);
    }
  });

  it('GEAR_STAT_BONUSES has no extra entries beyond the catalog', () => {
    for (const id of Object.keys(GEAR_STAT_BONUSES)) {
      expect(expected[id]).toBeDefined();
    }
  });
});

/**
 * Drift-detection tests for the resource-max formulas duplicated between
 * src/lib/gameLogic/combat.ts and functions/src/gameLogic/combat.ts.
 *
 * The function-side copies use flat scalar arguments instead of Character
 * objects because they run in an isolated package without @/ path aliases.
 * A failing test here means the function's restore-cap logic will diverge
 * from what the client UI shows, causing over-cap or under-cap restores.
 */

import { describe, it, expect } from 'vitest';
import { playerMaxHp, playerMaxStamina, playerMaxMagic } from '../combat';
import {
  playerMaxHp as fnMaxHp,
  playerMaxStamina as fnMaxStamina,
  playerMaxMagic as fnMaxMagic,
} from '../../../../functions/src/gameLogic/combat';

const NO_GEAR = { weapon: null, armor: null, accessory: null };

describe('playerMaxHp parity — src vs functions copy', () => {
  const cases: [number, number][] = [
    [6, 7], // warrior starting stats
    [5, 6], // wizard starting stats
    [8, 5], // rogue starting stats
    [20, 30], // high-level stats
  ];

  it.each(cases)('stamina=%d health=%d matches', (stamina, health) => {
    const clientResult = playerMaxHp({
      stats: { stamina, health, strength: 0, agility: 0, wisdom: 0, defense: 0 },
      equippedGear: NO_GEAR,
    });
    const fnResult = fnMaxHp({ stamina, health }, NO_GEAR);
    expect(fnResult).toBe(clientResult);
  });
});

describe('playerMaxStamina parity — src vs functions copy', () => {
  const cases: number[] = [6, 8, 5, 20];

  it.each(cases)('stamina=%d matches', (stamina) => {
    const clientResult = playerMaxStamina({
      stats: { stamina, strength: 0, agility: 0, health: 0, wisdom: 0, defense: 0 },
      equippedGear: NO_GEAR,
    });
    const fnResult = fnMaxStamina({ stamina }, NO_GEAR);
    expect(fnResult).toBe(clientResult);
  });
});

describe('playerMaxMagic parity — src vs functions copy', () => {
  const cases: [number, string][] = [
    [8, 'wizard'],
    [3, 'warrior'],
    [6, 'rogue'],
    [20, 'wizard'],
  ];

  it.each(cases)('wisdom=%d class=%s matches', (wisdom, charClass) => {
    const clientResult = playerMaxMagic({
      stats: { wisdom, strength: 0, stamina: 0, agility: 0, health: 0, defense: 0 },
      class: charClass as never,
    });
    const fnResult = fnMaxMagic(wisdom, charClass);
    expect(fnResult).toBe(clientResult);
  });
});

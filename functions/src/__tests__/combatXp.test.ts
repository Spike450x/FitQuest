import { describe, it, expect } from 'vitest';
import { combatXpDailyMultiplier as serverMultiplier } from '../gameLogic/combat';
import { combatXpDailyMultiplier as clientMultiplier } from '../../../src/lib/gameLogic/combat';

// ─── Server multiplier — pure logic ──────────────────────────────────────────

describe('combatXpDailyMultiplier (server)', () => {
  it('returns 1.0× for the first 5 wins of the day', () => {
    expect(serverMultiplier(0)).toBe(1.0);
    expect(serverMultiplier(4)).toBe(1.0);
  });

  it('returns 0.5× for wins 6–15', () => {
    expect(serverMultiplier(5)).toBe(0.5);
    expect(serverMultiplier(14)).toBe(0.5);
  });

  it('returns 0.25× for wins 16–25', () => {
    expect(serverMultiplier(15)).toBe(0.25);
    expect(serverMultiplier(24)).toBe(0.25);
  });

  it('floors at 0.1× from win 26 onward', () => {
    expect(serverMultiplier(25)).toBe(0.1);
    expect(serverMultiplier(500)).toBe(0.1);
  });
});

// ─── Parity check — client copy must match server copy exactly ───────────────
//
// Both copies of the function must return the same value for every input.
// The diminishing-returns curve is the contract between the UI (which shows
// the player how much XP they'll get) and the Cloud Function (which actually
// awards it). Drift breaks player trust.

describe('combatXpDailyMultiplier parity (client ↔ server)', () => {
  it('returns the same multiplier for every reasonable win count', () => {
    for (let n = 0; n <= 100; n += 1) {
      expect(clientMultiplier(n)).toBe(serverMultiplier(n));
    }
  });
});

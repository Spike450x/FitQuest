import { describe, it, expect } from 'vitest';
import { questRerollCost, QUEST_REROLL_BASE } from '../constants';
import { daysSinceLastLog, shouldOfferWelcomeBack, WELCOME_BACK_ABSENCE_DAYS } from '../streaks';

// ─── Quest reroll cost ──────────────────────────────────────────────────────

describe('questRerollCost', () => {
  it('stays at the base cost for levels 1–4', () => {
    for (const lvl of [1, 2, 3, 4]) {
      expect(questRerollCost(lvl)).toBe(QUEST_REROLL_BASE);
    }
  });

  it('stays at the base cost from level 5–9 (floor(5/5) = 1)', () => {
    for (const lvl of [5, 6, 7, 8, 9]) {
      expect(questRerollCost(lvl)).toBe(QUEST_REROLL_BASE);
    }
  });

  it('doubles at level 10', () => {
    expect(questRerollCost(10)).toBe(QUEST_REROLL_BASE * 2);
    expect(questRerollCost(14)).toBe(QUEST_REROLL_BASE * 2);
  });

  it('triples at level 15', () => {
    expect(questRerollCost(15)).toBe(QUEST_REROLL_BASE * 3);
  });

  it('is monotonically non-decreasing', () => {
    let prev = 0;
    for (let lvl = 1; lvl <= 20; lvl++) {
      const cost = questRerollCost(lvl);
      expect(cost).toBeGreaterThanOrEqual(prev);
      prev = cost;
    }
  });
});

// ─── Welcome-back boost ─────────────────────────────────────────────────────

describe('daysSinceLastLog', () => {
  it('returns 0 for the same UTC day', () => {
    expect(daysSinceLastLog('2026-05-30', '2026-05-30')).toBe(0);
  });

  it('returns 1 for consecutive UTC days', () => {
    expect(daysSinceLastLog('2026-05-29', '2026-05-30')).toBe(1);
  });

  it('returns 14 across a 2-week gap', () => {
    expect(daysSinceLastLog('2026-05-16', '2026-05-30')).toBe(14);
  });

  it('returns Infinity when lastLogDate is undefined', () => {
    expect(daysSinceLastLog(undefined, '2026-05-30')).toBe(Infinity);
  });

  it('clamps negative deltas to 0', () => {
    expect(daysSinceLastLog('2026-05-30', '2026-05-29')).toBe(0);
  });
});

describe('shouldOfferWelcomeBack', () => {
  it('returns false for a fresh-account player (no lastLogDate)', () => {
    expect(shouldOfferWelcomeBack(undefined, 0, '2026-05-30')).toBe(false);
  });

  it('returns false when absent < WELCOME_BACK_ABSENCE_DAYS', () => {
    expect(shouldOfferWelcomeBack('2026-05-20', 0, '2026-05-30')).toBe(false);
  });

  it('returns true when absent ≥ WELCOME_BACK_ABSENCE_DAYS and no streak tier', () => {
    // 14 days back, currentStreak = 0
    expect(shouldOfferWelcomeBack('2026-05-16', 0, '2026-05-30')).toBe(true);
  });

  it('returns false when player has an active streak tier (≥ 3 days)', () => {
    expect(shouldOfferWelcomeBack('2026-05-16', 5, '2026-05-30')).toBe(false);
  });

  it('threshold is exactly WELCOME_BACK_ABSENCE_DAYS, not greater than', () => {
    // 13 days back → still below threshold
    expect(shouldOfferWelcomeBack('2026-05-17', 0, '2026-05-30')).toBe(false);
    // 14 days back → exactly at threshold
    expect(shouldOfferWelcomeBack('2026-05-16', 0, '2026-05-30')).toBe(true);
    // sanity-check the constant
    expect(WELCOME_BACK_ABSENCE_DAYS).toBe(14);
  });
});

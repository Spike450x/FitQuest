import { describe, it, expect } from 'vitest';
import { isMasteryMilestone, nextMasteryMilestone } from '../constants';

describe('isMasteryMilestone', () => {
  it('returns true at the first milestone (5)', () => {
    expect(isMasteryMilestone(5)).toBe(true);
  });

  it('returns false just before the first milestone (4)', () => {
    expect(isMasteryMilestone(4)).toBe(false);
  });

  it('returns false just after the first milestone (6)', () => {
    expect(isMasteryMilestone(6)).toBe(false);
  });

  it('returns true at subsequent milestones (15, 25, 35, 45)', () => {
    expect(isMasteryMilestone(15)).toBe(true);
    expect(isMasteryMilestone(25)).toBe(true);
    expect(isMasteryMilestone(35)).toBe(true);
    expect(isMasteryMilestone(45)).toBe(true);
  });

  it('returns false between milestones (14, 16, 24, 26)', () => {
    expect(isMasteryMilestone(14)).toBe(false);
    expect(isMasteryMilestone(16)).toBe(false);
    expect(isMasteryMilestone(24)).toBe(false);
    expect(isMasteryMilestone(26)).toBe(false);
  });

  it('returns false at 0 and 1', () => {
    expect(isMasteryMilestone(0)).toBe(false);
    expect(isMasteryMilestone(1)).toBe(false);
  });
});

describe('nextMasteryMilestone', () => {
  it('returns 5 for counts below the first milestone', () => {
    expect(nextMasteryMilestone(0)).toBe(5);
    expect(nextMasteryMilestone(1)).toBe(5);
    expect(nextMasteryMilestone(4)).toBe(5);
  });

  it('returns 15 once the first milestone is reached', () => {
    expect(nextMasteryMilestone(5)).toBe(15);
    expect(nextMasteryMilestone(6)).toBe(15);
    expect(nextMasteryMilestone(14)).toBe(15);
  });

  it('returns the next milestone after each 10-count interval', () => {
    expect(nextMasteryMilestone(15)).toBe(25);
    expect(nextMasteryMilestone(16)).toBe(25);
    expect(nextMasteryMilestone(24)).toBe(25);
    expect(nextMasteryMilestone(25)).toBe(35);
    expect(nextMasteryMilestone(50)).toBe(55);
  });

  it('is consistent with isMasteryMilestone — hit count is always a milestone', () => {
    for (const start of [0, 1, 4, 5, 9, 14, 24, 49]) {
      const next = nextMasteryMilestone(start);
      expect(isMasteryMilestone(next)).toBe(true);
    }
  });
});

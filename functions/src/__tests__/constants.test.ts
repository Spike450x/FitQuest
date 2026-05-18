import { describe, it, expect } from 'vitest';
import { isMasteryMilestone, statCap } from '../gameLogic/constants';

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

  it('is consistent with the pattern: first at 5, then every 10', () => {
    const milestones = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95];
    for (const m of milestones) {
      expect(isMasteryMilestone(m)).toBe(true);
      expect(isMasteryMilestone(m - 1)).toBe(false);
      expect(isMasteryMilestone(m + 1)).toBe(false);
    }
  });
});

describe('statCap', () => {
  it('caps primary stats (strength, wisdom, agility) at 50 regardless of level', () => {
    expect(statCap('strength', 1)).toBe(50);
    expect(statCap('wisdom', 50)).toBe(50);
    expect(statCap('agility', 100)).toBe(50);
  });

  it('caps secondary stats at level * 5 + 10', () => {
    expect(statCap('stamina', 1)).toBe(15);
    expect(statCap('health', 10)).toBe(60);
    expect(statCap('defense', 20)).toBe(110);
  });

  it('secondary cap grows with level', () => {
    expect(statCap('stamina', 5)).toBeLessThan(statCap('stamina', 10));
    expect(statCap('health', 10)).toBeLessThan(statCap('health', 20));
  });

  it('secondary cap at level 100 is 510', () => {
    expect(statCap('stamina', 100)).toBe(510);
    expect(statCap('health', 100)).toBe(510);
    expect(statCap('defense', 100)).toBe(510);
  });
});

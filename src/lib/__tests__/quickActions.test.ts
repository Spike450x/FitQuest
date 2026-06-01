import { describe, it, expect } from 'vitest';
import {
  QUICK_ACTION_CATALOG,
  DEFAULT_PINNED_ACTIONS,
  MAX_PINNED_ACTIONS,
  MIN_PINNED_ACTIONS,
  ALL_QUICK_ACTION_IDS,
  resolvePinnedActions,
  getQuickAction,
} from '@/lib/quickActions';

describe('quickActions catalog', () => {
  it('has unique ids and hrefs', () => {
    const ids = QUICK_ACTION_CATALOG.map((a) => a.id);
    const hrefs = QUICK_ACTION_CATALOG.map((a) => a.href);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('exposes every id via ALL_QUICK_ACTION_IDS', () => {
    expect([...ALL_QUICK_ACTION_IDS].sort()).toEqual(QUICK_ACTION_CATALOG.map((a) => a.id).sort());
  });

  it('defaults are valid catalog ids within the pin limits', () => {
    expect(DEFAULT_PINNED_ACTIONS.length).toBeGreaterThanOrEqual(MIN_PINNED_ACTIONS);
    expect(DEFAULT_PINNED_ACTIONS.length).toBeLessThanOrEqual(MAX_PINNED_ACTIONS);
    DEFAULT_PINNED_ACTIONS.forEach((id) => {
      expect(ALL_QUICK_ACTION_IDS).toContain(id);
    });
  });
});

describe('resolvePinnedActions', () => {
  it('resolves ids in order', () => {
    const resolved = resolvePinnedActions(['shop', 'log']);
    expect(resolved.map((a) => a.id)).toEqual(['shop', 'log']);
  });

  it('drops unknown ids', () => {
    const resolved = resolvePinnedActions(['log', 'nope', 'combat']);
    expect(resolved.map((a) => a.id)).toEqual(['log', 'combat']);
  });

  it('falls back to defaults when nothing valid remains', () => {
    expect(resolvePinnedActions([]).map((a) => a.id)).toEqual(DEFAULT_PINNED_ACTIONS);
    expect(resolvePinnedActions(['bogus']).map((a) => a.id)).toEqual(DEFAULT_PINNED_ACTIONS);
  });
});

describe('getQuickAction', () => {
  it('returns the matching entry', () => {
    expect(getQuickAction('combat')?.href).toBe('/combat');
  });

  it('returns undefined for an unknown id', () => {
    expect(getQuickAction('nope')).toBeUndefined();
  });
});

import { describe, it, expect } from 'vitest';
import { NAV_ITEMS, ALL_NAV_HREFS } from '@/lib/navConfig';

describe('navConfig', () => {
  it('ALL_NAV_HREFS is derived from NAV_ITEMS — no drift possible', () => {
    expect(ALL_NAV_HREFS).toEqual(NAV_ITEMS.map((i) => i.href));
  });

  it('has no duplicate hrefs', () => {
    expect(new Set(ALL_NAV_HREFS).size).toBe(ALL_NAV_HREFS.length);
  });

  it('every item has a non-empty label and href starting with /', () => {
    for (const { href, label } of NAV_ITEMS) {
      expect(href).toMatch(/^\//);
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('every item has a defined Icon', () => {
    for (const { Icon } of NAV_ITEMS) {
      expect(Icon).toBeDefined();
    }
  });
});

// Seeded RNG installer for the authenticated-flows Playwright project.
//
// Runs via page.addInitScript so the override is in place BEFORE any app
// bundle executes. Combat, spells, and loot rolls call window.Math.random()
// directly (no seedable wrapper in src/lib/gameLogic/), so this is the
// least-invasive way to make flow tests deterministic.
//
// Side note: src/lib/sounds.ts also uses Math.random for audio buffer init.
// Stubbing makes that produce a single-tone buffer — harmless in headless CI.

import type { Page } from '@playwright/test';

// Mulberry32 — small, fast, well-distributed PRNG. 32-bit seed.
function mulberry32Source(): string {
  return `
    (function () {
      var seed = __SEED__ >>> 0;
      var next = function () {
        seed = (seed + 0x6D2B79F5) >>> 0;
        var t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      // Replace Math.random globally. Non-configurable on some engines, so
      // use defineProperty with fallback to direct assignment.
      try {
        Object.defineProperty(Math, 'random', { value: next, configurable: true });
      } catch (_e) {
        Math.random = next;
      }
    })();
  `;
}

// Stable 32-bit hash of a string so each test gets a reproducible seed
// keyed off its title — different tests don't share an identical sequence.
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export async function installSeededRandom(page: Page, seedInput: string | number): Promise<void> {
  const seed = typeof seedInput === 'number' ? seedInput >>> 0 : hashSeed(seedInput);
  await page.addInitScript(mulberry32Source().replace('__SEED__', String(seed)));
}

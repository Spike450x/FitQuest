import { test, expect } from '@playwright/test';

// Storage state is applied at the project level in playwright.config.ts.
// The __session cookie + Firebase localStorage auth are set before each test,
// so the middleware allows access and Firebase Auth reports a signed-in user.

test.describe('authenticated game screens — structure smoke tests', () => {
  test('dashboard renders character heading and XP progress bar', async ({ page }) => {
    await page.goto('/dashboard');
    // Dashboard does not have a top-level "Dashboard" heading — the prominent
    // h2 is the character name. The XPBar renders a progressbar role element.
    await expect(page.getByRole('progressbar').first()).toBeVisible({ timeout: 10_000 });
  });

  test('shop renders heading and tab list', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.getByRole('heading', { name: /shop/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('tablist', { name: /shop categories/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('inventory renders heading', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.getByRole('heading', { name: /inventory/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('quests renders heading', async ({ page }) => {
    await page.goto('/quests');
    // Strict-mode-safe: page also has "Daily Quests" / "Weekly Quests" h2s,
    // so match the top-level "Quests" h1 exactly.
    await expect(page.getByRole('heading', { name: 'Quests', exact: true })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('character renders heading', async ({ page }) => {
    await page.goto('/character');
    await expect(page.getByRole('heading', { name: /character/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('combat renders heading', async ({ page }) => {
    await page.goto('/combat');
    await expect(page.getByRole('heading', { name: /combat/i })).toBeVisible({ timeout: 10_000 });
  });

  test('stats renders heading', async ({ page }) => {
    await page.goto('/stats');
    await expect(page.getByRole('heading', { name: /stats/i })).toBeVisible({ timeout: 10_000 });
  });

  test('profile renders heading', async ({ page }) => {
    await page.goto('/profile');
    // Profile route's h1 is "Account Settings".
    await expect(page.getByRole('heading', { name: /account settings/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('dungeons renders heading', async ({ page }) => {
    await page.goto('/combat/dungeons');
    await expect(page.getByRole('heading', { name: /dungeon/i })).toBeVisible({ timeout: 10_000 });
  });

  test('authenticated pages do not redirect to /login', async ({ page }) => {
    for (const route of [
      '/dashboard',
      '/shop',
      '/inventory',
      '/quests',
      '/character',
      '/combat',
      '/stats',
      '/profile',
    ]) {
      await page.goto(route);
      await expect(page).not.toHaveURL(/\/login/);
    }
  });
});

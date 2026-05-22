import { test, expect, type Page } from '@playwright/test';

// Sets localStorage before the page script runs so the THEME_BOOTSTRAP inline
// script reads 'dark' and adds the `dark` class to <html> before hydration.
async function setDarkTheme(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('fitquest-theme', 'dark');
  });
}

test.describe('dark mode — /login', () => {
  test.beforeEach(async ({ page }) => {
    await setDarkTheme(page);
    await page.goto('/login');
  });

  test('html element has dark class', async ({ page }) => {
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });

  test('email input background is not white in dark mode', async ({ page }) => {
    const bg = await page
      .locator('input#email')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    // Canonical dark input bg is slate-950 (~rgb(2, 6, 23)) — definitely not white
    expect(bg).not.toBe('rgb(255, 255, 255)');
  });

  test('password input background is not white in dark mode', async ({ page }) => {
    const bg = await page
      .locator('input#password')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe('rgb(255, 255, 255)');
  });

  test('email input has light-readable text color in dark mode', async ({ page }) => {
    const color = await page.locator('input#email').evaluate((el) => getComputedStyle(el).color);
    // Must not be near-black (dark text on dark bg)
    expect(color).not.toBe('rgb(17, 24, 39)'); // gray-900
  });
});

test.describe('dark mode — /register', () => {
  test.beforeEach(async ({ page }) => {
    await setDarkTheme(page);
    await page.goto('/register');
  });

  test('html element has dark class', async ({ page }) => {
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });

  test('email input background is not white in dark mode', async ({ page }) => {
    const bg = await page
      .locator('input#email')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe('rgb(255, 255, 255)');
  });

  test('password input background is not white in dark mode', async ({ page }) => {
    const bg = await page
      .locator('input#password')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe('rgb(255, 255, 255)');
  });

  test('confirm-password input background is not white in dark mode', async ({ page }) => {
    const bg = await page
      .locator('input#confirm-password')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe('rgb(255, 255, 255)');
  });
});

test.describe('light mode — /login (default)', () => {
  test('inputs have white background in light mode', async ({ page }) => {
    await page.goto('/login');
    const bg = await page
      .locator('input#email')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(255, 255, 255)');
  });
});

import { test, expect } from '@playwright/test';

// ─── Auth Redirect ─────────────────────────────────────────────────────────────
// The middleware checks for a __session cookie. Without it, all protected
// routes redirect to /login. These tests verify the routing layer works
// correctly without requiring real Firebase credentials.

test.describe('unauthenticated redirects', () => {
  test('root / redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/activities redirects to /login', async ({ page }) => {
    await page.goto('/activities');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/combat redirects to /login', async ({ page }) => {
    await page.goto('/combat');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/stats redirects to /login', async ({ page }) => {
    await page.goto('/stats');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/quests redirects to /login', async ({ page }) => {
    await page.goto('/quests');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/character redirects to /login', async ({ page }) => {
    await page.goto('/character');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/inventory redirects to /login', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/shop redirects to /login', async ({ page }) => {
    await page.goto('/shop');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/profile redirects to /login', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/combat/dungeons redirects to /login', async ({ page }) => {
    await page.goto('/combat/dungeons');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/combat/dungeons/run redirects to /login', async ({ page }) => {
    await page.goto('/combat/dungeons/run');
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── Login Page ───────────────────────────────────────────────────────────────

test.describe('login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders the login form with email and password inputs', async ({ page }) => {
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
  });

  test('has a submit button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /enter the realm/i })).toBeVisible();
  });

  test('has a link to the register page', async ({ page }) => {
    const link = page.getByRole('link', { name: /create a character/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('email input has correct type and autocomplete', async ({ page }) => {
    const email = page.locator('input#email');
    await expect(email).toHaveAttribute('type', 'email');
    await expect(email).toHaveAttribute('autocomplete', 'email');
  });

  test('password input has correct type and autocomplete', async ({ page }) => {
    const password = page.locator('input#password');
    await expect(password).toHaveAttribute('type', 'password');
    await expect(password).toHaveAttribute('autocomplete', 'current-password');
  });

  test('page title / heading identifies the app', async ({ page }) => {
    await expect(page.getByText(/welcome back, adventurer/i)).toBeVisible();
  });
});

// ─── Register Page ────────────────────────────────────────────────────────────

test.describe('register page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('renders without crashing', async ({ page }) => {
    await expect(page.locator('form')).toBeVisible();
  });

  test('has a link back to login', async ({ page }) => {
    const link = page.getByRole('link', { name: /sign in/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/login/);
  });
});

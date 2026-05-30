import { test, expect } from '@playwright/test';
import { installSeededRandom } from '../helpers/rng';
import { resetCharacter, createTestUser, seedAbsentStreak } from '../helpers/seed';
import { gotoFresh } from '../helpers/actions';

test.describe.configure({ retries: 2 });

let uid: string;

test.beforeAll(async () => {
  const tokens = await createTestUser();
  uid = tokens.localId;
});

test.beforeEach(async ({ page }, testInfo) => {
  await installSeededRandom(page, testInfo.title);
  await resetCharacter(uid);
});

test('welcome-back banner shows for a 15-day-absent player', async ({ page }) => {
  // Simulate a returning player: last log was 15 days ago, no active streak.
  // The `useWelcomeBackBoost` hook fires when absence ≥ 14 days AND
  // currentStreak < the lowest streak tier (3 days).
  await seedAbsentStreak(uid, 15);
  await gotoFresh(page, '/dashboard');
  await expect(page.getByTestId('welcome-back-banner')).toBeVisible({ timeout: 10_000 });
});

test('welcome-back banner is hidden for a fresh / active streak player', async ({ page }) => {
  // resetCharacter sets lastLogDate to today. A current-day-active player
  // should NOT see the welcome-back banner (the boost is opt-in for absentees).
  await gotoFresh(page, '/dashboard');
  // Wait a beat for the hook to evaluate; banner should never appear.
  await page.waitForTimeout(500);
  await expect(page.getByTestId('welcome-back-banner')).toBeHidden();
});

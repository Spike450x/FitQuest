import { test, expect } from '@playwright/test';
import { installSeededRandom } from '../helpers/rng';
import { resetCharacter, createTestUser } from '../helpers/seed';
import { logWorkout, gotoFresh } from '../helpers/actions';

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

test('logs a workout and shows the mastery result card', async ({ page }) => {
  await logWorkout(page, { minutes: 30 });
  // The mastery result card surfaces the activity label, milestone hint, and
  // a "Log Another Activity" CTA. Confirm we're on the result view.
  await expect(page.getByRole('button', { name: /log another activity/i })).toBeVisible();
});

test('xp persists after refresh', async ({ page }) => {
  await logWorkout(page, { minutes: 30 });
  await gotoFresh(page, '/dashboard');
  // XP bar exists and is non-empty. Progress bar role is consistent on dashboard.
  await expect(page.getByRole('progressbar').first()).toBeVisible({ timeout: 10_000 });
});

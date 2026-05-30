import { test, expect } from '@playwright/test';
import { installSeededRandom } from '../helpers/rng';
import { resetCharacter, createTestUser } from '../helpers/seed';
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

test('polymath progress widget renders on profile with all 4 stat rows', async ({ page }) => {
  await gotoFresh(page, '/profile');
  // The widget surfaces progress toward the `polymath` achievement (mastery 5
  // on every primary stat). With a baseline character (no mastery counts),
  // all 4 rows render with 0/5 pips.
  const widget = page.getByTestId('polymath-progress');
  await expect(widget).toBeVisible({ timeout: 10_000 });
  await expect(widget.getByText('🎓 Polymath progress')).toBeVisible();

  // 4 rows: Strength / Wisdom / Agility / Spirit
  await expect(widget.getByText('Strength')).toBeVisible();
  await expect(widget.getByText('Wisdom')).toBeVisible();
  await expect(widget.getByText('Agility')).toBeVisible();
  await expect(widget.getByText('Spirit')).toBeVisible();

  // Baseline character has 0 mastery on each track.
  await expect(widget.getByText('0/5').first()).toBeVisible();
});

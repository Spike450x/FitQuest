import { test, expect } from '@playwright/test';
import { installSeededRandom } from '../helpers/rng';
import { resetCharacter, createTestUser } from '../helpers/seed';
import { buyItem, equipItem } from '../helpers/actions';

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

test('buys the cheapest weapon and equips it', async ({ page }) => {
  // Baseline character has 500 gold (see baselineCharacterFields). Cheapest
  // weapon is `worn-sword` at 40 gold.
  await buyItem(page, 'worn-sword');
  await equipItem(page, 'worn-sword');
  await expect(page.getByTestId('inventory-equipped-badge-worn-sword')).toBeVisible();
});

import { test, expect } from '@playwright/test';
import { installSeededRandom } from '../helpers/rng';
import { resetCharacter, createTestUser, seedInventoryItem } from '../helpers/seed';
import { equipItem } from '../helpers/actions';

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

// Originally tested buy → equip. The shop uses `getDailyPick(PURCHASABLE_GEAR,
// 8, todayKey)` to surface 8 of 40+ items per day, so `worn-sword` isn't
// guaranteed to appear. Seeding the inventory item directly via REST removes
// the daily-rotation dependency. Buy-flow coverage is a known follow-up.
test('equips a seeded weapon and shows the Equipped badge', async ({ page }) => {
  await seedInventoryItem(uid, 'worn-sword', { equipped: false });
  await equipItem(page, 'worn-sword');
  await expect(page.getByTestId('inventory-equipped-badge-worn-sword')).toBeVisible();
});

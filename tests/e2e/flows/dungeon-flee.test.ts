import { test, expect } from '@playwright/test';
import { installSeededRandom } from '../helpers/rng';
import { resetCharacter, createTestUser } from '../helpers/seed';
import { enterDungeonAndFlee } from '../helpers/actions';

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

test('enters Goblin Caves and reaches the run screen', async ({ page }) => {
  // Baseline character has 500 gold (entry fee 50) and 50 HP (gate ≥ 50% max).
  await enterDungeonAndFlee(page, 'goblin-caves');
  await expect(page).toHaveURL(/\/combat\/dungeons\/run/);
});

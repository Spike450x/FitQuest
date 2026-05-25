import { test, expect } from '@playwright/test';
import { installSeededRandom } from '../helpers/rng';
import { resetCharacter, createTestUser, seedEquippedWeapon } from '../helpers/seed';
import { fightFirstAvailableMonster } from '../helpers/actions';

test.describe.configure({ retries: 2 });

let uid: string;

test.beforeAll(async () => {
  const tokens = await createTestUser();
  uid = tokens.localId;
});

test.beforeEach(async ({ page }, testInfo) => {
  await installSeededRandom(page, testInfo.title);
  await resetCharacter(uid);
  // Equip a basic weapon so attack damage clears the easiest monster within
  // the action loop's maxAttacks budget.
  await seedEquippedWeapon(uid, 'worn-sword');
});

test('wins a fight and shows the victory modal', async ({ page }) => {
  const wonVictory = await fightFirstAvailableMonster(page, { maxAttacks: 30 });
  expect(wonVictory).toBe(true);
  await expect(page.getByTestId('combat-victory-modal')).toBeVisible();
});

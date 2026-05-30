import { test, expect } from '@playwright/test';
import { installSeededRandom } from '../helpers/rng';
import { resetCharacter, createTestUser, readCharacterFields } from '../helpers/seed';
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

test('daily login bonus stamps lastLoginGrantedDate on first dashboard mount', async ({ page }) => {
  // resetCharacter does not set `lastLoginGrantedDate` — so the very first
  // mount today should trigger the `useDailyLoginBonus` hook to grant the
  // bonus and stamp the field. We verify by re-reading the character doc
  // after the page settles.
  await gotoFresh(page, '/dashboard');
  // Wait for the hook to fire its async writes (toast + Firestore update).
  // The hook is idempotent within a session, so this is a one-shot.
  await page.waitForTimeout(2_000);

  const fields = await readCharacterFields(uid);
  const lastLoginGrantedDate = (fields.lastLoginGrantedDate as { stringValue?: string } | undefined)
    ?.stringValue;
  const today = new Date().toISOString().slice(0, 10);
  expect(lastLoginGrantedDate).toBe(today);
});

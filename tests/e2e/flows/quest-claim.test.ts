import { test, expect } from '@playwright/test';
import { installSeededRandom } from '../helpers/rng';
import { resetCharacter, createTestUser, seedClaimableQuest } from '../helpers/seed';
import { claimQuestById } from '../helpers/actions';

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

test('claims a completed quest and shows the Claimed badge', async ({ page }) => {
  // Seed a quest in completed-but-unclaimed state. questDefId references a
  // real definition; if the questDef catalog changes, swap in a current id.
  const questId = `test-claim-${Date.now()}`;
  // 'daily-workout-1' is a stable id in src/lib/gameLogic/quests.ts.
  await seedClaimableQuest(uid, questId, 'daily-workout-1', { xp: 50, gold: 20 });
  await claimQuestById(page, questId);
  await expect(page.getByTestId(`quest-claimed-badge-${questId}`)).toBeVisible();
});

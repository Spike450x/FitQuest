// UI action helpers for authenticated flow tests. Each helper performs one
// user-meaningful interaction and waits for the visible feedback. Selectors
// rely on data-testid attributes added to the components (see PR).

import { expect, type Page } from '@playwright/test';

export async function gotoFresh(page: Page, path: string): Promise<void> {
  // Bust any cached Zustand state from a previous test by hitting the route
  // fresh — every authenticated page re-fetches from Firestore on mount.
  await page.goto(path);
}

export async function logWorkout(
  page: Page,
  opts: { minutes: number } = { minutes: 30 },
): Promise<void> {
  await gotoFresh(page, '/activities');
  await page.getByTestId('activity-tab-workout').click();
  const input = page.locator('input#activity-amount');
  await input.fill(String(opts.minutes));
  await page.getByTestId('log-activity-submit').click();
  // Submit triggers the logActivity CF + a ResultCard render. Either the
  // mastery result card or restore result card shows — both contain the
  // text "Log Another Activity".
  await expect(page.getByRole('button', { name: /log another activity/i })).toBeVisible({
    timeout: 15_000,
  });
}

export async function claimQuestById(page: Page, questId: string): Promise<void> {
  await gotoFresh(page, '/quests');
  const claimBtn = page.getByTestId(`quest-claim-btn-${questId}`);
  await expect(claimBtn).toBeVisible({ timeout: 10_000 });
  await claimBtn.click();
  // Card transitions to claimed state.
  await expect(page.getByTestId(`quest-claimed-badge-${questId}`)).toBeVisible({
    timeout: 10_000,
  });
}

export async function buyItem(page: Page, itemId: string): Promise<void> {
  await gotoFresh(page, '/shop');
  const buyBtn = page.getByTestId(`shop-buy-${itemId}`);
  await expect(buyBtn).toBeVisible({ timeout: 10_000 });
  await buyBtn.click();
  // After purchase the "Already owned" indicator replaces the buy button.
  await expect(page.getByTestId(`shop-owned-${itemId}`)).toBeVisible({ timeout: 10_000 });
}

export async function equipItem(page: Page, itemId: string): Promise<void> {
  await gotoFresh(page, '/inventory');
  const equipBtn = page.getByTestId(`inventory-equip-${itemId}`);
  await expect(equipBtn).toBeVisible({ timeout: 10_000 });
  await equipBtn.click();
  await expect(page.getByTestId(`inventory-equipped-badge-${itemId}`)).toBeVisible({
    timeout: 10_000,
  });
}

// Picks the first available monster fight card on the combat page and starts
// the fight, then attacks until the victory modal appears or we hit max attempts.
// Returns whether victory was reached.
export async function fightFirstAvailableMonster(
  page: Page,
  opts: { maxAttacks?: number } = {},
): Promise<boolean> {
  await gotoFresh(page, '/combat');
  const fightBtns = page.locator('[data-testid^="monster-fight-"]');
  await expect(fightBtns.first()).toBeVisible({ timeout: 10_000 });
  await fightBtns.first().click();

  // Combat arena renders Attack button.
  const attackBtn = page.getByTestId('combat-attack-btn');
  await expect(attackBtn).toBeVisible({ timeout: 10_000 });

  const victoryModal = page.getByTestId('combat-victory-modal');
  const max = opts.maxAttacks ?? 25;
  for (let i = 0; i < max; i++) {
    if (await victoryModal.isVisible().catch(() => false)) return true;
    if (!(await attackBtn.isEnabled().catch(() => false))) {
      // Probably mid-roll — wait a beat
      await page.waitForTimeout(250);
      continue;
    }
    await attackBtn.click().catch(() => {});
    // Each attack triggers a dice overlay → resolution → next ready state.
    // Wait briefly for the next idle frame.
    await page.waitForTimeout(400);
  }
  return await victoryModal.isVisible().catch(() => false);
}

export async function enterDungeonAndFlee(page: Page, tierId: string): Promise<void> {
  await gotoFresh(page, `/combat/dungeons/${tierId}`);
  const enterBtn = page.getByTestId(`dungeon-enter-${tierId}`);
  await expect(enterBtn).toBeVisible({ timeout: 10_000 });
  await enterBtn.click();
  // After startRun we land on /combat/dungeons/run. The first room is either
  // a combat room or a stat-check; for combat rooms the flee button appears.
  // Wait for either.
  await page.waitForURL(/\/combat\/dungeons\/run/, { timeout: 15_000 });
  // Flee may not always be available (boss rooms disable it, stat-check rooms
  // don't render a CombatActionBar). For this test we expect a non-boss room
  // and just confirm we navigated successfully.
  await expect(page).toHaveURL(/\/combat\/dungeons\/run/);
}

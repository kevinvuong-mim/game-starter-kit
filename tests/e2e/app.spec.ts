import { test, expect } from '@playwright/test';

test.describe('Game Starter Kit', () => {
  test('loads the game container', async ({ page }) => {
    await page.goto('/');
    const container = page.locator('#game-container');
    await expect(container).toBeVisible();
  });

  test('initializes Phaser canvas', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const canvas = page.locator('#game-container canvas');
    await expect(canvas).toBeVisible();
  });
});

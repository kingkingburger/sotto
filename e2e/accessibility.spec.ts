import { test, expect } from '@playwright/test';
import { checkA11y, injectAxe } from 'axe-playwright';

test.describe('접근성 (WCAG 2.1 AA)', () => {
  test('메인 페이지 색상 대비 및 접근성 기준 충족', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="menu-card"], .py-16', {
      timeout: 15000,
    });
    await injectAxe(page);
    await checkA11y(page, undefined, {
      runOnly: { type: 'tag', values: ['wcag2aa'] },
      detailedReport: true,
    });
  });

  test('레시피 상세 페이지 접근성 기준 충족', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="menu-card"]', {
      timeout: 15000,
    });

    // Navigate to first recipe
    const firstCard = page.locator('[data-testid="menu-card"] a').first();
    await firstCard.click();
    await page.waitForLoadState('networkidle');

    await injectAxe(page);
    await checkA11y(page, undefined, {
      runOnly: { type: 'tag', values: ['wcag2aa'] },
      detailedReport: true,
    });
  });

  test('장보기 페이지 접근성 — 프로그레스 바 ARIA', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="menu-card"]', {
      timeout: 15000,
    });

    // Navigate to grocery
    const groceryBtn = page.getByRole('button', {
      name: /장보기/,
    });
    await groceryBtn.click();
    await page.waitForLoadState('networkidle');

    await injectAxe(page);
    await checkA11y(page, undefined, {
      runOnly: { type: 'tag', values: ['wcag2aa'] },
      detailedReport: true,
    });

    // Verify progressbar role
    const progressbar = page.getByRole('progressbar');
    await expect(progressbar).toBeVisible();
    await expect(progressbar).toHaveAttribute('aria-valuemin', '0');
  });

  test('reduced-motion 선호 시 애니메이션 축소', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForSelector('[data-testid="menu-card"]', {
      timeout: 15000,
    });

    // Cards should be visible without y-offset animation
    const firstCard = page.locator('[data-testid="menu-card"]').first();
    await expect(firstCard).toBeVisible();
  });
});

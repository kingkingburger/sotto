import { test, expect } from '@playwright/test';

test.describe('오프라인 배너', () => {
  test('오프라인 전환 시 배너 표시, 온라인 복귀 시 사라짐', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="menu-card"], .py-16', {
      timeout: 15000,
    });

    // Initially online — no banner
    await expect(page.getByText('오프라인 상태')).not.toBeVisible();

    // Go offline
    await page.context().setOffline(true);
    await expect(page.getByText('오프라인 상태')).toBeVisible();

    // Come back online
    await page.context().setOffline(false);
    await expect(page.getByText('오프라인 상태')).not.toBeVisible();
  });
});

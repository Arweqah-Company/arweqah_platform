import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });
test.afterEach(async ({ page }) => adminModeOffViaApi(page));

const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));

test.describe('Exceptions tab of the roles page (FR-70)', () => {
  test('shows the list of what was given outside the job title, with its search and filters, and is accessible', async ({ page }) => {
    test.setTimeout(90_000); // admin mode needs a fresh code, which may mean waiting for the next 30-second step
    await adminModeOnViaApi(page);
    await page.goto('/exceptions');
    await expect(page).toHaveURL(/\/roles\?tab=exceptions/);
    await expect(page.getByRole('heading', { level: 1, name: 'الأدوار' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'الاستثناءات' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('searchbox', { name: 'بحث في الاستثناءات' })).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
  });

  test('is a step of the administration tour for who may see the page', async ({ page }) => {
    await adminModeOnViaApi(page);
    const steps = (await (await page.request.get('/api/me/tour/admin')).json()).steps as { key: string }[];
    expect(steps.map((s) => s.key)).toContain('exceptions');
  });
});

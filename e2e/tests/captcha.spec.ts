import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });
test.afterEach(async ({ page }) => adminModeOffViaApi(page));

const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));

test.describe('Bot protection settings (FR-78)', () => {
  test('is a tab of the settings page with its list, and accessible', async ({ page }) => {
    await adminModeOnViaApi(page);
    await page.goto('/service-settings?tab=captcha');
    await expect(page.getByRole('heading', { level: 1, name: 'الإعدادات' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'الحماية من الروبوتات' })).toBeVisible();
    await expect(page.getByText('Cloudflare Turnstile').first()).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
  });

  test('is a step of the administration tour for who may see the page', async ({ page }) => {
    await adminModeOnViaApi(page);
    const steps = (await (await page.request.get('/api/me/tour/admin')).json()).steps as { key: string }[];
    expect(steps.map((s) => s.key)).toContain('captcha-settings');
  });

  test('the sign-in page asks for no check while no provider is switched on', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/login');
    await expect(page.getByLabel('بريد العمل')).toBeVisible();
    await expect(page.getByTestId('turnstile')).toHaveCount(0);
    await context.close();
  });
});

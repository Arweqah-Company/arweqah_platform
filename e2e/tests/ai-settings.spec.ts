import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });
test.afterEach(async ({ page }) => adminModeOffViaApi(page));

const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));

test.describe('AI service settings (FR-126)', () => {
  // One test: every switch of admin mode waits for a fresh authenticator code, so the checks share one.
  test('is a tab of the settings page with its two services and their guide, accessible, a step of the tour, and nothing is switched on yet', async ({ page }) => {
    await adminModeOnViaApi(page);
    await page.goto('/service-settings?tab=ai');
    await expect(page.getByRole('heading', { level: 1, name: 'الإعدادات' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'الذكاء الاصطناعي' })).toBeVisible();
    // A table on a desktop and cards on a phone: look for the names and the guide button, not for a row.
    await expect(page.getByText(/أنثروبيك/).first()).toBeVisible();
    await expect(page.getByText(/متوافقة مع OpenAI/).first()).toBeVisible();
    await page.getByRole('button', { name: 'كيف أحصل على البيانات' }).first().click();
    await expect(page.getByRole('dialog').getByText(/console\.anthropic\.com/)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();

    const steps = (await (await page.request.get('/api/me/tour/admin')).json()).steps as { key: string }[];
    expect(steps.map((s) => s.key)).toContain('ai-settings');

    const catalog = (await (await page.request.get('/api/integrations/ai')).json()) as { providers: { providerKey: string; isActive: boolean }[] };
    expect(catalog.providers.map((p) => p.providerKey)).toEqual(['anthropic', 'compatible']);
    expect(catalog.providers.some((p) => p.isActive)).toBe(false);
  });
});

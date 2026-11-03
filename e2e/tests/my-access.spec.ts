import { expect, test } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });
test.afterEach(async ({ page }) => adminModeOffViaApi(page));

test.describe('My access page (FR-88)', () => {
  test('opens from the account menu, shows roles and permissions, hides the administrative ones until admin mode is on, and is accessible', async ({ page }) => {
    test.setTimeout(120_000); // admin mode needs a fresh code, which may mean waiting for the next 30-second step
    await adminModeOffViaApi(page);
    let reads = 0;
    page.on('request', (r) => { if (r.url().endsWith('/api/me/access')) reads += 1; });
    await page.goto('/');
    await page.getByRole('button', { name: 'حسابي' }).click();
    await page.getByRole('menuitem', { name: 'صلاحياتي' }).click();
    await expect(page).toHaveURL(/\/my-access$/);
    await expect(page.getByRole('heading', { level: 1, name: 'صلاحياتي' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'البحث في صلاحياتي' })).toBeVisible();
    await expect(page.getByText(/مخفية إلى أن تفعّل وضع مدير المنصة/)).toBeVisible();
    expect(reads).toBe(1); // read once after sign-in, not again by opening the page
    await new Screen(page).expectNoSeriousA11yIssues();

    await adminModeOnViaApi(page);
    await page.reload();
    await expect(page.getByText(/مخفية إلى أن تفعّل وضع مدير المنصة/)).toHaveCount(0);
  });

  test('is a step of the general tour', async ({ page }) => {
    const steps = (await (await page.request.get('/api/me/tour/general')).json()).steps as { key: string }[];
    expect(steps.map((s) => s.key)).toContain('my-access');
  });
});

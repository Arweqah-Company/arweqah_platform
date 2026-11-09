import { expect, test } from '@playwright/test';
import { ListPage } from '../pages/list.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

test.use({ storageState: ADMIN_STATE });
test.describe.configure({ timeout: 120_000 });

test.describe('Certificate review and my career team (FR-114, FR-115)', () => {
  test('the certificate review page opens for the administrator with its list, filters and export, and is accessible', async ({ page }) => {
    await adminModeOnViaApi(page);
    await page.goto('/career-certificates');
    await expect(page.getByRole('heading', { level: 1, name: 'مراجعة الشهادات' })).toBeVisible();
    await expect(page.getByPlaceholder('ابحث بالموظف أو الوحدة')).toBeVisible();
    await expect(page.getByRole('button', { name: /تصدير/ })).toBeVisible();
    await new ListPage(page).expectNoSeriousA11yIssues();
  });

  test('my career team opens with its list and is accessible', async ({ page }) => {
    await adminModeOnViaApi(page);
    await page.goto('/career-team');
    await expect(page.getByRole('heading', { level: 1, name: 'فريقي المهني' })).toBeVisible();
    await expect(page.getByPlaceholder('ابحث بالاسم')).toBeVisible();
    await new ListPage(page).expectNoSeriousA11yIssues();
  });

  test('an employee (admin mode off) is not offered the review page and sees the no-permission page', async ({ page }) => {
    await adminModeOffViaApi(page);
    await page.goto('/career-certificates');
    await expect(page.getByRole('heading', { level: 1, name: 'ليس لديك صلاحية للدخول إلى هذه الصفحة' })).toBeVisible();
  });
});

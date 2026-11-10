import { expect, test } from '@playwright/test';
import { ListPage } from '../pages/list.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

test.use({ storageState: ADMIN_STATE });
test.describe.configure({ timeout: 120_000 });

test.describe('Certificate review, my career team and development requests (FR-114, FR-115, FR-116)', () => {
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
    await page.goto('/employees?tab=team');
    await expect(page.getByRole('tab', { name: 'فريقي المهني', selected: true })).toBeVisible();
    await expect(page.getByPlaceholder('ابحث بالاسم')).toBeVisible();
    await new ListPage(page).expectNoSeriousA11yIssues();
  });

  test('an employee (admin mode off) is not offered the review page and sees the no-permission page', async ({ page }) => {
    await adminModeOffViaApi(page);
    await page.goto('/career-certificates');
    await expect(page.getByRole('heading', { level: 1, name: 'ليس لديك صلاحية للدخول إلى هذه الصفحة' })).toBeVisible();
  });

  test('the development requests page opens with «waiting for me», «all», its search and export, and is accessible', async ({ page }) => {
    await adminModeOnViaApi(page);
    await page.goto('/career-requests');
    await expect(page.getByRole('heading', { level: 1, name: 'طلبات التطوير' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'بانتظار قراري' })).toBeVisible();
    await page.getByRole('tab', { name: 'كل الطلبات' }).click();
    await expect(page.getByPlaceholder('ابحث بالموظف أو الكورس')).toBeVisible();
    await expect(page.getByRole('button', { name: /تصدير/ })).toBeVisible();
    await new ListPage(page).expectNoSeriousA11yIssues();
  });

  test('an employee (admin mode off) is not offered the development requests page', async ({ page }) => {
    await adminModeOffViaApi(page);
    await page.goto('/career-requests');
    await expect(page.getByRole('heading', { level: 1, name: 'ليس لديك صلاحية للدخول إلى هذه الصفحة' })).toBeVisible();
  });
});

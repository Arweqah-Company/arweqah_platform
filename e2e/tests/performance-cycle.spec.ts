import { expect, test } from '@playwright/test';
import { ListPage } from '../pages/list.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

test.use({ storageState: ADMIN_STATE });
test.describe.configure({ timeout: 120_000 });

test.describe('The evaluation cycle page (FR-118)', () => {
  test('opens for the administrator with the stepper, the readiness list, the dates and the catalog, and is accessible', async ({ page }) => {
    await adminModeOnViaApi(page);
    await page.goto('/performance-cycle');
    await expect(page.getByRole('heading', { level: 1, name: 'دورة التقييم' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'مراحل دورة التقييم' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'جاهزية فتح الدورة' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'رفع ملف التقييم' })).toBeVisible();
    await expect(page.getByPlaceholder('ابحث في البنود')).toBeVisible();
    await new ListPage(page).expectNoSeriousA11yIssues();
  });

  test('a stage of the stepper opens to say who works in it', async ({ page }) => {
    await adminModeOnViaApi(page);
    await page.goto('/performance-cycle');
    await page.getByRole('button', { name: /التقييم الذاتي/ }).click();
    await expect(page.getByRole('dialog').getByText('الموظف', { exact: true })).toBeVisible();
  });

  test('an employee (admin mode off) is not offered the page and sees the no-permission page', async ({ page }) => {
    await adminModeOffViaApi(page);
    await page.goto('/performance-cycle');
    await expect(page.getByRole('heading', { level: 1, name: 'ليس لديك صلاحية للدخول إلى هذه الصفحة' })).toBeVisible();
  });
});

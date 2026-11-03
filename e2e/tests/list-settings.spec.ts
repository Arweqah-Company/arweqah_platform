import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { ListPage } from '../pages/list.page';
import { adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';
import { choose } from '../support/select';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });
test.beforeEach(async ({ page }) => adminModeOnViaApi(page));

const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));

test.describe('List management (FR-44) and roles (FR-43)', () => {
  test('an administrator hides a column and a filter of a list, and the list follows; then restores them', async ({ page }) => {
    test.setTimeout(120_000); // may wait for the next 30-second code
    await adminModeOnViaApi(page);
    await page.goto('/list-settings');
    await expect(page.getByRole('heading', { level: 1, name: 'إدارة القوائم' })).toBeVisible();
    await choose(page.locator('#main [role=combobox]').first(), 'الشركات');
    await expect(page.getByRole('checkbox', { name: 'الرمز' })).toBeDisabled();
    await page.getByRole('checkbox', { name: 'الموظفون', exact: true }).uncheck();
    await page.getByRole('checkbox', { name: 'له موظفون' }).uncheck();
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    await expect(page.getByText('حُفظت إعدادات القائمة.')).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();

    await page.goto('/companies');
    await new ListPage(page).switchView('جدول'); // phones show cards by default
    await expect(page.getByRole('columnheader', { name: 'الرمز' }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'الموظفون' })).toHaveCount(0);
    await page.getByRole('button', { name: /تصفية/ }).click();
    await expect(page.getByLabel('الحالة', { exact: true })).toBeVisible();
    await expect(page.getByLabel('له موظفون')).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.goto('/list-settings');
    await choose(page.locator('#main [role=combobox]').first(), 'الشركات');
    await page.getByRole('checkbox', { name: 'الموظفون', exact: true }).check();
    await page.getByRole('checkbox', { name: 'له موظفون' }).check();
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    await expect(page.getByText('حُفظت إعدادات القائمة.')).toBeVisible();
  });

  test('the roles list shows how each role is assigned and the roles of the owner list exist', async ({ page }) => {
    test.setTimeout(120_000);
    await adminModeOnViaApi(page);
    await page.goto('/roles');
    await new ListPage(page).switchView('جدول');
    await expect(page.getByRole('heading', { level: 1, name: 'الأدوار والصلاحيات' })).toBeVisible();
    await expect(page.getByText('مدير مباشر').first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'الإسناد' }).first()).toBeVisible();
    await new Screen(page).expectNoSeriousA11yIssues();
  });
});

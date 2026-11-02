import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';
import { choose } from '../support/select';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });
test.afterEach(async ({ page }) => adminModeOffViaApi(page));

const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));

test.describe('Page visibility (FR-42)', () => {
  test('an administrator hides a page from a role and shows it again; a role that manages pages is locked', async ({ page }) => {
    test.setTimeout(120_000); // may wait for the next 30-second code
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'ظهور الصفحات' })).toHaveCount(0);
    await adminModeOnViaApi(page);
    await page.goto('/page-visibility');
    await expect(page.getByRole('heading', { level: 1, name: 'ظهور الصفحات' })).toBeVisible();
    await choose(page.getByLabel('الدور', { exact: true }), /^موظف$/);
    const companies = page.getByRole('checkbox', { name: 'الشركات' });
    await expect(companies).toBeChecked();
    await companies.uncheck();
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    await expect(page.getByText('حُفظ ظهور الصفحات.')).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await page.reload();
    await choose(page.getByLabel('الدور', { exact: true }), /^موظف$/);
    await expect(page.getByRole('checkbox', { name: 'الشركات' })).not.toBeChecked();
    await page.getByRole('checkbox', { name: 'الشركات' }).check();
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    await expect(page.getByText('حُفظ ظهور الصفحات.')).toBeVisible();

    await choose(page.getByLabel('الدور', { exact: true }), 'مدير النظام');
    await expect(page.getByText('هذا الدور يدير ظهور الصفحات')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'الشركات' })).toBeDisabled();
  });
});

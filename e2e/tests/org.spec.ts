import { expect, test } from '@playwright/test';
import { ListPage } from '../pages/list.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';
import { choose } from '../support/select';

test.use({ storageState: ADMIN_STATE });
test.beforeEach(async ({ page }) => adminModeOnViaApi(page));

test.describe('Organization: chart or table, per company (FR-31)', () => {
  test('shows the company as a chart of its units, opens everything, and finds a unit', async ({ page }) => {
    const list = new ListPage(page);
    await page.goto('/org');
    await list.switchView('مخطط');
    const chart = page.getByRole('group', { name: /مخطط الهيكل التنظيمي لـ/ });
    await expect(chart).toBeVisible();
    await page.getByRole('button', { name: 'فتح الكل' }).click();
    await expect(chart.getByText('وحدة المشتريات').first()).toBeVisible();
    await page.getByRole('button', { name: 'طي الكل' }).click();
    await expect(chart.getByText('وحدة المشتريات')).toBeHidden();
    await page.getByLabel('بحث في المخطط').fill('المشتريات');
    await expect(chart.getByText('وحدة المشتريات').first()).toBeVisible();
    await list.expectNoSeriousA11yIssues();
  });

  test('switches to a table of the same units, with search and the unit details beside it', async ({ page }) => {
    const list = new ListPage(page);
    await page.goto('/org');
    await list.switchView('جدول');
    await expect(page.getByText(/الوحدات \(\d+\)/)).toBeVisible();
    await page.getByLabel('بحث في الوحدات').fill('الخدمات المشتركة');
    // The search also matches the path, so the department and everything below it is listed.
    await expect(page.getByText('الوحدات (15)')).toBeVisible();
    await page.getByRole('button', { name: /إدارة الخدمات المشتركة/ }).first().click();
    await expect(page.getByRole('complementary', { name: 'إدارة الخدمات المشتركة' })).toBeVisible();
    await list.expectNoSeriousA11yIssues();
  });

  test('the structure buttons show only while platform admin mode is on (FR-24)', async ({ page }) => {
    test.setTimeout(90_000);
    await adminModeOffViaApi(page);
    await page.goto('/org');
    await expect(page.getByRole('heading', { level: 1, name: 'الهيكل التنظيمي' })).toBeVisible();
    for (const name of ['إضافة وحدة', 'إضافة مسمى وظيفي', 'تقسيمات الهيكل']) await expect(page.getByRole('button', { name })).toHaveCount(0);
    await adminModeOnViaApi(page);
    await page.reload();
    for (const name of ['إضافة وحدة', 'إضافة مسمى وظيفي', 'تقسيمات الهيكل']) await expect(page.getByRole('button', { name })).toBeVisible();
  });

  test('picks a level and a parent unit from the drop-downs inside the add-unit dialog', async ({ page }) => {
    test.setTimeout(90_000); // turning admin mode on needs a code the previous test has not used, which may mean waiting for the next 30-second step
    await adminModeOnViaApi(page);
    await page.goto('/org');
    await page.getByRole('button', { name: 'إضافة وحدة' }).click();
    const dialog = page.getByRole('dialog', { name: 'إضافة وحدة' });
    const level = dialog.getByLabel('التقسيم *', { exact: true });
    await level.click();
    await page.getByRole('option').nth(1).click();
    await expect(dialog).toBeVisible();
    const parent = dialog.getByRole('combobox', { name: 'الوحدة الأب' });
    await parent.click();
    const first = page.getByRole('option').first();
    const name = (await first.innerText()).split('\n')[0] ?? '';
    await first.click();
    await expect(dialog).toBeVisible();
    await expect(parent).toContainText(name);
  });

  test('another company shows its own structure (empty until it is filled)', async ({ page }) => {
    await page.goto('/org');
    await choose(page.getByLabel('الشركة'), 'لدن');
    await expect(page.getByText('لا توجد وحدات في هذه الشركة بعد')).toBeVisible();
  });
});

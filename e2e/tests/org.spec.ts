import { expect, test } from '@playwright/test';
import { ListPage } from '../pages/list.page';
import { ADMIN_STATE } from '../support/fixtures';

test.use({ storageState: ADMIN_STATE });

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

  test('another company shows its own structure (empty until it is filled)', async ({ page }) => {
    await page.goto('/org');
    await page.getByLabel('الشركة').selectOption({ label: 'لدن' });
    await expect(page.getByText('لا توجد وحدات في هذه الشركة بعد')).toBeVisible();
  });
});

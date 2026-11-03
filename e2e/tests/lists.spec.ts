import { expect, test } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
import { ListPage } from '../pages/list.page';
import { adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';
import { choose } from '../support/select';

test.use({ storageState: ADMIN_STATE });
test.beforeEach(async ({ page }) => adminModeOnViaApi(page));

test.describe('Lists: search, filters, table or cards, export and import (FR-27, FR-28, FR-29)', () => {
  test('search narrows the list and filters show as chips that can be removed', async ({ page }) => {
    const list = new ListPage(page);
    await page.goto('/employees');
    await expect(page.getByText('SYS-0001').first()).toBeVisible();
    await list.search('بحث في الموظفين').fill('لا-يوجد-أبدًا');
    await expect(page.getByText('SYS-0001')).toBeHidden();
    await list.search('بحث في الموظفين').fill('');
    await list.openFilters();
    await choose(page.getByLabel('الحالة', { exact: true }), 'معطّل');
    const chips = page.getByRole('list', { name: 'عوامل التصفية المطبّقة' });
    await expect(chips).toContainText('الحالة: معطّل');
    await expect(page.getByText('SYS-0001')).toBeHidden();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'إزالة التصفية: الحالة' }).click();
    await expect(page.getByText('SYS-0001').first()).toBeVisible();
  });

  test('the table / cards choice is remembered for the list', async ({ page }) => {
    test.setTimeout(120_000); // may wait for the next 30-second code
    await adminModeOnViaApi(page);
    const list = new ListPage(page);
    await page.goto('/companies');
    await list.switchView('بطاقات');
    await expect(page.getByRole('table')).toBeHidden();
    await page.reload();
    await expect(page.getByRole('button', { name: 'بطاقات', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await list.switchView('جدول');
  });

  test('exports the chosen columns of all results as CSV', async ({ page }) => {
    test.setTimeout(120_000); // may wait for the next 30-second code
    await adminModeOnViaApi(page);
    const list = new ListPage(page);
    await page.goto('/companies');
    await page.getByRole('button', { name: 'تصدير' }).click();
    const dialog = page.getByRole('dialog', { name: 'تصدير البيانات' });
    await list.expectNoSeriousA11yIssues();
    await dialog.getByLabel(/كل النتائج/).check();
    await dialog.getByLabel('الموظفون').uncheck();
    await dialog.getByLabel('ملف CSV (.csv)').check();
    const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'تصدير' }).click()]);
    expect(download.suggestedFilename()).toMatch(/^companies-\d{4}-\d{2}-\d{2}\.csv$/);
    const text = readFileSync((await download.path()) as string, 'utf8');
    expect(text).toContain('الرمز');
    expect(text).toContain('ARW');
    expect(text).not.toContain('الموظفون');
  });

  test('downloads the employees import template with the system lists', async ({ page }) => {
    const list = new ListPage(page);
    await page.goto('/employees');
    await page.getByRole('button', { name: 'استيراد' }).click();
    await list.expectNoSeriousA11yIssues();
    const download = await list.downloadFrom('تنزيل القالب');
    expect(download.suggestedFilename()).toBe('employees-template.xlsx');
    expect(statSync((await download.path()) as string).size).toBeGreaterThan(5000);
  });

  test('imports companies from a file: checks the rows, imports the valid ones, shows the result', async ({ page }) => {
    test.setTimeout(120_000); // may wait for the next 30-second code
    await adminModeOnViaApi(page);
    await page.goto('/companies');
    await page.getByRole('button', { name: 'استيراد' }).click();
    // Both browser projects share one database, so each run imports its own company code.
    const code = `IMP${Date.now().toString(36).toUpperCase()}`;
    const csv = `\uFEFFالرمز *,الاسم بالعربي *,الاسم بالإنجليزي *,الحالة\r\n${code},شركة مستوردة,Imported Company,نعم\r\nbad code!,شركة,Broken,\r\n`;
    await page.locator('input[type=file]').setInputFiles({ name: 'companies.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await expect(page.getByText(/1 صف سليم، 1 صف فيه أخطاء من أصل 2/)).toBeVisible();
    await page.getByRole('button', { name: 'استيراد 1 صف' }).click();
    await expect(page.getByText('تم استيراد 1 صف، وفشل 0.')).toBeVisible();
    await page.getByRole('button', { name: 'تم' }).click();
    await expect(page.getByText(code).first()).toBeVisible();
  });
});

import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';
import { choose } from '../support/select';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });

const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
const TITLE = 'تجهيز عرض المشروع';

/** The browser session is shared by every spec: leave admin mode off whatever a test did. */
test.afterEach(async ({ page }) => {
  await adminModeOffViaApi(page);
});

test.describe('Tasks (FR-48, FR-49, FR-50, FR-51)', () => {
  test('creates a task, works it, logs time, moves it on the board and finishes it', async ({ page }) => {
    const title = `${TITLE} (${test.info().project.name})`;
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { level: 1, name: 'مهامي' })).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();

    await page.getByRole('button', { name: 'مهمة جديدة' }).click();
    const popup = page.getByRole('dialog', { name: 'مهمة جديدة' });
    await expect(popup.getByLabel('الأولوية')).toHaveText('متوسطة');
    await expect(popup.getByRole('button', { name: 'إنشاء المهمة' })).toBeDisabled();
    await popup.getByLabel('العنوان *').fill(title);
    await popup.getByLabel('الوقت المتوقع (ساعات)').fill('2');
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await popup.getByRole('button', { name: 'إنشاء المهمة' }).click();
    await expect(popup).toHaveCount(0);
    await expect(page).toHaveURL(/\/tasks$/);
    await page.getByRole('link', { name: title }).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
    await expect(page.getByText('للتنفيذ').first()).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await page.getByRole('button', { name: 'تسجيل وقت' }).click();
    const dialog = page.getByRole('dialog', { name: 'تسجيل وقت' });
    await dialog.getByLabel('الدقائق *').fill('45');
    await dialog.getByRole('button', { name: 'تسجيل', exact: true }).click();
    await expect(page.getByText('0:45 / 2:00')).toBeVisible();
    await choose(page.getByLabel('نقل إلى'), 'قيد التنفيذ');
    await expect(page.getByText('قيد التنفيذ').first()).toBeVisible();

    await page.goto('/tasks');
    await expect(page.getByRole('link', { name: title })).toBeVisible();
    await page.getByRole('button', { name: 'لوحة كانبان' }).click();
    const progress = page.getByRole('region', { name: 'قيد التنفيذ' });
    await expect(progress.getByRole('link', { name: title })).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await choose(progress.getByLabel(`انقل المهمة ${title} إلى`), 'مكتملة');
    await expect(page.getByRole('region', { name: 'مكتملة' }).getByRole('link', { name: title })).toBeVisible();
    await expect(page.getByRole('region', { name: 'قيد التنفيذ' }).getByRole('link', { name: title })).toHaveCount(0);
  });

  test('sorts the table by a header and groups it', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { level: 1, name: 'مهامي' })).toBeVisible();
    await choose(page.getByLabel('تجميع حسب'), 'الحالة');
    const phone = (await page.getByRole('button', { name: 'القائمة', exact: true }).isVisible());
    if (!phone) {
      const header = page.getByRole('columnheader', { name: 'العنوان' });
      await header.getByRole('button').click();
      await expect(header).toHaveAttribute('aria-sort', 'ascending');
    }
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
  });

  test('shows my team as a tab of my tasks to a person who holds its key', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { level: 1, name: 'مهامي' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'فريقي' })).toHaveCount(0);
    await page.getByRole('tab', { name: 'فريقي' }).click();
    await expect(page.getByLabel('عرض', { exact: true }).first()).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
  });
});

test.describe('Task tags and policies (FR-54)', () => {
  test('adds a tag to a department, then deletes it', async ({ page }) => {
    await page.goto('/tasks/tags');
    await expect(page.getByRole('heading', { level: 1, name: 'فئات المهام' })).toBeVisible();
    await page.getByRole('button', { name: 'إضافة فئة' }).click();
    const dialog = page.getByRole('dialog', { name: 'إضافة فئة' });
    const department = dialog.getByLabel('الإدارة *');
    await choose(department, /الخدمات المشتركة/);
    await dialog.getByLabel('الاسم بالعربية *').fill('تقارير الأداء');
    await dialog.getByLabel('الاسم بالإنجليزية *').fill('Performance reports');
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('حُفظت الفئة.')).toBeVisible();
    await expect(page.getByText('تقارير الأداء').first()).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await page.getByRole('button', { name: 'حذف' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'حذف' }).click();
    await expect(page.getByText('حُذفت الفئة.')).toBeVisible();
  });

  test('edits the policies in platform admin mode, with limits shown, and puts them back', async ({ page }) => {
    test.setTimeout(120_000); // may wait for the next 30-second code
    await adminModeOnViaApi(page);
    await page.goto('/tasks/policies');
    await expect(page.getByRole('heading', { level: 1, name: 'سياسات المهام' })).toBeVisible();
    const stale = page.getByLabel('راكدة بعد عدم الحركة لمدة (أيام)');
    await expect(stale).toHaveValue('30');
    await stale.fill('3');
    await expect(page.getByText('استعمل عددًا صحيحًا من 7 إلى 180.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'حفظ', exact: true }).first()).toBeDisabled();
    await stale.fill('45');
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await page.getByRole('button', { name: 'حفظ', exact: true }).first().click();
    await expect(page.getByText('حُفظت السياسات.')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('راكدة بعد عدم الحركة لمدة (أيام)')).toHaveValue('45');
    await page.getByLabel('راكدة بعد عدم الحركة لمدة (أيام)').fill('30');
    await page.getByRole('button', { name: 'حفظ', exact: true }).first().click();
    await expect(page.getByText('حُفظت السياسات.')).toBeVisible();
  });

  test('keeps the policies page out of reach without platform admin mode', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { level: 1, name: 'مهامي' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'سياسات المهام' })).toHaveCount(0);
  });
});

test.describe('Home page (FR-57)', () => {
  test('shows my numbers, my current tasks and my tickets', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'أرقامي' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'مهامي الحالية' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'تذاكري' })).toBeVisible();
    await expect(page.getByText('مهامي المفتوحة')).toBeVisible();
    const matrix = page.getByRole('region', { name: 'مصفوفة المهام' });
    await expect(matrix).toBeVisible();
    await expect(matrix.getByRole('region', { name: /مهمة وعاجلة/ })).toBeVisible();
    await expect(matrix.getByRole('region', { name: /لا هذه ولا تلك/ })).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
  });
});

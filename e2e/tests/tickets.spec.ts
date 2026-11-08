import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { ADMIN_STATE, adminTotpUri } from '../support/fixtures';
import { adminModeOnViaApi } from '../support/admin-mode';
import { freshCode } from '../support/totp';
import { choose } from '../support/select';

class Screen extends BasePage {}

/** Clicks a dialog button and waits for the server's answer to the write it sends: the screen changes only after it, which can take longer than the default wait on a busy machine. */
async function confirmInDialog(page: Page, name: string): Promise<void> {
  const answered = page.waitForResponse((r) => ['POST', 'PUT', 'PATCH'].includes(r.request().method()) && r.url().includes('/api/tickets/'), { timeout: 20_000 });
  await page.getByRole('dialog').getByRole('button', { name }).click();
  await answered;
}
test.use({ storageState: ADMIN_STATE });

const TURN_ON = 'تفعيل وضع مدير المنصة';
const TURN_OFF = 'إيقاف وضع مدير المنصة';
const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));

async function adminModeOn(page: Page): Promise<void> {
  await page.getByRole('button', { name: TURN_ON }).click();
  const code = await freshCode(adminTotpUri);
  for (const [index, digit] of [...code].entries()) await page.getByLabel(`رمز تطبيق المصادقة ${index + 1}`).fill(digit);
  await expect(page.getByRole('button', { name: TURN_OFF })).toBeVisible();
}

/** The browser session is shared by every spec: leave admin mode off whatever a test did. */
test.afterEach(async ({ page }) => {
  await page.request.post('/api/admin-mode/deactivate', { headers: { origin: 'http://localhost:4173' } });
});

test.describe('Tickets (FR-36 … FR-41)', () => {
  test('sends a ticket in two steps, answers it, closes it, confirms, and reopens it', async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.getByRole('heading', { level: 1, name: 'التذاكر' })).toBeVisible();
    await page.getByRole('button', { name: 'تذكرة جديدة' }).click();
    const dialog = page.getByRole('dialog', { name: 'تذكرة جديدة' });
    await expect(dialog.getByText('الشكاوى والأمور الشخصية تُرفع إلى الموارد البشرية مباشرة.')).toBeVisible();
    await dialog.getByLabel('ماذا تحتاج؟').fill('تقنية');
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await dialog.getByRole('button', { name: /مشكلة تقنية/ }).click();
    // Step 2: "Change" goes back without losing what was typed.
    await dialog.getByLabel('العنوان *').fill('الطابعة لا تعمل');
    await dialog.getByRole('button', { name: 'تغيير' }).click();
    await dialog.getByRole('button', { name: /مشكلة في المنصة/ }).click();
    await expect(dialog.getByLabel('العنوان *')).toHaveValue('الطابعة لا تعمل');
    await dialog.getByRole('switch', { name: /عاجلة/ }).click();
    await expect(dialog.getByRole('switch', { name: /عاجلة/ })).toHaveAttribute('aria-checked', 'true');
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await dialog.getByLabel('العنوان *').press('Control+Enter');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('الطابعة لا تعمل');
    await expect(page.getByText('عاجلة').first()).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await page.getByLabel('ردّك').fill('جاري العمل عليها');
    await page.getByRole('button', { name: 'إرسال الردّ' }).click();
    await expect(page.getByText('جاري العمل عليها')).toBeVisible();

    await page.getByRole('button', { name: 'طلب الإغلاق' }).click();
    await confirmInDialog(page, 'طلب الإغلاق');
    await expect(page.getByText('بانتظار تأكيد الإغلاق').first()).toBeVisible();
    await page.getByRole('button', { name: 'تأكيد التنفيذ' }).click();
    await confirmInDialog(page, 'تأكيد وإغلاق');
    await expect(page.getByText('مغلقة').first()).toBeVisible();
    await expect(page.getByText(/يمكنك إعادة الفتح خلال/)).toBeVisible();
    await page.getByRole('button', { name: 'إعادة فتح' }).click();
    await confirmInDialog(page, 'إعادة الفتح');
    await expect(page.getByText('مفتوحة').first()).toBeVisible();

    await page.goto('/tickets');
    await expect(page.getByRole('link', { name: 'الطابعة لا تعمل' }).first()).toBeVisible();
    await page.getByLabel('بحث في التذاكر').fill('الطابعة');
    await expect(page.getByRole('link', { name: 'الطابعة لا تعمل' }).first()).toBeVisible();
    await choose(page.getByLabel('تجميع حسب'), 'الحالة');
    await expect(page.getByText('مفتوحة', { exact: true }).first()).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
  });

  test('sets up a department in platform admin mode, and reads its figures', async ({ page }) => {
    test.setTimeout(120_000); // may wait for the next 30-second code
    await page.goto('/tickets');
    await expect(page.getByRole('heading', { level: 1, name: 'التذاكر' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'إعداد التذاكر' })).toHaveCount(0);
    await adminModeOn(page);
    await page.goto('/tickets/setup');
    await expect(page.getByRole('heading', { level: 1, name: 'إعداد التذاكر' })).toBeVisible();
    await page.getByRole('combobox', { name: 'الجهة', exact: true }).click();
    await page.getByRole('textbox', { name: 'الجهة', exact: true }).fill('الخدمات المشتركة');
    await page.getByRole('button', { name: /الخدمات المشتركة/ }).first().click();
    await choose(page.getByLabel('حالة الاستقبال'), 'متوقف مؤقتًا');
    await page.getByRole('button', { name: 'حفظ', exact: true }).first().click();
    await expect(page.getByText('حُفظت الإعدادات.')).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await page.getByLabel('مدة الإنجاز المعتادة').fill('0');
    await expect(page.getByText('عدد صحيح من 1 إلى 60.')).toBeVisible();
    await page.getByLabel('مدة الإنجاز المعتادة').fill('3');
    await choose(page.getByLabel('حالة الاستقبال'), 'مفعّل');
    await page.getByRole('button', { name: 'حفظ', exact: true }).first().click();
    await expect(page.getByText('حُفظت الإعدادات.')).toBeVisible();

    await page.getByRole('button', { name: 'إضافة نوع' }).click();
    const dialog = page.getByRole('dialog', { name: 'إضافة نوع' });
    await dialog.getByLabel('الاسم بالعربي *').fill('طلب برنامج');
    await dialog.getByLabel('الاسم بالإنجليزي *').fill('Software request');
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('حُفظ النوع.')).toBeVisible();
    await expect(page.getByText('طلب برنامج').first()).toBeVisible();

    await page.goto('/tickets/figures');
    await expect(page.getByRole('heading', { level: 1, name: 'أداء التذاكر' })).toBeVisible();
    await expect(page.getByText('مفتوحة الآن').first()).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await page.getByRole('button', { name: TURN_OFF }).click();
    await expect(page.getByRole('button', { name: TURN_ON })).toBeVisible();
  });

  test('the figures add up every department, with a department column, and show one department alone without it', async ({ page }) => {
    test.setTimeout(120_000); // may wait for the next 30-second code
    await adminModeOnViaApi(page);
    await page.goto('/tickets/figures');
    await expect(page.getByRole('heading', { level: 1, name: 'أداء التذاكر' })).toBeVisible();
    const byType = page.getByRole('table', { name: 'حسب نوع التذكرة' });
    await expect(byType).toBeVisible();
    await expect(byType.getByRole('columnheader', { name: 'الجهة' })).toBeVisible(); // every department: say which one
    await expect(page.getByText('مفتوحة الآن').first()).toBeVisible();
    await new Screen(page).expectNoSeriousA11yIssues();

    await choose(page.getByLabel('الجهة', { exact: true }), 'إدارة الخدمات المشتركة');
    await expect(byType.getByRole('columnheader', { name: 'النوع' })).toBeVisible();
    await expect(byType.getByRole('columnheader', { name: 'الجهة' })).toHaveCount(0); // one department: no column
    await expect(page.getByText('مفتوحة الآن').first()).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
  });
});

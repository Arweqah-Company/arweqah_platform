import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { ListPage } from '../pages/list.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });
test.afterEach(async ({ page }) => adminModeOffViaApi(page));

const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));

test.describe('E-mail and notification templates (FR-64, FR-65)', () => {
  test('an administrator rewords the activation e-mail with a variable, sees it customised, and goes back to the default', async ({ page }) => {
    test.setTimeout(120_000);
    await adminModeOnViaApi(page);
    await page.goto('/service-settings?tab=email-templates');
    await expect(page.getByRole('heading', { level: 1, name: 'الإعدادات' })).toBeVisible();
    await new ListPage(page).switchView('جدول');
    const row = page.getByRole('row', { name: /دعوة تفعيل الحساب/ });
    await expect(row.getByText('الصياغة الأصلية')).toBeVisible();
    await row.click();
    const dialog = page.getByRole('dialog', { name: 'دعوة تفعيل الحساب' });
    const subject = dialog.getByRole('textbox', { name: 'العنوان (موضوع الرسالة)' });
    await subject.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' @');
    await page.getByRole('option', { name: '@اسم المستلم' }).click();
    await expect(dialog.getByTitle('معاينة الرسالة')).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues(['iframe']);
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('تم الحفظ. الصياغة الجديدة قيد الاستخدام.').first()).toBeVisible();
    await expect(page.getByRole('row', { name: /دعوة تفعيل الحساب/ }).getByText('معدَّلة')).toBeVisible();

    await page.getByRole('row', { name: /دعوة تفعيل الحساب/ }).getByRole('button', { name: 'العودة للأصل' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'العودة للأصل' }).click();
    await expect(page.getByRole('row', { name: /دعوة تفعيل الحساب/ }).getByText('الصياغة الأصلية')).toBeVisible();
  });

  test('a notification is plain text and offers only the variables its code fills', async ({ page }) => {
    test.setTimeout(120_000);
    await adminModeOnViaApi(page);
    await page.goto('/service-settings?tab=notification-templates');
    await new ListPage(page).switchView('جدول');
    await page.getByRole('row', { name: /مهمة جديدة/ }).first().click();
    const dialog = page.getByRole('dialog', { name: 'مهمة جديدة' });
    await expect(dialog.getByRole('toolbar')).toHaveCount(0);
    await expect(dialog.getByText('@رقم المهمة').first()).toBeVisible();
    await expect(dialog.getByText('@اسم الإدارة المستقبلة')).toHaveCount(0);
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues(['iframe']);
  });
});

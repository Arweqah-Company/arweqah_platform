import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { ListPage } from '../pages/list.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });
test.afterEach(async ({ page }) => adminModeOffViaApi(page));

const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));

test.describe('Translation and e-mail providers (FR-59, FR-60)', () => {
  test('an e-mail service is saved, tried with a failing server, and stays switched off until a test passes', async ({ page }) => {
    test.setTimeout(120_000);
    await adminModeOnViaApi(page);
    await page.goto('/service-settings?tab=email');
    await expect(page.getByRole('heading', { level: 1, name: 'الإعدادات' })).toBeVisible();
    await new ListPage(page).switchView('جدول');
    await page.getByRole('row', { name: /SMTP/ }).click();
    const dialog = page.getByRole('dialog', { name: 'SMTP' });
    await expect(dialog.getByRole('button', { name: 'تفعيل' })).toBeDisabled();
    await dialog.getByLabel('الخادم *').fill('127.0.0.1');
    await dialog.getByLabel('المنفذ *').fill('1');
    await dialog.getByLabel('المرسِل *').fill('بدون عنوان');
    await expect(dialog.getByText('اكتب عنوانًا أو "الاسم <العنوان>".')).toBeVisible();
    await dialog.getByLabel('المرسِل *').fill('Arweqah <no-reply@arweqah.sa>');
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await dialog.getByRole('button', { name: 'حفظ', exact: true }).click();
    await expect(page.getByText('تم الحفظ.').first()).toBeVisible();
    await expect(dialog.getByText(/جرّبها أولًا/)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'تفعيل' })).toBeDisabled();

    await dialog.getByRole('button', { name: 'تجربة' }).click();
    const popup = page.getByRole('dialog', { name: /تجربة SMTP/ });
    await popup.getByLabel('إرسال إلى').fill('someone@example.com');
    await popup.getByRole('button', { name: 'إرسال رسالة تجريبية' }).click();
    await expect(popup.getByText('ردّت الخدمة بمشكلة')).toBeVisible({ timeout: 30_000 });
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await page.keyboard.press('Escape');
    await expect(dialog.getByRole('button', { name: 'تفعيل' })).toBeDisabled();
  });

  test('a translation service asks for its whole key file, and cannot be tried until the data is complete', async ({ page }) => {
    test.setTimeout(120_000);
    await adminModeOnViaApi(page);
    await page.goto('/service-settings?tab=translation');
    await expect(page.getByRole('heading', { level: 1, name: 'الإعدادات' })).toBeVisible();
    await new ListPage(page).switchView('جدول');
    for (const name of [/Amazon Translate/, /Google Cloud Translation/, /Azure AI Translator/]) await expect(page.getByRole('row', { name })).toBeVisible();
    await page.getByRole('row', { name: /Google Cloud Translation/ }).click();
    const dialog = page.getByRole('dialog', { name: /Google Cloud Translation/ });
    await dialog.getByLabel('مفتاح حساب الخدمة (JSON) *').fill('not json');
    await expect(dialog.getByText('الصق ملف مفتاح حساب الخدمة (JSON) كاملًا.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'تجربة' })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'تفعيل' })).toBeDisabled();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
  });
});

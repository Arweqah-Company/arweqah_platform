import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });
test.afterEach(async ({ page }) => adminModeOffViaApi(page));

const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));

test.describe('Permissions page (FR-46, FR-47)', () => {
  test('places permissions on a role, then on a new group of roles and a new group of people, all from one page', async ({ page }, testInfo) => {
    test.setTimeout(150_000); // may wait for the next 30-second code
    // Desktop only: the two projects share one session, and this long journey switches admin mode on and off.
    test.skip(testInfo.project.name !== 'desktop', 'one run is enough; the page itself is covered on a phone by the component tests and axe');
    const roleName = 'مدقق المنصة';
    const suffix = '';
    await adminModeOnViaApi(page);
    await page.goto('/permissions');
    await expect(page.getByRole('heading', { level: 1, name: 'الصلاحيات' })).toBeVisible();

    // a role
    await page.getByLabel('الدور', { exact: true }).selectOption({ label: roleName });
    const audit = page.getByRole('checkbox', { name: 'عرض صفحة سجل التدقيق' });
    await expect(audit).not.toBeChecked();
    await audit.check();
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    await expect(page.getByText('حُفظت الصلاحيات.').first()).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await audit.uncheck();
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    await expect(page.getByText('حُفظت الصلاحيات.').first()).toBeVisible();

    // a new group of roles, with a role inside, and a permission on the group
    await page.getByLabel('أضع الصلاحيات على').selectOption({ label: 'مجموعة أدوار' });
    await page.getByRole('button', { name: 'مجموعة أدوار جديدة' }).click();
    const dialog = page.getByRole('dialog', { name: 'مجموعة أدوار جديدة' });
    await dialog.getByLabel('الاسم بالعربية *').fill(`مجموعة تجريبية${suffix}`);
    await dialog.getByLabel('الاسم بالإنجليزية *').fill(`Demo bundle${suffix}`);
    await dialog.getByRole('checkbox', { name: roleName }).check();
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByLabel('مجموعة الأدوار', { exact: true })).toHaveValue(/.+/);
    await page.getByRole('checkbox', { name: 'عرض صفحة سجل التدقيق' }).check();
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    await expect(page.getByText('حُفظت الصلاحيات.').first()).toBeVisible();
    await page.getByRole('button', { name: 'حذف' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'حذف' }).click();
    await expect(page.getByText('حُذفت المجموعة.').first()).toBeVisible();

    // a new group of people: a member found by search
    await page.getByLabel('أضع الصلاحيات على').selectOption({ label: 'مجموعة مستخدمين' });
    await page.getByRole('button', { name: 'مجموعة مستخدمين جديدة' }).click();
    const people = page.getByRole('dialog', { name: 'مجموعة مستخدمين جديدة' });
    await people.getByLabel('الاسم بالعربية *').fill(`فريق تجريبي${suffix}`);
    await people.getByLabel('الاسم بالإنجليزية *').fill(`Demo team${suffix}`);
    await people.getByLabel('ابحث عن شخص لإضافته').fill('magdy');
    await people.getByRole('list', { name: 'النتائج' }).getByRole('button').first().click();
    await expect(people.getByRole('list', { name: 'الأعضاء' }).getByRole('listitem')).toHaveCount(1);
    await people.getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByLabel('مجموعة المستخدمين', { exact: true })).toHaveValue(/.+/);
    await page.getByRole('button', { name: 'حذف' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'حذف' }).click();
    await expect(page.getByText('حُذفت المجموعة.').first()).toBeVisible();
  });
});

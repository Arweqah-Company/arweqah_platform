import { expect, test } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

class Page extends BasePage {}
test.use({ storageState: ADMIN_STATE });

const limitedMe = {
  id: 'u1', name: 'موظف', email: 'e@arweqah.sa', locale: 'ar', isActive: true, authenticatorEnabled: true, mfaVerified: true, adminMode: { available: false, active: false, expiresAt: null }, roles: [],
  placement: { companyId: null, orgNodeId: null, managerId: null }, permissions: [], hiddenPages: [], createdAt: new Date().toISOString(),
};

test.afterEach(async ({ page }) => adminModeOffViaApi(page));

test.describe('Sidebar menus and the 401, 403, 404 pages (FR-30)', () => {
  test('the sidebar groups links in menus; the menu of the current page is open', async ({ page }) => {
    test.setTimeout(120_000); // may wait for the next 30-second code
    const nav = new Page(page);
    await adminModeOnViaApi(page);
    await page.goto('/');
    await nav.openNav('الموظفون', 'الموارد البشرية');
    await expect(page.getByRole('heading', { level: 1, name: 'الموظفون' })).toBeVisible();
    await nav.openNav('سجل البريد', 'إدارة النظام');
    await expect(page.getByRole('heading', { level: 1, name: 'سجل البريد المرسل' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'مسار التنقل' })).toBeVisible();
  });

  test('the sidebar stays in place while a long page scrolls (desktop)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'on a phone the sidebar is a drawer');
    await page.goto('/employees/new');
    const aside = page.locator('aside');
    await expect(aside).toBeVisible();
    const before = await aside.boundingBox();
    await page.mouse.wheel(0, 900);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
    const after = await aside.boundingBox();
    expect(after?.y).toBe(before?.y);
  });

  test('404: an unknown address shows the not-found page with a way back', async ({ page }) => {
    await page.goto('/nowhere');
    await expect(page.getByRole('heading', { level: 1, name: 'نأسف على إبلاغك بأن هذه الصفحة غير موجودة' })).toBeVisible();
    await new Page(page).expectNoSeriousA11yIssues();
    await page.getByRole('link', { name: 'الرئيسية', exact: true }).last().click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('403: a page the person has no permission for shows the no-permission page', async ({ page }) => {
    await page.route('**/api/me', (route) => route.fulfill({ json: limitedMe }));
    await page.goto('/roles');
    await expect(page.getByRole('heading', { level: 1, name: 'ليس لديك صلاحية للدخول إلى هذه الصفحة' })).toBeVisible();
    await new Page(page).expectNoSeriousA11yIssues();
  });

  test('401: when the session ends while working, the session-ended page offers sign-in', async ({ page }) => {
    test.setTimeout(120_000);
    await adminModeOnViaApi(page);
    await page.route('**/api/companies', (route) => route.fulfill({ status: 401, json: { statusCode: 401, code: 'UNAUTHORIZED', message: 'Unauthorized' } }));
    await page.goto('/companies');
    await expect(page).toHaveURL(/\/401$/);
    await expect(page.getByRole('heading', { level: 1, name: 'انتهت جلستك أو لم تسجّل الدخول' })).toBeVisible();
    await new Page(page).expectNoSeriousA11yIssues();
    await page.getByRole('link', { name: 'تسجيل الدخول' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});

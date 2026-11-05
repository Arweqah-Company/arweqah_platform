import { expect, test } from '@playwright/test';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

// A laptop screen: the lists of the permissions page must show a long name whole, not cut with an ellipsis.
test.use({ storageState: ADMIN_STATE, viewport: { width: 1366, height: 768 } });
test.skip(({ isMobile }) => isMobile, 'a laptop-width check');
test.afterEach(async ({ page }) => adminModeOffViaApi(page));

const LONG_NAME = 'دور تجريبي باسم طويل جدًا لاختبار قطع النص في القائمة المنسدلة على شاشة الحاسوب المحمول';

test.describe('The pick lists of the permissions page on a laptop screen', () => {
  test('show a long role name whole', async ({ page }) => {
    test.setTimeout(120_000);
    await adminModeOnViaApi(page);
    await page.request.post('/api/roles', { data: { nameAr: LONG_NAME, nameEn: 'A role with a very long name used to test a pick list', permissions: [] }, headers: { origin: 'http://localhost:4173' } });
    await page.goto('/permissions');
    await page.getByRole('combobox', { name: 'الدور' }).click();
    const option = page.getByRole('option', { name: LONG_NAME });
    await expect(option).toBeVisible();
    const cut = await option.locator('span').first().evaluate((label) => label.scrollWidth > label.clientWidth);
    expect(cut, 'the name is cut with an ellipsis').toBe(false);
    const box = await option.boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? 0), 'the list stays inside the screen').toBeLessThanOrEqual(1366);
  });
});

import { expect, test } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { ADMIN_STATE } from '../support/fixtures';

class Screen extends BasePage {}

test.describe('User manual inside the app (/docs)', () => {
  test.describe('signed out', () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    test('asks for sign-in: the manual is not public', async ({ page }) => {
      await page.goto('/docs');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('signed in', () => {
    test.use({ storageState: ADMIN_STATE });
    test('opens from the account menu, lists the person\'s sections, shows fields and workflow of a page, and is accessible', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'حسابي' }).click();
      await page.getByRole('menuitem', { name: 'دليل المستخدم' }).click();
      await expect(page).toHaveURL(/\/docs$/);
      await expect(page.getByRole('heading', { level: 1, name: 'دليل المستخدم' })).toBeVisible();
      await page.getByRole('navigation', { name: 'الأقسام' }).getByRole('button', { name: 'التذاكر', exact: true }).click();
      await expect(page.getByRole('heading', { level: 3, name: 'مسار العمل' })).toBeVisible();
      await expect(page.getByRole('heading', { level: 3, name: 'الحقول (مدخلات النموذج)' })).toBeVisible();
      await new Screen(page).expectNoSeriousA11yIssues();
    });

    test('is a step of the general tour', async ({ page }) => {
      const steps = (await (await page.request.get('/api/me/tour/general')).json()).steps as { key: string }[];
      expect(steps.map((s) => s.key)).toContain('docs');
    });
  });
});

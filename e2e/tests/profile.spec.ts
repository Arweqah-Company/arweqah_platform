import { expect, test } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { ADMIN_STATE } from '../support/fixtures';

class Page extends BasePage {}
test.use({ storageState: ADMIN_STATE });

// The theme and language are saved on the account (shared by every test), so each test leaves them as it found them.
test.afterEach(async ({ page }) => {
  await page.request.put('/api/me/profile', { data: { theme: 'system', locale: 'ar' }, headers: { origin: 'http://localhost:4173' } });
});

test.describe('Light and dark theme, and the own profile (FR-33)', () => {
  test('the header toggle switches to the dark theme, which stays after a reload and has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'التبديل إلى الوضع الداكن' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const nav = new Page(page);
    for (const path of ['/', '/employees', '/org', '/profile']) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await nav.expectNoSeriousA11yIssues();
    }
    await page.getByRole('button', { name: 'التبديل إلى الوضع الفاتح' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('the theme saved on the account applies in a browser that never chose one', async ({ page, browser }) => {
    await page.goto('/profile');
    await page.getByRole('radio', { name: 'داكن' }).check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect.poll(async () => (await (await page.request.get('/api/me')).json()).theme).toBe('dark');
    const fresh = await browser.newContext({ storageState: ADMIN_STATE });
    const other = await fresh.newPage();
    await other.goto('/');
    await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark');
    await fresh.close();
  });

  test('a person edits their own contact details, and the job details are read-only', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('heading', { level: 1, name: 'الملف الشخصي' })).toBeVisible();
    await expect(page.getByText('SYS-0001')).toBeVisible();
    await expect(page.getByLabel('الرقم الوظيفي')).toHaveCount(0);
    await page.getByLabel('الجوال الشخصي').fill('0501234567');
    // The message appears while typing, and the save button waits until the details are valid.
    await expect(page.getByText('اكتب الجوال بالصيغة الدولية، مثل +966501234567.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'حفظ التغييرات' })).toBeDisabled();
    await page.getByLabel('الجوال الشخصي').fill('+966501234567');
    await page.getByLabel('البريد الشخصي').fill('sara.personal@example.com');
    await page.getByRole('button', { name: 'حفظ التغييرات' }).click();
    await expect(page.getByText('تم حفظ التغييرات.')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('الجوال الشخصي')).toHaveValue('+966501234567');
    await expect(page.getByLabel('البريد الشخصي')).toHaveValue('sara.personal@example.com');
    await new Page(page).expectNoSeriousA11yIssues();
  });

  test('the language choice on the profile page switches the interface and is saved', async ({ page }) => {
    await page.goto('/profile');
    await page.getByLabel('اللغة').selectOption('en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible();
    await expect.poll(async () => (await (await page.request.get('/api/me')).json()).locale).toBe('en');
  });

  test('the avatar in the header opens the profile', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'الملف الشخصي' }).first().click();
    await expect(page).toHaveURL(/\/profile$/);
  });
});

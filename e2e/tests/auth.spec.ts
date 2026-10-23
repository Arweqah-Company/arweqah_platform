import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { ADMIN_EMAIL, adminTotpUri } from '../support/fixtures';

test.describe('Sign-in and language (FR-01, FR-12, FR-23)', () => {
  test('redirects to sign-in when not signed in, and the page is right-to-left', async ({ page }) => {
    await page.goto('/employees');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('button', { name: 'الدخول بواسطة Microsoft' })).toBeVisible();
    await new LoginPage(page).expectNoSeriousA11yIssues();
  });

  test('asks for the e-mail first, then shows the six code boxes; a wrong code gives one generic error', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await expect(page.getByRole('group', { name: 'رمز تطبيق المصادقة' })).toBeHidden();
    await login.enterEmail(ADMIN_EMAIL);
    await login.enterCode('000000');
    await expect(login.errorAlert()).toHaveText('البريد أو الرمز غير صحيح.');
    await expect(page.getByLabel('رمز تطبيق المصادقة 1')).toHaveValue('');
    await login.expectNoSeriousA11yIssues();
  });

  test('admin signs in with the e-mail and the authenticator code, then signs out', async ({ page }) => {
    test.setTimeout(90_000); // may wait for the next 30-second code
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(ADMIN_EMAIL, adminTotpUri);
    await login.expectNoSeriousA11yIssues();
    await login.signOut();
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('switches the interface to English and left-to-right', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in');
  });
});

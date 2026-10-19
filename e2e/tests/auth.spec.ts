import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { accounts } from '../support/fixtures';

test.describe('Sign-in and language (FR-01, FR-02, FR-12)', () => {
  test('redirects to sign-in when not signed in, and the page is right-to-left', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await new LoginPage(page).expectNoSeriousA11yIssues();
  });

  test('shows a clear error for a wrong password', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(accounts().viewer.email, 'Wrong-Password-9');
    await expect(login.errorAlert()).toHaveText('البريد أو كلمة المرور غير صحيحة.');
  });

  test('admin signs in with two-step verification, then signs out', async ({ page }) => {
    const { admin } = accounts();
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(admin.email, admin.password);
    await login.verifyTwoFactor(admin.totpUri);
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

import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { UsersPage } from '../pages/users.page';
import { accounts } from '../support/fixtures';

test.describe('Users and roles (FR-04, FR-05)', () => {
  test.beforeEach(async ({ page }) => {
    const { admin } = accounts();
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(admin.email, admin.password);
    await login.verifyTwoFactor(admin.totpUri);
  });

  test('admin adds a user with a role, and the new user can sign in', async ({ page, browser }) => {
    const users = new UsersPage(page);
    await users.open();
    const email = `new-${Date.now()}@e2e.local`;
    await users.createUser({ name: 'منى الحربي', email, password: 'Mona-Passw0rd-1', role: 'مشاهد' });
    await users.search('منى');
    await expect(users.row('منى الحربي')).toContainText('مشاهد');
    await users.expectNoSeriousA11yIssues();

    const other = await browser.newPage();
    const login = new LoginPage(other);
    await login.goto();
    await login.signIn(email, 'Mona-Passw0rd-1');
    await expect(other.getByRole('heading', { level: 1 })).toContainText('أهلًا');
  });

  test('a name containing HTML is shown as plain text (XSS)', async ({ page }) => {
    let dialogFired = false;
    page.on('dialog', () => (dialogFired = true));
    const users = new UsersPage(page);
    await users.open();
    const payload = '<img src=x onerror=alert(1)>';
    await users.createUser({ name: payload, email: `xss-${Date.now()}@e2e.local`, password: 'Xss-Passw0rd-123' });
    await expect(page.getByText(payload)).toBeVisible();
    expect(dialogFired).toBe(false);
  });
});

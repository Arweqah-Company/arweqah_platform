import { expect } from '@playwright/test';
import { totpFromUri } from '../support/totp';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.page.getByLabel('البريد الإلكتروني').fill(email);
    await this.page.getByLabel('كلمة المرور').fill(password);
    await this.page.getByRole('button', { name: 'دخول' }).click();
  }

  /** Completes the second step like an authenticator app would. */
  async verifyTwoFactor(totpUri: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/login\/two-factor/);
    await this.page.getByLabel('رمز التحقق').fill(totpFromUri(totpUri));
    await this.page.getByRole('button', { name: 'تحقق' }).click();
    await expect(this.page.getByRole('heading', { level: 1 })).toContainText('أهلًا');
  }

  errorAlert() {
    return this.page.getByRole('alert');
  }
}

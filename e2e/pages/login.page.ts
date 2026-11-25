import { expect } from '@playwright/test';
import { freshCode } from '../support/totp';
import { BasePage } from './base.page';

/** The two-step sign-in page: the work e-mail first (the code is then e-mailed by itself), then the six code boxes; the authenticator app is the second choice. */
export class LoginPage extends BasePage {
  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  /** Submits the e-mail; the page e-mails the code at once and shows its boxes. */
  async submitEmail(email: string): Promise<void> {
    await this.page.getByLabel('بريد العمل').fill(email);
    await this.page.getByRole('button', { name: 'متابعة' }).click();
    await expect(this.page.getByRole('group', { name: 'الرمز المُرسل إلى بريدك' })).toBeVisible();
  }

  /** The e-mail, then the second choice: the code of the authenticator app. */
  async enterEmail(email: string): Promise<void> {
    await this.submitEmail(email);
    await this.page.getByRole('button', { name: 'استخدم رمز التطبيق' }).click();
    await expect(this.page.getByRole('group', { name: 'رمز تطبيق المصادقة' })).toBeVisible();
  }

  /** Types the digits into the code boxes like a person copying them from the authenticator app. */
  async enterCode(code: string): Promise<void> {
    for (const [index, digit] of [...code].entries()) await this.page.getByLabel(`رمز تطبيق المصادقة ${index + 1}`).fill(digit);
  }

  async signIn(email: string, totpUri: string): Promise<void> {
    await this.enterEmail(email);
    // A code is accepted once: take the next one the server has not seen (waits for the clock when needed).
    await this.enterCode(await freshCode(totpUri));
    await expect(this.page.getByRole('heading', { level: 1 })).toContainText('أهلًا');
  }

  errorAlert() {
    return this.page.getByRole('alert');
  }
}

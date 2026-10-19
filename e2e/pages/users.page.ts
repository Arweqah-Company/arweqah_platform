import { expect } from '@playwright/test';
import { BasePage } from './base.page';

export class UsersPage extends BasePage {
  async open(): Promise<void> {
    await this.openNav('المستخدمون');
    await expect(this.page.getByRole('heading', { name: 'المستخدمون', level: 1 })).toBeVisible();
  }

  async createUser(user: { name: string; email: string; password: string; role?: string }): Promise<void> {
    await this.page.getByRole('button', { name: 'مستخدم جديد' }).click();
    const dialog = this.page.getByRole('dialog');
    await dialog.getByLabel('الاسم').fill(user.name);
    await dialog.getByLabel('البريد الإلكتروني').fill(user.email);
    await dialog.getByLabel('كلمة مرور مبدئية').fill(user.password);
    if (user.role) await dialog.getByLabel(user.role).check();
    await dialog.getByRole('button', { name: 'إضافة' }).click();
    await expect(dialog).toBeHidden();
  }

  row(text: string) {
    return this.page.getByRole('row').filter({ hasText: text });
  }

  async search(term: string): Promise<void> {
    await this.page.getByRole('searchbox', { name: 'بحث' }).fill(term);
  }
}

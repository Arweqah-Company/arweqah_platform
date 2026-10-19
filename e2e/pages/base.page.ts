import { AxeBuilder } from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Shared helpers every page object inherits (Page Object Model). */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async expectNoSeriousA11yIssues(): Promise<void> {
    const { violations } = await new AxeBuilder({ page: this.page }).analyze();
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious, serious.map((v) => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
  }

  async openNav(name: string): Promise<void> {
    const menu = this.page.getByRole('button', { name: 'Menu' });
    if (await menu.isVisible()) await menu.click();
    await this.page.getByRole('link', { name }).click();
  }

  navLink(name: string) {
    return this.page.getByRole('link', { name });
  }

  async signOut(): Promise<void> {
    await this.page.getByRole('button', { name: 'تسجيل الخروج' }).click();
    await expect(this.page).toHaveURL(/\/login$/);
  }
}

import { AxeBuilder } from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Shared helpers every page object inherits (Page Object Model). */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async expectNoSeriousA11yIssues(): Promise<void> {
    const { violations } = await new AxeBuilder({ page: this.page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious, serious.map((v) => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
  }

  /** On a phone the sidebar is a drawer behind the menu button. */
  async openDrawerIfPhone(): Promise<void> {
    // The shell appears after the session loads; only then can we tell a phone (menu button) from a computer.
    await this.page.locator('#main').waitFor();
    const menu = this.page.getByRole('button', { name: 'القائمة', exact: true });
    if (await menu.isVisible()) await menu.click();
  }

  /** Opens a sidebar menu (when the link lives in one) and follows the link. */
  async openNav(link: string, menu?: string): Promise<void> {
    await this.openDrawerIfPhone();
    if (menu) {
      const button = this.page.getByRole('button', { name: menu });
      if ((await button.getAttribute('aria-expanded')) === 'false') await button.click();
    }
    await this.page.getByRole('navigation', { name: 'منصة أروقة' }).getByRole('link', { name: link, exact: true }).click();
  }

  async signOut(): Promise<void> {
    await this.openDrawerIfPhone();
    await this.page.getByRole('button', { name: 'تسجيل الخروج' }).first().click();
    await expect(this.page).toHaveURL(/\/login$/);
  }
}

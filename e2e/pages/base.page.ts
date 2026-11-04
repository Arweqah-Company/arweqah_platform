import { AxeBuilder } from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Shared helpers every page object inherits (Page Object Model). */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** `exclude` leaves out content that is not ours to fix, such as the e-mail preview shown in a sandboxed frame (axe cannot run inside it). */
  async expectNoSeriousA11yIssues(exclude: string[] = []): Promise<void> {
    // Colors are measured while a fade-in is still running on a slow machine: let the animations finish first.
    await this.page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
    const builder = exclude.reduce((b, selector) => b.exclude(selector), new AxeBuilder({ page: this.page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']));
    const { violations } = await builder.analyze();
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
    // The phone drawer has its own sign-out; everywhere else it is inside the account menu.
    const drawerButton = this.page.getByRole('button', { name: 'تسجيل الخروج' });
    if (await drawerButton.count()) await drawerButton.first().click();
    else {
      await this.page.getByRole('button', { name: 'حسابي' }).click();
      await this.page.getByRole('menuitem', { name: 'تسجيل الخروج' }).click();
    }
    await expect(this.page).toHaveURL(/\/login$/);
  }
}

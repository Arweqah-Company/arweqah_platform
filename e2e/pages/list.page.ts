import { expect, type Download } from '@playwright/test';
import { BasePage } from './base.page';

/** What every list page has in common: search, filter panel, view switch, export and import. */
export class ListPage extends BasePage {
  search(label: string) {
    return this.page.getByRole('searchbox', { name: label });
  }

  async openFilters(): Promise<void> {
    await this.page.getByRole('button', { name: /تصفية/ }).click();
  }

  async switchView(view: 'جدول' | 'بطاقات' | 'مخطط' | 'مخطط طبقي'): Promise<void> {
    await this.page.getByRole('button', { name: view, exact: true }).click();
    await expect(this.page.getByRole('button', { name: view, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }

  async downloadFrom(buttonName: string): Promise<Download> {
    const [download] = await Promise.all([this.page.waitForEvent('download'), this.page.getByRole('button', { name: buttonName }).click()]);
    return download;
  }
}

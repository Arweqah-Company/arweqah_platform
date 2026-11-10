import { expect, test, type Page } from '@playwright/test';
import { ListPage } from '../pages/list.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

test.use({ storageState: ADMIN_STATE });
test.describe.configure({ timeout: 120_000 });

/** Phones start a list as cards; these tests read the table. */
const tableView = (page: Page) => page.addInitScript(() => localStorage.setItem('view:performance-team', 'table'));

test.describe('The team evaluation page (FR-120)', () => {
  test.beforeEach(async ({ page }) => { await adminModeOnViaApi(page); await tableView(page); });
  test.afterEach(async ({ page }) => { await adminModeOffViaApi(page); });

  test('opens with the header, the seven stages, the chain notice and the list with its toolbar, and is accessible', async ({ page }) => {
    await page.goto('/performance-team');
    await expect(page.getByRole('heading', { level: 1, name: 'تقييم فريقي' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'مراحل دورة التقييم' }).getByRole('button')).toHaveCount(7);
    await expect(page.getByText(/المدير المباشر يقيّم أولًا، ثم المدير الأعلى يراجع/)).toBeVisible();
    await expect(page.getByRole('table', { name: 'تقييم فريقي' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'بحث في الفريق' })).toBeVisible();
    await new ListPage(page).expectNoSeriousA11yIssues();
  });

  test('every page of the career file stands under one sidebar menu, «الملف المهني»', async ({ page }) => {
    await page.goto('/performance-team');
    const menu = page.getByRole('button', { name: 'الملف المهني' });
    if ((await menu.getAttribute('aria-expanded')) !== 'true') await menu.click();
    const links = page.locator('#menu-career').getByRole('link');
    await expect(links.filter({ hasText: 'تقييم فريقي' })).toHaveCount(1);
    await expect(links.filter({ hasText: 'دورة التقييم' })).toHaveCount(1);
    await expect(links.filter({ hasText: 'مراجعة الشهادات' })).toHaveCount(1);
    await expect(links.filter({ hasText: 'طلبات التطوير' })).toHaveCount(1);
    await expect(links.filter({ hasText: 'محتوى المسارات الوظيفية' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'الموارد البشرية' }).locator('xpath=..').getByRole('link', { name: 'تقييم فريقي' })).toHaveCount(0);
  });

  test('the stage of the manager sends to this page, and the sidebar has a link to it', async ({ page }) => {
    await page.goto('/performance-cycle');
    await page.getByRole('list', { name: 'مراحل دورة التقييم' }).getByRole('button', { name: 'تقييم المدير' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'اذهب إلى شاشة هذه المرحلة' }).click();
    await expect(page).toHaveURL(/\/performance-team$/);
    await expect(page.getByRole('link', { name: 'تقييم فريقي' }).first()).toBeVisible();
  });
});

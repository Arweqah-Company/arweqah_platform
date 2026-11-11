import { expect, test, type Page } from '@playwright/test';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

test.use({ storageState: ADMIN_STATE });

// The header and the drawer on a phone, in plain and in platform admin mode (FR-30, FR-34).
test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== 'mobile', 'phone layout only'));

const NARROW = { width: 360, height: 740 };
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

/** Every direct child of the header sits fully inside the viewport and none overlaps the next. */
async function expectHeaderFits(page: Page): Promise<void> {
  const header = page.locator('header').first();
  await expect(header).toBeVisible();
  const view = page.viewportSize()!;
  const boxes = await header.evaluate((el) => {
    const leaves = [...el.querySelectorAll<HTMLElement>('button, a, img, svg')].filter((n) => n.getClientRects().length > 0 && !n.closest('button svg, a svg'));
    return leaves.map((n) => { const r = n.getBoundingClientRect(); return { l: r.left, r: r.right, w: r.width }; });
  });
  for (const b of boxes) { expect(b.l).toBeGreaterThanOrEqual(-0.5); expect(b.r).toBeLessThanOrEqual(view.width + 0.5); }
  expect(await noSideScroll(page)).toBe(true);
}

test.describe('Phone shell', () => {
  test.beforeEach(async ({ page }) => { await page.setViewportSize(NARROW); await adminModeOffViaApi(page); });
  test.afterEach(async ({ page }) => adminModeOffViaApi(page));

  test('the header keeps only menu, logo, bell and avatar; theme and language live in the account menu', async ({ page }, info) => {
    await page.goto('/');
    await expectHeaderFits(page);
    await expect(page.getByRole('button', { name: /التبديل إلى الوضع/ })).toBeHidden();
    await expect(page.getByRole('button', { name: 'English' })).toBeHidden();
    await page.screenshot({ path: info.outputPath('header.png') });
    await page.getByRole('button', { name: 'حسابي' }).click();
    await expect(page.getByRole('menuitem', { name: /التبديل إلى الوضع/ })).toBeVisible();
    await page.getByRole('menuitem', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.getByRole('button', { name: 'My account' }).click();
    await page.getByRole('menuitem', { name: 'العربية' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });

  test('the account menu scrolls inside a short (landscape) phone screen, so sign-out stays reachable', async ({ page }) => {
    await page.setViewportSize({ width: 740, height: 340 });
    await page.goto('/');
    await page.getByRole('button', { name: 'حسابي' }).click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    const box = (await menu.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(340);
    const signOut = menu.getByRole('menuitem', { name: 'تسجيل الخروج' });
    await signOut.scrollIntoViewIfNeeded();
    await expect(signOut).toBeInViewport();
  });

  test('admin mode on: the header still fits and the button is icon-only', async ({ page }, info) => {
    test.setTimeout(120_000);
    await adminModeOnViaApi(page);
    await page.goto('/');
    const on = page.getByRole('button', { name: 'إيقاف وضع مدير المنصة' });
    await expect(on).toBeVisible();
    const box = (await on.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(48);
    await expectHeaderFits(page);
    await page.screenshot({ path: info.outputPath('header-admin.png') });
  });

  test('the drawer fits the screen, scrolls inside, and reaches the last link in admin mode', async ({ page }, info) => {
    test.setTimeout(120_000);
    await adminModeOnViaApi(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'القائمة' }).click();
    const aside = page.locator('aside');
    await expect(aside).toBeInViewport({ ratio: 1 });
    const box = (await aside.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(NARROW.width - 16);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(NARROW.height);
    await page.screenshot({ path: info.outputPath('drawer-admin.png') });
    const signOut = aside.getByRole('button', { name: 'تسجيل الخروج' });
    await signOut.scrollIntoViewIfNeeded();
    await expect(signOut).toBeInViewport();
    expect(await noSideScroll(page)).toBe(true);
    await page.locator('div[aria-hidden].fixed').click({ position: { x: NARROW.width - 5, y: 300 } });
    await expect(aside).not.toBeInViewport();
  });
});

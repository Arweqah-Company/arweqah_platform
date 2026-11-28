import { expect, test, type Page } from '@playwright/test';
import { ADMIN_STATE } from '../support/fixtures';

test.use({ storageState: ADMIN_STATE });

const outline = (page: Page) => page.evaluate(() => { const a = document.activeElement as HTMLElement; return { tag: a.tagName, style: getComputedStyle(a).outlineStyle }; });

test.describe('The focus ring (design system: one ring per control)', () => {
  test('a field that draws its own focus (border and halo) wears no second dark frame, while a button reached by keyboard keeps its ring', async ({ page }) => {
    await page.goto('/tickets');
    await page.getByRole('button', { name: 'تذكرة جديدة' }).click();
    const dialog = page.getByRole('dialog', { name: 'تذكرة جديدة' });
    await expect(dialog.getByRole('textbox', { name: 'ماذا تحتاج؟' })).toBeFocused();
    expect(await outline(page)).toEqual({ tag: 'INPUT', style: 'none' }); // the search box inside its bordered label
    await dialog.locator('ul button, li button').first().click();
    await expect(dialog.getByLabel(/العنوان/)).toBeFocused();
    expect(await outline(page)).toEqual({ tag: 'INPUT', style: 'none' }); // the title field: its border and halo are its focus
    await dialog.screenshot({ path: '/tmp/claude-1000/-var-www-html-arweqah-platform-new-arweqah-platform/ae1b891b-c389-4772-90a7-59079fdf0bc5/scratchpad/focus-title.png' });
    await page.keyboard.press('Shift+Tab');
    expect(await outline(page)).toEqual({ tag: 'BUTTON', style: 'solid' }); // a button keeps the default ring for the keyboard
  });
});

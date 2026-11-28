import { expect, test } from '@playwright/test';
import { ADMIN_STATE } from '../support/fixtures';

test.use({ storageState: ADMIN_STATE });

test.describe('The calendar of a date box (FR-201)', () => {
  test('is tied to a box with a real size lying on its calendar button, so the browser opens it next to the field and not in the corner of the screen', async ({ page }) => {
    await page.goto('/profile');
    await page.getByRole('button', { name: 'طلب تعديل' }).click();
    const dialog = page.getByRole('dialog', { name: /طلب تعديل بياناتي الأساسية/ });
    await expect(dialog).toBeVisible();
    const field = dialog.getByLabel('تاريخ الميلاد');
    const button = dialog.getByRole('button', { name: 'فتح التقويم' });
    const picker = dialog.locator('input[type="date"]');
    const [f, b, p] = [await field.boundingBox(), await button.boundingBox(), await picker.boundingBox()];
    // Chrome opens the calendar at the top-left corner of the screen when the date control it is given has no size.
    expect(p!.width).toBeGreaterThan(0);
    expect(p!.height).toBeGreaterThan(0);
    expect(p!.x).toBeGreaterThanOrEqual(f!.x);
    expect(p!.x + p!.width).toBeLessThanOrEqual(f!.x + f!.width);
    expect(p!.y).toBeGreaterThanOrEqual(f!.y);
    expect(p!.y + p!.height).toBeLessThanOrEqual(f!.y + f!.height);
    expect(Math.abs(p!.x - b!.x)).toBeLessThan(2); // on the calendar button itself
    await button.click(); // the click still reaches the button, not the hidden control
    await expect(dialog).toBeVisible();
  });
});

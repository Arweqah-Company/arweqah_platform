import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { ADMIN_STATE, adminTotpUri } from '../support/fixtures';
import { freshCode } from '../support/totp';

class Shell extends BasePage {}
test.use({ storageState: ADMIN_STATE });

const TURN_ON = 'تفعيل وضع مدير المنصة';
const TURN_OFF = 'إيقاف وضع مدير المنصة';

/** Types the next code the server has not seen, like copying it from the app. */
async function enterFreshCode(page: Page): Promise<void> {
  const code = await freshCode(adminTotpUri);
  for (const [index, digit] of [...code].entries()) await page.getByLabel(`رمز تطبيق المصادقة ${index + 1}`).fill(digit);
  await expect(page.getByRole('button', { name: TURN_OFF })).toBeVisible();
}

const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));

test.describe('Platform admin mode (FR-34)', () => {
  test('is off by default, turns on with a fresh authenticator code, shows its state, and turns off', async ({ page }) => {
    test.setTimeout(120_000); // may wait for the next 30-second code
    await page.goto('/');
    await expect(page.locator('#main')).toBeVisible();
    const turnOn = page.getByRole('button', { name: TURN_ON });
    await expect(turnOn).toHaveAttribute('aria-pressed', 'false');
    await turnOn.click();
    const dialog = page.getByRole('dialog', { name: TURN_ON });
    await expect(dialog).toBeVisible();
    await settled(page);
    await new Shell(page).expectNoSeriousA11yIssues();
    await dialog.getByLabel('رمز تطبيق المصادقة 1').fill('0');
    for (const index of [2, 3, 4, 5, 6]) await dialog.getByLabel(`رمز تطبيق المصادقة ${index}`).fill('0');
    await expect(page.getByText('الرمز غير صحيح')).toBeVisible();
    await enterFreshCode(page);
    const turnOff = page.getByRole('button', { name: TURN_OFF });
    await expect(turnOff).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.getByRole('button', { name: TURN_OFF })).toBeVisible();
    await settled(page);
    await new Shell(page).expectNoSeriousA11yIssues();
    await page.getByRole('button', { name: TURN_OFF }).click();
    await expect(page.getByRole('button', { name: TURN_ON })).toHaveAttribute('aria-pressed', 'false');
  });
});

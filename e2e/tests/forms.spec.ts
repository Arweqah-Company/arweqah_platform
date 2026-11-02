import { expect, test } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { ADMIN_STATE } from '../support/fixtures';

class Page extends BasePage {}
test.use({ storageState: ADMIN_STATE });

test.describe('Forms validate while typing and when leaving a field (FR-17)', () => {
  test('the employee form explains a field without pressing save, and stays accessible', async ({ page }) => {
    await page.goto('/employees/new');
    await expect(page.getByRole('heading', { level: 1, name: 'إضافة موظف' })).toBeVisible();
    await expect(page.getByText('هذا الحقل مطلوب.')).toHaveCount(0);
    const email = page.getByLabel('بريد العمل *');
    await email.fill('someone');
    await expect(page.getByText('بريد العمل غير صحيح.')).toBeVisible();
    await new Page(page).expectNoSeriousA11yIssues();
    await email.fill('someone@arweqah.sa');
    await expect(page.getByText('بريد العمل غير صحيح.')).toHaveCount(0);
    await page.getByLabel('الرقم الوظيفي *').focus();
    await page.getByLabel('الاسم الكامل *').focus();
    await expect(page.getByText('هذا الحقل مطلوب.')).toHaveCount(1);
  });
});

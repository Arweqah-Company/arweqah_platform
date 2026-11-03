import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });

const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));

/** The administrator\'s grants work in admin mode only (FR-84), so every test starts with it on. */
test.beforeEach(async ({ page }) => adminModeOnViaApi(page));

async function newTask(page: Page, title: string): Promise<void> {
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'مهمة جديدة' }).click();
  const popup = page.getByRole('dialog', { name: 'مهمة جديدة' });
  await popup.getByLabel('العنوان *').fill(title);
  await popup.getByRole('button', { name: 'إنشاء المهمة' }).click();
  await expect(popup).toHaveCount(0);
  await page.getByRole('link', { name: title }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
}

test.describe('Task comments (FR-66)', () => {
  test('writes a comment, mentions a colleague, answers it, edits and deletes', async ({ page }) => {
    await newTask(page, `نقاش المهمة (${test.info().project.name})`);
    await expect(page.getByRole('heading', { level: 2, name: 'التعليقات' })).toBeVisible();
    await expect(page.getByText('لا تعليقات بعد.')).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();

    const box = page.getByRole('textbox', { name: 'اكتب تعليقًا' });
    await box.fill('تمت المراجعة @');
    const list = page.getByRole('listbox', { name: 'زملاء يمكن ذكرهم' });
    await expect(list).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await list.getByRole('option').first().click();
    await expect(box).toHaveValue(/تمت المراجعة @.+ $/);
    await page.getByRole('button', { name: 'إرسال' }).click();
    const first = page.locator('li[id^="comment-"]').filter({ hasText: 'تمت المراجعة' });
    await expect(first).toBeVisible();
    await expect(first.locator('span.text-link', { hasText: '@' })).toBeVisible();

    await first.getByRole('button', { name: 'رد' }).click();
    await page.getByRole('textbox', { name: /اكتب ردًا على/ }).fill('شكرًا على الملاحظة');
    await page.getByRole('button', { name: 'إرسال' }).filter({ hasNot: page.locator('[disabled]') }).first().click();
    await expect(page.getByText('شكرًا على الملاحظة')).toBeVisible();

    await first.getByRole('button', { name: 'تعديل' }).click();
    const editor = page.getByRole('textbox', { name: 'عدّل تعليقك' });
    await editor.fill('نص بعد التعديل');
    await page.getByRole('button', { name: 'حفظ التعديل' }).click();
    await expect(page.getByText('نص بعد التعديل')).toBeVisible();
    await expect(page.getByText('· معدّل')).toBeVisible();

    await page.locator('li[id^="comment-"]').filter({ hasText: 'نص بعد التعديل' }).getByRole('button', { name: 'حذف' }).click();
    await page.getByRole('dialog', { name: 'حذف التعليق' }).getByRole('button', { name: 'حذف' }).click();
    await expect(page.getByText('حُذف هذا التعليق')).toBeVisible();
    await expect(page.getByText('شكرًا على الملاحظة')).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
  });

  test('opens the conversation page on its own', async ({ page }) => {
    await newTask(page, `محادثة وحدها (${test.info().project.name})`);
    const id = page.url().split('/').pop() as string;
    await page.goto(`/tasks/${id}/conversation`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('محادثة وحدها');
    await expect(page.getByRole('link', { name: 'فتح المهمة' })).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
  });

  test('edits the matrix of who may do what in platform admin mode and puts it back', async ({ page }) => {
    await adminModeOnViaApi(page);
    await page.goto('/tasks/policies');
    await expect(page.getByRole('heading', { level: 2, name: 'من يفعل ماذا في تعليقات المهام' })).toBeVisible();
    const cell = page.getByRole('checkbox', { name: 'المتابع · صلاحية رفع ملف' });
    await expect(cell).toBeChecked();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await cell.uncheck();
    const section = page.locator('#comment-rules-title').locator('xpath=ancestor::section');
    await section.getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('حُفظت صلاحيات التعليقات.').first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole('checkbox', { name: 'المتابع · صلاحية رفع ملف' })).not.toBeChecked();
    await page.getByRole('checkbox', { name: 'المتابع · صلاحية رفع ملف' }).check();
    await section.getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('حُفظت صلاحيات التعليقات.').first()).toBeVisible();
  });
});

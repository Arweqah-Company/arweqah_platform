import { expect, test, type Page } from '@playwright/test';
import { ListPage } from '../pages/list.page';
import { adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';
import { makeTitle, uniqueTag, unitNamed } from '../support/org-data';

test.use({ storageState: ADMIN_STATE });
test.describe.configure({ timeout: 150_000 });

const ORIGIN = { origin: 'http://localhost:4173' };
const UNIT = 'وحدة التسويق';

/** A career path with every part complete (it can be set ready). */
const COMPLETE = {
  summary: 'ملخص مسار الاختبار',
  kpis: [{ text: 'مؤشر الاختبار', governing: true }],
  responsibilities: [{ title: 'مسؤولية الاختبار', tasks: ['مهمة أولى'] }],
  ladder: [{ level: 'L7', title: 'مسمى الاختبار', current: true }],
  transitionRule: 'شرط انتقال الاختبار',
  pathUnit: 'وحدة', pathTitle: 'مسمى', steps: [{ n: 1, label: 'الأساس', title: 'دورة', meta: 'دورة · جهة' }], output: '', certificates: '',
  competencyColumns: ['L7'], competencies: [{ name: 'جدارة', values: ['أساسي'] }],
  required: [{ when: '15 أكتوبر 2026', lines: ['بند'], deadline: '2026-10-15' }], ackText: 'اطلعت على مساري',
  learning: { badges: [{ name: 'وسام', condition: 'شرط', hours: 35 }], rule: '', periods: [{ name: 'السنة 1', units: [{ priority: 'إلزامي', title: 'وحدة تعلم', provider: 'جهة', duration: 'ساعتان', minutes: 120, language: 'عربي', link: '' }] }] },
};

/** A title of the sample unit with a complete draft path, made through the API; the name is unique to the project, because both share a database. */
async function draftTitle(page: Page, project: string): Promise<{ id: string; name: string }> {
  await adminModeOnViaApi(page);
  const name = `مسمى المسار ${uniqueTag(project)}`;
  const unit = await unitNamed(page, UNIT);
  const title = await makeTitle(page, unit.id, name, 7, 'P');
  const saved = await page.request.put(`/api/career/titles/${title.id}/content`, { data: { content: COMPLETE }, headers: ORIGIN });
  expect(saved.status(), await saved.text()).toBe(200);
  return { id: title.id, name };
}

const rowOf = (page: Page, name: string) => page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) });

test.describe('Career-path content (FR-111, FR-112, FR-113)', () => {
  test('lists a title with the state of its path, previews it on a click, and is accessible', async ({ page }, info) => {
    const data = await draftTitle(page, info.project.name);
    const list = new ListPage(page);
    await page.goto('/career-content');
    await expect(page.getByRole('heading', { level: 1, name: 'محتوى المسارات الوظيفية' })).toBeVisible();
    await list.switchView('جدول');
    await list.search('بحث في المسميات').fill(data.name);
    const row = rowOf(page, data.name);
    await expect(row.getByText('مسودة', { exact: true })).toBeVisible();
    await expect(row.getByText('L7', { exact: true })).toBeVisible();
    await list.expectNoSeriousA11yIssues();
    await row.getByRole('button', { name: /^معاينة المسار/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('معاينة المسار الوظيفي', { exact: false })).toBeVisible();
    await expect(dialog.getByText(COMPLETE.summary)).toBeVisible();
    await expect(dialog.getByText('المؤشر الحاكم')).toBeVisible();
    await dialog.getByRole('tab', { name: 'التطوير المهني' }).click(); // the ladder, then the sub-tabs
    await expect(dialog.getByText('المسمى الحالي').first()).toBeVisible();
    await dialog.getByRole('tab', { name: 'خطة التعلم' }).click();
    await expect(dialog.getByText('وحدة تعلم')).toBeVisible();
    await list.expectNoSeriousA11yIssues();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('opens the workspace of a title on a click on its row, edits a field, sees what is missing live, saves it, and the list shows the new version', async ({ page }, info) => {
    const data = await draftTitle(page, info.project.name);
    const list = new ListPage(page);
    await page.goto('/career-content');
    await list.switchView('جدول');
    await list.search('بحث في المسميات').fill(data.name);
    await rowOf(page, data.name).getByText(data.name, { exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('مساحة عمل المسار', { exact: false })).toBeVisible();
    await expect(dialog.getByText('كل الأجزاء مكتملة ويمكن تعيين المسار جاهزًا.')).toBeVisible();
    const summary = dialog.getByLabel('ملخص الوظيفة');
    await summary.fill('');
    await expect(dialog.getByText('الوصف الوظيفي ناقص (ملخص أو مؤشرات أو مسؤوليات)')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'حفظ التعديلات' })).toBeEnabled(); // a draft may be saved incomplete: only «ready» needs every part
    await summary.fill('ملخص بعد التعديل');
    await dialog.getByRole('tab', { name: 'خطة التعلم' }).click();
    await dialog.getByLabel('الرابط').first().fill('http://insecure.example');
    await expect(dialog.getByText('الرابط يجب أن يبدأ بـ https://')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'حفظ التعديلات' })).toBeDisabled(); // a link that is not https cannot be saved
    await dialog.getByLabel('الرابط').first().fill('https://learn.example/unit');
    await list.expectNoSeriousA11yIssues();
    await dialog.getByRole('button', { name: 'حفظ التعديلات' }).click();
    await expect(page.getByText('حُفظ المحتوى وارتفع إصداره.')).toBeVisible();
    const saved = await (await page.request.get(`/api/career/titles/${data.id}/content`)).json();
    expect(saved).toMatchObject({ version: 2, content: { summary: 'ملخص بعد التعديل' } });
    expect(saved.content.learning.periods[0].units[0].link).toBe('https://learn.example/unit');
  });

  test('sets a path ready after a confirmation, reopens its acknowledgement with a reason, and takes it back to a draft', async ({ page }, info) => {
    const data = await draftTitle(page, info.project.name);
    const list = new ListPage(page);
    await page.goto('/career-content');
    await list.switchView('جدول');
    await list.search('بحث في المسميات').fill(data.name);
    const row = rowOf(page, data.name);
    await row.getByRole('button', { name: /^تعيين المسار جاهزًا/ }).click();
    await expect(page.getByText(/سيظهر المسار لشاغلي المسمى/)).toBeVisible();
    await list.expectNoSeriousA11yIssues();
    await page.getByRole('dialog').getByRole('button', { name: 'تعيين جاهزًا' }).click();
    await expect(row.getByText('جاهز', { exact: true })).toBeVisible();
    await row.getByRole('button', { name: /^إعادة فتح الإقرار/ }).click();
    const reopen = page.getByRole('dialog');
    await expect(reopen.getByRole('button', { name: 'تأكيد' })).toBeDisabled();
    await reopen.getByLabel('السبب *').fill('تغيّر الوصف الوظيفي');
    await list.expectNoSeriousA11yIssues();
    await reopen.getByRole('button', { name: 'تأكيد' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await row.getByRole('button', { name: /^إرجاع المسار إلى مسودة/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'إرجاع إلى مسودة' }).click();
    await expect(row.getByText('مسودة', { exact: true })).toBeVisible();
  });

  test('opens the title-file dialog, reads a pasted text, says what is missing and keeps «Save» off, accessibly', async ({ page }, info) => {
    const data = await draftTitle(page, info.project.name);
    const list = new ListPage(page);
    await page.goto('/career-content');
    await list.switchView('جدول');
    await list.search('بحث في المسميات').fill(data.name);
    await rowOf(page, data.name).getByRole('button', { name: /^رفع ملف المسمى/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'حفظ المحتوى المستخرج' })).toBeDisabled();
    await dialog.getByLabel('أو الصق نص الملف').fill('ملخص الوظيفة\nنص قصير بلا باقي الأقسام');
    await dialog.getByRole('button', { name: 'استخراج' }).click();
    await expect(dialog.getByText('أجزاء تحتاج مراجعة قبل الحفظ:')).toBeVisible();
    await expect(dialog.getByText('مؤشرات الأداء ناقصة')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'حفظ المحتوى المستخرج' })).toBeDisabled();
    await list.expectNoSeriousA11yIssues();
  });

  test('shows the career-path page of the signed-in person, saying so when no path is ready for their title', async ({ page }) => {
    await page.goto('/career-profile');
    await expect(page.getByRole('heading', { level: 1, name: 'المسار الوظيفي' })).toBeVisible();
    await expect(page.getByText('مسارك الوظيفي لم يُجهَّز بعد')).toBeVisible();
    await new ListPage(page).expectNoSeriousA11yIssues();
  });
});

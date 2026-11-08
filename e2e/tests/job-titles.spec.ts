import { expect, test, type Page } from '@playwright/test';
import { ListPage } from '../pages/list.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';
import { groupCompanyId, makeEmployee, makeTitle, uniqueTag, unitNamed } from '../support/org-data';
import { choose } from '../support/select';

test.use({ storageState: ADMIN_STATE });
test.describe.configure({ timeout: 150_000 });

const UNIT = 'وحدة التسويق';

interface Sample { parent: string; child: string; free: string; manager: string; tag: string }
const made = new Map<string, Sample>();

/**
 * Three titles of one unit and two people: a head (grade 5, management track) held by one person, and a specialist (grade 7, professional track)
 * that reports to the head and is held by another, plus a title nobody holds. One set per project, because the two projects share the database.
 */
async function sample(page: Page, project: string): Promise<Sample> {
  await adminModeOnViaApi(page);
  const known = made.get(project);
  if (known) return known;
  const tag = uniqueTag(project);
  const unit = await unitNamed(page, UNIT);
  const company = await groupCompanyId(page, unit.id);
  const parent = await makeTitle(page, unit.id, `رئيس التسويق ${tag}`, 5, 'M');
  const child = await makeTitle(page, unit.id, `أخصائي تسويق ${tag}`, 7, 'P', parent.id);
  await makeTitle(page, unit.id, `مسمى شاغر ${tag}`, 2, 'S');
  const manager = await makeEmployee(page, { companyId: company, unitId: unit.id, titleId: parent.id, name: `مدير التسويق ${tag}`, tag: `mgr${tag}` });
  await makeEmployee(page, { companyId: company, unitId: unit.id, titleId: child.id, name: `موظف التسويق ${tag}`, tag: `emp${tag}` });
  const value = { parent: parent.nameAr, child: child.nameAr, free: `مسمى شاغر ${tag}`, manager, tag };
  made.set(project, value);
  return value;
}

const rowOf = (page: Page, name: string) => page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) });

test.describe('Job titles page: the list, search and filters (FR-107)', () => {
  test('lists the titles with code, grade and track, searches by name and by code, and filters by grade, track and vacancy', async ({ page }, info) => {
    const data = await sample(page, info.project.name);
    const list = new ListPage(page);
    await page.goto('/job-titles');
    await expect(page.getByRole('heading', { level: 1, name: 'المسميات الوظيفية' })).toBeVisible();
    await list.switchView('جدول');
    await list.search('بحث في المسميات').fill(data.child);
    const row = rowOf(page, data.child);
    await expect(row.getByText('L7', { exact: true })).toBeVisible();
    await expect(row.getByText('مهني', { exact: true })).toBeVisible();
    await expect(row.getByText(/-L7P-\d\d$/)).toBeVisible();
    const code = (await row.getByText(/-L7P-\d\d$/).innerText()).trim();
    await list.search('بحث في المسميات').fill(code); // by its code
    await expect(rowOf(page, data.child)).toBeVisible();
    await expect(rowOf(page, data.parent)).toHaveCount(0);
    await list.search('بحث في المسميات').fill(data.tag);
    await expect(rowOf(page, data.parent)).toBeVisible();
    await list.openFilters();
    await choose(page.getByRole('combobox', { name: 'الدرجة' }), 'L5');
    await expect(rowOf(page, data.parent)).toBeVisible();
    await expect(rowOf(page, data.child)).toHaveCount(0);
    await choose(page.getByRole('combobox', { name: 'الدرجة' }), 'الكل');
    await choose(page.getByRole('combobox', { name: 'الشاغر' }), 'شاغر (بلا شاغل)');
    await expect(rowOf(page, data.free)).toBeVisible();
    await expect(rowOf(page, data.child)).toHaveCount(0);
    await choose(page.getByRole('combobox', { name: 'الشاغر' }), 'عليه شاغلون');
    await expect(rowOf(page, data.child)).toBeVisible();
    await expect(rowOf(page, data.free)).toHaveCount(0);
    await choose(page.getByRole('combobox', { name: 'المسار' }), 'إدارة');
    await expect(rowOf(page, data.parent)).toBeVisible();
    await expect(rowOf(page, data.child)).toHaveCount(0);
    await list.expectNoSeriousA11yIssues();
  });

  test('shows the same list as cards, remembers the choice, and is accessible in both', async ({ page }, info) => {
    const data = await sample(page, info.project.name);
    const list = new ListPage(page);
    await page.goto('/job-titles');
    await list.switchView('جدول');
    await list.search('بحث في المسميات').fill(data.child);
    await expect(page.getByRole('table')).toBeVisible();
    await list.expectNoSeriousA11yIssues();
    await list.switchView('بطاقات');
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(page.getByText(data.child).first()).toBeVisible();
    await list.expectNoSeriousA11yIssues();
    await page.reload();
    await expect(page.getByRole('button', { name: 'بطاقات', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });

  test('is not offered to an employee: with admin mode off the page shows the no-permission page and no title is read (decision 267)', async ({ page }) => {
    await adminModeOffViaApi(page);
    await page.goto('/job-titles');
    await expect(page.getByRole('heading', { level: 1, name: 'ليس لديك صلاحية للدخول إلى هذه الصفحة' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'إضافة مسمى', exact: true })).toHaveCount(0);
    await adminModeOnViaApi(page);
    await page.goto('/job-titles');
    await expect(page.getByRole('heading', { level: 1, name: 'المسميات الوظيفية' })).toBeVisible();
  });
});

test.describe('Job titles page: the card, its content and its manager chain (FR-104, FR-106, FR-107)', () => {
  test('opens the card on a click: the code slots, grade, track, stage, who it reports to, and the manager found in the chain', async ({ page }, info) => {
    const data = await sample(page, info.project.name);
    const list = new ListPage(page);
    await page.goto('/job-titles');
    await list.search('بحث في المسميات').fill(data.child);
    await page.getByText(data.child).first().click();
    const card = page.getByRole('dialog', { name: data.child });
    await expect(card.getByRole('group', { name: 'معنى الرمز' }).getByText('L7P')).toBeVisible();
    await expect(card.getByText(/التخصص: 48 ساعة في السنة، وحد ميزانية 5,000 ريال/)).toBeVisible();
    await expect(card.getByText(data.parent).first()).toBeVisible(); // the line it reports to
    const chain = card.getByRole('list', { name: 'سلسلة المدير المباشر' });
    await expect(chain.locator('[data-state="found"]')).toContainText(`المدير المباشر: ${data.manager} (1 شاغل)`);
    await expect(card.getByText(/لم يُدخل محتوى هذا المسمى بعد/)).toBeVisible();
    await list.expectNoSeriousA11yIssues();
    await card.getByRole('button', { name: 'إغلاق' }).first().click();
    await expect(card).toBeHidden();
  });

  test('says «HR decides» for a grade and track with no stage rule, and the title nobody holds shows no manager', async ({ page }, info) => {
    const data = await sample(page, info.project.name);
    await page.goto('/job-titles');
    await new ListPage(page).search('بحث في المسميات').fill(data.free);
    await page.getByText(data.free, { exact: true }).first().click();
    const card = page.getByRole('dialog', { name: data.free });
    await expect(card.getByText(/لا قاعدة لهذه الدرجة والمسار بعد: تحدده الموارد البشرية/)).toBeVisible();
    await expect(card.getByText('شاغر', { exact: true })).toBeVisible();
  });

  test('edits the content of a title from its row, and the card shows it', async ({ page }, info) => {
    const data = await sample(page, info.project.name);
    const list = new ListPage(page);
    await page.goto('/job-titles');
    await list.search('بحث في المسميات').fill(data.child);
    await page.getByRole('button', { name: new RegExp(`^تعديل المحتوى: ${data.child}`) }).click();
    const dialog = page.getByRole('dialog', { name: 'تعديل محتوى المسمى' });
    await dialog.getByLabel('المسؤوليات: العربية').fill('وضع خطة الحملات\nمتابعة النتائج');
    await dialog.getByLabel('المؤهلات: English').fill('Bachelor in marketing');
    await dialog.getByLabel('مؤشرات الأداء: العربية').fill('عائد الحملة');
    await list.expectNoSeriousA11yIssues();
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    await expect(dialog).toBeHidden();
    await page.getByText(data.child).first().click();
    const card = page.getByRole('dialog', { name: data.child });
    await expect(card.getByText('وضع خطة الحملات')).toBeVisible();
    await expect(card.getByText('Bachelor in marketing')).toBeVisible();
    await expect(card.getByText('عائد الحملة')).toBeVisible();
    await expect(card.getByText(/لم يُدخل محتوى هذا المسمى بعد/)).toHaveCount(0);
  });

  test('adds a title from the page: first the unit, then the form with its grade, track and reporting line', async ({ page }, info) => {
    const data = await sample(page, info.project.name);
    const name = `مسمى جديد ${uniqueTag(info.project.name)}`;
    const list = new ListPage(page);
    await page.goto('/job-titles');
    await list.switchView('جدول');
    await page.getByRole('button', { name: 'إضافة مسمى', exact: true }).click();
    const pick = page.getByRole('dialog', { name: 'إضافة مسمى وظيفي' });
    await expect(pick.getByRole('button', { name: 'التالي' })).toBeDisabled();
    await choose(pick.getByRole('combobox', { name: 'الوحدة' }), UNIT);
    await pick.getByRole('button', { name: 'التالي' }).click();
    const form = page.getByRole('dialog', { name: 'إضافة مسميات وظيفية' });
    await form.getByLabel('الاسم بالعربي').fill(name);
    await form.getByLabel('الاسم بالإنجليزي').fill(`New title ${name}`);
    await choose(form.getByLabel('الدرجة *'), 'L6');
    await choose(form.getByLabel('المسار *'), 'مشاريع');
    await choose(form.getByRole('combobox', { name: 'يرفع إلى' }), new RegExp(data.parent));
    await list.expectNoSeriousA11yIssues();
    await form.getByRole('button', { name: 'حفظ' }).click();
    await expect(form).toBeHidden();
    await list.search('بحث في المسميات').fill(name);
    await expect(rowOf(page, name).getByText('L6', { exact: true })).toBeVisible();
    await expect(rowOf(page, name).getByText('مشاريع', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: new RegExp(`^حذف: ${name}`) }).click();
    await page.getByRole('dialog', { name: 'حذف المسمى؟' }).getByRole('button', { name: 'حذف' }).click();
    await expect(rowOf(page, name)).toHaveCount(0);
  });
});

test.describe('Job titles page: import and export (FR-107)', () => {
  test('previews a file with the server’s dry run: the good row and the refused one with its number and reason, then imports the good one', async ({ page }, info) => {
    await sample(page, info.project.name);
    const unit = await unitNamed(page, UNIT);
    const name = `مسمى مستورد ${uniqueTag(info.project.name)}`;
    const csv = ['رمز الوحدة,الاسم بالعربي,الاسم بالإنجليزي,الدرجة,المسار', `${unit.code},${name},Imported title,L6,مهني`, 'ZZZ.00.00.00,مسمى مرفوض,Refused title,L6,مهني'].join('\r\n');
    const list = new ListPage(page);
    await page.goto('/job-titles');
    await list.switchView('جدول');
    await page.getByRole('button', { name: 'استيراد', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'استيراد بيانات' });
    await expect(dialog.getByRole('button', { name: 'تنزيل القالب' })).toBeVisible();
    await list.expectNoSeriousA11yIssues();
    await dialog.locator('input[type=file]').setInputFiles({ name: 'titles.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await expect(dialog.getByText(/1 صف سليم، 1 صف فيه أخطاء من أصل 2/)).toBeVisible();
    await expect(dialog.getByText(/مسميات جديدة: 1 · مُعدَّلة: 0 · بلا تغيير: 0/)).toBeVisible();
    await expect(dialog.getByText(/الصف 3/).locator('..')).toContainText('لا توجد وحدة بهذا الرمز.');
    await list.expectNoSeriousA11yIssues();
    await dialog.getByRole('button', { name: 'استيراد 1 صف' }).click();
    await expect(dialog.getByText('تم استيراد 1 صف، وفشل 0.')).toBeVisible();
    await dialog.getByRole('button', { name: 'تم' }).click();
    await list.search('بحث في المسميات').fill(name);
    await expect(rowOf(page, name)).toBeVisible();
  });

  test('downloads the template and exports the rows of the list', async ({ page }, info) => {
    const data = await sample(page, info.project.name);
    const list = new ListPage(page);
    await page.goto('/job-titles');
    await list.search('بحث في المسميات').fill(data.tag);
    await page.getByRole('button', { name: 'استيراد', exact: true }).click();
    const template = await list.downloadFrom('تنزيل القالب');
    expect(template.suggestedFilename()).toBe('job-titles-template.xlsx');
    await page.getByRole('dialog').getByRole('button', { name: 'إغلاق' }).first().click();
    await page.getByRole('button', { name: 'تصدير', exact: true }).click();
    await page.getByRole('dialog').getByLabel(/ملف CSV/).check();
    const file = await list.downloadFrom('تصدير');
    expect(file.suggestedFilename()).toMatch(/^job-titles.*\.csv$/);
  });
});

test.describe('Job titles page: both themes and both languages (FR-33)', () => {
  for (const [theme, language] of [['dark', 'ar'], ['light', 'en'], ['dark', 'en']] as const) {
    test(`the list and the card have no serious accessibility violations in the ${theme} theme in ${language}`, async ({ page }, info) => {
      const data = await sample(page, info.project.name);
      await page.addInitScript(([t, l]) => { localStorage.setItem('theme', t as string); localStorage.setItem('arweqah.language', l as string); }, [theme, language]);
      const list = new ListPage(page);
      await page.goto('/job-titles');
      await expect(page.getByRole('heading', { level: 1, name: language === 'en' ? 'Job titles' : 'المسميات الوظيفية' })).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'en' ? 'ltr' : 'rtl');
      await list.search(language === 'en' ? 'Search job titles' : 'بحث في المسميات').fill(data.tag);
      await expect(page.getByText(data.child).first()).toBeVisible();
      await list.expectNoSeriousA11yIssues();
      await page.getByText(data.child).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('list', { name: language === 'en' ? 'Direct manager chain' : 'سلسلة المدير المباشر' })).toBeVisible();
      await list.expectNoSeriousA11yIssues();
    });
  }
});

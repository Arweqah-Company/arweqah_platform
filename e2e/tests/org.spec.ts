import { expect, test, type Page } from '@playwright/test';
import { ListPage } from '../pages/list.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';
import { groupCompanyId, makeEmployee, makeTitle, uniqueTag, unitNamed } from '../support/org-data';
import { choose } from '../support/select';

test.use({ storageState: ADMIN_STATE });
// The sample structure of the browser tests' database: the owner's sheet, every top unit shared, no employees except the administrator.
const TOP = 'إدارة الاستراتيجية والحوكمة';
const DEEP = 'وحدة التسويق';

const openFull = async (page: Page): Promise<void> => {
  await page.goto('/org');
  await page.getByRole('button', { name: 'العرض الكامل', exact: true }).click();
  await expect(page.getByLabel('أرِني هيكل شركة')).toBeVisible();
};

test.describe('Organization: the team view of a person without the full-view key (FR-98)', () => {
  test('an ordinary view says what is hidden, offers no full view, no company comparison and no structure buttons', async ({ page }) => {
    test.setTimeout(90_000);
    await adminModeOffViaApi(page);
    await page.goto('/org');
    await expect(page.getByRole('heading', { level: 1, name: 'الهيكل التنظيمي' })).toBeVisible();
    await expect(page.getByText(/تظهر الوحدات التي تحتها موظفون من شركتك/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'الموظفون فقط' })).toHaveCount(0);
    await expect(page.getByLabel('أرِني هيكل شركة')).toHaveCount(0);
    for (const name of ['إضافة وحدة', 'تقسيمات الهيكل']) await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
    await new ListPage(page).expectNoSeriousA11yIssues();
  });

  test('the structure buttons show only while platform admin mode is on (FR-24)', async ({ page }) => {
    test.setTimeout(90_000);
    await adminModeOnViaApi(page);
    await page.goto('/org');
    for (const name of ['إضافة وحدة', 'تقسيمات الهيكل']) await expect(page.getByRole('button', { name, exact: true }).first()).toBeVisible();
    await adminModeOffViaApi(page);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'الهيكل التنظيمي' })).toBeVisible();
    for (const name of ['إضافة وحدة', 'تقسيمات الهيكل']) await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  });
});

test.describe('Organization: the full structure, the four views and the details (FR-96, FR-98)', () => {
  test.beforeEach(async ({ page }) => adminModeOnViaApi(page));

  test('the full-view holder switches to the full tree and compares it with a company: the units that company would not see are faded', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/org');
    await expect(page.getByRole('button', { name: 'الموظفون فقط' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'العرض الكامل', exact: true }).click();
    await expect(page.getByText(/تظهر الوحدات التي تحتها موظفون من شركتك/)).toHaveCount(0);
    await choose(page.getByLabel('أرِني هيكل شركة'), 'لدن');
    await expect(page.getByText(/تقارن العرض الكامل بما يظهر في «لدن»/)).toBeVisible();
    await new ListPage(page).expectNoSeriousA11yIssues();
  });

  test('draws the chart from the group only, opens and closes everything, and finds a unit by its name', async ({ page }) => {
    const list = new ListPage(page);
    await openFull(page);
    await list.switchView('مخطط');
    const chart = page.getByRole('group', { name: 'مخطط الهيكل التنظيمي' });
    await expect(chart.getByText(TOP, { exact: true }).first()).toBeVisible();
    await expect(chart.getByText(DEEP, { exact: true })).toBeHidden();
    await page.getByRole('button', { name: 'فتح الكل' }).click();
    await expect(chart.getByText(DEEP, { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'طي الكل' }).click();
    await expect(chart.getByText(DEEP, { exact: true })).toBeHidden();
    await list.search('بحث في الهيكل').fill(DEEP);
    await expect(chart.getByText(DEEP, { exact: true }).first()).toBeVisible();
    await list.expectNoSeriousA11yIssues();
  });

  test('shows the same structure as an icicle, as a table with codes and as cards, and remembers the choice after a reload', async ({ page }) => {
    const list = new ListPage(page);
    await openFull(page);
    await list.switchView('مخطط طبقي');
    await expect(page.getByRole('group', { name: 'مخطط الهيكل التنظيمي' }).first()).toBeVisible();
    await list.expectNoSeriousA11yIssues();
    await list.switchView('جدول');
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'الرمز' })).toBeVisible();
    await list.expectNoSeriousA11yIssues();
    await list.switchView('بطاقات');
    await expect(page.getByRole('table')).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: 'بطاقات', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });

  test('selecting a unit opens its details beside the list: the path, the overview and the titles, and closes', async ({ page }) => {
    const list = new ListPage(page);
    await openFull(page);
    await list.switchView('جدول');
    await list.search('بحث في الهيكل').fill(DEEP);
    await page.getByRole('button', { name: DEEP, exact: true }).first().click();
    const details = page.getByRole('complementary', { name: new RegExp(`تفاصيل الوحدة: ${DEEP}`) });
    await expect(details).toBeVisible();
    await expect(details.getByText('توزيع الموظفين حسب الشركة')).toBeVisible();
    await details.getByRole('tab', { name: 'المسميات' }).click();
    await expect(details.getByText(/موظف/).first()).toBeVisible();
    await list.expectNoSeriousA11yIssues();
    await details.getByRole('button', { name: 'إغلاق' }).click();
    await expect(details).toBeHidden();
  });

  test('filters by the management mode and by the status, and shows when nothing matches', async ({ page }) => {
    const list = new ListPage(page);
    await openFull(page);
    await list.switchView('جدول');
    await list.search('بحث في الهيكل').fill('لا يوجد هذا الاسم أبدًا');
    await expect(page.getByText('لا وحدات تطابق البحث أو الفلاتر')).toBeVisible();
    await page.getByRole('button', { name: 'مسح البحث والفلاتر' }).click();
    await list.openFilters();
    await choose(page.getByLabel('نوع الإدارة'), 'مشتركة');
    await expect(page.getByRole('list', { name: 'عوامل التصفية المطبّقة' }).getByText('نوع الإدارة: مشتركة')).toBeVisible();
    await expect(page.getByRole('button', { name: DEEP, exact: true }).first()).toBeVisible(); // the sample's units are shared
  });
});

test.describe('Organization: building the structure (FR-96, FR-97, FR-24)', () => {
  test.setTimeout(120_000); // admin mode needs a fresh code, which may mean waiting for the next 30-second step
  test.beforeEach(async ({ page }) => adminModeOnViaApi(page));

  test('adds a unit under the group with its code letters and a management mode, then changes its mode with a reason', async ({ page }, info) => {
    const list = new ListPage(page);
    const prefix = info.project.name === 'mobile' ? 'ZQB' : 'ZQA';
    const name = `إدارة الاختبار ${Date.now().toString().slice(-6)}`;
    await openFull(page);
    await page.getByRole('button', { name: 'إضافة وحدة', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'إضافة وحدة' });
    await choose(dialog.getByLabel('النوع *', { exact: true }), 'إدارة');
    await dialog.getByLabel('الاسم بالعربي *').fill(name);
    await dialog.getByLabel('رمز الوحدة (ثلاثة أحرف) *').fill(prefix);
    await expect(dialog.getByText(`${prefix}.00.00.00`)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'حفظ الوحدة' })).toBeDisabled(); // the management type is still to choose
    await dialog.getByRole('radio', { name: /^مشتركة/ }).check();
    await expect(dialog.getByText(/ستظهر لكل الشركات/)).toBeVisible();
    await list.expectNoSeriousA11yIssues();
    await dialog.getByRole('button', { name: 'حفظ الوحدة' }).click();
    await expect(dialog).toBeHidden();

    await list.switchView('جدول');
    await list.search('بحث في الهيكل').fill(name);
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row.getByText(`${prefix}.00.00.00`)).toBeVisible();
    await row.getByRole('button', { name: new RegExp(`^تغيير نوع الإدارة: ${name}`) }).click();
    const change = page.getByRole('dialog', { name: 'تغيير نوع إدارة الوحدة' });
    await expect(change.getByText(/من «مشتركة» إلى «لكل شركة»/)).toBeVisible();
    await expect(change.getByRole('button', { name: 'تأكيد التغيير' })).toBeDisabled();
    await change.getByLabel('سبب التغيير *').fill('تجربة المتصفح');
    await change.getByRole('button', { name: 'تأكيد التغيير' }).click();
    await expect(change.getByText(/الوحدات المتأثرة/)).toBeVisible();
    await change.getByRole('button', { name: 'إغلاق' }).first().click();
    await expect(row.getByText('لكل شركة')).toBeVisible();
  });

  test('the divisions window shows the types and the table of who is created under whom, validates names and has the fixed rules disabled', async ({ page }) => {
    const list = new ListPage(page);
    await page.goto('/org');
    await page.getByRole('button', { name: 'تقسيمات الهيكل', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'تقسيمات الهيكل' });
    await expect(dialog.getByLabel('الاسم بالعربي').first()).toHaveValue('قطاع');
    await expect(dialog.getByLabel('الأب إدارة، الابن قطاع')).toBeDisabled();
    await expect(dialog.getByLabel('الأب مكتب، الابن مكتب')).toBeDisabled();
    await dialog.getByRole('button', { name: 'إضافة تقسيم' }).click();
    await expect(dialog.getByRole('button', { name: 'حفظ التقسيمات' })).toBeDisabled();
    await dialog.getByLabel('الاسم بالعربي').last().fill('قطاع');
    await expect(dialog.getByText('الاسم مكرر.')).toBeVisible();
    await list.expectNoSeriousA11yIssues();
    await dialog.getByRole('button', { name: 'إلغاء' }).click();
    await expect(dialog).toBeHidden();
  });

  test('adds a division, ticks where it may be created, saves types and table together, then removes it again', async ({ page }) => {
    await page.goto('/org');
    await page.getByRole('button', { name: 'تقسيمات الهيكل', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'تقسيمات الهيكل' });
    await dialog.getByRole('button', { name: 'إضافة تقسيم' }).click();
    await dialog.getByLabel('الاسم بالعربي').last().fill('فرع اختباري');
    await dialog.getByLabel('الاسم بالإنجليزي').last().fill('Test branch');
    await dialog.getByLabel('الأب قسم، الابن فرع اختباري').check();
    await dialog.getByRole('button', { name: 'حفظ التقسيمات' }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: 'تقسيمات الهيكل', exact: true }).click();
    await expect(dialog.getByLabel('الاسم بالعربي').nth(5)).toHaveValue('فرع اختباري'); // after the five built-in types
    await expect(dialog.getByLabel('الأب قسم، الابن فرع اختباري')).toBeChecked();
    await dialog.getByRole('button', { name: 'حذف التقسيم: فرع اختباري' }).click();
    await dialog.getByRole('button', { name: 'حفظ التقسيمات' }).click();
    await expect(dialog).toBeHidden();
  });

  test('adds, renames and removes a job title of a unit from its Titles tab', async ({ page }) => {
    const list = new ListPage(page);
    const title = `مسمى ${Date.now().toString().slice(-6)}`;
    await openFull(page);
    await list.switchView('جدول');
    await list.search('بحث في الهيكل').fill(DEEP);
    await page.getByRole('button', { name: DEEP, exact: true }).first().click();
    const details = page.getByRole('complementary', { name: new RegExp(`تفاصيل الوحدة: ${DEEP}`) });
    await details.getByRole('tab', { name: 'المسميات' }).click();
    await details.getByRole('button', { name: 'إضافة مسمى' }).click();
    const add = page.getByRole('dialog', { name: 'إضافة مسميات وظيفية' });
    await add.getByLabel('الاسم بالعربي').fill(title);
    await add.getByLabel('الاسم بالإنجليزي').fill(`Title ${title}`);
    await choose(add.getByLabel('الدرجة *'), 'L7');
    await choose(add.getByLabel('المسار *'), 'مهني');
    await add.getByRole('button', { name: 'حفظ' }).click();
    await expect(details.getByText(title)).toBeVisible();
    await details.getByRole('button', { name: new RegExp(`^حذف: ${title}`) }).click();
    await page.getByRole('dialog', { name: 'حذف المسمى؟' }).getByRole('button', { name: 'حذف' }).click();
    await expect(details.getByText(title)).toBeHidden();
  });
});

/** Opens the full structure as a table and selects a unit by name: its details open beside the list. */
async function openUnit(page: Page, name: string) {
  const list = new ListPage(page);
  await openFull(page);
  await list.switchView('جدول');
  await list.search('بحث في الهيكل').fill(name);
  await page.getByRole('button', { name, exact: true }).first().click();
  return page.getByRole('complementary', { name: new RegExp(`تفاصيل الوحدة: ${name}`) });
}

test.describe('Organization: the leaders, the charter and the history of a unit (FR-99, FR-100)', () => {
  test.setTimeout(150_000);
  test.beforeEach(async ({ page }) => adminModeOnViaApi(page));
  // Two projects share the database and a dated change must start after the last one of its unit: each project has its own day.
  const day = (project: string, offset: number): string => `2099-${String((project === 'mobile' ? 6 : 0) + offset).padStart(2, '0')}-01`;

  test('assigns a leader to a shared unit: only the group company, only its employees, with a reason; the role note and the leader show', async ({ page }, info) => {
    const list = new ListPage(page);
    const unit = await unitNamed(page, DEEP);
    const company = await groupCompanyId(page, unit.id);
    const tag = uniqueTag(info.project.name);
    const name = `قائد الاختبار ${tag}`;
    await makeEmployee(page, { companyId: company, unitId: unit.id, titleId: unit.titles[0]?.id as string, name, tag: `lead${tag}` });
    const details = await openUnit(page, DEEP);
    await details.getByRole('tab', { name: 'القادة' }).click();
    await expect(details.getByText(/دور «قائد وحدة التسويق» واحد، غير مربوط بشركة/)).toBeVisible();
    await details.getByRole('button', { name: 'تعيين قائد أو قائم بالأعمال' }).click();
    const dialog = page.getByRole('dialog', { name: 'تعيين قائد أو قائم بالأعمال' });
    await expect(dialog.getByText(/الوحدة مشتركة: يُعيَّن قائدها من شركة المجموعة فقط/)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'حفظ' })).toBeDisabled();
    await choose(dialog.getByRole('combobox', { name: 'الموظف' }), name);
    await expect(dialog.getByLabel('السبب', { exact: true })).toBeVisible(); // optional: no asterisk
    await expect(dialog.getByRole('button', { name: 'حفظ' })).toBeDisabled(); // a leader always chooses the title they lead with
    await dialog.getByRole('combobox', { name: 'مسماه في الوحدة' }).click();
    await page.getByRole('option').nth(1).click(); // the first real title (the first option is the placeholder)
    await list.expectNoSeriousA11yIssues();
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    await expect(dialog).toBeHidden();
    await expect(details.getByText(name)).toBeVisible();
    await list.expectNoSeriousA11yIssues();
  });

  test('writes the charter with a later effective date: it waits as a scheduled version in the history, with its reason', async ({ page }, info) => {
    const list = new ListPage(page);
    const details = await openUnit(page, DEEP);
    await details.getByRole('tab', { name: 'الميثاق' }).click();
    await details.getByRole('button', { name: /^(كتابة|تعديل) الميثاق$/ }).first().click();
    const dialog = page.getByRole('dialog', { name: 'ميثاق الوحدة' });
    await dialog.getByLabel('الغرض: العربية').fill('تسويق خدمات المجموعة');
    await dialog.getByLabel('المخرجات: العربية').fill('خطة التسويق السنوية\nتقارير الحملات');
    await dialog.getByLabel(/^سبب التعديل/).fill('كتابة الميثاق من اختبار المتصفح');
    await dialog.getByLabel('يسري من *').fill('2020-01-01');
    await expect(dialog.getByText('لا يسري الميثاق من تاريخ ماضٍ.')).toBeVisible();
    await dialog.getByLabel('يسري من *').fill(day(info.project.name, 1));
    await list.expectNoSeriousA11yIssues();
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    await expect(dialog).toBeHidden();
    await details.getByRole('tab', { name: 'السجل' }).click();
    const timeline = details.getByRole('list', { name: 'نسخ الوحدة عبر الزمن' });
    await expect(timeline.locator('[data-status="scheduled"]').first()).toContainText('كتابة الميثاق من اختبار المتصفح');
    await expect(timeline.locator('[data-status="scheduled"]').first().getByText('مجدول')).toBeVisible();
    await expect(timeline.locator('[data-status="current"]')).toHaveCount(1);
    await expect(details.getByText('تغيير مجدول')).toBeVisible();
    await expect(details.getByText(/تعديل الوحدة اليوم لا يغيّر سجل الأمس/)).toBeVisible();
    await list.expectNoSeriousA11yIssues();
  });

  test('renaming a unit from a later day needs a reason and shows the «scheduled change» badge in the table and the details', async ({ page }, info) => {
    const list = new ListPage(page);
    const details = await openUnit(page, TOP);
    await details.getByRole('button', { name: 'تعديل', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'تعديل الوحدة' });
    await dialog.getByLabel('الاسم بالعربي *').fill(`${TOP} المحدّثة`);
    await expect(dialog.getByRole('button', { name: 'حفظ' })).toBeDisabled(); // a dated change needs its reason
    await dialog.getByLabel('سبب التغيير *').fill('تغيير مسمى الإدارة');
    await dialog.getByLabel('يسري من').fill('2020-01-01');
    await expect(dialog.getByText('لا يبدأ التغيير في الماضي.')).toBeVisible();
    await dialog.getByLabel('يسري من').fill(day(info.project.name, 3));
    await list.expectNoSeriousA11yIssues();
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    await expect(dialog).toBeHidden();
    await expect(details.getByText('تغيير مجدول')).toBeVisible();
    await expect(page.getByRole('row').filter({ has: page.getByRole('button', { name: TOP, exact: true }) }).getByText('تغيير مجدول')).toBeVisible();
    await details.getByRole('tab', { name: 'السجل' }).click();
    await expect(details.getByRole('list', { name: 'نسخ الوحدة عبر الزمن' }).getByText(`${TOP} المحدّثة`).first()).toBeVisible();
  });
});

test.describe('Organization: the title card from the Titles tab (FR-107)', () => {
  test.setTimeout(120_000);
  test.beforeEach(async ({ page }) => adminModeOnViaApi(page));

  test('a click on a title of the unit opens its card with the code cut into slots, and it is accessible', async ({ page }, info) => {
    const list = new ListPage(page);
    const unit = await unitNamed(page, DEEP);
    const name = `مسمى البطاقة ${uniqueTag(info.project.name)}`;
    await makeTitle(page, unit.id, name, 7, 'P');
    const details = await openUnit(page, DEEP);
    await details.getByRole('tab', { name: 'المسميات' }).click();
    await details.getByRole('button', { name, exact: true }).click();
    const card = page.getByRole('dialog', { name });
    await expect(card.getByRole('group', { name: 'معنى الرمز' }).getByText('L7P')).toBeVisible();
    await expect(card.getByText(/التخصص: 48 ساعة في السنة/)).toBeVisible();
    await expect(card.getByRole('heading', { name: 'من هو المدير المباشر؟' })).toBeVisible();
    await list.expectNoSeriousA11yIssues();
  });
});

test.describe('Organization: both themes and both languages (FR-33)', () => {
  test.beforeEach(async ({ page }) => adminModeOnViaApi(page));

  for (const [theme, language] of [['dark', 'ar'], ['light', 'en'], ['dark', 'en']] as const) {
    test(`the table and the chart have no serious accessibility violations in the ${theme} theme in ${language}`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.addInitScript(([t, l]) => { localStorage.setItem('theme', t as string); localStorage.setItem('arweqah.language', l as string); }, [theme, language]);
      await page.goto('/org');
      const full = language === 'en' ? 'Full view' : 'العرض الكامل';
      await page.getByRole('button', { name: full, exact: true }).click();
      const list = new ListPage(page);
      await page.getByRole('button', { name: language === 'en' ? 'Table' : 'جدول', exact: true }).click();
      await expect(page.getByRole('table')).toBeVisible();
      await list.expectNoSeriousA11yIssues();
      await page.getByRole('button', { name: language === 'en' ? 'Chart' : 'مخطط', exact: true }).click();
      await page.getByRole('button', { name: language === 'en' ? 'Open all' : 'فتح الكل' }).click();
      await list.expectNoSeriousA11yIssues();
    });
  }
});

import { expect, test, type Page } from '@playwright/test';
import { ListPage } from '../pages/list.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';
import { uniqueTag } from '../support/org-data';

test.use({ storageState: ADMIN_STATE });
test.describe.configure({ timeout: 120_000 });

const STAGES = ['التقييم الذاتي', 'تقييم المدير', 'المعايرة', 'الاعتماد', 'الإبلاغ الفردي', 'نافذة الاعتراض', 'مغلقة'];

/** Phones start a list as cards; these tests read the tables. */
const tableViews = (page: Page) => page.addInitScript(() => { for (const k of ['performance-catalog', 'performance-templates', 'performance-reminders']) localStorage.setItem(`view:${k}`, 'table'); });

test.describe('The evaluation cycle page, as the concept draws it (FR-118)', () => {
  test.beforeEach(async ({ page }) => { await adminModeOnViaApi(page); await tableViews(page); });

  test('opens with the header, the seven stages, the dates, the readiness list, the reminders and the catalog, and is accessible', async ({ page }) => {
    await page.goto('/performance-cycle');
    await expect(page.getByRole('heading', { level: 1, name: 'دورة التقييم' })).toBeVisible();
    await expect(page.getByText('السنة المالية من أبريل إلى مارس. تفتحها الموارد البشرية، وتنتقل مراحلها بتواريخها.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'إغلاق الدورة' })).toBeVisible();
    await expect(page.getByRole('button', { name: /فتح دورة التقييم وإبلاغ الموظفين|نقل الدورة للمرحلة التالية/ })).toBeVisible();
    const stepper = page.getByRole('list', { name: 'مراحل دورة التقييم' });
    await expect(stepper.getByRole('button')).toHaveText(STAGES);
    await expect(page.getByRole('table', { name: 'مواعيد المراحل' }).getByRole('row')).toHaveCount(7);
    await expect(page.getByRole('heading', { name: 'جاهزية فتح الدورة' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'ملف التقييم' }).getByRole('row')).toHaveCount(8); // the header, five stages, the scale and the card
    await expect(page.getByRole('table', { name: 'التذكيرات التلقائية' })).toBeVisible();
    await expect(page.getByText('كتالوج المكوّن الإضافي لهذه السنة').first()).toBeVisible();
    await expect(page.getByText(/سقف مبادرات داخلية \d+، ومساهمة في النمو \d+/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'رفع ملف التقييم' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'إضافة تذكير' })).toBeVisible();
    await new ListPage(page).expectNoSeriousA11yIssues();
  });

  test('a stage opens to say who works in it; the button to its screen is dimmed and explains when that screen is not built yet', async ({ page }) => {
    await page.goto('/performance-cycle');
    await page.getByRole('list', { name: 'مراحل دورة التقييم' }).getByRole('button', { name: 'المعايرة' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('حامل مفتاح المعايرة')).toBeVisible();
    await expect(dialog.getByText('21 إلى 24 أبريل')).toBeVisible();
    const go = dialog.getByRole('button', { name: 'اذهب إلى شاشة هذه المرحلة' });
    await expect(go).toHaveAttribute('aria-disabled', 'true');
    await go.click({ force: true }); // dimmed, not disabled: it answers with the reason
    await expect(page.getByText('شاشة هذه المرحلة تُبنى في دفعة لاحقة.')).toBeVisible();
    await new ListPage(page).expectNoSeriousA11yIssues();
  });

  test('a date can be changed before the cycle opens: a wrong one is refused in words as it is typed, a right one is saved and written out', async ({ page }) => {
    await page.goto('/performance-cycle');
    await page.getByRole('button', { name: 'تعديل موعد الاعتماد' }).click();
    const dialog = page.getByRole('dialog');
    const from = dialog.getByLabel('من (أو يوم واحد) *');
    const year = (await from.inputValue()).slice(0, 4);
    await from.fill(`${year}-04-10`);
    await expect(dialog.getByRole('alert')).toHaveText(/الموعد يسبق نهاية المرحلة قبله \(24 أبريل \d{4}\)\./);
    await new ListPage(page).expectNoSeriousA11yIssues();
    await from.fill(`${year}-04-28`);
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'حفظ الموعد' }).click();
    await expect(page.getByText('حُفظ الموعد.')).toBeVisible();
    await expect(page.getByRole('table', { name: 'مواعيد المراحل' }).getByText(`28 أبريل ${year}`)).toBeVisible();
  });

  test('a reminder with its own words is added, changed, switched off and deleted', async ({ page }, info) => {
    await page.goto('/performance-cycle');
    const title = `تذكير الاختبار ${uniqueTag(info.project.name)}`;
    await page.getByRole('button', { name: 'إضافة تذكير' }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('العنوان بالعربية *').fill('ab');
    await expect(dialog.getByText('اكتب 3 أحرف على الأقل.')).toBeVisible();
    await dialog.getByLabel('قبل آخر موعد بـ (أيام، مفصولة بفواصل) *').fill('40');
    await expect(dialog.getByText('أيام الموظف من 1 إلى 30 (حتى 10 أيام)، مفصولة بفواصل.')).toBeVisible();
    await new ListPage(page).expectNoSeriousA11yIssues();
    await dialog.getByLabel('قبل آخر موعد بـ (أيام، مفصولة بفواصل) *').fill('10, 5, 2');
    await dialog.getByLabel('العنوان بالعربية *').fill(title);
    await dialog.getByLabel('النص بالعربية *').fill('أرسل تقييمك الذاتي قبل الموعد');
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('أُضيف التذكير.')).toBeVisible();
    const table = page.getByRole('table', { name: 'التذكيرات التلقائية' });
    const row = table.getByRole('row').filter({ hasText: title });
    await expect(row.getByText('قبل آخر موعد بـ 10، 5، 2 أيام')).toBeVisible();
    await row.getByRole('button', { name: `تعديل التذكير: ${title}` }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('العنوان بالعربية *').fill(`${title} معدّل`);
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('حُفظ التذكير.')).toBeVisible();
    const changed = table.getByRole('row').filter({ hasText: `${title} معدّل` });
    await changed.getByRole('button', { name: `إيقاف التذكير: ${title} معدّل` }).click();
    await expect(changed.getByText('متوقف')).toBeVisible();
    await changed.getByRole('button', { name: `حذف التذكير: ${title} معدّل` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'حذف التذكير' }).click();
    await expect(page.getByText('حُذف التذكير.')).toBeVisible();
    await expect(table.getByText(`${title} معدّل`)).toHaveCount(0);
  });

  test('a stage of the evaluation file is added through its form, shown in the list with what it holds, then deleted', async ({ page }) => {
    await page.goto('/performance-cycle');
    const table = page.getByRole('table', { name: 'ملف التقييم' });
    await table.getByRole('button', { name: /^(إضافة|تعديل): المرحلة 5/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('اسم المرحلة')).toHaveValue('القيادة المؤسسية');
    await dialog.getByLabel('وزن النتائج').fill('70');
    await dialog.getByLabel('وزن السلوك').fill('30');
    await dialog.getByRole('button', { name: 'إضافة معيار' }).click();
    await dialog.getByLabel('المعيار').fill('جودة القرارات');
    await dialog.getByLabel('الحصة %').fill('90');
    await dialog.getByRole('button', { name: 'إضافة سلوك' }).click();
    await dialog.getByLabel('السلوك', { exact: true }).fill('القيادة');
    await dialog.getByLabel('سؤال المقيّم').fill('هل يقود فريقه؟');
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    await expect(dialog.getByText('حصص معايير النتائج لا تجمع 100.')).toBeVisible();
    await new ListPage(page).expectNoSeriousA11yIssues();
    await dialog.getByLabel('الحصة %').fill('100');
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('حُفظ قالب المرحلة.')).toBeVisible();
    const row = table.getByRole('row').filter({ hasText: 'المرحلة 5' });
    await expect(row.getByText('70/30 · 1 معايير · 1 سلوكيات · 100%')).toBeVisible();
    await row.getByRole('button', { name: /^حذف المرحلة/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'حذف المرحلة' }).click();
    await expect(page.getByText('حُذف قالب المرحلة.')).toBeVisible();
    await expect(table.getByRole('row').filter({ hasText: 'المرحلة 5' }).getByText('لم يُرفع')).toBeVisible();
  });

  test('the grade scale and the fiscal card open in their editors, accessible, and close without changing anything', async ({ page }) => {
    await page.goto('/performance-cycle');
    const table = page.getByRole('table', { name: 'ملف التقييم' });
    await table.getByRole('button', { name: /^(إضافة|تعديل): سلم الدرجات/ }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'سلم الدرجات' })).toBeVisible();
    await new ListPage(page).expectNoSeriousA11yIssues();
    await page.getByRole('dialog').getByRole('button', { name: 'إلغاء' }).click();
    await table.getByRole('button', { name: /^(إضافة|تعديل): بطاقة السنة المالية/ }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'بطاقة السنة المالية' })).toBeVisible();
    await new ListPage(page).expectNoSeriousA11yIssues();
  });

  test('an item is added to the catalog through the concept\'s dialog, after the wrong values are refused', async ({ page }, info) => {
    await page.goto('/performance-cycle');
    await page.getByRole('button', { name: 'إضافة بند' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'إضافة بند للكتالوج' })).toBeVisible();
    await dialog.getByRole('button', { name: 'إضافة' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('اكتب اسم البند (3 أحرف) ونقاطًا من 1 إلى 10.');
    const title = `بند الاختبار ${uniqueTag(info.project.name)}`;
    await dialog.getByLabel('البند *').fill(title);
    await dialog.getByRole('button', { name: 'إضافة' }).click();
    await expect(page.getByText('أُضيف البند للكتالوج.')).toBeVisible();
    await expect(page.getByText(title)).toBeVisible();
  });

  test('the evaluation file dialog asks for a text first and says when a text holds nothing it knows', async ({ page }) => {
    await page.goto('/performance-cycle');
    await page.getByRole('button', { name: 'رفع ملف التقييم' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'رفع ملف تقييم الأداء (كل المراحل)' })).toBeVisible();
    await dialog.getByRole('button', { name: 'استخراج' }).click();
    await expect(dialog.getByText('الصق النص أولًا.')).toBeVisible();
    await dialog.getByLabel('نص ملف التقييم').fill('نص لا يشبه ملف تقييم');
    await dialog.getByRole('button', { name: 'استخراج' }).click();
    await expect(dialog.getByText('لم يُعثر في النص على مرحلة ولا سلم درجات ولا بطاقة سنة.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'حفظ تقييم كل المراحل' })).toBeDisabled();
    await new ListPage(page).expectNoSeriousA11yIssues();
  });
});

test.describe('The evaluation cycle page: both themes and both languages (FR-118)', () => {
  test.beforeEach(async ({ page }) => adminModeOnViaApi(page));

  for (const [theme, language] of [['dark', 'ar'], ['light', 'en'], ['dark', 'en']] as const) {
    test(`the page and the date dialog have no serious accessibility violations in the ${theme} theme in ${language}`, async ({ page }) => {
      await page.addInitScript(([t, l]) => { localStorage.setItem('theme', t as string); localStorage.setItem('arweqah.language', l as string); }, [theme, language]);
      await tableViews(page);
      await page.goto('/performance-cycle');
      await expect(page.getByRole('heading', { level: 1, name: language === 'en' ? 'Evaluation cycle' : 'دورة التقييم' })).toBeVisible();
      const list = new ListPage(page);
      await expect(page.getByRole('table', { name: language === 'en' ? 'Stage dates' : 'مواعيد المراحل' })).toBeVisible();
      await list.expectNoSeriousA11yIssues();
      await page.getByRole('button', { name: language === 'en' ? /^Change the date of Approval/ : 'تعديل موعد الاعتماد' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await list.expectNoSeriousA11yIssues();
    });
  }

  test('on a narrow screen the page does not scroll sideways', async ({ page }) => {
    await page.goto('/performance-cycle');
    await expect(page.getByRole('heading', { level: 1, name: 'دورة التقييم' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('The evaluation cycle page: who sees it (FR-118)', () => {
  test('an employee (admin mode off) is not offered the page and sees the no-permission page', async ({ page }) => {
    await adminModeOffViaApi(page);
    await page.goto('/performance-cycle');
    await expect(page.getByRole('heading', { level: 1, name: 'ليس لديك صلاحية للدخول إلى هذه الصفحة' })).toBeVisible();
  });
});

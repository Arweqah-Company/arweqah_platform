import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { ListPage } from '../pages/list.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';
import { ensureTeamSample } from '../support/org-data';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });

const GENERAL = ['أهلًا بك في منصة أروقة', 'حسابك', 'ملفي الشخصي', 'الأمان', 'صلاحياتي', 'دليل المستخدم', 'تسجيل الخروج', 'اللغة والمظهر', 'الإشعارات', 'القائمة الجانبية', 'الصفحة الرئيسية', 'التذاكر', 'تذكرة جديدة', 'طرق عرض التذاكر', 'المهام', 'مهمة جديدة', 'جدول أم لوحة Kanban', 'افتح المهمة وعدّلها', 'الموظفون', 'سجل الموظف', 'الصورة الشخصية', 'فريقي', 'الهيكل التنظيمي', 'طرق عرض الهيكل', 'انتهت الجولة'];
/** Each page has one step, on its feature (never a second one for its sidebar link, never on its title): the administration tour in order. */
const ADMIN = ['وضع المدير', 'الشركات', 'تقسيمات الهيكل', 'إضافة وحدة', 'ميثاق الوحدة', 'الأدوار', 'الاستثناءات', 'صفحة الصلاحيات', 'سجل التدقيق', 'سجل البريد', 'الإعدادات', 'الحماية من الروبوتات', 'خدمة الذكاء الاصطناعي', 'إعدادات جولة الترحيب'];
const bubble = (page: Page) => page.getByRole('alertdialog');
const title = (page: Page) => bubble(page).getByRole('heading', { level: 2 });
const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));

/** The shared administrator already skipped both tours (global setup): each test puts them back the way it needs them. */
async function setTour(page: Page, tour: 'general' | 'admin', action: 'skip' | 'restart'): Promise<void> {
  const res = await page.request.post(`/api/me/tour/${tour}/${action}`, { headers: { origin: 'http://localhost:4173' } });
  expect(res.ok()).toBe(true);
}

test.afterEach(async ({ page }) => {
  await setTour(page, 'general', 'skip');
  await setTour(page, 'admin', 'skip');
});

test.describe('Welcome tour (FR-67)', () => {
  test('starts by itself on the first sign-in, walks every page, and never comes back once finished', async ({ page }) => {
    test.setTimeout(120_000);
    // The "open the task" step points at the first row of the list: the list must have one.
    const made = await page.request.post('/api/tasks', { data: { title: 'Tour sample task' }, headers: { origin: 'http://localhost:4173' } });
    expect(made.ok()).toBe(true);
    await ensureTeamSample(page, test.info().project.name); // the card step points at the first title and the structure step at the first unit
    await adminModeOffViaApi(page); // the full-structure step belongs to those who hold the key, which works only in admin mode
    await setTour(page, 'general', 'restart');
    await page.goto('/');
    await expect(title(page)).toHaveText(GENERAL[0]!);
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    // On a phone the theme and language buttons live in the account menu, so that step has no element on screen and the tour skips it.
    const steps = test.info().project.name === 'mobile' ? GENERAL.filter((name) => name !== 'اللغة والمظهر') : GENERAL;
    for (const [i, name] of steps.entries()) {
      await expect(title(page)).toHaveText(name);
      // the total shrinks as steps whose element is not on this screen are found out; the position is of the steps really shown
      await expect(bubble(page).getByText(new RegExp(`^${i + 1} من \\d+$`))).toBeVisible();
      if (name === 'الصفحة الرئيسية') await expect(bubble(page).getByText('ما يمكنك فعله هنا')).toBeVisible();
      if (i < steps.length - 1) await bubble(page).getByRole('button', { name: 'التالي' }).click();
    }
    const saved = page.waitForResponse((r) => r.url().includes('/api/me/tour/general/complete'));
    await bubble(page).getByRole('button', { name: 'تم' }).click();
    await saved;
    await expect(bubble(page)).toHaveCount(0);
    // the tour ends on the home page, not on whichever page its last step was on
    await expect(page).toHaveURL(/\/$/);
    await page.reload();
    await page.waitForTimeout(2_000);
    await expect(bubble(page)).toHaveCount(0);
  });

  test('the administration tour walks every administration page once, each on its own feature', async ({ page }) => {
    test.setTimeout(180_000);
    await ensureTeamSample(page, test.info().project.name);
    await setTour(page, 'admin', 'restart');
    await adminModeOnViaApi(page);
    await page.goto('/');
    const seen: string[] = [];
    for (let i = 0; i < ADMIN.length; i++) {
      await expect(title(page)).toHaveText(ADMIN[i]!, { timeout: 40_000 });
      seen.push(await title(page).innerText());
      // the ring is never on the page's own heading
      await expect(page.locator('[data-tour="page-title"]').first()).not.toHaveCSS('outline-style', 'solid').catch(() => undefined);
      if (i < ADMIN.length - 1) await bubble(page).getByRole('button', { name: 'التالي' }).click();
    }
    expect(new Set(seen).size).toBe(seen.length);
    await page.keyboard.press('Escape');
    await adminModeOffViaApi(page);
  });

  test('the page step of tickets and tasks plays also when the list is shown as a board (it went straight to the add button)', async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => { for (const key of ['tickets-mode', 'my-tasks-mode', 'tasks-mode']) localStorage.setItem(`view:${key}`, 'board'); });
    await page.request.post('/api/tasks', { data: { title: 'Tour sample task' }, headers: { origin: 'http://localhost:4173' } });
    await adminModeOffViaApi(page);
    await setTour(page, 'general', 'restart');
    await page.goto('/');
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) {
      const name = await title(page).innerText();
      seen.push(name);
      if (name === 'انتهت الجولة') break;
      await bubble(page).getByRole('button', { name: 'التالي' }).click();
      await expect(title(page)).not.toHaveText(name, { timeout: 20_000 });
    }
    // each page is introduced before its first button
    expect(seen.indexOf('التذاكر')).toBeGreaterThan(-1);
    expect(seen.indexOf('تذكرة جديدة')).toBe(seen.indexOf('التذاكر') + 1);
    expect(seen.indexOf('المهام')).toBeGreaterThan(-1);
    expect(seen.indexOf('مهمة جديدة')).toBe(seen.indexOf('المهام') + 1);
    await page.keyboard.press('Escape');
  });

  test('goes back, skips with Esc and remembers it', async ({ page }) => {
    await setTour(page, 'general', 'restart');
    await page.goto('/');
    await bubble(page).getByRole('button', { name: 'التالي' }).click();
    await expect(title(page)).toHaveText('حسابك');
    await bubble(page).getByRole('button', { name: 'السابق' }).click();
    await expect(title(page)).toHaveText(GENERAL[0]!);
    const saved = page.waitForResponse((r) => r.url().includes('/api/me/tour/general/skip'));
    await page.keyboard.press('Escape');
    await saved;
    await expect(bubble(page)).toHaveCount(0);
    await page.reload();
    await page.waitForTimeout(2_000);
    await expect(bubble(page)).toHaveCount(0);
  });

  test('can be restarted from the account menu', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#main')).toBeVisible();
    await page.getByRole('button', { name: 'حسابي' }).click();
    await page.getByRole('menuitem', { name: 'أعد الجولة' }).click();
    await expect(title(page)).toHaveText(GENERAL[0]!);
  });

  test('is readable in English and in the dark theme', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('arweqah.language', 'en'); localStorage.setItem('theme', 'dark'); });
    await setTour(page, 'general', 'restart');
    await page.goto('/');
    await expect(title(page)).toHaveText('Welcome to the Arweqah platform');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await bubble(page).getByRole('button', { name: 'Next' }).click();
    await expect(title(page)).toHaveText('Your account');
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
  });

  test('offers the administration tour when admin mode is first switched on', async ({ page }) => {
    await setTour(page, 'admin', 'restart');
    await adminModeOnViaApi(page);
    await page.goto('/');
    await expect(title(page)).toHaveText('وضع المدير');
    await bubble(page).getByRole('button', { name: 'التالي' }).click();
    await expect(title(page)).toHaveText('الشركات');
    await page.keyboard.press('Escape');
    await expect(bubble(page)).toHaveCount(0);
  });
});

test.describe('Welcome tour: the job-titles page, the title card and the charter tab (FR-67, FR-99, FR-107)', () => {
  const stepsOf = async (page: Page, tour: 'general' | 'admin'): Promise<string[]> => ((await (await page.request.get(`/api/me/tour/${tour}`)).json()).steps as { key: string }[]).map((s) => s.key);

  test('an employee is not offered the job-titles page or the card (decision 267); they belong to those who hold the key, in admin mode, with the charter step', async ({ page }) => {
    await adminModeOffViaApi(page);
    const general = await stepsOf(page, 'general');
    expect(general).not.toEqual(expect.arrayContaining(['job-titles']));
    expect(general).not.toContain('title-card');
    expect(general).not.toContain('org-full-view'); // the full-view key works in admin mode only
    expect(await stepsOf(page, 'admin')).not.toContain('org-charter');
    await adminModeOnViaApi(page);
    expect(await stepsOf(page, 'general')).toEqual(expect.arrayContaining(['job-titles', 'title-card']));
    expect(await stepsOf(page, 'admin')).toContain('org-charter');
    await adminModeOffViaApi(page);
  });

  test('the administration tour opens the first unit on its Charter tab and points at it', async ({ page }) => {
    test.setTimeout(120_000);
    await ensureTeamSample(page, test.info().project.name);
    await setTour(page, 'admin', 'restart');
    await adminModeOnViaApi(page);
    await page.goto('/');
    await expect(title(page)).toHaveText('وضع المدير');
    for (let i = 0; i < 12 && (await title(page).innerText()) !== 'ميثاق الوحدة'; i++) await bubble(page).getByRole('button', { name: 'التالي' }).click();
    await expect(title(page)).toHaveText('ميثاق الوحدة', { timeout: 40_000 });
    await expect(page.getByRole('tab', { name: 'الميثاق' })).toHaveAttribute('aria-selected', 'true');
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await page.keyboard.press('Escape');
    await expect(bubble(page)).toHaveCount(0);
  });
});

test.describe('Welcome tour settings (FR-67)', () => {
  /** A failed run must not leave a reworded step behind for the next one. */
  test.beforeEach(async ({ page }) => {
    await adminModeOnViaApi(page);
    for (const key of ['security', 'notifications']) await page.request.post(`/api/tour-steps/${key}/reset`, { headers: { origin: 'http://localhost:4173' } });
  });

  test('an administrator rewords a step, moves it, sees the change in the tour, and goes back to the original', async ({ page }) => {
    test.setTimeout(120_000);
    await adminModeOnViaApi(page);
    await page.goto('/service-settings?tab=tour-settings');
    await expect(page.getByRole('heading', { level: 1, name: 'الإعدادات' })).toBeVisible();
    await new ListPage(page).switchView('جدول');
    await new ListPage(page).search('بحث في خطوات الجولة').fill('الأمان');
    const row = page.getByRole('row', { name: /^الأمان/ }).first();
    await expect(row.getByText('ظاهرة')).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();

    await row.click();
    const dialog = page.getByRole('dialog', { name: 'الأمان' });
    await dialog.getByRole('textbox', { name: 'العنوان' }).first().fill('أمان حسابك');
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('حُفظت الخطوة.').first()).toBeVisible();
    await new ListPage(page).search('بحث في خطوات الجولة').fill('أمان حسابك');
    await expect(page.getByRole('row', { name: /^أمان حسابك/ })).toBeVisible();

    await setTour(page, 'general', 'restart');
    await page.goto('/');
    await bubble(page).getByRole('button', { name: 'التالي' }).click();
    await bubble(page).getByRole('button', { name: 'التالي' }).click();
    await expect(title(page)).toHaveText('ملفي الشخصي');
    await bubble(page).getByRole('button', { name: 'التالي' }).click();
    await expect(title(page)).toHaveText('أمان حسابك');
    await page.keyboard.press('Escape');

    await page.goto('/service-settings?tab=tour-settings');
    await new ListPage(page).search('بحث في خطوات الجولة').fill('أمان حسابك');
    await page.getByRole('row', { name: /^أمان حسابك/ }).getByRole('button', { name: 'إعادة إلى الأصل' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'إعادة إلى الأصل' }).click();
    await expect(page.getByText('عادت الخطوة إلى نصّها الأصلي.').first()).toBeVisible();
  });

  test('a step is switched off with its switch and the tour no longer plays it', async ({ page }) => {
    test.setTimeout(120_000);
    await adminModeOnViaApi(page);
    await page.goto('/service-settings?tab=tour-settings');
    await new ListPage(page).switchView('جدول');
    await new ListPage(page).search('بحث في خطوات الجولة').fill('الإشعارات');
    await page.getByRole('row', { name: /^الإشعارات/ }).first().click();
    const dialog = page.getByRole('dialog', { name: 'الإشعارات' });
    await dialog.getByRole('checkbox', { name: 'الخطوة ظاهرة في الجولة' }).uncheck();
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByRole('row', { name: /^الإشعارات/ }).getByText('موقوفة')).toBeVisible();
    const res = await page.request.get('/api/me/tour/general');
    expect((await res.json()).steps.map((x: { key: string }) => x.key)).not.toContain('notifications');
    await page.getByRole('row', { name: /^الإشعارات/ }).getByRole('button', { name: 'إعادة إلى الأصل' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'إعادة إلى الأصل' }).click();
    await expect(page.getByRole('row', { name: /^الإشعارات/ }).getByText('ظاهرة')).toBeVisible();
  });
});

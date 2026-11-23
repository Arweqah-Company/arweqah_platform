import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';
import { groupCompanyId, makeEmployee, makeTitle, uniqueTag, unitNamed } from '../support/org-data';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });

const ORIGIN = { origin: 'http://localhost:4173' };
const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));

/** Picks the HR channel in the form when the person writes in several; with one the form has chosen it already (and the choice is off). */
async function pickHrChannel(page: Page, dialog: ReturnType<Page['getByRole']>): Promise<void> {
  const channel = dialog.getByRole('combobox', { name: /^القناة/ });
  if (await channel.isEnabled()) {
    await channel.click();
    await page.getByRole('option', { name: /الموارد البشرية/ }).first().click();
  }
}

/** On the open writers window of a channel: adds the signed-in person as a writer (nothing when they already are). */
async function addMyselfAsWriter(page: Page, toast: RegExp): Promise<void> {
  const me = await page.request.get('/api/me');
  const { name } = (await me.json()) as { name: string };
  await page.getByRole('button', { name: 'إضافة كاتب' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'إضافة كاتب' });
  await expect(dialog.getByRole('button', { name: 'إضافة الكاتب' })).toBeDisabled();
  await dialog.getByRole('combobox', { name: 'الموظف' }).click();
  await page.getByPlaceholder('ابحث…').fill(name.slice(0, 1));
  const option = page.locator('[cmdk-item]', { hasText: name }).first();
  if (!(await option.isVisible({ timeout: 5000 }).catch(() => false))) {
    await dialog.getByRole('button', { name: 'إلغاء' }).click(); // already a writer: nothing to add
    return;
  }
  await option.click();
  await dialog.getByRole('button', { name: 'إضافة الكاتب' }).click();
  await expect(page.getByText(toast).first()).toBeVisible();
}

/** The shared administrator is the writer here: adding the writer on the channel's writers window gives the role at once, with no new sign-in (FR-174, FR-177). */
async function becomeHrWriter(page: Page): Promise<void> {
  await page.goto('/notices/channels');
  await expect(page.getByRole('heading', { level: 1, name: 'قنوات النشر' })).toBeVisible();
  await settled(page);
  await new Screen(page).expectNoSeriousA11yIssues();
  await page.getByText('قناة الموارد البشرية').first().click(); // a row on a desktop, a card on a phone: either opens the channel's writers
  await expect(page.getByRole('dialog', { name: 'قناة الموارد البشرية' })).toBeVisible();
  await addMyselfAsWriter(page, /كاتبًا في القناة/);
  await page.keyboard.press('Escape');
}

test.describe('Notices (FR-167 … FR-176)', () => {
  // The administrator holds the notices keys only while admin mode is on.
  test.beforeEach(async ({ page }) => adminModeOnViaApi(page));
  test.afterEach(async ({ page }) => adminModeOffViaApi(page));

  test('a writer writes and submits a notice, it waits for approval, and the pages are accessible', async ({ page }) => {
    test.setTimeout(120_000);
    await becomeHrWriter(page);

    await page.goto('/notices/manage');
    await expect(page.getByRole('heading', { level: 1, name: 'إدارة التعاميم' })).toBeVisible();
    await page.getByRole('button', { name: 'تعميم جديد' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'تعميم جديد' });
    await expect(dialog.getByRole('button', { name: 'إرسال للاعتماد' })).toBeDisabled();
    await pickHrChannel(page, dialog);
    await dialog.getByRole('radio', { name: /سياسة تحتاج إقرارًا/ }).check();
    await dialog.getByLabel(/العنوان بالعربية/).fill('سياسة السفر والإيفاد');
    await dialog.getByLabel(/^النص/).fill('تسري هذه السياسة على كل موظفي الشركة.');
    await dialog.getByRole('radio', { name: /كل الموظفين/ }).check();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await expect(dialog.getByRole('button', { name: 'إرسال للاعتماد' })).toBeEnabled();
    await dialog.getByRole('button', { name: 'إرسال للاعتماد' }).click();
    await expect(page.getByText('أُرسل التعميم للاعتماد.')).toBeVisible();

    await page.getByRole('tab', { name: /بانتظار الاعتماد/ }).click();
    const item = page.getByText('سياسة السفر والإيفاد').first(); // a table row on a desktop, a card on a phone
    await expect(item).toBeVisible();
    await item.click();
    const details = page.getByRole('dialog', { name: 'تفاصيل التعميم' });
    await details.getByRole('tab', { name: 'الاعتماد' }).click();
    await expect(details.getByText('أُرسل للاعتماد')).toBeVisible();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
  });

  test('an administrator makes a channel for a unit, adds a writer to it at once, and the page stays accessible (FR-177)', async ({ page }) => {
    test.setTimeout(120_000);
    const tag = uniqueTag(test.info().project.name);
    const nameAr = `قناة اختبار ${tag}`;
    await page.goto('/notices/channels');
    await expect(page.getByRole('heading', { level: 1, name: 'قنوات النشر' })).toBeVisible();
    await page.getByRole('button', { name: 'إضافة قناة' }).first().click();
    const form = page.getByRole('dialog', { name: 'إضافة قناة' });
    await expect(form.getByRole('button', { name: 'إضافة القناة' })).toBeDisabled();
    await form.getByLabel(/الاسم بالعربية/).fill(nameAr);
    await form.getByLabel(/الاسم بالإنجليزية/).fill(`Test channel ${tag}`);
    await form.getByRole('combobox', { name: 'الوحدة' }).click();
    await page.getByRole('option').first().click();
    await expect(form.getByRole('button', { name: 'إضافة القناة' })).toBeEnabled();
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await form.getByRole('button', { name: 'إضافة القناة' }).click();
    await expect(page.getByText('أُضيفت القناة.')).toBeVisible();

    await page.getByText(nameAr).first().click(); // the new channel's writers
    await expect(page.getByRole('dialog', { name: nameAr })).toBeVisible();
    await addMyselfAsWriter(page, /كاتبًا في القناة/);
    const mine = await page.request.get('/api/notices/options');
    const options = (await mine.json()) as { writableChannelCodes: string[]; channels: { code: string; nameAr: string }[] };
    const code = options.channels.find((c) => c.nameAr === nameAr)?.code ?? '';
    expect(options.writableChannelCodes).toContain(code); // the writer role came with the add: no new sign-in
    await page.keyboard.press('Escape');
    const removed = await page.request.delete(`/api/notices/channels/${code}`, { headers: ORIGIN }); // clean up: no notice was written in it
    expect(removed.status()).toBe(204);
  });

  test('the other pages open for the administrator and have no serious accessibility problem', async ({ page }) => {
    for (const [path, heading] of [['/notices', 'تعاميمي'], ['/notices/approvals', 'بانتظار اعتمادي']] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await settled(page);
      await new Screen(page).expectNoSeriousA11yIssues();
    }
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'التعاميم' })).toBeVisible();
    const sent = await page.request.get('/api/notices/home', { headers: ORIGIN });
    expect(sent.ok()).toBe(true);
  });
});

interface Person { name: string; userId: string }

async function personNamed(page: Page, name: string): Promise<Person> {
  const list = (await (await page.request.get(`/api/employees?search=${encodeURIComponent(name)}`)).json()) as { items: { userId: string; fullName: string }[] };
  const found = list.items.find((e) => e.fullName === name);
  if (!found) throw new Error(`no employee ${name}`);
  return { name, userId: found.userId };
}

async function impersonationSetting(page: Page, enabled: number): Promise<void> {
  const current = (await (await page.request.get('/api/security-settings')).json()) as { requestsPerMinute: number; trustedDeviceDays: number };
  const body = { trustedDeviceDays: current.trustedDeviceDays, requestsPerMinute: current.requestsPerMinute, impersonationEnabled: enabled, impersonationIdleMinutes: 30 };
  expect((await page.request.put('/api/security-settings', { data: body, headers: ORIGIN })).ok()).toBe(true);
}

/** An employee of the marketing unit (the audience of the notice), made through the API. */
async function makeReader(page: Page, tag: string): Promise<Person> {
  await adminModeOnViaApi(page);
  const unit = await unitNamed(page, 'وحدة التسويق');
  const title = await makeTitle(page, unit.id, `مسمى القارئ ${tag}`, 7, 'P');
  await makeEmployee(page, { companyId: await groupCompanyId(page, unit.id), unitId: unit.id, titleId: title.id, name: `قارئ التعميم ${tag}`, tag: `nr${tag}` });
  return personNamed(page, `قارئ التعميم ${tag}`);
}

async function writeNotice(page: Page, title: string): Promise<void> {
  await page.goto('/notices/manage');
  await page.getByRole('button', { name: 'تعميم جديد' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'تعميم جديد' });
  await pickHrChannel(page, dialog);
  await dialog.getByRole('radio', { name: /سياسة تحتاج إقرارًا/ }).check();
  await dialog.getByLabel(/العنوان بالعربية/).fill(title);
  await dialog.getByLabel(/^النص/).fill('نص السياسة الكاملة للرحلة.');
  await dialog.getByRole('radio', { name: /وحدات ومسميات ومجموعات/ }).check();
  await dialog.getByRole('combobox', { name: 'الوحدات' }).click(); // the choices come from the one audience-options call
  await page.getByRole('option', { name: /وحدة التسويق/ }).first().click();
  await page.keyboard.press('Escape');
  await expect(dialog.getByText(/يصل إلى \d+ موظفًا/)).toBeVisible();
  await dialog.getByRole('button', { name: 'إرسال للاعتماد' }).click();
  await expect(page.getByText('أُرسل التعميم للاعتماد.')).toBeVisible();
}

/**
 * The part of the journey that one browser account can drive. The sign-in needs a code from the person's authenticator app, so only the administrator
 * has a session here; «sign in as» lets the administrator act as another employee but refuses every write to notices (`impersonation.rules.ts`).
 * So: the administrator (a writer of the HR channel) writes and submits; an employee of the audience, opened through «sign in as», sees nothing before
 * the approval. Approval by the head, delivery, acknowledgement and the report are driven with real sessions in the API suite (`notices-delivery.e2e-spec.ts`).
 */
test.describe('Notices journey: the writer submits and the audience waits for the approval (FR-167, FR-168, FR-170)', () => {
  test.setTimeout(240_000);
  let reader: BrowserContext | undefined;

  test.afterEach(async ({ page }) => {
    await reader?.close();
    await impersonationSetting(page, 0).catch(() => undefined);
    await adminModeOffViaApi(page).catch(() => undefined);
  });

  test('the notice waits for approval and does not reach the employee of the audience before it', async ({ page, browser }) => {
    const tag = uniqueTag(test.info().project.name);
    const person = await makeReader(page, tag);
    await becomeHrWriter(page);
    const title = `تعميم الرحلة ${tag}`;
    await writeNotice(page, title);
    await page.getByRole('tab', { name: /بانتظار الاعتماد/ }).click();
    await expect(page.getByText(title).first()).toBeVisible();

    await impersonationSetting(page, 1);
    reader = await browser.newContext({ storageState: ADMIN_STATE, locale: 'ar-SA', baseURL: 'http://localhost:4173' });
    const asReader = await reader.newPage();
    const started = await asReader.request.post(`/api/impersonation/${person.userId}`, { headers: ORIGIN });
    expect(started.status(), await started.text()).toBe(204);
    await asReader.goto('/notices');
    await expect(asReader.getByRole('heading', { level: 1, name: 'تعاميمي' })).toBeVisible();
    await expect(asReader.getByText(title)).toHaveCount(0);
    await settled(asReader);
    await new Screen(asReader).expectNoSeriousA11yIssues();
  });
});

import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });

const ORIGIN = { origin: 'http://localhost:4173' };
const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
const REPORT_TYPE = 'بلاغات المنصة';

/** A department that receives tickets, with a type the reports may become (the shared database may hold none yet). */
async function ensureReportType(page: Page): Promise<void> {
  await adminModeOnViaApi(page);
  const options = (await (await page.request.get('/api/problem-report-settings/types')).json()) as unknown[];
  if (options.length > 0) return;
  const desks = (await (await page.request.get('/api/tickets/setup/desks')).json()) as { orgNodeId: string }[];
  const desk = desks[0]!.orgNodeId;
  const settings = { receptionStatus: 'active', descriptionAr: null, descriptionEn: null, acceptsPersonal: false, defaultDueDays: 3, minLeadDays: 0, autoCloseDays: 4, reopenWindowDays: 7, staleAfterDays: 14 };
  expect((await page.request.put(`/api/tickets/setup/desks/${desk}`, { data: settings, headers: ORIGIN })).ok()).toBe(true);
  const type = { nameAr: REPORT_TYPE, nameEn: 'Platform reports', descriptionAr: null, descriptionEn: null, dueDays: null, isPersonal: false, isActive: true, handlerUserIds: [] };
  expect((await page.request.post(`/api/tickets/setup/desks/${desk}/types`, { data: type, headers: ORIGIN })).ok()).toBe(true);
}

/** The shared session is used by every spec: leave the button off whatever a test did. */
test.afterEach(async ({ page }) => {
  await adminModeOnViaApi(page);
  await page.request.put('/api/problem-report-settings', { data: { enabled: false, ticketTypeId: null, analyzeWithAi: false, sendImageToAi: false, maxPerHour: 10 }, headers: ORIGIN });
});

test.describe('Report a problem (FR-195 … FR-199)', () => {
  test('the administrator switches the button on in the settings; an employee reports a problem and it becomes a ticket', async ({ page }) => {
    test.setTimeout(120_000);
    await ensureReportType(page);
    await page.goto('/service-settings?tab=problem-report-settings');
    await expect(page.getByRole('tab', { name: 'بلاغات المشاكل' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'بلّغ عن مشكلة' })).toHaveCount(0); // off until the administrator chooses a type
    await page.getByRole('checkbox', { name: /تشغيل زر/ }).check();
    await expect(page.getByText('اختر نوعًا قبل التشغيل.')).toBeVisible();
    await page.getByRole('combobox', { name: 'نوع التذكرة', exact: true }).click();
    await page.getByRole('option').first().click(); // any type the shared database offers
    await page.getByRole('checkbox', { name: /إظهار زر «حلّل بالذكاء الاصطناعي»/ }).uncheck(); // no AI service in the browser tests
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    await expect(page.getByText('حُفظت إعدادات البلاغات')).toBeVisible();

    await page.goto('/tickets');
    await page.getByRole('button', { name: 'بلّغ عن مشكلة' }).click();
    const dialog = page.getByRole('dialog', { name: 'بلّغ عن مشكلة' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'عرض اللقطة بالحجم الكامل' })).toBeVisible();
    await dialog.getByLabel('ما المشكلة؟').fill('القائمة لا تُحمَّل');
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await dialog.getByRole('button', { name: 'إرسال البلاغ' }).click();
    await expect(page.getByText(/وصل بلاغك: التذكرة TKT-/)).toBeVisible();
    await page.getByRole('button', { name: 'فتح التذكرة' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('بلاغ من صفحة');
    await expect(page.getByText('القائمة لا تُحمَّل').first()).toBeVisible();
  });

  test('the button is not on the screen while the administrator has it off', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'بلّغ عن مشكلة' })).toHaveCount(0);
  });

  test('is reachable from inside a pop-up window, which covers the top bar, and its screenshot shows that window', async ({ page }) => {
    test.setTimeout(120_000);
    await ensureReportType(page);
    const types = (await (await page.request.get('/api/problem-report-settings/types')).json()) as { typeId: string }[];
    const saved = await page.request.put('/api/problem-report-settings', { data: { enabled: true, ticketTypeId: types[0]!.typeId, analyzeWithAi: false, sendImageToAi: false, maxPerHour: 10 }, headers: ORIGIN });
    expect(saved.ok()).toBe(true);
    await page.goto('/tickets');
    await page.getByRole('button', { name: 'تذكرة جديدة' }).click();
    const popup = page.getByRole('dialog', { name: 'تذكرة جديدة' });
    await expect(popup).toBeVisible();
    await popup.getByRole('button', { name: 'بلّغ عن مشكلة' }).click();
    const report = page.getByRole('dialog', { name: 'بلّغ عن مشكلة' });
    await expect(report.getByRole('button', { name: 'عرض اللقطة بالحجم الكامل' })).toBeVisible();
    await expect(report.getByRole('button', { name: 'بلّغ عن مشكلة' })).toHaveCount(0);
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
  });

  test('the button sits in one corner beside the assistant, is not in the header, and shows in the same place inside a pop-up window (FR-226)', async ({ page }) => {
    test.setTimeout(120_000);
    await ensureReportType(page);
    const types = (await (await page.request.get('/api/problem-report-settings/types')).json()) as { typeId: string }[];
    expect((await page.request.put('/api/problem-report-settings', { data: { enabled: true, ticketTypeId: types[0]!.typeId, analyzeWithAi: false, sendImageToAi: false, maxPerHour: 10 }, headers: ORIGIN })).ok()).toBe(true);
    await page.goto('/tickets');
    const corner = page.getByTestId('floating-tools');
    const report = corner.getByRole('button', { name: 'بلّغ عن مشكلة', includeHidden: true });
    const assistant = corner.getByRole('button', { name: 'فتح مساعد المنصة' });
    await expect(report).toBeVisible();
    await expect(assistant).toBeVisible();
    await expect(page.getByRole('banner').getByRole('button', { name: 'بلّغ عن مشكلة' })).toHaveCount(0);
    const [r, a] = [await report.boundingBox(), await assistant.boundingBox()];
    expect(Math.abs(r!.y - a!.y)).toBeLessThan(1); // one row, the same size
    expect(r!.width).toBe(48); // the same round size as the assistant's, on a wide screen too
    expect(a!.width).toBe(48);
    expect(Math.abs(r!.x - a!.x)).toBeGreaterThanOrEqual(a!.width); // side by side, not on top of each other
    await page.getByRole('button', { name: 'تذكرة جديدة' }).click();
    const popup = page.getByRole('dialog', { name: 'تذكرة جديدة' });
    await expect(popup).toBeVisible();
    const inside = popup.getByRole('button', { name: 'بلّغ عن مشكلة' });
    await expect(inside).toBeVisible();
    const i = await inside.boundingBox();
    // The window locks the page's scroll (its scrollbar goes), which moves every fixed thing: the page's own button is measured now, still under the overlay and hidden from the accessibility tree.
    const under = await report.and(page.getByRole('button', { name: 'بلّغ عن مشكلة', includeHidden: true })).boundingBox();
    expect(Math.abs(i!.x - under!.x)).toBeLessThan(1); // the pop-up's button covers the page's one exactly
    expect(Math.abs(i!.y - under!.y)).toBeLessThan(1);
    const popupBox = await popup.boundingBox();
    expect(i!.y).toBeGreaterThanOrEqual(popupBox!.y + popupBox!.height - 1); // and never lies over the window's own buttons
    await settled(page);
    await new Screen(page).expectNoSeriousA11yIssues();
    await page.setViewportSize({ width: 360, height: 700 });
    const small = await popup.getByRole('button', { name: 'بلّغ عن مشكلة' }).boundingBox();
    expect(small!.x).toBeGreaterThanOrEqual(0);
    expect(small!.x + small!.width).toBeLessThanOrEqual(360);
    expect(small!.y + small!.height).toBeLessThanOrEqual(700);
  });
});

import { expect, test, type Page } from '@playwright/test';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

test.use({ storageState: ADMIN_STATE });
test.afterEach(async ({ page }) => adminModeOffViaApi(page));

/** A colleague to edit (an existing one is left as it is). */
async function colleagueId(page: Page): Promise<string> {
  await adminModeOnViaApi(page);
  const reference = (await (await page.request.get('/api/lookups/org-reference')).json()) as { companyId: string; units: { id: string; titles: { id: string }[] }[] }[];
  const company = reference.find((c) => c.units.some((u) => u.titles.length));
  const unit = company?.units.find((u) => u.titles.length);
  if (!company || !unit) throw new Error('the seeded structure has no unit with a job title');
  await page.request.post('/api/employees', {
    data: { companyId: company.companyId, orgNodeId: unit.id, jobTitleId: unit.titles[0]?.id, workEmail: 'e2e.steps@arweqah.sa', employeeNumber: 'E2E-STEPS', fullName: 'موظف الخطوات', startDate: '2024-01-01' },
    headers: { origin: 'http://localhost:4173' },
  });
  const found = (await (await page.request.get('/api/employees', { params: { employeeNumbers: 'E2E-STEPS' } })).json()) as { items: { id: string }[] };
  return found.items[0]?.id as string;
}

test.describe('The two steps of the employee form', () => {
  test('«Next» only moves to the roles step: nothing is saved until the person presses «Save» there', async ({ page }) => {
    test.setTimeout(120_000);
    const id = await colleagueId(page);
    await adminModeOnViaApi(page);
    const saves: string[] = [];
    page.on('request', (r) => { if (r.method() === 'PUT' && r.url().includes(`/api/employees/${id}`)) saves.push(r.url()); });
    await page.goto(`/employees/${id}/edit`);
    await expect(page.getByLabel(/الاسم الكامل/)).toHaveValue('موظف الخطوات');
    await page.getByRole('button', { name: 'التالي: الأدوار' }).click();
    await expect(page.getByRole('button', { name: 'حفظ', exact: true })).toBeVisible();
    await page.waitForTimeout(1500); // a save started by the click itself would have gone out and moved the page by now
    expect(saves).toEqual([]);
    await expect(page).toHaveURL(new RegExp(`/employees/${id}/edit$`));
  });

  test('FR-201: the date boxes are left-to-right text in the platform form, take Arabic digits and show them as Latin ones', async ({ page }) => {
    test.setTimeout(120_000);
    const id = await colleagueId(page);
    await adminModeOnViaApi(page);
    await page.goto(`/employees/${id}/edit`);
    const expiry = page.getByLabel('تاريخ انتهاء الهوية');
    await expect(expiry).toHaveAttribute('type', 'text');
    await expect(expiry).toHaveAttribute('dir', 'ltr');
    await expect(expiry).toHaveAttribute('placeholder', 'YYYY-MM-DD');
    await expiry.fill('٢٠٣٠١٢٠١');
    await expect(expiry).toHaveValue('2030-12-01');
    // The calendar's own control exists with a size (so the browser opens it beside the field), but nobody sees or reaches it.
    await expect(page.locator('input[type="date"]:not([aria-hidden="true"])')).toHaveCount(0);
    expect(await page.locator('input[type="date"]').evaluateAll((els) => els.every((e) => getComputedStyle(e).opacity === '0' && getComputedStyle(e).pointerEvents === 'none'))).toBe(true);
  });

  test('FR-201: the calendar of a date box is tied to a control with a real size lying on its calendar button, so the browser opens it beside the field and not in the corner of the screen', async ({ page }) => {
    test.setTimeout(120_000);
    const id = await colleagueId(page);
    await adminModeOnViaApi(page);
    await page.goto(`/employees/${id}/edit`);
    const field = page.getByLabel('تاريخ انتهاء الهوية');
    const box = field.locator('xpath=ancestor::span[contains(@class, "relative")][1]');
    const [f, b, p] = [await field.boundingBox(), await box.getByRole('button', { name: 'فتح التقويم' }).boundingBox(), await box.locator('input[type="date"]').boundingBox()];
    // Chrome opens the calendar at the top-left corner of the screen when the date control it is given has no size.
    expect(p!.width).toBeGreaterThan(0);
    expect(p!.height).toBeGreaterThan(0);
    expect(p!.x).toBeGreaterThanOrEqual(f!.x);
    expect(p!.x + p!.width).toBeLessThanOrEqual(f!.x + f!.width);
    expect(p!.y).toBeGreaterThanOrEqual(f!.y);
    expect(p!.y + p!.height).toBeLessThanOrEqual(f!.y + f!.height);
    expect(Math.abs(p!.x - b!.x)).toBeLessThan(2); // on the calendar button itself
    await box.getByRole('button', { name: 'فتح التقويم' }).click(); // the click reaches the button, not the hidden control
    await expect(field).toBeVisible();
  });
});

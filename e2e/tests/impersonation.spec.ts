import { expect, test, type Page } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });
test.beforeEach(async ({ page }) => adminModeOnViaApi(page));
test.afterEach(async ({ page }) => {
  await setting(page, 0);
  await adminModeOffViaApi(page);
});

const ORIGIN = { origin: 'http://localhost:4173' };
const START = 'الدخول بحساب هذا الموظف';

async function setting(page: Page, enabled: number): Promise<void> {
  const body = { trustedDeviceDays: 0, requestsPerMinute: 100000, impersonationEnabled: enabled, impersonationIdleMinutes: 30 };
  const current = (await (await page.request.get('/api/security-settings')).json()) as { requestsPerMinute: number; trustedDeviceDays: number };
  const response = await page.request.put('/api/security-settings', { data: { ...body, trustedDeviceDays: current.trustedDeviceDays, requestsPerMinute: current.requestsPerMinute }, headers: ORIGIN });
  expect(response.ok()).toBe(true);
}

/** An employee to work as: the demo organization has units and job titles (one tree for the whole group), so one is created through the API in the first company. */
async function makeEmployee(page: Page): Promise<{ id: string; name: string }> {
  const companies = (await (await page.request.get('/api/companies')).json()) as { items?: { id: string }[] } | { id: string }[];
  const companyId = (Array.isArray(companies) ? companies : (companies.items ?? []))[0]?.id;
  const tree = (await (await page.request.get('/api/org/tree?view=full')).json()) as { nodes?: { id: string; titles: { id: string }[] }[] };
  const unit = (tree.nodes ?? []).find((n) => n.titles.length > 0);
  if (!companyId || !unit) throw new Error('the demo organization has no unit with a job title');
  const n = Date.now().toString().slice(-7);
  const name = `موظف الدعم ${n}`;
  const created = await page.request.post('/api/employees', {
    data: { companyId, orgNodeId: unit.id, jobTitleId: unit.titles[0]?.id, workEmail: `support${n}@arweqah.sa`, employeeNumber: `S${n}`, fullName: name, startDate: '2024-03-01' },
    headers: ORIGIN,
  });
  expect(created.status(), await created.text()).toBe(201);
  return { id: ((await created.json()) as { id: string }).id, name };
}

test.describe('Sign in as another employee (FR-85)', () => {
  // Switching admin mode on needs a code from a new 30-second step, so a test that follows another one waits for it before it starts.
  test.setTimeout(90_000);

  test('the setting is in the security settings tab and accessible', async ({ page }) => {
    await page.goto('/service-settings?tab=security-settings');
    await expect(page.getByLabel('السماح لمديري النظام بالدخول بحساب موظف آخر', { exact: false })).toBeVisible();
    await expect(page.getByLabel('الدقائق بلا نشاط قبل انتهاء الجلسة')).toBeVisible();
    await new Screen(page).expectNoSeriousA11yIssues();
  });

  test('is hidden while off; when on, the administrator works as the employee and goes back', async ({ page }, info) => {
    // The setting is shared by both projects running together, and the phone shows cards instead of rows: one run on the computer is enough.
    test.skip(info.project.name === 'mobile', 'desktop only');
    const employee = await makeEmployee(page);
    await page.goto('/employees');
    await page.getByRole('row', { name: new RegExp(employee.name) }).waitFor();
    await expect(page.getByRole('button', { name: START })).toHaveCount(0);

    await setting(page, 1);
    await page.goto('/employees');
    await page.getByRole('row', { name: new RegExp(employee.name) }).getByRole('button', { name: START }).click();
    await expect(page.getByText(`الدخول بحساب ${employee.name}؟`)).toBeVisible();
    await new Screen(page).expectNoSeriousA11yIssues();
    const confirm = page.getByRole('dialog').getByRole('button', { name: START });
    await expect(confirm).toBeEnabled();
    await Promise.all([page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/impersonation\/[0-9a-f-]{36}$/.test(r.url())), confirm.click()]);

    const bar = page.getByRole('status').filter({ hasText: `أنت تعمل الآن بحساب ${employee.name}` });
    await expect(bar).toBeVisible();
    // The employee's own welcome tour never starts for someone working as them (the session cannot save its progress).
    await expect(page.getByRole('button', { name: 'إغلاق الجولة' })).toHaveCount(0);
    await expect(bar.getByRole('button', { name: 'العودة لحسابي' })).toBeVisible();
    await new Screen(page).expectNoSeriousA11yIssues();
    await bar.getByRole('button', { name: 'العودة لحسابي' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'أنت تعمل الآن بحساب' })).toHaveCount(0);
    expect(((await (await page.request.get('/api/me')).json()) as { email: string }).email).toBe('s.magdy@arweqah.sa');
  });
});

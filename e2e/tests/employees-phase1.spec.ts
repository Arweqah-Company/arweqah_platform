import { expect, test } from '@playwright/test';
import { BasePage } from '../pages/base.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });
test.afterEach(async ({ page }) => adminModeOffViaApi(page));

/** The seeded database has only the system administrator, who is not in the directory: a colleague is added through the API first (an existing one is left as it is). */
async function ensureColleague(page: import('@playwright/test').Page): Promise<void> {
  await adminModeOnViaApi(page);
  const reference = (await (await page.request.get('/api/lookups/org-reference')).json()) as { companyId: string; units: { id: string; titles: { id: string }[] }[] }[];
  const company = reference.find((c) => c.units.some((u) => u.titles.length));
  const unit = company?.units.find((u) => u.titles.length);
  if (!company || !unit) throw new Error('the seeded structure has no unit with a job title');
  await page.request.post('/api/employees', {
    data: { companyId: company.companyId, orgNodeId: unit.id, jobTitleId: unit.titles[0]?.id, workEmail: 'e2e.colleague@arweqah.sa', employeeNumber: 'E2E-1', fullName: 'زميل الاختبار', startDate: '2024-01-01' },
    headers: { origin: 'http://localhost:4173' },
  });
  await adminModeOffViaApi(page);
}

const tourKeys = async (page: import('@playwright/test').Page): Promise<string[]> => ((await (await page.request.get('/api/me/tour/general')).json()).steps as { key: string }[]).map((s) => s.key);

test.describe('Employees: directory, history tab and photo (FR-90, FR-91, FR-92)', () => {
  test('the Employees page has a «My team» tab: the old directory page is gone, a person with no unit gets an explained empty team, and it is accessible', async ({ page }) => {
    await page.goto('/employees');
    await expect(page.getByRole('tab', { name: 'الموظفون' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: 'فريقي' }).click();
    await expect(page).toHaveURL(/tab=team/);
    await expect(page.getByRole('searchbox', { name: 'ابحث في فريقي' })).toBeVisible();
    await expect(page.getByText('لا وحدة لك بعد.')).toBeVisible();
    await new Screen(page).expectNoSeriousA11yIssues();
    await page.goto('/directory');
    await expect(page.getByRole('heading', { name: /404|غير موجودة/ })).toBeVisible();
  });

  test('an employee page has a History tab with the placement and the log, and a photo section; both are accessible', async ({ page }) => {
    test.setTimeout(120_000);
    await ensureColleague(page);
    await adminModeOnViaApi(page);
    const found = (await (await page.request.get('/api/employees', { params: { employeeNumbers: 'E2E-1' } })).json()) as { items: { id: string }[] };
    await page.goto(`/employees/${found.items[0]?.id}`);
    await expect(page.getByRole('heading', { name: 'الصورة الشخصية' })).toBeVisible();
    await new Screen(page).expectNoSeriousA11yIssues();
    await page.getByRole('tab', { name: 'السجل' }).click();
    await expect(page).toHaveURL(/tab=history/);
    await expect(page.getByRole('heading', { name: 'الوحدة والمسمى والمدير عبر الزمن' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'سجل تغييرات السجل' })).toBeVisible();
    await new Screen(page).expectNoSeriousA11yIssues();
  });

  test('the employee list offers selection and bulk edit to who may, and a preview before anything is saved', async ({ page }) => {
    await adminModeOnViaApi(page);
    await page.goto('/employees');
    await page.getByRole('checkbox', { name: 'تحديد هذا الصف' }).first().check();
    await expect(page.getByText('1 موظف محدد')).toBeVisible();
    await page.getByRole('button', { name: 'تعديل جماعي' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'معاينة' })).toBeDisabled();
    await dialog.getByLabel('مقر العمل').fill('الرياض - المقر الرئيسي');
    await dialog.getByRole('button', { name: 'معاينة' }).click();
    await expect(dialog.getByText(/سيتغير \d+/)).toBeVisible();
    await new Screen(page).expectNoSeriousA11yIssues();
  });
});

test.describe('The fields a holder of «edit employees» may change belong to each grant (FR-94)', () => {
  test('has no page of its own; beside the permission a button opens the checklist, the choice is saved with the role, and it is accessible', async ({ page }) => {
    test.setTimeout(150_000);
    await adminModeOnViaApi(page);
    await page.goto('/employee-fields');
    await expect(page.getByRole('heading', { level: 1, name: 'نأسف على إبلاغك بأن هذه الصفحة غير موجودة' })).toBeVisible();
    const origin = { origin: 'http://localhost:4173' };
    const made = await page.request.post('/api/roles', { data: { nameAr: 'دور يعدّل الموظفين', nameEn: 'Role that edits employees', permissions: [{ key: 'employees.update', scope: 'company' }] }, headers: origin });
    expect(made.ok()).toBe(true);
    const roleId = ((await made.json()) as { id: string }).id;
    await page.goto('/permissions');
    await page.getByRole('combobox', { name: 'الدور' }).click();
    await page.getByRole('option', { name: 'دور يعدّل الموظفين' }).first().click();
    // A new grant starts with the basic data: contact and personal (9 fields).
    await page.getByRole('button', { name: 'الحقول التي يعدّلها (9)' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('checkbox', { name: 'الجوال الشخصي' })).toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: 'الآيبان' })).not.toBeChecked();
    // No field is locked: the administrator may give even a pay field.
    await dialog.getByRole('checkbox', { name: 'الآيبان' }).check();
    await new Screen(page).expectNoSeriousA11yIssues();
    await dialog.getByRole('button', { name: 'تم' }).click();
    await expect(page.getByRole('button', { name: 'الحقول التي يعدّلها (10)' })).toBeVisible();
    await page.getByRole('button', { name: 'حفظ' }).click();
    await expect.poll(async () => ((await (await page.request.get(`/api/permission-targets/role/${roleId}`)).json()) as { permissions: { key: string; fields?: string[] }[] }).permissions.find((p) => p.key === 'employees.update')?.fields).toContain('iban');
  });

  test('is offered for the Employee role too: its own-record grant lists the four fields an employee changes of themselves', async ({ page }) => {
    test.setTimeout(120_000);
    await adminModeOnViaApi(page);
    await page.goto('/permissions');
    await page.getByRole('combobox', { name: 'الدور' }).click();
    await page.getByRole('option', { name: 'موظف', exact: true }).click();
    await expect(page.getByRole('button', { name: 'الحقول التي يعدّلها (4)' })).toBeVisible();
  });
});

test.describe('Welcome tour of the employees pages (standing rule 9)', () => {
  test('shows the directory, history and photo steps to everyone, and the administrators their steps', async ({ page }) => {
    const plain = await tourKeys(page);
    expect(plain).toEqual(expect.arrayContaining(['directory', 'employee-history', 'employee-photo']));
    await adminModeOnViaApi(page);
    expect(await tourKeys(page)).toEqual(expect.arrayContaining(['directory', 'employee-history', 'bulk-update']));
  });
});

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
});

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { FULL_EVAL_FILE } from '../../apps/api/test/helpers/eval-file';
import { SAMPLE_TITLE_FILE } from '../../apps/api/src/modules/career-profile/domain/rules/fixtures/title-file.sample';
import { BasePage } from '../pages/base.page';
import { adminModeOffViaApi, adminModeOnViaApi } from '../support/admin-mode';
import { ADMIN_STATE } from '../support/fixtures';
import { groupCompanyId, makeEmployee, makeTitle, uniqueTag, unitNamed } from '../support/org-data';

class Screen extends BasePage {}
test.use({ storageState: ADMIN_STATE });
test.describe.configure({ mode: 'serial', timeout: 240_000 });

const ORIGIN = { origin: 'http://localhost:4173' };

interface Person { name: string; userId: string; employeeId: string }

/** Makes the employee through the API and reads back the ids the journey needs. */
async function person(page: Page, args: Parameters<typeof makeEmployee>[1]): Promise<Person> {
  await makeEmployee(page, args);
  const list = (await (await page.request.get(`/api/employees?search=${encodeURIComponent(args.name)}`)).json()) as { items: { id: string; userId: string; fullName: string }[] };
  const found = list.items.find((e) => e.fullName === args.name);
  if (!found) throw new Error(`no employee ${args.name}`);
  return { name: args.name, userId: found.userId, employeeId: found.id };
}

/** A browser context of its own that works as `who` (the administrator starts it; the session cookies stay in this context). */
async function actAs(browser: Browser, who: Person): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ storageState: ADMIN_STATE, locale: 'ar-SA', baseURL: 'http://localhost:4173' });
  const page = await context.newPage();
  const started = await page.request.post(`/api/impersonation/${who.userId}`, { headers: ORIGIN });
  expect(started.status(), await started.text()).toBe(204);
  return { context, page };
}

test.describe('Career profile to the end of an evaluation cycle, in the browser', () => {
  // Work in progress: setup and the acknowledgement gate are written, the self / manager / calibration / result screens are not. Never run yet, so skipped until finished.
  test.skip(true, 'in progress');
  let head: Person; let lead: Person; let rep: Person;

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: ADMIN_STATE, baseURL: 'http://localhost:4173' });
    const page = await context.newPage();
    await adminModeOnViaApi(page);
    await page.request.post('/api/performance/cycle/close', { headers: ORIGIN });
    await adminModeOffViaApi(page);
    await context.close();
  });

  test('HR sets up the title file, the evaluation file and the people', async ({ page }) => {
    await adminModeOnViaApi(page);
    const settings = (await (await page.request.get('/api/security-settings')).json()) as { requestsPerMinute: number; trustedDeviceDays: number };
    await page.request.put('/api/security-settings', { data: { ...settings, impersonationEnabled: 1, impersonationIdleMinutes: 30 }, headers: ORIGIN });
    const tag = uniqueTag('desktop');
    const unit = await unitNamed(page, 'وحدة التسويق');
    const companyId = await groupCompanyId(page, unit.id);
    const headTitle = await makeTitle(page, unit.id, `رئيس الرحلة ${tag}`, 4, 'M');
    const leadTitle = await makeTitle(page, unit.id, `قائد الرحلة ${tag}`, 6, 'M', headTitle.id);
    const repTitle = await makeTitle(page, unit.id, `منسق الرحلة ${tag}`, 7, 'P', leadTitle.id);
    const make = (title: { id: string }, name: string, key: string) => person(page, { companyId, unitId: unit.id, titleId: title.id, name: `${name} ${tag}`, tag: `${key}${tag}` });
    [head, lead, rep] = [await make(headTitle, 'رئيس', 'jh'), await make(leadTitle, 'مدير', 'jl'), await make(repTitle, 'موظف', 'jr')];
    for (const [who, boss] of [[lead, head], [rep, lead]] as const) {
      const r = await page.request.post(`/api/employees/${who.employeeId}/assignments`, { data: { managerId: boss.employeeId, validFrom: '2024-03-01', reason: 'journey' }, headers: ORIGIN });
      expect(r.status(), await r.text()).toBeLessThan(300);
    }
    const file = SAMPLE_TITLE_FILE.replaceAll('OPS.01.01.01-L9P-01', repTitle.code as string);
    const saved = await page.request.post(`/api/career/titles/${repTitle.id}/file`, { data: { text: file, dryRun: false }, headers: ORIGIN });
    expect(saved.status(), await saved.text()).toBe(200);
    expect((await page.request.post(`/api/career/titles/${repTitle.id}/publish`, { headers: ORIGIN })).status()).toBe(200);
    const evalFile = await page.request.post('/api/performance/templates/file', { data: { text: FULL_EVAL_FILE, dryRun: false }, headers: ORIGIN });
    expect(evalFile.status(), await evalFile.text()).toBe(200);
  });

  test('the employee is held back by the gate, reads the five sections in order and acknowledges', async ({ browser }) => {
    const { context, page } = await actAs(browser, rep);
    await page.goto('/career-profile');
    await expect(page.getByText('أول دخول لك')).toBeVisible();
    await new Screen(page).expectNoSeriousA11yIssues();
    await page.screenshot({ path: 'test-results/journey-gate.png' });
    await context.close();
  });
});

import type { PermissionGrant } from '@arweqah-platform/shared';
import { CorePermission } from '@arweqah-platform/shared';
import type { TestContext } from '../setup/test-app';
import { FULL_EVAL_FILE } from './eval-file';
import { chainScenario } from './title-chain';

/** Grants of these keys at one scope (everything, by default). */
export const grants = (keys: string[], scope: PermissionGrant['scope'] = 'all'): PermissionGrant[] => keys.map((key) => ({ key, scope }));

/** The keys of HR in the evaluation cycle: open it, move it on, close it, and keep its catalog. */
export const HR = [CorePermission.PerformanceCycleView, CorePermission.PerformanceTemplateUpload, CorePermission.PerformanceCycleManage, CorePermission.PerformanceCycleClose, CorePermission.PerformanceCatalogManage];

/** The reporting-line scenario with HR holding the cycle keys and the evaluation file saved. */
export async function evaluationScenario(t: TestContext) {
  const s = await chainScenario(t);
  const hr = await t.factories.signIn(await t.factories.user({ grants: grants(HR) }));
  await hr.post('/api/performance/templates/file').send({ text: FULL_EVAL_FILE, dryRun: false }).expect(200);
  return { ...s, hr };
}

const TEAM_KEYS = [CorePermission.PerformanceTeamView, CorePermission.PerformanceTeamEvaluate];

/**
 * The evaluation scenario taken to the point calibration starts from: the employee (Rep) reports to the direct manager (Lead), the cycle is open, and the manager has sent
 * a complete evaluation (every criterion 80, every behaviour «often», one catalog item). The cycle stays in the managers' stage; the caller moves it on.
 */
export async function managerSentScenario(t: TestContext, employeeKeys: string[]) {
  const { hr, ...s } = await evaluationScenario(t);
  const directUser = await s.person(s.lead, s.group, grants(TEAM_KEYS));
  const employeeUser = await s.person(s.rep, s.group, grants(employeeKeys));
  await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [directUser.employeeId, employeeUser.employeeId]);
  const direct = await t.factories.signIn(directUser);
  const employee = await t.factories.signIn(employeeUser);
  const init = (await hr.post('/api/performance/cycle/catalog').send({ kind: 'init', title: 'قيادة مبادرة تحسين', points: 4 }).expect(201)).body as { id: string };
  await hr.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(200);
  await hr.post('/api/performance/cycle/advance').expect(200); // mgr
  const path = `/api/performance/team/${employeeUser.employeeId}`;
  const template = (await direct.get(path).expect(200)).body.template as { criteria: unknown[]; behaviours: { code: string }[] };
  const form = {
    results: Object.fromEntries(template.criteria.map((_, i) => [String(i), 80])),
    behaviours: Object.fromEntries(template.behaviours.map((b) => [b.code, { level: 75, note: '' }])),
    initIds: [init.id], growthIds: [] as string[],
  };
  const managerScore = ((await direct.post(`${path}/send`).send(form).expect(200)).body.score as { final: number }).final;
  return { ...s, hr, direct, employee, employeeUser, path, form, managerScore };
}

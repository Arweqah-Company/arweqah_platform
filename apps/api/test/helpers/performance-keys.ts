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

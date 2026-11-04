import { CorePermission, type PermissionGrant } from '@arweqah-platform/shared';
import type { TestContext } from '../setup/test-app';

export const grant = (key: string, scope: PermissionGrant['scope']): PermissionGrant => ({ key, scope });

/** What the HR person of the placement specs may do: see and edit every employee, change their placement and read their history. */
export const HR_GRANTS: PermissionGrant[] = [CorePermission.EmployeesView, CorePermission.EmployeesHistoryView, CorePermission.EmployeesUpdate, CorePermission.EmployeesAssignChange].map((k) => grant(k, 'all'));

/** An HR person (signed in with `grants`), a company with three units, and two employees in the first unit: the one to change and a colleague who can be their manager. */
export async function hrScenario(t: TestContext, grants: PermissionGrant[]) {
  const org = await t.factories.org();
  const admin = await t.factories.user({ grants });
  const agent = await t.factories.signIn(admin);
  const person = await t.factories.user({ unit: org.unitA });
  const boss = await t.factories.user({ unit: org.unitA });
  return { org, admin, agent, person, boss };
}

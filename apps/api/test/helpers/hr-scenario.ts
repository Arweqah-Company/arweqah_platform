import { CorePermission, type EmployeeAssignmentDto, type EmployeeAssignmentsDto, type PermissionGrant } from '@arweqah-platform/shared';
import { todayInRiyadh } from '../../src/common/domain/riyadh-date';
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

/** The Riyadh date `days` from today (negative for the past). */
export const dayFromToday = (days: number): string => {
  const date = new Date(`${todayInRiyadh()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** The periods of one field (`org_node`, `job_title`, `manager`) in an employee's history. */
export const of = (body: EmployeeAssignmentsDto, field: string): EmployeeAssignmentDto[] => body.items.filter((i) => i.field === field);

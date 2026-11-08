import type { JobTitleDto, PermissionGrant } from '@arweqah-platform/shared';
import type { TestAgent, TestUnit, TestUser } from '../factories/factories';
import type { TestContext } from '../setup/test-app';
import { orgAdmin } from './org-admin';

/**
 * A sector managed per company with a department under it that has a reporting line of three titles (Head grade 4 M, Lead grade 6 M reporting to Head,
 * Rep grade 7 P reporting to Lead), a second company, and the administrator who built it. People are placed in the department with `person`.
 */
export async function chainScenario(t: TestContext) {
  const group = await t.factories.defaultCompany();
  const companyB = await t.factories.company();
  const sector = await t.factories.node({ key: 'sector', parentId: null, name: 'Growth', mode: 'per_company' });
  const dept = await t.factories.node({ key: 'department', parentId: sector.id, name: 'Sales', titles: true });
  const { agent, user: adminUser } = await orgAdmin(t);
  const addTitle = async (name: string, grade: number, track: string, reportsToTitleId?: string): Promise<JobTitleDto> =>
    ((await agent.post(`/api/org/nodes/${dept.id}/job-titles`).send({ jobTitles: [{ nameAr: `${name} ع`, nameEn: name, grade, track, ...(reportsToTitleId ? { reportsToTitleId } : {}) }] }).expect(201)).body as JobTitleDto[])[0] as JobTitleDto;
  const head = await addTitle('Head', 4, 'M');
  const lead = await addTitle('Lead', 6, 'M', head.id);
  const rep = await addTitle('Rep', 7, 'P', lead.id);
  /** An employee of `company` holding `title` in the department. */
  const person = async (title: JobTitleDto, company: string, grants?: PermissionGrant[]): Promise<TestUser> => {
    const unit: TestUnit = { id: dept.id, titleId: title.id, companyId: dept.companyId };
    const user = await t.factories.user({ unit, ...(grants ? { grants } : {}) });
    await t.db.query('UPDATE employees SET company_id = $1 WHERE id = $2', [company, user.employeeId]);
    return user;
  };
  const managerOf = async (user: TestUser): Promise<string | null> => ((await t.db.query('SELECT manager_id FROM employees WHERE id = $1', [user.employeeId])) as { manager_id: string | null }[])[0]?.manager_id ?? null;
  return { group, companyB, sector, dept, agent, adminUser, head, lead, rep, person, managerOf, addTitle };
}

export type ChainScenario = Awaited<ReturnType<typeof chainScenario>>;
export type { TestAgent };

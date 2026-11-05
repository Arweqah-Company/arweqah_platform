import { CorePermission, type EmployeeAssignmentsDto, type JobTitleDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { todayInRiyadh } from '../src/common/domain/riyadh-date';
import { EmployeeAssignmentsJob } from '../src/modules/employees/infrastructure/jobs/employee-assignments.job';
import { EmployeeAutoManagerService } from '../src/modules/employees/application/services/employee-auto-manager.service';
import { HR_GRANTS, grant } from './helpers/hr-scenario';
import { orgAdmin } from './helpers/org-admin';
import { chainScenario } from './helpers/title-chain';
import { useTestApp } from './setup/test-app';

describe('The direct manager follows the reporting line of job titles (FR-100, decision Q14)', () => {
  const t = useTestApp();

  async function setup() {
    const s = await chainScenario(t);
    const hr = await t.factories.signIn(await t.factories.user({ grants: [...HR_GRANTS, grant(CorePermission.EmployeesAssignRoles, 'all')] }));
    const refresh = () => t.app.get(EmployeeAutoManagerService).refresh();
    const history = async (employeeId: string): Promise<{ source: string | null; reason: string; value: string | null; createdBy: string | null }[]> =>
      (await t.db.query(
        `SELECT manager_source AS source, reason, manager_employee_id AS value, created_by AS "createdBy" FROM employee_assignments WHERE employee_id = $1 AND field = 'manager' ORDER BY valid_from, created_at`,
        [employeeId],
      )) as { source: string | null; reason: string; value: string | null; createdBy: string | null }[];
    const place = (employeeId: string, body: Record<string, unknown>) => hr.post(`/api/employees/${employeeId}/assignments`).send({ validFrom: todayInRiyadh(), reason: 'HR', ...body });
    return { ...s, hr, refresh, history, place };
  }

  it('climbs past a vacant title to the nearest one somebody holds, in the employee\'s own company, and records it as the system\'s choice', async () => {
    const s = await setup();
    const repB = await s.person(s.rep, s.companyB);
    const headB = await s.person(s.head, s.companyB); // the Lead title has nobody: skipped
    expect(await s.managerOf(repB)).toBeNull();
    expect(await s.refresh()).toBeGreaterThan(0);
    expect(await s.managerOf(repB)).toBe(headB.employeeId);
    expect(await s.history(repB.employeeId)).toEqual([
      { source: 'auto_chain', reason: 'Placement at the start of history', value: null, createdBy: null },
      { source: 'auto_chain', reason: 'chain', value: headB.employeeId, createdBy: null },
    ]);
  });

  it('never leaves the company: a holder in another company is not a manager, and a title nobody of the company holds leaves the manager empty', async () => {
    const s = await setup();
    const repB = await s.person(s.rep, s.companyB);
    const repG = await s.person(s.rep, s.group);
    const headG = await s.person(s.head, s.group);
    await s.refresh();
    expect(await s.managerOf(repG)).toBe(headG.employeeId);
    expect(await s.managerOf(repB)).toBeNull();
    expect(await s.history(repB.employeeId)).toHaveLength(0); // nothing changed, no row added
  });

  it('moves the subordinates by itself when a new holder takes the title above them, and again when the holder leaves', async () => {
    const s = await setup();
    const repB = await s.person(s.rep, s.companyB);
    const headB = await s.person(s.head, s.companyB);
    const leadCandidate = await s.person(s.rep, s.companyB);
    await s.refresh();
    expect(await s.managerOf(repB)).toBe(headB.employeeId);
    await s.place(leadCandidate.employeeId, { jobTitleId: s.lead.id }).expect(201);
    expect(await s.managerOf(repB)).toBe(leadCandidate.employeeId); // nearer than the head
    await t.db.query('UPDATE employees SET deleted_at = now() WHERE id = $1', [leadCandidate.employeeId]);
    await s.refresh();
    expect(await s.managerOf(repB)).toBe(headB.employeeId);
    await t.db.query('UPDATE employees SET deleted_at = now() WHERE id = $1', [headB.employeeId]);
    await s.refresh();
    expect(await s.managerOf(repB)).toBeNull();
  });

  it('keeps a manager HR chose: it is recorded as manual and stays when the people above change', async () => {
    const s = await setup();
    const repB = await s.person(s.rep, s.companyB);
    const headB = await s.person(s.head, s.companyB);
    const chosen = await s.person(s.rep, s.companyB);
    await s.refresh();
    const res = await s.place(repB.employeeId, { managerId: chosen.employeeId }).expect(201);
    // The system's choice of today is corrected by HR's choice of the same day (the same rule as any same-day change).
    expect((res.body as EmployeeAssignmentsDto).items.filter((i) => i.field === 'manager').map((i) => [i.valueId, i.managerSource])).toEqual([
      [null, 'auto_chain'],
      [chosen.employeeId, 'manual'],
    ]);
    expect(headB.employeeId).toBeTruthy();
    const newLead = await s.person(s.lead, s.companyB);
    await s.refresh();
    expect(newLead.employeeId).toBeTruthy();
    expect(await s.managerOf(repB)).toBe(chosen.employeeId);
    expect((await s.history(repB.employeeId)).at(-1)).toMatchObject({ source: 'manual', value: chosen.employeeId });
  });

  it('leaves alone an employee whose title has no reporting line, and an explicit manager that existed before (imported as manual)', async () => {
    const s = await setup();
    const boss = await s.person(s.head, s.companyB);
    const plain = await t.factories.user({ unit: { id: s.dept.id, titleId: s.dept.titleId, companyId: s.dept.companyId } }); // the legacy title has no line
    await t.db.query('UPDATE employees SET company_id = $1, manager_id = $2 WHERE id = $3', [s.companyB, boss.employeeId, plain.employeeId]);
    await t.db.query(`INSERT INTO employee_assignments (employee_id, field, manager_employee_id, manager_source, valid_from, reason) VALUES ($1, 'manager', $2, 'manual', '2024-01-01', 'before')`, [plain.employeeId, boss.employeeId]);
    const bossLegacy = await s.person(s.rep, s.companyB);
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [plain.employeeId, bossLegacy.employeeId]);
    await t.db.query(`INSERT INTO employee_assignments (employee_id, field, manager_employee_id, manager_source, valid_from, reason) VALUES ($1, 'manager', $2, 'manual', '2024-01-01', 'before')`, [bossLegacy.employeeId, plain.employeeId]);
    await s.refresh();
    expect(await s.managerOf(plain)).toBe(boss.employeeId);
    expect(await s.managerOf(bossLegacy)).toBe(plain.employeeId);
  });

  it('is idempotent and also runs in the nightly job', async () => {
    const s = await setup();
    const repB = await s.person(s.rep, s.companyB);
    const headB = await s.person(s.head, s.companyB);
    await t.app.get(EmployeeAssignmentsJob).scheduled();
    expect(await s.managerOf(repB)).toBe(headB.employeeId);
    const rows = (await s.history(repB.employeeId)).length;
    expect(await s.refresh()).toBe(0);
    await t.app.get(EmployeeAssignmentsJob).scheduled();
    expect((await s.history(repB.employeeId)).length).toBe(rows);
  });

  it('in a shared unit the manager is a holder from the group company, whatever company the employee is in', async () => {
    const group = await t.factories.defaultCompany();
    const companyB = await t.factories.company();
    const sector = await t.factories.node({ key: 'sector', parentId: null, name: 'Shared sector', mode: 'shared' });
    const dept = await t.factories.node({ key: 'department', parentId: sector.id, name: 'Services', titles: true });
    const { agent } = await orgAdmin(t);
    const add = async (name: string, grade: number, up?: string): Promise<JobTitleDto> =>
      ((await agent.post(`/api/org/nodes/${dept.id}/job-titles`).send({ jobTitles: [{ nameAr: `${name} ع`, nameEn: name, grade, track: 'M', ...(up ? { reportsToTitleId: up } : {}) }] }).expect(201)).body as JobTitleDto[])[0]!;
    const head = await add('Head', 4);
    const clerk = await add('Clerk', 7, head.id);
    const place = async (title: JobTitleDto, company: string) => {
      const user = await t.factories.user({ unit: { id: dept.id, titleId: title.id, companyId: dept.companyId } });
      await t.db.query('UPDATE employees SET company_id = $1 WHERE id = $2', [company, user.employeeId]);
      return user;
    };
    const clerkB = await place(clerk, companyB);
    const headB = await place(head, companyB); // a holder from company B does not lead a shared unit
    await t.app.get(EmployeeAutoManagerService).refresh();
    const managerOf = async (id: string) => ((await t.db.query('SELECT manager_id FROM employees WHERE id = $1', [id])) as { manager_id: string | null }[])[0]!.manager_id;
    expect(await managerOf(clerkB.employeeId)).toBeNull();
    const headG = await place(head, group);
    await t.app.get(EmployeeAutoManagerService).refresh();
    expect(await managerOf(clerkB.employeeId)).toBe(headG.employeeId);
    expect(headB.employeeId).toBeTruthy();
  });

  it('403 for placing an employee without the placement key (the manual choice goes through the placement endpoint)', async () => {
    const s = await setup();
    const repB = await s.person(s.rep, s.companyB);
    const plain = await t.factories.signIn(await t.factories.user());
    await plain.post(`/api/employees/${repB.employeeId}/assignments`).send({ managerId: null, validFrom: todayInRiyadh(), reason: 'x' }).expect(403);
  });
});

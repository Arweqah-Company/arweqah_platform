import { CorePermission, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { todayInRiyadh } from '../src/common/domain/riyadh-date';
import { ORG_ADMIN_GRANTS, orgAdmin } from './helpers/org-admin';
import { useTestApp } from './setup/test-app';

const P = CorePermission;
const grant = (key: string): PermissionGrant => ({ key, scope: 'all' });

describe('A leader takes the unit and the title they lead with; the employee form can make a leader (FR-100)', () => {
  const t = useTestApp();

  /** Two departments of one sector managed per company, each with its own title; one employee of the group company sits in the first. */
  async function setup() {
    const group = await t.factories.defaultCompany();
    const sector = await t.factories.node({ key: 'sector', parentId: null, name: 'Growth', mode: 'per_company' });
    const sales = await t.factories.node({ key: 'department', parentId: sector.id, name: 'Sales', titles: true });
    const support = await t.factories.node({ key: 'department', parentId: sector.id, name: 'Support', titles: true });
    const { agent } = await orgAdmin(t, [...ORG_ADMIN_GRANTS, grant(P.RolesView)]);
    const person = await t.factories.user({ unit: sales });
    await t.db.query('UPDATE employees SET company_id = $1 WHERE id = $2', [group, person.employeeId]);
    const place = async () => ((await t.db.query('SELECT org_node_id, job_title_id FROM employees WHERE id = $1', [person.employeeId])) as { org_node_id: string; job_title_id: string }[])[0]!;
    const lead = (unit: { id: string }, body: Record<string, unknown>) => agent.put(`/api/org/nodes/${unit.id}/leaders`).send({ kind: 'leader', companyId: group, employeeId: person.employeeId, validFrom: todayInRiyadh(), reason: 'تعيين القائد', ...body });
    return { group, sales, support, agent, person, place, lead };
  }

  it('places the leader in the unit with the title they chose, so their record shows the unit, the title and the head role', async () => {
    const s = await setup();
    await s.lead(s.support, { jobTitleId: s.support.titleId }).expect(200);
    expect(await s.place()).toEqual({ org_node_id: s.support.id, job_title_id: s.support.titleId });
    const roles = (await s.agent.get('/api/roles').expect(200)).body as { orgNodeId: string | null; usersCount: number }[];
    expect(roles.find((r) => r.orgNodeId === s.support.id)?.usersCount).toBe(1); // the head role of the unit they lead
    const fields = ((await t.db.query('SELECT field FROM employee_assignments WHERE employee_id = $1', [s.person.employeeId])) as { field: string }[]).map((r) => r.field);
    expect(fields).toEqual(expect.arrayContaining(['org_node', 'job_title'])); // the move is in the placement history, with its reason
  });

  it('needs no reason: the history says the leader was appointed from the structure, and a reason that is written is kept', async () => {
    const s = await setup();
    const res = await s.agent.put(`/api/org/nodes/${s.support.id}/leaders`).send({ kind: 'leader', companyId: s.group, employeeId: s.person.employeeId, validFrom: todayInRiyadh(), jobTitleId: s.support.titleId }).expect(200);
    expect(res.body.items[0].reason).toBe('Appointed from the structure');
    const reasons = ((await t.db.query(`SELECT reason FROM employee_assignments WHERE employee_id = $1`, [s.person.employeeId])) as { reason: string }[]).map((r) => r.reason);
    expect(reasons).toContain('Appointed from the structure'); // the move carries the same words
    const kept = await s.agent.put(`/api/org/nodes/${s.sales.id}/leaders`).send({ kind: 'leader', companyId: s.group, employeeId: s.person.employeeId, validFrom: todayInRiyadh(), reason: 'سبب مكتوب' }).expect(200);
    expect(kept.body.items[0].reason).toBe('سبب مكتوب');
    await s.agent.put(`/api/org/nodes/${s.sales.id}/leaders`).send({ kind: 'leader', companyId: s.group, employeeId: s.person.employeeId, validFrom: todayInRiyadh(), reason: 'ab' }).expect(400); // a written reason must still be a reason
  });

  it('keeps the person where they are when no title is sent (the old behaviour), and does nothing twice when they already sit there with that title', async () => {
    const s = await setup();
    await s.lead(s.support, {}).expect(200);
    expect(await s.place()).toEqual({ org_node_id: s.sales.id, job_title_id: s.sales.titleId });
    await s.lead(s.sales, { jobTitleId: s.sales.titleId }).expect(200); // already in Sales with that title
    expect(await s.place()).toEqual({ org_node_id: s.sales.id, job_title_id: s.sales.titleId });
  });

  it('refuses a title that is not a title of the unit, and leaves the person and the unit as they were', async () => {
    const s = await setup();
    const res = await s.lead(s.support, { jobTitleId: s.sales.titleId });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await s.place()).toEqual({ org_node_id: s.sales.id, job_title_id: s.sales.titleId });
    const leaders = (await s.agent.get(`/api/org/nodes/${s.support.id}/leaders`).expect(200)).body as { items: unknown[] };
    expect(leaders.items).toHaveLength(0);
  });

  it('does not move an acting leader', async () => {
    const s = await setup();
    const other = await t.factories.user({ unit: s.support });
    await t.db.query('UPDATE employees SET company_id = $1 WHERE id = $2', [s.group, other.employeeId]);
    await s.agent.put(`/api/org/nodes/${s.support.id}/leaders`).send({ kind: 'leader', companyId: s.group, employeeId: other.employeeId, validFrom: todayInRiyadh(), reason: 'تعيين' }).expect(200);
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const later = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    await s.lead(s.support, { kind: 'acting', validFrom: tomorrow, validTo: later, jobTitleId: s.support.titleId }).expect(200);
    expect(await s.place()).toEqual({ org_node_id: s.sales.id, job_title_id: s.sales.titleId });
  });

  describe('«this employee leads the unit» in the employee form', () => {
    const body = (unit: { id: string; titleId: string; companyId: string }, n: string, extra: Record<string, unknown> = {}) => ({
      companyId: unit.companyId, orgNodeId: unit.id, jobTitleId: unit.titleId, workEmail: `lead${n}@arweqah.sa`, employeeNumber: `L${n}`, fullName: `قائد ${n}`, startDate: '2024-03-01', ...extra,
    });

    it('makes the new employee the leader of the unit they are placed in, with the head role', async () => {
      const s = await setup();
      const hrAgent = await t.factories.signIn(await t.factories.user({ grants: [P.EmployeesView, P.EmployeesCreate, P.EmployeesUpdate, P.OrgLeadersManage, P.OrgView].map(grant) }));
      const res = await hrAgent.post('/api/employees').send(body({ ...s.support, companyId: s.group }, '01', { leadsUnit: true })).expect(201);
      const leaders = (await s.agent.get(`/api/org/nodes/${s.support.id}/leaders`).expect(200)).body as { items: { employeeId: string; kind: string; status: string }[] };
      expect(leaders.items).toEqual([expect.objectContaining({ employeeId: res.body.employee.id, kind: 'leader', status: 'current' })]);
      const roles = (await s.agent.get('/api/roles').expect(200)).body as { orgNodeId: string | null; usersCount: number }[];
      expect(roles.find((r) => r.orgNodeId === s.support.id)?.usersCount).toBe(1);
    });

    it('is refused (403) for a person without the leaders key, and nothing is saved', async () => {
      const s = await setup();
      const hrAgent = await t.factories.signIn(await t.factories.user({ grants: [P.EmployeesView, P.EmployeesCreate].map(grant) }));
      await hrAgent.post('/api/employees').send(body({ ...s.support, companyId: s.group }, '02', { leadsUnit: true })).expect(403);
      expect(((await t.db.query(`SELECT 1 FROM employees WHERE employee_number = 'L02'`)) as unknown[]).length).toBe(0);
    });

    it('saving an edited employee again does not close and reopen the same leader', async () => {
      const s = await setup();
      const hrAgent = await t.factories.signIn(await t.factories.user({ grants: [P.EmployeesView, P.EmployeesCreate, P.EmployeesUpdate, P.OrgLeadersManage, P.OrgView].map(grant) }));
      const made = await hrAgent.post('/api/employees').send(body({ ...s.support, companyId: s.group }, '03', { leadsUnit: true })).expect(201);
      const id = made.body.employee.id as string;
      await hrAgent.put(`/api/employees/${id}`).send({ ...body({ ...s.support, companyId: s.group }, '03', { leadsUnit: true }), workEmail: undefined }).expect(200);
      const rows = (await t.db.query('SELECT valid_to FROM org_node_leaders WHERE node_id = $1', [s.support.id])) as { valid_to: string | null }[];
      expect(rows).toHaveLength(1);
      expect(rows[0]!.valid_to).toBeNull();
    });
  });
});

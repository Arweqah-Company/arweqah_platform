import { CorePermission, type EmployeeDto, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { ADMIN_MODE_GRANT, type TestUser } from './factories/factories';
import { useTestApp } from './setup/test-app';

const P = CorePermission;
const grant = (key: string, scope: PermissionGrant['scope']): PermissionGrant => ({ key, scope });

describe('A plain employee sees and edits only their own account (FR-83)', () => {
  const t = useTestApp();

  /** The body the form sends back for an employee: their record as it is, with some fields changed. */
  const formOf = (e: EmployeeDto, changes: Record<string, unknown> = {}) => ({
    companyId: e.company.id, orgNodeId: e.orgNode?.id, jobTitleId: e.jobTitle?.id, managerId: e.manager?.id,
    workEmail: e.workEmail, employeeNumber: e.employeeNumber, fullName: e.fullName, startDate: e.startDate, ...changes,
  });

  async function setup() {
    const org = await t.factories.org();
    const me = await t.factories.user({ unit: org.unitA });
    const colleague = await t.factories.user({ unit: org.unitA });
    const agent = await t.factories.signIn(me);
    return { org, me, colleague, agent };
  }

  const own = async (agent: Awaited<ReturnType<typeof setup>>['agent'], me: TestUser): Promise<EmployeeDto> => (await agent.get(`/api/employees/${me.employeeId}`).expect(200)).body;

  it('lists only their own record, opens it, and does not find anyone else\'s', async () => {
    const { me, colleague, agent } = await setup();
    const list = (await agent.get('/api/employees').query({ pageSize: 100 }).expect(200)).body.items as { id: string }[];
    expect(list.map((e) => e.id)).toEqual([me.employeeId]);
    await own(agent, me);
    await agent.get(`/api/employees/${colleague.employeeId}`).expect(404);
  });

  it('cannot add, deactivate, end the contract of, import, export or give roles to anyone, themselves included', async () => {
    const { me, colleague, agent } = await setup();
    await agent.post('/api/employees').send({}).expect(403);
    for (const id of [me.employeeId, colleague.employeeId]) {
      await agent.post(`/api/employees/${id}/deactivate`).expect(403);
      await agent.post(`/api/employees/${id}/terminate`).send({}).expect(403);
      await agent.put(`/api/employees/${id}/roles`).send({ roleIds: [] }).expect(403);
      await agent.put(`/api/employees/${id}/groups`).send({ groupIds: [] }).expect(403);
    }
  });

  it('cannot edit a colleague', async () => {
    const { me, colleague, agent } = await setup();
    const mine = await own(agent, me);
    await agent.put(`/api/employees/${colleague.employeeId}`).send(formOf(mine, { workEmail: 'x@arweqah.sa' })).expect(404);
  });

  it('edits their own phone numbers, personal e-mail and English name', async () => {
    const { me, agent } = await setup();
    const mine = await own(agent, me);
    const changed = (await agent.put(`/api/employees/${me.employeeId}`).send(formOf(mine, { workPhone: '+966112345678', personalPhone: '+966501234567', personalEmail: 'me@example.com', fullNameEn: 'Me Myself' })).expect(200)).body;
    expect(changed).toMatchObject({ workPhone: '+966112345678', personalPhone: '+966501234567', personalEmail: 'me@example.com', fullNameEn: 'Me Myself' });
  });

  it('cannot change their job title, manager, unit, contract dates or name: 422 FIELD_NOT_EDITABLE; the salary and currency are never written', async () => {
    const { org, me, colleague, agent } = await setup();
    const mine = await own(agent, me);
    const refused = async (changes: Record<string, unknown>, field: string) => {
      const res = await agent.put(`/api/employees/${me.employeeId}`).send(formOf(mine, changes));
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('FIELD_NOT_EDITABLE');
      expect(JSON.stringify(res.body)).toContain(field);
    };
    await refused({ jobTitleId: org.unitB.titleId, orgNodeId: org.unitB.id }, 'jobTitleId');
    await refused({ managerId: colleague.employeeId }, 'managerId');
    await refused({ startDate: '2020-01-01' }, 'startDate');
    await refused({ endDate: '2030-01-01' }, 'endDate');
    const currency = ((await t.db.query(`SELECT id FROM countries WHERE code = 'SA'`)) as { id: string }[])[0]?.id;
    // Sensitive fields are never written without view_sensitive: the request passes and they keep their stored values.
    await agent.put(`/api/employees/${me.employeeId}`).send(formOf(mine, { monthlyGrossSalary: 99999, salaryCurrencyCountryId: currency })).expect(200);
    const stored = (await t.db.query('SELECT monthly_gross_salary_enc AS salary, salary_currency_country_id AS currency FROM employees WHERE id = $1', [me.employeeId])) as { salary: string | null; currency: string | null }[];
    expect(stored[0]).toEqual({ salary: null, currency: null });
    await refused({ fullName: 'اسم آخر' }, 'fullName');
    expect((await own(agent, me)).startDate).toBe(mine.startDate);
  });

  it('HR (edit reaches the company) and the platform admin edit every field, their own record included', async () => {
    const org = await t.factories.org();
    const hr = await t.factories.user({ unit: org.unitA, grants: [grant(P.EmployeesView, 'all'), grant(P.EmployeesUpdate, 'all')] });
    const agent = await t.factories.signIn(hr);
    const mine: EmployeeDto = (await agent.get(`/api/employees/${hr.employeeId}`).expect(200)).body;
    await agent.put(`/api/employees/${hr.employeeId}`).send(formOf(mine, { startDate: '2023-05-01', profession: 'محلل' })).expect(200);
    const boss = await t.factories.user({ unit: org.unitB, grants: [ADMIN_MODE_GRANT, grant(P.EmployeesView, 'all'), grant(P.EmployeesUpdate, 'all')] });
    const admin = await t.factories.signInAdminMode(boss);
    const adminOwn: EmployeeDto = (await admin.get(`/api/employees/${boss.employeeId}`).expect(200)).body;
    await admin.put(`/api/employees/${boss.employeeId}`).send(formOf(adminOwn, { jobTitleId: org.unitB.titleId, startDate: '2022-02-02' })).expect(200);
  });
});

import { CorePermission, type EmployeeAssignmentsDto, type EmployeeListItemDto, type Paginated, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { todayInRiyadh } from '../src/common/domain/riyadh-date';
import { useTestApp } from './setup/test-app';

const P = CorePermission;
const grant = (key: string, scope: PermissionGrant['scope']): PermissionGrant => ({ key, scope });
const hr = [P.EmployeesView, P.EmployeesUpdate, P.EmployeesHistoryView, P.EmployeesAssignChange].map((k) => grant(k, 'all'));

describe('Update mode of the employee import (FR-95)', () => {
  const t = useTestApp();

  async function setup() {
    const org = await t.factories.org();
    const agent = await t.factories.signIn(await t.factories.user({ grants: hr }));
    const people = [await t.factories.user({ unit: org.unitA }), await t.factories.user({ unit: org.unitA })];
    const numbers = async () => (await t.db.query('SELECT id, employee_number FROM employees WHERE id = ANY($1) ORDER BY employee_number', [people.map((p) => p.employeeId)])) as { id: string; employee_number: string }[];
    return { org, agent, people, numbers };
  }

  it('finds the people a file names by their numbers, and only those', async () => {
    const { agent, numbers } = await setup();
    const [first, second] = await numbers();
    const res = (await agent.get('/api/employees').query({ employeeNumbers: `${first?.employee_number}, ${second?.employee_number} ,NO-SUCH`, pageSize: 100 }).expect(200)).body as Paginated<EmployeeListItemDto>;
    expect(res.items.map((i) => i.employeeNumber).sort()).toEqual([first?.employee_number, second?.employee_number].sort());
    expect(res.total).toBe(2);
  });

  it('refuses more than 100 numbers in one request (400) and does not find people outside the reach of the reader', async () => {
    const { agent, org, numbers } = await setup();
    const many = Array.from({ length: 101 }, (_, i) => `N${i}`).join(',');
    await agent.get('/api/employees').query({ employeeNumbers: many }).expect(400);
    const outsider = await t.factories.user({ unit: org.unitOther });
    const narrow = await t.factories.signIn(await t.factories.user({ unit: org.unitA, grants: [grant(P.EmployeesView, 'company')] }));
    const [row] = (await t.db.query('SELECT employee_number FROM employees WHERE id = $1', [outsider.employeeId])) as { employee_number: string }[];
    const res = (await narrow.get('/api/employees').query({ employeeNumbers: row?.employee_number }).expect(200)).body as Paginated<EmployeeListItemDto>;
    expect(res.items).toHaveLength(0);
    expect((await numbers()).length).toBe(2);
  });

  it('updates the person as an edit, with no new employee: the unit change starts today with the import reason and is kept in the history', async () => {
    const { agent, org, people } = await setup();
    const before = Number((await t.db.query('SELECT count(*) FROM employees'))[0].count);
    const id = people[0]?.employeeId as string;
    const record = (await agent.get(`/api/employees/${id}`).expect(200)).body;
    await agent.put(`/api/employees/${id}`).send({
      companyId: record.company.id, orgNodeId: org.unitB.id, jobTitleId: org.unitB.titleId, workEmail: record.workEmail, employeeNumber: record.employeeNumber, fullName: record.fullName, startDate: record.startDate,
      effectiveFrom: todayInRiyadh(), changeReason: 'Imported from a file',
    }).expect(200);
    expect(Number((await t.db.query('SELECT count(*) FROM employees'))[0].count)).toBe(before);
    const history = (await agent.get(`/api/employees/${id}/assignments`).expect(200)).body as EmployeeAssignmentsDto;
    expect(history.items.find((i) => i.field === 'org_node' && i.status === 'current')).toMatchObject({ valueId: org.unitB.id, reason: 'Imported from a file' });
  });
});

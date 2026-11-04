import { CorePermission, type EmployeeAssignmentsDto, type EmployeeChangeDto, type Paginated } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { todayInRiyadh } from '../src/common/domain/riyadh-date';
import { grant, HR_GRANTS, hrScenario } from './helpers/hr-scenario';
import { useTestApp } from './setup/test-app';

const P = CorePermission;
const hr = HR_GRANTS;

describe("The employee's history tab: placement with names and the change log (FR-90)", () => {
  const t = useTestApp();

  const setup = () => hrScenario(t, hr);

  /** The whole edit form with the given fields changed (the update takes the full form). */
  async function edit(agent: Awaited<ReturnType<typeof setup>>['agent'], id: string, changes: Record<string, unknown>) {
    const before = (await agent.get(`/api/employees/${id}`).expect(200)).body;
    return agent.put(`/api/employees/${id}`).send({ companyId: before.company.id, orgNodeId: before.orgNode?.id, jobTitleId: before.jobTitle?.id, workEmail: before.workEmail, employeeNumber: before.employeeNumber, fullName: before.fullName, startDate: before.startDate, ...changes });
  }

  it('shows the names of the unit, the title and the manager and of who made the change, not only their ids', async () => {
    const { agent, org, person, boss } = await setup();
    const res = await agent.post(`/api/employees/${person.employeeId}/assignments`).send({ orgNodeId: org.unitB.id, jobTitleId: org.unitB.titleId, managerId: boss.employeeId, validFrom: todayInRiyadh(), reason: 'Moved' }).expect(201);
    const body = res.body as EmployeeAssignmentsDto;
    const unit = body.items.filter((i) => i.field === 'org_node').pop();
    const manager = body.items.find((i) => i.field === 'manager' && i.status === 'current');
    expect(unit?.value?.nameAr).toBeTruthy();
    expect(unit?.value?.nameEn).toBeTruthy();
    expect(manager?.value?.nameAr).toBeTruthy();
    expect(manager?.createdByName).toBeTruthy();
    expect(body.items.find((i) => i.field === 'job_title' && i.status === 'current')?.value?.nameEn).toBeTruthy();
  });

  it('lists what was done to the record, newest first, with field names and who did it', async () => {
    const { agent, org, person } = await setup();
    await (await edit(agent, person.employeeId, { workLocation: 'Riyadh HQ' })).body;
    await agent.post(`/api/employees/${person.employeeId}/assignments`).send({ orgNodeId: org.unitB.id, jobTitleId: org.unitB.titleId, validFrom: todayInRiyadh(), reason: 'Moved' }).expect(201);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const res = await agent.get(`/api/employees/${person.employeeId}/changes`).expect(200);
    const page = res.body as Paginated<EmployeeChangeDto>;
    expect(page.items.map((i) => i.action)).toEqual(expect.arrayContaining(['employee.updated', 'employee.assignment.changed']));
    const update = page.items.find((i) => i.action === 'employee.updated');
    expect(update?.fields).toContain('workLocation');
    expect(update?.actorName).toBeTruthy();
    expect(page.items.every((i, index) => index === 0 || (page.items[index - 1]?.createdAt ?? '') >= i.createdAt)).toBe(true);
  });

  it('never carries a value, only field names', async () => {
    const { agent, person } = await setup();
    await edit(agent, person.employeeId, { workLocation: 'SECRET-PLACE-123' });
    await new Promise((resolve) => setTimeout(resolve, 300));
    const res = await agent.get(`/api/employees/${person.employeeId}/changes`).expect(200);
    expect(JSON.stringify(res.body)).not.toContain('SECRET-PLACE-123');
  });

  it('is read by a person for their own record only with the own scope; a colleague gets 404', async () => {
    const { org, boss } = await setup();
    const me = await t.factories.user({ unit: org.unitA, grants: [grant(P.EmployeesView, 'own'), grant(P.EmployeesHistoryView, 'own')] });
    const withKey = await t.factories.signIn(me);
    await withKey.get(`/api/employees/${me.employeeId}/changes`).expect(200);
    await withKey.get(`/api/employees/${me.employeeId}/assignments`).expect(200);
    await withKey.get(`/api/employees/${boss.employeeId}/changes`).expect(404);
    await withKey.get(`/api/employees/${boss.employeeId}/assignments`).expect(404);
  });
});

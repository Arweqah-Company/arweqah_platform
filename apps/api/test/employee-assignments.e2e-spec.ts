import { CorePermission, type EmployeeAssignmentDto, type EmployeeAssignmentsDto, type EmployeeDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { todayInRiyadh } from '../src/common/domain/riyadh-date';
import { EmployeeAssignmentsService } from '../src/modules/employees/application/services/employee-assignments.service';
import { dayBefore } from '../src/modules/employees/domain/rules/assignment.rules';
import { dayFromToday, grant, HR_GRANTS, hrScenario, of } from './helpers/hr-scenario';
import { useTestApp } from './setup/test-app';

const P = CorePermission;
const hr = HR_GRANTS;


describe('Dated placement: unit, job title and manager with history (FR-89)', () => {
  const t = useTestApp();

  async function setup() {
    const { org, admin, agent, person, boss } = await hrScenario(t, hr);
    const route = `/api/employees/${person.employeeId}/assignments`;
    const record = async (id = person.employeeId): Promise<EmployeeDto> => (await agent.get(`/api/employees/${id}`).expect(200)).body;
    return { org, admin, agent, person, boss, route, record };
  }

  it('starts with no history for someone made before the feature, and gives them a first period when they are changed', async () => {
    const { agent, org, route } = await setup();
    expect((await agent.get(route).expect(200)).body.items).toEqual([]);
    const today = todayInRiyadh();
    const res = await agent.post(route).send({ orgNodeId: org.unitB.id, jobTitleId: org.unitB.titleId, validFrom: today, reason: 'Moved to unit B' }).expect(201);
    const units = of(res.body, 'org_node');
    expect(units).toHaveLength(2);
    expect(units[0]).toMatchObject({ valueId: org.unitA.id, validFrom: '2024-01-01', validTo: dayBefore(today), status: 'past' });
    expect(units[1]).toMatchObject({ valueId: org.unitB.id, validFrom: today, validTo: null, status: 'current', reason: 'Moved to unit B' });
    expect(of(res.body, 'job_title')).toHaveLength(2);
  });

  it('puts the new unit and title on the record at once when the change starts today', async () => {
    const { agent, org, route, record } = await setup();
    await agent.post(route).send({ orgNodeId: org.unitB.id, jobTitleId: org.unitB.titleId, validFrom: todayInRiyadh(), reason: 'Moved' }).expect(201);
    const after = await record();
    expect(after.orgNode?.id).toBe(org.unitB.id);
    expect(after.jobTitle?.id).toBe(org.unitB.titleId);
  });

  it('keeps a later change waiting: the record keeps today\'s value until the job applies it on its day, once', async () => {
    const { agent, org, route, record, person } = await setup();
    const day = dayFromToday(10);
    const res = await agent.post(route).send({ orgNodeId: org.unitB.id, jobTitleId: org.unitB.titleId, validFrom: day, reason: 'Transfer next month' }).expect(201);
    const units = of(res.body, 'org_node');
    expect(units[0]).toMatchObject({ validTo: dayBefore(day), status: 'current' });
    expect(units[1]).toMatchObject({ validFrom: day, status: 'pending' });
    expect((await record()).orgNode?.id).toBe(org.unitA.id);
    const service = t.app.get(EmployeeAssignmentsService);
    expect(await service.applyDue(dayFromToday(9))).toBe(0);
    expect((await record()).orgNode?.id).toBe(org.unitA.id);
    expect(await service.applyDue(day)).toBe(2);
    const after = await record();
    expect(after.orgNode?.id).toBe(org.unitB.id);
    expect(after.jobTitle?.id).toBe(org.unitB.titleId);
    expect(await service.applyDue(day)).toBe(0);
    await vi.waitFor(async () => {
      const audit: { count: string }[] = await t.db.query(`SELECT count(*) FROM audit_logs WHERE action = 'employee.assignment.applied' AND entity_id = $1`, [person.employeeId]);
      expect(Number(audit[0]?.count)).toBe(2);
    });
  });

  it('cancels a change that has not started and opens the period it closed again; a change in force cannot be cancelled', async () => {
    const { agent, org, route } = await setup();
    const day = dayFromToday(5);
    const made = await agent.post(route).send({ orgNodeId: org.unitB.id, jobTitleId: org.unitB.titleId, validFrom: day, reason: 'Later' }).expect(201);
    const pending = of(made.body, 'org_node')[1] as EmployeeAssignmentDto;
    const cancelled = await agent.delete(`${route}/${pending.id}`).expect(200);
    const units = of(cancelled.body, 'org_node');
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({ valueId: org.unitA.id, validTo: null, status: 'current' });
    const current = units[0] as EmployeeAssignmentDto;
    const res = await agent.delete(`${route}/${current.id}`).expect(422);
    expect(res.body.code).toBe('ASSIGNMENT_NOT_PENDING');
  });

  it('corrects a change made the same day instead of adding an empty period', async () => {
    const { agent, org, route } = await setup();
    const today = todayInRiyadh();
    await agent.post(route).send({ orgNodeId: org.unitB.id, jobTitleId: org.unitB.titleId, validFrom: today, reason: 'First' }).expect(201);
    const res = await agent.post(route).send({ orgNodeId: org.unitC.id, jobTitleId: org.unitC.titleId, validFrom: today, reason: 'Corrected' }).expect(201);
    const units = of(res.body, 'org_node');
    expect(units).toHaveLength(2);
    expect(units[1]).toMatchObject({ valueId: org.unitC.id, reason: 'Corrected', status: 'current' });
  });

  it('records and clears the direct manager with dates', async () => {
    const { agent, route, boss, record } = await setup();
    const today = todayInRiyadh();
    const set = await agent.post(route).send({ managerId: boss.employeeId, validFrom: today, reason: 'New manager' }).expect(201);
    expect(of(set.body, 'manager').at(-1)).toMatchObject({ valueId: boss.employeeId, status: 'current' });
    expect((await record()).manager?.id).toBe(boss.employeeId);
    const tomorrow = dayFromToday(1);
    const cleared = await agent.post(route).send({ managerId: null, validFrom: tomorrow, reason: 'No manager' }).expect(201);
    expect(of(cleared.body, 'manager').at(-1)).toMatchObject({ valueId: null, status: 'pending' });
    expect((await record()).manager?.id).toBe(boss.employeeId);
  });

  it('refuses a missing reason, an empty change, the past, a date that does not come after, and values that change nothing', async () => {
    const { agent, org, route, boss } = await setup();
    const today = todayInRiyadh();
    await agent.post(route).send({ orgNodeId: org.unitB.id, jobTitleId: org.unitB.titleId, validFrom: today }).expect(400);
    await agent.post(route).send({ validFrom: today, reason: 'Nothing chosen' }).expect(400);
    const past = await agent.post(route).send({ managerId: boss.employeeId, validFrom: dayFromToday(-1), reason: 'Back in time' }).expect(422);
    expect(past.body.code).toBe('ASSIGNMENT_IN_THE_PAST');
    const unchanged = await agent.post(route).send({ orgNodeId: org.unitA.id, validFrom: today, reason: 'Same' }).expect(422);
    expect(unchanged.body.code).toBe('ASSIGNMENT_NO_CHANGE');
    await agent.post(route).send({ managerId: boss.employeeId, validFrom: dayFromToday(10), reason: 'Later' }).expect(201);
    const early = await agent.post(route).send({ managerId: null, validFrom: dayFromToday(5), reason: 'Before the waiting one' }).expect(422);
    expect(early.body.code).toBe('ASSIGNMENT_DATE_NOT_AFTER');
  });

  it('refuses a unit and title that do not fit, a unit of another company, an unknown manager and a manager loop', async () => {
    const { agent, org, route, boss, person } = await setup();
    const today = todayInRiyadh();
    const mismatch = await agent.post(route).send({ orgNodeId: org.unitB.id, jobTitleId: org.unitA.titleId, validFrom: today, reason: 'Title of another unit' }).expect(422);
    expect(mismatch.body.code).toBe('INVALID_PLACEMENT');
    await agent.post(route).send({ orgNodeId: org.unitOther.id, jobTitleId: org.unitOther.titleId, validFrom: today, reason: 'Other company' }).expect(422);
    await agent.post(route).send({ managerId: '00000000-0000-4000-8000-000000000000', validFrom: today, reason: 'Nobody' }).expect(422);
    await agent.post(`/api/employees/${boss.employeeId}/assignments`).send({ managerId: person.employeeId, validFrom: today, reason: 'Boss reports to the person' }).expect(201);
    const loop = await agent.post(route).send({ managerId: boss.employeeId, validFrom: today, reason: 'Loop' }).expect(422);
    expect(loop.body.code).toBe('FIELD_RULE');
  });

  it('is changed only by who holds the key, within their company; the history is read by who holds the history key (403, 404)', async () => {
    const { org, person, route, agent } = await setup();
    const viewer = await t.factories.signIn(await t.factories.user({ grants: [grant(P.EmployeesView, 'all'), grant(P.EmployeesHistoryView, 'all')] }));
    await viewer.get(route).expect(200);

    await viewer.post(route).send({ managerId: null, validFrom: dayFromToday(1), reason: 'No key' }).expect(403);
    const outsider = await t.factories.signIn(await t.factories.user({ unit: org.unitOther, grants: [grant(P.EmployeesView, 'company'), grant(P.EmployeesHistoryView, 'company'), grant(P.EmployeesAssignChange, 'company')] }));
    await outsider.get(route).expect(404);
    await outsider.post(route).send({ managerId: null, validFrom: dayFromToday(1), reason: 'Other company' }).expect(404);
    await agent.get(`/api/employees/${person.employeeId}/assignments`).expect(200);
  });

  it('records a unit change made on the employee form with its start day and reason, and a later start waits for its day', async () => {
    const { agent, org, person, record, route } = await setup();
    const before = await record();
    const form = (changes: Record<string, unknown>) => ({
      companyId: before.company.id, orgNodeId: before.orgNode?.id, jobTitleId: before.jobTitle?.id, managerId: before.manager?.id,
      workEmail: before.workEmail, employeeNumber: before.employeeNumber, fullName: before.fullName, startDate: before.startDate, ...changes,
    });
    const day = dayFromToday(7);
    await agent.put(`/api/employees/${person.employeeId}`).send(form({ orgNodeId: org.unitB.id, jobTitleId: org.unitB.titleId, effectiveFrom: day, changeReason: 'Promotion' })).expect(200);
    expect((await record()).orgNode?.id).toBe(org.unitA.id);
    const waiting = of((await agent.get(route).expect(200)).body, 'org_node').at(-1);
    expect(waiting).toMatchObject({ valueId: org.unitB.id, validFrom: day, reason: 'Promotion', status: 'pending' });
    await agent.put(`/api/employees/${person.employeeId}`).send(form({ orgNodeId: org.unitA.id, jobTitleId: org.unitA.titleId, fullName: 'Renamed only' })).expect(200);
    // Same values again (no placement change) writes no new period; the waiting one is still the last.
    expect(of((await agent.get(route).expect(200)).body, 'org_node').at(-1)).toMatchObject({ status: 'pending' });
    const now = await agent.put(`/api/employees/${person.employeeId}`).send(form({ orgNodeId: org.unitC.id, jobTitleId: org.unitC.titleId, effectiveFrom: dayFromToday(3) })).expect(422);
    expect(now.body.code).toBe('ASSIGNMENT_DATE_NOT_AFTER');
  });

  it('gives a new employee a first period for each value, so the history starts on their start day', async () => {
    const org = await t.factories.org();
    const agent = await t.factories.signIn(await t.factories.user({ grants: [P.EmployeesView, P.EmployeesHistoryView, P.EmployeesCreate, P.EmployeesAssignRoles].map((k) => grant(k, 'all')) }));
    const created = await agent.post('/api/employees').send({ companyId: org.companyId, orgNodeId: org.unitA.id, jobTitleId: org.unitA.titleId, workEmail: 'newhire@arweqah.sa', employeeNumber: 'NH-1', fullName: 'New Hire', startDate: '2024-05-01' }).expect(201);
    const history = (await agent.get(`/api/employees/${created.body.employee.id}/assignments`).expect(200)).body as EmployeeAssignmentsDto;
    expect(history.items.map((i) => i.field).sort()).toEqual(['job_title', 'manager', 'org_node']);
    expect(history.items.find((i) => i.field === 'org_node')).toMatchObject({ valueId: org.unitA.id, validFrom: '2024-05-01', validTo: null, status: 'current' });
    expect(history.items.find((i) => i.field === 'manager')).toMatchObject({ valueId: null });
  });
});

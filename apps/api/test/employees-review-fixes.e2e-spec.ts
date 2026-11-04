import { CorePermission, type BulkUpdateResultDto, type DirectoryProfileDto, type EmployeeAssignmentDto, type EmployeeDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { todayInRiyadh } from '../src/common/domain/riyadh-date';
import { EMPLOYEES_CHANGED } from '../src/core/access/application/access.events';
import { EmployeeRepository } from '../src/modules/employees/domain/contracts/employee.repository';
import { EmployeeAssignmentsService } from '../src/modules/employees/application/services/employee-assignments.service';
import { AssignmentNoChangeError } from '../src/modules/employees/domain/errors/assignment.errors';
import { dayBefore } from '../src/modules/employees/domain/rules/assignment.rules';
import { dayFromToday, grant, HR_GRANTS, hrScenario, of } from './helpers/hr-scenario';
import { useTestApp } from './setup/test-app';

const P = CorePermission;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

/** The problems found in the review of the pull request: each case fails on the code as it was and passes on the fix. */
describe('Review fixes of the employees phase (FR-89, FR-91, FR-92, FR-93)', () => {
  const t = useTestApp();

  describe('bulk edit (FR-93)', () => {
    const bulk = [P.EmployeesView, P.EmployeesUpdate, P.EmployeesAssignChange, P.EmployeesBulkUpdate].map((k) => grant(k, 'company'));

    it('does not tell the name of a person outside the caller\'s reach in the list of refusals (404 rule)', async () => {
      const org = await t.factories.org();
      const agent = await t.factories.signIn(await t.factories.user({ grants: bulk }));
      const outsider = await t.factories.user({ unit: org.unitOther });
      const res = (await agent.post('/api/employees/bulk-update').send({ employeeIds: [outsider.employeeId], workLocation: 'Anywhere', dryRun: true }).expect(200)).body as BulkUpdateResultDto;
      expect(res.rejected).toHaveLength(1);
      expect(res.rejected[0]).toMatchObject({ id: outsider.employeeId, code: 'NOT_FOUND', fullName: '' });
      expect(JSON.stringify(res)).not.toContain(outsider.email);
    });

    it('leaves the plain values untouched when the placement part of the same change is refused', async () => {
      const org = await t.factories.org();
      const agent = await t.factories.signIn(await t.factories.user({ grants: [...HR_GRANTS, grant(P.EmployeesBulkUpdate, 'all')] }));
      const person = await t.factories.user({ unit: org.unitA });
      const before = (await agent.get(`/api/employees/${person.employeeId}`).expect(200)).body as EmployeeDto;
      // The title of unit A does not fit unit B: the placement part is refused.
      const body = { employeeIds: [person.employeeId], workLocation: 'Half-done place', orgNodeId: org.unitB.id, jobTitleId: org.unitA.titleId, validFrom: todayInRiyadh(), reason: 'Reorganisation' };
      const preview = (await agent.post('/api/employees/bulk-update').send({ ...body, dryRun: true }).expect(200)).body as BulkUpdateResultDto;
      const real = (await agent.post('/api/employees/bulk-update').send(body).expect(200)).body as BulkUpdateResultDto;
      expect(real.rejected.map((r) => r.id)).toEqual([person.employeeId]);
      expect(real.rejected).toEqual(preview.rejected);
      const after = (await agent.get(`/api/employees/${person.employeeId}`).expect(200)).body as EmployeeDto;
      expect(after.workLocation).toBe(before.workLocation);
    });
    it('saves the plain values and the placement of one employee together: a placement that fails at the real write takes the plain values back too', async () => {
      const org = await t.factories.org();
      const agent = await t.factories.signIn(await t.factories.user({ grants: [...HR_GRANTS, grant(P.EmployeesBulkUpdate, 'all')] }));
      const person = await t.factories.user({ unit: org.unitA });
      // What a change made at the same time does: the check passes, the write then finds the placement refused.
      const employees = t.app.get(EmployeeRepository);
      const write = employees.update.bind(employees);
      let plainSaved = false;
      const racing = vi.spyOn(employees, 'update').mockImplementation(async (id, values, tx) => {
        if ('orgNodeId' in values && plainSaved) throw new AssignmentNoChangeError();
        const saved = await write(id, values, tx);
        if ('workLocation' in values) plainSaved = true;
        return saved;
      });
      let real: BulkUpdateResultDto;
      try {
        real = (await agent.post('/api/employees/bulk-update').send({ employeeIds: [person.employeeId], workLocation: 'Raced place', orgNodeId: org.unitB.id, jobTitleId: org.unitB.titleId, validFrom: todayInRiyadh(), reason: 'Reorganisation' }).expect(200)).body as BulkUpdateResultDto;
      } finally {
        racing.mockRestore();
      }
      expect(real.rejected.map((r) => r.id)).toEqual([person.employeeId]);
      const after = (await agent.get(`/api/employees/${person.employeeId}`).expect(200)).body as EmployeeDto;
      expect(after.workLocation).not.toBe('Raced place');
      expect(after.orgNode?.id).toBe(org.unitA.id);
    });
  });

  describe('cancelling a pending change (FR-89)', () => {
    it('cancels a pending change that is not the last one and keeps the history of the field in one piece', async () => {
      const { agent, person, boss } = await hrScenario(t, HR_GRANTS);
      const third = await t.factories.user({ unit: (await t.factories.org()).unitA });
      const route = `/api/employees/${person.employeeId}/assignments`;
      const first = dayFromToday(5);
      const second = dayFromToday(10);
      const made = await agent.post(route).send({ managerId: boss.employeeId, validFrom: first, reason: 'First' }).expect(201);
      await agent.post(route).send({ managerId: third.employeeId, validFrom: second, reason: 'Second' }).expect(201);
      const pending = of(made.body, 'manager').find((p) => p.status === 'pending') as EmployeeAssignmentDto;
      const cancelled = await agent.delete(`${route}/${pending.id}`).expect(200);
      const periods = of(cancelled.body, 'manager');
      expect(periods).toHaveLength(2);
      expect(periods[0]).toMatchObject({ status: 'current', validTo: dayBefore(second) });
      expect(periods[1]).toMatchObject({ valueId: third.employeeId, validFrom: second, validTo: null, status: 'pending' });
      const open = await t.db.query(`SELECT count(*) FROM employee_assignments WHERE employee_id = $1 AND field = 'manager' AND valid_to IS NULL`, [person.employeeId]);
      expect(Number(open[0].count)).toBe(1);
    });
  });

  describe('the nightly application of due changes (FR-89)', () => {
    it('goes on with the next change when one fails, and counts only those applied', async () => {
      const { agent, org, person, boss } = await hrScenario(t, HR_GRANTS);
      const day = dayFromToday(3);
      await agent.post(`/api/employees/${person.employeeId}/assignments`).send({ orgNodeId: org.unitB.id, jobTitleId: org.unitB.titleId, validFrom: day, reason: 'Will fail' }).expect(201);
      const other = await t.factories.user({ unit: org.unitA });
      await agent.post(`/api/employees/${other.employeeId}/assignments`).send({ managerId: boss.employeeId, validFrom: day, reason: 'Will work' }).expect(201);
      // The record of the first person cannot be written (a failing database, a rule): the second person must still get their change.
      const employees = t.app.get(EmployeeRepository);
      const write = employees.update.bind(employees);
      const failing = vi.spyOn(employees, 'update').mockImplementation((id, values, tx) => (id === person.employeeId ? Promise.reject(new Error('write refused')) : write(id, values, tx)));
      try {
        const applied = await t.app.get(EmployeeAssignmentsService).applyDue(day);
        expect(applied).toBe(1);
      } finally {
        failing.mockRestore();
      }
      const worked = (await agent.get(`/api/employees/${other.employeeId}`).expect(200)).body as EmployeeDto;
      expect(worked.manager?.id).toBe(boss.employeeId);
      const stuck = await t.db.query(`SELECT applied_at FROM employee_assignments WHERE employee_id = $1 AND field = 'org_node' AND valid_from = $2`, [person.employeeId, day]);
      expect(stuck[0].applied_at).toBeNull();
    });
    it('writes the audit entry of an applied change even when telling the platform fails afterwards, and counts the change as applied', async () => {
      const { agent, person, boss } = await hrScenario(t, HR_GRANTS);
      const day = dayFromToday(3);
      await agent.post(`/api/employees/${person.employeeId}/assignments`).send({ managerId: boss.employeeId, validFrom: day, reason: 'Will be announced badly' }).expect(201);
      const events = t.app.get(EventEmitter2);
      const emit = events.emitAsync.bind(events);
      const failing = vi.spyOn(events, 'emitAsync').mockImplementation((name, ...args) => (name === EMPLOYEES_CHANGED ? Promise.reject(new Error('a listener failed')) : emit(name, ...args)));
      let applied: number;
      try {
        applied = await t.app.get(EmployeeAssignmentsService).applyDue(day);
      } finally {
        failing.mockRestore();
      }
      expect(applied).toBe(1);
      expect(((await agent.get(`/api/employees/${person.employeeId}`).expect(200)).body as EmployeeDto).manager?.id).toBe(boss.employeeId);
      await vi.waitFor(async () => {
        const audit = await t.db.query(`SELECT count(*) FROM audit_logs WHERE action = 'employee.assignment.applied' AND entity_id = $1`, [person.employeeId]);
        expect(Number(audit[0].count)).toBe(1);
      });
    });
  });

  describe('«My team» reach (FR-92)', () => {
    it('does not open the profile of a teammate who can no longer sign in', async () => {
      const org = await t.factories.org();
      const viewer = await t.factories.user({ unit: org.unitA });
      const active = await t.factories.user({ unit: org.unitA });
      const gone = await t.factories.user({ unit: org.unitA, active: false });
      const agent = await t.factories.signIn(viewer);
      expect(((await agent.get(`/api/directory/${active.employeeId}`).expect(200)).body as DirectoryProfileDto).id).toBe(active.employeeId);
      await agent.get(`/api/directory/${gone.employeeId}`).expect(404);
    });
  });

  describe('reading a photo (FR-91)', () => {
    async function withPhoto() {
      const org = await t.factories.org();
      const person = await t.factories.user({ unit: org.unitA });
      await (await t.factories.signIn(person)).put(`/api/employees/${person.employeeId}/photo`).attach('file', PNG, { filename: 'me.png', contentType: 'image/png' }).expect(200);
      return { org, person };
    }

    it('is read by whoever reaches the record with employees.view, even without the team key', async () => {
      const { person } = await withPhoto();
      const hr = await t.factories.signIn(await t.factories.user({ without: ['directory.'], grants: [grant(P.EmployeesView, 'all')] }));
      await hr.get(`/api/employees/${person.employeeId}/photo`).expect(200);
    });

    it('is not read by a teammate once the team key is taken from them (the answer is 404, as for any record out of reach)', async () => {
      const { org, person } = await withPhoto();
      const teammate = await t.factories.signIn(await t.factories.user({ unit: org.unitA, without: ['directory.'] }));
      await teammate.get(`/api/employees/${person.employeeId}/photo`).expect(404);
    });
  });
});

import { BULK_UPDATE_MAX, CorePermission, type BulkUpdateResultDto, type EmployeeDto, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { todayInRiyadh } from '../src/common/domain/riyadh-date';
import { useTestApp } from './setup/test-app';

const P = CorePermission;
const grant = (key: string, scope: PermissionGrant['scope']): PermissionGrant => ({ key, scope });
const hr = [P.EmployeesView, P.EmployeesUpdate, P.EmployeesAssignChange, P.EmployeesBulkUpdate, P.EmployeesHistoryView].map((k) => grant(k, 'all'));
const UUID0 = '00000000-0000-4000-8000-000000000000';

describe('Bulk edit of employees (FR-93)', () => {
  const t = useTestApp();

  async function setup(grants = hr) {
    const org = await t.factories.org();
    const agent = await t.factories.signIn(await t.factories.user({ grants }));
    const people = [await t.factories.user({ unit: org.unitA }), await t.factories.user({ unit: org.unitA }), await t.factories.user({ unit: org.unitA })];
    const record = async (id: string): Promise<EmployeeDto> => (await agent.get(`/api/employees/${id}`).expect(200)).body;
    return { org, agent, people, ids: people.map((p) => p.employeeId), record };
  }
  const move = (org: Awaited<ReturnType<typeof setup>>['org'], extra: object = {}) => ({ orgNodeId: org.unitB.id, jobTitleId: org.unitB.titleId, validFrom: todayInRiyadh(), reason: 'Reorganisation', ...extra });

  it('previews who would change and who would be refused, and saves nothing', async () => {
    const { agent, org, ids, record } = await setup();
    const res = await agent.post('/api/employees/bulk-update').send({ employeeIds: [...ids, UUID0], ...move(org), dryRun: true }).expect(200);
    const body = res.body as BulkUpdateResultDto;
    expect(body.dryRun).toBe(true);
    expect(body.accepted.map((a) => a.id).sort()).toEqual([...ids].sort());
    expect(body.rejected).toHaveLength(1);
    expect(body.rejected[0]).toMatchObject({ id: UUID0, code: 'NOT_FOUND' });
    for (const id of ids) expect((await record(id)).orgNode?.id).toBe(org.unitA.id);
    const history = await t.db.query(`SELECT count(*) FROM employee_assignments WHERE employee_id = ANY($1)`, [ids]);
    expect(Number(history[0].count)).toBe(0);
  });

  it('changes the unit and title of everyone accepted, each with their own history and audit entry, and reports the refused', async () => {
    const { agent, org, people, ids, record } = await setup();
    const outsider = await t.factories.user({ unit: org.unitOther });
    const res = await agent.post('/api/employees/bulk-update').send({ employeeIds: [...ids, outsider.employeeId], ...move(org, { jobTitleId: org.unitA.titleId }) }).expect(200);
    const body = res.body as BulkUpdateResultDto;
    // The title of unit A does not fit unit B: everybody is refused, with the rule that says why, and nothing is half-done.
    expect(body.accepted).toHaveLength(0);
    expect(body.rejected).toHaveLength(ids.length + 1);
    for (const id of ids) expect((await record(id)).orgNode?.id).toBe(org.unitA.id);

    const ok = (await agent.post('/api/employees/bulk-update').send({ employeeIds: ids, ...move(org) }).expect(200)).body as BulkUpdateResultDto;
    expect(ok.accepted).toHaveLength(ids.length);
    for (const id of ids) {
      const after = await record(id);
      expect(after.orgNode?.id).toBe(org.unitB.id);
      expect(after.jobTitle?.id).toBe(org.unitB.titleId);
    }
    // The audit entries are written a moment after the answer: wait for them (bounded) instead of sleeping for a fixed time.
    await vi.waitFor(async () => {
      for (const p of people) {
        const audit = await t.db.query(`SELECT count(*) FROM audit_logs WHERE action = 'employee.assignment.changed' AND entity_id = $1`, [p.employeeId]);
        expect(Number(audit[0].count)).toBe(1);
      }
      const summary = await t.db.query(`SELECT changes FROM audit_logs WHERE action = 'employee.bulk_updated' ORDER BY created_at DESC LIMIT 1`);
      expect(summary[0].changes).toMatchObject({ accepted: ids.length, rejected: 0 });
    });
  });

  it('refuses an employee of another company without touching the others', async () => {
    const { agent, org, ids } = await setup([...hr.filter((g) => ![P.EmployeesUpdate, P.EmployeesAssignChange, P.EmployeesBulkUpdate].includes(g.key as never)), grant(P.EmployeesUpdate, 'company'), grant(P.EmployeesAssignChange, 'company'), grant(P.EmployeesBulkUpdate, 'company')]);
    const outsider = await t.factories.user({ unit: org.unitOther });
    const res = (await agent.post('/api/employees/bulk-update').send({ employeeIds: [...ids, outsider.employeeId], ...move(org) }).expect(200)).body as BulkUpdateResultDto;
    expect(res.accepted).toHaveLength(ids.length);
    expect(res.rejected).toEqual([expect.objectContaining({ id: outsider.employeeId })]);
  });

  it('changes the plain fields of many at once and lets a later start day wait', async () => {
    const { agent, org, ids, record } = await setup();
    await agent.post('/api/employees/bulk-update').send({ employeeIds: ids, workLocation: 'Jeddah office', workMode: 1 }).expect(200);
    for (const id of ids) expect(await record(id)).toMatchObject({ workLocation: 'Jeddah office', workMode: 1 });
    const later = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
    await agent.post('/api/employees/bulk-update').send({ employeeIds: ids, ...move(org, { validFrom: later }) }).expect(200);
    for (const id of ids) expect((await record(id)).orgNode?.id).toBe(org.unitA.id);
  });

  it('is refused without the bulk key or, for a placement change, without the placement key (403), and rejects a malformed request (400)', async () => {
    const { org, ids } = await setup();
    const noBulk = await t.factories.signIn(await t.factories.user({ grants: hr.filter((g) => g.key !== P.EmployeesBulkUpdate) }));
    await noBulk.post('/api/employees/bulk-update').send({ employeeIds: ids, workLocation: 'x' }).expect(403);
    const noPlacement = await t.factories.signIn(await t.factories.user({ grants: hr.filter((g) => g.key !== P.EmployeesAssignChange) }));
    await noPlacement.post('/api/employees/bulk-update').send({ employeeIds: ids, ...move(org) }).expect(403);
    await noPlacement.post('/api/employees/bulk-update').send({ employeeIds: ids, workLocation: 'Riyadh' }).expect(200);
    const agent = await t.factories.signIn(await t.factories.user({ grants: hr }));
    await agent.post('/api/employees/bulk-update').send({ employeeIds: [], workLocation: 'x' }).expect(400);
    await agent.post('/api/employees/bulk-update').send({ employeeIds: ids }).expect(400);
    await agent.post('/api/employees/bulk-update').send({ employeeIds: [ids[0], ids[0]], workLocation: 'x' }).expect(400);
    await agent.post('/api/employees/bulk-update').send({ employeeIds: ids, orgNodeId: org.unitB.id }).expect(400);
    const tooMany = Array.from({ length: BULK_UPDATE_MAX + 1 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    await agent.post('/api/employees/bulk-update').send({ employeeIds: tooMany, workLocation: 'x' }).expect(400);
  });
});

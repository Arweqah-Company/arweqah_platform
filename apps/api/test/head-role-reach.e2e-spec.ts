import { LEVEL_HEAD_DEFAULT_PERMISSIONS } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { useTestApp } from './setup/test-app';

/**
 * A unit head holds the default head role (never platform admin mode): every page and list their keys open must answer, not 403 / ADMIN_MODE_REQUIRED.
 * The list is one route per page the head role gives a key for (FR-36, FR-48, FR-54).
 */
const PAGES = ['/api/employees', '/api/career/team', '/api/career/requests', '/api/performance/team', '/api/tasks/team', '/api/tasks/matrix', '/api/task-tags', '/api/task-tags/departments', '/api/tickets?tab=team', '/api/tickets?tab=mine', '/api/tickets?tab=inbox', '/api/tickets/setup/desks', '/api/tickets/figures'];

describe('What a unit head reaches with the default head role, without admin mode', () => {
  const t = useTestApp();

  it('opens every page of the head role (200), and keeps a desk out of its unit at 404', async () => {
    const org = await t.factories.org();
    const head = await t.factories.user({ unit: { ...org.unitA, id: org.department }, grants: LEVEL_HEAD_DEFAULT_PERMISSIONS.map((g) => ({ key: g.key, scope: g.scope, ...(g.fields ? { fields: [...g.fields] } : {}) })) });
    const agent = await t.factories.signIn(head);
    const answers: Record<string, number> = {};
    for (const path of PAGES) answers[path] = (await agent.get(path)).status;
    expect(answers).toEqual(Object.fromEntries(PAGES.map((p) => [p, 200])));
    await agent.get(`/api/tickets/setup/desks/${org.otherDepartment}`).expect(404);
  });

  it('lets the head add people to the unit, edit every detail, change the unit from a date, edit many, and see «my team» (FR-129)', async () => {
    const org = await t.factories.org();
    const head = await t.factories.user({ unit: { ...org.unitA, id: org.department }, grants: LEVEL_HEAD_DEFAULT_PERMISSIONS.map((g) => ({ key: g.key, scope: g.scope, ...(g.fields ? { fields: [...g.fields] } : {}) })) });
    const agent = await t.factories.signIn(head);
    const person = (n: string, unit: { id: string; companyId: string; titleId: string }) => ({ companyId: unit.companyId, orgNodeId: unit.id, jobTitleId: unit.titleId, workEmail: `lead${n}@arweqah.sa`, employeeNumber: `L${n}`, fullName: `موظف ${n}`, startDate: '2024-03-01' });
    const made = (await agent.post('/api/employees').send(person('1', org.unitA)).expect(201)).body.employee as { id: string };
    await agent.post('/api/employees').send(person('2', org.unitOther)).expect(404); // a unit outside the head's reach
    await agent.put(`/api/employees/${made.id}`).send({ ...person('1', org.unitA), profession: 'Engineer', workLocation: 'Riyadh' }).expect(200); // a detail beyond the basic data
    await agent.post(`/api/employees/${made.id}/assignments`).send({ orgNodeId: org.unitB.id, jobTitleId: org.unitB.titleId, validFrom: new Date().toISOString().slice(0, 10), reason: 'Moved inside the unit' }).expect(201);
    const bulk = (await agent.post('/api/employees/bulk-update').send({ employeeIds: [made.id], workLocation: 'Bulk place' }).expect(200)).body as { accepted: unknown[] };
    expect(bulk.accepted).toHaveLength(1);
    await agent.get('/api/directory').expect(200);
  });
});

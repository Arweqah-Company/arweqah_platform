import { CorePermission, type TicketDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { ScheduledJobRelay } from '../src/core/messaging/infrastructure/typeorm-job-scheduler';
import { OutboxRelay } from '../src/core/messaging/infrastructure/typeorm-outbox';
import { TicketLifecycleService } from '../src/modules/tickets/application/services/ticket-lifecycle.service';
import { UserAccessService } from '../src/core/access/application/user-access.service';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

const DAY = 86_400_000;
const SETTINGS = { receptionStatus: 'active', descriptionAr: null, descriptionEn: null, acceptsPersonal: false, defaultDueDays: 3, minLeadDays: 0, autoCloseDays: 2, reopenWindowDays: 7, staleAfterDays: 5 };
const TYPE = { descriptionAr: null, descriptionEn: null, dueDays: null, isPersonal: false, isActive: true };

/**
 * One whole life of the module, with several people in two departments: a platform manager sets the departments up,
 * employees send, the units answer, tickets end in every possible way (confirmed, not executed, by themselves), one is
 * reopened, one goes quiet, a personal one stays private; then the figures must add up, pages can be hidden from a role
 * and a department in use cannot be moved. (FR-36 … FR-41)
 */
describe('Tickets: the whole cycle (FR-36 … FR-41)', () => {
  const t = useTestApp();

  it('runs from setup to figures with real people', async () => {
    const org = await t.factories.org();
    const person = async (unit: typeof org.unitA) => {
      const user = await t.factories.user({ unit });
      return { user, agent: await t.factories.signIn(user) };
    };
    const itManager = await person(org.unitA);
    const itAssignee = await person(org.unitA);
    const alice = await person(org.unitB);
    const bob = await person(org.unitC);
    const hrManager = await person(org.unitOther);
    const hrAssignee = await person(org.unitOther);
    await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [itManager.user.employeeId, org.department]);
    await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [hrManager.user.employeeId, org.otherDepartment]);

    // --- Setup by a platform manager (admin mode with a fresh code): two departments, three kinds and a personal one.
    const platformUser = await t.factories.user({ grants: [ADMIN_MODE_GRANT, { key: CorePermission.TicketsAdminister, scope: 'all' }, { key: CorePermission.PagesManage, scope: 'all' }] });
    const platform = await t.factories.signInAdminMode(platformUser);
    await platform.put(`/api/tickets/setup/desks/${org.department}`).send(SETTINGS).expect(200);
    await platform.put(`/api/tickets/setup/desks/${org.otherDepartment}`).send({ ...SETTINGS, acceptsPersonal: true }).expect(200);
    const addType = async (deskId: string, nameEn: string, extra: Record<string, unknown>) =>
      (await platform.post(`/api/tickets/setup/desks/${deskId}/types`).send({ ...TYPE, nameAr: nameEn, nameEn, ...extra }).expect(201)).body.id as string;
    const printer = await addType(org.department, 'Printer', { defaultAssigneeUserId: itAssignee.user.id });
    const access = await addType(org.department, 'Access request', { defaultAssigneeUserId: itAssignee.user.id });
    const salary = await addType(org.otherDepartment, 'Salary letter', { defaultAssigneeUserId: hrAssignee.user.id });
    const complaint = await addType(org.otherDepartment, 'Complaint', { defaultAssigneeUserId: hrAssignee.user.id, isPersonal: true });

    // --- Employees send: everyone may send to any department.
    const send = async (who: typeof alice, typeId: string, title: string, extra: Record<string, unknown> = {}) =>
      (await who.agent.post('/api/tickets').send({ typeId, title, details: 'details', ...extra }).expect(201)).body as TicketDto;
    const t1 = await send(alice, printer, 'Printer one', { priority: 1 });
    const t2 = await send(alice, printer, 'Printer two');
    const t3 = await send(bob, access, 'Access for the new hire');
    const t4 = await send(bob, salary, 'Salary letter for the bank');
    const t5 = await send(alice, complaint, 'A private matter');
    expect([t1, t2, t3, t4, t5].map((x) => x.number)).toEqual([...new Set([t1, t2, t3, t4, t5].map((x) => x.number))]); // distinct numbers

    // --- Who sees what.
    expect((await itAssignee.agent.get('/api/tickets?tab=inbox').expect(200)).body.total).toBe(3);
    expect((await itManager.agent.get('/api/tickets?tab=inbox').expect(200)).body.total).toBe(3);
    expect((await alice.agent.get('/api/tickets?tab=mine').expect(200)).body.total).toBe(3);
    expect((await hrManager.agent.get('/api/tickets?tab=inbox').expect(200)).body.total).toBe(1); // the personal one is not theirs to see
    await hrManager.agent.get(`/api/tickets/${t5.id}`).expect(404);
    await platform.get(`/api/tickets/${t5.id}`).expect(404);
    expect((await hrAssignee.agent.get(`/api/tickets/${t5.id}`).expect(200)).body.isPersonal).toBe(true);
    await bob.agent.get(`/api/tickets/${t1.id}`).expect(404); // an outsider

    // --- The units answer and end tickets in every way.
    await itAssignee.agent.post(`/api/tickets/${t1.id}/replies`).send({ body: 'looking' }).expect(201);
    await itAssignee.agent.post(`/api/tickets/${t1.id}/request-close`).send({ message: 'done' }).expect(200);
    await alice.agent.post(`/api/tickets/${t1.id}/confirm-close`).send({}).expect(200); // confirmed
    await itAssignee.agent.post(`/api/tickets/${t2.id}/request-close`).send({}).expect(200);
    await alice.agent.post(`/api/tickets/${t2.id}/decline-close`).send({ message: 'still broken' }).expect(200);
    await itManager.agent.post(`/api/tickets/${t2.id}/close-without-execution`).send({ message: 'out of scope' }).expect(200); // not executed
    await itAssignee.agent.post(`/api/tickets/${t3.id}/request-close`).send({}).expect(200); // the sender stays silent
    expect(await t.app.get(ScheduledJobRelay).releaseDue(new Date(Date.now() + 3 * DAY))).toBe(1);
    await t.app.get(OutboxRelay).flush();
    expect((await bob.agent.get(`/api/tickets/${t3.id}`).expect(200)).body).toMatchObject({ status: 'closed', closeReason: 'auto' });
    await alice.agent.post(`/api/tickets/${t2.id}/reopen`).send({ message: 'needed after all' }).expect(200); // reopened
    await t.db.query(`UPDATE tickets SET last_activity_at = now() - interval '6 days' WHERE id = $1`, [t4.id]);
    expect(await t.app.get(TicketLifecycleService).announceStale()).toBe(1); // t4 went quiet
    expect((await hrAssignee.agent.get('/api/notifications').expect(200)).body.items.length).toBeGreaterThan(1);

    // --- The figures add up: all departments together equal the sum of each department.
    const all = (await platform.get('/api/tickets/figures').expect(200)).body;
    const one = async (deskId: string) => (await platform.get(`/api/tickets/figures?deskId=${deskId}`).expect(200)).body;
    const [it, hr] = [await one(org.department), await one(org.otherDepartment)];
    expect(all.scope).toBe('all');
    expect(it.scope).toBe('desk');
    expect(all.figures.incoming).toBe(5);
    expect(all.figures.incoming).toBe(it.figures.incoming + hr.figures.incoming);
    expect(all.figures.openNow).toBe(it.figures.openNow + hr.figures.openNow);
    expect(all.figures.outcomes).toEqual({ confirmed: 1, auto: 1, notExecuted: 1, reopened: 1 });
    expect(all.figures.personalCount).toBe(1);
    expect(hr.figures.personalCount).toBe(1);
    expect(JSON.stringify(all.figures.needsAttention)).not.toContain('"isPersonal":true');
    expect(all.figures.byType.map((x: { deskNameEn: string }) => x.deskNameEn)).toEqual(expect.arrayContaining(['Department', 'Other department']));

    // --- Pages can be hidden from a role, and a department in use cannot be moved.
    const [role] = (await t.app.get(UserAccessService).rolesOf([alice.user.id])).get(alice.user.id) ?? [];
    const aliceRole = role ?? (await t.factories.role([]));
    await t.app.get(UserAccessService).replaceRoles(alice.user.id, [aliceRole.id]);
    await platform.put(`/api/page-visibility/roles/${aliceRole.id}`).send({ hiddenPages: ['tickets'] }).expect(200);
    expect((await alice.agent.get('/api/tickets?tab=mine').expect(403)).body.code).toBe('PAGE_HIDDEN');
    await platform.put(`/api/page-visibility/roles/${aliceRole.id}`).send({ hiddenPages: [] }).expect(200);
    await alice.agent.get('/api/tickets?tab=mine').expect(200);
    const orgAdmin = await t.factories.signIn(await t.factories.user({ grants: [{ key: CorePermission.OrgView, scope: 'all' }, { key: CorePermission.OrgManage, scope: 'all' }] }));
    const parent = ((await t.db.query<{ parent_id: string }[]>('SELECT parent_id FROM org_nodes WHERE id = $1', [org.department]))[0] as { parent_id: string }).parent_id;
    expect((await orgAdmin.post(`/api/org/nodes/${org.department}/move`).send({ parentId: parent }).expect(422)).body.code).toBe('ORG_NODE_HAS_TICKETS');
  });
});

import { CorePermission, ORG_ADMIN_PERMISSIONS, addWorkingDays, riyadhToday, type TicketCatalogDto, type TicketDeskDto, type TicketDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { ScheduledJobRelay } from '../src/core/messaging/infrastructure/typeorm-job-scheduler';
import { OutboxRelay } from '../src/core/messaging/infrastructure/typeorm-outbox';
import { TicketLifecycleService } from '../src/modules/tickets/application/services/ticket-lifecycle.service';
import { TICKET_DESK_ADMIN_GRANTS, type TestAgent, type TestUser } from './factories/factories';
import { codeFor } from './helpers/totp';
import { useTestApp } from './setup/test-app';

const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
const DAY = 86_400_000;

const SETTINGS = { receptionStatus: 'active', descriptionAr: 'نصيحة', descriptionEn: 'Tip', acceptsPersonal: false, defaultDueDays: 3, minLeadDays: 0, autoCloseDays: 4, reopenWindowDays: 7, staleAfterDays: 14 };
const TYPE = { nameAr: 'مشكلة تقنية', nameEn: 'Technical problem', descriptionAr: null, descriptionEn: null, dueDays: null, isPersonal: false, isActive: true };

describe('Tickets (FR-36 … FR-41)', () => {
  const t = useTestApp();

  /** A department with a manager, an assignee, a sender, and a stranger; the manager has admin mode on. */
  async function world() {
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: TICKET_DESK_ADMIN_GRANTS });
    const assignee = await t.factories.user({ unit: org.unitA });
    const sender = await t.factories.user({ unit: org.unitB });
    const stranger = await t.factories.user({ unit: org.unitC });
    await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [manager.employeeId, org.department]);
    const agents = {
      manager: await t.factories.signIn(manager),
      assignee: await t.factories.signIn(assignee),
      sender: await t.factories.signIn(sender),
      stranger: await t.factories.signIn(stranger),
    };
    await adminModeOn(agents.manager, manager);
    return { org, desk: org.department, manager, assignee, sender, stranger, agents };
  }

  /** The authenticator code of the next 30-second step (the sign-in used the current one). */
  async function adminModeOn(agent: TestAgent, user: TestUser): Promise<void> {
    await agent.post('/api/admin-mode/activate').send({ code: codeFor(user.secret, Date.now() + 30_000) }).expect(200);
  }

  const setupDesk = (agent: TestAgent, desk: string, overrides: Record<string, unknown> = {}) => agent.put(`/api/tickets/setup/desks/${desk}`).send({ ...SETTINGS, ...overrides });
  const addType = (agent: TestAgent, desk: string, overrides: Record<string, unknown> = {}) => agent.post(`/api/tickets/setup/desks/${desk}/types`).send({ ...TYPE, ...overrides });
  const send = (agent: TestAgent, typeId: string, overrides: Record<string, unknown> = {}) => agent.post('/api/tickets').send({ typeId, title: 'الطابعة لا تعمل', details: 'تفاصيل المشكلة', ...overrides });

  /** An active desk with one type handled by `assignee`. */
  async function openDesk(w: Awaited<ReturnType<typeof world>>, typeOverrides: Record<string, unknown> = {}, deskOverrides: Record<string, unknown> = {}) {
    await setupDesk(w.agents.manager, w.desk, deskOverrides).expect(200);
    const type = (await addType(w.agents.manager, w.desk, { defaultAssigneeUserId: w.assignee.id, ...typeOverrides }).expect(201)).body;
    return type.id as string;
  }

  async function sendOne(w: Awaited<ReturnType<typeof world>>, typeId: string, overrides: Record<string, unknown> = {}): Promise<TicketDto> {
    return (await send(w.agents.sender, typeId, overrides).expect(201)).body;
  }

  describe('Setting up a department (FR-36)', () => {
    it('lists a department nobody set up as stopped, and lets its manager activate it with types', async () => {
      const w = await world();
      const listed = (await w.agents.manager.get('/api/tickets/setup/desks').expect(200)).body as TicketDeskDto[];
      expect(listed).toHaveLength(1);
      expect(listed[0]).toMatchObject({ orgNodeId: w.desk, manager: { id: w.manager.id }, settings: { receptionStatus: 'stopped', defaultDueDays: 3, autoCloseDays: 4, reopenWindowDays: 7, staleAfterDays: 14, minLeadDays: 0 }, types: [] });
      const saved = await setupDesk(w.agents.manager, w.desk, { descriptionAr: 'نصيحة', autoCloseDays: 6 }).expect(200);
      expect(saved.body.settings).toMatchObject({ receptionStatus: 'active', autoCloseDays: 6, descriptionAr: 'نصيحة' });
      const type = await addType(w.agents.manager, w.desk, { defaultAssigneeUserId: w.assignee.id, dueDays: 5 }).expect(201);
      expect(type.body).toMatchObject({ nameEn: 'Technical problem', dueDays: 5, defaultAssignee: { id: w.assignee.id }, isActive: true });
    });

    it('works only in admin mode, only for the departments a person manages (a platform manager: all of them)', async () => {
      const w = await world();
      await t.factories.freshStep(w.manager);
      const noMode = await t.factories.signIn(w.manager);
      expect((await noMode.get('/api/tickets/setup/desks').expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
      expect((await w.agents.assignee.post('/api/admin-mode/activate').send({ code: codeFor(w.assignee.secret, Date.now() + 30_000) }).expect(403)).body.code).toBe('ADMIN_MODE_NOT_ALLOWED');
      const otherManager = await t.factories.user({ unit: w.org.unitC, grants: TICKET_DESK_ADMIN_GRANTS });
      await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [otherManager.employeeId, w.org.otherDepartment]);
      const otherAgent = await t.factories.signIn(otherManager);
      await adminModeOn(otherAgent, otherManager);
      await otherAgent.get(`/api/tickets/setup/desks/${w.desk}`).expect(404);
      await setupDesk(otherAgent, w.desk).expect(404);
      const platform = await t.factories.user({ grants: [...TICKET_DESK_ADMIN_GRANTS, { key: CorePermission.TicketsAdminister, scope: 'all' }, { key: CorePermission.AdminModeUse, scope: 'all' }] });
      const platformAgent = await t.factories.signIn(platform);
      await adminModeOn(platformAgent, platform);
      const all = (await platformAgent.get('/api/tickets/setup/desks').expect(200)).body as TicketDeskDto[];
      expect(all.map((d) => d.orgNodeId).sort()).toEqual([w.desk, w.org.otherDepartment].sort());
      await platformAgent.get(`/api/tickets/setup/desks/${w.org.sectionAB}`).expect(404); // a section is not a department
    });

    it('refuses to activate a department without a manager, and bad numbers or assignees', async () => {
      const w = await world();
      await t.db.query('UPDATE org_nodes SET manager_id = NULL WHERE id = $1', [w.desk]);
      const platform = await t.factories.user({ grants: [...TICKET_DESK_ADMIN_GRANTS, { key: CorePermission.TicketsAdminister, scope: 'all' }, { key: CorePermission.AdminModeUse, scope: 'all' }] });
      const agent = await t.factories.signIn(platform);
      await adminModeOn(agent, platform);
      expect((await setupDesk(agent, w.desk).expect(422)).body.code).toBe('DESK_NO_MANAGER');
      await setupDesk(agent, w.desk, { receptionStatus: 'paused' }).expect(200);
      for (const bad of [{ autoCloseDays: 0 }, { autoCloseDays: 31 }, { defaultDueDays: 0 }, { reopenWindowDays: 1.5 }, { staleAfterDays: 91 }, { minLeadDays: -1 }, { receptionStatus: 'open' }, { unknown: 1 }]) {
        await setupDesk(agent, w.desk, bad).expect(400);
      }
      await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [w.manager.employeeId, w.desk]);
      const inactive = await t.factories.user({ unit: w.org.unitA, active: false });
      expect((await addType(agent, w.desk, { defaultAssigneeUserId: inactive.id }).expect(422)).body.code).toBe('ASSIGNEE_INVALID');
      expect((await addType(agent, w.desk, { isPersonal: true }).expect(422)).body.code).toBe('TYPE_NO_HANDLER');
    });

    it('deactivates a type that has tickets and deletes one that has none; changes are audited', async () => {
      const w = await world();
      const typeId = await openDesk(w);
      const spare = (await addType(w.agents.manager, w.desk, { nameEn: 'Spare' }).expect(201)).body.id;
      await sendOne(w, typeId);
      expect((await w.agents.manager.delete(`/api/tickets/setup/desks/${w.desk}/types/${typeId}`).expect(200)).body).toEqual({ deleted: false });
      expect((await w.agents.manager.delete(`/api/tickets/setup/desks/${w.desk}/types/${spare}`).expect(200)).body).toEqual({ deleted: true });
      const desk = (await w.agents.manager.get(`/api/tickets/setup/desks/${w.desk}`).expect(200)).body as TicketDeskDto;
      expect(desk.types.map((x) => [x.id, x.isActive])).toEqual([[typeId, false]]);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const audit = JSON.stringify(await t.db.query(`SELECT action, changes FROM audit_logs WHERE action LIKE 'ticket.%' ORDER BY created_at`));
      expect(audit).toContain('ticket.desk.updated');
      expect(audit).toContain('"adminMode":true');
    });
    it('keeps a department whose desk takes tickets (or has open tickets) where it is, in the structure', async () => {
      const w = await world();
      const parentId = ((await t.db.query<{ parent_id: string }[]>('SELECT parent_id FROM org_nodes WHERE id = $1', [w.desk]))[0] as { parent_id: string }).parent_id;
      const orgAdmin = await t.factories.signIn(await t.factories.user({ grants: ORG_ADMIN_PERMISSIONS.map((key) => ({ key, scope: 'all' as const })) }));
      await setupDesk(w.agents.manager, w.desk).expect(200);
      const move = () => orgAdmin.post(`/api/org/nodes/${w.desk}/move`).send({ parentId });
      expect((await move().expect(422)).body.code).toBe('ORG_NODE_HAS_TICKETS');
      await setupDesk(w.agents.manager, w.desk, { receptionStatus: 'stopped' }).expect(200);
      await move().expect(200);
      const typeId = (await addType(w.agents.manager, w.desk).expect(201)).body.id;
      await setupDesk(w.agents.manager, w.desk).expect(200);
      await sendOne(w, typeId);
      await setupDesk(w.agents.manager, w.desk, { receptionStatus: 'stopped' }).expect(200);
      expect((await move().expect(422)).body.code).toBe('ORG_NODE_HAS_TICKETS');
    });
  });

  describe('Sending a ticket (FR-37)', () => {
    it('sends to a department: number, needed-by date in working days, the unit is told, the sender sees it', async () => {
      const w = await world();
      const typeId = await openDesk(w);
      const ticket = await sendOne(w, typeId, { priority: 1 });
      expect(ticket).toMatchObject({ status: 'open', priority: 1, title: 'الطابعة لا تعمل', isNew: true, sender: { id: w.sender.id }, assignee: { id: w.assignee.id }, relations: ['sender'] });
      expect(ticket.number).toBeGreaterThan(0);
      expect(ticket.neededBy).toBe(addWorkingDays(riyadhToday(), 3));
      expect(ticket.events.map((e) => e.type)).toEqual(['created']);
      expect((await w.agents.sender.get('/api/tickets?tab=mine').expect(200)).body.items).toHaveLength(1);
      const noticed = (await w.agents.assignee.get('/api/notifications').expect(200)).body.items as { link: string; bodyEn: string }[];
      expect(noticed).toHaveLength(1);
      expect(noticed[0]?.link).toBe(`/tickets/${ticket.id}`);
      expect(JSON.stringify(noticed)).not.toContain('الطابعة'); // the title is never in a notice
    });

    it('offers the catalog: paused departments disabled, stopped hidden, personal types only where accepted', async () => {
      const w = await world();
      const typeId = await openDesk(w, {}, { acceptsPersonal: false });
      await addType(w.agents.manager, w.desk, { nameEn: 'Complaint', isPersonal: true, defaultAssigneeUserId: w.assignee.id }).expect(201);
      let catalog = (await w.agents.sender.get('/api/tickets/catalog').expect(200)).body as TicketCatalogDto;
      expect(catalog.today).toBe(riyadhToday());
      expect(catalog.desks).toHaveLength(1);
      expect(catalog.desks[0]).toMatchObject({ deskId: w.desk, unavailableReason: null, descriptionAr: 'نصيحة' });
      expect(catalog.desks[0]?.types.map((x) => x.id)).toEqual([typeId]);
      expect(catalog.desks[0]?.types[0]).toMatchObject({ dueDays: 3, assignee: { id: w.assignee.id }, available: true });
      await setupDesk(w.agents.manager, w.desk, { acceptsPersonal: true }).expect(200);
      catalog = (await w.agents.sender.get('/api/tickets/catalog').expect(200)).body;
      expect(catalog.desks[0]?.types).toHaveLength(2);
      await setupDesk(w.agents.manager, w.desk, { receptionStatus: 'paused', acceptsPersonal: true }).expect(200);
      catalog = (await w.agents.sender.get('/api/tickets/catalog').expect(200)).body;
      expect(catalog.desks[0]?.unavailableReason).toBe('paused');
      await setupDesk(w.agents.manager, w.desk, { receptionStatus: 'stopped' }).expect(200);
      expect(((await w.agents.sender.get('/api/tickets/catalog').expect(200)).body as TicketCatalogDto).desks).toHaveLength(0);
    });

    it('refuses a department that is stopped, paused, not started yet or without a manager, each with its own code', async () => {
      const w = await world();
      const typeId = await openDesk(w);
      const code = async (): Promise<string> => (await send(w.agents.sender, typeId).expect(422)).body.code;
      await setupDesk(w.agents.manager, w.desk, { receptionStatus: 'stopped' }).expect(200);
      expect(await code()).toBe('DESK_STOPPED');
      await setupDesk(w.agents.manager, w.desk, { receptionStatus: 'paused' }).expect(200);
      expect(await code()).toBe('DESK_PAUSED');
      await setupDesk(w.agents.manager, w.desk).expect(200);
      await t.db.query(`UPDATE org_nodes SET start_date = current_date + 30 WHERE id = $1`, [w.desk]);
      expect(await code()).toBe('DESK_NOT_STARTED');
      await t.db.query(`UPDATE org_nodes SET start_date = '2024-01-01', manager_id = NULL WHERE id = $1`, [w.desk]);
      expect(await code()).toBe('DESK_NO_MANAGER');
    });

    it('validates the input, the needed-by date and the minimum lead (400, 422)', async () => {
      const w = await world();
      const typeId = await openDesk(w, {}, { minLeadDays: 2 });
      for (const bad of [{ title: '' }, { title: 'x'.repeat(201) }, { priority: 2 }, { neededBy: 'soon' }, { fileIds: Array(6).fill('11111111-1111-4111-8111-111111111111') }, { extra: 1 }]) {
        await send(w.agents.sender, typeId, bad).expect(400);
      }
      await send(w.agents.sender, 'not-a-uuid').expect(400);
      const tooEarly = await send(w.agents.sender, typeId, { neededBy: riyadhToday() }).expect(422);
      expect(tooEarly.body).toMatchObject({ code: 'DUE_DATE_TOO_EARLY', details: { earliest: addWorkingDays(riyadhToday(), 2) } });
      const chosen = addWorkingDays(riyadhToday(), 10);
      expect((await sendOne(w, typeId, { neededBy: chosen })).neededBy).toBe(chosen);
    });

    it('counts Friday and Saturday as days off when it suggests the date', async () => {
      expect(addWorkingDays('2026-10-22', 3)).toBe('2026-10-27'); // Thursday + 3 working days = Tuesday
      expect(addWorkingDays('2026-10-24', 0)).toBe('2026-10-24');
      expect(addWorkingDays('2026-10-23', 1)).toBe('2026-10-25'); // Friday -> Sunday
    });

    it('handles personal types: the department must accept them and an active assignee must exist', async () => {
      const w = await world();
      await setupDesk(w.agents.manager, w.desk, { acceptsPersonal: false }).expect(200);
      const personal = (await addType(w.agents.manager, w.desk, { isPersonal: true, defaultAssigneeUserId: w.assignee.id }).expect(201)).body.id as string;
      expect((await send(w.agents.sender, personal).expect(422)).body.code).toBe('PERSONAL_NOT_ACCEPTED');
      await setupDesk(w.agents.manager, w.desk, { acceptsPersonal: true }).expect(200);
      await t.db.query('UPDATE users SET is_active = false WHERE id = $1', [w.assignee.id]);
      expect((await send(w.agents.sender, personal).expect(422)).body.code).toBe('TYPE_NO_HANDLER');
    });

    it('attaches the sender\'s own files, readable by the people of the ticket and nobody else', async () => {
      const w = await world();
      const typeId = await openDesk(w);
      const file = (await w.agents.sender.post('/api/files').attach('file', PNG, 'screen.png').expect(201)).body;
      const strangerFile = (await w.agents.stranger.post('/api/files').attach('file', PNG, 'other.png').expect(201)).body;
      await send(w.agents.sender, typeId, { fileIds: [strangerFile.id] }).expect(404);
      const ticket = (await send(w.agents.sender, typeId, { fileIds: [file.id] }).expect(201)).body as TicketDto;
      expect(ticket.events[0]?.attachments).toEqual([{ fileId: file.id, originalName: 'screen.png', contentType: 'image/png', size: PNG.length }]);
      for (const who of ['sender', 'assignee', 'manager'] as const) await w.agents[who].get(`/api/tickets/${ticket.id}/attachments/${file.id}`).expect(200);
      await w.agents.stranger.get(`/api/tickets/${ticket.id}/attachments/${file.id}`).expect(404);
      await w.agents.sender.get(`/api/tickets/${ticket.id}/attachments/${strangerFile.id}`).expect(404);
    });
  });

  describe('Who sees a ticket, lists and filters (FR-38)', () => {
    it('shows a ticket to its sender, its assignee and the manager of the department, and to nobody else (404)', async () => {
      const w = await world();
      const ticket = await sendOne(w, await openDesk(w));
      expect((await w.agents.assignee.get(`/api/tickets/${ticket.id}`).expect(200)).body.relations).toEqual(['assignee']);
      expect((await w.agents.manager.get(`/api/tickets/${ticket.id}`).expect(200)).body.relations).toEqual(['manager']);
      await w.agents.stranger.get(`/api/tickets/${ticket.id}`).expect(404);
      await w.agents.stranger.post(`/api/tickets/${ticket.id}/replies`).send({ body: 'hello' }).expect(404);
      await w.agents.stranger.post(`/api/tickets/${ticket.id}/request-close`).send({}).expect(404);
      await w.agents.stranger.get('/api/tickets/00000000-0000-4000-8000-000000000999').expect(404);
      await w.agents.stranger.get('/api/tickets').expect(200).expect((res) => expect(res.body.items).toHaveLength(0));
    });

    it('hides a personal ticket from the manager (and from a platform manager): only the sender and the assignee', async () => {
      const w = await world();
      await setupDesk(w.agents.manager, w.desk, { acceptsPersonal: true }).expect(200);
      const personal = (await addType(w.agents.manager, w.desk, { isPersonal: true, defaultAssigneeUserId: w.assignee.id }).expect(201)).body.id as string;
      const ticket = await sendOne(w, personal);
      expect(ticket.isPersonal).toBe(true);
      await w.agents.manager.get(`/api/tickets/${ticket.id}`).expect(404);
      expect((await w.agents.manager.get('/api/tickets?tab=inbox').expect(200)).body.items).toHaveLength(0);
      await w.agents.manager.post(`/api/tickets/${ticket.id}/replies`).send({ body: 'peek' }).expect(404);
      expect((await w.agents.assignee.get('/api/tickets?tab=inbox').expect(200)).body.items).toHaveLength(1);
      await w.agents.assignee.get(`/api/tickets/${ticket.id}`).expect(200);
      const platform = await t.factories.user({ grants: [...TICKET_DESK_ADMIN_GRANTS, { key: CorePermission.TicketsAdminister, scope: 'all' }, { key: CorePermission.AdminModeUse, scope: 'all' }] });
      const platformAgent = await t.factories.signIn(platform);
      await adminModeOn(platformAgent, platform);
      await platformAgent.get(`/api/tickets/${ticket.id}`).expect(404);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const manager = (await w.agents.manager.get('/api/notifications').expect(200)).body.items as unknown[];
      expect(manager).toHaveLength(0);
    });

    it('splits the inbox from "my tickets", and filters, searches and groups', async () => {
      const w = await world();
      const typeA = await openDesk(w);
      const typeB = (await addType(w.agents.manager, w.desk, { nameEn: 'Second', nameAr: 'نوع ثانٍ' }).expect(201)).body.id as string;
      const first = await sendOne(w, typeA, { title: 'طابعة المكتب' });
      await sendOne(w, typeB, { title: 'تجديد الإقامة' });
      expect((await w.agents.manager.get('/api/tickets?tab=mine').expect(200)).body.items).toHaveLength(0);
      expect((await w.agents.manager.get('/api/tickets?tab=inbox').expect(200)).body.total).toBe(2);
      expect((await w.agents.assignee.get('/api/tickets?tab=inbox').expect(200)).body.total).toBe(1); // typeB has no assignee: the manager's
      const q = (await w.agents.sender.get('/api/tickets?tab=mine&search=%D8%B7%D8%A7%D8%A8%D8%B9%D8%A9').expect(200)).body.items as { id: string }[];
      expect(q.map((x) => x.id)).toEqual([first.id]);
      expect((await w.agents.sender.get(`/api/tickets?tab=mine&search=TKT-${String(first.number).padStart(6, '0')}`).expect(200)).body.total).toBe(1);
      expect((await w.agents.sender.get(`/api/tickets?tab=mine&typeId=${typeB}`).expect(200)).body.total).toBe(1);
      expect((await w.agents.sender.get('/api/tickets?tab=mine&status=closed').expect(200)).body.total).toBe(0);
      const grouped = (await w.agents.manager.get('/api/tickets?tab=inbox&groupBy=assignee').expect(200)).body;
      expect(grouped.groupBy).toBe('assignee');
      expect((await w.agents.manager.get('/api/tickets?tab=inbox&pageSize=1&page=2').expect(200)).body).toMatchObject({ total: 2, page: 2, pageSize: 1 });
      await w.agents.sender.get('/api/tickets?tab=other').expect(400);
      await w.agents.sender.get('/api/tickets?groupBy=color').expect(400);
      const options = (await w.agents.manager.get('/api/tickets/options').expect(200)).body;
      expect(options.hasInbox).toBe(true);
      expect(options.desks).toEqual([{ id: w.desk, nameAr: 'Department', nameEn: 'Department' }]);
      expect((await w.agents.sender.get('/api/tickets/options').expect(200)).body.hasInbox).toBe(false);
    });

    it('marks overdue and stale tickets', async () => {
      const w = await world();
      const ticket = await sendOne(w, await openDesk(w));
      await t.db.query(`UPDATE tickets SET needed_by = current_date - 3, last_activity_at = now() - interval '20 days' WHERE id = $1`, [ticket.id]);
      const item = (await w.agents.sender.get('/api/tickets?tab=mine').expect(200)).body.items[0];
      expect(item).toMatchObject({ overdue: true, stale: true, isNew: true });
    });
  });

  describe('Answering, closing and reopening (FR-39)', () => {
    it('answers: the first answer of the unit ends "new", the sender is told, an outsider cannot answer', async () => {
      const w = await world();
      const ticket = await sendOne(w, await openDesk(w));
      const answered = (await w.agents.assignee.post(`/api/tickets/${ticket.id}/replies`).send({ body: 'جاري العمل' }).expect(201)).body as TicketDto;
      expect(answered.isNew).toBe(false);
      expect(answered.events.map((e) => e.type)).toEqual(['created', 'reply']);
      const senderNotices = (await w.agents.sender.get('/api/notifications').expect(200)).body.items as unknown[];
      expect(senderNotices).toHaveLength(1);
      const again = (await w.agents.sender.post(`/api/tickets/${ticket.id}/replies`).send({ body: 'شكرًا' }).expect(201)).body as TicketDto;
      expect(again.status).toBe('open');
      await w.agents.sender.post(`/api/tickets/${ticket.id}/replies`).send({ body: '' }).expect(400);
      const firstResponse = await t.db.query('SELECT first_response_at FROM tickets WHERE id = $1', [ticket.id]);
      expect(firstResponse[0]?.first_response_at).not.toBeNull();
    });

    it('closes by request and confirmation, or the sender declines, or answers (both reopen it)', async () => {
      const w = await world();
      const typeId = await openDesk(w);
      const a = await sendOne(w, typeId);
      await w.agents.sender.post(`/api/tickets/${a.id}/request-close`).send({}).expect(422); // the sender cannot ask for the closing
      await w.agents.sender.post(`/api/tickets/${a.id}/confirm-close`).send({}).expect(422); // nothing to confirm yet
      const requested = (await w.agents.assignee.post(`/api/tickets/${a.id}/request-close`).send({ message: 'تم التنفيذ' }).expect(200)).body as TicketDto;
      expect(requested).toMatchObject({ status: 'close_requested', abilities: { confirmClose: false } });
      expect(requested.events.at(-1)).toMatchObject({ type: 'close_requested', body: 'تم التنفيذ' });
      expect((await w.agents.sender.get(`/api/tickets/${a.id}`).expect(200)).body.abilities).toMatchObject({ confirmClose: true, declineClose: true, reply: true });
      const jobs = await t.db.query(`SELECT status FROM scheduled_jobs WHERE dedupe_key = $1`, [`ticket:${a.id}:auto-close`]);
      expect(jobs.map((j: { status: string }) => j.status)).toEqual(['pending']);
      const confirmed = (await w.agents.sender.post(`/api/tickets/${a.id}/confirm-close`).send({}).expect(200)).body as TicketDto;
      expect(confirmed).toMatchObject({ status: 'closed', closeReason: 'confirmed' });
      expect((await t.db.query(`SELECT status FROM scheduled_jobs WHERE dedupe_key = $1`, [`ticket:${a.id}:auto-close`]))[0]?.status).toBe('cancelled');
      await w.agents.assignee.post(`/api/tickets/${a.id}/replies`).send({ body: 'late' }).expect(422); // closed tickets take no replies

      const b = await sendOne(w, typeId);
      await w.agents.assignee.post(`/api/tickets/${b.id}/request-close`).send({}).expect(200);
      expect((await w.agents.sender.post(`/api/tickets/${b.id}/decline-close`).send({ message: 'لم يعمل' }).expect(200)).body.status).toBe('open');
      await w.agents.assignee.post(`/api/tickets/${b.id}/request-close`).send({}).expect(200);
      expect((await w.agents.sender.post(`/api/tickets/${b.id}/replies`).send({ body: 'ما زالت المشكلة' }).expect(201)).body.status).toBe('open');
      await w.agents.manager.post(`/api/tickets/${b.id}/close-without-execution`).send({ message: 'خارج النطاق' }).expect(200);
      expect((await w.agents.sender.get(`/api/tickets/${b.id}`).expect(200)).body).toMatchObject({ status: 'closed', closeReason: 'not_executed' });
    });

    it('closes by itself when the sender does not answer in time, and not when they did', async () => {
      const w = await world();
      const typeId = await openDesk(w, {}, { autoCloseDays: 2 });
      const quiet = await sendOne(w, typeId);
      const answered = await sendOne(w, typeId);
      await w.agents.assignee.post(`/api/tickets/${quiet.id}/request-close`).send({}).expect(200);
      await w.agents.assignee.post(`/api/tickets/${answered.id}/request-close`).send({}).expect(200);
      await w.agents.sender.post(`/api/tickets/${answered.id}/confirm-close`).send({}).expect(200);
      expect(await t.app.get(ScheduledJobRelay).releaseDue(new Date(Date.now() + 1 * DAY))).toBe(0); // not yet due
      expect(await t.app.get(ScheduledJobRelay).releaseDue(new Date(Date.now() + 3 * DAY))).toBe(1); // only the one still waiting
      await t.app.get(OutboxRelay).flush();
      expect((await w.agents.sender.get(`/api/tickets/${quiet.id}`).expect(200)).body).toMatchObject({ status: 'closed', closeReason: 'auto' });
      const kept = (await w.agents.sender.get(`/api/tickets/${answered.id}`).expect(200)).body as TicketDto;
      expect(kept.closeReason).toBe('confirmed');
      expect((await w.agents.sender.get(`/api/tickets/${quiet.id}`).expect(200)).body.events.at(-1)).toMatchObject({ type: 'auto_closed', actor: null });
      await new Promise((resolve) => setTimeout(resolve, 300));
      const actions = (await t.db.query(`SELECT action FROM audit_logs WHERE action LIKE 'ticket.%closed%' OR action = 'ticket.confirmed'`)).map((r: { action: string }) => r.action);
      expect(actions).toContain('ticket.auto_closed');
    });

    it('reopens within the reopen window only, by the sender only', async () => {
      const w = await world();
      const ticket = await sendOne(w, await openDesk(w, {}, { reopenWindowDays: 3 }));
      await w.agents.sender.post(`/api/tickets/${ticket.id}/reopen`).send({}).expect(422); // not closed
      await w.agents.manager.post(`/api/tickets/${ticket.id}/close-without-execution`).send({}).expect(200);
      await w.agents.manager.post(`/api/tickets/${ticket.id}/reopen`).send({}).expect(422); // only the sender
      const closed = (await w.agents.sender.get(`/api/tickets/${ticket.id}`).expect(200)).body as TicketDto;
      expect(closed.reopenDaysLeft).toBe(3);
      expect(closed.abilities.reopen).toBe(true);
      const reopened = (await w.agents.sender.post(`/api/tickets/${ticket.id}/reopen`).send({ message: 'ما زلت أحتاجه' }).expect(200)).body as TicketDto;
      expect(reopened).toMatchObject({ status: 'open', closeReason: null });
      expect(reopened.events.at(-1)?.type).toBe('reopened');
      await w.agents.manager.post(`/api/tickets/${ticket.id}/close-without-execution`).send({}).expect(200);
      await t.db.query(`UPDATE tickets SET closed_at = now() - interval '4 days' WHERE id = $1`, [ticket.id]);
      expect((await w.agents.sender.post(`/api/tickets/${ticket.id}/reopen`).send({}).expect(422)).body.code).toBe('REOPEN_WINDOW_EXPIRED');
      expect((await t.db.query('SELECT reopen_count FROM tickets WHERE id = $1', [ticket.id]))[0]?.reopen_count).toBe(1);
    });

    it('lets only one of two conflicting changes win (the other is refused, never applied twice)', async () => {
      const w = await world();
      const ticket = await sendOne(w, await openDesk(w));
      await w.agents.assignee.post(`/api/tickets/${ticket.id}/request-close`).send({}).expect(200);
      const results = await Promise.all([
        w.agents.sender.post(`/api/tickets/${ticket.id}/confirm-close`).send({}),
        w.agents.sender.post(`/api/tickets/${ticket.id}/decline-close`).send({}),
        w.agents.manager.post(`/api/tickets/${ticket.id}/close-without-execution`).send({}),
      ]);
      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(results.filter((r) => r.status !== 200).every((r) => [409, 422].includes(r.status))).toBe(true);
      const events = (await t.db.query(`SELECT count(*)::int AS n FROM ticket_events WHERE ticket_id = $1 AND type IN ('confirmed', 'close_declined', 'closed_not_executed')`, [ticket.id]))[0];
      expect(events.n).toBe(1);
    });

    it('tells the assignee and the manager once about a ticket that has been quiet too long', async () => {
      const w = await world();
      const ticket = await sendOne(w, await openDesk(w, {}, { staleAfterDays: 5 }));
      const lifecycle = t.app.get(TicketLifecycleService);
      expect(await lifecycle.announceStale()).toBe(0);
      await t.db.query(`UPDATE tickets SET last_activity_at = now() - interval '6 days' WHERE id = $1`, [ticket.id]);
      expect(await lifecycle.announceStale()).toBe(1);
      expect(await lifecycle.announceStale()).toBe(0);
      for (const who of ['assignee', 'manager'] as const) {
        const notices = (await w.agents[who].get('/api/notifications').expect(200)).body.items as { titleEn: string }[];
        expect(notices.some((n) => n.titleEn.includes('stale'))).toBe(true);
      }
    });

    it('moves open personal tickets to the new assignee when the old one left, without showing them to the manager', async () => {
      const w = await world();
      await setupDesk(w.agents.manager, w.desk, { acceptsPersonal: true }).expect(200);
      const personal = (await addType(w.agents.manager, w.desk, { isPersonal: true, defaultAssigneeUserId: w.assignee.id }).expect(201)).body as { id: string; nameAr: string; nameEn: string };
      const ticket = await sendOne(w, personal.id);
      await t.db.query('UPDATE users SET is_active = false WHERE id = $1', [w.assignee.id]);
      const successor = await t.factories.user({ unit: w.org.unitA });
      const updated = await w.agents.manager
        .put(`/api/tickets/setup/desks/${w.desk}/types/${personal.id}`)
        .send({ ...TYPE, nameAr: personal.nameAr, nameEn: personal.nameEn, isPersonal: true, defaultAssigneeUserId: successor.id })
        .expect(200);
      expect(updated.body.defaultAssignee.id).toBe(successor.id);
      expect((await t.db.query('SELECT assignee_user_id FROM tickets WHERE id = $1', [ticket.id]))[0]?.assignee_user_id).toBe(successor.id);
      await w.agents.manager.get(`/api/tickets/${ticket.id}`).expect(404);
      const successorAgent = await t.factories.signIn(successor);
      await successorAgent.get(`/api/tickets/${ticket.id}`).expect(200);
    });

    it('keeps titles and details out of the audit log', async () => {
      const w = await world();
      const ticket = await sendOne(w, await openDesk(w), { title: 'عنوان سري جدًا', details: 'تفاصيل سرية جدًا' });
      await w.agents.assignee.post(`/api/tickets/${ticket.id}/replies`).send({ body: 'ردّ سري جدًا' }).expect(201);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const audit = JSON.stringify(await t.db.query(`SELECT changes FROM audit_logs WHERE entity_type = 'ticket'`));
      expect(audit).not.toContain('سري جدًا');
      expect(audit).toContain('"deskId"');
    });
  });

  describe('Figures of a department (FR-40)', () => {
    it('counts the last 30 days, never lists personal tickets, and works only in admin mode for the manager of that department', async () => {
      const w = await world();
      await setupDesk(w.agents.manager, w.desk, { acceptsPersonal: true }).expect(200);
      const typeId = (await addType(w.agents.manager, w.desk, { defaultAssigneeUserId: w.assignee.id }).expect(201)).body.id as string;
      const personalId = (await addType(w.agents.manager, w.desk, { nameEn: 'Private', isPersonal: true, defaultAssigneeUserId: w.assignee.id }).expect(201)).body.id as string;
      const a = await sendOne(w, typeId);
      await sendOne(w, typeId);
      await sendOne(w, personalId);
      await w.agents.assignee.post(`/api/tickets/${a.id}/replies`).send({ body: 'ok' }).expect(201);
      await w.agents.assignee.post(`/api/tickets/${a.id}/request-close`).send({}).expect(200);
      await w.agents.sender.post(`/api/tickets/${a.id}/confirm-close`).send({}).expect(200);
      await t.db.query(`UPDATE tickets SET needed_by = current_date - 2 WHERE title = $1 AND status = 'open' AND NOT is_personal`, ['الطابعة لا تعمل']);
      const response = (await w.agents.manager.get('/api/tickets/figures').expect(200)).body;
      expect(response.windowDays).toBe(30);
      expect(response.desks.map((d: { id: string }) => d.id)).toEqual([w.desk]);
      expect(response.scope).toBe('all');
      const desk = response.figures;
      expect(desk).toMatchObject({ openNow: 2, incoming: 3, personalCount: 1, outcomes: { confirmed: 1, auto: 0, notExecuted: 0, reopened: 0 } });
      expect(desk.avgFirstResponseHours).not.toBeNull();
      expect(desk.byType.map((x: { typeId: string; count: number }) => [x.typeId, x.count]).sort()).toEqual([[personalId, 1], [typeId, 2]].sort());
      expect(desk.byType[0]).toHaveProperty('deskNameAr');
      expect(desk.byAssignee[0]).toMatchObject({ userId: w.assignee.id, deskId: w.desk });
      expect(desk.needsAttention).toHaveLength(1); // the open overdue one; the personal ticket is never listed
      expect(desk.needsAttention[0]).toHaveProperty('deskNameAr');
      expect(JSON.stringify(desk.needsAttention)).not.toContain('"isPersonal":true');
      // A platform manager chooses among every department of the structure, also those never set up for tickets; "all" adds them up.
      const platform = await t.factories.user({ grants: [...TICKET_DESK_ADMIN_GRANTS, { key: CorePermission.TicketsAdminister, scope: 'all' }, { key: CorePermission.AdminModeUse, scope: 'all' }] });
      const platformAgent = await t.factories.signIn(platform);
      await adminModeOn(platformAgent, platform);
      const everything = (await platformAgent.get('/api/tickets/figures').expect(200)).body;
      expect(everything.desks.map((d: { id: string }) => d.id)).toEqual(expect.arrayContaining([w.desk, w.org.otherDepartment]));
      expect(everything).toMatchObject({ scope: 'all', figures: { openNow: 2, incoming: 3 } });
      const unset = (await platformAgent.get(`/api/tickets/figures?deskId=${w.org.otherDepartment}`).expect(200)).body;
      expect(unset).toMatchObject({ scope: 'desk', figures: { openNow: 0, incoming: 0 } });
      await w.agents.manager.get(`/api/tickets/figures?deskId=${w.desk}`).expect(200);
      await w.agents.manager.get(`/api/tickets/figures?deskId=${w.org.otherDepartment}`).expect(404);
      await w.agents.sender.get('/api/tickets/figures').expect(403);
      await t.factories.freshStep(w.manager);
      const noMode = await t.factories.signIn(w.manager);
      expect((await noMode.get('/api/tickets/figures').expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
    });
  });
});

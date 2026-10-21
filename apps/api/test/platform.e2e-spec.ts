import { describe, expect, it } from 'vitest';
import { setup } from 'xstate';
import { NotificationsService } from '../src/core/notifications/application/notifications.service';
import { MessageBus } from '../src/core/messaging/application/message-bus';
import { OutboxRelay } from '../src/core/messaging/infrastructure/typeorm-outbox';
import { ScheduledJobRelay } from '../src/core/messaging/infrastructure/typeorm-job-scheduler';
import type { InMemoryMessageBus } from '../src/core/messaging/infrastructure/in-memory-message-bus';
import { WorkflowRegistry } from '../src/core/workflow/application/workflow-definition';
import { WorkflowEngine } from '../src/core/workflow/application/workflow-engine';
import { useTestApp } from './setup/test-app';

const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');

describe('Notifications (FR-08)', () => {
  const t = useTestApp();

  it('users see and mark only their own notifications; email is dispatched through the outbox', async () => {
    const alice = await t.factories.user();
    const bob = await t.factories.user();
    await t.app.get(NotificationsService).notify({
      userIds: [alice.id, bob.id],
      titleAr: 'تنبيه',
      titleEn: 'Notice',
      bodyAr: 'نص',
      bodyEn: 'Body',
      link: '/dashboard',
      channels: ['email'],
    });
    const agent = await t.factories.signIn(alice);
    const list = await agent.get('/api/notifications').expect(200);
    expect(list.body.total).toBe(1);
    const bobsId = (await t.db.query('SELECT id FROM notifications WHERE user_id = $1', [bob.id]))[0].id;
    const res = await agent.post('/api/notifications/read').send({ ids: [list.body.items[0].id, bobsId] }).expect(200);
    expect(res.body.updated).toBe(1);
    expect((await agent.get('/api/notifications/unread-count')).body.count).toBe(0);

    expect(await t.app.get(OutboxRelay).flush()).toBe(2);
    expect(t.mail.sent.map((m) => m.to).sort()).toEqual([alice.email, bob.email].sort());
    expect(t.mail.sent[0]?.subject).toBe('تنبيه');
    // Re-delivering the same message is a no-op (idempotent consumer).
    expect(await t.app.get(OutboxRelay).flush()).toBe(0);
  });
});

describe('Notification filters (FR-08)', () => {
  const t = useTestApp();

  it('searches the title or text and filters read / unread and date range, only inside the own notifications', async () => {
    const alice = await t.factories.user();
    const bob = await t.factories.user();
    const notify = (userIds: string[], titleEn: string) => t.app.get(NotificationsService).notify({ userIds, titleAr: 'تنبيه', titleEn, bodyAr: 'نص', bodyEn: 'Body text', channels: [] });
    await notify([alice.id], 'Leave approved');
    await notify([alice.id], 'Invoice paid');
    await notify([bob.id], 'Leave rejected');
    const agent = await t.factories.signIn(alice);
    const list = async (query: Record<string, unknown>) => (await agent.get('/api/notifications').query(query).expect(200)).body as { total: number; items: { id: string; titleEn: string }[] };
    expect((await list({ search: 'leave' })).items.map((n) => n.titleEn)).toEqual(['Leave approved']);
    expect((await list({ search: 'body text' })).total).toBe(2);
    const first = (await list({})).items[0] as { id: string };
    await agent.post('/api/notifications/read').send({ ids: [first.id] }).expect(200);
    expect((await list({ readOnly: true })).total).toBe(1);
    expect((await list({ unreadOnly: true })).total).toBe(1);
    const today = new Date().toISOString().slice(0, 10);
    expect((await list({ from: today, until: today })).total).toBe(2);
    expect((await list({ from: '2000-01-01', until: '2000-01-02' })).total).toBe(0);
  });
});

describe('Files (FR-09)', () => {
  const t = useTestApp();

  it('accepts allowed types by content, rejects disguised files, and hides files from other users', async () => {
    const owner = await t.factories.user();
    const agent = await t.factories.signIn(owner);
    const uploaded = await agent.post('/api/files').attach('file', PNG, 'photo.png').expect(201);
    expect(uploaded.body.contentType).toBe('image/png');
    await agent
      .post('/api/files')
      .attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'evil.png', contentType: 'image/png' })
      .expect(422);
    const traversal = await agent.post('/api/files').attach('file', PNG, '../../etc/passwd.png').expect(201);
    expect(traversal.body.originalName).toBe('passwd.png');
    await agent.get(`/api/files/${uploaded.body.id}/content`).expect(200);
    const other = await t.factories.signIn(await t.factories.user());
    await other.get(`/api/files/${uploaded.body.id}`).expect(404);
  });
});

/** A two-step approval used only to exercise the engine end to end. */
const approval = setup({ types: { events: {} as { type: 'APPROVE' } | { type: 'REJECT' } | { type: 'ESCALATE' } } }).createMachine({
  id: 'test-approval',
  initial: 'pendingManager',
  states: {
    pendingManager: {
      meta: { timeout: { afterMs: 1000, event: 'ESCALATE' } },
      on: { APPROVE: 'pendingHr', REJECT: 'rejected', ESCALATE: 'pendingHr' },
    },
    pendingHr: { on: { APPROVE: 'approved', REJECT: 'rejected' } },
    approved: { type: 'final' },
    rejected: { type: 'final' },
  },
});

describe('Workflow engine (FR-10)', () => {
  const t = useTestApp();
  const register = () => {
    const registry = t.app.get(WorkflowRegistry);
    try {
      registry.register({ key: 'test.approval', version: 1, machine: approval });
    } catch {
      // already registered in this app instance
    }
  };

  it('persists state, records history, rejects invalid events and escalates on timeout', async () => {
    register();
    const engine = t.app.get(WorkflowEngine);
    const user = await t.factories.user();
    const started = await engine.start({ definitionKey: 'test.approval', entityType: 'test', entityId: user.id, actorId: user.id });
    expect(started.state).toBe('pendingManager');
    await expect(engine.send({ instanceId: started.id, event: { type: 'REJECT' }, actorId: user.id, tx: undefined }))
      .resolves.toMatchObject({ state: 'rejected', isDone: true });
    await expect(engine.send({ instanceId: started.id, event: { type: 'APPROVE' }, actorId: user.id }))
      .rejects.toMatchObject({ code: 'TRANSITION_NOT_ALLOWED' });
    expect((await engine.history(started.id)).map((h) => h.toState)).toEqual(['rejected']);

    const second = await engine.start({ definitionKey: 'test.approval', entityType: 'test', entityId: user.id, actorId: user.id });
    const released = await t.app.get(ScheduledJobRelay).releaseDue(new Date(Date.now() + 5_000));
    expect(released).toBe(1);
    await t.app.get(OutboxRelay).flush();
    const after = await engine.findByEntity('test', user.id);
    expect(after?.id).toBe(second.id);
    expect(after?.state).toBe('pendingHr');
    const bus = t.app.get(MessageBus) as InMemoryMessageBus;
    expect(bus.published.some((m) => m.topic === 'workflow.transitioned')).toBe(true);
  });

  it('refuses concurrent transitions on the same item (optimistic lock)', async () => {
    register();
    const engine = t.app.get(WorkflowEngine);
    const user = await t.factories.user();
    const wf = await engine.start({ definitionKey: 'test.approval', entityType: 'test', entityId: user.id, actorId: null });
    const results = await Promise.allSettled([
      engine.send({ instanceId: wf.id, event: { type: 'APPROVE' }, actorId: null }),
      engine.send({ instanceId: wf.id, event: { type: 'APPROVE' }, actorId: null }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
});

describe('Audit log (FR-11)', () => {
  const t = useTestApp();

  it('records sign-ins and admin actions with the actor, and only auditors can read it', async () => {
    const auditor = await t.factories.user({
      grants: [
        { key: 'audit.view', scope: 'company' },
        { key: 'roles.manage', scope: 'company' },
      ],
    });
    const agent = await t.factories.signIn(auditor);
    await agent.post('/api/roles').send({ nameAr: 'دور', nameEn: 'Audited role', permissions: [] }).expect(201);
    await new Promise((r) => setTimeout(r, 200)); // audit is written asynchronously
    const res = await agent.get('/api/audit-logs').expect(200);
    const actions = res.body.items.map((i: { action: string }) => i.action);
    expect(actions).toEqual(expect.arrayContaining(['auth.sign_in', 'role.created']));
    const created = res.body.items.find((i: { action: string }) => i.action === 'role.created');
    expect(created.actorName).toContain(auditor.email);
    const other = await t.factories.signIn(await t.factories.user());
    await other.get('/api/audit-logs').expect(403);
  });
});

describe('Audit log filters (FR-11)', () => {
  const t = useTestApp();

  it('searches by action or record, by actor and by date range', async () => {
    const auditor = await t.factories.user({ grants: [{ key: 'audit.view', scope: 'company' }, { key: 'roles.manage', scope: 'company' }] });
    const agent = await t.factories.signIn(auditor);
    await agent.post('/api/roles').send({ nameAr: 'دور', nameEn: 'Filter role', permissions: [] }).expect(201);
    await new Promise((r) => setTimeout(r, 200));
    const items = async (query: Record<string, unknown>) => (await agent.get('/api/audit-logs').query(query).expect(200)).body.items as { action: string }[];
    expect((await items({ search: 'role.cre' })).map((i) => i.action)).toContain('role.created');
    expect((await items({ search: 'no-such-thing' }))).toEqual([]);
    expect((await items({ actor: auditor.email })).length).toBeGreaterThan(0);
    expect(await items({ actor: 'nobody-at-all' })).toEqual([]);
    const today = new Date().toISOString().slice(0, 10);
    expect((await items({ from: today, to: today })).length).toBeGreaterThan(0);
    expect(await items({ from: '2000-01-01', to: '2000-01-02' })).toEqual([]);
    await agent.get('/api/audit-logs').query({ from: 'yesterday' }).expect(400);
  });
});

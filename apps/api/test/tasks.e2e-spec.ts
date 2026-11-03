import { CorePermission as P, riyadhToday, type TaskDto, type TaskFormOptionsDto, type TaskMatrixDto, type TasksPageDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import type { TestAgent, TestUser } from './factories/factories';
import { TASK_EMPLOYEE_GRANTS, TASK_VIEW_ONLY, taskManagerGrants } from './factories/task-grants';
import { useTestApp } from './setup/test-app';

describe('Tasks: my tasks, creating and assigning (FR-48), my team and the matrix (FR-49)', () => {
  const t = useTestApp();

  /** A manager with two direct reports in one unit, a peer in another unit, and a person of the other company. */
  async function world() {
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: taskManagerGrants('subtree') });
    const report = await t.factories.user({ unit: org.unitA, grants: TASK_EMPLOYEE_GRANTS });
    const report2 = await t.factories.user({ unit: org.unitA, grants: TASK_EMPLOYEE_GRANTS });
    const peer = await t.factories.user({ unit: org.unitC, grants: TASK_EMPLOYEE_GRANTS });
    const foreign = await t.factories.user({ unit: org.unitOther, grants: TASK_EMPLOYEE_GRANTS });
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = ANY($2)', [manager.employeeId, [report.employeeId, report2.employeeId]]);
    await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [manager.employeeId, org.department]);
    const agents = {
      manager: await t.factories.signIn(manager),
      report: await t.factories.signIn(report),
      report2: await t.factories.signIn(report2),
      peer: await t.factories.signIn(peer),
    };
    return { org, manager, report, report2, peer, foreign, agents };
  }

  const create = (agent: TestAgent, body: Record<string, unknown> = {}) => agent.post('/api/tasks').send({ title: 'إعداد التقرير', ...body });
  const made = async (agent: TestAgent, body: Record<string, unknown> = {}): Promise<TaskDto> => (await create(agent, body).expect(201)).body;
  const list = async (agent: TestAgent, query = ''): Promise<TasksPageDto> => (await agent.get(`/api/tasks${query}`).expect(200)).body;
  const notices = async (agent: TestAgent) => (await agent.get('/api/notifications').expect(200)).body.items as { link: string; bodyEn: string; titleEn: string }[];
  const idOf = (u: TestUser) => u.id;

  describe('Creating a task', () => {
    it('gives the defaults: today, medium priority, and a task for oneself waits for the direct manager', async () => {
      const w = await world();
      const task = await made(w.agents.report);
      expect(task).toMatchObject({ title: 'إعداد التقرير', dueDate: riyadhToday(), priority: 'medium', status: 'pending_approval', assignee: { id: w.report.id }, creator: { id: w.report.id }, approver: { id: w.manager.id }, source: 'standalone' });
      expect(task.number).toMatch(/^TSK-\d{6}$/);
      expect(task.events.map((e) => e.type)).toEqual(['created']);
      const mine = await notices(w.agents.manager);
      expect(mine.some((n) => n.link === `/tasks/${task.id}` && n.titleEn.includes(task.number))).toBe(true);
    });

    it('starts to do at once when nobody has to approve it (the top of the structure)', async () => {
      const w = await world();
      const task = await made(w.agents.manager);
      expect(task).toMatchObject({ status: 'todo', approver: null });
    });

    it('offers the form who the person may give a task to, their tags, and who approves a task for themselves', async () => {
      const w = await world();
      const options = (await w.agents.report.get('/api/tasks/options').expect(200)).body as TaskFormOptionsDto;
      expect(options.approver).toMatchObject({ id: w.manager.id });
      expect(options.assignees.map((a) => a.id).sort()).toEqual([w.report.id, w.manager.id].sort());
      expect(options.assignees.find((a) => a.isSelf)?.id).toBe(w.report.id);
      const managerOptions = (await w.agents.manager.get('/api/tasks/options').expect(200)).body as TaskFormOptionsDto;
      expect(managerOptions.assignees.map((a) => a.id)).toEqual(expect.arrayContaining([w.manager.id, w.report.id, w.report2.id]));
    });

    it('lets a manager give a task to someone below, which then needs no approval and tells the assignee', async () => {
      const w = await world();
      const task = await made(w.agents.manager, { assigneeUserId: w.report.id, priority: 'high', estimateMinutes: 90 });
      expect(task).toMatchObject({ status: 'todo', assignee: { id: w.report.id }, creator: { id: w.manager.id }, priority: 'high', estimateMinutes: 90 });
      const got = await notices(w.agents.report);
      expect(got.some((n) => n.link === `/tasks/${task.id}` && n.titleEn.startsWith('New task'))).toBe(true);
      expect(await notices(w.agents.manager)).toHaveLength(0);
    });

    it('lets an employee ask the manager of their department, and nobody else', async () => {
      const w = await world();
      expect((await create(w.agents.report, { assigneeUserId: w.manager.id }).expect(201)).body).toMatchObject({ status: 'todo', assignee: { id: w.manager.id } });
      const refused = await create(w.agents.report, { assigneeUserId: w.report2.id }).expect(422);
      expect(refused.body.code).toBe('TASK_ASSIGNMENT_NOT_ALLOWED');
      expect((await create(w.agents.report, { assigneeUserId: idOf(w.peer) }).expect(422)).body.code).toBe('TASK_ASSIGNMENT_NOT_ALLOWED');
    });

    it('lets people on the same open ticket give each other tasks', async () => {
      const w = await world();
      const desk = { id: w.org.department };
      await t.db.query('INSERT INTO ticket_desks (org_node_id, reception_status) VALUES ($1, $2)', [desk.id, 'active']);
      const type: { id: string }[] = await t.db.query(`INSERT INTO ticket_types (desk_id, name_ar, name_en) VALUES ($1, 'نوع', 'Type') RETURNING id`, [desk.id]);
      await t.db.query(`INSERT INTO tickets (sender_user_id, desk_id, type_id, title, needed_by, assignee_user_id) VALUES ($1, $2, $3, 'طلب', '2030-01-01', $4)`, [w.peer.id, desk.id, type[0]?.id, w.report.id]);
      expect((await create(w.agents.peer, { assigneeUserId: w.report.id }).expect(201)).body.assignee.id).toBe(w.report.id);
      expect((await create(w.agents.peer, { assigneeUserId: w.report2.id }).expect(422)).body.code).toBe('TASK_ASSIGNMENT_NOT_ALLOWED');
    });

    it('refuses an assignee of another company, a past due date, and bad input', async () => {
      const w = await world();
      expect((await create(w.agents.manager, { assigneeUserId: w.foreign.id }).expect(422)).body.code).toBe('TASK_ASSIGNEE_INVALID');
      expect((await create(w.agents.manager, { dueDate: '2020-01-01' }).expect(422)).body.code).toBe('TASK_DUE_DATE_INVALID');
      for (const bad of [{ title: '' }, { priority: 'urgent' }, { estimateMinutes: 0 }, { unknown: 1 }, { dueDate: 'tomorrow' }]) {
        expect((await create(w.agents.manager, bad).expect(400)).body.code).toBe('VALIDATION');
      }
    });

    it('is closed to people without the keys and to the page being hidden from them', async () => {
      const w = await world();
      const plain = await t.factories.signIn(await t.factories.user({ unit: w.org.unitA, without: ['tasks.'] }));
      await plain.get('/api/tasks').expect(403);
      await create(plain).expect(403);
      const bare = await t.factories.signIn(await t.factories.user({ unit: w.org.unitA, bare: true }));
      await create(bare).expect(403);
      await t.factories.signIn(await t.factories.user({ unit: w.org.unitA, without: ['tasks.'], grants: TASK_VIEW_ONLY })).then((a) => create(a).expect(403));
    });
  });

  describe('Seeing a task', () => {
    it('shows it to the assignee, the creator, a follower and the manager of the assignee, and to nobody else (404)', async () => {
      const w = await world();
      const task = await made(w.agents.manager, { assigneeUserId: w.report.id });
      await w.agents.report.get(`/api/tasks/${task.id}`).expect(200);
      await w.agents.manager.get(`/api/tasks/${task.id}`).expect(200);
      await w.agents.report2.get(`/api/tasks/${task.id}`).expect(404);
      await w.agents.peer.get(`/api/tasks/${task.id}`).expect(404);
      await w.agents.peer.post(`/api/tasks/${task.id}/follow`).expect(404);
      await w.agents.report2.get(`/api/tasks/00000000-0000-4000-8000-000000000000`).expect(404);
    });

    it('lets a person follow a task they can see, which puts it in the following tab', async () => {
      const w = await world();
      const task = await made(w.agents.report);
      expect((await list(w.agents.manager, '?tab=following')).items).toHaveLength(0);
      const followed = (await w.agents.manager.post(`/api/tasks/${task.id}/follow`).expect(200)).body as TaskDto;
      expect(followed).toMatchObject({ isFollowing: true, followers: 1 });
      expect((await list(w.agents.manager, '?tab=following')).items.map((i) => i.id)).toEqual([task.id]);
      const unfollowed = (await w.agents.manager.delete(`/api/tasks/${task.id}/follow`).expect(200)).body as TaskDto;
      expect(unfollowed).toMatchObject({ isFollowing: false, followers: 0 });
    });

    it('splits my tasks into assigned to me, assigned by me and following', async () => {
      const w = await world();
      const given = await made(w.agents.manager, { assigneeUserId: w.report.id });
      const own = await made(w.agents.report);
      expect((await list(w.agents.report, '?tab=assigned')).items.map((i) => i.id).sort()).toEqual([given.id, own.id].sort());
      expect((await list(w.agents.manager, '?tab=created')).items.map((i) => i.id)).toEqual([given.id]);
      expect((await list(w.agents.report, '?tab=created')).items).toHaveLength(0);
    });
  });

  describe('Lists', () => {
    it('opens on open tasks ordered by due date, and filters, searches and sorts', async () => {
      const w = await world();
      const tomorrow = riyadhToday(new Date(Date.now() + 86_400_000));
      const later = riyadhToday(new Date(Date.now() + 5 * 86_400_000));
      const a = await made(w.agents.manager, { assigneeUserId: w.report.id, title: 'تقرير المبيعات', dueDate: later, priority: 'low' });
      const b = await made(w.agents.manager, { assigneeUserId: w.report.id, title: 'اجتماع الإدارة', dueDate: tomorrow, priority: 'high' });
      const page = await list(w.agents.report);
      expect(page.items.map((i) => i.id)).toEqual([b.id, a.id]);
      expect(page.total).toBe(2);
      expect((await list(w.agents.report, '?priority=high')).items.map((i) => i.id)).toEqual([b.id]);
      expect((await list(w.agents.report, `?search=${encodeURIComponent('المبيعات')}`)).items.map((i) => i.id)).toEqual([a.id]);
      expect((await list(w.agents.report, `?search=${a.number}`)).items.map((i) => i.id)).toEqual([a.id]);
      expect((await list(w.agents.report, '?sort=priority&dir=asc')).items.map((i) => i.id)).toEqual([b.id, a.id]);
      expect((await list(w.agents.report, '?sort=title&dir=desc')).items.map((i) => i.title)).toEqual(['تقرير المبيعات', 'اجتماع الإدارة']);
      expect((await list(w.agents.report, '?groupBy=status')).groupBy).toBe('status');
      await w.agents.report.get('/api/tasks?tab=other').expect(400);
      await w.agents.report.get('/api/tasks?pageSize=101').expect(400);
    });

    it('marks a task urgent when it is due within two days, and shows the flags', async () => {
      const w = await world();
      const soon = await made(w.agents.manager, { assigneeUserId: w.report.id });
      const far = await made(w.agents.manager, { assigneeUserId: w.report.id, dueDate: riyadhToday(new Date(Date.now() + 9 * 86_400_000)) });
      const marked = await made(w.agents.manager, { assigneeUserId: w.report.id, dueDate: riyadhToday(new Date(Date.now() + 9 * 86_400_000)), urgent: true });
      const items = (await list(w.agents.report)).items;
      const flag = (id: string) => items.find((i) => i.id === id)?.flags.urgent;
      expect([flag(soon.id), flag(far.id), flag(marked.id)]).toEqual([true, false, true]);
    });
  });

  describe('Editing a task (FR-48)', () => {
    it('lets who gave the task edit it, refuses a stale revision, and records the change', async () => {
      const w = await world();
      const task = await made(w.agents.manager, { assigneeUserId: w.report.id });
      const edited = (await w.agents.manager.patch(`/api/tasks/${task.id}`).send({ title: 'عنوان جديد', priority: 'high', revision: task.revision }).expect(200)).body as TaskDto;
      expect(edited).toMatchObject({ title: 'عنوان جديد', priority: 'high' });
      expect(edited.revision).toBe(task.revision + 1);
      expect(edited.events.map((e) => e.type)).toEqual(['created', 'updated']);
      const stale = await w.agents.manager.patch(`/api/tasks/${task.id}`).send({ title: 'آخر', revision: task.revision }).expect(409);
      expect(stale.body.code).toBe('TASK_REVISION_CONFLICT');
      await w.agents.manager.patch(`/api/tasks/${task.id}`).send({ revision: edited.revision, title: 'x', status: 'done' }).expect(400);
    });

    it('refuses a person who cannot see it (404) and one who sees it but lacks the key (403)', async () => {
      const w = await world();
      const task = await made(w.agents.manager, { assigneeUserId: w.report.id });
      await w.agents.peer.patch(`/api/tasks/${task.id}`).send({ title: 'x', revision: 1 }).expect(404);
      const readOnly = await t.factories.signIn(await t.factories.user({ unit: w.org.unitA, without: ['tasks.'], grants: TASK_VIEW_ONLY }));
      await readOnly.patch(`/api/tasks/${task.id}`).send({ title: 'x', revision: 1 }).expect(403);
    });
  });

  describe('My team (FR-49)', () => {
    it('opens on the direct reports, shows everyone below on request, and the unit reach stays with direct reports', async () => {
      const w = await world();
      const sameUnit = await t.factories.user({ unit: w.org.unitA, grants: TASK_EMPLOYEE_GRANTS });
      const direct = await made(await w.agents.report, {});
      const other = await t.factories.signIn(sameUnit);
      const below = await made(other, { assigneeUserId: sameUnit.id });
      const direct_only = (await w.agents.manager.get('/api/tasks/team').expect(200)).body as TasksPageDto;
      expect(direct_only.items.map((i) => i.id)).toEqual([direct.id]);
      const everyone = (await w.agents.manager.get('/api/tasks/team?reach=all').expect(200)).body as TasksPageDto;
      expect(everyone.items.map((i) => i.id).sort()).toEqual([direct.id, below.id].sort());
      expect((await w.agents.manager.get(`/api/tasks/team?reach=all&assigneeId=${w.report.id}`).expect(200)).body.items.map((i: { id: string }) => i.id)).toEqual([direct.id]);
      const unitManager = await t.factories.user({ unit: w.org.unitA, grants: [...TASK_EMPLOYEE_GRANTS, { key: P.TasksTeamView, scope: 'unit' }] });
      await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [unitManager.employeeId, sameUnit.employeeId]);
      const unitAgent = await t.factories.signIn(unitManager);
      expect((await unitAgent.get('/api/tasks/team').expect(200)).body.items.map((i: { id: string }) => i.id)).toEqual([below.id]);
    });

    it('is closed to people without the team key, and never lists a person\'s own tasks', async () => {
      const w = await world();
      await w.agents.report.get('/api/tasks/team').expect(403);
      await made(w.agents.manager);
      expect(((await w.agents.manager.get('/api/tasks/team').expect(200)).body as TasksPageDto).items).toHaveLength(0);
    });
  });

  describe('The matrix (FR-49)', () => {
    it('puts each open task in one of four squares by priority and urgency', async () => {
      const w = await world();
      const far = riyadhToday(new Date(Date.now() + 20 * 86_400_000));
      const iu = await made(w.agents.manager, { assigneeUserId: w.report.id, priority: 'high' });
      const inu = await made(w.agents.manager, { assigneeUserId: w.report.id, priority: 'high', dueDate: far });
      const nu = await made(w.agents.manager, { assigneeUserId: w.report.id, priority: 'low' });
      const nnu = await made(w.agents.manager, { assigneeUserId: w.report.id, priority: 'medium', dueDate: far });
      const matrix = (await w.agents.report.get('/api/tasks/matrix').expect(200)).body as TaskMatrixDto;
      const ids = (key: string) => matrix.quadrants.find((q) => q.key === key)?.items.map((i) => i.id);
      expect(ids('important_urgent')).toEqual([iu.id]);
      expect(ids('important_not_urgent')).toEqual([inu.id]);
      expect(ids('normal_urgent')).toEqual([nu.id]);
      expect(ids('normal_not_urgent')).toEqual([nnu.id]);
      expect(matrix.quadrants.map((q) => q.total)).toEqual([1, 1, 1, 1]);
    });

    it('shows the team in the matrix only with a reach wider than the person alone', async () => {
      const w = await world();
      await made(w.agents.manager, { assigneeUserId: w.report.id });
      await w.agents.report.get('/api/tasks/matrix?scope=team').expect(403);
      const team = (await w.agents.manager.get('/api/tasks/matrix?scope=team').expect(200)).body as TaskMatrixDto;
      expect(team.quadrants.reduce((n, q) => n + q.total, 0)).toBe(1);
    });
  });
});

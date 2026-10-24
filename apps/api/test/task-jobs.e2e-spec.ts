import { addWorkingDays, riyadhToday, type TaskDto, type TasksPageDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { TaskArchiveService } from '../src/modules/tasks/application/services/task-archive.service';
import { TaskReminderService } from '../src/modules/tasks/application/services/task-reminder.service';
import type { TestAgent } from './factories/factories';
import { TASK_EMPLOYEE_GRANTS, taskManagerGrants } from './factories/task-grants';
import { useTestApp } from './setup/test-app';

const DAY = 86_400_000;
const daysFromNow = (n: number) => riyadhToday(new Date(Date.now() + n * DAY));

describe('Tasks: reminders, overdue, digest, archive, repeats and time (FR-53), estimate notice (FR-56)', () => {
  const t = useTestApp();

  async function world() {
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: taskManagerGrants('subtree') });
    const report = await t.factories.user({ unit: org.unitA, grants: TASK_EMPLOYEE_GRANTS });
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, report.employeeId]);
    const agents = { manager: await t.factories.signIn(manager), report: await t.factories.signIn(report) };
    const given = async (body: Record<string, unknown> = {}): Promise<TaskDto> => (await agents.manager.post('/api/tasks').send({ title: 'مهمة', assigneeUserId: report.id, ...body }).expect(201)).body;
    return { org, manager, report, agents, given };
  }

  const notices = async (agent: TestAgent) => (await agent.get('/api/notifications').expect(200)).body.items as { link: string; titleEn: string; bodyEn: string }[];
  const titles = async (agent: TestAgent, link?: string) => (await notices(agent)).filter((n) => !link || n.link === link).map((n) => n.titleEn);
  const ids = (page: TasksPageDto) => page.items.map((i) => i.id);
  const finish = async (agent: TestAgent, task: TaskDto): Promise<TaskDto> => {
    const started = (await agent.post(`/api/tasks/${task.id}/transition`).send({ to: 'in_progress', revision: task.revision }).expect(200)).body as TaskDto;
    return (await agent.post(`/api/tasks/${started.id}/transition`).send({ to: 'done', revision: started.revision }).expect(200)).body;
  };

  describe('Reminders and overdue notices', () => {
    it('reminds the assignee once when the due date is a day away, and not before', async () => {
      const w = await world();
      const soon = await w.given({ dueDate: daysFromNow(1) });
      await w.given({ dueDate: daysFromNow(9) });
      const reminders = t.app.get(TaskReminderService);
      expect(await reminders.remind(riyadhToday())).toBe(1);
      expect((await titles(w.agents.report, `/tasks/${soon.id}`)).some((x) => x.includes('due soon'))).toBe(true);
      expect(await reminders.remind(riyadhToday())).toBe(0);
    });

    it('does not remind about finished tasks or tasks still waiting for approval', async () => {
      const w = await world();
      const done = await finish(w.agents.report, await w.given({ dueDate: daysFromNow(1) }));
      expect(done.status).toBe('done');
      await w.agents.report.post('/api/tasks').send({ title: 'لنفسي', dueDate: daysFromNow(1) }).expect(201);
      expect(await t.app.get(TaskReminderService).remind(riyadhToday())).toBe(0);
    });

    it('tells the assignee and who gave the task, once, that the due date passed', async () => {
      const w = await world();
      const late = await w.given();
      await t.db.query(`UPDATE tasks SET due_date = (now() - interval '2 days')::date WHERE id = $1`, [late.id]);
      const reminders = t.app.get(TaskReminderService);
      expect(await reminders.notifyOverdue(riyadhToday())).toBe(1);
      for (const agent of [w.agents.report, w.agents.manager]) expect((await titles(agent, `/tasks/${late.id}`)).some((x) => x.includes('is overdue'))).toBe(true);
      expect(await reminders.notifyOverdue(riyadhToday())).toBe(0);
    });

    it('tells again after the due date is changed', async () => {
      const w = await world();
      const task = await w.given();
      await t.db.query(`UPDATE tasks SET due_date = (now() - interval '2 days')::date WHERE id = $1`, [task.id]);
      await t.app.get(TaskReminderService).notifyOverdue(riyadhToday());
      await w.agents.manager.patch(`/api/tasks/${task.id}`).send({ dueDate: daysFromNow(3), revision: task.revision }).expect(200);
      const stored: { overdue_notified_at: Date | null; reminded_at: Date | null }[] = await t.db.query('SELECT overdue_notified_at, reminded_at FROM tasks WHERE id = $1', [task.id]);
      expect(stored[0]).toEqual({ overdue_notified_at: null, reminded_at: null });
    });

    it('sends each manager the number of overdue tasks of their direct reports on the digest day, and only then', async () => {
      const w = await world();
      const a = await w.given();
      const b = await w.given();
      await t.db.query(`UPDATE tasks SET due_date = (now() - interval '3 days')::date WHERE id = ANY($1)`, [[a.id, b.id]]);
      const reminders = t.app.get(TaskReminderService);
      expect(await reminders.sendDigest(riyadhToday(), 3)).toBe(0);
      expect(await reminders.sendDigest(riyadhToday(), 0)).toBe(1);
      const digest = (await notices(w.agents.manager)).find((n) => n.titleEn === 'Overdue tasks summary');
      expect(digest?.bodyEn).toContain('2');
      expect(digest?.link).toBe('/tasks/team');
      await t.db.query('INSERT INTO task_policies (company_id, digest_weekday) VALUES ($1, 3)', [w.org.companyId]);
      expect(await reminders.sendDigest(riyadhToday(), 3)).toBe(1);
    });
  });

  describe('Archive and restore of standalone tasks', () => {
    const closeAndAge = async (w: Awaited<ReturnType<typeof world>>, days = 40, extra = ''): Promise<TaskDto> => {
      const done = await finish(w.agents.report, await w.given());
      await t.db.query(`UPDATE tasks SET last_activity_at = now() - interval '${days} days'${extra} WHERE id = $1`, [done.id]);
      return done;
    };

    it('archives a standalone task 30 days after it closed, never deletes it, and shows it in the archive tab', async () => {
      const w = await world();
      const done = await closeAndAge(w);
      expect(await t.app.get(TaskArchiveService).archiveDue()).toBe(1);
      expect(ids((await w.agents.report.get('/api/tasks').expect(200)).body)).toEqual([]);
      expect(ids((await w.agents.report.get('/api/tasks?archived=true').expect(200)).body)).toEqual([done.id]);
      const detail = (await w.agents.report.get(`/api/tasks/${done.id}`).expect(200)).body as TaskDto;
      expect(detail.archivedAt).not.toBeNull();
      expect(detail.abilities).toMatchObject({ restore: true, edit: false, moveTo: [] });
      expect(detail.events.map((e) => e.type)).toContain('archived');
      expect((await titles(w.agents.manager, `/tasks/${done.id}`)).some((x) => x.includes('was archived'))).toBe(true);
      expect(await t.app.get(TaskArchiveService).archiveDue()).toBe(0);
    });

    it('leaves open tasks, recent ones and tasks linked to a ticket or a project alone', async () => {
      const w = await world();
      await w.given();
      await closeAndAge(w, 5);
      const linked = await closeAndAge(w, 40);
      await t.db.query(`UPDATE tasks SET source = 'ticket' WHERE id = $1`, [linked.id]);
      expect(await t.app.get(TaskArchiveService).archiveDue()).toBe(0);
    });

    it('uses the retention days of the company policy', async () => {
      const w = await world();
      await t.db.query('INSERT INTO task_policies (company_id, standalone_retention_days) VALUES ($1, 90)', [w.org.companyId]);
      await closeAndAge(w, 40);
      expect(await t.app.get(TaskArchiveService).archiveDue()).toBe(0);
    });

    it('restores an archived task with the same status and starts its quiet period again', async () => {
      const w = await world();
      const done = await closeAndAge(w);
      await t.app.get(TaskArchiveService).archiveDue();
      const restored = (await w.agents.manager.post(`/api/tasks/${done.id}/restore`).expect(200)).body as TaskDto;
      expect(restored).toMatchObject({ status: 'done', archivedAt: null });
      expect(restored.events.at(-1)).toMatchObject({ type: 'restored', actor: { id: w.manager.id } });
      expect(ids((await w.agents.report.get('/api/tasks').expect(200)).body)).toEqual([done.id]);
      expect(await t.app.get(TaskArchiveService).archiveDue()).toBe(0);
      expect((await w.agents.manager.post(`/api/tasks/${done.id}/restore`).expect(409)).body.code).toBe('TASK_NOT_ARCHIVED');
    });

    it('hides the archive from people without its key, and restoring needs the restore key', async () => {
      const w = await world();
      const done = await closeAndAge(w);
      await t.app.get(TaskArchiveService).archiveDue();
      const noArchive = await t.factories.signIn(await t.factories.user({ unit: w.org.unitA, grants: [{ key: 'tasks.view', scope: 'own' }, { key: 'tasks.restore', scope: 'own' }] }));
      await noArchive.get('/api/tasks?archived=true').expect(403);
      const stranger = await t.factories.signIn(await t.factories.user({ unit: w.org.unitC, grants: TASK_EMPLOYEE_GRANTS }));
      await stranger.post(`/api/tasks/${done.id}/restore`).expect(404);
      const plain = await t.factories.signIn(await t.factories.user({ unit: w.org.unitA }));
      await plain.post(`/api/tasks/${done.id}/restore`).expect(403);
      await noArchive.get(`/api/tasks/${done.id}`).expect(404);
    });
  });

  describe('Repeating tasks', () => {
    it('creates the next occurrence when a repeating task is finished, once, and links the series', async () => {
      const w = await world();
      const first = await w.given({ recurrence: 'weekly', dueDate: riyadhToday() });
      await finish(w.agents.report, first);
      const open = (await w.agents.report.get('/api/tasks?openOnly=true').expect(200)).body as TasksPageDto;
      expect(open.items).toHaveLength(1);
      expect(open.items[0]).toMatchObject({ title: 'مهمة', status: 'todo', dueDate: daysFromNow(7) });
      const parent: { recurrence_parent_id: string }[] = await t.db.query('SELECT recurrence_parent_id FROM tasks WHERE id = $1', [open.items[0]?.id]);
      expect(parent[0]?.recurrence_parent_id).toBe(first.id);
      const current = (await w.agents.manager.get(`/api/tasks/${first.id}`).expect(200)).body as TaskDto;
      const reopened = (await w.agents.manager.post(`/api/tasks/${first.id}/transition`).send({ to: 'in_progress', revision: current.revision }).expect(200)).body as TaskDto;
      await w.agents.report.post(`/api/tasks/${first.id}/transition`).send({ to: 'done', revision: reopened.revision }).expect(200);
      expect((await w.agents.report.get('/api/tasks?openOnly=true').expect(200)).body.items).toHaveLength(1);
      expect((await titles(w.agents.report)).filter((x) => x.startsWith('New task'))).toHaveLength(2);
    });

    it('stops at the end date and does not repeat a plain task', async () => {
      const w = await world();
      await finish(w.agents.report, await w.given({ recurrence: 'weekly', dueDate: riyadhToday(), recurrenceEnd: daysFromNow(3) }));
      await finish(w.agents.report, await w.given());
      expect((await w.agents.report.get('/api/tasks?openOnly=true').expect(200)).body.items).toHaveLength(0);
    });

    it('does not pile up past dates when a series fell behind', async () => {
      const w = await world();
      const late = await w.given({ recurrence: 'daily' });
      await t.db.query(`UPDATE tasks SET due_date = (now() - interval '5 days')::date WHERE id = $1`, [late.id]);
      await finish(w.agents.report, { ...late, revision: late.revision });
      const next = (await w.agents.report.get('/api/tasks?openOnly=true').expect(200)).body.items[0];
      expect(next.dueDate >= riyadhToday()).toBe(true);
    });
  });

  describe('Time on a task', () => {
    it('logs minutes for the assignee, back to the policy days and not beyond or into the future', async () => {
      const w = await world();
      const task = await w.given();
      const logged = (await w.agents.report.post(`/api/tasks/${task.id}/time`).send({ minutes: 45 }).expect(200)).body as TaskDto;
      expect(logged.loggedMinutes).toBe(45);
      expect(logged.events.at(-1)).toMatchObject({ type: 'time_logged', actor: { id: w.report.id } });
      await w.agents.report.post(`/api/tasks/${task.id}/time`).send({ minutes: 15, workedOn: daysFromNow(-7) }).expect(200);
      expect((await w.agents.report.post(`/api/tasks/${task.id}/time`).send({ minutes: 15, workedOn: daysFromNow(-8) }).expect(422)).body.code).toBe('TASK_BACKDATE_TOO_FAR');
      expect((await w.agents.report.post(`/api/tasks/${task.id}/time`).send({ minutes: 15, workedOn: daysFromNow(1) }).expect(422)).body.code).toBe('TASK_BACKDATE_TOO_FAR');
      await w.agents.report.post(`/api/tasks/${task.id}/time`).send({ minutes: 0 }).expect(400);
      await w.agents.report.post(`/api/tasks/${task.id}/time`).send({ minutes: 1441 }).expect(400);
    });

    it('is for the assignee alone, and not for a finished task', async () => {
      const w = await world();
      const task = await w.given();
      await w.agents.manager.post(`/api/tasks/${task.id}/time`).send({ minutes: 10 }).expect(403);
      const stranger = await t.factories.signIn(await t.factories.user({ unit: w.org.unitC, grants: TASK_EMPLOYEE_GRANTS }));
      await stranger.post(`/api/tasks/${task.id}/time`).send({ minutes: 10 }).expect(404);
      await finish(w.agents.report, task);
      await w.agents.report.post(`/api/tasks/${task.id}/time`).send({ minutes: 10 }).expect(403);
    });

    it('tells the assignee and who gave the task, once, when the logged time passes the estimate', async () => {
      const w = await world();
      const task = await w.given({ estimateMinutes: 60 });
      await w.agents.report.post(`/api/tasks/${task.id}/time`).send({ minutes: 50 }).expect(200);
      expect((await titles(w.agents.report, `/tasks/${task.id}`)).some((x) => x.includes('passed its estimate'))).toBe(false);
      await w.agents.report.post(`/api/tasks/${task.id}/time`).send({ minutes: 20 }).expect(200);
      await w.agents.report.post(`/api/tasks/${task.id}/time`).send({ minutes: 20 }).expect(200);
      for (const agent of [w.agents.report, w.agents.manager]) expect((await titles(agent, `/tasks/${task.id}`)).filter((x) => x.includes('passed its estimate'))).toHaveLength(1);
    });
  });

  it('computes the objection time over working days (Friday and Saturday off)', () => {
    expect(addWorkingDays('2026-11-05', 3)).toBe('2026-11-10');
  });
});

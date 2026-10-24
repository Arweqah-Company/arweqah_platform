import { riyadhToday, type TaskDto, type TaskStatus } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import type { TestAgent } from './factories/factories';
import { TASK_EMPLOYEE_GRANTS, taskManagerGrants } from './factories/task-grants';
import { useTestApp } from './setup/test-app';

const daysAgo = (n: number) => riyadhToday(new Date(Date.now() - n * 86_400_000));

describe('Tasks: table, board and the rules of moving a task (FR-50), notices of status changes (FR-56)', () => {
  const t = useTestApp();

  /** A manager (who gives the tasks), a direct report who does them, and a peer who sees nothing. */
  async function world() {
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: taskManagerGrants('subtree') });
    const report = await t.factories.user({ unit: org.unitA, grants: TASK_EMPLOYEE_GRANTS });
    const peer = await t.factories.user({ unit: org.unitC, grants: TASK_EMPLOYEE_GRANTS });
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, report.employeeId]);
    const agents = { manager: await t.factories.signIn(manager), report: await t.factories.signIn(report), peer: await t.factories.signIn(peer) };
    const given = async (body: Record<string, unknown> = {}): Promise<TaskDto> => (await agents.manager.post('/api/tasks').send({ title: 'مهمة', assigneeUserId: report.id, ...body }).expect(201)).body;
    return { org, manager, report, peer, agents, given };
  }

  const move = (agent: TestAgent, task: Pick<TaskDto, 'id' | 'revision'>, to: TaskStatus, extra: Record<string, unknown> = {}) =>
    agent.post(`/api/tasks/${task.id}/transition`).send({ to, revision: task.revision, ...extra });
  const moved = async (agent: TestAgent, task: Pick<TaskDto, 'id' | 'revision'>, to: TaskStatus, extra: Record<string, unknown> = {}): Promise<TaskDto> => (await move(agent, task, to, extra).expect(200)).body;
  const notices = async (agent: TestAgent) => (await agent.get('/api/notifications').expect(200)).body.items as { link: string; titleEn: string }[];

  describe('The assignee works the task', () => {
    it('starts and finishes it, recording who moved it, when, and from which status to which', async () => {
      const w = await world();
      const task = await w.given();
      const started = await moved(w.agents.report, task, 'in_progress');
      expect(started.status).toBe('in_progress');
      const done = await moved(w.agents.report, started, 'done');
      expect(done).toMatchObject({ status: 'done', flags: { urgent: false, overdue: false } });
      expect(done.completedAt).not.toBeNull();
      expect(done.events.filter((e) => e.type === 'transitioned').map((e) => [e.fromStatus, e.toStatus, e.actor?.id])).toEqual([
        ['todo', 'in_progress', w.report.id],
        ['in_progress', 'done', w.report.id],
      ]);
    });

    it('tells whoever gave the task about every change, and that it is finished, but not the one who moved it', async () => {
      const w = await world();
      const task = await w.given();
      const started = await moved(w.agents.report, task, 'in_progress');
      await moved(w.agents.report, started, 'done');
      const titles = (await notices(w.agents.manager)).filter((n) => n.link === `/tasks/${task.id}`).map((n) => n.titleEn);
      expect(titles.some((x) => x.includes('changed status'))).toBe(true);
      expect(titles.some((x) => x.includes('is finished'))).toBe(true);
      expect((await notices(w.agents.report)).filter((n) => n.titleEn.includes('changed status') || n.titleEn.includes('is finished'))).toHaveLength(0);
    });

    it('tells the followers as well', async () => {
      const w = await world();
      const task = await w.given();
      await w.agents.peer.post(`/api/tasks/${task.id}/follow`).expect(404);
      const watcher = await t.factories.user({ unit: w.org.unitA, grants: [...TASK_EMPLOYEE_GRANTS, { key: 'tasks.team_view', scope: 'subtree' }] });
      await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [w.manager.employeeId, watcher.employeeId]);
      const agent = await t.factories.signIn(watcher);
      await agent.post(`/api/tasks/${task.id}/follow`).expect(200);
      await moved(w.agents.report, task, 'in_progress');
      expect((await notices(agent)).some((n) => n.link === `/tasks/${task.id}` && n.titleEn.includes('changed status'))).toBe(true);
    });

    it('resets the quiet period: a stale task is not stale after a move', async () => {
      const w = await world();
      const task = await w.given();
      await t.db.query(`UPDATE tasks SET last_activity_at = now() - interval '40 days' WHERE id = $1`, [task.id]);
      const stale = (await w.agents.report.get('/api/tasks?stale=true').expect(200)).body;
      expect(stale.items.map((i: { id: string }) => i.id)).toEqual([task.id]);
      expect(stale.items[0].flags.stale).toBe(true);
      await moved(w.agents.report, { id: task.id, revision: task.revision }, 'in_progress');
      expect((await w.agents.report.get('/api/tasks?stale=true').expect(200)).body.items).toHaveLength(0);
    });
  });

  describe('The table of moves, enforced by the API', () => {
    it('refuses a drag out of pending approval for everybody, and out of or into rejected', async () => {
      const w = await world();
      const own = (await w.agents.report.post('/api/tasks').send({ title: 'لنفسي' }).expect(201)).body as TaskDto;
      expect(own.status).toBe('pending_approval');
      for (const agent of [w.agents.report, w.agents.manager]) {
        const refused = await move(agent, own, 'todo').expect(422);
        expect(refused.body).toMatchObject({ code: 'TASK_TRANSITION_NOT_ALLOWED', details: { from: 'pending_approval', to: 'todo', reason: 'AWAITING_APPROVAL' } });
      }
      await t.db.query(`UPDATE tasks SET status = 'rejected' WHERE id = $1`, [own.id]);
      expect((await move(w.agents.manager, { id: own.id, revision: 1 }, 'todo').expect(422)).body.details.reason).toBe('REJECTED_TASK');
    });

    it('lets a manager of the team move the report\'s tasks, and refuses a peer, who cannot even see it', async () => {
      const w = await world();
      const task = await w.given();
      await move(w.agents.peer, task, 'in_progress').expect(404);
      expect((await moved(w.agents.manager, task, 'in_progress')).status).toBe('in_progress');
    });

    it('refuses the paths the table does not list and a move to the same status', async () => {
      const w = await world();
      const task = await w.given();
      expect((await move(w.agents.report, task, 'done').expect(422)).body.details.reason).toBe('NOT_ALLOWED_PATH');
      expect((await move(w.agents.report, task, 'todo').expect(422)).body.details.reason).toBe('NO_CHANGE');
      expect((await move(w.agents.report, task, 'awaiting_review').expect(422)).body.details.reason).toBe('NOT_ALLOWED_PATH');
    });

    it('reopens a finished task only for who gave it or a manager, clearing the completion', async () => {
      const w = await world();
      const task = await w.given();
      const done = await moved(w.agents.report, await moved(w.agents.report, task, 'in_progress'), 'done');
      expect((await move(w.agents.report, done, 'in_progress').expect(422)).body.details.reason).toBe('NOT_CREATOR_OR_MANAGER');
      const reopened = await moved(w.agents.manager, done, 'in_progress');
      expect(reopened).toMatchObject({ status: 'in_progress', completedAt: null });
    });

    it('describes to the screen where each person may drag a card', async () => {
      const w = await world();
      const task = await w.given();
      const asAssignee = (await w.agents.report.get(`/api/tasks/${task.id}`).expect(200)).body as TaskDto;
      const asManager = (await w.agents.manager.get(`/api/tasks/${task.id}`).expect(200)).body as TaskDto;
      expect(asAssignee.abilities.moveTo).toEqual(['in_progress']);
      expect(asManager.abilities.moveTo).toEqual(['in_progress']);
      expect(asAssignee.abilities).toMatchObject({ edit: true, object: true, follow: true, logTime: true, approve: false });
    });
  });

  describe('Tasks that need review', () => {
    it('sends the finished work to the reviewer, who alone accepts it or sends it back with a note', async () => {
      const w = await world();
      const task = await w.given({ needsReview: true });
      expect(task.reviewer?.id).toBe(w.manager.id);
      const started = await moved(w.agents.report, task, 'in_progress');
      const waiting = await moved(w.agents.report, started, 'done');
      expect(waiting.status).toBe('awaiting_review');
      expect(waiting.completedAt).toBeNull();
      expect((await notices(w.agents.manager)).some((n) => n.titleEn.includes('awaits your review'))).toBe(true);
      expect((await move(w.agents.report, waiting, 'done').expect(422)).body.details.reason).toBe('NOT_REVIEWER');
      expect((await move(w.agents.manager, waiting, 'in_progress').expect(422)).body.code).toBe('TASK_NOTE_REQUIRED');
      const back = await moved(w.agents.manager, waiting, 'in_progress', { note: 'ينقصه ملخص' });
      expect(back.events.at(-1)).toMatchObject({ type: 'transitioned', note: 'ينقصه ملخص', fromStatus: 'awaiting_review', toStatus: 'in_progress' });
      expect((await notices(w.agents.report)).some((n) => n.titleEn.includes('was sent back'))).toBe(true);
      const again = await moved(w.agents.report, back, 'done');
      const accepted = await moved(w.agents.manager, again, 'done');
      expect(accepted).toMatchObject({ status: 'done' });
      expect(accepted.completedAt).not.toBeNull();
    });
  });

  describe('Finishing late', () => {
    it('asks for the real date when the task is more than 7 days past its due date, and accepts one inside the window', async () => {
      const w = await world();
      const task = await w.given();
      const started = await moved(w.agents.report, task, 'in_progress');
      await t.db.query('UPDATE tasks SET due_date = $2 WHERE id = $1', [task.id, daysAgo(10)]);
      expect((await move(w.agents.report, started, 'done').expect(422)).body.code).toBe('TASK_COMPLETION_DATE_REQUIRED');
      expect((await move(w.agents.report, started, 'done', { completedOn: daysAgo(9) }).expect(422)).body.code).toBe('TASK_BACKDATE_TOO_FAR');
      expect((await move(w.agents.report, started, 'done', { completedOn: riyadhToday(new Date(Date.now() + 2 * 86_400_000)) }).expect(422)).body.code).toBe('TASK_BACKDATE_TOO_FAR');
      const done = await moved(w.agents.report, started, 'done', { completedOn: daysAgo(3) });
      expect(done.status).toBe('done');
      const stored: { completed_on: string }[] = await t.db.query(`SELECT to_char(completed_on, 'YYYY-MM-DD') AS completed_on FROM tasks WHERE id = $1`, [task.id]);
      expect(stored[0]?.completed_on).toBe(daysAgo(3));
    });

    it('needs no date for a task a few days late', async () => {
      const w = await world();
      const task = await w.given();
      const started = await moved(w.agents.report, task, 'in_progress');
      await t.db.query('UPDATE tasks SET due_date = $2 WHERE id = $1', [task.id, daysAgo(5)]);
      expect((await moved(w.agents.report, started, 'done')).status).toBe('done');
    });
  });

  describe('Safety', () => {
    it('answers 409 when somebody else changed the task first, and 400 for a bad body', async () => {
      const w = await world();
      const task = await w.given();
      await w.agents.manager.patch(`/api/tasks/${task.id}`).send({ title: 'عنوان آخر', revision: task.revision }).expect(200);
      const conflict = await move(w.agents.report, task, 'in_progress').expect(409);
      expect(conflict.body.code).toBe('TASK_REVISION_CONFLICT');
      await move(w.agents.report, { id: task.id, revision: 0 }, 'done').expect(400);
      await w.agents.report.post(`/api/tasks/${task.id}/transition`).send({ to: 'flying', revision: 1 }).expect(400);
      await w.agents.report.post(`/api/tasks/${task.id}/transition`).send({ to: 'done', revision: 1, status: 'done' }).expect(400);
    });

    it('is the only way to change a status: editing cannot', async () => {
      const w = await world();
      const task = await w.given();
      await w.agents.manager.patch(`/api/tasks/${task.id}`).send({ status: 'done', revision: task.revision }).expect(400);
    });
  });
});

import { CorePermission as P, riyadhToday, type TaskDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { ScheduledJobRelay } from '../src/core/messaging/infrastructure/typeorm-job-scheduler';
import { OutboxRelay } from '../src/core/messaging/infrastructure/typeorm-outbox';
import { TaskHandoverService } from '../src/modules/tasks/application/services/task-handover.service';
import type { TestAgent } from './factories/factories';
import { TASK_EMPLOYEE_GRANTS, taskManagerGrants } from './factories/task-grants';
import { useTestApp } from './setup/test-app';

const DAY = 86_400_000;

describe('Tasks: when an employee leaves (FR-55)', () => {
  const t = useTestApp();

  /** A manager, the employee who will leave (with the manager above them), and HR who ends the service. */
  async function world(options: { withManager?: boolean } = {}) {
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: taskManagerGrants('subtree') });
    const leaver = await t.factories.user({ unit: org.unitA, grants: [...TASK_EMPLOYEE_GRANTS, { key: P.TasksReview, scope: 'all' }] });
    const hr = await t.factories.user({ grants: [{ key: P.EmployeesView, scope: 'all' }, { key: P.EmployeesTerminate, scope: 'all' }] });
    if (options.withManager !== false) await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, leaver.employeeId]);
    const agents = { manager: await t.factories.signIn(manager), leaver: await t.factories.signIn(leaver), hr: await t.factories.signIn(hr) };
    const given = async (body: Record<string, unknown> = {}): Promise<TaskDto> => (await agents.manager.post('/api/tasks').send({ title: 'مهمة', assigneeUserId: leaver.id, ...body }).expect(201)).body;
    return { org, manager, leaver, hr, agents, given };
  }

  const terminate = async (agent: TestAgent, employeeId: string, endDate: string) => {
    const reasons: { id: string }[] = await t.db.query('SELECT id FROM termination_reasons LIMIT 1');
    return agent.post(`/api/employees/${employeeId}/terminate`).send({ endDate, terminationReasonId: reasons[0]?.id }).expect(200);
  };
  const flush = () => t.app.get(OutboxRelay).flush();
  const get = async (agent: TestAgent, id: string): Promise<TaskDto> => (await agent.get(`/api/tasks/${id}`).expect(200)).body;
  const notices = async (agent: TestAgent) => (await agent.get('/api/notifications').expect(200)).body.items as { titleEn: string; bodyEn: string; link: string }[];

  it('hands the open tasks to the direct manager on the last day, and leaves finished ones alone', async () => {
    const w = await world();
    const todo = await w.given();
    const started = await w.given();
    await w.agents.leaver.post(`/api/tasks/${started.id}/transition`).send({ to: 'in_progress', revision: started.revision }).expect(200);
    const finished = await w.given();
    const inProgress = (await w.agents.leaver.post(`/api/tasks/${finished.id}/transition`).send({ to: 'in_progress', revision: finished.revision }).expect(200)).body as TaskDto;
    await w.agents.leaver.post(`/api/tasks/${finished.id}/transition`).send({ to: 'done', revision: inProgress.revision }).expect(200);
    await terminate(w.agents.hr, w.leaver.employeeId, riyadhToday());
    await flush();
    for (const id of [todo.id, started.id]) {
      const moved = await get(w.agents.manager, id);
      expect(moved.assignee.id).toBe(w.manager.id);
      expect(moved.events.at(-1)).toMatchObject({ type: 'handed_over', actor: null });
    }
    expect((await get(w.agents.manager, finished.id)).assignee.id).toBe(w.leaver.id);
    const forManager = await notices(w.agents.manager);
    expect(forManager.some((n) => n.titleEn === 'Tasks were handed over to you' && n.bodyEn.startsWith('2 tasks'))).toBe(true);
    expect(forManager.some((n) => n.titleEn.includes('new assignee'))).toBe(false);
  });

  it('tells whoever gave a task that it has a new assignee', async () => {
    const w = await world();
    const other = await t.factories.user({ unit: w.org.unitA, grants: taskManagerGrants('subtree') });
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [w.manager.employeeId, other.employeeId]);
    const otherAgent = await t.factories.signIn(other);
    const task = (await otherAgent.post('/api/tasks').send({ title: 'من زميل', assigneeUserId: w.leaver.id }).expect(201)).body as TaskDto;
    await terminate(w.agents.hr, w.leaver.employeeId, riyadhToday());
    await flush();
    expect((await notices(otherAgent)).some((n) => n.link === `/tasks/${task.id}` && n.titleEn.includes('new assignee'))).toBe(true);
  });

  it('moves the reviews they owe too, and does not hand over tasks waiting for approval', async () => {
    const w = await world();
    await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [w.manager.employeeId, w.org.department]);
    const reviewed = (await w.agents.leaver.post('/api/tasks').send({ title: 'مراجعة', assigneeUserId: w.manager.id }).expect(201)).body as TaskDto;
    await t.db.query(`UPDATE tasks SET needs_review = true, reviewer_user_id = $2 WHERE id = $1`, [reviewed.id, w.leaver.id]);
    const own = (await w.agents.leaver.post('/api/tasks').send({ title: 'لنفسي' }).expect(201)).body as TaskDto;
    expect(own.status).toBe('pending_approval');
    await terminate(w.agents.hr, w.leaver.employeeId, riyadhToday());
    await flush();
    const after: { reviewer_user_id: string }[] = await t.db.query('SELECT reviewer_user_id FROM tasks WHERE id = $1', [reviewed.id]);
    expect(after[0]?.reviewer_user_id).toBe(w.manager.id);
    expect((await get(w.agents.leaver, own.id)).assignee.id).toBe(w.leaver.id);
  });

  it('waits for the last day when the end date is in the future, and moves nothing twice', async () => {
    const w = await world();
    const task = await w.given();
    const end = riyadhToday(new Date(Date.now() + 5 * DAY));
    await terminate(w.agents.hr, w.leaver.employeeId, end);
    await flush();
    expect((await get(w.agents.manager, task.id)).assignee.id).toBe(w.leaver.id);
    expect(await t.app.get(ScheduledJobRelay).releaseDue(new Date(Date.now() + 2 * DAY))).toBe(0);
    expect(await t.app.get(ScheduledJobRelay).releaseDue(new Date(Date.now() + 6 * DAY))).toBe(1);
    await flush();
    expect((await get(w.agents.manager, task.id)).assignee.id).toBe(w.manager.id);
    expect(await t.app.get(TaskHandoverService).handOver(w.leaver.id)).toBe(0);
  });

  it('keeps the tasks of somebody with no manager and writes it to the audit log', async () => {
    const w = await world({ withManager: false });
    const task = await w.given();
    await terminate(w.agents.hr, w.leaver.employeeId, riyadhToday());
    await flush();
    expect((await get(w.agents.manager, task.id)).assignee.id).toBe(w.leaver.id);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const rows: { action: string }[] = await t.db.query(`SELECT action FROM audit_logs WHERE action = 'task.handover_skipped'`);
    expect(rows).toHaveLength(1);
  });

  it('is a durable message handled once: delivering it again changes nothing', async () => {
    const w = await world();
    await w.given();
    await terminate(w.agents.hr, w.leaver.employeeId, riyadhToday());
    await flush();
    const before = await notices(w.agents.manager);
    expect(await t.app.get(TaskHandoverService).onTerminated({ employeeId: w.leaver.employeeId, userId: w.leaver.id, endDate: riyadhToday() })).toBeUndefined();
    expect(await notices(w.agents.manager)).toHaveLength(before.length);
  });
});

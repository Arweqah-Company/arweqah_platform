import type { TaskDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import type { TestAgent } from './factories/factories';
import { TASK_EMPLOYEE_GRANTS, taskManagerGrants } from './factories/task-grants';
import { useTestApp } from './setup/test-app';

describe('Tasks: self-approval (FR-51)', () => {
  const t = useTestApp();

  /** A manager, a direct report, a stranger manager of another unit, and a person with no relation at all. */
  async function world() {
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: taskManagerGrants('unit') });
    const report = await t.factories.user({ unit: org.unitA, grants: TASK_EMPLOYEE_GRANTS });
    const otherManager = await t.factories.user({ unit: org.unitC, grants: taskManagerGrants('unit') });
    const peer = await t.factories.user({ unit: org.unitC, grants: TASK_EMPLOYEE_GRANTS });
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, report.employeeId]);
    const agents = {
      manager: await t.factories.signIn(manager),
      report: await t.factories.signIn(report),
      otherManager: await t.factories.signIn(otherManager),
      peer: await t.factories.signIn(peer),
    };
    const own = async (): Promise<TaskDto> => (await agents.report.post('/api/tasks').send({ title: 'لنفسي' }).expect(201)).body;
    return { org, manager, report, agents, own };
  }

  const decide = (agent: TestAgent, task: Pick<TaskDto, 'id' | 'revision'>, action: 'approve' | 'reject' | 'resubmit', extra: Record<string, unknown> = {}) =>
    agent.post(`/api/tasks/${task.id}/${action}`).send({ revision: task.revision, ...extra });
  const notices = async (agent: TestAgent) => (await agent.get('/api/notifications').expect(200)).body.items as { link: string; titleEn: string }[];
  const instances = (taskId: string) => t.db.query('SELECT state, is_done FROM workflow_instances WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at', ['task', taskId]);

  it('starts a machine for a task given to oneself and tells the manager, and approving moves it to do', async () => {
    const w = await world();
    const task = await w.own();
    expect(task.status).toBe('pending_approval');
    expect(await instances(task.id)).toEqual([{ state: 'pendingManager', is_done: false }]);
    expect((await notices(w.agents.manager)).some((n) => n.link === `/tasks/${task.id}` && n.titleEn.includes('awaits your approval'))).toBe(true);
    const approved = (await decide(w.agents.manager, task, 'approve', { note: 'موافق' }).expect(200)).body as TaskDto;
    expect(approved.status).toBe('todo');
    expect(approved.events.map((e) => e.type)).toEqual(['created', 'approved']);
    expect(approved.events.at(-1)).toMatchObject({ actor: { id: w.manager.id }, fromStatus: 'pending_approval', toStatus: 'todo', note: 'موافق' });
    expect(await instances(task.id)).toEqual([{ state: 'approved', is_done: true }]);
    expect((await notices(w.agents.report)).some((n) => n.titleEn.includes('was approved'))).toBe(true);
  });

  it('shows the approver the button, and nobody else', async () => {
    const w = await world();
    const task = await w.own();
    const forManager = (await w.agents.manager.get(`/api/tasks/${task.id}`).expect(200)).body as TaskDto;
    const forOwner = (await w.agents.report.get(`/api/tasks/${task.id}`).expect(200)).body as TaskDto;
    expect(forManager.abilities.approve).toBe(true);
    expect(forOwner.abilities.approve).toBe(false);
    expect(forManager.approver?.id).toBe(w.manager.id);
  });

  it('refuses a person without the approve key (403), a person who cannot see the task (404) and one who sees it but is not its approver (422)', async () => {
    const w = await world();
    const task = await w.own();
    await decide(w.agents.report, task, 'approve').expect(403);
    await decide(w.agents.peer, task, 'approve').expect(403);
    await decide(w.agents.otherManager, task, 'approve').expect(404);
    const colleague = await t.factories.user({ unit: w.org.unitA, grants: taskManagerGrants('unit') });
    const colleagueAgent = await t.factories.signIn(colleague);
    await w.agents.manager.post(`/api/tasks/${task.id}/follow`).expect(200);
    await t.db.query('INSERT INTO task_followers (task_id, user_id) VALUES ($1, $2)', [task.id, colleague.id]);
    expect((await decide(colleagueAgent, task, 'approve').expect(422)).body.code).toBe('TASK_NOT_APPROVABLE');
  });

  it('cannot be approved twice, and a stale revision changes nothing', async () => {
    const w = await world();
    const task = await w.own();
    expect((await decide(w.agents.manager, { id: task.id, revision: 99 }, 'approve').expect(409)).body.code).toBe('TASK_REVISION_CONFLICT');
    expect(await instances(task.id)).toEqual([{ state: 'pendingManager', is_done: false }]);
    await decide(w.agents.manager, task, 'approve').expect(200);
    expect((await decide(w.agents.manager, { id: task.id, revision: task.revision + 1 }, 'approve').expect(422)).body.code).toBe('TASK_NOT_APPROVABLE');
    await decide(w.agents.manager, task, 'reject').expect(422);
  });

  it('rejects a task, which has its own status, and lets its owner edit and send it again to a new round', async () => {
    const w = await world();
    const task = await w.own();
    const rejected = (await decide(w.agents.manager, task, 'reject', { note: 'ليست أولوية' }).expect(200)).body as TaskDto;
    expect(rejected.status).toBe('rejected');
    expect(rejected.events.at(-1)).toMatchObject({ type: 'rejected', note: 'ليست أولوية', toStatus: 'rejected' });
    expect((await notices(w.agents.report)).some((n) => n.titleEn.includes('was rejected'))).toBe(true);
    const asOwner = (await w.agents.report.get(`/api/tasks/${task.id}`).expect(200)).body as TaskDto;
    expect(asOwner.abilities).toMatchObject({ resubmit: true, edit: true });
    const edited = (await w.agents.report.patch(`/api/tasks/${task.id}`).send({ title: 'لنفسي بعد التعديل', revision: asOwner.revision }).expect(200)).body as TaskDto;
    const again = (await decide(w.agents.report, edited, 'resubmit').expect(200)).body as TaskDto;
    expect(again.status).toBe('pending_approval');
    expect(again.events.map((e) => e.type)).toEqual(['created', 'rejected', 'updated', 'resubmitted']);
    expect(await instances(task.id)).toEqual([{ state: 'rejected', is_done: true }, { state: 'pendingManager', is_done: false }]);
    expect((await decide(w.agents.manager, again, 'approve').expect(200)).body.status).toBe('todo');
  });

  it('allows resubmitting only the owner of a rejected task', async () => {
    const w = await world();
    const task = await w.own();
    expect((await decide(w.agents.report, task, 'resubmit').expect(422)).body.code).toBe('TASK_STATE_INVALID');
    const rejected = (await decide(w.agents.manager, task, 'reject').expect(200)).body as TaskDto;
    await decide(w.agents.manager, rejected, 'resubmit').expect(403);
  });

  it('is not needed when somebody else gave the task, and a task has no approver then', async () => {
    const w = await world();
    const given = (await w.agents.manager.post('/api/tasks').send({ title: 'مهمة', assigneeUserId: w.report.id }).expect(201)).body as TaskDto;
    expect(given).toMatchObject({ status: 'todo', approver: null });
    expect(await instances(given.id)).toEqual([]);
  });
});

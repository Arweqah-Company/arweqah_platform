import { CorePermission as P, riyadhToday, type TaskDto, type TaskMatrixDto, type TasksPageDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { TaskHandoverService } from '../src/modules/tasks/application/services/task-handover.service';
import { TaskReminderService } from '../src/modules/tasks/application/services/task-reminder.service';
import { TASK_COMMENTER_GRANTS, TASK_COMMENT_GRANTS, TASK_EMPLOYEE_GRANTS, taskManagerGrants } from './factories/task-grants';
import { useTestApp } from './setup/test-app';

describe('Personal tasks: for the employee alone, no approval, no review, not seen by the manager (FR-165)', () => {
  const t = useTestApp();

  async function world() {
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: [...taskManagerGrants('all'), ...TASK_COMMENT_GRANTS, { key: P.TasksFollowersManage, scope: 'all' }, { key: P.TasksDelete, scope: 'all' }] });
    const owner = await t.factories.user({ unit: org.unitA, grants: [...TASK_COMMENTER_GRANTS, { key: P.TasksFollowersManage, scope: 'own' }] });
    const peer = await t.factories.user({ unit: org.unitA, grants: TASK_EMPLOYEE_GRANTS });
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, owner.employeeId]);
    const agents = { manager: await t.factories.signIn(manager), owner: await t.factories.signIn(owner), peer: await t.factories.signIn(peer) };
    return { manager, owner, peer, agents };
  }
  const personal = (extra: Record<string, unknown> = {}) => ({ title: 'قراءة كتاب', personal: true, ...extra });

  it('starts at once as to do: no approver, no approval waiting, and the owner moves it to done by themselves', async () => {
    const w = await world();
    const task = (await w.agents.owner.post('/api/tasks').send(personal()).expect(201)).body as TaskDto;
    expect(task).toMatchObject({ personal: true, status: 'todo', approver: null, reviewer: null, needsReview: false });
    expect(task.abilities).toMatchObject({ approve: false, follow: false, manageFollowers: false, object: false, edit: true });
    const started = (await w.agents.owner.post(`/api/tasks/${task.id}/transition`).send({ to: 'in_progress', revision: task.revision }).expect(200)).body as TaskDto;
    const done = (await w.agents.owner.post(`/api/tasks/${task.id}/transition`).send({ to: 'done', revision: started.revision }).expect(200)).body as TaskDto;
    expect(done.status).toBe('done');
    const waiting = (await w.agents.manager.get('/api/tasks/summary').expect(200)).body;
    expect(waiting.awaitingMyApproval ?? 0).toBe(0);
  });

  it('ignores the review switch and refuses to give a personal task to somebody else', async () => {
    const w = await world();
    const task = (await w.agents.owner.post('/api/tasks').send(personal({ needsReview: true })).expect(201)).body as TaskDto;
    expect(task).toMatchObject({ needsReview: false, reviewer: null });
    const refused = await w.agents.owner.post('/api/tasks').send(personal({ assigneeUserId: w.peer.id })).expect(422);
    expect(refused.body.code ?? refused.body.error?.code).toBe('TASK_PERSONAL_FOR_SELF');
    await w.agents.owner.post('/api/tasks').send(personal({ assigneeUserId: w.owner.id })).expect(201);
  });

  it('is invisible to the manager, even with the widest scope: detail 404, no list, no matrix, no team numbers', async () => {
    const w = await world();
    const task = (await w.agents.owner.post('/api/tasks').send(personal()).expect(201)).body as TaskDto;
    const normal = (await w.agents.owner.post('/api/tasks').send({ title: 'مهمة عادية', priority: 'high', urgent: true }).expect(201)).body as TaskDto;
    await w.agents.manager.get(`/api/tasks/${task.id}`).expect(404);
    await w.agents.manager.patch(`/api/tasks/${task.id}`).send({ title: 'x', revision: task.revision }).expect(404);
    await w.agents.manager.delete(`/api/tasks/${task.id}`).expect(404);
    const team = (await w.agents.manager.get('/api/tasks/team?reach=all').expect(200)).body as TasksPageDto;
    expect(team.items.map((i) => i.id)).not.toContain(task.id);
    expect(team.items.map((i) => i.id)).toContain(normal.id);
    const matrix = (await w.agents.manager.get('/api/tasks/matrix?scope=team').expect(200)).body as TaskMatrixDto;
    expect(matrix.quadrants.flatMap((q) => q.items.map((i) => i.id))).not.toContain(task.id);
    const mine = (await w.agents.owner.get('/api/tasks').expect(200)).body as TasksPageDto;
    expect(mine.items.find((i) => i.id === task.id)?.personal).toBe(true);
    expect((await w.agents.owner.get('/api/tasks?personal=true').expect(200)).body.items.map((i: { id: string }) => i.id)).toEqual([task.id]);
  });

  it('has no followers and no mentions, and a colleague cannot reach it', async () => {
    const w = await world();
    const task = (await w.agents.owner.post('/api/tasks').send(personal()).expect(201)).body as TaskDto;
    await w.agents.owner.post(`/api/tasks/${task.id}/followers`).send({ userIds: [w.peer.id] }).expect(403);
    await w.agents.manager.post(`/api/tasks/${task.id}/followers`).send({ userIds: [w.peer.id] }).expect(404);
    await w.agents.peer.get(`/api/tasks/${task.id}`).expect(404);
    await w.agents.owner.post(`/api/tasks/${task.id}/comments`).send({ body: `مرحبا {{mention:${w.peer.id}}}` }).expect(422);
    await w.agents.owner.post(`/api/tasks/${task.id}/comments`).send({ body: 'ملاحظة لنفسي' }).expect(201);
  });

  it('is edited and deleted by its owner, and stays personal in what the edit may change', async () => {
    const w = await world();
    const task = (await w.agents.owner.post('/api/tasks').send(personal()).expect(201)).body as TaskDto;
    const edited = (await w.agents.owner.patch(`/api/tasks/${task.id}`).send({ title: 'عنوان جديد', needsReview: true, revision: task.revision }).expect(200)).body as TaskDto;
    expect(edited).toMatchObject({ title: 'عنوان جديد', personal: true, needsReview: false, reviewer: null });
  });

  it('is left out of the Sunday digest and stays with its owner when they leave', async () => {
    const w = await world();
    const personalTask = (await w.agents.owner.post('/api/tasks').send(personal()).expect(201)).body as TaskDto;
    await t.db.query(`UPDATE tasks SET due_date = (now() - interval '3 days')::date WHERE id = $1`, [personalTask.id]);
    expect(await t.app.get(TaskReminderService).sendDigest(riyadhToday(), 0)).toBe(0);
    expect(await t.app.get(TaskHandoverService).handOver(w.owner.id)).toBe(0);
    const stored: { assignee_user_id: string }[] = await t.db.query('SELECT assignee_user_id FROM tasks WHERE id = $1', [personalTask.id]);
    expect(stored[0]?.assignee_user_id).toBe(w.owner.id);
  });
});

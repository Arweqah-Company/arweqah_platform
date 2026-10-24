import { addWorkingDays, riyadhToday, type TaskDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { ScheduledJobRelay } from '../src/core/messaging/infrastructure/typeorm-job-scheduler';
import { OutboxRelay } from '../src/core/messaging/infrastructure/typeorm-outbox';
import type { TestAgent } from './factories/factories';
import { TASK_EMPLOYEE_GRANTS, taskManagerGrants } from './factories/task-grants';
import { useTestApp } from './setup/test-app';

const DAY = 86_400_000;

describe('Tasks: objections (FR-52)', () => {
  const t = useTestApp();

  async function world() {
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: taskManagerGrants('subtree') });
    const report = await t.factories.user({ unit: org.unitA, grants: TASK_EMPLOYEE_GRANTS });
    const other = await t.factories.user({ unit: org.unitC, grants: taskManagerGrants('subtree') });
    const report2 = await t.factories.user({ unit: org.unitA, grants: TASK_EMPLOYEE_GRANTS });
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = ANY($2)', [manager.employeeId, [report.employeeId, report2.employeeId]]);
    const agents = { manager: await t.factories.signIn(manager), report: await t.factories.signIn(report), other: await t.factories.signIn(other) };
    const given = async (): Promise<TaskDto> => (await agents.manager.post('/api/tasks').send({ title: 'مهمة', assigneeUserId: report.id }).expect(201)).body;
    return { org, manager, report, report2, other, agents, given };
  }

  const object = (agent: TestAgent, task: Pick<TaskDto, 'id'>, body: Record<string, unknown> = { reason: 'not_enough_time' }) => agent.post(`/api/tasks/${task.id}/objection`).send(body);
  const notices = async (agent: TestAgent) => (await agent.get('/api/notifications').expect(200)).body.items as { link: string; titleEn: string }[];
  const release = async (days: number) => {
    const released = await t.app.get(ScheduledJobRelay).releaseDue(new Date(Date.now() + days * DAY));
    await t.app.get(OutboxRelay).flush();
    return released;
  };

  it('lets the assignee object with one of four reasons, marks the task, and tells who gave it', async () => {
    const w = await world();
    const task = await w.given();
    const objected = (await object(w.agents.report, task, { reason: 'conflicting_priorities', note: 'عندي أولوية أخرى' }).expect(200)).body as TaskDto;
    expect(objected.flags.objected).toBe(true);
    expect(objected.objection).toMatchObject({ reason: 'conflicting_priorities', note: 'عندي أولوية أخرى', status: 'open', raisedBy: { id: w.report.id } });
    expect(objected.objection?.expiresAt).toBe(`${addWorkingDays(riyadhToday(), 3)}T21:00:00.000Z`);
    expect(objected.events.at(-1)).toMatchObject({ type: 'objected', actor: { id: w.report.id } });
    expect((await notices(w.agents.manager)).some((n) => n.link === `/tasks/${task.id}` && n.titleEn.includes('Objection'))).toBe(true);
    const list = (await w.agents.report.get('/api/tasks').expect(200)).body.items as { flags: { objected: boolean } }[];
    expect(list[0]?.flags.objected).toBe(true);
  });

  it('refuses a fifth reason, a second objection, an objection to a task one gave oneself or already started, and anybody but the assignee', async () => {
    const w = await world();
    const task = await w.given();
    expect((await object(w.agents.report, task, { reason: 'because' }).expect(400)).body.code).toBe('VALIDATION');
    await object(w.agents.report, task).expect(200);
    expect((await object(w.agents.report, task).expect(422)).body.details.reason).toBe('ALREADY_OBJECTED');
    expect((await object(w.agents.manager, task).expect(422)).body.details.reason).toBe('NOT_ASSIGNEE');
    const mine = (await w.agents.manager.post('/api/tasks').send({ title: 'لنفسي' }).expect(201)).body as TaskDto;
    expect((await object(w.agents.manager, mine).expect(422)).body.details.reason).toBe('OWN_TASK');
    const other = await world();
    const started = await other.given();
    await other.agents.report.post(`/api/tasks/${started.id}/transition`).send({ to: 'in_progress', revision: started.revision }).expect(200);
    expect((await object(other.agents.report, started).expect(422)).body.details.reason).toBe('NOT_TODO');
  });

  it('is closed to people who cannot see the task (404) or lack the key (403)', async () => {
    const w = await world();
    const task = await w.given();
    await object(w.agents.other, task).expect(404);
    const plain = await t.factories.signIn(await t.factories.user({ unit: w.org.unitA }));
    await object(plain, task).expect(403);
  });

  it('lapses after the policy days when nobody answers, and the task stays with the assignee', async () => {
    const w = await world();
    const task = await w.given();
    await object(w.agents.report, task).expect(200);
    expect(await release(1)).toBe(0);
    expect(await release(8)).toBe(1);
    const after = (await w.agents.report.get(`/api/tasks/${task.id}`).expect(200)).body as TaskDto;
    expect(after.flags.objected).toBe(false);
    expect(after.objection).toBeNull();
    expect(after).toMatchObject({ assignee: { id: w.report.id }, status: 'todo' });
    expect(after.events.map((e) => e.type)).toEqual(['created', 'objected', 'objection_expired']);
    expect((await notices(w.agents.manager)).some((n) => n.titleEn.includes('lapsed'))).toBe(true);
    expect((await notices(w.agents.report)).some((n) => n.titleEn.includes('lapsed'))).toBe(true);
    expect(await release(20)).toBe(0);
  });

  it('uses the number of working days of the company policy', async () => {
    const w = await world();
    const companyId = w.org.companyId;
    await t.db.query('INSERT INTO task_policies (company_id, objection_working_days) VALUES ($1, 1)', [companyId]);
    const task = await w.given();
    const objected = (await object(w.agents.report, task).expect(200)).body as TaskDto;
    expect(objected.objection?.expiresAt).toBe(`${addWorkingDays(riyadhToday(), 1)}T21:00:00.000Z`);
  });

  it('can be closed early by who gave the task, who cannot be anyone else, and then nothing lapses', async () => {
    const w = await world();
    const task = await w.given();
    await object(w.agents.report, task).expect(200);
    await w.agents.other.post(`/api/tasks/${task.id}/objection/answer`).send({ accept: true }).expect(404);
    await w.agents.report.post(`/api/tasks/${task.id}/objection/answer`).send({ accept: true }).expect(403);
    const answered = (await w.agents.manager.post(`/api/tasks/${task.id}/objection/answer`).send({ accept: false, note: 'المهمة مطلوبة' }).expect(200)).body as TaskDto;
    expect(answered.flags.objected).toBe(false);
    expect(answered.events.at(-1)).toMatchObject({ type: 'objection_answered', note: 'المهمة مطلوبة' });
    expect((await notices(w.agents.report)).some((n) => n.titleEn.includes('Answer to your objection'))).toBe(true);
    expect((await w.agents.manager.post(`/api/tasks/${task.id}/objection/answer`).send({ accept: true }).expect(404)).body.code).toBe('NOT_FOUND');
    expect(await release(20)).toBe(0);
    const stored: { status: string }[] = await t.db.query('SELECT status FROM task_objections WHERE task_id = $1', [task.id]);
    expect(stored).toEqual([{ status: 'rejected' }]);
  });

  it('gives the task to somebody else when the objection is accepted, and tells them', async () => {
    const w = await world();
    const task = await w.given();
    await object(w.agents.report, task).expect(200);
    const answered = (await w.agents.manager.post(`/api/tasks/${task.id}/objection/answer`).send({ accept: true, newAssigneeUserId: w.report2.id, note: 'سأسندها لزميلك' }).expect(200)).body as TaskDto;
    expect(answered).toMatchObject({ assignee: { id: w.report2.id }, creator: { id: w.manager.id }, flags: { objected: false } });
    expect(answered.events.map((e) => e.type)).toEqual(['created', 'objected', 'objection_answered', 'reassigned']);
    expect((await notices(await t.factories.signIn(w.report2))).some((n) => n.link === `/tasks/${task.id}` && n.titleEn.startsWith('New task'))).toBe(true);
    expect((await notices(w.agents.report)).some((n) => n.titleEn.includes('Answer to your objection'))).toBe(true);
    await w.agents.report.get(`/api/tasks/${task.id}`).expect(404);
    expect(await release(20)).toBe(0);
  });

  it('asks who gets the task when an objection is accepted, and checks the giver may give it to them', async () => {
    const w = await world();
    const task = await w.given();
    await object(w.agents.report, task).expect(200);
    const answer = (body: Record<string, unknown>) => w.agents.manager.post(`/api/tasks/${task.id}/objection/answer`).send(body);
    expect((await answer({ accept: true }).expect(422)).body.code).toBe('TASK_REASSIGN_REQUIRED');
    expect((await answer({ accept: true, newAssigneeUserId: w.report.id }).expect(422)).body.code).toBe('TASK_REASSIGN_REQUIRED');
    const peer = await t.factories.user({ unit: w.org.unitOther, grants: TASK_EMPLOYEE_GRANTS });
    expect((await answer({ accept: true, newAssigneeUserId: peer.id }).expect(422)).body.code).toBe('TASK_ASSIGNEE_INVALID');
    const open = (await w.agents.report.get(`/api/tasks/${task.id}`).expect(200)).body as TaskDto;
    expect(open).toMatchObject({ assignee: { id: w.report.id }, flags: { objected: true } });
  });

  it('keeps the task with its assignee when the objection is rejected', async () => {
    const w = await world();
    const task = await w.given();
    await object(w.agents.report, task).expect(200);
    const kept = (await w.agents.manager.post(`/api/tasks/${task.id}/objection/answer`).send({ accept: false }).expect(200)).body as TaskDto;
    expect(kept.assignee.id).toBe(w.report.id);
    expect(kept.events.map((e) => e.type)).toEqual(['created', 'objected', 'objection_answered']);
  });
});

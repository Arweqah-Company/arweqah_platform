import type { TaskDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { OutboxRelay } from '../src/core/messaging/infrastructure/typeorm-outbox';
import type { TestAgent } from './factories/factories';
import { TASK_EMPLOYEE_GRANTS, taskManagerGrants } from './factories/task-grants';
import { useTestApp } from './setup/test-app';

describe('Tasks: notices (FR-56)', () => {
  const t = useTestApp();

  async function world() {
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: taskManagerGrants('subtree') });
    const report = await t.factories.user({ unit: org.unitA, grants: TASK_EMPLOYEE_GRANTS });
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, report.employeeId]);
    const agents = { manager: await t.factories.signIn(manager), report: await t.factories.signIn(report) };
    return { manager, report, agents };
  }

  const notices = async (agent: TestAgent) => (await agent.get('/api/notifications').expect(200)).body.items as { titleEn: string; bodyEn: string; link: string }[];
  const sentTo = async (email: string) => {
    await t.app.get(OutboxRelay).flush();
    return t.mail.sent.filter((m) => m.to === email);
  };
  const move = (agent: TestAgent, task: Pick<TaskDto, 'id' | 'revision'>, to: string) => agent.post(`/api/tasks/${task.id}/transition`).send({ to, revision: task.revision });

  it('tells the assignee in the app and by e-mail, with the number but never the title in the e-mail', async () => {
    const w = await world();
    const task = (await w.agents.manager.post('/api/tasks').send({ title: 'سري للغاية', assigneeUserId: w.report.id }).expect(201)).body as TaskDto;
    const inApp = (await notices(w.agents.report)).find((n) => n.link === `/tasks/${task.id}`);
    expect(inApp?.titleEn).toBe(`New task ${task.number}`);
    const mails = await sentTo(w.report.email);
    expect(mails).toHaveLength(1);
    expect(`${mails[0]?.subject} ${mails[0]?.text}`).toContain(task.number);
    expect(`${mails[0]?.subject} ${mails[0]?.text}`).not.toContain('سري للغاية');
  });

  it('shows the title in the app for the notices that do not go by e-mail, and sends no e-mail for them', async () => {
    const w = await world();
    const task = (await w.agents.manager.post('/api/tasks').send({ title: 'تقرير الربع', assigneeUserId: w.report.id }).expect(201)).body as TaskDto;
    t.mail.sent.length = 0;
    await move(w.agents.report, task, 'in_progress').expect(200);
    const changed = (await notices(w.agents.manager)).find((n) => n.titleEn.includes('changed status'));
    expect(changed?.bodyEn).toContain('تقرير الربع');
    expect(changed?.bodyEn).toContain('In progress');
    expect(await sentTo(w.manager.email)).toHaveLength(0);
  });

  it('sends an e-mail for an objection, a review request and a send-back, and for nothing else of a task\'s life', async () => {
    const w = await world();
    const task = (await w.agents.manager.post('/api/tasks').send({ title: 'مراجعة', assigneeUserId: w.report.id, needsReview: true }).expect(201)).body as TaskDto;
    t.mail.sent.length = 0;
    await w.agents.report.post(`/api/tasks/${task.id}/objection`).send({ reason: 'missing_information' }).expect(200);
    expect(await sentTo(w.manager.email)).toHaveLength(1);
    await w.agents.manager.post(`/api/tasks/${task.id}/objection/answer`).send({ accept: false }).expect(200);
    const current = (await w.agents.report.get(`/api/tasks/${task.id}`).expect(200)).body as TaskDto;
    const started = (await move(w.agents.report, current, 'in_progress').expect(200)).body as TaskDto;
    const waiting = (await move(w.agents.report, started, 'done').expect(200)).body as TaskDto;
    expect(waiting.status).toBe('awaiting_review');
    expect((await sentTo(w.manager.email)).map((m) => m.subject).length).toBe(2);
    await w.agents.manager.post(`/api/tasks/${task.id}/transition`).send({ to: 'in_progress', revision: waiting.revision, note: 'أعد' }).expect(200);
    expect((await sentTo(w.report.email)).filter((m) => m.subject.includes('أُعيدت'))).toHaveLength(1);
    t.mail.sent.length = 0;
    const back = (await w.agents.report.get(`/api/tasks/${task.id}`).expect(200)).body as TaskDto;
    await move(w.agents.report, back, 'done').expect(200);
    expect((await sentTo(w.manager.email)).length).toBe(1);
  });

  it('never tells people about their own change, and each person sees only their own notices', async () => {
    const w = await world();
    const own = (await w.agents.report.post('/api/tasks').send({ title: 'لنفسي' }).expect(201)).body as TaskDto;
    expect((await notices(w.agents.report)).filter((n) => n.link === `/tasks/${own.id}`)).toHaveLength(0);
    await w.agents.manager.post(`/api/tasks/${own.id}/approve`).send({ revision: own.revision }).expect(200);
    expect((await notices(w.agents.manager)).filter((n) => n.titleEn.includes('was approved'))).toHaveLength(0);
    expect((await notices(w.agents.report)).filter((n) => n.titleEn.includes('was approved'))).toHaveLength(1);
  });

  it('gives each status change its own notice to whoever gave the task', async () => {
    const w = await world();
    const task = (await w.agents.manager.post('/api/tasks').send({ title: 'مهمة', assigneeUserId: w.report.id }).expect(201)).body as TaskDto;
    const started = (await move(w.agents.report, task, 'in_progress').expect(200)).body as TaskDto;
    const done = (await move(w.agents.report, started, 'done').expect(200)).body as TaskDto;
    await w.agents.manager.post(`/api/tasks/${task.id}/transition`).send({ to: 'in_progress', revision: done.revision }).expect(200);
    const kinds = (await notices(w.agents.manager)).filter((n) => n.link === `/tasks/${task.id}`).map((n) => n.titleEn.replace(task.number, 'N'));
    expect(kinds.sort()).toEqual(['N changed status', 'N is finished']);
  });
});

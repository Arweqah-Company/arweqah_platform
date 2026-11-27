import { CorePermission, riyadhHour, riyadhToday, type TaskDto, type TaskNoticeSettings } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { OutboxRelay } from '../src/core/messaging/infrastructure/typeorm-outbox';
import { TaskDigestService } from '../src/modules/tasks/application/services/task-digest.service';
import { TaskReminderService } from '../src/modules/tasks/application/services/task-reminder.service';
import type { TestAgent } from './factories/factories';
import { TASK_EMPLOYEE_GRANTS, taskManagerGrants } from './factories/task-grants';
import { useTestApp } from './setup/test-app';

const DAY = 86_400_000;
const daysFromNow = (n: number) => riyadhToday(new Date(Date.now() + n * DAY));
const SETTINGS = { channel: 'in_app', digestEnabled: true, digestHour: 8, remindersEnabled: true } as const;
const NOTICE_KEY = { key: CorePermission.TasksNoticeSettings, scope: 'all' } as const;
/** Today at 09:00 in Riyadh (06:00 UTC), and at 06:00 (03:00 UTC): after and before the default summary hour. */
const AT_NINE = () => new Date(`${riyadhToday()}T06:00:00Z`);
const AT_SIX = () => new Date(`${riyadhToday()}T03:00:00Z`);

describe('Tasks: summary and reminders by notice and e-mail (FR-215…FR-218)', () => {
  const t = useTestApp();

  async function world() {
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: [...taskManagerGrants('subtree'), NOTICE_KEY] });
    const report = await t.factories.user({ unit: org.unitA, grants: [...TASK_EMPLOYEE_GRANTS, NOTICE_KEY] });
    const follower = await t.factories.user({ unit: org.unitA, grants: TASK_EMPLOYEE_GRANTS });
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, report.employeeId]);
    const agents = { manager: await t.factories.signIn(manager), report: await t.factories.signIn(report), follower: await t.factories.signIn(follower) };
    const given = async (dueDate: string, title = 'مهمة سرية'): Promise<TaskDto> => (await agents.manager.post('/api/tasks').send({ title, assigneeUserId: report.id, dueDate }).expect(201)).body;
    return { org, manager, report, follower, agents, given };
  }

  const notices = async (agent: TestAgent) => (await agent.get('/api/notifications').expect(200)).body.items as { link: string; titleEn: string; bodyEn: string }[];
  const about = async (agent: TestAgent, task: TaskDto, text: string) => (await notices(agent)).filter((n) => n.link === `/tasks/${task.id}` && n.titleEn.includes(text));
  const mailsTo = async (email: string) => {
    await t.app.get(OutboxRelay).flush();
    return t.mail.sent.filter((m) => m.to === email);
  };
  /** The mails of earlier steps (a task given to someone is e-mailed) go out first, so a count starts from nothing. */
  const quietMailBox = async () => {
    await t.app.get(OutboxRelay).flush();
    t.mail.sent.length = 0;
  };
  const save = (agent: TestAgent, body: Partial<TaskNoticeSettings>) => agent.put('/api/task-notice-settings').send({ ...SETTINGS, ...body });
  const overdue = (task: TaskDto, days = 2) => t.db.query(`UPDATE tasks SET due_date = (now() - interval '${days} days')::date WHERE id = $1`, [task.id]);

  describe('The settings (FR-218)', () => {
    it('answers the defaults first, then what was saved, and keeps one row per person', async () => {
      const w = await world();
      expect((await w.agents.report.get('/api/task-notice-settings').expect(200)).body).toEqual(SETTINGS);
      const saved = { channel: 'both', digestEnabled: true, digestHour: 14, remindersEnabled: false } as const;
      expect((await save(w.agents.report, saved).expect(200)).body).toEqual(saved);
      expect((await w.agents.report.get('/api/task-notice-settings').expect(200)).body).toEqual(saved);
      await save(w.agents.report, { channel: 'email' }).expect(200);
      expect(await t.db.query('SELECT channel FROM task_notice_preferences WHERE user_id = $1', [w.report.id])).toEqual([{ channel: 'email' }]);
      expect((await w.agents.manager.get('/api/task-notice-settings').expect(200)).body).toEqual(SETTINGS);
    });

    it('refuses a channel, an hour or a field that does not exist, and a person without the key', async () => {
      const w = await world();
      await save(w.agents.report, { channel: 'sms' as never }).expect(400);
      await save(w.agents.report, { digestHour: 24 }).expect(400);
      await save(w.agents.report, { digestHour: 7.5 }).expect(400);
      await w.agents.report.put('/api/task-notice-settings').send({ ...SETTINGS, extra: 1 }).expect(400);
      const bare = await t.factories.signIn(await t.factories.user({ unit: w.org.unitA, bare: true }));
      await bare.get('/api/task-notice-settings').expect(403);
      await save(bare, {}).expect(403);
    });

    it('records the change in the audit trail with the chosen values only', async () => {
      const w = await world();
      await save(w.agents.report, { digestHour: 10 }).expect(200);
      await vi.waitFor(async () => {
        const rows: { changes: Record<string, unknown> }[] = await t.db.query(`SELECT changes FROM audit_logs WHERE action = 'task.notice_settings_updated' AND entity_id = $1`, [w.report.id]);
        expect(rows[0]?.changes).toEqual({ ...SETTINGS, digestHour: 10 });
      });
    });
  });

  describe('The daily summary (FR-215)', () => {
    it('sends the open, due-today and overdue counts at the chosen hour, once a day', async () => {
      const w = await world();
      await w.given(daysFromNow(5));
      await w.given(riyadhToday());
      const late = await w.given(daysFromNow(3));
      await overdue(late);
      const digests = t.app.get(TaskDigestService);
      expect(await digests.sendDue(AT_SIX())).toBe(0);
      expect(await digests.sendDue(AT_NINE())).toBeGreaterThanOrEqual(1);
      const summary = (await notices(w.agents.report)).filter((n) => n.titleEn === 'Your tasks today');
      expect(summary).toHaveLength(1);
      expect(summary[0]?.bodyEn).toBe('You have 3 open tasks: 1 due today and 1 overdue.');
      expect(summary[0]?.link).toBe('/tasks');
      await digests.sendDue(AT_NINE());
      expect((await notices(w.agents.report)).filter((n) => n.titleEn === 'Your tasks today')).toHaveLength(1);
    });

    it('sends nothing to a person with no open task, with the summary off, or before their hour; and honours a later hour', async () => {
      const w = await world();
      const digests = t.app.get(TaskDigestService);
      await w.given(daysFromNow(5));
      await save(w.agents.report, { digestEnabled: false }).expect(200);
      await digests.sendDue(AT_NINE());
      expect((await notices(w.agents.report)).filter((n) => n.titleEn === 'Your tasks today')).toHaveLength(0);
      await save(w.agents.report, { digestEnabled: true, digestHour: 22 }).expect(200);
      await digests.sendDue(AT_NINE());
      expect((await notices(w.agents.report)).filter((n) => n.titleEn === 'Your tasks today')).toHaveLength(0);
      await digests.sendDue(new Date(`${riyadhToday()}T19:00:00Z`));
      expect((await notices(w.agents.report)).filter((n) => n.titleEn === 'Your tasks today')).toHaveLength(1);
      expect((await notices(w.agents.follower)).filter((n) => n.titleEn === 'Your tasks today')).toHaveLength(0);
    });

    it('does not send a summary at once when the saved hour has already passed today', async () => {
      const w = await world();
      await w.given(daysFromNow(5));
      await save(w.agents.report, { digestHour: riyadhHour() }).expect(200);
      await t.app.get(TaskDigestService).sendDue(new Date(`${riyadhToday()}T20:59:00Z`));
      expect((await notices(w.agents.report)).filter((n) => n.titleEn === 'Your tasks today')).toHaveLength(0);
    });

    it('goes by e-mail only (no notice in the app) or both, by the channel chosen, and the e-mail never carries a title', async () => {
      const w = await world();
      await w.given(daysFromNow(5), 'عنوان سري');
      await save(w.agents.report, { channel: 'email' }).expect(200);
      await quietMailBox();
      await t.app.get(TaskDigestService).sendDue(AT_NINE());
      expect((await notices(w.agents.report)).filter((n) => n.titleEn === 'Your tasks today')).toHaveLength(0);
      const mails = await mailsTo(w.report.email);
      expect(mails).toHaveLength(1);
      expect(`${mails[0]?.subject} ${mails[0]?.text}`).toContain('عندك 1 مهمة مفتوحة');
      expect(`${mails[0]?.subject} ${mails[0]?.text}`).not.toContain('عنوان سري');
    });

    it('sends the notice and the e-mail when the channel is both', async () => {
      const w = await world();
      await w.given(daysFromNow(5));
      await save(w.agents.report, { channel: 'both' }).expect(200);
      await quietMailBox();
      await t.app.get(TaskDigestService).sendDue(AT_NINE());
      expect((await notices(w.agents.report)).filter((n) => n.titleEn === 'Your tasks today')).toHaveLength(1);
      expect(await mailsTo(w.report.email)).toHaveLength(1);
    });
  });

  describe('Reminders and the late alert for the tasks related to a person (FR-216, FR-217)', () => {
    it('reminds the assignee, the followers and the assignee’s manager once before the due date', async () => {
      const w = await world();
      const task = await w.given(daysFromNow(1));
      await t.db.query('INSERT INTO task_followers (task_id, user_id) VALUES ($1, $2)', [task.id, w.follower.id]);
      const reminders = t.app.get(TaskReminderService);
      expect(await reminders.remind(riyadhToday())).toBe(1);
      for (const agent of [w.agents.report, w.agents.follower, w.agents.manager]) expect(await about(agent, task, 'due soon')).toHaveLength(1);
      expect(await reminders.remind(riyadhToday())).toBe(0);
      expect(await about(w.agents.report, task, 'due soon')).toHaveLength(1);
    });

    it('does not tell the manager about a personal task', async () => {
      const w = await world();
      const own = (await w.agents.report.post('/api/tasks').send({ title: 'شخصية', personal: true, dueDate: daysFromNow(1) }).expect(201)).body as TaskDto;
      await t.app.get(TaskReminderService).remind(riyadhToday());
      expect(await about(w.agents.report, own, 'due soon')).toHaveLength(1);
      expect(await about(w.agents.manager, own, 'due soon')).toHaveLength(0);
    });

    it('reminds once more on the day itself, and not for a task due later', async () => {
      const w = await world();
      const today = await w.given(riyadhToday());
      const later = await w.given(daysFromNow(6));
      const reminders = t.app.get(TaskReminderService);
      expect(await reminders.remind(riyadhToday())).toBe(0);
      expect(await reminders.remindDueToday(riyadhToday())).toBe(1);
      expect(await reminders.remindDueToday(riyadhToday())).toBe(0);
      for (const agent of [w.agents.report, w.agents.manager]) expect(await about(agent, today, 'is due today')).toHaveLength(1);
      expect(await about(w.agents.report, later, 'is due today')).toHaveLength(0);
    });

    it('tells it again for a new due date', async () => {
      const w = await world();
      const task = await w.given(riyadhToday());
      await t.app.get(TaskReminderService).remindDueToday(riyadhToday());
      await w.agents.manager.patch(`/api/tasks/${task.id}`).send({ dueDate: daysFromNow(3), revision: task.revision }).expect(200);
      expect((await t.db.query('SELECT due_day_notified_at FROM tasks WHERE id = $1', [task.id]))[0]).toEqual({ due_day_notified_at: null });
    });

    it('raises the late alert for the assignee, who gave the task, its followers and the manager, once', async () => {
      const w = await world();
      const task = await w.given(daysFromNow(4));
      await t.db.query('INSERT INTO task_followers (task_id, user_id) VALUES ($1, $2)', [task.id, w.follower.id]);
      await overdue(task);
      const reminders = t.app.get(TaskReminderService);
      expect(await reminders.notifyOverdue(riyadhToday())).toBe(1);
      for (const agent of [w.agents.report, w.agents.follower, w.agents.manager]) expect(await about(agent, task, 'is overdue')).toHaveLength(1);
      expect(await reminders.notifyOverdue(riyadhToday())).toBe(0);
    });

    it('leaves out a person who switched the reminders off, but not the others', async () => {
      const w = await world();
      const task = await w.given(riyadhToday());
      await save(w.agents.report, { remindersEnabled: false }).expect(200);
      await t.app.get(TaskReminderService).remindDueToday(riyadhToday());
      expect(await about(w.agents.report, task, 'is due today')).toHaveLength(0);
      expect(await about(w.agents.manager, task, 'is due today')).toHaveLength(1);
    });

    it('sends the reminder by the channel each person chose, with the number and never the title in the e-mail', async () => {
      const w = await world();
      const task = await w.given(riyadhToday(), 'عنوان لا يخرج');
      await save(w.agents.report, { channel: 'email' }).expect(200);
      await quietMailBox();
      await t.app.get(TaskReminderService).remindDueToday(riyadhToday());
      expect(await about(w.agents.report, task, 'is due today')).toHaveLength(0);
      const mails = await mailsTo(w.report.email);
      expect(mails).toHaveLength(1);
      expect(`${mails[0]?.subject} ${mails[0]?.text}`).toContain(task.number);
      expect(`${mails[0]?.subject} ${mails[0]?.text}`).not.toContain('عنوان لا يخرج');
      expect(await about(w.agents.manager, task, 'is due today')).toHaveLength(1);
      expect(await mailsTo(w.manager.email)).toHaveLength(0);
    });
  });
});

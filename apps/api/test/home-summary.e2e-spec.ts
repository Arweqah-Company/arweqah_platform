import { riyadhToday, type TaskDto, type TaskSummaryDto, type TicketSummaryDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import type { TestAgent } from './factories/factories';
import { TASK_EMPLOYEE_GRANTS, taskManagerGrants } from './factories/task-grants';
import { useTestApp } from './setup/test-app';

const DAY = 86_400_000;
const inDays = (n: number) => riyadhToday(new Date(Date.now() + n * DAY));

describe('Home page: my numbers, my current tasks and my tickets (FR-57)', () => {
  const t = useTestApp();

  async function world() {
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: taskManagerGrants('subtree') });
    const report = await t.factories.user({ unit: org.unitA, grants: TASK_EMPLOYEE_GRANTS });
    const stranger = await t.factories.user({ unit: org.unitC, grants: TASK_EMPLOYEE_GRANTS });
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, report.employeeId]);
    const agents = { manager: await t.factories.signIn(manager), report: await t.factories.signIn(report), stranger: await t.factories.signIn(stranger) };
    const given = async (body: Record<string, unknown> = {}): Promise<TaskDto> => (await agents.manager.post('/api/tasks').send({ title: 'مهمة', assigneeUserId: report.id, dueDate: inDays(20), ...body }).expect(201)).body;
    return { org, manager, report, stranger, agents, given };
  }

  const finish = async (agent: TestAgent, task: TaskDto): Promise<TaskDto> => {
    const started = (await agent.post(`/api/tasks/${task.id}/transition`).send({ to: 'in_progress', revision: task.revision }).expect(200)).body as TaskDto;
    return (await agent.post(`/api/tasks/${task.id}/transition`).send({ to: 'done', revision: started.revision }).expect(200)).body;
  };
  const summary = async (agent: TestAgent): Promise<TaskSummaryDto> => (await agent.get('/api/tasks/summary').expect(200)).body;

  /** open: a (todo, soon), b (todo, overdue), e (awaiting review), f (waiting for approval); done: c on time, d late. */
  async function busyReport() {
    const w = await world();
    const a = await w.given({ dueDate: inDays(3) });
    const b = await w.given({ dueDate: inDays(0) });
    await t.db.query(`UPDATE tasks SET due_date = (now() - interval '2 days')::date WHERE id = $1`, [b.id]);
    const c = await finish(w.agents.report, await w.given({ dueDate: inDays(1) }));
    const d = await w.given({ dueDate: inDays(1) });
    await t.db.query(`UPDATE tasks SET due_date = (now() - interval '1 day')::date WHERE id = $1`, [d.id]);
    await finish(w.agents.report, { ...d, revision: d.revision });
    const e = await w.given({ needsReview: true });
    const started = (await w.agents.report.post(`/api/tasks/${e.id}/transition`).send({ to: 'in_progress', revision: e.revision }).expect(200)).body as TaskDto;
    await w.agents.report.post(`/api/tasks/${e.id}/transition`).send({ to: 'done', revision: started.revision }).expect(200);
    const f = (await w.agents.report.post('/api/tasks').send({ title: 'لنفسي', dueDate: inDays(20) }).expect(201)).body as TaskDto;
    return { ...w, a, b, c, d, e, f };
  }

  describe('Tasks', () => {
    it('counts my open, overdue and soon-due tasks, what I finished lately and how much of it on time', async () => {
      const w = await busyReport();
      const s = await summary(w.agents.report);
      expect(s).toMatchObject({ open: 4, overdue: 1, dueSoon: 1, doneRecently: 2, onTimeRate: 50, awaitingMyReview: 0, awaitingMyApproval: 0 });
      expect(s.byStatus).toEqual({ todo: 2, awaiting_review: 1, pending_approval: 1 });
      expect(s.team).toBeNull();
    });

    it('lists the first open tasks by due date', async () => {
      const w = await busyReport();
      const s = await summary(w.agents.report);
      expect(s.current.map((x) => x.id)).toEqual([w.b.id, w.a.id, ...s.current.slice(2).map((x) => x.id)]);
      expect(s.current).toHaveLength(4);
      expect(s.current[0]?.flags.overdue).toBe(true);
    });

    it('counts what waits for me as reviewer and as approver', async () => {
      const w = await busyReport();
      expect(await summary(w.agents.manager)).toMatchObject({ awaitingMyReview: 1, awaitingMyApproval: 1, open: 0, onTimeRate: null });
    });

    it('gives a manager the numbers of the team: overdue, stale and finished this week', async () => {
      const w = await busyReport();
      await t.db.query(`UPDATE tasks SET last_activity_at = now() - interval '40 days' WHERE id = $1`, [w.a.id]);
      const s = await summary(w.agents.manager);
      expect(s.team).toEqual({ overdue: 1, stale: 1, doneThisWeek: 2 });
    });

    it('limits the list to five and shows nothing of other people\'s tasks', async () => {
      const w = await world();
      for (let i = 0; i < 7; i += 1) await w.given({ title: `م${i}` });
      expect((await summary(w.agents.report)).current).toHaveLength(5);
      expect(await summary(w.agents.stranger)).toMatchObject({ open: 0, current: [], team: null });
    });

    it('is closed without the tasks key and answers only for the caller', async () => {
      const w = await world();
      const plain = await t.factories.signIn(await t.factories.user({ unit: w.org.unitA, without: ['tasks.'] }));
      await plain.get('/api/tasks/summary').expect(403);
      await w.given();
      const asked = (await w.agents.stranger.get(`/api/tasks/summary?userId=${w.report.id}`).expect(200)).body as TaskSummaryDto;
      expect(asked.open).toBe(0);
    });
  });

  describe('Tickets', () => {
    /** A desk with one type; tickets are written straight into the tables, as the ticket module's own tests do for reading. */
    async function desk(w: Awaited<ReturnType<typeof world>>) {
      await t.db.query(`INSERT INTO ticket_desks (org_node_id, reception_status) VALUES ($1, 'active')`, [w.org.department]);
      await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [w.manager.employeeId, w.org.department]);
      const type: { id: string }[] = await t.db.query(`INSERT INTO ticket_types (desk_id, name_ar, name_en) VALUES ($1, 'نوع', 'Type') RETURNING id`, [w.org.department]);
      return type[0]?.id as string;
    }
    const ticket = async (typeId: string, w: Awaited<ReturnType<typeof world>>, over: { sender: string; assignee: string | null; status?: string; personal?: boolean; title?: string; eventBy?: string }) => {
      const rows: { id: string }[] = await t.db.query(
        `INSERT INTO tickets (sender_user_id, desk_id, type_id, title, needed_by, assignee_user_id, status, is_personal) VALUES ($1, $2, $3, $4, '2030-01-01', $5, $6, $7) RETURNING id`,
        [over.sender, w.org.department, typeId, over.title ?? 'طلب', over.assignee, over.status ?? 'open', over.personal ?? false],
      );
      await t.db.query(`INSERT INTO ticket_events (ticket_id, type, actor_user_id, body) VALUES ($1, 'created', $2, 'نص')`, [rows[0]?.id, over.eventBy ?? over.sender]);
      return rows[0]?.id as string;
    };
    const tickets = async (agent: TestAgent): Promise<TicketSummaryDto> => (await agent.get('/api/tickets/mine-summary').expect(200)).body;

    it('counts what I sent that is still open, what waits for my confirmation, and what waits for my reply', async () => {
      const w = await world();
      const typeId = await desk(w);
      await ticket(typeId, w, { sender: w.report.id, assignee: w.manager.id, title: 'مفتوحة' });
      await ticket(typeId, w, { sender: w.report.id, assignee: w.manager.id, status: 'close_requested', title: 'تنتظر تأكيدي' });
      await ticket(typeId, w, { sender: w.report.id, assignee: w.manager.id, status: 'closed' });
      await ticket(typeId, w, { sender: w.stranger.id, assignee: w.report.id, title: 'تنتظر ردي' });
      const s = await tickets(w.agents.report);
      expect(s).toMatchObject({ sentOpen: 2, awaitingMyConfirmation: 1, awaitingMyReply: 1 });
      expect(s.sent.map((x) => x.title)).toEqual(['تنتظر تأكيدي', 'مفتوحة']);
      expect(s.waiting.map((x) => x.title)).toEqual(['تنتظر ردي']);
      expect(s.sent[0]).toMatchObject({ deskNameEn: 'Department', status: 'close_requested' });
    });

    it('stops waiting for my reply once the last word is mine', async () => {
      const w = await world();
      const typeId = await desk(w);
      const id = await ticket(typeId, w, { sender: w.stranger.id, assignee: w.report.id });
      expect((await tickets(w.agents.report)).awaitingMyReply).toBe(1);
      await t.db.query(`INSERT INTO ticket_events (ticket_id, type, actor_user_id, body) VALUES ($1, 'reply', $2, 'رد')`, [id, w.report.id]);
      expect((await tickets(w.agents.report)).awaitingMyReply).toBe(0);
    });

    it('gives a desk manager the tickets nobody is assigned to, but never somebody else\'s personal ticket', async () => {
      const w = await world();
      const typeId = await desk(w);
      await ticket(typeId, w, { sender: w.report.id, assignee: null, title: 'بلا مسؤول' });
      await ticket(typeId, w, { sender: w.report.id, assignee: null, personal: true, title: 'شخصية بلا مسؤول' });
      const s = await tickets(w.agents.manager);
      expect(s.waiting.map((x) => x.title)).toEqual(['بلا مسؤول']);
      expect(s.awaitingMyReply).toBe(1);
    });

    it('shows a personal ticket to its sender and its assignee only', async () => {
      const w = await world();
      const typeId = await desk(w);
      await ticket(typeId, w, { sender: w.report.id, assignee: w.stranger.id, personal: true, title: 'سرّية' });
      expect((await tickets(w.agents.report)).sent.map((x) => x.title)).toEqual(['سرّية']);
      expect((await tickets(w.agents.stranger)).waiting.map((x) => x.title)).toEqual(['سرّية']);
      const manager = await tickets(w.agents.manager);
      expect(manager).toMatchObject({ sentOpen: 0, awaitingMyReply: 0, waiting: [], sent: [] });
    });

    it('is closed to a person without the tickets key', async () => {
      const w = await world();
      const bare = await t.factories.signIn(await t.factories.user({ unit: w.org.unitA, bare: true }));
      await bare.get('/api/tickets/mine-summary').expect(403);
    });
  });
});

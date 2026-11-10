import { CorePermission, type CycleStateDto, type PermissionGrant, type ReminderDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { nextFiscalYear } from '../src/modules/performance/domain/rules/cycle-dates.rules';
import { FULL_EVAL_FILE } from './helpers/eval-file';
import { chainScenario } from './helpers/title-chain';
import { useTestApp } from './setup/test-app';

const grants = (keys: string[]): PermissionGrant[] => keys.map((key) => ({ key, scope: 'all' as const }));
const HR = [CorePermission.PerformanceCycleView, CorePermission.PerformanceTemplateUpload, CorePermission.PerformanceCycleManage, CorePermission.PerformanceCycleClose, CorePermission.PerformanceCatalogManage, CorePermission.PerformanceRemindersManage];
const REMINDER = { kind: 'self', on: true, days: [7, 3, 1], titleAr: 'تذكير بالتقييم الذاتي', titleEn: 'Self-evaluation reminder', bodyAr: 'أرسل تقييمك الذاتي قبل آخر موعد.', bodyEn: 'Send your self-evaluation before the deadline.' };
const NOTICE = 'تغيّر موعد في دورة تقييم الأداء';

describe('The dates, the reminders and the caps of the evaluation cycle page (FR-118, FR-124)', () => {
  const t = useTestApp();
  const hr = async (keys: string[] = HR) => t.factories.signIn(await t.factories.user({ grants: grants(keys) }));
  const withFile = async () => {
    const agent = await hr();
    await agent.post('/api/performance/templates/file').send({ text: FULL_EVAL_FILE, dryRun: false }).expect(200);
    return agent;
  };
  const state = async (agent: Awaited<ReturnType<typeof hr>>) => (await agent.get('/api/performance/cycle').expect(200)).body as CycleStateDto;
  const year = nextFiscalYear(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }));

  /** HR with the evaluation file, an employee and their direct manager. */
  async function teamSetup() {
    const s = await chainScenario(t);
    const agent = await withFile();
    const manager = await t.factories.user();
    const holder = await s.person(s.rep, s.group);
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, holder.employeeId]);
    return { agent, me: await t.factories.signIn(holder), boss: await t.factories.signIn(manager) };
  }

  it('gives all eleven usual dates before any cycle exists, with the fiscal year the next cycle belongs to', async () => {
    const s = await state(await hr());
    expect(s).toMatchObject({ cycle: null, datesFor: 'next', nextFiscalYear: year });
    expect(s.dates.map((d) => d.key)).toEqual(['final', 'calibration', 'approval', 'notification', 'objection', 'self_deadline', 'qualitative_close', 'review_jan', 'pulse_mar', 'review_jul', 'pulse_sep']);
    expect(s.dates.find((d) => d.key === 'calibration')).toEqual({ key: 'calibration', from: `${year + 1}-04-21`, to: `${year + 1}-04-24` });
    expect(s.dates.find((d) => d.key === 'self_deadline')).toEqual({ key: 'self_deadline', from: `${year + 1}-03-10`, to: null });
  });

  it('lets HR prepare a date before the cycle opens, refuses one that does not fit the others, and hands the dates to the cycle that opens for that year', async () => {
    const agent = await withFile();
    const set = (key: string, body: object) => agent.put(`/api/performance/cycle/dates/${key}`).send(body);
    const approved = (await set('approval', { from: `${year + 1}-04-28` }).expect(200)).body as CycleStateDto;
    expect(approved.datesFor).toBe('next');
    expect(approved.dates.find((d) => d.key === 'approval')!.from).toBe(`${year + 1}-04-28`);
    const bad = await set('calibration', { from: `${year + 1}-04-10`, to: `${year + 1}-04-24` }).expect(422);
    expect(bad.body).toMatchObject({ code: 'CYCLE_DATE_INVALID' });
    expect(bad.body.details.problems).toContain('before_previous');
    await set('approval', { from: `${year + 1}-04-20` }).expect(422); // starts before the calibration meetings end
    const opened = (await agent.post('/api/performance/cycle/open').send({ fiscalYear: year }).expect(200)).body as CycleStateDto;
    expect(opened.datesFor).toBe('cycle');
    expect(opened.dates.find((d) => d.key === 'approval')!.from).toBe(`${year + 1}-04-28`);
    expect(((await t.db.query('SELECT dates FROM performance_cycles')) as { dates: unknown[] }[])[0]!.dates).toHaveLength(11);
  });

  it('does not give the prepared dates of one year to a cycle of another year; after the cycle closes the page shows the next cycle\'s dates', async () => {
    const agent = await withFile();
    await agent.put('/api/performance/cycle/dates/approval').send({ from: `${year + 1}-04-28` }).expect(200);
    const other = (await agent.post('/api/performance/cycle/open').send({ fiscalYear: year + 1 }).expect(200)).body as CycleStateDto;
    expect(other.dates.find((d) => d.key === 'approval')).toEqual({ key: 'approval', from: `${year + 2}-04-27`, to: null });
    const closed = (await agent.post('/api/performance/cycle/close').expect(200)).body as CycleStateDto;
    expect(closed).toMatchObject({ datesFor: 'next', nextFiscalYear: year });
    expect(closed.dates.find((d) => d.key === 'approval')!.from).toBe(`${year + 1}-04-28`);
  });

  it('keeps the dates of a cycle that was opened before dates had defaults: the missing ones are the usual ones', async () => {
    const agent = await withFile();
    await agent.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(200);
    await t.db.query(`UPDATE performance_cycles SET dates = '[{"key":"final","from":"2027-04-16","to":null}]'::jsonb`);
    const s = await state(agent);
    expect(s.dates.find((d) => d.key === 'final')).toEqual({ key: 'final', from: '2027-04-16', to: null });
    expect(s.dates.find((d) => d.key === 'objection')).toEqual({ key: 'objection', from: '2027-05-03', to: '2027-05-07' });
  });

  it('tells everyone the cycle evaluates and their managers when a date of the running cycle changes, and nobody when it is only prepared', async () => {
    const { agent, me, boss } = await teamSetup();
    const notices = async (who: typeof me) => ((await who.get('/api/notifications').expect(200)).body.items as { titleAr: string; bodyAr: string }[]).filter((n) => n.titleAr === NOTICE);
    await agent.put('/api/performance/cycle/dates/self_deadline').send({ from: `${year + 1}-03-12` }).expect(200);
    expect(await notices(me)).toHaveLength(0);
    await agent.post('/api/performance/cycle/open').send({ fiscalYear: year }).expect(200);
    await agent.put('/api/performance/cycle/dates/self_deadline').send({ from: `${year + 1}-03-11` }).expect(200);
    await vi.waitFor(async () => expect(await notices(me)).toHaveLength(1));
    await vi.waitFor(async () => expect(await notices(boss)).toHaveLength(1));
    expect((await notices(me))[0]!.bodyAr).toContain(`${year + 1}-03-11`);
    const outsider = await t.factories.signIn(await t.factories.user());
    expect(await notices(outsider)).toHaveLength(0);
  });

  it('starts with no reminder in the test database (the migration seeds the four of the concept) and keeps the list HR adds to, oldest first', async () => {
    const agent = await hr();
    expect((await state(agent)).reminders).toEqual([]);
    const first = (await agent.post('/api/performance/cycle/reminders').send(REMINDER).expect(201)).body as ReminderDto;
    const second = (await agent.post('/api/performance/cycle/reminders').send({ ...REMINDER, titleAr: 'تذكير ثانٍ للموظف', days: [2] }).expect(201)).body as ReminderDto;
    expect(first).toMatchObject({ kind: 'self', on: true, days: [7, 3, 1], titleAr: 'تذكير بالتقييم الذاتي', titleEn: 'Self-evaluation reminder' });
    expect(first.id).toEqual(expect.any(String));
    expect((await state(agent)).reminders.map((r) => r.id)).toEqual([first.id, second.id]); // two of the same kind
  });

  it('changes a reminder (its words, its days, on or off), the days of the employee\'s kind each once and the farthest first, and removes it', async () => {
    const agent = await hr();
    const made = (await agent.post('/api/performance/cycle/reminders').send(REMINDER).expect(201)).body as ReminderDto;
    const changed = (await agent.put(`/api/performance/cycle/reminders/${made.id}`).send({ ...REMINDER, on: false, days: [1, 7, 3, 7], titleAr: 'عنوان معدّل', bodyEn: '' }).expect(200)).body as ReminderDto;
    expect(changed).toEqual({ id: made.id, kind: 'self', on: false, days: [7, 3, 1], titleAr: 'عنوان معدّل', titleEn: 'Self-evaluation reminder', bodyAr: 'أرسل تقييمك الذاتي قبل آخر موعد.', bodyEn: '' });
    expect((await state(agent)).reminders).toEqual([changed]);
    await agent.put(`/api/performance/cycle/reminders/${made.id}`).send({ ...REMINDER, kind: 'mgr', days: [3] }).expect(200);
    await agent.delete(`/api/performance/cycle/reminders/${made.id}`).expect(204);
    expect((await state(agent)).reminders).toEqual([]);
    await agent.delete(`/api/performance/cycle/reminders/${made.id}`).expect(404);
    await agent.put(`/api/performance/cycle/reminders/${made.id}`).send(REMINDER).expect(404);
    await agent.delete('/api/performance/cycle/reminders/not-a-uuid').expect(400);
  });

  it('validates a reminder: days 1 to 30 (one to ten of them) for the employee, exactly one day 1 to 14 for the others, whole numbers, words of three characters, no unknown fields', async () => {
    const agent = await hr();
    const post = (body: object) => agent.post('/api/performance/cycle/reminders').send(body);
    await post({ ...REMINDER, days: [] }).expect(400);
    await post({ ...REMINDER, days: [31] }).expect(400);
    await post({ ...REMINDER, days: [0] }).expect(400);
    await post({ ...REMINDER, days: [2.5] }).expect(400);
    await post({ ...REMINDER, days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }).expect(400);
    await post({ ...REMINDER, kind: 'mgr', days: [15] }).expect(400);
    await post({ ...REMINDER, kind: 'mgr', days: [2, 3] }).expect(400);
    await post({ ...REMINDER, kind: 'mile', days: [0] }).expect(400);
    await post({ ...REMINDER, kind: 'appr', days: [1.5] }).expect(400);
    await post({ ...REMINDER, kind: 'other' }).expect(400);
    await post({ ...REMINDER, titleAr: 'ab' }).expect(400);
    await post({ ...REMINDER, bodyAr: '  ' }).expect(400);
    await post({ ...REMINDER, titleAr: 'ع'.repeat(121) }).expect(400);
    await post({ ...REMINDER, bodyEn: 'x'.repeat(601) }).expect(400);
    await post({ ...REMINDER, extra: 1 }).expect(400);
    const withoutKind: Record<string, unknown> = { ...REMINDER };
    delete withoutKind.kind;
    await post(withoutKind).expect(400);
    await post({ ...REMINDER, days: [30] }).expect(201);
    await post({ ...REMINDER, kind: 'appr', days: [14], titleEn: '', bodyEn: '' }).expect(201);
  });

  it('keeps at most thirty reminders (422 REMINDER_LIMIT); removing one makes room', async () => {
    const agent = await hr();
    for (let i = 0; i < 30; i++) await agent.post('/api/performance/cycle/reminders').send({ ...REMINDER, kind: 'mgr', days: [2], titleAr: `تذكير رقم ${i}` }).expect(201);
    const refused = await agent.post('/api/performance/cycle/reminders').send(REMINDER).expect(422);
    expect(refused.body).toMatchObject({ code: 'REMINDER_LIMIT' });
    const [first] = (await state(agent)).reminders;
    await agent.delete(`/api/performance/cycle/reminders/${first!.id}`).expect(204);
    await agent.post('/api/performance/cycle/reminders').send(REMINDER).expect(201);
  });

  it('audits each change of a reminder with what it does and never with its words', async () => {
    const agent = await hr();
    const made = (await agent.post('/api/performance/cycle/reminders').send(REMINDER).expect(201)).body as ReminderDto;
    await agent.put(`/api/performance/cycle/reminders/${made.id}`).send({ ...REMINDER, on: false }).expect(200);
    await agent.delete(`/api/performance/cycle/reminders/${made.id}`).expect(204);
    await vi.waitFor(async () => {
      const rows = (await t.db.query(`SELECT action, changes::text AS changes FROM audit_logs WHERE action LIKE 'performance.reminder.%' ORDER BY created_at`)) as { action: string; changes: string | null }[];
      expect(rows.map((r) => r.action).sort()).toEqual(['performance.reminder.created', 'performance.reminder.removed', 'performance.reminder.updated']);
      for (const r of rows) expect(r.changes ?? '').not.toContain('تذكير بالتقييم الذاتي');
      for (const r of rows) expect(r.changes ?? '').not.toContain('Self-evaluation reminder');
    });
  });

  it('403 for the reminders without their own key (adding, changing, removing), and the key alone does not open the page', async () => {
    const withoutKey = await hr([CorePermission.PerformanceCycleView, CorePermission.PerformanceCycleManage, CorePermission.PerformanceCatalogManage]);
    const owner = await hr();
    const made = (await owner.post('/api/performance/cycle/reminders').send(REMINDER).expect(201)).body as ReminderDto;
    await withoutKey.post('/api/performance/cycle/reminders').send(REMINDER).expect(403);
    await withoutKey.put(`/api/performance/cycle/reminders/${made.id}`).send(REMINDER).expect(403);
    await withoutKey.delete(`/api/performance/cycle/reminders/${made.id}`).expect(403);
    const only = await hr([CorePermission.PerformanceRemindersManage]);
    await only.post('/api/performance/cycle/reminders').send(REMINDER).expect(201);
    await only.get('/api/performance/cycle').expect(403);
  });

  it('tells the people of each stage when the cycle moves into it: the managers at the manager\'s stage, the employees at the notification and objection stages, both at the close', async () => {
    const { agent, me, boss } = await teamSetup();
    const titles = async (who: typeof me) => ((await who.get('/api/notifications').expect(200)).body.items as { titleAr: string }[]).map((n) => n.titleAr);
    await agent.post('/api/performance/cycle/open').send({ fiscalYear: year }).expect(200);
    await agent.post('/api/performance/cycle/advance').expect(200); // manager's stage
    await vi.waitFor(async () => expect(await titles(boss)).toContain('بدأت مرحلة تقييم المدير'));
    expect(await titles(me)).not.toContain('بدأت مرحلة تقييم المدير');
    for (let i = 0; i < 3; i++) await agent.post('/api/performance/cycle/advance').expect(200); // calibration, approval, notification
    await vi.waitFor(async () => expect(await titles(me)).toContain('بدأت مرحلة الإبلاغ الفردي'));
    await agent.post('/api/performance/cycle/advance').expect(200);
    await vi.waitFor(async () => expect(await titles(me)).toContain('فُتحت نافذة الاعتراض'));
    await agent.post('/api/performance/cycle/close').expect(200);
    await vi.waitFor(async () => expect(await titles(boss)).toContain('أُغلقت دورة تقييم الأداء'));
    await vi.waitFor(async () => expect(await titles(me)).toContain('أُغلقت دورة تقييم الأداء'));
  });

  it('gives the caps of the catalog from the first stage that is kept, and the defaults before any file is uploaded', async () => {
    const agent = await hr();
    expect((await state(agent)).catalogCaps).toEqual({ init: 10, growth: 5 });
    await agent.post('/api/performance/templates/file').send({ text: FULL_EVAL_FILE, dryRun: false }).expect(200);
    const caps = (await state(agent)).catalogCaps;
    const [row] = (await t.db.query(`SELECT template->'extra' AS extra FROM performance_templates WHERE stage_no = 1`)) as { extra: { points: number }[] }[];
    expect(caps).toEqual({ init: row!.extra[1]!.points, growth: row!.extra[2]!.points });
  });
});

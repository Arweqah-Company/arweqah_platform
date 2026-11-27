import { CorePermission, type FileDto, type PermissionGrant, type ProblemReportResultDto, type ProblemReportSettingsDto, type TicketDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { ADMIN_MODE_GRANT, TICKET_DESK_ADMIN_GRANTS } from './factories/factories';
import { switchAiOn } from './helpers/ai-on';
import { useTestApp } from './setup/test-app';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const DESK_SETTINGS = { receptionStatus: 'active', descriptionAr: 'نصيحة', descriptionEn: 'Tip', acceptsPersonal: false, defaultDueDays: 3, minLeadDays: 0, autoCloseDays: 4, reopenWindowDays: 7, staleAfterDays: 14 };
const TYPE = { nameAr: 'مشاكل المنصة', nameEn: 'Platform problems', descriptionAr: null, descriptionEn: null, dueDays: null, isPersonal: false, isActive: true };
const REPORTER_KEYS: PermissionGrant[] = [CorePermission.TicketsReportProblem, CorePermission.TicketsView].map((key) => ({ key, scope: 'all' as const }));
const ADMIN_KEYS: PermissionGrant[] = [ADMIN_MODE_GRANT, ...[CorePermission.TicketsReportSettingsView, CorePermission.TicketsReportSettingsEdit].map((key) => ({ key, scope: 'all' as const }))];

const CONTEXT = { pageTitle: 'التذاكر', path: '/tickets', language: 'ar', theme: 'light', viewport: '1280x720', browser: 'Chrome 130 on Linux', appVersion: 'abc1234', failedRequests: [{ method: 'GET', path: '/api/tickets', status: 500 }], errors: ['TypeError: x is undefined'] };
const ANALYSIS = { title: 'قائمة التذاكر لا تُحمَّل', summary: 'القائمة فارغة ويظهر خطأ 500.', stepsGuess: ['افتح التذاكر'], area: 'التذاكر', kind: 'bug' };

describe('Problem reports (FR-195 … FR-199)', () => {
  const t = useTestApp();

  /** A desk with one type, an administrator of the settings, a reporter with the key, and a person without it. */
  async function world() {
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: TICKET_DESK_ADMIN_GRANTS });
    const handler = await t.factories.user({ unit: org.unitA });
    await t.db.query('UPDATE employees SET org_node_id = $1 WHERE id = $2', [org.department, handler.employeeId]);
    await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [manager.employeeId, org.department]);
    const boss = await t.factories.signIn(manager);
    await boss.put(`/api/tickets/setup/desks/${org.department}`).send(DESK_SETTINGS).expect(200);
    const typeId = (await boss.post(`/api/tickets/setup/desks/${org.department}/types`).send({ ...TYPE, handlerUserIds: [handler.id] }).expect(201)).body.id as string;
    const personalId = (await boss.post(`/api/tickets/setup/desks/${org.department}/types`).send({ ...TYPE, nameAr: 'شخصي', nameEn: 'Personal', isPersonal: true, handlerUserIds: [handler.id] }).expect(201)).body.id as string;
    const reporter = await t.factories.user({ unit: org.unitB, grants: REPORTER_KEYS });
    const outsider = await t.factories.user({ unit: org.unitC, grants: [{ key: CorePermission.TicketsView, scope: 'own' }] });
    return {
      typeId,
      personalId,
      handler: await t.factories.signIn(handler),
      reporter: { user: reporter, agent: await t.factories.signIn(reporter) },
      outsider: await t.factories.signIn(outsider),
      admin: await t.factories.signInAdminMode(await t.factories.user({ grants: ADMIN_KEYS })),
    };
  }
  type World = Awaited<ReturnType<typeof world>>;

  const configure = (w: World, over: Partial<ProblemReportSettingsDto> = {}) =>
    w.admin.put('/api/problem-report-settings').send({ enabled: true, ticketTypeId: w.typeId, analyzeWithAi: true, sendImageToAi: false, maxPerHour: 10, ...over });
  const upload = async (w: World) => (await w.reporter.agent.post('/api/files').attach('file', PNG, 'screen.png').expect(201)).body as FileDto;
  const report = (w: World, body: Record<string, unknown> = {}) => w.reporter.agent.post('/api/problem-reports').send({ note: 'القائمة فارغة', context: CONTEXT, ...body });

  describe('the settings (FR-195)', () => {
    it('start off, are shown to the administrator only (403 without the key, 403 without admin mode), and the button is hidden until a type is chosen', async () => {
      const w = await world();
      expect((await w.admin.get('/api/problem-report-settings').expect(200)).body).toMatchObject({ enabled: false, ticketTypeId: null, analyzeWithAi: true, sendImageToAi: false, maxPerHour: 10 });
      await w.reporter.agent.get('/api/problem-report-settings').expect(403);
      await w.reporter.agent.put('/api/problem-report-settings').send({ enabled: false, ticketTypeId: null, analyzeWithAi: true, sendImageToAi: false, maxPerHour: 10 }).expect(403);
      const noAdminMode = await t.factories.signIn(await t.factories.user({ grants: ADMIN_KEYS }));
      await noAdminMode.get('/api/problem-report-settings').expect(403);
      expect((await w.reporter.agent.get('/api/problem-reports/availability').expect(200)).body).toEqual({ available: false, canAnalyze: false, imageToAi: false });
    });

    it('lists the types a report may become (not the personal ones) and saves the choice with an audit line', async () => {
      const w = await world();
      const types = (await w.admin.get('/api/problem-report-settings/types').expect(200)).body as { typeId: string }[];
      expect(types.map((x) => x.typeId)).toEqual([w.typeId]);
      const saved = (await configure(w, { maxPerHour: 5 }).expect(200)).body as ProblemReportSettingsDto;
      expect(saved).toMatchObject({ enabled: true, ticketTypeId: w.typeId, maxPerHour: 5 });
      expect((await w.reporter.agent.get('/api/problem-reports/availability').expect(200)).body).toEqual({ available: true, canAnalyze: false, imageToAi: false });
      expect(await t.db.query(`SELECT action FROM audit_logs WHERE action = 'ticket.problem_report_settings_updated'`)).toHaveLength(1);
    });

    it('refuses a personal type, an unknown type, switching on with no type, and numbers out of range', async () => {
      const w = await world();
      expect((await configure(w, { ticketTypeId: w.personalId }).expect(422)).body.code).toBe('PROBLEM_REPORT_TYPE_INVALID');
      expect((await configure(w, { ticketTypeId: '00000000-0000-4000-8000-000000000000' }).expect(422)).body.code).toBe('PROBLEM_REPORT_TYPE_INVALID');
      expect((await configure(w, { ticketTypeId: null }).expect(422)).body.code).toBe('PROBLEM_REPORT_TYPE_INVALID');
      await configure(w, { maxPerHour: 0 }).expect(400);
      await configure(w, { maxPerHour: 61 }).expect(400);
    });
  });

  describe('a report becomes a ticket (FR-196)', () => {
    it('is sent by the employee to the chosen type with the screenshot attached, and the screen details in its text', async () => {
      const w = await world();
      await configure(w, { analyzeWithAi: false }).expect(200);
      const file = await upload(w);
      const result = (await report(w, { fileId: file.id, analyzed: true }).expect(201)).body as ProblemReportResultDto;
      expect(result).toMatchObject({ ticketNumber: expect.any(Number) });
      const ticket = (await w.reporter.agent.get(`/api/tickets/${result.ticketId}`).expect(200)).body as TicketDto;
      expect(ticket).toMatchObject({ typeId: w.typeId, title: 'بلاغ من صفحة «التذاكر»' });
      expect(ticket.sender.id).toBe(w.reporter.user.id);
      expect(ticket.details).toContain('Chrome 130 on Linux');
      expect(ticket.details).toContain('GET /api/tickets (500)');
      expect(ticket.details).toContain('القائمة فارغة');
      expect(ticket.events[0]!.attachments.map((a) => a.fileId)).toEqual([file.id]);
      expect((await w.handler.get(`/api/tickets/${result.ticketId}`).expect(200)).body.id).toBe(result.ticketId);
      await w.outsider.get(`/api/tickets/${result.ticketId}`).expect(404);
      expect(await t.db.query(`SELECT changes FROM audit_logs WHERE action = 'ticket.problem_reported'`)).toEqual([{ changes: { analyzed: true, screenshot: true } }]);
    });

    it('goes with the text alone when the person keeps no screenshot', async () => {
      const w = await world();
      await configure(w, { analyzeWithAi: false }).expect(200);
      const result = (await report(w).expect(201)).body as ProblemReportResultDto;
      const ticket = (await w.reporter.agent.get(`/api/tickets/${result.ticketId}`).expect(200)).body as TicketDto;
      expect(ticket.events[0]!.attachments).toEqual([]);
      expect(ticket.details).toContain('بلا لقطة.');
    });
  });

  describe('the AI reading, asked for with a button (FR-197)', () => {
    const analyze = (w: World, body: Record<string, unknown> = {}) => w.reporter.agent.post('/api/problem-reports/analyze').send({ note: 'القائمة فارغة', context: CONTEXT, ...body });

    it('writes a title and a description from the note and the page details, without the picture unless the administrator allowed it', async () => {
      const w = await world();
      await switchAiOn(t);
      await configure(w, { sendImageToAi: false }).expect(200);
      expect((await w.reporter.agent.get('/api/problem-reports/availability').expect(200)).body).toEqual({ available: true, canAnalyze: true, imageToAi: false });
      t.ai.answer(ANALYSIS);
      const file = await upload(w);
      const read = (await analyze(w, { fileId: file.id }).expect(200)).body;
      expect(read).toEqual({ title: ANALYSIS.title, description: expect.stringContaining(ANALYSIS.summary), imageSeen: false });
      expect(read.description).toContain('1. افتح التذاكر');
      expect(read.description).toContain('التذاكر'); // the area
      expect(t.ai.calls).toHaveLength(1);
      expect(t.ai.calls[0]!.images).toBeUndefined();
      expect(t.ai.calls[0]!.user).toContain('<report>');
      expect(t.ai.calls[0]!.user).toContain('GET /api/tickets -> 500');
    });

    it('shows the picture to the AI only when «send the picture» is on', async () => {
      const w = await world();
      await switchAiOn(t);
      await configure(w, { sendImageToAi: true }).expect(200);
      expect((await w.reporter.agent.get('/api/problem-reports/availability').expect(200)).body).toEqual({ available: true, canAnalyze: true, imageToAi: true });
      t.ai.answer(ANALYSIS);
      const read = (await analyze(w, { fileId: (await upload(w)).id }).expect(200)).body;
      expect(read.imageSeen).toBe(true);
      expect(t.ai.calls[0]!.images).toEqual([{ mediaType: 'image/png', data: PNG.toString('base64') }]);
    });

    it('answers 422 when the AI fails or answers nonsense, so the person writes it by hand; the ticket never waits for the AI', async () => {
      const w = await world();
      await switchAiOn(t);
      await configure(w).expect(200);
      t.ai.fail({ kind: 'failed', message: 'boom' });
      expect((await analyze(w).expect(422)).body.code).toBe('PROBLEM_REPORT_ANALYSIS_FAILED');
      t.ai.answer({ nonsense: true });
      expect((await analyze(w).expect(422)).body.code).toBe('PROBLEM_REPORT_ANALYSIS_FAILED');
      const calls = t.ai.calls.length;
      await report(w, { title: 'عنوان كتبته', note: 'وصف عدّلته' }).expect(201);
      expect(t.ai.calls).toHaveLength(calls); // sending asks the AI nothing
    });

    it('has no button (canAnalyze false) and refuses (422) when the analysis is off or no AI service is on', async () => {
      const w = await world();
      await configure(w).expect(200); // no AI service on
      expect((await w.reporter.agent.get('/api/problem-reports/availability').expect(200)).body.canAnalyze).toBe(false);
      expect((await analyze(w).expect(422)).body.code).toBe('PROBLEM_REPORT_ANALYSIS_FAILED');
      await switchAiOn(t);
      await configure(w, { analyzeWithAi: false }).expect(200);
      expect((await w.reporter.agent.get('/api/problem-reports/availability').expect(200)).body.canAnalyze).toBe(false);
      expect((await analyze(w).expect(422)).body.code).toBe('PROBLEM_REPORT_ANALYSIS_FAILED');
    });

    it('is refused for a person without the key (403), while the button is off (422), for a screenshot that is not theirs (404) and past the hourly limit (422)', async () => {
      const w = await world();
      await switchAiOn(t);
      expect((await analyze(w).expect(422)).body.code).toBe('PROBLEM_REPORTS_OFF');
      await configure(w, { maxPerHour: 1 }).expect(200);
      const others = (await w.handler.post('/api/files').attach('file', PNG, 'theirs.png').expect(201)).body as FileDto;
      await analyze(w, { fileId: others.id }).expect(404);
      t.ai.answer(ANALYSIS);
      await analyze(w).expect(200);
      expect((await analyze(w).expect(422)).body.code).toBe('PROBLEM_REPORT_RATE_LIMITED');
      await t.db.query(`DELETE FROM role_permissions WHERE permission_key = 'tickets.report_problem' AND role_id NOT IN (SELECT role_id FROM user_roles WHERE user_id = $1)`, [w.reporter.user.id]);
      await w.outsider.post('/api/problem-reports/analyze').send({ context: CONTEXT }).expect(403);
    });

    it('makes the ticket with the title and the description the person kept or changed', async () => {
      const w = await world();
      await configure(w).expect(200);
      const result = (await report(w, { title: 'عنوان عدّلته', note: 'وصف عدّلته بيدي', analyzed: true }).expect(201)).body as ProblemReportResultDto;
      const ticket = (await w.reporter.agent.get(`/api/tickets/${result.ticketId}`).expect(200)).body as TicketDto;
      expect(ticket.title).toBe('عنوان عدّلته');
      expect(ticket.details).toContain('وصف عدّلته بيدي');
      await report(w, { title: 'x'.repeat(201) }).expect(400);
    });
  });

  describe('who may report, and how often (FR-198)', () => {
    it('refuses a person without the key (403)', async () => {
      const w = await world();
      await t.db.query(`DELETE FROM role_permissions WHERE permission_key = 'tickets.report_problem' AND role_id NOT IN (SELECT id FROM roles WHERE id IN (SELECT role_id FROM user_roles WHERE user_id = $1))`, [w.reporter.user.id]); // the Employee role holds the key by default (the migration)
      await w.outsider.post('/api/problem-reports').send({ context: CONTEXT }).expect(403);
      await w.outsider.get('/api/problem-reports/availability').expect(403);
    });

    it('refuses a report while the button is off (422) and a screenshot that is not the sender\'s', async () => {
      const w = await world();
      expect((await report(w).expect(422)).body.code).toBe('PROBLEM_REPORTS_OFF');
      await configure(w, { analyzeWithAi: false }).expect(200);
      const others = (await w.handler.post('/api/files').attach('file', PNG, 'theirs.png').expect(201)).body as FileDto;
      await report(w, { fileId: others.id }).expect(404);
    });

    it('stops reports when the chosen type is no longer usable, and the button hides', async () => {
      const w = await world();
      await configure(w, { analyzeWithAi: false }).expect(200);
      await t.db.query(`UPDATE ticket_types SET is_active = false WHERE id = $1`, [w.typeId]);
      expect((await w.reporter.agent.get('/api/problem-reports/availability').expect(200)).body.available).toBe(false);
      expect((await report(w).expect(422)).body.code).toBe('PROBLEM_REPORTS_OFF');
    });

    it('allows only the number of reports an hour the administrator set', async () => {
      const w = await world();
      await configure(w, { analyzeWithAi: false, maxPerHour: 2 }).expect(200);
      await report(w).expect(201);
      await report(w).expect(201);
      expect((await report(w).expect(422)).body.code).toBe('PROBLEM_REPORT_RATE_LIMITED');
    });

    it('checks the body: strict keys, bounded text, a real id for the screenshot', async () => {
      const w = await world();
      await configure(w, { analyzeWithAi: false }).expect(200);
      await report(w, { extra: 1 }).expect(400);
      await report(w, { note: 'x'.repeat(1001) }).expect(400);
      await report(w, { fileId: 'not-an-id' }).expect(400);
      await report(w, { context: { ...CONTEXT, errors: Array(6).fill('e') } }).expect(400);
    });
  });
});

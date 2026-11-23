import type { NoticeDetailsDto, NoticesPageDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { NoticeDeliveryService } from '../src/modules/notices/application/services/notice-delivery.service';
import { approvedNotice, createNotice, dayFromToday, noticeBody, noticeWorld, NOTICE_HEAD_GRANTS, TODAY, makeWriter } from './helpers/notices';
import { useTestApp } from './setup/test-app';

describe('Notices: writing, approval and rejection (FR-167)', () => {
  const t = useTestApp();

  describe('writing', () => {
    it('lets a writer of the channel save a draft; the text is cleaned of anything dangerous and the audience is stored as rules', async () => {
      const w = await noticeWorld(t);
      const created = await createNotice(w.agents.writer, { body: '<p onclick="x()">hello <script>alert(1)</script><b>bold</b></p><img src=x onerror=y>' });
      expect(created).toMatchObject({ status: 'draft', kind: 'policy', version: 1, channel: { code: 'hr' }, author: { id: w.writer.id }, audienceRules: [{ type: 'all' }] });
      expect(created.body).toBe('<p>hello <b>bold</b></p>');
      expect(created.abilities).toMatchObject({ edit: true, submit: true, delete: true, approve: false, revise: false });
    });

    it('lets the platform administrator (create at «all») write in every active channel without being added as a writer, and lists them as writable (FR-167, FR-177)', async () => {
      const w = await noticeWorld(t);
      const admin = await t.factories.user({ unit: w.org.unitA, grants: [...NOTICE_HEAD_GRANTS, ...['notices.create', 'notices.edit', 'notices.submit', 'notices.delete'].map((key) => ({ key, scope: 'all' as const }))] });
      const agent = await t.factories.signIn(admin);
      expect((await agent.get('/api/notices/options').expect(200)).body.writableChannelCodes).toEqual(expect.arrayContaining(['hr', 'corporate_comms']));
      expect(await createNotice(agent, { channelCode: 'corporate_comms' })).toMatchObject({ status: 'draft', channel: { code: 'corporate_comms' } });
      // a head who holds the key only inside the unit is still not a writer of the channel
      expect((await w.agents.head.get('/api/notices/options').expect(200)).body.writableChannelCodes).toEqual([]);
    });

    it('refuses what the input rules refuse: an unknown field, no title, no text, a date in the past, a missing unit', async () => {
      const w = await noticeWorld(t);
      await w.agents.writer.post('/api/notices').send(noticeBody({ surprise: true })).expect(400);
      await w.agents.writer.post('/api/notices').send(noticeBody({ titleAr: '  ' })).expect(400);
      await w.agents.writer.post('/api/notices').send(noticeBody({ body: '' })).expect(400);
      expect((await w.agents.writer.post('/api/notices').send(noticeBody({ body: '<p><br></p>' })).expect(422)).body.code).toBe('NOTICE_BODY_EMPTY');
      expect((await w.agents.writer.post('/api/notices').send(noticeBody({ publishOn: dayFromToday(-1) })).expect(422)).body.code).toBe('NOTICE_PUBLISH_DATE_PAST');
      const missing = noticeBody({ audience: [{ type: 'unit', refId: '00000000-0000-4000-8000-000000000009', includeBelow: true }] });
      expect((await w.agents.writer.post('/api/notices').send(missing).expect(422)).body.code).toBe('NOTICE_AUDIENCE_INVALID');
    });

    it('is 403 for a person without the key, and 403 NOTICE_NOT_CHANNEL_WRITER for a writer of the other channel', async () => {
      const w = await noticeWorld(t);
      await w.agents.employee.post('/api/notices').send(noticeBody()).expect(403);
      expect((await w.agents.writer.post('/api/notices').send(noticeBody({ channelCode: 'corporate_comms' })).expect(403)).body.code).toBe('NOTICE_NOT_CHANNEL_WRITER');
      await w.agents.writer.post('/api/notices').send(noticeBody({ channelCode: 'hr' })).expect(201);
    });

    it('edits only a draft (by its writer), keeps one version, and deletes only a draft', async () => {
      const w = await noticeWorld(t);
      const created = await createNotice(w.agents.writer);
      const edited = await w.agents.writer.put(`/api/notices/${created.id}`).send(noticeBody({ titleAr: 'عنوان جديد', revision: created.revision })).expect(200);
      expect(edited.body).toMatchObject({ titleAr: 'عنوان جديد', status: 'draft', version: 1 });
      await w.agents.writer.put(`/api/notices/${created.id}`).send(noticeBody({ revision: created.revision })).expect(409); // stale revision
      await w.agents.writer.post(`/api/notices/${created.id}/submit`).send({}).expect(200);
      expect((await w.agents.writer.put(`/api/notices/${created.id}`).send(noticeBody()).expect(409)).body.code).toBe('NOTICE_NOT_EDITABLE');
      expect((await w.agents.writer.delete(`/api/notices/${created.id}`).expect(409)).body.code).toBe('NOTICE_NOT_DRAFT');
      const draft = await createNotice(w.agents.writer);
      await w.agents.writer.delete(`/api/notices/${draft.id}`).expect(204);
      await w.agents.writer.get(`/api/notices/${draft.id}`).expect(404);
    });

    it('lets another person who can see the notice know it is not theirs (403) and hides it from one who cannot (404)', async () => {
      const w = await noticeWorld(t);
      const created = await createNotice(w.agents.writer);
      expect((await w.agents.head.put(`/api/notices/${created.id}`).send(noticeBody()).expect(403)).body.code).toBe('FORBIDDEN');
      await w.agents.otherHead.put(`/api/notices/${created.id}`).send(noticeBody()).expect(403);
      await w.agents.otherHead.get(`/api/notices/${created.id}`).expect(404);
      await w.agents.employee.get(`/api/notices/${created.id}`).expect(403);
    });
  });

  describe('sending for approval and publishing only after it', () => {
    it('refuses to send a notice whose audience reaches nobody, and sends one to the head of the writer\'s unit', async () => {
      const w = await noticeWorld(t);
      const empty = await createNotice(w.agents.writer, { audience: [] });
      expect((await w.agents.writer.post(`/api/notices/${empty.id}/submit`).send({}).expect(422)).body.code).toBe('NOTICE_AUDIENCE_EMPTY');
      const created = await createNotice(w.agents.writer);
      const sent = (await w.agents.writer.post(`/api/notices/${created.id}/submit`).send({}).expect(200)).body as NoticeDetailsDto;
      expect(sent).toMatchObject({ status: 'pending_approval', approver: { id: w.head.id } });
      const waiting = (await w.agents.head.get('/api/notices/approvals').expect(200)).body;
      expect(waiting.items.map((n: { id: string }) => n.id)).toEqual([created.id]);
      expect(waiting.items[0].abilities).toMatchObject({ approve: true, reject: true });
      await w.agents.otherHead.get('/api/notices/approvals').expect(200).expect((r) => expect(r.body.items).toEqual([]));
      expect((await w.agents.writer.get('/api/notices/approvals')).status).toBe(403);
      const notified: { n: number }[] = await t.db.query(`SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND link = '/notices/approvals'`, [w.head.id]);
      expect(notified[0]?.n).toBe(1);
    });

    it('does not show a notice to the employees before it is approved, and the publish day alone changes nothing for an unapproved one', async () => {
      const w = await noticeWorld(t);
      const created = await createNotice(w.agents.writer);
      await w.agents.writer.post(`/api/notices/${created.id}/submit`).send({}).expect(200);
      await w.agents.employee.get(`/api/notices/mine/${created.id}`).expect(404);
      expect(await t.app.get(NoticeDeliveryService).publishDue(created.id)).toBe(false);
      expect((await t.db.query('SELECT status FROM notices WHERE id = $1', [created.id]))[0].status).toBe('pending_approval');
      expect((await t.db.query('SELECT count(*)::int AS n FROM notice_recipients'))[0].n).toBe(0);
    });

    it('publishes at once when the publish day has come, and on its day (through a durable job) when it is later', async () => {
      const w = await noticeWorld(t);
      const today = await approvedNotice(w);
      expect(today).toMatchObject({ status: 'published', approver: { id: w.head.id } });
      const later = await approvedNotice(w, { publishOn: dayFromToday(3), titleAr: 'لاحقًا' });
      expect(later.status).toBe('approved');
      const jobs = await t.db.query(`SELECT topic, run_at FROM scheduled_jobs WHERE dedupe_key = $1 AND status = 'pending'`, [`notice.publish:${later.id}`]);
      expect(jobs).toHaveLength(1);
      expect(jobs[0].topic).toBe('notices.publish-due');
      expect(new Date(jobs[0].run_at).toISOString()).toBe(new Date(`${dayFromToday(3)}T00:00:00+03:00`).toISOString());
      expect(await t.app.get(NoticeDeliveryService).publishDue(later.id)).toBe(true);
      expect((await t.db.query('SELECT status, current_version FROM notices WHERE id = $1', [later.id]))[0]).toMatchObject({ status: 'published', current_version: 1 });
      expect(await t.app.get(NoticeDeliveryService).publishDue(later.id)).toBe(false); // a second run does nothing
    });

    it('never publishes by itself: the machine has no way from a draft or a pending notice to published', async () => {
      const w = await noticeWorld(t);
      const created = await createNotice(w.agents.writer);
      expect(await t.app.get(NoticeDeliveryService).publishDue(created.id)).toBe(false);
      await w.agents.writer.post(`/api/notices/${created.id}/pin`).send({}).expect(403);
      expect((await t.db.query('SELECT status FROM notices WHERE id = $1', [created.id]))[0].status).toBe('draft');
    });
  });

  describe('who decides', () => {
    it('does not let the writer approve their own notice (403), nor a head of another unit see it (404); the employee has no key (403)', async () => {
      const w = await noticeWorld(t);
      await makeWriter(t, w.head, 'hr'); // the head of the unit also writes
      const headsAgent = await t.factories.signIn(w.head);
      const own = await createNotice(headsAgent);
      const sent = (await headsAgent.post(`/api/notices/${own.id}/submit`).send({}).expect(200)).body as NoticeDetailsDto;
      expect(sent.approver).toBeNull(); // nobody above them leads a unit: a platform administrator approves
      expect((await headsAgent.post(`/api/notices/${own.id}/approve`).send({}).expect(403)).body.code).toBe('NOTICE_SELF_APPROVAL');
      const created = await createNotice(w.agents.writer);
      await w.agents.writer.post(`/api/notices/${created.id}/submit`).send({}).expect(200);
      await w.agents.otherHead.post(`/api/notices/${created.id}/approve`).send({}).expect(404);
      await w.agents.employee.post(`/api/notices/${created.id}/approve`).send({}).expect(403);
      await w.agents.writer.post(`/api/notices/${created.id}/approve`).send({}).expect(403);
    });

    it('answers 409 NOTICE_NOT_PENDING for a notice that is not waiting', async () => {
      const w = await noticeWorld(t);
      const created = await createNotice(w.agents.writer);
      expect((await w.agents.head.post(`/api/notices/${created.id}/approve`).send({}).expect(409)).body.code).toBe('NOTICE_NOT_PENDING');
    });

    it('rejects with a reason of five letters at least, returns the notice to its writer, who edits and sends it again', async () => {
      const w = await noticeWorld(t);
      const created = await createNotice(w.agents.writer);
      await w.agents.writer.post(`/api/notices/${created.id}/submit`).send({}).expect(200);
      await w.agents.head.post(`/api/notices/${created.id}/reject`).send({ reason: 'no' }).expect(400);
      await w.agents.head.post(`/api/notices/${created.id}/reject`).send({}).expect(400);
      const rejected = (await w.agents.head.post(`/api/notices/${created.id}/reject`).send({ reason: 'أضف تاريخ السريان' }).expect(200)).body as NoticeDetailsDto;
      expect(rejected).toMatchObject({ status: 'rejected', rejectReason: 'أضف تاريخ السريان' });
      const writersView = (await w.agents.writer.get(`/api/notices/${created.id}`).expect(200)).body as NoticeDetailsDto;
      expect(writersView).toMatchObject({ rejectReason: 'أضف تاريخ السريان', abilities: { edit: true, approve: false } });
      const flow = (await w.agents.writer.get(`/api/notices/${created.id}/flow`).expect(200)).body;
      expect(flow.steps.map((s: { event: string }) => s.event)).toEqual(['created', 'submitted', 'rejected']);
      expect(flow.steps[2]).toMatchObject({ reason: 'أضف تاريخ السريان', actor: { id: w.head.id } });
      const edited = (await w.agents.writer.put(`/api/notices/${created.id}`).send(noticeBody({ titleAr: 'بعد التعديل' })).expect(200)).body;
      expect(edited.status).toBe('draft');
      await w.agents.writer.post(`/api/notices/${created.id}/submit`).send({}).expect(200);
      await vi.waitFor(async () => expect((await t.db.query(`SELECT 1 FROM audit_logs WHERE action = 'notice.rejected'`)).length).toBe(1));
      const audit: { changes: unknown }[] = await t.db.query(`SELECT changes FROM audit_logs WHERE action LIKE 'notice.%'`);
      expect(JSON.stringify(audit)).not.toContain('أضف تاريخ السريان'); // the audit never carries the reason or the text
    });

    it('lets only one of an approval and a rejection that arrive together win (the other is 409)', async () => {
      const w = await noticeWorld(t);
      const created = await createNotice(w.agents.writer);
      await w.agents.writer.post(`/api/notices/${created.id}/submit`).send({}).expect(200);
      const [a, b] = await Promise.all([w.agents.head.post(`/api/notices/${created.id}/approve`).send({}), w.agents.head.post(`/api/notices/${created.id}/reject`).send({ reason: 'سبب كافٍ' })]);
      expect([a.status, b.status].sort()).toEqual([200, 409]);
      const loser = a.status === 409 ? a : b;
      expect(['NOTICE_NOT_PENDING', 'NOTICE_REVISION_CONFLICT', 'WORKFLOW_CHANGED']).toContain(loser.body.code);
    });
  });

  describe('lists and details', () => {
    it('shows each person only the notices their key reaches, with search, filters and tab counters', async () => {
      const w = await noticeWorld(t);
      const first = await createNotice(w.agents.writer, { titleAr: 'سياسة الإجازات' });
      await createNotice(w.agents.writer, { titleAr: 'إعلان المكتب', kind: 'announcement' });
      await w.agents.writer.post(`/api/notices/${first.id}/submit`).send({}).expect(200);
      const writerList = (await w.agents.writer.get('/api/notices').expect(200)).body as NoticesPageDto;
      expect(writerList.total).toBe(2);
      expect(writerList.counts).toEqual({ mine: 1, pending: 1 });
      const headList = (await w.agents.head.get('/api/notices').expect(200)).body as NoticesPageDto;
      expect(headList.total).toBe(2); // the head sees the unit below them
      expect(((await w.agents.otherHead.get('/api/notices').expect(200)).body as NoticesPageDto).total).toBe(0);
      await w.agents.employee.get('/api/notices').expect(403);
      const search = (await w.agents.head.get('/api/notices').query({ search: 'الإجازات' }).expect(200)).body as NoticesPageDto;
      expect(search.items.map((n) => n.id)).toEqual([first.id]);
      expect(((await w.agents.head.get('/api/notices').query({ kind: 'announcement' }).expect(200)).body as NoticesPageDto).total).toBe(1);
      expect(((await w.agents.head.get('/api/notices').query({ tab: 'pending' }).expect(200)).body as NoticesPageDto).total).toBe(1);
      expect(((await w.agents.head.get('/api/notices').query({ state: 'draft' }).expect(200)).body as NoticesPageDto).total).toBe(1);
      expect(((await w.agents.head.get('/api/notices').query({ unitId: w.org.unitC.id }).expect(200)).body as NoticesPageDto).total).toBe(0);
      expect(((await w.agents.head.get('/api/notices').query({ unitId: w.org.unitA.id }).expect(200)).body as NoticesPageDto).total).toBe(2);
      await w.agents.head.get('/api/notices').query({ kind: 'bad' }).expect(400);
    });

    it('answers the details with every version, the audience rules and the people involved', async () => {
      const w = await noticeWorld(t);
      const approved = await approvedNotice(w, { audience: [{ type: 'unit', refId: w.org.unitA.id, includeBelow: true }, { type: 'all' }] });
      expect(approved.audienceRules).toEqual([{ type: 'all', refId: null, includeBelow: false, nameAr: null, nameEn: null }]);
      const unitOnly = await createNotice(w.agents.writer, { audience: [{ type: 'unit', refId: w.org.unitA.id, includeBelow: false }] });
      expect(unitOnly.audienceRules[0]).toMatchObject({ type: 'unit', refId: w.org.unitA.id, includeBelow: false, nameEn: 'Unit A' });
      expect(approved.versions).toHaveLength(1);
      expect(TODAY()).toBe(approved.publishOn);
    });

    it('keeps a head with the manage key out of other units\' details but lets the platform-wide key see everything', async () => {
      const w = await noticeWorld(t);
      const created = await createNotice(w.agents.writer);
      const admin = await t.factories.user({ grants: NOTICE_HEAD_GRANTS.map((g) => ({ key: g.key, scope: 'all' as const })) });
      const adminAgent = await t.factories.signIn(admin);
      await adminAgent.get(`/api/notices/${created.id}`).expect(200);
      await w.agents.otherHead.get(`/api/notices/${created.id}`).expect(404);
    });
  });
});

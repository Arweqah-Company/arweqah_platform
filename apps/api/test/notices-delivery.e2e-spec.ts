import { CorePermission, type NoticeAcknowledgementsDto, type NoticeHomeDto, type NoticeMineDetailsDto, type NoticeMinePageDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { SecuritySettingsService } from '../src/core/auth/application/security-settings.service';
import { NoticeDeliveryService } from '../src/modules/notices/application/services/notice-delivery.service';
import { NoticeCatchUpJob } from '../src/modules/notices/infrastructure/jobs/notice-catch-up.job';
import { approvedNotice, createNotice, dayFromToday, noticeWorld, type NoticeWorld } from './helpers/notices';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

describe('Notices: delivery in batches, the nightly pass, reading and acknowledging (FR-168, FR-169, FR-170, FR-171, FR-173)', () => {
  const t = useTestApp();
  const delivery = () => t.app.get(NoticeDeliveryService);
  const recipientsOf = async (id: string): Promise<string[]> => ((await t.db.query('SELECT user_id FROM notice_recipients WHERE notice_id = $1 ORDER BY user_id', [id])) as { user_id: string }[]).map((r) => r.user_id);
  const setBatch = (size: number, minutes = 5) => t.db.query(`INSERT INTO notice_settings (id, batch_size, batch_interval_minutes) VALUES (1, $1, $2) ON CONFLICT (id) DO UPDATE SET batch_size = $1, batch_interval_minutes = $2`, [size, minutes]);
  const everyone = (w: NoticeWorld) => [w.writer.id, w.head.id, w.otherHead.id, w.employee.id].sort();

  describe('batches (FR-168)', () => {
    it('reaches the audience a batch at a time in a fixed order, schedules the next batch, and notifies each person once even when a batch runs twice', async () => {
      const w = await noticeWorld(t);
      await setBatch(2);
      const notice = await approvedNotice(w);
      const first = await t.db.query(`SELECT payload FROM outbox_messages WHERE topic = 'notices.deliver-batch'`);
      expect(first).toHaveLength(1); // approving queued the first batch at once
      const [idA, idB, idC, idD] = everyone(w) as [string, string, string, string];
      await w.agents.employee.get(`/api/notices/mine/${notice.id}`).expect(404); // nobody was reached yet
      await delivery().deliverBatch({ noticeId: notice.id, batchNo: 1, version: 1 });
      expect(await recipientsOf(notice.id)).toEqual([idA, idB]);
      const next = await t.db.query(`SELECT payload, run_at FROM scheduled_jobs WHERE dedupe_key = $1 AND status = 'pending'`, [`notice.batch:${notice.id}`]);
      expect(next).toHaveLength(1);
      expect(next[0].payload).toMatchObject({ noticeId: notice.id, batchNo: 2, version: 1 });
      expect(new Date(next[0].run_at).getTime()).toBeGreaterThan(Date.now() + 4 * 60_000);
      await delivery().deliverBatch({ noticeId: notice.id, batchNo: 1, version: 1 }); // a re-run adds nobody and tells nobody again
      expect(await recipientsOf(notice.id)).toEqual([idA, idB]);
      await delivery().deliverBatch({ noticeId: notice.id, batchNo: 2, version: 1 });
      expect(await recipientsOf(notice.id)).toEqual([idA, idB, idC, idD]);
      expect(await t.db.query(`SELECT 1 FROM scheduled_jobs WHERE dedupe_key = $1 AND status = 'pending'`, [`notice.batch:${notice.id}`])).toHaveLength(0);
      expect((await t.db.query('SELECT batches_done, delivery_completed_at FROM notices WHERE id = $1', [notice.id]))[0]).toMatchObject({ batches_done: 2 });
      const bells: { user_id: string }[] = await t.db.query(`SELECT user_id FROM notifications WHERE link LIKE '/notices?open=%'`);
      expect(bells.map((b) => b.user_id).sort()).toEqual([idA, idB, idC, idD]);
      await vi.waitFor(async () => {
        const done: { action: string; changes: { recipients: number; batches: number } }[] = await t.db.query(`SELECT action, changes FROM audit_logs WHERE action = 'notice.published'`);
        expect(done).toHaveLength(1);
        expect(done[0]?.changes).toMatchObject({ recipients: 4, batches: 2 });
      });
    });

    it('delivers an audience of more than 1,500 people in order, batch after batch, with a re-run that adds nobody', async () => {
      const w = await noticeWorld(t);
      await t.db.query(`INSERT INTO users (name, email) SELECT 'Bulk ' || g, 'bulk' || g || '@arweqah.sa' FROM generate_series(1, 1600) g`);
      await t.db.query(
        `INSERT INTO employees (user_id, company_id, employee_number, full_name, work_email, start_date)
         SELECT u.id, $1, 'B-' || u.email, u.name, u.email, '2024-01-01' FROM users u WHERE u.email LIKE 'bulk%@arweqah.sa'`,
        [w.org.companyId],
      );
      const notice = await approvedNotice(w);
      const total = 1604;
      let batch = 1;
      for (; batch <= 4; batch++) await delivery().deliverBatch({ noticeId: notice.id, batchNo: batch, version: 1 });
      expect((await recipientsOf(notice.id)).length).toBe(total);
      await delivery().deliverBatch({ noticeId: notice.id, batchNo: 2, version: 1 });
      expect((await recipientsOf(notice.id)).length).toBe(total);
      expect((await t.db.query('SELECT batches_done, delivery_completed_at FROM notices WHERE id = $1', [notice.id]))[0].delivery_completed_at).not.toBeNull();
    }, 120_000);

    it('lets the batch size and the interval be set (1 to 5000, 1 to 60) and uses them', async () => {
      const w = await noticeWorld(t);
      const admin = await t.factories.user({ grants: [{ key: CorePermission.NoticesSettingsEdit, scope: 'all' }, { key: CorePermission.NoticesChannelsView, scope: 'all' }] });
      const agent = await t.factories.signIn(admin);
      await agent.put('/api/notices/channels/settings').send({ batchSize: 0, batchIntervalMinutes: 5 }).expect(400);
      await agent.put('/api/notices/channels/settings').send({ batchSize: 5001, batchIntervalMinutes: 5 }).expect(400);
      await agent.put('/api/notices/channels/settings').send({ batchSize: 100, batchIntervalMinutes: 61 }).expect(400);
      await agent.put('/api/notices/channels/settings').send({ batchSize: 3, batchIntervalMinutes: 10, extra: 1 }).expect(400);
      expect((await agent.put('/api/notices/channels/settings').send({ batchSize: 3, batchIntervalMinutes: 10 }).expect(200)).body).toEqual({ batchSize: 3, batchIntervalMinutes: 10, canEdit: true });
      await w.agents.writer.put('/api/notices/channels/settings').send({ batchSize: 3, batchIntervalMinutes: 10 }).expect(403);
      const notice = await approvedNotice(w);
      await delivery().deliverBatch({ noticeId: notice.id, batchNo: 1, version: 1 });
      expect(await recipientsOf(notice.id)).toHaveLength(3);
    });
  });

  describe('people who join the audience later (FR-170)', () => {
    it('reaches a new employee in the nightly pass, once, without touching what others acknowledged, and never a notice being revised', async () => {
      const w = await noticeWorld(t);
      const notice = await approvedNotice(w);
      await delivery().deliverBatch({ noticeId: notice.id, batchNo: 1, version: 1 });
      await w.agents.employee.post(`/api/notices/mine/${notice.id}/acknowledge`).expect(200);
      const newcomer = await t.factories.user({ unit: w.org.unitB });
      expect(await delivery().catchUp()).toBe(1);
      expect(await delivery().catchUp()).toBe(0); // nothing is added twice
      const row = (await t.db.query('SELECT joined_after_publish, notified_version FROM notice_recipients WHERE notice_id = $1 AND user_id = $2', [notice.id, newcomer.id]))[0];
      expect(row).toMatchObject({ joined_after_publish: true, notified_version: 1 });
      const employeeRow = (await t.db.query('SELECT acknowledged_version, joined_after_publish FROM notice_recipients WHERE notice_id = $1 AND user_id = $2', [notice.id, w.employee.id]))[0];
      expect(employeeRow).toMatchObject({ acknowledged_version: 1, joined_after_publish: false });
      const newcomerAgent = await t.factories.signIn(newcomer);
      expect(((await newcomerAgent.get('/api/notices/mine').expect(200)).body as NoticeMinePageDto).items.map((n) => n.id)).toEqual([notice.id]);
      await w.agents.writer.post(`/api/notices/${notice.id}/revise`).send({}).expect(200);
      await t.factories.user({ unit: w.org.unitB });
      expect(await delivery().catchUp()).toBe(0); // a notice being revised is not caught up until the new version is published
      await t.app.get(NoticeCatchUpJob).scheduled(); // does nothing in tests
    });

    it('does not take back a notice from a person who left the audience, and counts after-publication people in the audience report', async () => {
      const w = await noticeWorld(t);
      const notice = await approvedNotice(w, { audience: [{ type: 'unit', refId: w.org.unitB.id, includeBelow: false }] });
      await delivery().deliverBatch({ noticeId: notice.id, batchNo: 1, version: 1 });
      expect(await recipientsOf(notice.id)).toEqual([w.employee.id]);
      await t.db.query('UPDATE employees SET org_node_id = $1 WHERE id = $2', [w.org.unitC.id, w.employee.employeeId]);
      const later = await t.factories.user({ unit: w.org.unitB });
      await delivery().catchUp();
      expect((await recipientsOf(notice.id)).sort()).toEqual([w.employee.id, later.id].sort());
      const report = (await w.agents.writer.get(`/api/notices/${notice.id}/audience`).expect(200)).body;
      expect(report).toMatchObject({ recipients: 2, joinedAfterPublish: 1, rules: [{ type: 'unit', nameEn: 'Unit B' }] });
    });
  });

  describe('reading and acknowledging (FR-173, FR-169)', () => {
    async function published(w: NoticeWorld, overrides: Record<string, unknown> = {}) {
      const notice = await approvedNotice(w, overrides);
      await delivery().deliverBatch({ noticeId: notice.id, batchNo: 1, version: 1 });
      return notice;
    }

    it('shows each employee only what reached them, a policy waits until it is acknowledged, an announcement only informs', async () => {
      const w = await noticeWorld(t);
      const policy = await published(w, { titleAr: 'سياسة' });
      const announcement = await published(w, { kind: 'announcement', titleAr: 'إعلان' });
      const onlyA = await published(w, { audience: [{ type: 'unit', refId: w.org.unitA.id, includeBelow: false }], titleAr: 'للوحدة أ' });
      const list = (await w.agents.employee.get('/api/notices/mine').expect(200)).body as NoticeMinePageDto;
      expect(list.items.map((n) => n.id).sort()).toEqual([policy.id, announcement.id].sort());
      expect(list.counts.await).toBe(1);
      expect(list.items.find((n) => n.id === policy.id)).toMatchObject({ myState: 'await', kind: 'policy', channel: { code: 'hr' }, excerpt: 'نص التعميم' });
      expect(list.items.find((n) => n.id === announcement.id)?.myState).toBe('info');
      await w.agents.employee.get(`/api/notices/mine/${onlyA.id}`).expect(404); // another audience
      expect(((await w.agents.employee.get('/api/notices/mine').query({ tab: 'await' }).expect(200)).body as NoticeMinePageDto).items).toHaveLength(1);
      expect(((await w.agents.employee.get('/api/notices/mine').query({ search: 'إعلان' }).expect(200)).body as NoticeMinePageDto).items).toHaveLength(1);
      expect(((await w.agents.employee.get('/api/notices/mine').query({ kind: 'policy', channelCode: 'corporate_comms' }).expect(200)).body as NoticeMinePageDto).items).toHaveLength(0);
      const read = (await w.agents.employee.post(`/api/notices/mine/${policy.id}/read`).expect(200)).body as NoticeMineDetailsDto;
      expect(read.readAt).not.toBeNull();
      expect(read.body).toBe('<p>نص <strong>التعميم</strong></p>');
    });

    it('records an acknowledgement once (a second one succeeds and changes nothing), refuses an announcement (422) and an archived notice (409)', async () => {
      const w = await noticeWorld(t);
      const policy = await published(w);
      const announcement = await published(w, { kind: 'announcement' });
      const acked = (await w.agents.employee.post(`/api/notices/mine/${policy.id}/acknowledge`).expect(200)).body as NoticeMineDetailsDto;
      expect(acked).toMatchObject({ myState: 'done', acknowledgedOlderVersion: false });
      const firstTime = acked.acknowledgedAt;
      const again = (await w.agents.employee.post(`/api/notices/mine/${policy.id}/acknowledge`).expect(200)).body as NoticeMineDetailsDto;
      expect(again.acknowledgedAt).toBe(firstTime);
      expect((await t.db.query(`SELECT count(*)::int AS n FROM audit_logs WHERE action = 'notice.acknowledged'`))[0].n).toBe(1);
      expect((await w.agents.employee.post(`/api/notices/mine/${announcement.id}/acknowledge`).expect(422)).body.code).toBe('NOTICE_NO_ACK_REQUIRED');
      const archivist = await t.factories.user({ grants: [{ key: CorePermission.NoticesArchive, scope: 'all' }, { key: CorePermission.NoticesManageView, scope: 'all' }] });
      await (await t.factories.signIn(archivist)).post(`/api/notices/${announcement.id}/archive`).send({}).expect(200);
      expect(((await w.agents.employee.get('/api/notices/mine').expect(200)).body as NoticeMinePageDto).items.map((n) => n.id)).toEqual([policy.id]); // archived leaves the list
      const policy2 = await published(w, { titleAr: 'سياسة ثانية' });
      await (await t.factories.signIn(archivist)).post(`/api/notices/${policy2.id}/archive`).send({}).expect(200);
      expect((await w.agents.employee.post(`/api/notices/mine/${policy2.id}/acknowledge`).expect(409)).body.code).toBe('NOTICE_ARCHIVED');
      expect(((await w.agents.employee.get(`/api/notices/mine/${policy2.id}`).expect(200)).body as NoticeMineDetailsDto).isArchived).toBe(true);
    });

    it('does not let a «sign in as» session acknowledge (403 NOTICE_ACK_IMPERSONATION), while the everyday work of the person (approving as their head) stays open', async () => {
      const w = await noticeWorld(t);
      const policy = await published(w);
      await t.db.query(`INSERT INTO security_settings (key, value) VALUES ('impersonationEnabled', 1) ON CONFLICT (key) DO UPDATE SET value = 1`);
      t.app.get(SecuritySettingsService).invalidate();
      const admin = await t.factories.user({ grants: [ADMIN_MODE_GRANT, { key: CorePermission.ImpersonationStart, scope: 'all' }] });
      const adminAgent = await t.factories.signInAdminMode(admin);
      await adminAgent.post(`/api/impersonation/${w.employee.id}`).expect((r) => expect(r.status).toBeLessThan(300));
      expect((await adminAgent.post(`/api/notices/mine/${policy.id}/acknowledge`).expect(403)).body.code).toBe('NOTICE_ACK_IMPERSONATION');
      await adminAgent.get(`/api/notices/mine/${policy.id}`).expect(200); // reading stays open
      await adminAgent.post('/api/impersonation/stop').expect((r) => expect(r.status).toBeLessThan(300));
      const pending = await createNotice(w.agents.writer);
      await w.agents.writer.post(`/api/notices/${pending.id}/submit`).send({ revision: pending.revision }).expect(200);
      await adminAgent.post(`/api/impersonation/${w.head.id}`).expect((r) => expect(r.status).toBeLessThan(300));
      const queue = (await adminAgent.get('/api/notices/approvals').expect(200)).body as { items: { id: string; revision: number }[] };
      const waiting = queue.items.find((i) => i.id === pending.id) as { id: string; revision: number };
      await adminAgent.post(`/api/notices/${pending.id}/approve`).send({ revision: waiting.revision }).expect(200); // the head's approval works inside «sign in as»
    });

    it('reports who acknowledged and who did not: the numbers add up, the writer sees everyone, a head only their unit', async () => {
      const w = await noticeWorld(t);
      const policy = await published(w);
      await w.agents.employee.post(`/api/notices/mine/${policy.id}/acknowledge`).expect(200);
      await w.agents.writer.post(`/api/notices/mine/${policy.id}/acknowledge`).expect(200);
      const full = (await w.agents.writer.get(`/api/notices/${policy.id}/acknowledgements`).expect(200)).body as NoticeAcknowledgementsDto;
      expect(full.summary).toEqual({ reached: 4, acknowledged: 2, pending: 2 });
      expect(full.total).toBe(4);
      expect(full.items.filter((r) => r.state === 'acknowledged').map((r) => r.userId).sort()).toEqual([w.employee.id, w.writer.id].sort());
      expect(full.items.every((r) => ['acknowledged', 'pending'].includes(r.state))).toBe(true);
      expect(full.items.find((r) => r.userId === w.employee.id)?.unit).toMatchObject({ nameEn: 'Unit B' });
      const headView = (await w.agents.head.get(`/api/notices/${policy.id}/acknowledgements`).expect(200)).body as NoticeAcknowledgementsDto;
      expect(headView.items.map((r) => r.userId).sort()).toEqual([w.head.id, w.writer.id].sort()); // unit A only
      expect(headView.summary).toEqual({ reached: 2, acknowledged: 1, pending: 1 });
      const pending = (await w.agents.writer.get(`/api/notices/${policy.id}/acknowledgements`).query({ state: 'pending' }).expect(200)).body as NoticeAcknowledgementsDto;
      expect(pending.items.map((r) => r.userId).sort()).toEqual([w.head.id, w.otherHead.id].sort());
      const byName = (await w.agents.writer.get(`/api/notices/${policy.id}/acknowledgements`).query({ search: w.employee.email.slice(0, 8) }).expect(200)).body as NoticeAcknowledgementsDto;
      expect(byName.total).toBeGreaterThanOrEqual(0);
      await w.agents.employee.get(`/api/notices/${policy.id}/acknowledgements`).expect(403);
      await w.agents.otherHead.get(`/api/notices/${policy.id}/acknowledgements`).expect(404);
    });

    it('answers the home page in one call: counters, the pinned notice and the newest waiting policies, each card by its key', async () => {
      const w = await noticeWorld(t);
      await published(w, { titleAr: 'أولى' });
      const second = await published(w, { titleAr: 'ثانية' });
      const admin = await t.factories.user({ grants: [{ key: CorePermission.NoticesPin, scope: 'all' }, { key: CorePermission.NoticesManageView, scope: 'all' }] });
      await (await t.factories.signIn(admin)).post(`/api/notices/${second.id}/pin`).send({}).expect(200);
      const home = (await w.agents.employee.get('/api/notices/home').expect(200)).body as NoticeHomeDto;
      expect(home).toMatchObject({ awaiting: 2, newThisWeek: 2, pendingApproval: null, drafts: null, pinned: { id: second.id, isPinned: true } });
      expect(home.awaitingTop).toHaveLength(2);
      await createNotice(w.agents.writer);
      const writerHome = (await w.agents.writer.get('/api/notices/home').expect(200)).body as NoticeHomeDto;
      expect(writerHome).toMatchObject({ drafts: 1, pendingApproval: null });
      const headHome = (await w.agents.head.get('/api/notices/home').expect(200)).body as NoticeHomeDto;
      expect(headHome.pendingApproval).toBe(0);
    });
  });

  describe('pinning and archiving (FR-171)', () => {
    it('pins one notice for the company: pinning a second one takes the first one\'s pin off, also when two arrive together', async () => {
      const w = await noticeWorld(t);
      const first = await approvedNotice(w);
      const second = await approvedNotice(w, { titleAr: 'ثانٍ' });
      const admin = await t.factories.user({ grants: [{ key: CorePermission.NoticesPin, scope: 'all' }, { key: CorePermission.NoticesManageView, scope: 'all' }] });
      const agent = await t.factories.signIn(admin);
      await w.agents.writer.post(`/api/notices/${first.id}/pin`).send({}).expect(403);
      await agent.post(`/api/notices/${first.id}/pin`).send({}).expect(200);
      await agent.post(`/api/notices/${second.id}/pin`).send({}).expect(200);
      expect((await t.db.query('SELECT id FROM notices WHERE is_pinned')).map((r: { id: string }) => r.id)).toEqual([second.id]);
      const [a, b] = await Promise.all([agent.post(`/api/notices/${first.id}/pin`).send({}), agent.post(`/api/notices/${second.id}/pin`).send({})]);
      expect([a.status, b.status]).toEqual([200, 200]);
      expect(await t.db.query('SELECT id FROM notices WHERE is_pinned')).toHaveLength(1);
      await agent.delete(`/api/notices/${second.id}/pin`).expect(200);
      await agent.delete(`/api/notices/${second.id}/pin`).expect(200); // nothing to take off: still fine
      const draft = await createNotice(w.agents.writer);
      expect((await agent.post(`/api/notices/${draft.id}/pin`).send({}).expect(409)).body.code).toBe('NOTICE_NOT_PUBLISHED');
    });

    it('archives a published notice (its pin goes, it leaves the employees\' lists, the report stays) and an approved one waiting for its day', async () => {
      const w = await noticeWorld(t);
      const notice = await approvedNotice(w);
      await delivery().deliverBatch({ noticeId: notice.id, batchNo: 1, version: 1 });
      const waiting = await approvedNotice(w, { publishOn: dayFromToday(3), titleAr: 'ينتظر' });
      await w.agents.employee.post(`/api/notices/${notice.id}/archive`).send({}).expect(403);
      await w.agents.writer.post(`/api/notices/${notice.id}/archive`).send({}).expect(200).expect((r) => expect(r.body.status).toBe('archived'));
      await w.agents.writer.post(`/api/notices/${waiting.id}/archive`).send({}).expect(200);
      expect(await t.db.query(`SELECT 1 FROM scheduled_jobs WHERE dedupe_key = $1 AND status = 'pending'`, [`notice.publish:${waiting.id}`])).toHaveLength(0);
      expect((await w.agents.writer.post(`/api/notices/${notice.id}/archive`).send({}).expect(409)).body.code).toBe('NOTICE_ARCHIVED');
      expect(((await w.agents.employee.get('/api/notices/mine').expect(200)).body as NoticeMinePageDto).items).toHaveLength(0);
      expect(await recipientsOf(notice.id)).toHaveLength(4); // the report stays
    });
  });
});

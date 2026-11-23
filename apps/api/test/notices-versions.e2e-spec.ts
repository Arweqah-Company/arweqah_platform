import type { NoticeAcknowledgementsDto, NoticeDetailsDto, NoticeMineDetailsDto, NoticeMinePageDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { NoticeDeliveryService } from '../src/modules/notices/application/services/notice-delivery.service';
import { approvedNotice, noticeBody, noticeWorld, type NoticeWorld } from './helpers/notices';
import { useTestApp } from './setup/test-app';

describe('Notices: a new version of a published notice (FR-176)', () => {
  const t = useTestApp();
  const delivery = () => t.app.get(NoticeDeliveryService);

  /** A published policy that reached everybody; the employee and the writer acknowledged it. */
  async function publishedPolicy(w: NoticeWorld, overrides: Record<string, unknown> = {}) {
    const notice = await approvedNotice(w, overrides);
    await delivery().deliverBatch({ noticeId: notice.id, batchNo: 1, version: 1 });
    return notice;
  }
  const visibleIds = async (w: NoticeWorld): Promise<string[]> => ((await w.agents.employee.get('/api/notices/mine').expect(200)).body as NoticeMinePageDto).items.map((n) => n.id);
  const revise = (w: NoticeWorld, id: string) => w.agents.writer.post(`/api/notices/${id}/revise`).send({});
  const edit = (w: NoticeWorld, id: string, overrides: Record<string, unknown> = {}) => w.agents.writer.put(`/api/notices/${id}`).send({ ...noticeBody({ titleAr: 'الإصدار الثاني', body: '<p>نص جديد</p>', ...overrides }), publishOn: undefined });

  it('hides the published version at once when the writer starts a new one (acknowledgements stay), and only the writer may start it', async () => {
    const w = await noticeWorld(t);
    const notice = await publishedPolicy(w);
    await w.agents.employee.post(`/api/notices/mine/${notice.id}/acknowledge`).expect(200);
    expect(await visibleIds(w)).toEqual([notice.id]);
    await w.agents.head.post(`/api/notices/${notice.id}/revise`).send({}).expect(403);
    await w.agents.otherHead.post(`/api/notices/${notice.id}/revise`).send({}).expect(403);
    await w.agents.employee.post(`/api/notices/${notice.id}/revise`).send({}).expect(403);
    const started = (await revise(w, notice.id).expect(200)).body as NoticeDetailsDto;
    expect(started).toMatchObject({ status: 'revising', version: 2, hiddenForRevision: true, isPinned: false, publishOn: null });
    expect(started.versions.map((v) => [v.version, v.isDraft])).toEqual([[1, false], [2, true]]);
    expect(started.abilities).toMatchObject({ edit: true, submit: true, reviseCancel: true, revise: false, archive: true });
    expect(await visibleIds(w)).toEqual([]); // hidden from «my notices»
    await w.agents.employee.get(`/api/notices/mine/${notice.id}`).expect(404);
    const home = (await w.agents.employee.get('/api/notices/home').expect(200)).body;
    expect(home).toMatchObject({ awaiting: 0, newThisWeek: 0, pinned: null });
    expect((await t.db.query(`SELECT acknowledged_version FROM notice_recipients WHERE user_id = $1`, [w.employee.id]))[0].acknowledged_version).toBe(1);
    expect((await revise(w, notice.id).expect(409)).body.code).toBe('NOTICE_NOT_PUBLISHED');
  });

  it('publishes the new version as soon as it is approved: people are told, and those who acknowledged the old one must acknowledge again', async () => {
    const w = await noticeWorld(t);
    const notice = await publishedPolicy(w);
    await w.agents.employee.post(`/api/notices/mine/${notice.id}/acknowledge`).expect(200);
    await revise(w, notice.id).expect(200);
    const edited = (await edit(w, notice.id).expect(200)).body as NoticeDetailsDto;
    expect(edited).toMatchObject({ status: 'revising', titleAr: 'الإصدار الثاني', publishOn: null });
    expect(edited.versions.find((v) => v.version === 1)?.titleAr).toBe('سياسة السفر'); // the published version never changes
    expect((await w.agents.writer.put(`/api/notices/${notice.id}`).send(noticeBody({ channelCode: 'corporate_comms' })).expect(409)).body.code).toBe('NOTICE_NOT_EDITABLE'); // a new version keeps its channel
    const sent = (await w.agents.writer.post(`/api/notices/${notice.id}/submit`).send({}).expect(200)).body as NoticeDetailsDto;
    expect(sent).toMatchObject({ status: 'pending_approval', hiddenForRevision: true, approver: { id: w.head.id } });
    expect(await visibleIds(w)).toEqual([]);
    const waiting = (await w.agents.head.get('/api/notices/approvals').expect(200)).body;
    expect(waiting.items[0]).toMatchObject({ id: notice.id, version: 2 });
    const approved = (await w.agents.head.post(`/api/notices/${notice.id}/approve`).send({}).expect(200)).body as NoticeDetailsDto;
    expect(approved).toMatchObject({ status: 'published', version: 2, hiddenForRevision: false });
    const queued = await t.db.query(`SELECT payload FROM outbox_messages WHERE topic = 'notices.deliver-batch' ORDER BY created_at DESC LIMIT 1`);
    expect(queued[0].payload).toMatchObject({ noticeId: notice.id, batchNo: 1, version: 2 });
    // before the batch: back in «waiting» for the employee, who acknowledged version 1
    const back = (await w.agents.employee.get(`/api/notices/mine/${notice.id}`).expect(200)).body as NoticeMineDetailsDto;
    expect(back).toMatchObject({ version: 2, myState: 'await', acknowledgedOlderVersion: true, titleAr: 'الإصدار الثاني', body: '<p>نص جديد</p>' });
    await delivery().deliverBatch({ noticeId: notice.id, batchNo: 1, version: 2 });
    const bells: { n: number }[] = await t.db.query(`SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND link LIKE '/notices?open=%'`, [w.employee.id]);
    expect(bells[0]?.n).toBe(2); // «new notice», then «updated»
    await delivery().deliverBatch({ noticeId: notice.id, batchNo: 1, version: 2 });
    expect((await t.db.query(`SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND link LIKE '/notices?open=%'`, [w.employee.id]))[0].n).toBe(2);
    const report = (await w.agents.writer.get(`/api/notices/${notice.id}/acknowledgements`).expect(200)).body as NoticeAcknowledgementsDto;
    expect(report.items.find((r) => r.userId === w.employee.id)).toMatchObject({ state: 'older_version', acknowledgedVersion: 1 });
    expect(report.summary.acknowledged).toBe(0);
    const again = (await w.agents.employee.post(`/api/notices/mine/${notice.id}/acknowledge`).expect(200)).body as NoticeMineDetailsDto;
    expect(again).toMatchObject({ myState: 'done', acknowledgedOlderVersion: false });
    const flow = (await w.agents.writer.get(`/api/notices/${notice.id}/flow`).expect(200)).body;
    expect(flow.steps.map((s: { event: string }) => s.event)).toEqual(['created', 'submitted', 'approved', 'published', 'revision_started', 'submitted', 'approved']);
    expect(flow.steps[4]).toMatchObject({ version: 2 });
  });

  it('keeps the notice hidden when the new version is rejected, until the writer edits and the head approves', async () => {
    const w = await noticeWorld(t);
    const notice = await publishedPolicy(w);
    await revise(w, notice.id).expect(200);
    await edit(w, notice.id).expect(200);
    await w.agents.writer.post(`/api/notices/${notice.id}/submit`).send({}).expect(200);
    const rejected = (await w.agents.head.post(`/api/notices/${notice.id}/reject`).send({ reason: 'غير مكتمل' }).expect(200)).body as NoticeDetailsDto;
    expect(rejected).toMatchObject({ status: 'rejected', hiddenForRevision: true });
    expect(await visibleIds(w)).toEqual([]);
    expect((await edit(w, notice.id, { titleAr: 'الإصدار الثاني معدّل' }).expect(200)).body).toMatchObject({ status: 'revising', titleAr: 'الإصدار الثاني معدّل' });
    await w.agents.writer.post(`/api/notices/${notice.id}/submit`).send({}).expect(200);
    await w.agents.head.post(`/api/notices/${notice.id}/approve`).send({}).expect(200);
    expect(await visibleIds(w)).toEqual([notice.id]);
  });

  it('brings the published version back at once, with its acknowledgements and without telling anybody, when the change is cancelled', async () => {
    const w = await noticeWorld(t);
    const notice = await publishedPolicy(w);
    await w.agents.employee.post(`/api/notices/mine/${notice.id}/acknowledge`).expect(200);
    const bellsBefore = (await t.db.query(`SELECT count(*)::int AS n FROM notifications`))[0].n;
    expect((await w.agents.writer.post(`/api/notices/${notice.id}/revise-cancel`).send({}).expect(409)).body.code).toBe('NOTICE_NOT_REVISING');
    await revise(w, notice.id).expect(200);
    await w.agents.head.post(`/api/notices/${notice.id}/revise-cancel`).send({}).expect(403);
    const cancelled = (await w.agents.writer.post(`/api/notices/${notice.id}/revise-cancel`).send({}).expect(200)).body as NoticeDetailsDto;
    expect(cancelled).toMatchObject({ status: 'published', version: 1, hiddenForRevision: false });
    expect(cancelled.versions).toHaveLength(1);
    expect(await visibleIds(w)).toEqual([notice.id]);
    expect(((await w.agents.employee.get(`/api/notices/mine/${notice.id}`).expect(200)).body as NoticeMineDetailsDto).myState).toBe('done');
    expect((await t.db.query(`SELECT count(*)::int AS n FROM notifications`))[0].n).toBe(bellsBefore);
    expect(await t.db.query('SELECT 1 FROM notice_audiences WHERE notice_id = $1 AND version = 2', [notice.id])).toHaveLength(0);
  });

  it('withdraws a new version waiting for approval (the head is told) and a rejected one, both bringing the published version back', async () => {
    const w = await noticeWorld(t);
    const notice = await publishedPolicy(w);
    await revise(w, notice.id).expect(200);
    await w.agents.writer.post(`/api/notices/${notice.id}/submit`).send({}).expect(200);
    expect((await w.agents.writer.post(`/api/notices/${notice.id}/revise-cancel`).send({}).expect(200)).body.status).toBe('published');
    expect((await t.db.query(`SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND link = '/notices/approvals'`, [w.head.id]))[0].n).toBe(3); // «waiting» for the first publication, «waiting» for the new version, then «withdrawn»
    expect((await w.agents.head.get('/api/notices/approvals').expect(200)).body.items).toEqual([]);
    await revise(w, notice.id).expect(200);
    await w.agents.writer.post(`/api/notices/${notice.id}/submit`).send({}).expect(200);
    await w.agents.head.post(`/api/notices/${notice.id}/reject`).send({ reason: 'غير مناسب' }).expect(200);
    expect((await w.agents.writer.post(`/api/notices/${notice.id}/revise-cancel`).send({}).expect(200)).body).toMatchObject({ status: 'published', version: 1 });
    expect(await visibleIds(w)).toEqual([notice.id]);
  });

  it('shows an announcement as new again after a new version (nobody has read it), and archiving a notice being revised drops the waiting version', async () => {
    const w = await noticeWorld(t);
    const notice = await publishedPolicy(w, { kind: 'announcement' });
    await w.agents.employee.post(`/api/notices/mine/${notice.id}/read`).expect(200);
    expect(((await w.agents.employee.get(`/api/notices/mine/${notice.id}`).expect(200)).body as NoticeMineDetailsDto).readAt).not.toBeNull();
    await revise(w, notice.id).expect(200);
    await edit(w, notice.id).expect(200);
    await w.agents.writer.post(`/api/notices/${notice.id}/submit`).send({}).expect(200);
    await w.agents.head.post(`/api/notices/${notice.id}/approve`).send({}).expect(200);
    expect(((await w.agents.employee.get(`/api/notices/mine/${notice.id}`).expect(200)).body as NoticeMineDetailsDto).readAt).toBeNull();
    const other = await publishedPolicy(w, { titleAr: 'أخرى' });
    await revise(w, other.id).expect(200);
    expect((await w.agents.writer.post(`/api/notices/${other.id}/archive`).send({}).expect(200)).body).toMatchObject({ status: 'archived' });
    expect(await t.db.query('SELECT version FROM notice_versions WHERE notice_id = $1', [other.id])).toHaveLength(1);
  });

  it('is refused to anyone but the writer for the changes, and a head of another unit has no key for them', async () => {
    const w = await noticeWorld(t);
    const notice = await publishedPolicy(w);
    await revise(w, notice.id).expect(200);
    await w.agents.head.put(`/api/notices/${notice.id}`).send(noticeBody()).expect(403);
    await w.agents.head.post(`/api/notices/${notice.id}/submit`).send({}).expect(403);
    await w.agents.otherHead.post(`/api/notices/${notice.id}/revise-cancel`).send({}).expect(403);
  });
});

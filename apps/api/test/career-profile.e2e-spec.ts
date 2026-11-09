import { CorePermission, type MyCareerProfileDto, type PermissionGrant, type ReopenAcknowledgementResultDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { complete } from './helpers/career-content';
import { chainScenario } from './helpers/title-chain';
import { useTestApp } from './setup/test-app';

const HR_KEYS = [CorePermission.CareerContentView, CorePermission.CareerContentEdit, CorePermission.CareerTitlefilePublish, CorePermission.CareerAcknowledgeReopen];
const hrGrants = (without?: string): PermissionGrant[] => HR_KEYS.filter((k) => k !== without).map((key) => ({ key, scope: 'all' as const }));

describe('The employee\'s own career path and its acknowledgement (FR-111, FR-112)', () => {
  const t = useTestApp();

  async function setup(hr: PermissionGrant[] = hrGrants()) {
    const s = await chainScenario(t);
    const hrAgent = await t.factories.signIn(await t.factories.user({ grants: hr }));
    const holder = await s.person(s.rep, s.group);
    const me = await t.factories.signIn(holder);
    /** Saves a complete path for a title and sets it ready. */
    const ready = async (titleId: string, summary = 'ملخص') => {
      await hrAgent.put(`/api/career/titles/${titleId}/content`).send({ content: { ...complete, summary } }).expect(200);
      await hrAgent.post(`/api/career/titles/${titleId}/publish`).expect(200);
    };
    const mine = async () => (await me.get('/api/career-profile/me').expect(200)).body as MyCareerProfileDto;
    return { ...s, hrAgent, holder, me, ready, mine };
  }

  it('says the path is not available while the employee\'s title has no ready path, and holds nobody back', async () => {
    const s = await setup();
    expect(await s.mine()).toMatchObject({ available: false, ackRequired: false, content: null, contentVersion: null });
    await s.hrAgent.put(`/api/career/titles/${s.rep.id}/content`).send({ content: complete }).expect(200); // saved, still a draft
    expect(await s.mine()).toMatchObject({ available: false, ackRequired: false });
  });

  it('shows the ready path of the title they hold and holds them back until they acknowledge it (first sign-in)', async () => {
    const s = await setup();
    await s.ready(s.rep.id);
    const me = await s.mine();
    expect(me).toMatchObject({ available: true, titleId: s.rep.id, titleCode: s.rep.code, contentVersion: 1, ackRequired: true, ackReason: 'first', acknowledgedAt: null });
    expect(me.content?.summary).toBe('ملخص');
    // who is reading: their name and manager, the title's grade, track and unit, and the development stage of that grade and track
    expect(me).toMatchObject({ grade: 7, track: 'P', unitNameEn: 'Sales', employeeName: expect.any(String), managerName: null, stage: { code: 'specialization', hoursPerYear: 48, budgetCap: 5000 } });
    expect(me.content?.learning.periods[0]?.units[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('records the acknowledgement of the version read, and stops holding them back', async () => {
    const s = await setup();
    await s.ready(s.rep.id);
    const done = (await s.me.post('/api/career-profile/me/acknowledge').send({ contentVersion: 1 }).expect(200)).body as MyCareerProfileDto;
    expect(done).toMatchObject({ ackRequired: false, ackReason: null, acknowledgedVersion: 1 });
    expect(done.acknowledgedAt).not.toBeNull();
    const rows = (await t.db.query('SELECT content_version FROM career_acknowledgements WHERE employee_id = $1', [s.holder.employeeId])) as { content_version: number }[];
    expect(rows).toEqual([{ content_version: 1 }]);
    await s.me.post('/api/career-profile/me/acknowledge').send({ contentVersion: 1 }).expect(200); // twice is still one
    expect(((await t.db.query('SELECT count(*)::int AS n FROM career_acknowledgements'))[0] as { n: number }).n).toBe(1);
  });

  it('refuses an acknowledgement of a version that is no longer the current one (409), and one with nothing to acknowledge (422)', async () => {
    const s = await setup();
    await s.me.post('/api/career-profile/me/acknowledge').send({ contentVersion: 1 }).expect(422);
    await s.ready(s.rep.id);
    await s.hrAgent.put(`/api/career/titles/${s.rep.id}/content`).send({ content: { ...complete, summary: 'نسخة ثانية' } }).expect(200);
    const res = await s.me.post('/api/career-profile/me/acknowledge').send({ contentVersion: 1 }).expect(409);
    expect(res.body).toMatchObject({ code: 'CAREER_CONTENT_STALE' });
    await s.me.post('/api/career-profile/me/acknowledge').send({ contentVersion: 2 }).expect(200);
    await s.me.post('/api/career-profile/me/acknowledge').send({ contentVersion: 0 }).expect(400);
    await s.me.post('/api/career-profile/me/acknowledge').send({ contentVersion: 2, extra: 1 }).expect(400);
  });

  it('asks the holders again when HR reopens the acknowledgement, with the number it affects, and not before it is ready', async () => {
    const s = await setup();
    await s.hrAgent.post(`/api/career/titles/${s.rep.id}/reopen-acknowledgement`).send({ reason: 'تغيّر الوصف الوظيفي' }).expect(422);
    await s.ready(s.rep.id);
    await s.me.post('/api/career-profile/me/acknowledge').send({ contentVersion: 1 }).expect(200);
    await s.hrAgent.post(`/api/career/titles/${s.rep.id}/reopen-acknowledgement`).send({ reason: 'ق' }).expect(400);
    const res = (await s.hrAgent.post(`/api/career/titles/${s.rep.id}/reopen-acknowledgement`).send({ reason: 'تغيّر الوصف الوظيفي' }).expect(200)).body as ReopenAcknowledgementResultDto;
    expect(res.affected).toBe(1);
    expect(await s.mine()).toMatchObject({ ackRequired: true, ackReason: 'reopened' });
    await s.me.post('/api/career-profile/me/acknowledge').send({ contentVersion: 1 }).expect(200);
    expect(await s.mine()).toMatchObject({ ackRequired: false });
  });

  it('asks again when the title they hold changes (a title whose path is ready, not acknowledged yet)', async () => {
    const s = await setup();
    await s.ready(s.rep.id);
    await s.ready(s.lead.id, 'مسار آخر');
    await s.me.post('/api/career-profile/me/acknowledge').send({ contentVersion: 1 }).expect(200);
    await t.db.query('UPDATE employees SET job_title_id = $1 WHERE id = $2', [s.lead.id, s.holder.employeeId]);
    expect(await s.mine()).toMatchObject({ titleId: s.lead.id, ackRequired: true, ackReason: 'title' });
  });

  it('holds back the system account like anyone, and says it is exempt while platform admin mode is on (the web applies that)', async () => {
    const s = await setup();
    await s.ready(s.rep.id);
    expect(await s.mine()).toMatchObject({ ackRequired: true, adminModeExempt: false });
    await t.db.query('UPDATE employees SET is_system_account = true WHERE id = $1', [s.holder.employeeId]);
    expect(await s.mine()).toMatchObject({ available: true, ackRequired: true, adminModeExempt: true });
    await s.me.post('/api/career-profile/me/acknowledge').send({ contentVersion: 1 }).expect(200);
    expect(await s.mine()).toMatchObject({ ackRequired: false, adminModeExempt: true });
  });

  it('answers 403 without the key of each route, and 404 when HR reopens a title that does not exist', async () => {
    const s = await setup(hrGrants(CorePermission.CareerAcknowledgeReopen));
    await s.ready(s.rep.id);
    await s.hrAgent.post(`/api/career/titles/${s.rep.id}/reopen-acknowledgement`).send({ reason: 'تغيّر الوصف الوظيفي' }).expect(403);
    const noView = await t.factories.signIn(await t.factories.user({ unit: undefined, grants: [], bare: true }));
    await noView.get('/api/career-profile/me').expect(403);
    await noView.post('/api/career-profile/me/acknowledge').send({ contentVersion: 1 }).expect(403);
    const full = await setup();
    await full.hrAgent.post('/api/career/titles/00000000-0000-4000-8000-000000000999/reopen-acknowledgement').send({ reason: 'تغيّر الوصف الوظيفي' }).expect(404);
  });

  it('writes the audit entries of an acknowledgement and a reopening', async () => {
    const s = await setup();
    await s.ready(s.rep.id);
    await s.me.post('/api/career-profile/me/acknowledge').send({ contentVersion: 1 }).expect(200);
    await s.hrAgent.post(`/api/career/titles/${s.rep.id}/reopen-acknowledgement`).send({ reason: 'تغيّر الوصف الوظيفي' }).expect(200);
    const rows = await vi.waitFor(async () => {
      const found = (await t.db.query(`SELECT action FROM audit_logs WHERE action IN ('career.acknowledged', 'career.acknowledgement.reopened') ORDER BY created_at`)) as { action: string }[];
      expect(found).toHaveLength(2);
      return found;
    });
    expect(rows.map((r) => r.action)).toEqual(['career.acknowledged', 'career.acknowledgement.reopened']);
  });
});

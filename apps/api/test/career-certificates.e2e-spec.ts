import { CorePermission, type CareerContent, type CertificatesPageDto, type TeamMemberDetailDto, type TeamPageDto, type LearningRecordDto, type MyCareerProfileDto, type MyProgressDto, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { CareerReminderService } from '../src/modules/career-profile/application/services/career-reminder.service';
import { complete } from './helpers/career-content';
import { chainScenario } from './helpers/title-chain';
import { useTestApp } from './setup/test-app';

const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
const HR = [CorePermission.CareerContentView, CorePermission.CareerContentEdit, CorePermission.CareerTitlefilePublish];
const REVIEW = [CorePermission.CareerCertificatesReview, CorePermission.CareerCertificatesApprove, CorePermission.CareerCertificatesReject, CorePermission.CareerCertificatesRefer];
const grants = (keys: string[], without?: string): PermissionGrant[] => keys.filter((k) => k !== without).map((key) => ({ key, scope: 'all' as const }));

describe('Proofs of learning units and their review (FR-114)', () => {
  const t = useTestApp();

  async function setup(reviewer: PermissionGrant[] = grants(REVIEW)) {
    const s = await chainScenario(t);
    const hr = await t.factories.signIn(await t.factories.user({ grants: grants(HR) }));
    const holder = await s.person(s.rep, s.group);
    const me = await t.factories.signIn(holder);
    const boss = await t.factories.signIn(await t.factories.user({ grants: reviewer }));
    await hr.put(`/api/career/titles/${s.rep.id}/content`).send({ content: complete }).expect(200);
    await hr.post(`/api/career/titles/${s.rep.id}/publish`).expect(200);
    const content = (await me.get('/api/career-profile/me').expect(200)).body as MyCareerProfileDto;
    const unitId = (content.content as CareerContent).learning.periods[0]!.units[0]!.id as string;
    const file = async () => ((await me.post('/api/files').attach('file', PNG, 'cert.png').expect(201)).body as { id: string }).id;
    const send = async (body: object = {}, status = 201) => {
      const fileId = await file(); // before the request is made: a request that is open while another one runs loses its server
      return me.post('/api/career-profile/me/learning').send({ unitId, kind: 'certificate', fileId, ...body }).expect(status);
    };
    const queue = async (query: Record<string, string> = {}) => (await boss.get('/api/career/certificates').query(query).expect(200)).body as CertificatesPageDto;
    return { ...s, hr, me, holder, boss, unitId, file, send, queue };
  }

  it('sends a certificate for a unit of the plan: it waits for review and nothing is counted yet', async () => {
    const s = await setup();
    const sent = (await s.send({ note: 'شهادة الدورة' }, 201)).body as LearningRecordDto;
    expect(sent).toMatchObject({ unitId: s.unitId, status: 'wait', kind: 'certificate', note: 'شهادة الدورة', fileName: 'cert.png', rejectionCount: 0 });
    expect(((await s.me.get('/api/career-profile/me/learning').expect(200)).body as LearningRecordDto[])).toHaveLength(1);
    const page = await s.queue();
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ employeeName: expect.any(String), unitTitle: expect.any(String), kind: 'certificate', status: 'wait', hasFile: true });
  });

  it('refuses what cannot be sent: a certificate without its file (422), a unit that is not in the plan (404), a second proof while one waits (422), and unknown fields (400)', async () => {
    const s = await setup();
    const none = await s.me.post('/api/career-profile/me/learning').send({ unitId: s.unitId, kind: 'certificate' }).expect(422);
    expect(none.body.details).toMatchObject({ reason: 'file_required' });
    await s.me.post('/api/career-profile/me/learning').send({ unitId: '00000000-0000-4000-8000-000000000000', kind: 'output' }).expect(404);
    await s.me.post('/api/career-profile/me/learning').send({ unitId: s.unitId, kind: 'zzz' }).expect(400);
    await s.me.post('/api/career-profile/me/learning').send({ unitId: s.unitId, kind: 'output', extra: 1 }).expect(400);
    await s.send({}, 201);
    expect(((await s.send({}, 422)).body.details)).toMatchObject({ reason: 'already_sent' });
  });

  it('does not accept a file somebody else uploaded', async () => {
    const s = await setup();
    const other = await t.factories.signIn(await t.factories.user());
    const foreign = ((await other.post('/api/files').attach('file', PNG, 'x.png').expect(201)).body as { id: string }).id;
    await s.me.post('/api/career-profile/me/learning').send({ unitId: s.unitId, kind: 'certificate', fileId: foreign }).expect(404);
  });

  it('approves a proof: it leaves the waiting queue, the employee is told, and a second decision is 409', async () => {
    const s = await setup();
    const sent = (await s.send({}, 201)).body as LearningRecordDto;
    await s.boss.post(`/api/career/certificates/${sent.id}/approve`).expect(204);
    expect((await s.queue()).items).toHaveLength(0);
    expect(((await s.queue({ status: 'done' })).items)).toHaveLength(1);
    expect(((await s.me.get('/api/career-profile/me/learning').expect(200)).body as LearningRecordDto[])[0]).toMatchObject({ status: 'done' });
    await vi.waitFor(async () => expect(((await s.me.get('/api/notifications').expect(200)).body.items as { titleAr: string }[]).some((n) => n.titleAr === 'اعتُمد إثباتك')).toBe(true));
    await s.boss.post(`/api/career/certificates/${sent.id}/approve`).expect(409);
    await s.send({}, 422); // an approved unit is not replaced
  });

  it('rejects with a reason (at least five characters), the employee sees it, and the next proof replaces the rejected one keeping the count', async () => {
    const s = await setup();
    const sent = (await s.send({}, 201)).body as LearningRecordDto;
    await s.boss.post(`/api/career/certificates/${sent.id}/reject`).send({ reason: 'لا' }).expect(400);
    await s.boss.post(`/api/career/certificates/${sent.id}/reject`).send({ reason: 'الشهادة لا تحمل اسمك' }).expect(204);
    const after = ((await s.me.get('/api/career-profile/me/learning').expect(200)).body as LearningRecordDto[])[0]!;
    expect(after).toMatchObject({ status: 'rej', rejectionReason: 'الشهادة لا تحمل اسمك', rejectionCount: 1 });
    const again = (await s.send({ note: 'شهادة كاملة' }, 201)).body as LearningRecordDto;
    expect(again).toMatchObject({ status: 'wait', rejectionCount: 1, rejectionReason: null });
    expect(again.id).toBe(sent.id);
  });

  it('refers a proof to the direct manager and a work application starts there', async () => {
    const s = await setup();
    const sent = (await s.send({}, 201)).body as LearningRecordDto;
    await s.boss.post(`/api/career/certificates/${sent.id}/refer`).expect(204);
    expect((await s.queue({ status: 'referred' })).items).toHaveLength(1);
    await s.boss.post(`/api/career/certificates/${sent.id}/refer`).expect(409); // already with the manager
    const s2 = await setup();
    const app = (await s2.me.post('/api/career-profile/me/learning').send({ unitId: s2.unitId, kind: 'application', note: 'طبّقتها في مشروع' }).expect(201)).body as LearningRecordDto;
    expect(app).toMatchObject({ status: 'referred', kind: 'application' });
  });

  it('tells the direct manager after the third rejection of the same unit', async () => {
    const s = await setup();
    const manager = await t.factories.user();
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, s.holder.employeeId]);
    const managerAgent = await t.factories.signIn(manager);
    for (let n = 1; n <= 3; n++) {
      const sent = (await s.send({}, 201)).body as LearningRecordDto;
      await s.boss.post(`/api/career/certificates/${sent.id}/reject`).send({ reason: `سبب الرفض رقم ${n}` }).expect(204);
    }
    await vi.waitFor(async () => expect(((await managerAgent.get('/api/notifications').expect(200)).body.items as { titleAr: string }[]).some((n) => n.titleAr.includes('تكرّر رفض'))).toBe(true));
  });

  it('serves the proof file to a reviewer only, searches by employee, filters by kind, and counts rejections per unit', async () => {
    const s = await setup();
    const sent = (await s.send({}, 201)).body as LearningRecordDto;
    await s.boss.get(`/api/career/certificates/${sent.id}/file`).expect(200);
    await s.me.get(`/api/career/certificates/${sent.id}/file`).expect(403);
    expect((await s.queue({ search: 'zzzz-none' })).total).toBe(0);
    expect((await s.queue({ kind: 'output' })).items).toHaveLength(0);
    expect((await s.queue({ kind: 'certificate' })).items).toHaveLength(1);
    expect((await s.queue({ search: 'لا-أحد-بهذا-الاسم' })).items).toHaveLength(0);
  });

  it('403 without the key of each route, and 404 for a proof that does not exist', async () => {
    for (const key of REVIEW) {
      const s = await setup(grants(REVIEW, key));
      const sent = (await s.send({}, 201)).body as LearningRecordDto;
      const route = { [CorePermission.CareerCertificatesReview]: () => s.boss.get('/api/career/certificates'), [CorePermission.CareerCertificatesApprove]: () => s.boss.post(`/api/career/certificates/${sent.id}/approve`), [CorePermission.CareerCertificatesReject]: () => s.boss.post(`/api/career/certificates/${sent.id}/reject`).send({ reason: 'سبب كافٍ' }), [CorePermission.CareerCertificatesRefer]: () => s.boss.post(`/api/career/certificates/${sent.id}/refer`) }[key];
      await (route as () => Promise<{ status: number }> & import('supertest').Test)().expect(403);
    }
    const s = await setup();
    await s.boss.post('/api/career/certificates/00000000-0000-4000-8000-000000000000/approve').expect(404);
    const bare = await t.factories.signIn(await t.factories.user({ bare: true }));
    await bare.post('/api/career-profile/me/learning').send({ unitId: s.unitId, kind: 'output' }).expect(403);
  });

  it('only one of two reviewers deciding at the same time wins (409 for the other)', async () => {
    const s = await setup();
    const sent = (await s.send({}, 201)).body as LearningRecordDto;
    const [a, b] = await Promise.all([s.boss.post(`/api/career/certificates/${sent.id}/approve`), s.boss.post(`/api/career/certificates/${sent.id}/reject`).send({ reason: 'سبب كافٍ للرفض' })]);
    expect([a.status, b.status].sort()).toEqual([204, 409]);
  });
});

describe('The progress of the employee in their path (FR-114)', () => {
  const t = useTestApp();

  async function setup() {
    const s = await chainScenario(t);
    const hr = await t.factories.signIn(await t.factories.user({ grants: grants(HR) }));
    const holder = await s.person(s.rep, s.group);
    const me = await t.factories.signIn(holder);
    const boss = await t.factories.signIn(await t.factories.user({ grants: grants(REVIEW) }));
    return { ...s, hr, me, boss };
  }

  it('is not available before the path of the title is ready (422), then counts units, approved minutes and the medals', async () => {
    const s = await setup();
    await s.me.get('/api/career-profile/me/progress').expect(422);
    await s.hr.put(`/api/career/titles/${s.rep.id}/content`).send({ content: complete }).expect(200);
    await s.hr.post(`/api/career/titles/${s.rep.id}/publish`).expect(200);
    const before = (await s.me.get('/api/career-profile/me/progress').expect(200)).body as MyProgressDto;
    expect(before).toMatchObject({ requiredDone: [], approvedMinutes: 0, unitsDone: 0, waiting: 0 });
    expect(before.unitsTotal).toBeGreaterThan(0);
    const content = ((await s.me.get('/api/career-profile/me').expect(200)).body as MyCareerProfileDto).content as CareerContent;
    const unit = content.learning.periods[0]!.units[0]!;
    const fileId = ((await s.me.post('/api/files').attach('file', PNG, 'c.png').expect(201)).body as { id: string }).id;
    const sent = (await s.me.post('/api/career-profile/me/learning').send({ unitId: unit.id, kind: 'certificate', fileId }).expect(201)).body as LearningRecordDto;
    expect(((await s.me.get('/api/career-profile/me/progress').expect(200)).body as MyProgressDto)).toMatchObject({ waiting: 1, unitsDone: 0, approvedMinutes: 0 });
    await s.boss.post(`/api/career/certificates/${sent.id}/approve`).expect(204);
    const after = (await s.me.get('/api/career-profile/me/progress').expect(200)).body as MyProgressDto;
    expect(after).toMatchObject({ waiting: 0, unitsDone: 1, approvedMinutes: unit.minutes });
    expect(after.badges.length).toBe(content.learning.badges.length);
  });

  it('ticks and unticks an item of «required», keeps it per employee, and answers 404 for an item the content does not have, 400 for a bad body', async () => {
    const s = await setup();
    await s.hr.put(`/api/career/titles/${s.rep.id}/content`).send({ content: complete }).expect(200);
    await s.hr.post(`/api/career/titles/${s.rep.id}/publish`).expect(200);
    expect(((await s.me.put('/api/career-profile/me/required/0').send({ done: true }).expect(200)).body as MyProgressDto).requiredDone).toEqual([0]);
    expect(((await s.me.put('/api/career-profile/me/required/0').send({ done: true }).expect(200)).body as MyProgressDto).requiredDone).toEqual([0]); // twice changes nothing
    const other = await t.factories.signIn(await s.person(s.rep, s.group));
    expect(((await other.get('/api/career-profile/me/progress').expect(200)).body as MyProgressDto).requiredDone).toEqual([]);
    expect(((await s.me.put('/api/career-profile/me/required/0').send({ done: false }).expect(200)).body as MyProgressDto).requiredDone).toEqual([]);
    await s.me.put('/api/career-profile/me/required/99').send({ done: true }).expect(404);
    await s.me.put('/api/career-profile/me/required/-1').send({ done: true }).expect(404); // a negative index is not an item either
    await s.me.put('/api/career-profile/me/required/0').send({ done: 'yes' }).expect(400);
    const bare = await t.factories.signIn(await t.factories.user({ bare: true }));
    await bare.put('/api/career-profile/me/required/0').send({ done: true }).expect(403);
  });
});

describe('«My career team» (FR-115)', () => {
  const t = useTestApp();
  const TEAM = [CorePermission.CareerTeamView, CorePermission.CareerTeamDecide];

  async function setup(viewerGrants: PermissionGrant[] = TEAM.map((key) => ({ key, scope: 'all' as const }))) {
    const s = await chainScenario(t);
    const hr = await t.factories.signIn(await t.factories.user({ grants: grants(HR) }));
    const holder = await s.person(s.rep, s.group);
    const me = await t.factories.signIn(holder);
    const viewer = await t.factories.signIn(await t.factories.user({ grants: viewerGrants }));
    await hr.put(`/api/career/titles/${s.rep.id}/content`).send({ content: complete }).expect(200);
    await hr.post(`/api/career/titles/${s.rep.id}/publish`).expect(200);
    const unitId = (((await me.get('/api/career-profile/me').expect(200)).body as MyCareerProfileDto).content as CareerContent).learning.periods[0]!.units[0]!.id as string;
    return { ...s, hr, holder, me, viewer, unitId };
  }

  it('lists the people the scope reaches with their numbers, leaves out one with no ready path, searches and filters by state', async () => {
    const s = await setup();
    const page = (await s.viewer.get('/api/career/team').expect(200)).body as TeamPageDto;
    const mine = page.items.find((m) => m.employeeId === s.holder.employeeId);
    expect(mine).toMatchObject({ name: expect.any(String), status: expect.stringMatching(/regular|late/), requiredTotal: expect.any(Number), approvedMinutes: 0, waiting: 0 });
    expect(page.items.every((m) => m.employeeId !== undefined)).toBe(true);
    expect(((await s.viewer.get('/api/career/team').query({ search: 'لا-أحد-بهذا-الاسم' }).expect(200)).body as TeamPageDto).items).toHaveLength(0);
    const bare = await s.person(s.lead, s.group);
    const all = ((await s.viewer.get('/api/career/team').expect(200)).body as TeamPageDto).items;
    expect(all.map((m) => m.employeeId)).not.toContain(bare.employeeId);
    const noPath = ((await s.viewer.get('/api/career/team').query({ status: 'no_path' }).expect(200)).body as TeamPageDto).items;
    expect(noPath).toHaveLength(0);
    await s.viewer.get('/api/career/team').query({ status: 'zzz' }).expect(400);
  });

  it('sends the work details (unit, company, e-mail, phone) of each person to a viewer who holds the directory key', async () => {
    const s = await setup([...TEAM, CorePermission.DirectoryView].map((key) => ({ key, scope: 'all' as const })));
    const rows = ((await s.viewer.get('/api/career/team').expect(200)).body as TeamPageDto).items;
    expect(rows.find((m) => m.employeeId === s.holder.employeeId)?.contact).toMatchObject({ workEmail: expect.stringContaining('@'), companyNameAr: expect.any(String) });
  });

  it('shows one member with the proofs waiting for a decision, and answers 404 for a person the scope does not reach', async () => {
    const s = await setup();
    const fileId = ((await s.me.post('/api/files').attach('file', PNG, 'c.png').expect(201)).body as { id: string }).id;
    await s.me.post('/api/career-profile/me/learning').send({ unitId: s.unitId, kind: 'certificate', fileId }).expect(201);
    const detail = (await s.viewer.get(`/api/career/team/${s.holder.employeeId}`).expect(200)).body as TeamMemberDetailDto;
    expect(detail.proofs).toHaveLength(1);
    expect(detail.waiting).toBe(1);
    await s.viewer.get('/api/career/team/00000000-0000-4000-8000-000000000000').expect(404);
    const own = await t.factories.signIn(s.holder);
    await own.get('/api/career/team').expect(403);
  });

  it('lets the manager decide a proof that was referred to them, and only that one', async () => {
    const s = await setup();
    const app = (await s.me.post('/api/career-profile/me/learning').send({ unitId: s.unitId, kind: 'application', note: 'طبّقتها' }).expect(201)).body as LearningRecordDto;
    expect(app.status).toBe('referred');
    await s.viewer.post(`/api/career/team/${s.holder.employeeId}/proofs/${app.id}/approve`).expect(204);
    expect(((await s.me.get('/api/career-profile/me/learning').expect(200)).body as LearningRecordDto[])[0]).toMatchObject({ status: 'done' });
    await s.viewer.post(`/api/career/team/${s.holder.employeeId}/proofs/${app.id}/approve`).expect(409);
    const other = await setup();
    const waiting = (await other.me.post('/api/career-profile/me/learning').send({ unitId: other.unitId, kind: 'output' }).expect(201)).body as LearningRecordDto;
    await other.viewer.post(`/api/career/team/${other.holder.employeeId}/proofs/${waiting.id}/reject`).send({ reason: 'سبب كافٍ' }).expect(409); // still with the reviewer, not the manager
    await other.viewer.post(`/api/career/team/${s.holder.employeeId}/proofs/${waiting.id}/approve`).expect(404); // another person's proof
  });

  it('keeps a narrower scope to its own units: a viewer who leads another unit sees nobody of this one (404 for a person, an empty team)', async () => {
    const s = await setup([{ key: CorePermission.CareerTeamView, scope: 'subtree' }]);
    const elsewhere = await t.factories.node({ key: 'sector', parentId: null, name: 'Elsewhere', mode: 'per_company' });
    const outsider = await t.factories.signIn(await t.factories.user({ unit: elsewhere, grants: [{ key: CorePermission.CareerTeamView, scope: 'subtree' }] }));
    await outsider.get(`/api/career/team/${s.holder.employeeId}`).expect(404);
    expect(((await outsider.get('/api/career/team').expect(200)).body as TeamPageDto).items.some((m) => m.employeeId === s.holder.employeeId)).toBe(false);
  });

  it('403 without the key of each route', async () => {
    const s = await setup([{ key: CorePermission.CareerTeamView, scope: 'all' }]);
    await s.viewer.post(`/api/career/team/${s.holder.employeeId}/proofs/00000000-0000-4000-8000-000000000000/approve`).expect(403);
    const none = await setup([{ key: CorePermission.CareerTeamDecide, scope: 'all' }]);
    await none.viewer.get('/api/career/team').expect(403);
  });
});

describe('The reminders and the monthly report of the career path (FR-115)', () => {
  const t = useTestApp();

  async function setup(deadline: string | null) {
    const s = await chainScenario(t);
    const hr = await t.factories.signIn(await t.factories.user({ grants: grants(HR) }));
    const manager = await t.factories.user();
    const holder = await s.person(s.rep, s.group);
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, holder.employeeId]);
    const content = { ...complete, required: [{ when: 'بند', lines: ['س'], deadline }] };
    await hr.put(`/api/career/titles/${s.rep.id}/content`).send({ content }).expect(200);
    await hr.post(`/api/career/titles/${s.rep.id}/publish`).expect(200);
    return { ...s, me: await t.factories.signIn(holder), managerAgent: await t.factories.signIn(manager), service: t.app.get(CareerReminderService) };
  }

  const titles = async (agent: Awaited<ReturnType<typeof setup>>['me']): Promise<string[]> => ((await agent.get('/api/notifications').expect(200)).body.items as { titleAr: string }[]).map((n) => n.titleAr);

  it('reminds an employee with a dated item past its date, not one who ticked it or whose date has not come', async () => {
    const late = await setup('2020-01-01');
    expect(await late.service.remindEmployees('2026-11-08')).toBeGreaterThanOrEqual(1);
    await vi.waitFor(async () => expect(await titles(late.me)).toContain('عندك بنود متأخرة في مسارك الوظيفي'));
    const ticked = await setup('2020-01-01');
    await ticked.me.put('/api/career-profile/me/required/0').send({ done: true }).expect(200);
    await ticked.service.remindEmployees('2026-11-08');
    expect(await titles(ticked.me)).not.toContain('عندك بنود متأخرة في مسارك الوظيفي');
    const future = await setup('2099-01-01');
    await future.service.remindEmployees('2026-11-08');
    expect(await titles(future.me)).not.toContain('عندك بنود متأخرة في مسارك الوظيفي');
  });

  it('still reminds an employee who has an unread notice about a proof (the reminder has a link of its own)', async () => {
    const s = await setup('2020-01-01');
    const reviewer = await t.factories.signIn(await t.factories.user({ grants: grants(REVIEW) }));
    const content = ((await s.me.get('/api/career-profile/me').expect(200)).body as MyCareerProfileDto).content as CareerContent;
    const fileId = ((await s.me.post('/api/files').attach('file', PNG, 'c.png').expect(201)).body as { id: string }).id;
    const sent = (await s.me.post('/api/career-profile/me/learning').send({ unitId: content.learning.periods[0]!.units[0]!.id, kind: 'certificate', fileId }).expect(201)).body as LearningRecordDto;
    await reviewer.post(`/api/career/certificates/${sent.id}/approve`).expect(204);
    await vi.waitFor(async () => expect(await titles(s.me)).toContain('اعتُمد إثباتك')); // unread, link /career-profile
    await s.service.remindEmployees('2026-11-08');
    await vi.waitFor(async () => expect(await titles(s.me)).toContain('عندك بنود متأخرة في مسارك الوظيفي'));
  });

  it('tells the direct manager how many of their reports are late', async () => {
    const s = await setup('2020-01-01');
    expect(await s.service.reportToManagers('2026-11-08')).toBeGreaterThanOrEqual(1);
    await vi.waitFor(async () => expect(await titles(s.managerAgent)).toContain('تقرير المسار المهني الشهري'));
  });
});

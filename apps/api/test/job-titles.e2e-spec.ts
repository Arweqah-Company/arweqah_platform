import { CorePermission, type JobTitleCardDto, type JobTitleContentDto, type JobTitleDto, type JobTitlesPageDto, type OrgTreeDto, type TitleImportResultDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { OrgNodesService } from '../src/modules/org/application/services/org-nodes.service';
import { orgAdmin, orgContext, orgGrantsWithout } from './helpers/org-admin';
import { chainScenario } from './helpers/title-chain';
import { useTestApp } from './setup/test-app';

/** The Employee role no longer holds the job-titles page (decision 267): the people who read it here hold its key. */
const VIEW = [{ key: CorePermission.JobTitlesView, scope: 'all' as const }];

const content = (n: string): JobTitleContentDto => ({
  responsibilities: { ar: [`مسؤولية ${n}`], en: [`Duty ${n}`] },
  qualifications: { ar: ['مؤهل'], en: ['A degree'] },
  kpis: { ar: ['مؤشر'], en: ['A KPI'] },
  contentVersion: 0,
});
const withoutVersion = ({ contentVersion: _ignored, ...rest }: JobTitleContentDto) => rest;

describe('Job titles with grade, track, code and reporting line (FR-104, FR-106)', () => {
  const t = useTestApp();

  async function setup() {
    const s = await chainScenario(t);
    const tree = async () => ((await s.agent.get('/api/org/tree?view=full').expect(200)).body as OrgTreeDto).nodes;
    const deptCode = (await tree()).find((n) => n.id === s.dept.id)!.code!;
    return { ...s, tree, deptCode };
  }

  it('builds the code from the unit, grade, track and a sequence that grows per unit, grade and track; a title made before codes has none', async () => {
    const s = await setup();
    expect(s.head).toMatchObject({ code: `${s.deptCode}-L4M-01`, grade: 4, track: 'M', reportsToTitleId: null, contentVersion: 1 });
    expect((await s.addTitle('Head 2', 4, 'M')).code).toBe(`${s.deptCode}-L4M-02`);
    expect((await s.addTitle('Other track', 4, 'P')).code).toBe(`${s.deptCode}-L4P-01`);
    expect(s.rep.reportsToTitleId).toBe(s.lead.id);
    const legacy = (await s.tree()).find((n) => n.id === s.dept.id)!.titles.find((x) => x.id === s.dept.titleId);
    expect(legacy).toMatchObject({ code: null, grade: null, track: null });
  });

  it('never gives two titles made at the same time the same code', async () => {
    const s = await setup();
    const service = t.app.get(OrgNodesService);
    const ctx = orgContext();
    const add = (name: string) => service.addTitles(ctx, s.dept.id, { jobTitles: [{ nameAr: `${name} ع`, nameEn: name, grade: 7, track: 'S' }] }, '00000000-0000-4000-8000-0000000000aa');
    const made = (await Promise.all([add('A'), add('B'), add('C')])).flat();
    expect(made.map((m) => m.code).sort()).toEqual([`${s.deptCode}-L7S-01`, `${s.deptCode}-L7S-02`, `${s.deptCode}-L7S-03`]);
  });

  it('requires the grade and the track of a new title and keeps them in range (400), refuses an unknown reporting title (404) and a sector (422)', async () => {
    const s = await setup();
    const url = `/api/org/nodes/${s.dept.id}/job-titles`;
    const title = { nameAr: 'مسمى جديد', nameEn: 'New title' };
    await s.agent.post(url).send({ jobTitles: [title] }).expect(400);
    await s.agent.post(url).send({ jobTitles: [{ ...title, grade: 7 }] }).expect(400);
    await s.agent.post(url).send({ jobTitles: [{ ...title, grade: 10, track: 'P' }] }).expect(400);
    await s.agent.post(url).send({ jobTitles: [{ ...title, grade: 0, track: 'P' }] }).expect(400);
    await s.agent.post(url).send({ jobTitles: [{ ...title, grade: 7, track: 'X' }] }).expect(400);
    await s.agent.post(url).send({ jobTitles: [{ ...title, grade: 7, track: 'P', code: 'X' }] }).expect(400);
    await s.agent.post(url).send({ jobTitles: [{ ...title, grade: 7, track: 'P', reportsToTitleId: '00000000-0000-4000-8000-000000000999' }] }).expect(404);
    await s.agent.post(`/api/org/nodes/${s.sector.id}/job-titles`).send({ jobTitles: [{ ...title, grade: 7, track: 'P' }] }).expect(422);
  });

  it('gives a grade and track once to a title that has none (its code is built then), and refuses to change them afterwards (422)', async () => {
    const s = await setup();
    const put = (id: string, extra: Record<string, unknown>) => s.agent.put(`/api/org/job-titles/${id}`).send({ nameAr: 'مسمى', nameEn: 'Title', isActive: true, ...extra });
    const res = await put(s.dept.titleId, { grade: 5, track: 'J' }).expect(200);
    expect(res.body).toMatchObject({ grade: 5, track: 'J', code: `${s.deptCode}-L5J-01` });
    expect((await put(s.dept.titleId, { grade: 6, track: 'J' }).expect(422)).body.code).toBe('JOB_TITLE_GRADE_FROZEN');
    expect((await put(s.head.id, { grade: 3, track: 'M' }).expect(422)).body.code).toBe('JOB_TITLE_GRADE_FROZEN');
    expect((await put(s.head.id, {}).expect(200)).body).toMatchObject({ code: s.head.code, grade: 4, track: 'M' });
    await put(s.head.id, { grade: 3 }).expect(400);
  });

  it('a title made while its unit has no code waits for it: the code is built when the unit gets one', async () => {
    const s = await setup();
    const legacy = await t.factories.node({ key: 'department', parentId: s.sector.id, name: 'Legacy' });
    await t.db.query('UPDATE org_nodes SET code = NULL WHERE id = $1', [legacy.id]);
    const added = (await s.agent.post(`/api/org/nodes/${legacy.id}/job-titles`).send({ jobTitles: [{ nameAr: 'مسمى', nameEn: 'Waiting', grade: 5, track: 'S' }] }).expect(201)).body as JobTitleDto[];
    expect(added[0]).toMatchObject({ grade: 5, track: 'S', code: null });
    await s.agent.put(`/api/org/nodes/${legacy.id}/code`).send({ code: 'ZZZ.09.00.00' }).expect(200);
    const filled = ((await s.tree()).find((n) => n.id === legacy.id)!.titles).find((x) => x.id === added[0]!.id);
    expect(filled?.code).toBe('ZZZ.09.00.00-L5S-01');
  });

  it('keeps the reporting line free of loops (422), refuses an unknown title (404), clears it with null, and a removed title clears the lines that pointed to it', async () => {
    const s = await setup();
    const put = (id: string, reportsToTitleId: string | null) => s.agent.put(`/api/org/job-titles/${id}`).send({ nameAr: 'اسم', nameEn: 'Name', isActive: true, reportsToTitleId });
    expect((await put(s.head.id, s.rep.id).expect(422)).body.code).toBe('JOB_TITLE_CYCLE');
    expect((await put(s.head.id, s.head.id).expect(422)).body.code).toBe('JOB_TITLE_CYCLE');
    await put(s.head.id, '00000000-0000-4000-8000-000000000999').expect(404);
    expect((await put(s.lead.id, null).expect(200)).body.reportsToTitleId).toBeNull();
    expect((await put(s.lead.id, s.head.id).expect(200)).body.reportsToTitleId).toBe(s.head.id);
    await s.agent.delete(`/api/org/job-titles/${s.head.id}`).expect(204);
    const after = (await s.tree()).find((n) => n.id === s.dept.id)!.titles;
    expect(after.find((x) => x.id === s.lead.id)?.reportsToTitleId).toBeNull();
  });

  it('edits the content with its own key, bumps the content version every time, and shows it on the card', async () => {
    const s = await setup();
    const url = `/api/org/job-titles/${s.rep.id}/content`;
    const first = (await s.agent.put(url).send(withoutVersion(content('1'))).expect(200)).body as JobTitleContentDto;
    expect(first.contentVersion).toBe(2);
    expect((await s.agent.put(url).send(withoutVersion(content('2'))).expect(200)).body.contentVersion).toBe(3);
    const card = (await s.agent.get(`/api/org/job-titles/${s.rep.id}/card`).expect(200)).body as JobTitleCardDto;
    expect(card).toMatchObject({ contentVersion: 3, responsibilities: { en: ['Duty 2'] } });
    await s.agent.put(url).send({ ...withoutVersion(content('3')), kpis: { ar: Array(31).fill('م'), en: [] } }).expect(400);
    await s.agent.put(url).send({ responsibilities: { ar: [], en: [] } }).expect(400);
    await s.agent.put(`/api/org/job-titles/00000000-0000-4000-8000-000000000999/content`).send(withoutVersion(content('4'))).expect(404);
    const noKey = (await orgAdmin(t, orgGrantsWithout(CorePermission.OrgTitlesEditContent))).agent;
    await noKey.put(url).send(withoutVersion(content('5'))).expect(403);
  });

  it('403 for the create, update and delete of a title without their key, and for a person with none', async () => {
    const s = await setup();
    const body = { jobTitles: [{ nameAr: 'مسمى', nameEn: 'Title', grade: 7, track: 'P' }] };
    const edit = { nameAr: 'مسمى', nameEn: 'Title', isActive: true };
    const cases: [string, (a: typeof s.agent) => Promise<unknown>][] = [
      [CorePermission.JobTitlesCreate, (a) => a.post(`/api/org/nodes/${s.dept.id}/job-titles`).send(body).expect(403)],
      [CorePermission.JobTitlesUpdate, (a) => a.put(`/api/org/job-titles/${s.rep.id}`).send(edit).expect(403)],
      [CorePermission.JobTitlesDelete, (a) => a.delete(`/api/org/job-titles/${s.rep.id}`).expect(403)],
    ];
    for (const [key, call] of cases) await call((await orgAdmin(t, orgGrantsWithout(key))).agent);
    const plain = await t.factories.signIn(await t.factories.user());
    await plain.post(`/api/org/nodes/${s.dept.id}/job-titles`).send(body).expect(403);
  });
});

describe('The job-titles list, the card and the development-stage rules (FR-107)', () => {
  const t = useTestApp();

  async function setup() {
    const s = await chainScenario(t);
    const companyC = await t.factories.company();
    const other = await t.factories.node({ key: 'sector', parentId: null, name: 'Other', mode: 'per_company' });
    const otherDept = await t.factories.node({ key: 'department', parentId: other.id, name: 'Other dept', titles: true });
    const outsider = await t.factories.user({ unit: otherDept, grants: VIEW });
    await t.db.query('UPDATE employees SET company_id = $1 WHERE id = $2', [companyC, outsider.employeeId]);
    const repG = await s.person(s.rep, s.group, VIEW);
    const repB = await s.person(s.rep, s.companyB, VIEW);
    const list = async (agent: typeof s.agent, query: Record<string, string | number> = {}): Promise<JobTitlesPageDto> => (await agent.get('/api/org/job-titles').query(query).expect(200)).body;
    const card = (agent: typeof s.agent, id: string, company?: string) => agent.get(`/api/org/job-titles/${id}/card`).query(company ? { company } : {});
    return { ...s, other, otherDept, outsider, repG, repB, companyC, list, card };
  }

  it('lists titles with their code, unit, grade, track and holders; searches by name or code; filters by unit, grade, track and vacancy; pages', async () => {
    const s = await setup();
    const all = await s.list(s.agent);
    expect(all.items.map((i) => i.nameEn)).toEqual(expect.arrayContaining(['Head', 'Lead', 'Rep', 'Title Sales', 'Title Other dept']));
    const rep = all.items.find((i) => i.nameEn === 'Rep')!;
    expect(rep).toMatchObject({ grade: 7, track: 'P', occupants: 2, reportsToTitleId: s.lead.id, unitNameEn: 'Sales' });
    expect(rep.code).toMatch(/-L7P-01$/);
    expect(rep.unitPathEn).toContain('Growth');
    expect((await s.list(s.agent, { search: 'Lead' })).items.map((i) => i.nameEn)).toEqual(['Lead']);
    expect((await s.list(s.agent, { search: 'L6M' })).items.map((i) => i.nameEn)).toEqual(['Lead']);
    expect((await s.list(s.agent, { grade: 7 })).items.map((i) => i.nameEn)).toEqual(['Rep']);
    expect((await s.list(s.agent, { track: 'M' })).items.map((i) => i.nameEn).sort()).toEqual(['Head', 'Lead']);
    expect((await s.list(s.agent, { vacant: 'true', sectorId: s.sector.id })).items.map((i) => i.nameEn).sort()).toEqual(['Head', 'Lead', 'Title Sales']);
    expect((await s.list(s.agent, { vacant: 'false', departmentId: s.dept.id })).items.map((i) => i.nameEn)).toEqual(['Rep']);
    expect((await s.list(s.agent, { orgNodeId: s.otherDept.id })).items.map((i) => i.nameEn)).toEqual(['Title Other dept']);
    const paged = await s.list(s.agent, { pageSize: 2, page: 2 });
    expect(paged).toMatchObject({ total: all.total, page: 2, pageSize: 2 });
    expect(paged.items).toHaveLength(2);
    await s.agent.get('/api/org/job-titles').query({ pageSize: 101 }).expect(400);
    await s.agent.get('/api/org/job-titles').query({ grade: 10 }).expect(400);
    await s.agent.get('/api/org/job-titles').query({ extra: 1 }).expect(400);
  });

  it('shows a person only the titles of the units they see, and counts only the holders of their own company; the full view counts every company', async () => {
    const s = await setup();
    const viewer = await t.factories.signIn(s.repB);
    const mine = await s.list(viewer);
    expect(mine.items.map((i) => i.nameEn)).toEqual(expect.arrayContaining(['Head', 'Lead', 'Rep']));
    expect(mine.items.map((i) => i.nameEn)).not.toContain('Title Other dept');
    expect(mine.items.find((i) => i.nameEn === 'Rep')?.occupants).toBe(1);
    const outsider = await t.factories.signIn(s.outsider);
    expect((await s.list(outsider)).items.map((i) => i.nameEn)).toEqual(['Title Other dept']);
    await outsider.get(`/api/org/job-titles/${s.rep.id}/card`).expect(404);
    await (await t.factories.signIn(await t.factories.user({ bare: true }))).get('/api/org/job-titles').expect(403);
  });

  it('the card gives the code parts, the stage with its hours and budget, the reporting title, the content and the holders (only the viewer\'s company in the team view)', async () => {
    const s = await setup();
    const full = (await s.card(s.agent, s.rep.id).expect(200)).body as JobTitleCardDto;
    expect(full).toMatchObject({ grade: 7, track: 'P', nameEn: 'Rep', developmentStage: { code: 'specialization', hoursPerYear: 48, budgetCap: 5000 }, developmentStageReason: null });
    expect(full.codeParts).toMatchObject({ grade: 7, track: 'P', sequence: 1 });
    expect(full.reportsTo).toMatchObject({ id: s.lead.id, nameEn: 'Lead' });
    expect(full.unit).toMatchObject({ id: s.dept.id, nameEn: 'Sales', effectiveMode: 'per_company' });
    expect(full.occupants.map((o) => [o.companyId, o.count]).sort()).toEqual([[s.companyB, 1], [s.group, 1]].sort());
    const team = (await s.card(await t.factories.signIn(s.repB), s.rep.id).expect(200)).body as JobTitleCardDto;
    expect(team.occupants.map((o) => o.companyId)).toEqual([s.companyB]);
  });

  it('says why a title has no stage: no grade yet, or no rule for its grade and track', async () => {
    const s = await setup();
    const legacy = (await s.card(s.agent, s.dept.titleId).expect(200)).body as JobTitleCardDto;
    expect(legacy).toMatchObject({ developmentStage: null, developmentStageReason: 'no_grade', codeParts: null, code: null });
    const exec = await s.addTitle('Executive', 2, 'M');
    expect((await s.card(s.agent, exec.id).expect(200)).body).toMatchObject({ developmentStage: null, developmentStageReason: 'no_rule' });
  });

  it('walks the manager chain for a company: skips vacant titles, finds the nearest holder with their name, never leaves the company, and another company needs the full view', async () => {
    const s = await setup();
    const asB = await t.factories.signIn(s.repB);
    const empty = (await s.card(asB, s.rep.id).expect(200)).body as JobTitleCardDto;
    expect(empty.chain).toMatchObject({ companyId: s.companyB, managerTitleId: null });
    expect(empty.chain?.steps.map((x) => [x.nameEn, x.state])).toEqual([['Lead', 'vacant'], ['Head', 'vacant']]);
    const headG = await s.person(s.head, s.group, VIEW); // a holder in another company never counts for company B
    const headB = await s.person(s.head, s.companyB, VIEW);
    const found = (await s.card(asB, s.rep.id).expect(200)).body as JobTitleCardDto;
    expect(found.chain?.managerTitleId).toBe(s.head.id);
    expect(found.chain?.steps.map((x) => [x.nameEn, x.state, x.count])).toEqual([['Lead', 'vacant', null], ['Head', 'found', 1]]);
    expect(found.chain?.steps[1]).toMatchObject({ managerEmployeeId: headB.employeeId, unitNameEn: 'Sales' });
    expect(found.chain?.steps[1]?.managerName).toContain('User');
    await s.card(asB, s.rep.id, s.group).expect(403);
    await s.card(asB, s.rep.id, s.companyB).expect(200);
    const forGroup = (await s.card(s.agent, s.rep.id, s.group).expect(200)).body as JobTitleCardDto;
    expect(forGroup.chain).toMatchObject({ companyId: s.group, managerTitleId: s.head.id });
    expect(forGroup.chain?.steps[1]?.managerEmployeeId).toBe(headG.employeeId);
    await s.card(s.agent, s.rep.id, '00000000-0000-4000-8000-000000000999').expect(404);
    await s.card(s.agent, '00000000-0000-4000-8000-000000000999').expect(404);
  });

  it('serves the stored stage rules, read only, to anyone who sees the page', async () => {
    const s = await setup();
    const rules = (await s.agent.get('/api/org/development-stage-rules').expect(200)).body as { grade: number; track: string | null; stage: { code: string } }[];
    expect(rules).toHaveLength(11);
    expect(rules.find((r) => r.grade === 7 && r.track === 'M')?.stage.code).toBe('operational_leadership');
    await (await t.factories.signIn(s.repB)).get('/api/org/development-stage-rules').expect(200);
    await (await t.factories.signIn(await t.factories.user({ bare: true }))).get('/api/org/development-stage-rules').expect(403);
  });
});

describe('Importing job titles from a file (FR-107)', () => {
  const t = useTestApp();

  async function setup() {
    const s = await chainScenario(t);
    const deptCode = (((await s.agent.get('/api/org/tree?view=full').expect(200)).body as OrgTreeDto).nodes.find((n) => n.id === s.dept.id))!.code!;
    const post = (body: Record<string, unknown>, agent = s.agent) => agent.post('/api/org/job-titles/bulk').send(body);
    const count = async (): Promise<number> => ((await t.db.query('SELECT count(*)::int AS n FROM job_titles WHERE deleted_at IS NULL')) as { n: number }[])[0]!.n;
    return { ...s, deptCode, post, count };
  }

  const row = (over: Record<string, unknown> = {}) => ({ nameAr: 'محاسب', nameEn: 'Accountant', ...over });

  it('previews what would happen without writing anything (dryRun), with the row numbers and the reasons of the rows it would refuse', async () => {
    const s = await setup();
    const before = await s.count();
    const rows = [row({ unitCode: s.deptCode, grade: 7, track: 'P' }), row({ nameEn: 'Nowhere', unitCode: 'ZZZ.99.99.99', grade: 7, track: 'P' }), row({ code: 'bad' }), row({ nameEn: 'Also', unitCode: s.deptCode, grade: 7, track: 'P' })];
    const res = (await s.post({ dryRun: true, rows }).expect(200)).body as TitleImportResultDto;
    expect(res).toMatchObject({ dryRun: true, created: 2, rejected: 2, updated: 0 });
    expect(res.rows.map((r) => [r.row, r.status, r.reasons])).toEqual([[1, 'created', []], [2, 'rejected', ['unit_not_found']], [3, 'rejected', ['bad_code']], [4, 'created', []]]);
    expect(res.rows[0]?.code).toBe(`${s.deptCode}-L7P-02`);
    expect(res.rows[3]?.code).toBe(`${s.deptCode}-L7P-03`);
    expect(await s.count()).toBe(before);
  });

  it('makes the titles with the codes it planned (a code in the file is kept), links the reporting lines, gives each its role, and a second run changes nothing', async () => {
    const s = await setup();
    const boss = `${s.deptCode}-L3M-01`;
    const rows = [
      row({ code: boss, nameEn: 'Director', content: { responsibilities: { ar: ['م'], en: ['Lead'] }, qualifications: { ar: [], en: [] }, kpis: { ar: [], en: [] } } }),
      row({ nameEn: 'Analyst', unitCode: s.deptCode, grade: 7, track: 'P', reportsToCode: boss }),
    ];
    const res = (await s.post({ rows }).expect(200)).body as TitleImportResultDto;
    expect(res).toMatchObject({ dryRun: false, created: 2, rejected: 0 });
    const made = (await t.db.query(`SELECT j.code, j.reports_to_title_id, j.responsibilities, (SELECT count(*)::int FROM roles r WHERE r.job_title_id = j.id) AS roles FROM job_titles j WHERE j.code = ANY($1) ORDER BY j.code`, [[boss, `${s.deptCode}-L7P-02`]])) as { code: string; reports_to_title_id: string | null; responsibilities: { en: string[] }; roles: number }[];
    expect(made.map((m) => m.code)).toEqual([boss, `${s.deptCode}-L7P-02`]);
    expect(made[0]?.responsibilities.en).toEqual(['Lead']);
    expect(made[1]?.reports_to_title_id).not.toBeNull();
    expect(made.map((m) => m.roles)).toEqual([1, 1]);
    const again = (await s.post({ rows: [rows[0], { ...rows[1], code: `${s.deptCode}-L7P-02` }] }).expect(200)).body as TitleImportResultDto;
    expect(again).toMatchObject({ created: 0, updated: 0, unchanged: 2 });
  });

  it('updates a title found by its code (names, reporting line and content bump the version), and refuses a changed grade or a loop', async () => {
    const s = await setup();
    const res = (await s.post({ rows: [row({ code: s.rep.code, nameAr: 'اسم جديد', nameEn: 'Renamed rep', reportsToCode: s.head.code, content: { responsibilities: { ar: ['و'], en: ['New'] }, qualifications: { ar: [], en: [] }, kpis: { ar: [], en: [] } } })] }).expect(200)).body as TitleImportResultDto;
    expect(res).toMatchObject({ updated: 1, created: 0 });
    const after = ((await t.db.query('SELECT j.reports_to_title_id AS up, j.content_version AS v, t.name FROM job_titles j JOIN job_title_translations t ON t.job_title_id = j.id AND t.lang = $2 WHERE j.id = $1', [s.rep.id, 'en'])) as { up: string; v: number; name: string }[])[0];
    expect(after).toMatchObject({ up: s.head.id, v: 2, name: 'Renamed rep' });
    const refused = (await s.post({ rows: [row({ code: s.rep.code, grade: 3 }), row({ code: s.head.code, reportsToCode: s.rep.code })] }).expect(200)).body as TitleImportResultDto;
    expect(refused.rows.map((r) => [r.status, r.reasons])).toEqual([['rejected', ['grade_track_mismatch']], ['rejected', ['reports_to_cycle']]]);
  });

  it('validates the file (400): no rows, too many rows, an unknown field, a grade out of range; and needs the import key (403)', async () => {
    const s = await setup();
    await s.post({ rows: [] }).expect(400);
    await s.post({ rows: Array.from({ length: 1001 }, () => row()) }).expect(400);
    await s.post({ rows: [row({ extra: 1 })] }).expect(400);
    await s.post({ rows: [row({ grade: 12, track: 'P' })] }).expect(400);
    await s.post({ rows: [row()], templateRoleId: 'x' }).expect(400);
    const noKey = (await orgAdmin(t, orgGrantsWithout(CorePermission.JobTitlesImport))).agent;
    await s.post({ rows: [row()] }, noKey).expect(403);
    await s.post({ rows: [row()] }, await t.factories.signIn(await t.factories.user())).expect(403);
  });
});

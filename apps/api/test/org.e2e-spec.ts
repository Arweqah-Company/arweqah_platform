import { COMPANIES_ADMIN_PERMISSIONS, CorePermission, ORG_ADMIN_PERMISSIONS, riyadhToday, type ManagementMode, type OrgLevelDto, type OrgLevelsDto, type OrgNodeDto, type OrgTreeDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { OrgDirectoryService } from '../src/modules/org/application/services/org-directory.service';
import { ADMIN_MODE_GRANT, type TestAgent, type TestUnit, type TestUser } from './factories/factories';
import { useTestApp } from './setup/test-app';

const ALL = 'all' as const;
const orgAdminGrants = [
  ADMIN_MODE_GRANT,
  ...COMPANIES_ADMIN_PERMISSIONS.map((key) => ({ key, scope: ALL })),
  ...ORG_ADMIN_PERMISSIONS.map((key) => ({ key, scope: ALL })),
];
const grantsWithout = (key: string) => [ADMIN_MODE_GRANT, ...ORG_ADMIN_PERMISSIONS.filter((k) => k !== key).map((k) => ({ key: k, scope: ALL }))];
const START = '2024-01-01';

/** The shared helpers of the structure specs: an administrator in admin mode, the type ids, and the bodies the API takes. */
function useOrgApi(t: ReturnType<typeof useTestApp>) {
  const admin = async (grants = orgAdminGrants): Promise<{ agent: TestAgent; user: TestUser }> => {
    const user = await t.factories.user({ grants });
    return { agent: await t.factories.signInAdminMode(user), user };
  };
  const levels = async (agent: TestAgent): Promise<OrgLevelsDto> => (await agent.get('/api/org/levels').expect(200)).body;
  const levelId = async (agent: TestAgent, key: string): Promise<string> => ((await levels(agent)).levels.find((l) => l.key === key) as OrgLevelDto).id;
  /** Every type id by key. Read it before building a request: a supertest request opened while another one is awaited can lose its server. */
  const levelMap = async (agent: TestAgent): Promise<Record<string, string>> => Object.fromEntries((await levels(agent)).levels.map((l) => [l.key, l.id]));
  const body = (levelIdValue: string, parentId: string | null, name: string, extra: Record<string, unknown> = {}) => ({
    levelId: levelIdValue,
    parentId,
    nameAr: `${name} ع`,
    nameEn: `${name} en`,
    startDate: START,
    ...extra,
  });
  /** Creates a unit through the API and returns it. */
  const create = async (agent: TestAgent, key: string, parentId: string | null, fields: { name: string } & Record<string, unknown>): Promise<OrgNodeDto> => {
    const { name, ...extra } = fields;
    const id = await levelId(agent, key);
    return (await agent.post('/api/org/nodes').send(body(id, parentId, name, extra)).expect(201)).body;
  };
  const tree = async (agent: TestAgent, query = ''): Promise<OrgTreeDto> => (await agent.get(`/api/org/tree${query}`).expect(200)).body;
  return { admin, levels, levelId, levelMap, body, create, tree };
}

describe('Companies (FR-19, FR-25)', () => {
  const t = useTestApp();

  it('creates a company, refuses a duplicate code, updates and deletes an empty one (the structure is the group\'s: no levels per company)', async () => {
    const agent = await t.factories.signInAdminMode(await t.factories.user({ grants: orgAdminGrants }));
    const created = await agent.post('/api/companies').send({ code: 'xyz', nameAr: 'شركة تجريبية', nameEn: 'Test Co' }).expect(201);
    expect(created.body).toMatchObject({ code: 'XYZ', nameEn: 'Test Co', isActive: true, employeesCount: 0 });
    expect(await t.db.query('SELECT 1 FROM org_levels WHERE template_code IN ($1, $2)', ['sector', 'unit'])).toHaveLength(2);
    await agent.post('/api/companies').send({ code: 'XYZ', nameAr: 'مكرر', nameEn: 'Dup' }).expect(409);
    await agent.put(`/api/companies/${created.body.id}`).send({ code: 'XYZ', nameAr: 'اسم جديد', nameEn: 'New name', isActive: false }).expect(200);
    await agent.delete(`/api/companies/${created.body.id}`).expect(204);
    expect((await agent.get('/api/companies').expect(200)).body.map((c: { code: string }) => c.code)).not.toContain('XYZ');
  });

  it('refuses to delete a company that has units or employees (422)', async () => {
    const org = await t.factories.org();
    const agent = await t.factories.signInAdminMode(await t.factories.user({ grants: orgAdminGrants }));
    const res = await agent.delete(`/api/companies/${org.companyId}`).expect(422);
    expect(res.body.code).toBe('COMPANY_IN_USE');
  });

  it('returns 403 without the permission and validates the input', async () => {
    const plain = await t.factories.signIn(await t.factories.user());
    await plain.get('/api/companies').expect(403);
    await plain.post('/api/companies').send({ code: 'A1', nameAr: 'أ', nameEn: 'a' }).expect(403);
    const agent = await t.factories.signInAdminMode(await t.factories.user({ grants: orgAdminGrants }));
    await agent.post('/api/companies').send({ code: 'bad code!', nameAr: 'شركة', nameEn: 'Co' }).expect(400);
    await agent.post('/api/companies').send({ code: 'OK1', nameAr: 'شركة', nameEn: 'Co', extra: 1 }).expect(400);
  });
});

describe('Unit types of the group and the «who may be created under whom» table (FR-96)', () => {
  const t = useTestApp();
  const api = useOrgApi(t);

  it('lists the five built-in types and the default rules, the same for every company', async () => {
    const { agent } = await api.admin();
    const { levels, rules } = await api.levels(agent);
    expect(levels.map((l) => [l.key, l.nameEn, l.acceptsTitles, l.isBuiltIn, l.tone, l.codeSlot])).toEqual([
      ['sector', 'Sector', false, true, 'sector', 1],
      ['department', 'Department', true, true, 'department', 2],
      ['section', 'Section', true, true, 'section', 3],
      ['unit', 'Unit', true, true, 'unit', 4],
      ['office', 'Office', true, true, 'office', null],
    ]);
    expect(rules.root).toEqual(['sector', 'department', 'office']);
    expect(rules.sector).toEqual(['department', 'section', 'unit', 'office']);
    expect(rules.unit).toEqual([]);
    expect(await t.db.query('SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2', ['org_levels', 'company_id'])).toHaveLength(0);
  });

  it('renames a type, adds one (generated key, unit tone and slot) and removes it again while no unit uses it', async () => {
    const { agent } = await api.admin();
    const current = (await api.levels(agent)).levels;
    const asInput = current.map((l) => ({ id: l.id, nameAr: l.nameAr, nameEn: l.key === 'sector' ? 'Group sector' : l.nameEn, acceptsTitles: l.acceptsTitles }));
    const added = (await agent.put('/api/org/levels').send({ levels: [...asInput, { nameAr: 'فريق', nameEn: 'Team', acceptsTitles: true }] }).expect(200)).body as OrgLevelsDto;
    expect(added.levels.find((l) => l.key === 'sector')?.nameEn).toBe('Group sector');
    const team = added.levels.find((l) => l.nameEn === 'Team') as OrgLevelDto;
    expect(team).toMatchObject({ isBuiltIn: false, tone: 'unit', codeSlot: 4, acceptsTitles: true, sortOrder: 6 });
    expect(team.key).toMatch(/^custom_[0-9a-f]{8}$/);
    expect(added.rules[team.key]).toEqual([]);
    const removed = (await agent.put('/api/org/levels').send({ levels: asInput }).expect(200)).body as OrgLevelsDto;
    expect(removed.levels.map((l) => l.key)).not.toContain(team.key);
  });

  it('keeps a type that units use, never removes a built-in one and never lets a sector take titles (422)', async () => {
    const { agent } = await api.admin();
    const current = (await api.levels(agent)).levels;
    const asInput = current.map((l) => ({ id: l.id, nameAr: l.nameAr, nameEn: l.nameEn, acceptsTitles: l.acceptsTitles }));
    const withTeam = (await agent.put('/api/org/levels').send({ levels: [...asInput, { nameAr: 'فريق', nameEn: 'Team', acceptsTitles: true }] }).expect(200)).body as OrgLevelsDto;
    const team = withTeam.levels.find((l) => l.nameEn === 'Team') as OrgLevelDto;
    const rules = { ...withTeam.rules, department: [...(withTeam.rules.department ?? []), team.key] };
    await agent.put('/api/org/levels/rules').send({ rules }).expect(200);
    const sector = await api.create(agent, 'sector', null, { name: 'S', codePrefix: 'AAA', managementMode: 'shared' });
    const department = await api.create(agent, 'department', sector.id, { name: 'D' });
    await agent.post('/api/org/nodes').send(api.body(team.id, department.id, 'T1')).expect(201);
    expect((await agent.put('/api/org/levels').send({ levels: asInput }).expect(422)).body.code).toBe('ORG_LEVEL_IN_USE');
    const noBuiltIn = withTeam.levels.filter((l) => l.key !== 'office').map((l) => ({ id: l.id, nameAr: l.nameAr, nameEn: l.nameEn, acceptsTitles: l.acceptsTitles }));
    expect((await agent.put('/api/org/levels').send({ levels: noBuiltIn }).expect(422)).body.code).toBe('INVALID_ORG_LEVELS');
    const sectorTitles = asInput.map((l) => (l.id === current[0]?.id ? { ...l, acceptsTitles: true } : l));
    expect((await agent.put('/api/org/levels').send({ levels: sectorTitles }).expect(422)).body.code).toBe('INVALID_ORG_LEVELS');
    const sameName = [...asInput, { nameAr: asInput[0]?.nameAr, nameEn: 'Other', acceptsTitles: true }];
    expect((await agent.put('/api/org/levels').send({ levels: sameName }).expect(422)).body.code).toBe('INVALID_ORG_LEVELS');
    await agent.put('/api/org/levels').send({ levels: [{ nameAr: 'ا', nameEn: 'A', acceptsTitles: true }] }).expect(400);
  });

  it('replaces the rules table: new units follow it, units that exist stay where they are; the two fixed rules and unknown types are refused (422)', async () => {
    const { agent } = await api.admin();
    const before = await api.levels(agent);
    const sector = await api.create(agent, 'sector', null, { name: 'S', codePrefix: 'AAA', managementMode: 'shared' });
    const section = await api.create(agent, 'section', sector.id, { name: 'Sec' });
    await api.create(agent, 'unit', section.id, { name: 'U1' });
    const narrowed = { ...before.rules, section: ['office'] };
    const saved = (await agent.put('/api/org/levels/rules').send({ rules: narrowed }).expect(200)).body as OrgLevelsDto;
    expect(saved.rules.section).toEqual(['office']);
    const unitType = await api.levelId(agent, 'unit');
    await agent.post('/api/org/nodes').send(api.body(unitType, section.id, 'U2')).expect(422);
    const unitCount = await t.db.query('SELECT count(*)::int AS n FROM org_nodes WHERE parent_id = $1', [section.id]);
    expect(unitCount[0].n).toBe(1);
    for (const bad of [{ department: ['sector'] }, { office: ['office'] }, { root: ['nothing'] }, { nothing: ['unit'] }]) {
      expect((await agent.put('/api/org/levels/rules').send({ rules: bad }).expect(422)).body.code).toBe('INVALID_ORG_RULES');
    }
    await agent.put('/api/org/levels/rules').send({ rules: { root: ['sector'] }, extra: 1 }).expect(400);
  });

  it('creates units only under a parent the rules allow: no sector under a department, no office under an office, none under a unit, a department or an office under the group', async () => {
    const { agent } = await api.admin();
    const sector = await api.create(agent, 'sector', null, { name: 'S', codePrefix: 'AAA', managementMode: 'shared' });
    const department = await api.create(agent, 'department', sector.id, { name: 'D' });
    const office = await api.create(agent, 'office', sector.id, { name: 'O' });
    const unit = await api.create(agent, 'unit', department.id, { name: 'U' });
    const types = await api.levelMap(agent);
    const post = (key: string, parentId: string | null, extra: Record<string, unknown> = {}) =>
      agent.post('/api/org/nodes').send(api.body(types[key] as string, parentId, `X ${key}`, extra));
    expect((await post('sector', department.id)).status).toBe(422);
    expect((await post('sector', sector.id)).body.code).toBe('INVALID_ORG_HIERARCHY');
    expect((await post('office', office.id)).status).toBe(422);
    expect((await post('unit', unit.id)).status).toBe(422);
    expect((await post('section', null, { codePrefix: 'BBB', managementMode: 'shared' })).status).toBe(422);
    expect((await post('department', null, { codePrefix: 'COM', managementMode: 'shared' })).status).toBe(201);
    expect((await post('office', null, { codePrefix: 'EXE', managementMode: 'shared' })).status).toBe(201);
    expect((await post('section', office.id)).status).toBe(201);
    await agent.put(`/api/org/nodes/${department.id}`).send({ nameAr: 'إدارة', nameEn: 'Dept', startDate: START, isActive: false }).expect(200);
    expect((await post('section', department.id)).status).toBe(422); // an inactive parent
  });

  it('allows job titles only on a type that accepts them (a sector never), and does not require any', async () => {
    const { agent } = await api.admin();
    const titles = [{ nameAr: 'مسمى', nameEn: 'Title' }];
    const sectorType = await api.levelId(agent, 'sector');
    await agent.post('/api/org/nodes').send(api.body(sectorType, null, 'S', { codePrefix: 'AAA', managementMode: 'shared', jobTitles: titles })).expect(422);
    const sector = await api.create(agent, 'sector', null, { name: 'S', codePrefix: 'AAA', managementMode: 'shared' });
    const withTitles = await api.create(agent, 'department', sector.id, { name: 'D', jobTitles: titles });
    expect(withTitles.jobTitles).toHaveLength(1);
    expect((await api.create(agent, 'section', sector.id, { name: 'No titles' })).jobTitles).toEqual([]);
    expect((await agent.post(`/api/org/nodes/${sector.id}/job-titles`).send({ jobTitles: titles.map((x) => ({ ...x, grade: 7, track: 'P' })) }).expect(422)).body.code).toBe('INVALID_ORG_HIERARCHY');
  });

  it('builds the unit code by type (sector prefix, department, section directly under a sector, office 09, unit) and keeps it when the unit moves', async () => {
    const { agent } = await api.admin();
    const sector = await api.create(agent, 'sector', null, { name: 'S', codePrefix: 'OPS', managementMode: 'shared' });
    expect(sector.code).toBe('OPS.00.00.00');
    const [d1, d2] = [await api.create(agent, 'department', sector.id, { name: 'D1' }), await api.create(agent, 'department', sector.id, { name: 'D2' })];
    expect([d1.code, d2.code]).toEqual(['OPS.01.00.00', 'OPS.02.00.00']);
    const sectionUnderSector = await api.create(agent, 'section', sector.id, { name: 'Direct section' });
    expect(sectionUnderSector.code).toBe('OPS.00.01.00');
    const sectionUnderDepartment = await api.create(agent, 'section', d2.id, { name: 'Sec' });
    expect(sectionUnderDepartment.code).toBe('OPS.02.01.00');
    expect((await api.create(agent, 'unit', sectionUnderDepartment.id, { name: 'U' })).code).toBe('OPS.02.01.01');
    const office = await api.create(agent, 'office', sector.id, { name: 'Office' });
    expect(office.code).toBe('OPS.09.00.00');
    expect((await api.create(agent, 'section', office.id, { name: 'Under office' })).code).toBe('OPS.09.01.00');
    expect((await api.create(agent, 'office', d1.id, { name: 'Dept office' })).code).toBe('OPS.01.09.00');
    const moved = (await agent.post(`/api/org/nodes/${sectionUnderDepartment.id}/move`).send({ parentId: d1.id }).expect(200)).body as OrgNodeDto;
    expect(moved.code).toBe('OPS.02.01.00');
  });

  it('answers 422 ORG_CODE_SLOT_UNAVAILABLE when the slot of the type is taken above, 422 without the prefix a sector needs, 400 for a bad prefix, 409 for a prefix already used', async () => {
    const { agent } = await api.admin();
    const sector = await api.create(agent, 'sector', null, { name: 'S', codePrefix: 'OPS', managementMode: 'shared' });
    const section = await api.create(agent, 'section', sector.id, { name: 'Sec' });
    const before = await api.levels(agent);
    await agent.put('/api/org/levels/rules').send({ rules: { ...before.rules, section: ['section', 'unit'] } }).expect(200);
    const sectionType = await api.levelId(agent, 'section');
    const res = await agent.post('/api/org/nodes').send(api.body(sectionType, section.id, 'Inner')).expect(422);
    expect(res.body.code).toBe('ORG_CODE_SLOT_UNAVAILABLE');
    const sectorBody = api.body(await api.levelId(agent, 'sector'), null, 'S2', { managementMode: 'shared' });
    expect((await agent.post('/api/org/nodes').send(sectorBody).expect(422)).body.code).toBe('ORG_CODE_PREFIX_REQUIRED');
    for (const prefix of ['ab', 'abc', 'ABCD', 'A1C']) await agent.post('/api/org/nodes').send({ ...sectorBody, codePrefix: prefix }).expect(400);
    expect((await agent.post('/api/org/nodes').send({ ...sectorBody, codePrefix: 'OPS' }).expect(409)).body.code).toBe('ORG_CODE_TAKEN');
  });

  it('gives two creations at the same moment two different codes (a lock on the parent)', async () => {
    const { agent } = await api.admin();
    const sector = await api.create(agent, 'sector', null, { name: 'S', codePrefix: 'RAC', managementMode: 'shared' });
    const department = await api.levelId(agent, 'department');
    const made = await Promise.all([1, 2, 3, 4].map((n) => agent.post('/api/org/nodes').send(api.body(department, sector.id, `D${n}`))));
    expect(made.map((r) => r.status)).toEqual([201, 201, 201, 201]);
    expect(made.map((r) => r.body.code).sort()).toEqual(['RAC.01.00.00', 'RAC.02.00.00', 'RAC.03.00.00', 'RAC.04.00.00']);
  });

  it('lets a unit created before codes existed get its code once (422/409/400 otherwise); its children stay without a code', async () => {
    const { agent } = await api.admin();
    const sector = await api.create(agent, 'sector', null, { name: 'S', codePrefix: 'OPS', managementMode: 'shared' });
    const old = await api.create(agent, 'department', sector.id, { name: 'Old' });
    await t.db.query('UPDATE org_nodes SET code = NULL WHERE id = $1', [old.id]);
    const child = await api.create(agent, 'section', old.id, { name: 'Child' });
    expect(child.code).toBeNull();
    await agent.put(`/api/org/nodes/${old.id}/code`).send({ code: 'bad' }).expect(400);
    await agent.put(`/api/org/nodes/${old.id}/code`).send({ code: 'OPS.00.00.00' }).expect(409);
    const set = await agent.put(`/api/org/nodes/${old.id}/code`).send({ code: 'OPS.07.00.00' }).expect(200);
    expect(set.body.code).toBe('OPS.07.00.00');
    expect((await agent.put(`/api/org/nodes/${old.id}/code`).send({ code: 'OPS.08.00.00' }).expect(409)).body.code).toBe('ORG_CODE_ALREADY_SET');
    await agent.put(`/api/org/nodes/${old.id}/code`).send({ code: 'OPS.08.00.00', extra: 1 }).expect(400);
  });

  it('403 without the key of each write (levels, rules, create, code), and 403 ADMIN_MODE_REQUIRED outside admin mode', async () => {
    const levelsAgent = await t.factories.signInAdminMode(await t.factories.user({ grants: grantsWithout(CorePermission.OrgLevelsManage) }));
    await levelsAgent.put('/api/org/levels').send({ levels: [{ nameAr: 'قطاع', nameEn: 'Sector', acceptsTitles: false }] }).expect(403);
    await levelsAgent.put('/api/org/levels/rules').send({ rules: {} }).expect(403);
    const createAgent = await t.factories.signInAdminMode(await t.factories.user({ grants: grantsWithout(CorePermission.OrgUnitCreate) }));
    await createAgent.post('/api/org/nodes').send(api.body('00000000-0000-4000-8000-000000000001', null, 'S')).expect(403);
    const updateAgent = await t.factories.signInAdminMode(await t.factories.user({ grants: grantsWithout(CorePermission.OrgUnitUpdate) }));
    await updateAgent.put('/api/org/nodes/00000000-0000-4000-8000-000000000001/code').send({ code: 'OPS.00.00.00' }).expect(403);
    const plain = await t.factories.signIn(await t.factories.user());
    await plain.put('/api/org/levels').send({ levels: [{ nameAr: 'قطاع', nameEn: 'Sector', acceptsTitles: false }] }).expect(403);
    const outside = await t.factories.signIn(await t.factories.user({ grants: orgAdminGrants }));
    expect((await outside.put('/api/org/levels/rules').send({ rules: {} }).expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
    expect((await outside.get('/api/org/levels').expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
    const noOrgView = await t.factories.signIn(await t.factories.user({ bare: true }));
    await noOrgView.get('/api/org/levels').expect(403);
  });

  it('lets any company place employees in any unit that accepts them (FR-96)', async () => {
    const org = await t.factories.org();
    const directory = t.app.get(OrgDirectoryService);
    await expect(directory.assertPlacement({ orgNodeId: org.unitA.id, jobTitleId: org.unitA.titleId })).resolves.toBeUndefined();
    await expect(directory.assertPlacement({ orgNodeId: org.unitOther.id, jobTitleId: org.unitOther.titleId })).resolves.toBeUndefined();
    await expect(directory.assertPlacement({ orgNodeId: org.sectionAB, jobTitleId: org.unitA.titleId })).rejects.toMatchObject({ code: 'INVALID_PLACEMENT' });
    const options = await directory.nodeOptions();
    expect(options.map((o) => o.id)).toEqual(expect.arrayContaining([org.unitA.id, org.unitOther.id]));
  });
});

describe('Org structure built by forms (FR-24, FR-96)', () => {
  const t = useTestApp();
  const api = useOrgApi(t);

  it('stores the day a unit started working: required, in a sensible range, editable (FR-35)', async () => {
    const { agent } = await api.admin();
    const base = { levelId: await api.levelId(agent, 'sector'), parentId: null, nameAr: 'قطاع', nameEn: 'Sector', codePrefix: 'AAA', managementMode: 'shared' };
    await agent.post('/api/org/nodes').send(base).expect(400);
    await agent.post('/api/org/nodes').send({ ...base, startDate: '1979-12-31' }).expect(400);
    await agent.post('/api/org/nodes').send({ ...base, startDate: '2999-01-01' }).expect(400);
    await agent.post('/api/org/nodes').send({ ...base, startDate: 'not a date' }).expect(400);
    const created = await agent.post('/api/org/nodes').send({ ...base, startDate: '2022-03-15' }).expect(201);
    expect(created.body.startDate).toBe('2022-03-15');
    const planned = new Date();
    planned.setUTCFullYear(planned.getUTCFullYear() + 1);
    const edit = { nameAr: 'قطاع', nameEn: 'Sector', isActive: true };
    await agent.put(`/api/org/nodes/${created.body.id}`).send(edit).expect(400);
    const updated = await agent.put(`/api/org/nodes/${created.body.id}`).send({ ...edit, startDate: planned.toISOString().slice(0, 10) }).expect(200);
    expect(updated.body.startDate).toBe(planned.toISOString().slice(0, 10));
    const found = (await api.tree(agent, '?view=full')).nodes.find((n) => n.id === created.body.id);
    expect(found?.startDate).toBe(updated.body.startDate);
  });

  it('moves a unit within the rules, protects units in use and keeps the last job title', async () => {
    const org = await t.factories.org();
    const { agent } = await api.admin();
    const moved = await agent.post(`/api/org/nodes/${org.unitA.id}/move`).send({ parentId: org.sectionC }).expect(200);
    expect(moved.body.parentId).toBe(org.sectionC);
    await agent.post(`/api/org/nodes/${org.unitA.id}/move`).send({ parentId: org.unitB.id }).expect(422);
    await agent.post(`/api/org/nodes/${org.unitA.id}/move`).send({ parentId: null }).expect(422);
    expect((await agent.delete(`/api/org/nodes/${org.sectionC}`).expect(422)).body.code).toBe('ORG_NODE_IN_USE');
    await t.factories.user({ unit: org.unitB });
    expect((await agent.delete(`/api/org/nodes/${org.unitB.id}`).expect(422)).body.code).toBe('ORG_NODE_IN_USE');
    expect((await agent.delete(`/api/org/job-titles/${org.unitC.titleId}`).expect(422)).body.code).toBe('LAST_JOB_TITLE');
    const added = await agent.post(`/api/org/nodes/${org.unitC.id}/job-titles`).send({ jobTitles: [{ nameAr: 'محلل', nameEn: 'Analyst', grade: 7, track: 'P' }] }).expect(201);
    expect(added.body).toHaveLength(1);
    await agent.delete(`/api/org/job-titles/${org.unitC.titleId}`).expect(204);
    await agent.delete(`/api/org/nodes/${org.unitC.id}`).expect(204);
  });

  it('FR-24: reading the structure is open to who may view it, but every change needs platform admin mode (403 ADMIN_MODE_REQUIRED)', async () => {
    const org = await t.factories.org();
    const outside = await t.factories.signIn(await t.factories.user({ grants: orgAdminGrants }));
    expect((await outside.get('/api/org/tree').expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
    const { agent } = await api.admin();
    const sector = await api.levelId(agent, 'sector');
    const calls = [
      () => outside.put('/api/org/levels').send({ levels: [{ nameAr: 'قطاع', nameEn: 'S', acceptsTitles: false }] }),
      () => outside.put('/api/org/levels/rules').send({ rules: {} }),
      () => outside.post('/api/org/nodes').send(api.body(sector, null, 'S', { codePrefix: 'AAA', managementMode: 'shared' })),
      () => outside.put(`/api/org/nodes/${org.sectionAB}`).send({ startDate: START, nameAr: 'ق', nameEn: 'S', isActive: true }),
      () => outside.put(`/api/org/nodes/${org.sectionAB}/code`).send({ code: 'OPS.00.00.00' }),
      () => outside.post(`/api/org/nodes/${org.unitA.id}/move`).send({ parentId: org.sectionC }),
      () => outside.post(`/api/org/nodes/${org.sectionAB}/management-mode`).send({ mode: 'shared', reason: 'because' }),
      () => outside.delete(`/api/org/nodes/${org.unitC.id}`),
      () => outside.post(`/api/org/nodes/${org.unitC.id}/job-titles`).send({ jobTitles: [{ nameAr: 'م', nameEn: 'T' }] }),
    ];
    for (const call of calls) expect((await call().expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
  });

  it('answers 404 to a person whose company is not the group company (every unit belongs to it), and 200 to one of it', async () => {
    const org = await t.factories.org();
    const companyScoped = [ADMIN_MODE_GRANT, ...ORG_ADMIN_PERMISSIONS.map((key) => ({ key, scope: 'company' as const }))];
    const outsider = await t.factories.signInAdminMode(await t.factories.user({ unit: org.unitOther, grants: companyScoped }));
    await outsider.post(`/api/org/nodes/${org.unitA.id}/move`).send({ parentId: org.sectionC }).expect(404);
    await outsider.post(`/api/org/nodes/${org.unitA.id}/management-mode`).send({ mode: 'shared', reason: 'because' }).expect(404);
    await outsider.put(`/api/org/nodes/${org.unitA.id}/code`).send({ code: 'ABC.01.01.01' }).expect(404);
    const sector = await api.levelId(outsider, 'sector');
    await outsider.post('/api/org/nodes').send(api.body(sector, null, 'S', { codePrefix: 'AAA', managementMode: 'shared' })).expect(404);
    const insider = await t.factories.signInAdminMode(await t.factories.user({ unit: org.unitA, grants: companyScoped }));
    await insider.post(`/api/org/nodes/${org.unitA.id}/move`).send({ parentId: org.sectionC }).expect(200);
  });
});

describe('Units shared or managed per company, on any level (FR-97)', () => {
  const t = useTestApp();
  const api = useOrgApi(t);

  it('requires a sector and a unit directly under the group to choose the mode; elsewhere it is inherited unless set', async () => {
    const { agent } = await api.admin();
    const sectorBody = api.body(await api.levelId(agent, 'sector'), null, 'S', { codePrefix: 'AAA' });
    expect((await agent.post('/api/org/nodes').send(sectorBody).expect(422)).body.code).toBe('ORG_MODE_REQUIRED');
    expect((await agent.post('/api/org/nodes').send({ ...sectorBody, managementMode: null }).expect(422)).body.code).toBe('ORG_MODE_REQUIRED');
    await agent.post('/api/org/nodes').send({ ...sectorBody, managementMode: 'whatever' }).expect(400);
    const sector = (await agent.post('/api/org/nodes').send({ ...sectorBody, managementMode: 'per_company' }).expect(201)).body as OrgNodeDto;
    expect(sector).toMatchObject({ managementMode: 'per_company', effectiveMode: 'per_company' });
    const department = await api.create(agent, 'department', sector.id, { name: 'D' });
    expect(department).toMatchObject({ managementMode: null, effectiveMode: 'per_company' });
    const shared = await api.create(agent, 'department', sector.id, { name: 'Shared dept', managementMode: 'shared' });
    expect(shared).toMatchObject({ managementMode: 'shared', effectiveMode: 'shared' });
    const under = await api.create(agent, 'section', shared.id, { name: 'Under shared' });
    expect(under).toMatchObject({ managementMode: null, effectiveMode: 'shared' });
    const departmentType = await api.levelId(agent, 'department');
    const topDepartment = await agent.post('/api/org/nodes').send(api.body(departmentType, null, 'Top', { codePrefix: 'COM' })).expect(422);
    expect(topDepartment.body.code).toBe('ORG_MODE_REQUIRED');
  });

  it('reads the effective mode through the closure: the nearest explicit value above, and follows a move', async () => {
    const { agent } = await api.admin();
    const perCompany = await api.create(agent, 'sector', null, { name: 'P', codePrefix: 'PPP', managementMode: 'per_company' });
    const shared = await api.create(agent, 'sector', null, { name: 'S', codePrefix: 'SSS', managementMode: 'shared' });
    const department = await api.create(agent, 'department', shared.id, { name: 'D' });
    const section = await api.create(agent, 'section', department.id, { name: 'Sec' });
    const unit = await api.create(agent, 'unit', section.id, { name: 'U' });
    const nodes = (await api.tree(agent, '?view=full')).nodes;
    expect(nodes.filter((n) => [department.id, section.id, unit.id].includes(n.id)).map((n) => n.effectiveMode)).toEqual(['shared', 'shared', 'shared']);
    const moved = (await agent.post(`/api/org/nodes/${department.id}/move`).send({ parentId: perCompany.id }).expect(200)).body as OrgNodeDto;
    expect(moved.effectiveMode).toBe('per_company');
    const after = (await api.tree(agent, '?view=full')).nodes;
    expect(after.find((n) => n.id === unit.id)?.effectiveMode).toBe('per_company');
    // The list the tree builds in memory and the closure query agree for every unit.
    const rows = await t.db.query(
      `SELECT n.id, COALESCE((SELECT a.management_mode FROM org_node_closure c JOIN org_nodes a ON a.id = c.ancestor_id WHERE c.descendant_id = n.id AND a.management_mode IS NOT NULL ORDER BY c.depth LIMIT 1), 'per_company') AS mode FROM org_nodes n`,
    );
    for (const row of rows as { id: string; mode: ManagementMode }[]) expect(after.find((n) => n.id === row.id)?.effectiveMode).toBe(row.mode);
    await agent.post(`/api/org/nodes/${unit.id}/move`).send({ parentId: null }).expect(422); // a unit directly under the group must choose a mode first
  });

  it('changes the mode with a reason: counts the impact (units and employees of other companies), audits it, and leaves a unit with its own value alone', async () => {
    const { agent } = await api.admin();
    const other = await t.factories.company();
    const sector = await api.create(agent, 'sector', null, { name: 'S', codePrefix: 'AAA', managementMode: 'per_company' });
    const department = await api.create(agent, 'department', sector.id, { name: 'D' });
    const own = await api.create(agent, 'section', department.id, { name: 'Own', managementMode: 'per_company' });
    const inherits = await api.create(agent, 'section', department.id, { name: 'Inherits', jobTitles: [{ nameAr: 'مسمى', nameEn: 'Title' }] });
    const person = await t.factories.user({ unit: { id: inherits.id, titleId: inherits.jobTitles[0]?.id as string, companyId: other } });
    await t.db.query('UPDATE employees SET company_id = $1 WHERE id = $2', [other, person.employeeId]);
    const res = await agent.post(`/api/org/nodes/${department.id}/management-mode`).send({ mode: 'shared', reason: 'Managed once by the group' }).expect(200);
    expect(res.body.impact).toEqual({ unitsAffected: 2, employeesOfOtherCompanies: 1 });
    expect(res.body.node).toMatchObject({ managementMode: 'shared', effectiveMode: 'shared' });
    const nodes = (await api.tree(agent, '?view=full')).nodes;
    expect(nodes.find((n) => n.id === inherits.id)?.effectiveMode).toBe('shared');
    expect(nodes.find((n) => n.id === own.id)?.effectiveMode).toBe('per_company');
    await new Promise((resolve) => setTimeout(resolve, 300)); // audit entries are written asynchronously
    const audit = await t.db.query(`SELECT changes FROM audit_logs WHERE action = 'org.unit.mode-changed' ORDER BY created_at DESC LIMIT 1`);
    expect(audit[0].changes).toMatchObject({ from: null, to: 'shared', reason: 'Managed once by the group', unitsAffected: 2, employeesOfOtherCompanies: 1 });
    const back = await agent.post(`/api/org/nodes/${department.id}/management-mode`).send({ mode: null, reason: 'Inherit again' }).expect(200);
    expect(back.body.node).toMatchObject({ managementMode: null, effectiveMode: 'per_company' });
  });

  it('validates the change: a reason is required, a sector and a unit under the group cannot inherit, 404 for an unknown unit, 403 without org.unit_share', async () => {
    const { agent } = await api.admin();
    const sector = await api.create(agent, 'sector', null, { name: 'S', codePrefix: 'AAA', managementMode: 'shared' });
    const route = `/api/org/nodes/${sector.id}/management-mode`;
    await agent.post(route).send({ mode: 'per_company' }).expect(400);
    await agent.post(route).send({ mode: 'per_company', reason: 'ab' }).expect(400);
    await agent.post(route).send({ mode: 'sometimes', reason: 'because' }).expect(400);
    await agent.post(route).send({ mode: 'per_company', reason: 'because', extra: 1 }).expect(400);
    expect((await agent.post(route).send({ mode: null, reason: 'because' }).expect(422)).body.code).toBe('ORG_MODE_REQUIRED');
    await agent.post('/api/org/nodes/00000000-0000-4000-8000-000000000001/management-mode').send({ mode: 'shared', reason: 'because' }).expect(404);
    const denied = await t.factories.signInAdminMode(await t.factories.user({ grants: grantsWithout(CorePermission.OrgUnitShare) }));
    await denied.post(route).send({ mode: 'per_company', reason: 'because' }).expect(403);
  });
});

describe('Who sees which units (FR-98)', () => {
  const t = useTestApp();
  const api = useOrgApi(t);

  /** A per-company sector with two departments (a unit each) and a shared sector with a department and a unit. */
  async function structure() {
    const { agent, user } = await api.admin();
    const ops = await t.factories.node({ key: 'sector', parentId: null, name: 'Ops', mode: 'per_company' });
    const d1 = await t.factories.node({ key: 'department', parentId: ops.id, name: 'D1' });
    const d2 = await t.factories.node({ key: 'department', parentId: ops.id, name: 'D2' });
    const u1 = await t.factories.node({ key: 'unit', parentId: d1.id, name: 'U1', titles: true });
    const u2 = await t.factories.node({ key: 'unit', parentId: d2.id, name: 'U2', titles: true });
    const shared = await t.factories.node({ key: 'sector', parentId: null, name: 'Shared', mode: 'shared' });
    const sd = await t.factories.node({ key: 'department', parentId: shared.id, name: 'SD' });
    const su = await t.factories.node({ key: 'unit', parentId: sd.id, name: 'SU', titles: true });
    const companyB = await t.factories.company();
    const inCompany = async (unit: TestUnit, company: string) => {
      const person = await t.factories.user({ unit });
      await t.db.query('UPDATE employees SET company_id = $1 WHERE id = $2', [company, person.employeeId]);
      return person;
    };
    return { agent, user, ops, d1, d2, u1, u2, shared, sd, su, companyB, inCompany, companyA: await t.factories.defaultCompany() };
  }
  const names = (tree: OrgTreeDto): string[] => tree.nodes.map((n) => n.nameEn).sort();

  it('a person sees the units of their own company (those with their colleagues under them, and the ones above), and the shared ones that have anyone', async () => {
    const s = await structure();
    const a = await s.inCompany(s.u1, s.companyA);
    const b = await s.inCompany(s.u2, s.companyB);
    await s.inCompany(s.su, s.companyB);
    const viewA = await t.factories.signIn(a);
    const treeA = await api.tree(viewA);
    expect(treeA).toMatchObject({ view: 'team', companyId: s.companyA, hiddenCount: 2, noLeader: [] });
    expect(names(treeA)).toEqual(['D1', 'Ops', 'SD', 'SU', 'Shared', 'U1']);
    expect(treeA.nodes.find((n) => n.nameEn === 'U1')).toMatchObject({ staffCount: 1, staffByCompany: null, visibleForCompany: null, hasNoLeader: false });
    expect(treeA.nodes.find((n) => n.nameEn === 'SU')?.staffCount).toBe(0); // only the viewer's company is counted
    const treeB = await api.tree(await t.factories.signIn(b));
    expect(treeB.companyId).toBe(s.companyB);
    expect(names(treeB)).toEqual(['D2', 'Ops', 'SD', 'SU', 'Shared', 'U2']);
  });

  it('a person cannot look at another company: no company parameter exists, and the whole structure needs org.view_full (403)', async () => {
    const s = await structure();
    const a = await t.factories.signIn(await s.inCompany(s.u1, s.companyA));
    for (const query of [`?asCompany=${s.companyB}`, '?view=full', `?view=full&asCompany=${s.companyB}`]) {
      expect((await a.get(`/api/org/tree${query}`).expect(403)).body.code).toBe('ORG_VIEW_FULL_REQUIRED');
    }
    await a.get(`/api/org/tree?company=${s.companyB}`).expect(400);
    await a.get('/api/org/tree?view=everything').expect(400);
  });

  it('placing the first employee of a company in a unit shows it, and moving the last one away hides it again', async () => {
    const s = await structure();
    const person = await s.inCompany(s.u1, s.companyA);
    const session = await t.factories.signIn(person);
    expect(names(await api.tree(session))).not.toContain('U2');
    await t.db.query('UPDATE employees SET org_node_id = $1, job_title_id = $2 WHERE id = $3', [s.u2.id, s.u2.titleId, person.employeeId]);
    const moved = await api.tree(session);
    expect(names(moved)).toContain('U2');
    expect(names(moved)).not.toContain('U1');
    expect(names(moved)).not.toContain('D1');
  });

  it('a holder of org.view_full sees every unit, even empty, with the employees of each company; asCompany marks what that company would see', async () => {
    const s = await structure();
    await s.inCompany(s.u1, s.companyA);
    await s.inCompany(s.u2, s.companyB);
    await s.inCompany(s.su, s.companyB);
    const full = await api.tree(s.agent, '?view=full');
    expect(full).toMatchObject({ view: 'full', companyId: null, hiddenCount: 0 });
    expect(full.nodes).toHaveLength(8);
    const u1 = full.nodes.find((n) => n.nameEn === 'U1');
    expect(u1).toMatchObject({ staffCount: 1, staffByCompany: { [s.companyA]: 1 }, visibleForCompany: null });
    expect(u1?.code).toMatch(/^[A-Z]{3}\.01\.00\.01$/);
    expect(full.nodes.find((n) => n.nameEn === 'Ops')?.subtreeStaffCount).toBe(2);
    const asB = await api.tree(s.agent, `?view=full&asCompany=${s.companyB}`);
    expect(asB.companyId).toBe(s.companyB);
    const flags = Object.fromEntries(asB.nodes.map((n) => [n.nameEn, n.visibleForCompany]));
    expect(flags).toEqual({ Ops: true, D1: false, D2: true, U1: false, U2: true, Shared: true, SD: true, SU: true });
    expect((await api.tree(s.agent, `?asCompany=${s.companyB}`)).view).toBe('full'); // asCompany alone is the full view
    await s.agent.get('/api/org/tree?asCompany=00000000-0000-4000-8000-000000000001').expect(404);
    await s.agent.get('/api/org/tree?asCompany=not-an-id').expect(400);
  });

  it('a shared unit with nobody under it is hidden from a person, and shown to the holder of org.view_full', async () => {
    const s = await structure();
    const session = await t.factories.signIn(await s.inCompany(s.u1, s.companyA));
    expect(names(await api.tree(session))).not.toContain('Shared');
    expect(names(await api.tree(s.agent, '?view=full'))).toContain('Shared');
  });

  it('403 for a person with no org.view; and a holder of view_full without the edit keys still reads the whole structure', async () => {
    await structure();
    await t.factories.signIn(await t.factories.user({ bare: true })).then((a) => a.get('/api/org/tree').expect(403));
    const reader = await t.factories.signIn(await t.factories.user({ grants: [{ key: CorePermission.OrgViewFull, scope: ALL }] }));
    expect((await api.tree(reader, '?view=full')).nodes).toHaveLength(8);
  });

  it('lists the units managed per company that have employees of a company and nobody who leads them for it; a leader of that company closes the entry', async () => {
    const s = await structure();
    const a = await s.inCompany(s.u1, s.companyA);
    await s.inCompany(s.u2, s.companyB);
    await s.inCompany(s.su, s.companyB);
    const full = await api.tree(s.agent, '?view=full');
    expect(full.noLeader).toEqual(expect.arrayContaining([{ nodeId: s.u1.id, companyId: s.companyA }, { nodeId: s.u2.id, companyId: s.companyB }]));
    expect(full.noLeader).toHaveLength(2); // the shared unit is led from the group, so it is not listed
    expect(full.nodes.filter((n) => n.hasNoLeader).map((n) => n.nameEn).sort()).toEqual(['U1', 'U2']);
    const setLeader = (nodeId: string, companyId: string, employeeId: string) =>
      s.agent.put(`/api/org/nodes/${nodeId}/leaders`).send({ companyId, employeeId, kind: 'leader', validFrom: riyadhToday(), reason: 'test' }).expect(200);
    await setLeader(s.u1.id, s.companyA, a.employeeId);
    expect((await api.tree(s.agent, '?view=full')).noLeader).toEqual([{ nodeId: s.u2.id, companyId: s.companyB }]);
    await setLeader(s.u2.id, s.companyA, a.employeeId); // a leader for another company does not lead it for company B
    expect((await api.tree(s.agent, '?view=full')).noLeader).toHaveLength(1);
    const plain = await t.factories.signIn(await s.inCompany(s.u1, s.companyA));
    const seen = await api.tree(plain);
    expect(seen.noLeader).toEqual([]);
    expect(seen.nodes.some((n) => n.hasNoLeader)).toBe(false);
  });
});

describe('A leader of a unit managed per company reaches only the people of their company (FR-100)', () => {
  const t = useTestApp();
  const api = useOrgApi(t);

  async function setup(mode: ManagementMode) {
    const { agent } = await api.admin();
    const sector = await t.factories.node({ key: 'sector', parentId: null, name: 'Sector', mode });
    const department = await t.factories.node({ key: 'department', parentId: sector.id, name: 'Dept' });
    const unit = await t.factories.node({ key: 'unit', parentId: department.id, name: 'Unit', titles: true });
    const companyB = await t.factories.company();
    const leader = await t.factories.user({ unit });
    const colleague = await t.factories.user({ unit });
    const foreigner = await t.factories.user({ unit });
    await t.db.query('UPDATE employees SET company_id = $1 WHERE id = $2', [companyB, foreigner.employeeId]);
    // The leader leads the department: the head role of the unit they manage reaches it and everything below.
    await agent.put(`/api/org/nodes/${department.id}`).send({ nameAr: 'Dept ع', nameEn: 'Dept', startDate: START, isActive: true, managerId: leader.employeeId }).expect(200);
    return { agent, sector, department, leader, colleague, foreigner };
  }
  const seenBy = async (user: TestUser): Promise<string[]> =>
    (((await (await t.factories.signIn(user)).get('/api/employees').query({ pageSize: 100 }).expect(200)).body.items) as { id: string }[]).map((e) => e.id);

  it('in a per-company unit the leader sees the people of their company and not those of another company in the same unit', async () => {
    const s = await setup('per_company');
    const seen = await seenBy(s.leader);
    expect(seen).toEqual(expect.arrayContaining([s.leader.employeeId, s.colleague.employeeId]));
    expect(seen).not.toContain(s.foreigner.employeeId);
  });

  it('in a shared unit the leader sees everyone under it, whatever their company', async () => {
    const s = await setup('shared');
    expect(await seenBy(s.leader)).toEqual(expect.arrayContaining([s.leader.employeeId, s.colleague.employeeId, s.foreigner.employeeId]));
  });

  it('follows a change of mode at once: sharing the sector shows the other company, taking it back hides it again', async () => {
    const s = await setup('per_company');
    expect(await seenBy(s.leader)).not.toContain(s.foreigner.employeeId);
    await s.agent.post(`/api/org/nodes/${s.sector.id}/management-mode`).send({ mode: 'shared', reason: 'Managed by the group' }).expect(200);
    expect(await seenBy(s.leader)).toContain(s.foreigner.employeeId);
    await s.agent.post(`/api/org/nodes/${s.sector.id}/management-mode`).send({ mode: 'per_company', reason: 'Per company again' }).expect(200);
    expect(await seenBy(s.leader)).not.toContain(s.foreigner.employeeId);
  });

  it('a unit with its own mode under a shared parent is restricted on its own', async () => {
    const s = await setup('shared');
    await s.agent.post(`/api/org/nodes/${s.department.id}/management-mode`).send({ mode: 'per_company', reason: 'This department is per company' }).expect(200);
    expect(await seenBy(s.leader)).not.toContain(s.foreigner.employeeId);
  });
});

import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import type { TestAgent, TestUser } from './factories/factories';
import { useTestApp } from './setup/test-app';

const ALL = 'all' as const;
const orgAdminGrants = [
  { key: CorePermission.CompaniesView, scope: ALL },
  { key: CorePermission.CompaniesManage, scope: ALL },
  { key: CorePermission.OrgView, scope: ALL },
  { key: CorePermission.OrgManage, scope: ALL },
];

interface Level {
  id: string;
  nameAr: string;
  nameEn: string;
  isAssignable: boolean;
  sortOrder: number;
}

describe('Companies (FR-19, FR-25)', () => {
  const t = useTestApp();

  it('creates a company with the default levels, refuses a duplicate code, updates and deletes an empty one', async () => {
    const agent = await t.factories.signIn(await t.factories.user({ grants: orgAdminGrants }));
    const created = await agent.post('/api/companies').send({ code: 'xyz', nameAr: 'شركة تجريبية', nameEn: 'Test Co' }).expect(201);
    expect(created.body).toMatchObject({ code: 'XYZ', nameEn: 'Test Co', isActive: true, employeesCount: 0 });
    const tree = await agent.get(`/api/org/companies/${created.body.id}/tree`).expect(200);
    expect(tree.body.levels.map((l: Level) => l.nameEn)).toEqual(['Sector', 'Department', 'Section', 'Unit']);
    expect(tree.body.levels.map((l: Level) => l.isAssignable)).toEqual([false, false, false, true]);
    await agent.post('/api/companies').send({ code: 'XYZ', nameAr: 'مكرر', nameEn: 'Dup' }).expect(409);
    await agent.put(`/api/companies/${created.body.id}`).send({ code: 'XYZ', nameAr: 'اسم جديد', nameEn: 'New name', isActive: false }).expect(200);
    await agent.delete(`/api/companies/${created.body.id}`).expect(204);
    expect((await agent.get('/api/companies').expect(200)).body.map((c: { code: string }) => c.code)).not.toContain('XYZ');
  });

  it('refuses to delete a company that has units or employees (422)', async () => {
    const org = await t.factories.org();
    const agent = await t.factories.signIn(await t.factories.user({ grants: orgAdminGrants }));
    const res = await agent.delete(`/api/companies/${org.companyId}`).expect(422);
    expect(res.body.code).toBe('COMPANY_IN_USE');
  });

  it('returns 403 without the permission and validates the input', async () => {
    const plain = await t.factories.signIn(await t.factories.user());
    await plain.get('/api/companies').expect(403);
    await plain.post('/api/companies').send({ code: 'A1', nameAr: 'أ', nameEn: 'a' }).expect(403);
    const agent = await t.factories.signIn(await t.factories.user({ grants: orgAdminGrants }));
    await agent.post('/api/companies').send({ code: 'bad code!', nameAr: 'شركة', nameEn: 'Co' }).expect(400);
    await agent.post('/api/companies').send({ code: 'OK1', nameAr: 'شركة', nameEn: 'Co', extra: 1 }).expect(400);
  });
});

describe('Org structure built by forms (FR-24)', () => {
  const t = useTestApp();

  async function admin(): Promise<{ agent: TestAgent; user: TestUser }> {
    const user = await t.factories.user({ grants: orgAdminGrants });
    return { agent: await t.factories.signIn(user), user };
  }

  const levelsOf = async (agent: TestAgent, companyId: string): Promise<Level[]> => (await agent.get(`/api/org/companies/${companyId}/tree`).expect(200)).body.levels;
  const asInput = (levels: Level[]) => levels.map(({ id, nameAr, nameEn, isAssignable }) => ({ id, nameAr, nameEn, isAssignable }));

  it('renames levels without any warning, and appends a level at the end', async () => {
    const org = await t.factories.org();
    const { agent } = await admin();
    const levels = asInput(await levelsOf(agent, org.companyId));
    const renamed = levels.map((l, i) => (i === 0 ? { ...l, nameEn: 'Group' } : l));
    const preview = await agent.post('/api/org/levels/preview').send({ companyId: org.companyId, levels: renamed }).expect(200);
    expect(preview.body).toEqual({ requiresConfirmation: false, impact: null });
    await agent.post('/api/org/levels').send({ companyId: org.companyId, levels: renamed }).expect(200);
    const appended = [...renamed, { nameAr: 'فريق', nameEn: 'Team', isAssignable: true }];
    const saved = await agent.post('/api/org/levels').send({ companyId: org.companyId, levels: appended }).expect(200);
    expect(saved.body.map((l: Level) => l.nameEn)).toEqual(['Group', 'Department', 'Section', 'Unit', 'Team']);
  });

  it('requires the last level to accept employees and refuses levels of another company', async () => {
    const org = await t.factories.org();
    const { agent } = await admin();
    const levels = asInput(await levelsOf(agent, org.companyId));
    await agent.post('/api/org/levels').send({ companyId: org.companyId, levels: levels.map((l) => ({ ...l, isAssignable: false })) }).expect(400);
    const others = asInput(await levelsOf(agent, org.otherCompanyId));
    const res = await agent.post('/api/org/levels').send({ companyId: org.companyId, levels: others }).expect(422);
    expect(res.body.code).toBe('INVALID_ORG_HIERARCHY');
  });

  it('adds units under the right parent level and requires job titles on units that accept employees', async () => {
    const { agent } = await admin();
    const companyId = await t.factories.company();
    const levels = await levelsOf(agent, companyId);
    const sector = await agent.post('/api/org/nodes').send({ levelId: levels[0]?.id, parentId: null, nameAr: 'قطاع', nameEn: 'Sector' }).expect(201);
    await agent.post('/api/org/nodes').send({ levelId: levels[0]?.id, parentId: sector.body.id, nameAr: 'قطاع', nameEn: 'Sector' }).expect(422);
    await agent.post('/api/org/nodes').send({ levelId: levels[2]?.id, parentId: sector.body.id, nameAr: 'قسم', nameEn: 'Section' }).expect(422);
    const department = await agent.post('/api/org/nodes').send({ levelId: levels[1]?.id, parentId: sector.body.id, nameAr: 'إدارة', nameEn: 'Dept' }).expect(201);
    expect(department.body.pathEn).toBe('Sector › Dept');
    const section = await agent.post('/api/org/nodes').send({ levelId: levels[2]?.id, parentId: department.body.id, nameAr: 'قسم', nameEn: 'Section' }).expect(201);
    const noTitles = await agent.post('/api/org/nodes').send({ levelId: levels[3]?.id, parentId: section.body.id, nameAr: 'وحدة', nameEn: 'Unit' }).expect(422);
    expect(noTitles.body.message).toMatch(/at least one job title/);
    await agent.post('/api/org/nodes').send({ levelId: levels[1]?.id, parentId: sector.body.id, nameAr: 'إدارة', nameEn: 'D2', jobTitles: [{ nameAr: 'مسمى', nameEn: 'Title' }] }).expect(422);
    const unit = await agent
      .post('/api/org/nodes')
      .send({ levelId: levels[3]?.id, parentId: section.body.id, nameAr: 'وحدة', nameEn: 'Unit', jobTitles: [{ nameAr: 'مطور', nameEn: 'Developer' }] })
      .expect(201);
    expect(unit.body.jobTitles).toHaveLength(1);
    expect(unit.body.pathEn).toBe('Sector › Dept › Section › Unit');
  });

  it('moves a unit within the rules, protects units in use and keeps the last job title', async () => {
    const org = await t.factories.org();
    const { agent } = await admin();
    const moved = await agent.post(`/api/org/nodes/${org.unitA.id}/move`).send({ parentId: org.sectionC }).expect(200);
    expect(moved.body.parentId).toBe(org.sectionC);
    await agent.post(`/api/org/nodes/${org.unitA.id}/move`).send({ parentId: org.unitB.id }).expect(422);
    await agent.post(`/api/org/nodes/${org.unitA.id}/move`).send({ parentId: null }).expect(422);
    expect((await agent.delete(`/api/org/nodes/${org.sectionC}`).expect(422)).body.code).toBe('ORG_NODE_IN_USE');
    await t.factories.user({ unit: org.unitB });
    expect((await agent.delete(`/api/org/nodes/${org.unitB.id}`).expect(422)).body.code).toBe('ORG_NODE_IN_USE');
    expect((await agent.delete(`/api/org/job-titles/${org.unitC.titleId}`).expect(422)).body.code).toBe('LAST_JOB_TITLE');
    const added = await agent.post(`/api/org/nodes/${org.unitC.id}/job-titles`).send({ jobTitles: [{ nameAr: 'محلل', nameEn: 'Analyst' }] }).expect(201);
    expect(added.body).toHaveLength(1);
    await agent.delete(`/api/org/job-titles/${org.unitC.titleId}`).expect(204);
    await agent.delete(`/api/org/nodes/${org.unitC.id}`).expect(204);
  });

  it('hides another company\'s structure from a user whose org permission reaches only their own company (404)', async () => {
    const org = await t.factories.org();
    const user = await t.factories.user({ unit: org.unitA, grants: [{ key: CorePermission.OrgView, scope: 'company' }, { key: CorePermission.OrgManage, scope: 'company' }] });
    const agent = await t.factories.signIn(user);
    await agent.get(`/api/org/companies/${org.companyId}/tree`).expect(200);
    await agent.get(`/api/org/companies/${org.otherCompanyId}/tree`).expect(404);
    await agent.post(`/api/org/nodes/${org.unitOther.id}/move`).send({ parentId: null }).expect(404);
    const otherLevels = await levelsOf(await t.factories.signIn(await t.factories.user({ grants: orgAdminGrants })), org.otherCompanyId);
    await agent.post('/api/org/nodes').send({ levelId: otherLevels[0]?.id, parentId: null, nameAr: 'قطاع', nameEn: 'Xx' }).expect(404);
  });

  describe('changing levels that hold data asks for confirmation first', () => {
    /** Section becomes the last level and accepts employees; the unit level is then removed with its units. */
    async function removingUnitLevel() {
      const org = await t.factories.org();
      const { agent, user } = await admin();
      const levels = await levelsOf(agent, org.companyId);
      const withSectionAssignable = asInput(levels).map((l, i) => (i === 2 ? { ...l, isAssignable: true } : l));
      await agent.post('/api/org/levels').send({ companyId: org.companyId, levels: withSectionAssignable }).expect(200);
      const titles = await agent.post(`/api/org/nodes/${org.sectionC}/job-titles`).send({ jobTitles: [{ nameAr: 'مسؤول', nameEn: 'Lead' }] }).expect(201);
      const staff = [await t.factories.user({ unit: org.unitA }), await t.factories.user({ unit: org.unitB })];
      const without = withSectionAssignable.slice(0, 3);
      return { org, agent, user, staff, without, newTitleId: titles.body[0].id as string };
    }

    it('shows what would go (units, job titles, employees) without changing anything', async () => {
      const { org, agent, without } = await removingUnitLevel();
      const preview = await agent.post('/api/org/levels/preview').send({ companyId: org.companyId, levels: without }).expect(200);
      expect(preview.body.requiresConfirmation).toBe(true);
      expect(preview.body.impact).toMatchObject({ unitsCount: 3, jobTitlesCount: 3, employeesCount: 2 });
      expect(preview.body.impact.titlesWithEmployees).toHaveLength(2);
      expect(preview.body.impact.impactToken).toBeTruthy();
      expect((await levelsOf(agent, org.companyId)).map((l) => l.nameEn)).toContain('Unit');
    });

    it('refuses to apply it without a confirmation, with a stale confirmation, or without a decision about the employees', async () => {
      const { org, agent, without } = await removingUnitLevel();
      const first = await agent.post('/api/org/levels').send({ companyId: org.companyId, levels: without }).expect(409);
      expect(first.body.code).toBe('ORG_IMPACT_CONFIRMATION_REQUIRED');
      expect(first.body.details.employeesCount).toBe(2);
      const stale = await agent.post('/api/org/levels').send({ companyId: org.companyId, levels: without, confirm: { impactToken: 'x'.repeat(40) } }).expect(409);
      expect(stale.body.code).toBe('ORG_IMPACT_CHANGED');
      const token = first.body.details.impactToken as string;
      const undecided = await agent.post('/api/org/levels').send({ companyId: org.companyId, levels: without, confirm: { impactToken: token } }).expect(422);
      expect(undecided.body.code).toBe('EMPLOYEES_DECISION_REQUIRED');
      expect((await levelsOf(agent, org.companyId)).map((l) => l.nameEn)).toContain('Unit');
    });

    it('transfers the employees to another unit, mapping every job title, then removes the units', async () => {
      const { org, agent, staff, without, newTitleId } = await removingUnitLevel();
      const token = (await agent.post('/api/org/levels/preview').send({ companyId: org.companyId, levels: without }).expect(200)).body.impact;
      const oldTitles = token.titlesWithEmployees.map((x: { id: string }) => x.id) as string[];
      const missingMap = { action: 'transfer', unitId: org.sectionC, titleMap: {} };
      await agent.post('/api/org/levels').send({ companyId: org.companyId, levels: without, confirm: { impactToken: token.impactToken, employees: missingMap } }).expect(422);
      const doomed = { action: 'transfer', unitId: org.unitA.id, titleMap: Object.fromEntries(oldTitles.map((id) => [id, newTitleId])) };
      await agent.post('/api/org/levels').send({ companyId: org.companyId, levels: without, confirm: { impactToken: token.impactToken, employees: doomed } }).expect(422);
      const titleMap = Object.fromEntries(oldTitles.map((id) => [id, newTitleId]));
      const ok = await agent.post('/api/org/levels').send({ companyId: org.companyId, levels: without, confirm: { impactToken: token.impactToken, employees: { action: 'transfer', unitId: org.sectionC, titleMap } } }).expect(200);
      expect(ok.body.map((l: Level) => l.nameEn)).toEqual(['Sector', 'Department', 'Section']);
      const rows = await t.db.query('SELECT org_node_id, job_title_id, deleted_at FROM employees WHERE id = ANY($1)', [staff.map((s) => s.employeeId)]);
      for (const row of rows) {
        expect(row.org_node_id).toBe(org.sectionC);
        expect(row.job_title_id).toBe(newTitleId);
        expect(row.deleted_at).toBeNull();
      }
      const gone = await t.db.query('SELECT count(*)::int AS n FROM org_nodes WHERE id = ANY($1) AND deleted_at IS NULL', [[org.unitA.id, org.unitB.id, org.unitC.id]]);
      expect(gone[0].n).toBe(0);
    });

    it('deletes the employees only after their count is typed back; accounts are disabled and sessions end', async () => {
      const { org, agent, staff, without } = await removingUnitLevel();
      const member = await t.factories.signIn(staff[0] as TestUser);
      const impact = (await agent.post('/api/org/levels/preview').send({ companyId: org.companyId, levels: without }).expect(200)).body.impact;
      const confirm = (employees: unknown) => ({ companyId: org.companyId, levels: without, confirm: { impactToken: impact.impactToken, employees } });
      const wrong = await agent.post('/api/org/levels').send(confirm({ action: 'delete', confirmCount: 1 })).expect(422);
      expect(wrong.body.code).toBe('INVALID_EMPLOYEES_DECISION');
      await agent.post('/api/org/levels').send(confirm({ action: 'delete', confirmCount: 2 })).expect(200);
      const rows = await t.db.query('SELECT e.deleted_at, u.is_active FROM employees e JOIN users u ON u.id = e.user_id WHERE e.id = ANY($1)', [staff.map((s) => s.employeeId)]);
      for (const row of rows) {
        expect(row.deleted_at).not.toBeNull();
        expect(row.is_active).toBe(false);
      }
      await member.get('/api/me').expect(401);
      await new Promise((resolve) => setTimeout(resolve, 300)); // audit entries are written asynchronously
      const audit = await t.db.query(`SELECT changes FROM audit_logs WHERE action = 'org.levels.changed' ORDER BY created_at DESC LIMIT 1`);
      expect(audit[0].changes).toMatchObject({ employeesAction: 'delete', employeesAffected: 2 });
    });
  });
});

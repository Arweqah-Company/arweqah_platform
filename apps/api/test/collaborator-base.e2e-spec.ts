import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { useTestApp } from './setup/test-app';

const HR = [CorePermission.EmployeesView, CorePermission.EmployeesCreate, CorePermission.EmployeesUpdate, CorePermission.EmployeesAssignRoles, CorePermission.RolesView, CorePermission.LookupsView].map((key) => ({ key, scope: 'all' as const }));

describe('Collaborator base (FR-79)', () => {
  const t = useTestApp();
  const ids = async (sql: string, args: unknown[] = []) => ((await t.db.query(sql, args)) as { id: string }[]).map((r) => r.id);

  /** A relation with limited access (the seeded collaborator), the Employee role and the collaborator base: each made when the test database has none. */
  async function setup() {
    let [relation] = await ids(`SELECT id FROM relation_types WHERE limited_access LIMIT 1`);
    if (!relation) {
      [relation] = await ids(`INSERT INTO relation_types (code, sort_order, is_active, limited_access) VALUES ('collab-test', 90, true, true) RETURNING id`);
    }
    const [employeeRelation] = await ids(`INSERT INTO relation_types (code, sort_order, is_active, limited_access) VALUES ('emp-' || substr(md5(random()::text), 1, 6), 91, true, false) RETURNING id`);
    const role = async (rule: 'everyone' | 'limited_access') => {
      const [found] = await ids(`SELECT id FROM roles WHERE auto_rule = $1`, [rule]);
      if (found) return found;
      const made = await t.factories.role([{ key: CorePermission.ProfileView, scope: 'all' }]);
      await t.db.query(`UPDATE roles SET assignment = 'auto', auto_rule = $2 WHERE id = $1`, [made.id, rule]);
      return made.id;
    };
    return { relation: relation as string, employeeRelation: employeeRelation as string, everyoneId: await role('everyone'), baseId: await role('limited_access') };
  }

  const payload = (unit: { id: string; titleId: string; companyId: string }, extra: Record<string, unknown> = {}) => ({
    employeeNumber: `C-${Math.random().toString(36).slice(2, 8)}`, fullName: 'متعاون', fullNameEn: 'Collaborator', workEmail: `col-${Math.random().toString(36).slice(2, 8)}@arweqah.sa`,
    companyId: unit.companyId, orgNodeId: unit.id, jobTitleId: unit.titleId, startDate: '2025-01-01', ...extra,
  });

  it('FR-79: a collaborator gets the collaborator base and the title role, never the Employee role', async () => {
    const s = await setup();
    const org = await t.factories.org();
    const agent = await t.factories.signIn(await t.factories.user({ grants: HR }));
    const titleRole = (await ids(`SELECT id FROM roles WHERE job_title_id = $1`, [org.unitA.titleId]))[0];
    const made = (await agent.post('/api/employees').send(payload(org.unitA, { relationTypeId: s.relation, endDate: '2030-01-01' })).expect(201)).body.employee;
    expect(made.roles.map((r: { id: string }) => r.id).sort()).toEqual([s.baseId, titleRole].sort());
    expect(made.roles.map((r: { id: string }) => r.id)).not.toContain(s.everyoneId);
  });

  it('FR-79: a collaborator without an end date is refused (422), and an ordinary relation needs none', async () => {
    const s = await setup();
    const org = await t.factories.org();
    const agent = await t.factories.signIn(await t.factories.user({ grants: HR }));
    const refused = await agent.post('/api/employees').send(payload(org.unitA, { relationTypeId: s.relation })).expect(422);
    expect(JSON.stringify(refused.body)).toContain('endDate');
    await agent.post('/api/employees').send(payload(org.unitA, { relationTypeId: s.employeeRelation })).expect(201);
  });

  it('FR-79: changing the relation swaps only the base role; roles chosen by hand stay', async () => {
    const s = await setup();
    const org = await t.factories.org();
    const agent = await t.factories.signIn(await t.factories.user({ grants: HR }));
    const person = (await agent.post('/api/employees').send(payload(org.unitA, { relationTypeId: s.employeeRelation })).expect(201)).body.employee;
    const held = () => agent.get(`/api/employees/${person.id}`).expect(200).then((r) => r.body.roles.map((x: { id: string }) => x.id) as string[]);
    expect(await held()).toContain(s.everyoneId);
    const edit = (extra: Record<string, unknown>) => agent.put(`/api/employees/${person.id}`).send({ ...payload(org.unitA, extra), workEmail: person.workEmail, employeeNumber: person.employeeNumber });
    await edit({ relationTypeId: s.relation, endDate: '2030-01-01' }).expect(200);
    const asCollaborator = await held();
    expect(asCollaborator).toContain(s.baseId);
    expect(asCollaborator).not.toContain(s.everyoneId);
    await edit({ relationTypeId: s.employeeRelation }).expect(200);
    const back = await held();
    expect(back).toContain(s.everyoneId);
    expect(back).not.toContain(s.baseId);
  });

  it('FR-79: the collaborator base holds only own-account permissions', async () => {
    await setup();
    const keys = await ids(`SELECT p.permission_key AS id FROM role_permissions p JOIN roles r ON r.id = p.role_id WHERE r.auto_rule = 'limited_access'`);
    for (const key of keys) expect(key).toMatch(/^(profile|security|notifications)\./);
  });
});

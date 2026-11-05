import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { ADMIN_MODE_GRANT, ORG_AND_ROLES_ADMIN_GRANTS, type TestAgent, type TestOrg } from './factories/factories';
import { useTestApp } from './setup/test-app';

const ALL = 'all' as const;
const ORG_ADMIN = [ADMIN_MODE_GRANT, ...ORG_AND_ROLES_ADMIN_GRANTS];

interface Level {
  id: string;
}
interface NodeRow {
  id: string;
  parentId: string | null;
  nameEn: string;
}

/** Roles of the head of a level reach as many levels below as the role says (FR-80). */
describe('Depth of what a role reaches (FR-80)', () => {
  const t = useTestApp();
  let admin: TestAgent;

  const setup = async (): Promise<TestOrg> => {
    const org = await t.factories.org();
    admin = await t.factories.signInAdminMode(await t.factories.user({ grants: ORG_ADMIN }));
    return org;
  };
  const levelId = async (index: number): Promise<string> => ((await admin.get('/api/org/levels').expect(200)).body.levels as Level[])[index]?.id as string;
  /** Replaces what the head roles of the units of a level hold with these grants. */
  const giveHeadRole = async (index: number, grants: { key: string; scope: string }[]): Promise<void> => {
    const ids = ((await t.db.query(`SELECT r.id FROM roles r JOIN org_nodes n ON n.id = r.org_node_id WHERE r.auto_rule = 'node_head' AND n.org_level_id = $1`, [await levelId(index)])) as { id: string }[]).map((r) => r.id);
    for (const id of ids) {
      await t.db.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
      for (const g of grants) await t.db.query('INSERT INTO role_permissions (role_id, permission_key, scope) VALUES ($1, $2, $3)', [id, g.key, g.scope]);
    }
  };
  const setManager = async (nodeId: string, managerId: string): Promise<void> => {
    const nodes = (await admin.get('/api/org/tree?view=full').expect(200)).body.nodes as { id: string; nameAr: string; nameEn: string; startDate: string; isActive: boolean }[];
    const node = nodes.find((n) => n.id === nodeId) as { nameAr: string; nameEn: string; startDate: string; isActive: boolean };
    await admin.put(`/api/org/nodes/${nodeId}`).send({ nameAr: node.nameAr, nameEn: node.nameEn, startDate: node.startDate, isActive: node.isActive, managerId }).expect(200);
  };
  /** A person placed nowhere who manages the department of the test organization. */
  const departmentHead = async (org: TestOrg, grants: { key: string; scope: string }[]) => {
    await giveHeadRole(1, grants);
    const head = await t.factories.user({ without: ['org.view'] }); // the Employee role's own org.view (all) would hide the depth under test
    await setManager(org.department, head.employeeId);
    return t.factories.signIn(head);
  };
  const treeOf = async (agent: TestAgent): Promise<NodeRow[]> => (await agent.get('/api/org/tree').expect(200)).body.nodes;
  const employeesOf = async (agent: TestAgent): Promise<string[]> => ((await agent.get('/api/employees').query({ pageSize: 100 }).expect(200)).body.items as { id: string }[]).map((e) => e.id);

  it('does not narrow the structure by the depth of org.view (FR-98): a department head sees their company\'s structure, the units with colleagues of their company and the ones above', async () => {
    const org = await setup();
    await t.factories.user({ unit: org.unitA });
    const head = await departmentHead(org, [{ key: CorePermission.OrgView, scope: 'subtree:1' }]);
    const nodes = await treeOf(head);
    expect(nodes.map((n) => n.nameEn).sort()).toEqual(['Department', 'Section AB', 'Sector', 'Unit A']);
    expect(nodes.find((n) => n.id === org.department)?.parentId).not.toBeNull(); // the whole path from the sector, not the department as a top
  });

  it('never shows the units of another company\'s people, whatever the depth, and refuses to compare companies (403)', async () => {
    const org = await setup();
    await t.factories.user({ unit: org.unitA });
    await t.factories.user({ unit: org.unitOther });
    await t.db.query(`UPDATE org_nodes SET management_mode = 'per_company' WHERE parent_id IS NULL AND company_id = $1`, [org.otherCompanyId]); // the other company manages its own units: they are not shared with ours
    const two = await departmentHead(org, [{ key: CorePermission.OrgView, scope: 'subtree:2' }]);
    const names = (await treeOf(two)).map((n) => n.nameEn);
    expect(names).toContain('Unit A');
    expect(names.filter((n) => n.startsWith('Other'))).toEqual([]);
    await two.get(`/api/org/tree?asCompany=${org.otherCompanyId}`).expect(403);
  });

  it('keeps the employees of the units below out of reach until the depth reaches their unit', async () => {
    const org = await setup();
    const a = await t.factories.user({ unit: org.unitA });
    const c = await t.factories.user({ unit: org.unitC });
    const other = await t.factories.user({ unit: org.unitOther });
    const one = await departmentHead(org, [{ key: CorePermission.EmployeesView, scope: 'subtree:1' }]);
    const sawOne = await employeesOf(one);
    expect([a, c, other].some((u) => sawOne.includes(u.employeeId))).toBe(false);
    await one.get(`/api/employees/${a.employeeId}`).expect(404);
    // The same role, two levels deep: the units of the sections come into reach.
    const org2 = await t.factories.org();
    const two = await departmentHead(org2, [{ key: CorePermission.EmployeesView, scope: 'subtree:2' }]);
    const a2 = await t.factories.user({ unit: org2.unitA });
    const c2 = await t.factories.user({ unit: org2.unitC });
    const other2 = await t.factories.user({ unit: org2.unitOther });
    const sawTwo = await employeesOf(two);
    expect(sawTwo).toEqual(expect.arrayContaining([a2.employeeId, c2.employeeId]));
    expect(sawTwo).not.toContain(other2.employeeId);
    await two.get(`/api/employees/${other2.employeeId}`).expect(404);
  });

  it('refuses a depth outside the range, and a depth for a permission that does not allow subtree', async () => {
    await setup();
    const manager = await t.factories.signInAdminMode(await t.factories.user({ grants: [...ORG_ADMIN, { key: CorePermission.RolesCreate, scope: ALL }] }));
    const base = { nameAr: 'دور', nameEn: 'Role' };
    await manager.post('/api/roles').send({ ...base, permissions: [{ key: CorePermission.OrgView, scope: 'subtree:9' }] }).expect(400);
    await manager.post('/api/roles').send({ ...base, permissions: [{ key: CorePermission.OrgView, scope: 'subtree:0' }] }).expect(400);
    const bad = await manager.post('/api/roles').send({ ...base, permissions: [{ key: CorePermission.OrgUnitCreate, scope: 'subtree:2' }] }).expect(422);
    expect(bad.body.code).toBe('SCOPE_NOT_ALLOWED');
    await manager.post('/api/roles').send({ ...base, permissions: [{ key: CorePermission.OrgView, scope: 'subtree:2' }] }).expect(201);
  });

  it('does not let anyone give a wider depth than they hold', async () => {
    const org = await setup();
    const narrow = await t.factories.role([{ key: CorePermission.OrgView, scope: 'subtree:1' }]);
    const wide = await t.factories.role([{ key: CorePermission.OrgView, scope: 'subtree:2' }]);
    const hr = await t.factories.signIn(await t.factories.user({ grants: [{ key: CorePermission.EmployeesView, scope: ALL }, { key: CorePermission.EmployeesAssignRoles, scope: ALL }, { key: CorePermission.OrgView, scope: 'subtree:1' }] }));
    const person = await t.factories.user({ unit: org.unitA });
    await hr.put(`/api/employees/${person.employeeId}/roles`).send({ roleIds: [narrow.id] }).expect(200);
    await hr.put(`/api/employees/${person.employeeId}/roles`).send({ roleIds: [wide.id] }).expect(403);
  });
});

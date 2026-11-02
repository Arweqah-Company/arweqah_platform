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
  const levelId = async (org: TestOrg, index: number): Promise<string> => ((await admin.get(`/api/org/companies/${org.companyId}/tree`).expect(200)).body.levels as Level[])[index]?.id as string;
  /** Replaces what the head role of a level holds with these grants. */
  const giveHeadRole = async (org: TestOrg, index: number, grants: { key: string; scope: string }[]): Promise<void> => {
    const id = ((await t.db.query(`SELECT id FROM roles WHERE auto_rule = 'node_head' AND org_level_id = $1`, [await levelId(org, index)])) as { id: string }[])[0]?.id as string;
    await t.db.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
    for (const g of grants) await t.db.query('INSERT INTO role_permissions (role_id, permission_key, scope) VALUES ($1, $2, $3)', [id, g.key, g.scope]);
  };
  const setManager = async (nodeId: string, managerId: string): Promise<void> => {
    const nodes = (await admin.get(`/api/org/companies/${await t.factories.defaultCompany()}/tree`).expect(200)).body.nodes as { id: string; nameAr: string; nameEn: string; startDate: string; isActive: boolean }[];
    const node = nodes.find((n) => n.id === nodeId) as { nameAr: string; nameEn: string; startDate: string; isActive: boolean };
    await admin.put(`/api/org/nodes/${nodeId}`).send({ nameAr: node.nameAr, nameEn: node.nameEn, startDate: node.startDate, isActive: node.isActive, managerId }).expect(200);
  };
  /** A person placed nowhere who manages the department of the test organization. */
  const departmentHead = async (org: TestOrg, grants: { key: string; scope: string }[]) => {
    await giveHeadRole(org, 1, grants);
    const head = await t.factories.user();
    await setManager(org.department, head.employeeId);
    return t.factories.signIn(head);
  };
  const treeOf = async (agent: TestAgent, org: TestOrg): Promise<NodeRow[]> => (await agent.get(`/api/org/companies/${org.companyId}/tree`).expect(200)).body.nodes;
  const employeesOf = async (agent: TestAgent): Promise<string[]> => ((await agent.get('/api/employees').query({ pageSize: 100 }).expect(200)).body.items as { id: string }[]).map((e) => e.id);

  it('shows the head of a department the sections one level below, with the department as the top of what they see', async () => {
    const org = await setup();
    const head = await departmentHead(org, [{ key: CorePermission.OrgView, scope: 'subtree:1' }]);
    const nodes = await treeOf(head, org);
    expect(nodes.map((n) => n.nameEn).sort()).toEqual(['Department', 'Section AB', 'Section C']);
    expect(nodes.find((n) => n.id === org.department)?.parentId).toBeNull();
    expect(nodes.find((n) => n.id === org.sectionAB)?.parentId).toBe(org.department);
  });

  it('shows two levels, and everything below, as the role says, and never the other company', async () => {
    const org = await setup();
    const two = await departmentHead(org, [{ key: CorePermission.OrgView, scope: 'subtree:2' }]);
    expect((await treeOf(two, org)).map((n) => n.nameEn).sort()).toEqual(['Department', 'Section AB', 'Section C', 'Unit A', 'Unit B', 'Unit C']);
    const none = await t.factories.signIn(await t.factories.user({ grants: [{ key: CorePermission.OrgView, scope: 'subtree:2' }] }));
    await none.get(`/api/org/companies/${org.otherCompanyId}/tree`).expect(404);
    await two.get(`/api/org/companies/${org.otherCompanyId}/tree`).expect(404);
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

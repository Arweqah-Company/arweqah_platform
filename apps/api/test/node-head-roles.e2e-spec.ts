import { CorePermission, LEVEL_HEAD_DEFAULT_PERMISSIONS } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { AutoRolesService } from '../src/core/access/application/auto-roles.service';
import { UserAccessService } from '../src/core/access/application/user-access.service';
import { ADMIN_MODE_GRANT, ORG_AND_ROLES_ADMIN_GRANTS, type TestAgent, type TestOrg } from './factories/factories';
import { useTestApp } from './setup/test-app';

const ALL = 'all' as const;
const ORG_ADMIN = [ADMIN_MODE_GRANT, ...ORG_AND_ROLES_ADMIN_GRANTS];

interface RoleRow {
  id: string;
  nameAr: string;
  nameEn: string;
  autoRule: string | null;
  orgNodeId: string | null;
  usersCount: number;
  permissions: { key: string; scope: string }[];
  origin: { companyId: string; companyNameEn: string; unitNameEn: string } | null;
}

describe('A head role for every organization unit (FR-69)', () => {
  const t = useTestApp();
  let agent: TestAgent;
  const setup = async (): Promise<TestOrg> => {
    const org = await t.factories.org();
    agent = await t.factories.signInAdminMode(await t.factories.user({ grants: ORG_ADMIN }));
    return org;
  };
  const roles = async (): Promise<RoleRow[]> => (await agent.get('/api/roles').expect(200)).body;
  const headRoleOf = async (nodeId: string): Promise<RoleRow | undefined> => (await roles()).find((r) => r.orgNodeId === nodeId);
  const rolesOf = async (userId: string) => [...((await t.app.get(UserAccessService).rolesOf([userId])).get(userId) ?? [])].map((r) => r.id);
  const setManager = async (nodeId: string, managerId: string | null) => {
    const tree = (await agent.get('/api/org/tree?view=full').expect(200)).body.nodes as { id: string; nameAr: string; nameEn: string; startDate: string; isActive: boolean }[];
    const node = tree.find((n) => n.id === nodeId) as { nameAr: string; nameEn: string; startDate: string; isActive: boolean };
    await agent.put(`/api/org/nodes/${nodeId}`).send({ nameAr: node.nameAr, nameEn: node.nameEn, startDate: node.startDate, isActive: node.isActive, managerId }).expect(200);
  };
  const setActive = async (nodeId: string, isActive: boolean) => {
    const tree = (await agent.get('/api/org/tree?view=full').expect(200)).body.nodes as { id: string; nameAr: string; nameEn: string; startDate: string; manager?: { id: string } | null; managerId?: string | null }[];
    const node = tree.find((n) => n.id === nodeId) as { nameAr: string; nameEn: string; startDate: string; managerId?: string | null };
    await agent.put(`/api/org/nodes/${nodeId}`).send({ nameAr: node.nameAr, nameEn: node.nameEn, startDate: node.startDate, isActive, managerId: node.managerId ?? null }).expect(200);
  };
  const employeesSeenBy = async (session: TestAgent): Promise<string[]> => ((await session.get('/api/employees').query({ pageSize: 100 }).expect(200)).body.items as { id: string }[]).map((e) => e.id);

  it('makes a head role with every unit, named after it, whichever company it sits in, starting with the default permissions', async () => {
    const org = await setup();
    const role = await headRoleOf(org.sectionAB);
    expect(role).toMatchObject({ autoRule: 'node_head', usersCount: 0 });
    expect(role?.nameEn).toMatch(/^Head of /);
    expect(role?.nameAr).toMatch(/^قائد /);
    expect(role?.permissions.map((p) => `${p.key}:${p.scope}`).sort()).toEqual(LEVEL_HEAD_DEFAULT_PERMISSIONS.map((p) => `${p.key}:${p.scope}`).sort());
    expect(role?.origin).toMatchObject({ companyId: org.companyId });
    const units = (await t.db.query('SELECT count(*)::int AS n FROM org_nodes WHERE deleted_at IS NULL')) as { n: number }[];
    expect((await roles()).filter((r) => r.autoRule === 'node_head')).toHaveLength(units[0]?.n as number);
    // One role per unit: two units of the same level have two different roles, not one shared role.
    expect((await headRoleOf(org.sectionAB))?.id).not.toBe((await headRoleOf(org.sectionC))?.id);
  });

  it('gives the role of a unit to its manager and moves it when the manager changes, without touching the role of another unit', async () => {
    const org = await setup();
    const role = (await headRoleOf(org.sectionAB)) as RoleRow;
    const otherRole = (await headRoleOf(org.sectionC)) as RoleRow;
    const first = await t.factories.user({ unit: org.unitA });
    const second = await t.factories.user({ unit: org.unitC });
    await setManager(org.sectionAB, first.employeeId);
    expect(await rolesOf(first.id)).toContain(role.id);
    expect(await rolesOf(first.id)).not.toContain(otherRole.id);
    await setManager(org.sectionAB, second.employeeId);
    expect(await rolesOf(first.id)).not.toContain(role.id);
    expect(await rolesOf(second.id)).toContain(role.id);
    await setManager(org.sectionC, first.employeeId);
    expect(await rolesOf(first.id)).toContain(otherRole.id);
    expect((await roles()).find((r) => r.id === role.id)?.usersCount).toBe(1);
    await setManager(org.sectionAB, null);
    expect((await roles()).find((r) => r.id === role.id)?.usersCount).toBe(0);
  });

  it('takes the reach of the head role from the unit the person manages, and takes it back with the role', async () => {
    const org = await setup();
    const a = await t.factories.user({ unit: org.unitA });
    const b = await t.factories.user({ unit: org.unitB });
    const other = await t.factories.user({ unit: org.unitOther });
    const head = await t.factories.user({ unit: org.unitC });
    const session = await t.factories.signIn(head);
    expect(await employeesSeenBy(session)).toEqual([head.employeeId]);
    await setManager(org.sectionAB, head.employeeId);
    const seen = await employeesSeenBy(session);
    expect(seen).toEqual(expect.arrayContaining([a.employeeId, b.employeeId, head.employeeId]));
    expect(seen).not.toContain(other.employeeId);
    await session.get(`/api/employees/${a.employeeId}`).expect(200);
    await session.get(`/api/employees/${other.employeeId}`).expect(404);
    await setManager(org.sectionAB, null);
    expect(await employeesSeenBy(session)).toEqual([head.employeeId]);
  });

  it('renames the role with the unit, makes the role of a unit that has none, and drops the role of a removed unit', async () => {
    const org = await setup();
    const before = (await headRoleOf(org.sectionAB)) as RoleRow;
    const node = (await agent.get('/api/org/tree?view=full').expect(200)).body.nodes.find((n: { id: string }) => n.id === org.sectionAB) as { nameAr: string; nameEn: string; startDate: string; isActive: boolean };
    await agent.put(`/api/org/nodes/${org.sectionAB}`).send({ nameAr: 'قسم جديد الاسم', nameEn: 'Renamed Section', startDate: node.startDate, isActive: node.isActive, managerId: null }).expect(200);
    expect(await headRoleOf(org.sectionAB)).toMatchObject({ id: before.id, nameAr: 'قائد قسم جديد الاسم', nameEn: 'Head of Renamed Section' });
    await t.db.query('DELETE FROM roles WHERE org_node_id = $1', [org.sectionAB]);
    await t.app.get(AutoRolesService).sync();
    expect((await headRoleOf(org.sectionAB))?.permissions).toHaveLength(LEVEL_HEAD_DEFAULT_PERMISSIONS.length);
    await t.db.query('UPDATE org_nodes SET deleted_at = now() WHERE id = $1', [org.sectionAB]);
    await t.app.get(AutoRolesService).sync();
    expect(await headRoleOf(org.sectionAB)).toBeUndefined();
  });

  it('takes the role back when the unit is switched off, and gives it back when it is switched on again', async () => {
    const org = await setup();
    const role = (await headRoleOf(org.sectionAB)) as RoleRow;
    const head = await t.factories.user({ unit: org.unitA });
    await setManager(org.sectionAB, head.employeeId);
    expect(await rolesOf(head.id)).toContain(role.id);
    await setActive(org.sectionAB, false);
    expect(await rolesOf(head.id)).not.toContain(role.id);
    await setActive(org.sectionAB, true);
    expect(await rolesOf(head.id)).toContain(role.id);
  });

  it('keeps what an administrator unticked on the employee form until the unit gets another manager', async () => {
    const org = await setup();
    const role = (await headRoleOf(org.sectionAB)) as RoleRow;
    const hr = await t.factories.signIn(await t.factories.user({ grants: [{ key: CorePermission.EmployeesView, scope: ALL }, { key: CorePermission.EmployeesAssignRoles, scope: ALL }, { key: CorePermission.RolesView, scope: ALL }] }));
    const head = await t.factories.user({ unit: org.unitA });
    await setManager(org.sectionAB, head.employeeId);
    expect(await rolesOf(head.id)).toContain(role.id);
    await hr.put(`/api/employees/${head.employeeId}/roles`).send({ roleIds: [] }).expect(200);
    await setManager(org.sectionAB, head.employeeId);
    await t.app.get(AutoRolesService).sync();
    expect(await rolesOf(head.id)).not.toContain(role.id);
    const next = await t.factories.user({ unit: org.unitB });
    await setManager(org.sectionAB, next.employeeId);
    expect(await rolesOf(next.id)).toContain(role.id);
  });

  it('keeps a head role from being renamed or deleted, and lets it be given by hand like any role', async () => {
    const org = await setup();
    const manager = await t.factories.signInAdminMode(await t.factories.user({ grants: [...ORG_ADMIN, { key: CorePermission.RolesUpdate, scope: ALL }, { key: CorePermission.RolesDelete, scope: ALL }] }));
    const role = (await headRoleOf(org.sectionAB)) as RoleRow;
    await manager.put(`/api/roles/${role.id}`).send({ nameAr: 'اسم', nameEn: 'Name', permissions: [] }).expect(422);
    await manager.delete(`/api/roles/${role.id}`).expect(422);
    const person = await t.factories.user();
    await t.app.get(UserAccessService).replaceRoles(person.id, [role.id]);
    expect(await rolesOf(person.id)).toContain(role.id);
  });
});

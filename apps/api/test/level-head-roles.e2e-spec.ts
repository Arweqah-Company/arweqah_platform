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
  orgLevelId: string | null;
  usersCount: number;
  permissions: { key: string; scope: string }[];
  origin: { companyId: string; companyNameEn: string; unitNameEn: string } | null;
}
interface Level {
  id: string;
  nameAr: string;
  nameEn: string;
  isAssignable: boolean;
}

describe('A head role for every organization level (FR-69)', () => {
  const t = useTestApp();
  let agent: TestAgent;
  const setup = async (): Promise<TestOrg> => {
    const org = await t.factories.org();
    agent = await t.factories.signInAdminMode(await t.factories.user({ grants: ORG_ADMIN }));
    return org;
  };
  const roles = async (): Promise<RoleRow[]> => (await agent.get('/api/roles').expect(200)).body;
  const levelsOf = async (companyId: string): Promise<Level[]> => (await agent.get(`/api/org/companies/${companyId}/tree`).expect(200)).body.levels;
  const headRoleOf = async (levelId: string): Promise<RoleRow | undefined> => (await roles()).find((r) => r.orgLevelId === levelId);
  const rolesOf = async (userId: string) => [...((await t.app.get(UserAccessService).rolesOf([userId])).get(userId) ?? [])].map((r) => r.id);
  const setManager = async (nodeId: string, managerId: string | null) => {
    const tree = (await agent.get(`/api/org/companies/${(await t.factories.defaultCompany())}/tree`).expect(200)).body.nodes as { id: string; nameAr: string; nameEn: string; startDate: string; isActive: boolean }[];
    const node = tree.find((n) => n.id === nodeId) as { nameAr: string; nameEn: string; startDate: string; isActive: boolean };
    await agent.put(`/api/org/nodes/${nodeId}`).send({ nameAr: node.nameAr, nameEn: node.nameEn, startDate: node.startDate, isActive: node.isActive, managerId }).expect(200);
  };
  const setActive = async (nodeId: string, isActive: boolean) => {
    const tree = (await agent.get(`/api/org/companies/${(await t.factories.defaultCompany())}/tree`).expect(200)).body.nodes as { id: string; nameAr: string; nameEn: string; startDate: string; manager?: { id: string } | null; managerId?: string | null }[];
    const node = tree.find((n) => n.id === nodeId) as { nameAr: string; nameEn: string; startDate: string; managerId?: string | null };
    await agent.put(`/api/org/nodes/${nodeId}`).send({ nameAr: node.nameAr, nameEn: node.nameEn, startDate: node.startDate, isActive, managerId: node.managerId ?? null }).expect(200);
  };
  const employeesSeenBy = async (session: TestAgent): Promise<string[]> => ((await session.get('/api/employees').query({ pageSize: 100 }).expect(200)).body.items as { id: string }[]).map((e) => e.id);

  it('makes a head role with every level, named after it, starting with the default permissions', async () => {
    const org = await setup();
    const sector = (await levelsOf(org.companyId))[0] as Level;
    const role = await headRoleOf(sector.id);
    expect(role).toMatchObject({ nameEn: 'Head of Sector', autoRule: 'node_head', usersCount: 0 });
    expect(role?.permissions.map((p) => `${p.key}:${p.scope}`).sort()).toEqual(LEVEL_HEAD_DEFAULT_PERMISSIONS.map((p) => `${p.key}:${p.scope}`).sort());
    expect(role?.origin).toMatchObject({ companyId: org.companyId, unitNameEn: '' });
    expect((await roles()).filter((r) => r.autoRule === 'node_head')).toHaveLength(8);
  });

  it('gives the role to the manager of a unit of its level and moves it when the manager changes', async () => {
    const org = await setup();
    const section = (await levelsOf(org.companyId))[2] as Level;
    const role = (await headRoleOf(section.id)) as RoleRow;
    const first = await t.factories.user({ unit: org.unitA });
    const second = await t.factories.user({ unit: org.unitC });
    await setManager(org.sectionAB, first.employeeId);
    expect(await rolesOf(first.id)).toContain(role.id);
    await setManager(org.sectionAB, second.employeeId);
    expect(await rolesOf(first.id)).not.toContain(role.id);
    expect(await rolesOf(second.id)).toContain(role.id);
    await setManager(org.sectionC, first.employeeId);
    expect(await rolesOf(first.id)).toContain(role.id);
    expect((await roles()).find((r) => r.id === role.id)?.usersCount).toBe(2);
    await setManager(org.sectionAB, null);
    await setManager(org.sectionC, null);
    expect((await roles()).find((r) => r.id === role.id)?.usersCount).toBe(0);
  });

  it('takes the reach of the head role from the units the person manages, and takes it back with the role', async () => {
    const org = await setup();
    const a = await t.factories.user({ unit: org.unitA });
    const b = await t.factories.user({ unit: org.unitB });
    const other = await t.factories.user({ unit: org.unitOther });
    const head = await t.factories.user({ unit: org.unitC });
    const session = await t.factories.signIn(head);
    await session.get('/api/employees').expect(403);
    await setManager(org.sectionAB, head.employeeId);
    const seen = await employeesSeenBy(session);
    expect(seen).toEqual(expect.arrayContaining([a.employeeId, b.employeeId, head.employeeId]));
    expect(seen).not.toContain(other.employeeId);
    await session.get(`/api/employees/${a.employeeId}`).expect(200);
    await session.get(`/api/employees/${other.employeeId}`).expect(404);
    await setManager(org.sectionAB, null);
    await session.get('/api/employees').expect(403);
  });

  it('renames the role with the level, and makes the role of a level that has none, and drops the role of a removed level', async () => {
    const org = await setup();
    const levels = await levelsOf(org.companyId);
    const input = levels.map(({ id, nameAr, nameEn, isAssignable }) => ({ id, nameAr, nameEn, isAssignable }));
    await agent.post('/api/org/levels').send({ companyId: org.companyId, levels: input.map((l, i) => (i === 0 ? { ...l, nameAr: 'مجموعة', nameEn: 'Group' } : l)) }).expect(200);
    expect(await headRoleOf((levels[0] as Level).id)).toMatchObject({ nameAr: 'قائد مجموعة', nameEn: 'Head of Group' });
    const appended = (await agent.post('/api/org/levels').send({ companyId: org.companyId, levels: [...input, { nameAr: 'فريق', nameEn: 'Team', isAssignable: true }] }).expect(200)).body as Level[];
    const team = appended[appended.length - 1] as Level;
    expect(await headRoleOf(team.id)).toMatchObject({ nameEn: 'Head of Team' });
    await t.db.query('DELETE FROM roles WHERE org_level_id = $1', [team.id]);
    await t.app.get(AutoRolesService).sync();
    expect((await headRoleOf(team.id))?.permissions).toHaveLength(LEVEL_HEAD_DEFAULT_PERMISSIONS.length);
    await t.db.query('UPDATE org_levels SET deleted_at = now() WHERE id = $1', [team.id]);
    await t.app.get(AutoRolesService).sync();
    expect(await headRoleOf(team.id)).toBeUndefined();
  });

  it('takes the role back when the unit is switched off or removed, unless the person still manages another unit of the level', async () => {
    const org = await setup();
    const section = (await levelsOf(org.companyId))[2] as Level;
    const role = (await headRoleOf(section.id)) as RoleRow;
    const head = await t.factories.user({ unit: org.unitA });
    await setManager(org.sectionAB, head.employeeId);
    await setManager(org.sectionC, head.employeeId);
    expect(await rolesOf(head.id)).toContain(role.id);
    await setActive(org.sectionAB, false);
    expect(await rolesOf(head.id)).toContain(role.id);
    await setActive(org.sectionC, false);
    expect(await rolesOf(head.id)).not.toContain(role.id);
    await setActive(org.sectionC, true);
    expect(await rolesOf(head.id)).toContain(role.id);
  });

  it('keeps what an administrator unticked on the employee form until the unit gets another manager', async () => {
    const org = await setup();
    const section = (await levelsOf(org.companyId))[2] as Level;
    const role = (await headRoleOf(section.id)) as RoleRow;
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
    const role = (await headRoleOf(((await levelsOf(org.companyId))[0] as Level).id)) as RoleRow;
    await manager.put(`/api/roles/${role.id}`).send({ nameAr: 'اسم', nameEn: 'Name', permissions: [] }).expect(422);
    await manager.delete(`/api/roles/${role.id}`).expect(422);
    const person = await t.factories.user();
    await t.app.get(UserAccessService).replaceRoles(person.id, [role.id]);
    expect(await rolesOf(person.id)).toContain(role.id);
  });
});

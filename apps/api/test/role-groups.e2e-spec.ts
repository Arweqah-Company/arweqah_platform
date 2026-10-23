import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { UserAccessService } from '../src/core/access/application/user-access.service';
import { ADMIN_MODE_GRANT, type TestAgent } from './factories/factories';
import { useTestApp } from './setup/test-app';

const keys = (list: string[]) => list.map((key) => ({ key, scope: 'all' as const }));
const GROUPS_ADMIN = [ADMIN_MODE_GRANT, ...keys([CorePermission.RoleGroupsView, CorePermission.RoleGroupsCreate, CorePermission.RoleGroupsUpdate, CorePermission.RoleGroupsDelete, CorePermission.UserGroupsView, CorePermission.UserGroupsCreate, CorePermission.UserGroupsUpdate, CorePermission.UserGroupsDelete])];
const PERMISSIONS_ADMIN = [ADMIN_MODE_GRANT, ...keys([CorePermission.PermissionsView, CorePermission.PermissionsRoleUpdate, CorePermission.PermissionsRoleGroupUpdate, CorePermission.PermissionsUserUpdate, CorePermission.PermissionsUserGroupUpdate, CorePermission.AuditView, CorePermission.RolesView, CorePermission.LookupsView])];
const HR = keys([CorePermission.EmployeesView, CorePermission.EmployeesAssignGroups, CorePermission.RolesView, CorePermission.LookupsView]);

describe('Groups of roles, groups of people and the permissions page (FR-46, FR-47)', () => {
  const t = useTestApp();
  const admin = async (grants = GROUPS_ADMIN): Promise<TestAgent> => t.factories.signInAdminMode(await t.factories.user({ grants }));
  const permissionsOf = async (agent: TestAgent) => ((await agent.get('/api/me').expect(200)).body.permissions as { key: string }[]).map((p) => p.key);

  it('creates, lists, edits and deletes a group of roles', async () => {
    const agent = await admin();
    const a = await t.factories.role(keys([CorePermission.AuditView]));
    const b = await t.factories.role(keys([CorePermission.RolesView]));
    const created = (await agent.post('/api/role-groups').send({ nameAr: 'فريق الجودة', nameEn: 'Quality team', roleIds: [a.id, b.id] }).expect(201)).body;
    expect(created.roles.map((r: { id: string }) => r.id).sort()).toEqual([a.id, b.id].sort());
    const updated = (await agent.put(`/api/role-groups/${created.id}`).send({ nameAr: 'فريق الجودة', nameEn: 'Quality', description: 'x', roleIds: [a.id] }).expect(200)).body;
    expect(updated.roles).toHaveLength(1);
    expect((await agent.get('/api/role-groups').expect(200)).body.map((g: { id: string }) => g.id)).toContain(created.id);
    await agent.post('/api/role-groups').send({ nameAr: 'مجموعة', nameEn: 'Group', roleIds: ['00000000-0000-4000-8000-0000000000aa'] }).expect(404);
    await agent.post('/api/role-groups').send({ nameAr: 'مجموعة', nameEn: 'Group', roleIds: [], extra: 1 }).expect(400);
    await agent.delete(`/api/role-groups/${created.id}`).expect(204);
    await agent.delete(`/api/role-groups/${created.id}`).expect(404);
  });

  it('gives a person the permissions of every role inside a group, and takes them back when the group goes', async () => {
    const agent = await admin();
    const role = await t.factories.role(keys([CorePermission.AuditView]));
    const group = (await agent.post('/api/role-groups').send({ nameAr: 'مدققون', nameEn: 'Auditors', roleIds: [role.id] }).expect(201)).body;
    const hr = await t.factories.signIn(await t.factories.user({ grants: [...HR, ...keys([CorePermission.AuditView])] }));
    const target = await t.factories.user();
    const targetAgent = await t.factories.signIn(target);
    expect(await permissionsOf(targetAgent)).not.toContain('audit.view');
    await hr.put(`/api/employees/${target.employeeId}/groups`).send({ groupIds: [group.id] }).expect(200);
    expect(await permissionsOf(targetAgent)).toContain('audit.view');
    expect((await hr.get(`/api/employees/${target.employeeId}`).expect(200)).body.groups.map((g: { id: string }) => g.id)).toEqual([group.id]);
    await agent.delete(`/api/role-groups/${group.id}`).expect(204);
    expect(await permissionsOf(targetAgent)).not.toContain('audit.view');
  });

  it('puts permissions on a role, a group of roles, one person and a group of people, each reaching exactly its holders', async () => {
    const agent = await admin(PERMISSIONS_ADMIN);
    const groupsAdmin = await admin();
    const role = await t.factories.role([]);
    const roleGroup = (await groupsAdmin.post('/api/role-groups').send({ nameAr: 'حزمة', nameEn: 'Bundle', roleIds: [] }).expect(201)).body;
    const userGroup = (await groupsAdmin.post('/api/user-groups').send({ nameAr: 'فريق', nameEn: 'Team', userIds: [] }).expect(201)).body;
    const person = await t.factories.user();
    const personAgent = await t.factories.signIn(person);
    const put = (kind: string, id: string, permissions: object[]) => agent.put(`/api/permission-targets/${kind}/${id}`).send({ permissions });

    // one person
    expect((await put('user', person.id, [{ key: 'audit.view', scope: 'all' }]).expect(200)).body.permissions).toEqual([{ key: 'audit.view', scope: 'all' }]);
    expect(await permissionsOf(personAgent)).toContain('audit.view');
    await put('user', person.id, []).expect(200);
    expect(await permissionsOf(personAgent)).not.toContain('audit.view');

    // a role
    await put('role', role.id, [{ key: 'audit.view', scope: 'all' }]).expect(200);
    await t.app.get(UserAccessService).replaceRoles(person.id, [role.id]);
    expect(await permissionsOf(personAgent)).toContain('audit.view');
    await put('role', role.id, []).expect(200);

    // a group of roles (given to the person)
    await put('role-group', roleGroup.id, [{ key: 'roles.view', scope: 'all' }]).expect(200);
    expect(await permissionsOf(personAgent)).not.toContain('roles.view');
    await t.app.get(UserAccessService).replaceGroups(person.id, [roleGroup.id]);
    expect(await permissionsOf(personAgent)).toContain('roles.view');

    // a group of people (the person is added as a member)
    await put('user-group', userGroup.id, [{ key: 'lookups.view', scope: 'all' }]).expect(200);
    await groupsAdmin.put(`/api/user-groups/${userGroup.id}`).send({ nameAr: 'فريق', nameEn: 'Team', userIds: [person.id] }).expect(200);
    expect(await permissionsOf(personAgent)).toContain('lookups.view');
    await groupsAdmin.put(`/api/user-groups/${userGroup.id}`).send({ nameAr: 'فريق', nameEn: 'Team', userIds: [] }).expect(200);
    expect(await permissionsOf(personAgent)).not.toContain('lookups.view');

    const shown = (await agent.get(`/api/permission-targets/user/${person.id}`).expect(200)).body;
    expect(shown.inherited.map((p: { key: string }) => p.key)).toContain('roles.view');
  });

  it('never places more than the giver holds, only catalog keys, and each kind needs its own key', async () => {
    const limited = await admin([ADMIN_MODE_GRANT, ...keys([CorePermission.PermissionsView, CorePermission.PermissionsRoleUpdate, CorePermission.RolesView])]);
    const role = await t.factories.role([]);
    const put = (kind: string, id: string, permissions: object[]) => limited.put(`/api/permission-targets/${kind}/${id}`).send({ permissions });
    await put('role', role.id, [{ key: 'roles.view', scope: 'all' }]).expect(200);
    await put('role', role.id, [{ key: 'audit.view', scope: 'all' }]).expect(403); // not held
    await put('role', role.id, [{ key: 'nope.nothing', scope: 'all' }]).expect(422);
    await put('user', (await t.factories.user()).id, []).expect(403); // no key for people
    await put('role', '00000000-0000-4000-8000-0000000000aa', []).expect(404);
    expect((await limited.get('/api/permission-targets/role').expect(200)).body.length).toBeGreaterThan(0);
  });

  it('lists people to choose from, edits a group of people, and refuses without the keys or admin mode', async () => {
    const agent = await admin();
    const member = await t.factories.user();
    const found = (await agent.get('/api/user-groups/people').query({ q: member.email.slice(0, 10) }).expect(200)).body as { id: string }[];
    expect(found.map((p) => p.id)).toContain(member.id);
    const created = (await agent.post('/api/user-groups').send({ nameAr: 'فريق ا', nameEn: 'Team A', userIds: [member.id] }).expect(201)).body;
    expect(created.members.map((m: { id: string }) => m.id)).toEqual([member.id]);
    await agent.post('/api/user-groups').send({ nameAr: 'فريق ب', nameEn: 'Team B', userIds: ['00000000-0000-4000-8000-0000000000aa'] }).expect(404);
    await agent.delete(`/api/user-groups/${created.id}`).expect(204);
    const plain = await t.factories.signIn(await t.factories.user());
    for (const path of ['/api/role-groups', '/api/user-groups', '/api/permission-targets/role']) await plain.get(path).expect(403);
    const noMode = await t.factories.signIn(await t.factories.user({ grants: GROUPS_ADMIN }));
    expect((await noMode.get('/api/user-groups').expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
    expect((await plain.get('/api/lookups/role-groups').expect(403)).body.code).toBe('FORBIDDEN');
  });
});

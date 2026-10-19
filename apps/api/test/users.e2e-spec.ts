import { CorePermission, type UserDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { useTestApp } from './setup/test-app';

const company = (key: string) => ({ key, scope: 'company' as const });

describe('Users and scoped access (FR-04, FR-06)', () => {
  const t = useTestApp();

  it('an admin creates a user with roles and placement, who can then sign in', async () => {
    const org = await t.factories.org();
    const admin = await t.factories.user({ grants: [company(CorePermission.UsersView), company(CorePermission.UsersManage)] });
    const role = await t.factories.role([]);
    const agent = await t.factories.signIn(admin);
    const placement = { branchId: org.branch.id, departmentId: org.department.id, teamId: org.team.id, managerId: admin.id };
    const res = await agent
      .post('/api/users')
      .send({ name: 'سارة', email: 'Sara@Test.Local', password: 'Sara-Passw0rd-1', roleIds: [role.id], placement })
      .expect(201);
    expect(res.body.email).toBe('sara@test.local');
    expect(res.body.roles.map((r: { id: string }) => r.id)).toEqual([role.id]);
    expect(res.body.placement).toEqual(placement);
    await t.factories.signIn({ id: res.body.id, email: 'sara@test.local', password: 'Sara-Passw0rd-1' });
  });

  it('rejects a duplicate email (409) and an inconsistent placement (422)', async () => {
    const org = await t.factories.org();
    const admin = await t.factories.user({ grants: [company(CorePermission.UsersView), company(CorePermission.UsersManage)] });
    const agent = await t.factories.signIn(admin);
    await agent.post('/api/users').send({ name: 'Dup', email: admin.email }).expect(409);
    const wrongTeam = { branchId: org.branch.id, departmentId: org.otherDepartment.id, teamId: org.team.id, managerId: null };
    await agent.post('/api/users').send({ name: 'Xavier', email: 'x@test.local', placement: wrongTeam }).expect(422);
  });

  it('a department-scoped viewer lists only their department, and gets 404 for others (IDOR)', async () => {
    const org = await t.factories.org();
    const inDept = { branchId: org.branch.id, departmentId: org.department.id };
    const viewer = await t.factories.user({ grants: [{ key: CorePermission.UsersView, scope: 'department' }], placement: inDept });
    const colleague = await t.factories.user({ placement: inDept });
    const outsider = await t.factories.user({ placement: { branchId: org.branch.id, departmentId: org.otherDepartment.id } });
    const agent = await t.factories.signIn(viewer);
    const list = await agent.get('/api/users').expect(200);
    const ids = list.body.items.map((u: UserDto) => u.id);
    expect(ids).toEqual(expect.arrayContaining([viewer.id, colleague.id]));
    expect(ids).not.toContain(outsider.id);
    await agent.get(`/api/users/${colleague.id}`).expect(200);
    await agent.get(`/api/users/${outsider.id}`).expect(404);
  });

  it('a department-scoped manager cannot create users in another department (403)', async () => {
    const org = await t.factories.org();
    const manager = await t.factories.user({
      grants: [{ key: CorePermission.UsersView, scope: 'department' }, { key: CorePermission.UsersManage, scope: 'department' }],
      placement: { branchId: org.branch.id, departmentId: org.department.id },
    });
    const agent = await t.factories.signIn(manager);
    const elsewhere = { branchId: org.branch.id, departmentId: org.otherDepartment.id, teamId: null, managerId: null };
    await agent.post('/api/users').send({ name: 'Xavier', email: 'x@test.local', placement: elsewhere }).expect(403);
  });

  it('users cannot change their own roles or deactivate themselves', async () => {
    const admin = await t.factories.user({ grants: [company(CorePermission.UsersView), company(CorePermission.UsersManage)] });
    const agent = await t.factories.signIn(admin);
    await agent.put(`/api/users/${admin.id}/roles`).send({ roleIds: [] }).expect(422);
    await agent.post(`/api/users/${admin.id}/deactivate`).expect(422);
  });

  it('deactivating a user ends their sessions immediately', async () => {
    const admin = await t.factories.user({ grants: [company(CorePermission.UsersView), company(CorePermission.UsersManage)] });
    const target = await t.factories.user();
    const targetAgent = await t.factories.signIn(target);
    await targetAgent.get('/api/me').expect(200);
    const res = await (await t.factories.signIn(admin)).post(`/api/users/${target.id}/deactivate`).expect(200);
    expect(res.body.isActive).toBe(false);
    await targetAgent.get('/api/me').expect(401);
  });

  it('ignores or rejects mass-assignment fields (isActive, id, roles in the create body)', async () => {
    const admin = await t.factories.user({ grants: [company(CorePermission.UsersView), company(CorePermission.UsersManage)] });
    const agent = await t.factories.signIn(admin);
    await agent.post('/api/users').send({ name: 'Xavier', email: 'x@test.local', isActive: false }).expect(400);
    await agent.post('/api/users').send({ name: 'Xavier', email: 'x@test.local', id: admin.id }).expect(400);
  });

  it('searches names literally (SQL wildcard and injection payloads are plain text)', async () => {
    const admin = await t.factories.user({ grants: [company(CorePermission.UsersView)] });
    const agent = await t.factories.signIn(admin);
    for (const term of ["' OR 1=1 --", '%', "'; DROP TABLE users; --"]) {
      const res = await agent.get('/api/users').query({ search: term }).expect(200);
      expect(res.body.total).toBe(0);
    }
    const count = await t.db.query('SELECT COUNT(*)::int AS n FROM users');
    expect(count[0].n).toBe(1);
  });
});

describe('Organization structure (FR-07)', () => {
  const t = useTestApp();
  const grants = [company(CorePermission.OrgView), company(CorePermission.OrgManage)];

  it('builds branches, departments and teams and returns the tree', async () => {
    const agent = await t.factories.signIn(await t.factories.user({ grants }));
    const branch = await agent.post('/api/org/branches').send({ nameAr: 'الرياض', nameEn: 'Riyadh', code: 'RUH' }).expect(201);
    const dept = await agent.post('/api/org/departments').send({ nameAr: 'تقنية', nameEn: 'IT', branchId: branch.body.id }).expect(201);
    await agent.post('/api/org/teams').send({ nameAr: 'الدعم', nameEn: 'Support', departmentId: dept.body.id }).expect(201);
    const tree = await agent.get('/api/org/tree').expect(200);
    expect(tree.body.branches[0].departments[0].teams[0].nameEn).toBe('Support');
  });

  it('rejects duplicate branch codes, cross-branch parents and cycles', async () => {
    const org = await t.factories.org();
    const agent = await t.factories.signIn(await t.factories.user({ grants }));
    await agent.post('/api/org/branches').send({ nameAr: 'مكرر', nameEn: 'Dup', code: 'HQ' }).expect(409);
    await agent
      .post('/api/org/departments')
      .send({ nameAr: 'فرعي', nameEn: 'Sub', branchId: org.otherBranch.id, parentId: org.department.id })
      .expect(422);
    const child = await agent
      .post('/api/org/departments')
      .send({ nameAr: 'فرعي', nameEn: 'Sub', branchId: org.branch.id, parentId: org.department.id })
      .expect(201);
    await agent
      .put(`/api/org/departments/${org.department.id}`)
      .send({ nameAr: 'هندسة', nameEn: 'Engineering', branchId: org.branch.id, parentId: child.body.id })
      .expect(422);
  });

  it('refuses to delete a unit that still has members', async () => {
    const org = await t.factories.org();
    await t.factories.user({ placement: { branchId: org.branch.id, departmentId: org.department.id, teamId: org.team.id } });
    const agent = await t.factories.signIn(await t.factories.user({ grants }));
    const res = await agent.delete(`/api/org/team/${org.team.id}`);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ORG_UNIT_IN_USE');
    await agent.delete(`/api/org/branch/${org.otherBranch.id}`).expect(204);
  });
});

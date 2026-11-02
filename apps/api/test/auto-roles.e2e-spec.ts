import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { AutoRolesService } from '../src/core/access/application/auto-roles.service';
import { UserAccessService } from '../src/core/access/application/user-access.service';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

const MANAGER = [ADMIN_MODE_GRANT, { key: CorePermission.RolesView, scope: 'all' as const }, { key: CorePermission.RolesCreate, scope: 'all' as const }, { key: CorePermission.RolesUpdate, scope: 'all' as const }, { key: CorePermission.RolesDelete, scope: 'all' as const }];

describe('Roles: assignment and automatic roles (FR-43)', () => {
  const t = useTestApp();
  const rolesOf = async (userId: string) => [...(await t.app.get(UserAccessService).rolesOf([userId])).get(userId) ?? []].map((r) => r.id);

  async function autoRole(rule: 'everyone' | 'has_reports') {
    const role = await t.factories.role([]);
    await t.db.query(`UPDATE roles SET assignment = 'auto', auto_rule = $2 WHERE id = $1`, [role.id, rule]);
    return role;
  }

  it('creates a role as manual unless told otherwise, and changes how it is assigned', async () => {
    const agent = await t.factories.signInAdminMode(await t.factories.user({ grants: MANAGER }));
    const base = { nameAr: 'دور', nameEn: 'Role', permissions: [] };
    const created = (await agent.post('/api/roles').send(base).expect(201)).body;
    expect(created).toMatchObject({ assignment: 'manual', autoRule: null });
    const updated = (await agent.put(`/api/roles/${created.id}`).send({ ...base, assignment: 'auto' }).expect(200)).body;
    expect(updated).toMatchObject({ assignment: 'auto', autoRule: null });
    await agent.put(`/api/roles/${created.id}`).send({ ...base, assignment: 'sometimes' }).expect(400);
    expect((await agent.put(`/api/roles/${created.id}`).send(base).expect(200)).body.assignment).toBe('auto');
  });

  it('keeps a role with an automatic rule automatic', async () => {
    const agent = await t.factories.signInAdminMode(await t.factories.user({ grants: MANAGER }));
    const role = await autoRole('has_reports');
    await agent.put(`/api/roles/${role.id}`).send({ nameAr: 'مدير', nameEn: 'Manager', permissions: [], assignment: 'manual' }).expect(422);
  });

  it('does not hand the "everyone" role out by itself: the Employee role is a choice made when the person is added', async () => {
    const role = await autoRole('everyone');
    const user = await t.factories.user();
    await t.app.get(AutoRolesService).sync();
    expect(await rolesOf(user.id)).not.toContain(role.id);
    await t.app.get(UserAccessService).replaceRoles(user.id, [role.id]);
    await t.app.get(UserAccessService).replaceRoles(user.id, []);
    await t.app.get(AutoRolesService).sync();
    expect(await rolesOf(user.id)).toEqual([]);
  });

  it('gives the "has reports" role exactly to people someone reports to', async () => {
    const role = await autoRole('has_reports');
    const manager = await t.factories.user();
    const report = await t.factories.user();
    const service = t.app.get(AutoRolesService);
    await service.sync();
    expect(await rolesOf(manager.id)).not.toContain(role.id);
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, report.employeeId]);
    await service.sync();
    expect(await rolesOf(manager.id)).toContain(role.id);
    expect(await rolesOf(report.id)).not.toContain(role.id);
    await t.db.query('UPDATE employees SET manager_id = NULL WHERE id = $1', [report.employeeId]);
    await service.sync();
    expect(await rolesOf(manager.id)).not.toContain(role.id);
  });
});

describe('Roles of job titles and levels are stored choices (FR-68, FR-69)', () => {
  const t = useTestApp();
  const rolesOf = async (userId: string) => [...((await t.app.get(UserAccessService).rolesOf([userId])).get(userId) ?? [])].map((r) => r.id);
  const sync = () => t.app.get(AutoRolesService).sync();
  const titleRoleOf = async (jobTitleId: string): Promise<string> => ((await t.db.query('SELECT id FROM roles WHERE job_title_id = $1', [jobTitleId])) as { id: string }[])[0]?.id as string;
  const HR = [CorePermission.EmployeesView, CorePermission.EmployeesCreate, CorePermission.EmployeesUpdate, CorePermission.EmployeesAssignRoles, CorePermission.RolesView, CorePermission.LookupsView].map((key) => ({ key, scope: 'all' as const }));

  const payload = (unit: { id: string; titleId: string; companyId: string }, extra: Record<string, unknown> = {}) => ({
    employeeNumber: `E-${Math.random().toString(36).slice(2, 8)}`, fullName: 'موظف جديد', fullNameEn: 'New Employee', workEmail: `new-${Math.random().toString(36).slice(2, 8)}@arweqah.sa`,
    companyId: unit.companyId, orgNodeId: unit.id, jobTitleId: unit.titleId, startDate: '2025-01-01', ...extra,
  });

  async function employeeRole() {
    const role = await t.factories.role([{ key: CorePermission.ProfileView, scope: 'all' }]);
    await t.db.query(`UPDATE roles SET assignment = 'auto', auto_rule = 'everyone' WHERE id = $1`, [role.id]);
    return role.id;
  }

  it('is not given by the refresh: a person who holds a title does not get its role until someone gives it', async () => {
    const org = await t.factories.org();
    const holder = await t.factories.user({ unit: org.unitA });
    await sync();
    expect(await rolesOf(holder.id)).not.toContain(await titleRoleOf(org.unitA.titleId));
    await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [holder.employeeId, org.sectionAB]);
    await sync();
    expect(await rolesOf(holder.id)).toEqual(expect.not.arrayContaining(((await t.db.query(`SELECT id FROM roles WHERE auto_rule = 'node_head'`)) as { id: string }[]).map((r) => r.id)));
  });

  it('gives a new employee the Employee role and the role of their job title when no roles are named, and exactly the named ones otherwise', async () => {
    const everyoneId = await employeeRole();
    const org = await t.factories.org();
    const agent = await t.factories.signIn(await t.factories.user({ grants: HR }));
    const titleId = await titleRoleOf(org.unitA.titleId);
    const byDefault = (await agent.post('/api/employees').send(payload(org.unitA)).expect(201)).body.employee;
    expect(byDefault.roles.map((r: { id: string }) => r.id).sort()).toEqual([everyoneId, titleId].sort());
    const none = (await agent.post('/api/employees').send(payload(org.unitA, { roleIds: [] })).expect(201)).body.employee;
    expect(none.roles).toEqual([]);
    const onlyTitle = (await agent.post('/api/employees').send(payload(org.unitA, { roleIds: [titleId] })).expect(201)).body.employee;
    expect(onlyTitle.roles.map((r: { id: string }) => r.id)).toEqual([titleId]);
    await sync();
    expect((await agent.get(`/api/employees/${none.id}`).expect(200)).body.roles).toEqual([]);
  });

  it('keeps what is unticked on the form: the Employee role and the title role stay off after later changes and refreshes', async () => {
    const everyoneId = await employeeRole();
    const org = await t.factories.org();
    const agent = await t.factories.signIn(await t.factories.user({ grants: HR }));
    const person = (await agent.post('/api/employees').send(payload(org.unitA)).expect(201)).body.employee;
    await agent.put(`/api/employees/${person.id}/roles`).send({ roleIds: [everyoneId] }).expect(200);
    await sync();
    expect((await agent.get(`/api/employees/${person.id}`).expect(200)).body.roles.map((r: { id: string }) => r.id)).toEqual([everyoneId]);
    await agent.put(`/api/employees/${person.id}/roles`).send({ roleIds: [] }).expect(200);
    await t.db.query('UPDATE employees SET job_title_id = $1 WHERE id = $2', [org.unitB.titleId, person.id]);
    await sync();
    expect((await agent.get(`/api/employees/${person.id}`).expect(200)).body.roles).toEqual([]);
  });

  it('lets HR give the Employee role and the role of the person\'s own title without holding their permissions, but nothing else beyond what HR holds', async () => {
    await employeeRole();
    const org = await t.factories.org();
    const ownTitle = await titleRoleOf(org.unitA.titleId);
    const otherTitle = await titleRoleOf(org.unitB.titleId);
    for (const id of [ownTitle, otherTitle]) await t.db.query(`INSERT INTO role_permissions (role_id, permission_key, scope) VALUES ($1, 'audit.view', 'all')`, [id]);
    const agent = await t.factories.signIn(await t.factories.user({ grants: HR }));
    await agent.post('/api/employees').send(payload(org.unitA)).expect(201);
    await agent.post('/api/employees').send(payload(org.unitA, { roleIds: [otherTitle] })).expect(403);
    const person = (await agent.post('/api/employees').send(payload(org.unitA)).expect(201)).body.employee;
    await agent.put(`/api/employees/${person.id}/roles`).send({ roleIds: [ownTitle] }).expect(200);
    await agent.put(`/api/employees/${person.id}/roles`).send({ roleIds: [otherTitle] }).expect(403);
  });

  it('refuses a person who may not assign roles', async () => {
    const org = await t.factories.org();
    const agent = await t.factories.signIn(await t.factories.user({ grants: HR.filter((g) => g.key !== CorePermission.EmployeesAssignRoles) }));
    await agent.post('/api/employees').send(payload(org.unitA, { roleIds: [await titleRoleOf(org.unitA.titleId)] })).expect(403);
  });
});

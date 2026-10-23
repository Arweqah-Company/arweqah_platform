import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { AutoRolesService } from '../src/core/access/application/auto-roles.service';
import { UserAccessService } from '../src/core/access/application/user-access.service';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

const MANAGER = [ADMIN_MODE_GRANT, { key: CorePermission.RolesView, scope: 'all' as const }, { key: CorePermission.RolesManage, scope: 'all' as const }];

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

  it('gives the "everyone" role to every employee and never takes it away', async () => {
    const role = await autoRole('everyone');
    const user = await t.factories.user();
    expect(await rolesOf(user.id)).not.toContain(role.id);
    await t.app.get(AutoRolesService).sync();
    expect(await rolesOf(user.id)).toContain(role.id);
    await t.app.get(UserAccessService).replaceRoles(user.id, []);
    await t.app.get(AutoRolesService).sync();
    expect(await rolesOf(user.id)).toEqual([role.id]);
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

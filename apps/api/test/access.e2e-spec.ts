import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { UserAccessService } from '../src/core/access/application/user-access.service';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { DEMO_PERMISSION, useTestApp } from './setup/test-app';

const rolesManager = [
  ADMIN_MODE_GRANT,
  { key: CorePermission.RolesView, scope: 'all' as const },
  { key: CorePermission.RolesManage, scope: 'all' as const },
];

describe('Roles and permissions (FR-05)', () => {
  const t = useTestApp();

  it('lists the permission catalog registered by the running modules', async () => {
    const agent = await t.factories.signInAdminMode(await t.factories.user({ grants: rolesManager }));
    const res = await agent.get('/api/permissions/catalog').expect(200);
    const keys = res.body.flatMap((g: { permissions: { key: string }[] }) => g.permissions.map((p) => p.key));
    expect(keys).toEqual(expect.arrayContaining(Object.values(CorePermission)));
  });

  it('creates, updates and deletes a dynamic role', async () => {
    const agent = await t.factories.signInAdminMode(await t.factories.user({ grants: rolesManager }));
    const body = { nameAr: 'مشرف قسم', nameEn: 'Department lead', permissions: [{ key: DEMO_PERMISSION, scope: 'subtree' }] };
    const created = await agent.post('/api/roles').send(body).expect(201);
    expect(created.body.permissions).toEqual([{ key: DEMO_PERMISSION, scope: 'subtree' }]);
    const updated = await agent
      .put(`/api/roles/${created.body.id}`)
      .send({ ...body, permissions: [{ key: DEMO_PERMISSION, scope: 'company' }] })
      .expect(200);
    expect(updated.body.permissions).toEqual([{ key: DEMO_PERMISSION, scope: 'company' }]);
    await agent.delete(`/api/roles/${created.body.id}`).expect(204);
  });

  it('rejects unknown permissions and scopes a permission does not allow (422)', async () => {
    const agent = await t.factories.signInAdminMode(await t.factories.user({ grants: rolesManager }));
    const base = { nameAr: 'دور', nameEn: 'Role' };
    const unknown = await agent.post('/api/roles').send({ ...base, permissions: [{ key: 'payroll.steal', scope: 'company' }] });
    expect(unknown.status).toBe(422);
    expect(unknown.body.code).toBe('UNKNOWN_PERMISSION');
    const badScope = await agent.post('/api/roles').send({ ...base, permissions: [{ key: 'roles.manage', scope: 'unit' }] });
    expect(badScope.status).toBe(422);
    expect(badScope.body.code).toBe('SCOPE_NOT_ALLOWED');
  });

  it('refuses to delete a system role', async () => {
    const agent = await t.factories.signInAdminMode(await t.factories.user({ grants: rolesManager }));
    const system = await t.factories.role([], { isSystem: true });
    const res = await agent.delete(`/api/roles/${system.id}`);
    expect(res.status).toBe(422);
  });

  it('returns 403 to users without roles.manage', async () => {
    const agent = await t.factories.signIn(await t.factories.user({ grants: [{ key: CorePermission.RolesView, scope: 'all' }] }));
    await agent.get('/api/roles').expect(200);
    await agent.post('/api/roles').send({ nameAr: 'دور', nameEn: 'Role', permissions: [] }).expect(403);
  });

  it('keeps role changes and the permission catalog behind platform admin mode (403 ADMIN_MODE_REQUIRED)', async () => {
    const agent = await t.factories.signIn(await t.factories.user({ grants: rolesManager }));
    await agent.get('/api/roles').expect(200);
    for (const res of [await agent.get('/api/permissions/catalog'), await agent.post('/api/roles').send({ nameAr: 'دور', nameEn: 'Role', permissions: [] })]) {
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ADMIN_MODE_REQUIRED');
    }
  });

  it('applies a role change to signed-in users immediately', async () => {
    const user = await t.factories.user({ grants: [{ key: CorePermission.RolesView, scope: 'all' }] });
    const agent = await t.factories.signIn(user);
    await agent.get('/api/roles').expect(200);
    await t.app.get(UserAccessService).replaceRoles(user.id, []);
    await agent.get('/api/roles').expect(403);
  });
});

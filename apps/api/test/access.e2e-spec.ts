import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { UserAccessService } from '../src/core/access/application/user-access.service';
import { totpFromUri } from './helpers/totp';
import { useTestApp } from './setup/test-app';

const ORIGIN = 'http://localhost:4173';
const rolesManager = [
  { key: CorePermission.RolesView, scope: 'company' as const },
  { key: CorePermission.RolesManage, scope: 'company' as const },
];

describe('Roles and permissions (FR-05)', () => {
  const t = useTestApp();

  it('lists the permission catalog registered by the running modules', async () => {
    const agent = await t.factories.signIn(await t.factories.user({ grants: rolesManager }));
    const res = await agent.get('/api/permissions/catalog').expect(200);
    const keys = res.body.flatMap((g: { permissions: { key: string }[] }) => g.permissions.map((p) => p.key));
    expect(keys).toEqual(expect.arrayContaining(Object.values(CorePermission)));
  });

  it('creates, updates and deletes a dynamic role', async () => {
    const agent = await t.factories.signIn(await t.factories.user({ grants: rolesManager }));
    const body = { nameAr: 'مشرف قسم', nameEn: 'Department lead', permissions: [{ key: 'users.view', scope: 'department' }] };
    const created = await agent.post('/api/roles').send(body).expect(201);
    expect(created.body.permissions).toEqual([{ key: 'users.view', scope: 'department' }]);
    const updated = await agent
      .put(`/api/roles/${created.body.id}`)
      .send({ ...body, permissions: [{ key: 'users.view', scope: 'branch' }] })
      .expect(200);
    expect(updated.body.permissions).toEqual([{ key: 'users.view', scope: 'branch' }]);
    await agent.delete(`/api/roles/${created.body.id}`).expect(204);
  });

  it('rejects unknown permissions and scopes a permission does not allow (422)', async () => {
    const agent = await t.factories.signIn(await t.factories.user({ grants: rolesManager }));
    const base = { nameAr: 'دور', nameEn: 'Role' };
    const unknown = await agent.post('/api/roles').send({ ...base, permissions: [{ key: 'payroll.steal', scope: 'company' }] });
    expect(unknown.status).toBe(422);
    expect(unknown.body.code).toBe('UNKNOWN_PERMISSION');
    const badScope = await agent.post('/api/roles').send({ ...base, permissions: [{ key: 'org.manage', scope: 'team' }] });
    expect(badScope.status).toBe(422);
    expect(badScope.body.code).toBe('SCOPE_NOT_ALLOWED');
  });

  it('refuses to delete a system role', async () => {
    const agent = await t.factories.signIn(await t.factories.user({ grants: rolesManager }));
    const system = await t.factories.role([], { isSystem: true });
    const res = await agent.delete(`/api/roles/${system.id}`);
    expect(res.status).toBe(422);
  });

  it('returns 403 to users without roles.manage', async () => {
    const agent = await t.factories.signIn(await t.factories.user({ grants: [{ key: CorePermission.RolesView, scope: 'company' }] }));
    await agent.get('/api/roles').expect(200);
    await agent.post('/api/roles').send({ nameAr: 'دور', nameEn: 'Role', permissions: [] }).expect(403);
  });

  it('applies a role change to signed-in users immediately', async () => {
    const user = await t.factories.user({ grants: [{ key: CorePermission.RolesView, scope: 'company' }] });
    const agent = await t.factories.signIn(user);
    await agent.get('/api/roles').expect(200);
    await t.app.get(UserAccessService).replaceRoles(user.id, []);
    await agent.get('/api/roles').expect(403);
  });
});

describe('Two-step verification (FR-02, NFR-02)', () => {
  const t = useTestApp();

  it('blocks protected routes until 2FA is enabled, then allows them', async () => {
    const user = await t.factories.user({ grants: rolesManager, requiresTwoFactor: true });
    const agent = await t.factories.signIn(user);
    await agent.get('/api/me').expect(200);
    const blocked = await agent.get('/api/roles').expect(403);
    expect(blocked.body.code).toBe('TWO_FACTOR_REQUIRED');

    const enabled = await agent.post('/api/auth/two-factor/enable').set('origin', ORIGIN).send({ password: user.password }).expect(200);
    await agent
      .post('/api/auth/two-factor/verify-totp')
      .set('origin', ORIGIN)
      .send({ code: totpFromUri(enabled.body.totpURI) })
      .expect(200);
    await agent.get('/api/roles').expect(200);
  });
});

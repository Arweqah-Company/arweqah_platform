import { CorePermission as P, type MyAccessDto } from '@arweqah-platform/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { UserAccessService } from '../src/core/access/application/user-access.service';
import { codeFor } from './helpers/totp';
import { useTestApp } from './setup/test-app';

describe('My access: what I may do and where it comes from (FR-88)', () => {
  const t = useTestApp();

  async function employeeWithAdminRole() {
    const org = await t.factories.org();
    const user = await t.factories.user({ unit: org.unitA });
    const employee = await t.factories.role([{ key: P.EmployeesView, scope: 'own' }, { key: P.MyAccessView, scope: 'all' }]);
    const admin = await t.factories.role([{ key: P.AdminModeUse, scope: 'all' }, { key: P.EmployeesCreate, scope: 'all' }]);
    await t.app.get(UserAccessService).replaceRoles(user.id, [employee.id, admin.id]);
    return { user, employee, admin, agent: await t.factories.signIn(user) };
  }

  it('lists the roles and every permission with its scope, labels and source', async () => {
    const { employee, agent } = await employeeWithAdminRole();
    const body = (await agent.get('/api/me/access').expect(200)).body as MyAccessDto;
    expect(body.roles.map((r) => r.id)).toContain(employee.id);
    const view = body.grants.find((g) => g.key === P.EmployeesView);
    expect(view).toMatchObject({ scope: 'own', module: expect.any(String), labelEn: expect.any(String), labelAr: expect.any(String) });
    expect(view?.sources).toEqual([expect.objectContaining({ kind: 'role', nameEn: employee.nameEn })]);
  });

  it('outside admin mode the administrative role gives nothing and only a flag says it exists; in the mode it returns', async () => {
    const { user, agent } = await employeeWithAdminRole();
    const off = (await agent.get('/api/me/access').expect(200)).body as MyAccessDto;
    expect(off.adminRolesHidden).toBe(true);
    expect(off.grants.map((g) => g.key)).not.toContain(P.EmployeesCreate);
    await agent.post('/api/admin-mode/activate').send({ code: codeFor(user.secret, Date.now() + 30_000) }).expect(200);
    const on = (await agent.get('/api/me/access').expect(200)).body as MyAccessDto;
    expect(on.adminRolesHidden).toBe(false);
    expect(on.grants.find((g) => g.key === P.EmployeesCreate)?.sources).toEqual([expect.objectContaining({ kind: 'role' })]);
    await agent.post('/api/admin-mode/deactivate').expect(204);
    expect(((await agent.get('/api/me/access').expect(200)).body as MyAccessDto).grants.map((g) => g.key)).not.toContain(P.EmployeesCreate);
  });

  it('a permission given to the person alone is told as direct', async () => {
    const { user, agent } = await employeeWithAdminRole();
    await t.app.get(UserAccessService).replacePermissions(user.id, [{ key: P.AuditView, scope: 'all' }], null);
    const body = (await agent.get('/api/me/access').expect(200)).body as MyAccessDto;
    expect(body.grants.find((g) => g.key === P.AuditView)?.sources).toEqual([expect.objectContaining({ kind: 'direct' })]);
  });

  it('answers only for the person who asks, and /me no longer carries the permissions', async () => {
    const { agent } = await employeeWithAdminRole();
    expect((await agent.get('/api/me').expect(200)).body.permissions).toBeUndefined();
    await request(t.app.getHttpServer()).get('/api/me/access').expect(401);
  });
});

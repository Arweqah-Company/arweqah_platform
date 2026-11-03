import { CorePermission, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { UserAccessService } from '../src/core/access/application/user-access.service';
import { codeFor } from './helpers/totp';
import { useTestApp } from './setup/test-app';

const P = CorePermission;
const grant = (key: string, scope: PermissionGrant['scope']): PermissionGrant => ({ key, scope });

describe('The grants of an administrative role work only in platform admin mode (FR-84)', () => {
  const t = useTestApp();

  /** A person with the ordinary employee role and a separate administrative role (it holds `admin_mode.use`). */
  async function administrator() {
    const org = await t.factories.org();
    const user = await t.factories.user({ unit: org.unitA });
    const other = await t.factories.user({ unit: org.unitB });
    const employee = await t.factories.role([grant(P.EmployeesView, 'own')]);
    const admin = await t.factories.role([grant(P.AdminModeUse, 'all'), grant(P.EmployeesView, 'all'), grant(P.EmployeesCreate, 'all')]);
    await t.app.get(UserAccessService).replaceRoles(user.id, [employee.id, admin.id]);
    return { user, other, agent: await t.factories.signIn(user) };
  }

  it('outside the mode: only what the ordinary roles give (own record, no add), and /me lists no administrative key', async () => {
    const { user, other, agent } = await administrator();
    const list = (await agent.get('/api/employees').query({ pageSize: 100 }).expect(200)).body.items as { id: string }[];
    expect(list.map((e) => e.id)).toEqual([user.employeeId]);
    await agent.get(`/api/employees/${other.employeeId}`).expect(404);
    await agent.post('/api/employees').send({}).expect(403);
    const keys = ((await agent.get('/api/me/access').expect(200)).body.grants as PermissionGrant[]).map((p) => p.key);
    expect(keys).toContain(P.AdminModeUse);
    expect(keys).not.toContain(P.EmployeesCreate);
  });

  it('in the mode the administrative grants return, and they leave again when the mode is turned off', async () => {
    const { user, other, agent } = await administrator();
    await agent.post('/api/admin-mode/activate').send({ code: codeFor(user.secret, Date.now() + 30_000) }).expect(200);
    const list = (await agent.get('/api/employees').query({ pageSize: 100 }).expect(200)).body.items as { id: string }[];
    expect(list.map((e) => e.id)).toEqual(expect.arrayContaining([user.employeeId, other.employeeId]));
    expect(((await agent.get('/api/me/access').expect(200)).body.grants as PermissionGrant[]).map((p) => p.key)).toContain(P.EmployeesCreate);
    await agent.post('/api/admin-mode/deactivate').expect(204);
    await agent.get(`/api/employees/${other.employeeId}`).expect(404);
  });
});

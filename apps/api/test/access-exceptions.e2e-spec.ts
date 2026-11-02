import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { AccessExceptionsService } from '../src/core/access/application/access-exceptions.service';
import { UserAccessService } from '../src/core/access/application/user-access.service';
import { ADMIN_MODE_GRANT, type TestAgent } from './factories/factories';
import { useTestApp } from './setup/test-app';

const ALL = 'all' as const;
const keys = (list: string[]) => list.map((key) => ({ key, scope: ALL }));
const VIEWER = [ADMIN_MODE_GRANT, ...keys([CorePermission.ExceptionsView, CorePermission.ExceptionsUpdate, CorePermission.ExceptionsRevoke, CorePermission.AuditView])];
const HR = keys([CorePermission.EmployeesView, CorePermission.EmployeesAssignRoles, CorePermission.RolesView, CorePermission.AuditView]);
const day = (offset: number): string => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

interface Row {
  kind: string;
  userId: string;
  userName: string;
  targetId: string;
  targetNameEn: string;
  scope: string | null;
  grantedById: string | null;
  expiresAt: string | null;
}

describe('What was given outside the job title: end dates, the list and taking back (FR-70)', () => {
  const t = useTestApp();
  const viewer = async (grants = VIEWER): Promise<TestAgent> => t.factories.signInAdminMode(await t.factories.user({ grants }));
  const list = async (agent: TestAgent): Promise<Row[]> => (await agent.get('/api/access/exceptions').expect(200)).body;
  const roleIdsOf = async (userId: string) => [...((await t.app.get(UserAccessService).rolesOf([userId])).get(userId) ?? [])].map((r) => r.id);

  async function giveRole(hr: TestAgent, employeeId: string, roleId: string, expiresAt?: string | null) {
    return hr.put(`/api/employees/${employeeId}/roles`).send({ roleIds: [roleId], ...(expiresAt === undefined ? {} : { roleExpiries: { [roleId]: expiresAt } }) });
  }

  it('gives a role until a day, shows the day on the employee, and keeps it when the roles are saved again without naming a new one', async () => {
    const hr = await t.factories.signIn(await t.factories.user({ grants: HR }));
    const person = await t.factories.user();
    const role = await t.factories.role(keys([CorePermission.AuditView]));
    const given = (await (await giveRole(hr, person.employeeId, role.id, day(10))).body) as { roles: { id: string; expiresAt: string | null }[] };
    expect(given.roles).toEqual([expect.objectContaining({ id: role.id, expiresAt: day(10) })]);
    const again = (await giveRole(hr, person.employeeId, role.id).then((r) => r.body)) as { roles: { expiresAt: string | null }[] };
    expect(again.roles[0]?.expiresAt).toBe(day(10));
    const cleared = (await giveRole(hr, person.employeeId, role.id, null).then((r) => r.body)) as { roles: { expiresAt: string | null }[] };
    expect(cleared.roles[0]?.expiresAt).toBeNull();
  });

  it('refuses an end date in the past or for a role that is not given', async () => {
    const hr = await t.factories.signIn(await t.factories.user({ grants: HR }));
    const person = await t.factories.user();
    const role = await t.factories.role(keys([CorePermission.AuditView]));
    const other = await t.factories.role([]);
    const before = await roleIdsOf(person.id);
    expect((await giveRole(hr, person.employeeId, role.id, day(-1)).then((r) => r.status))).toBe(422);
    expect((await hr.put(`/api/employees/${person.employeeId}/roles`).send({ roleIds: [role.id], roleExpiries: { [other.id]: day(5) } })).status).toBe(422);
    expect((await hr.put(`/api/employees/${person.employeeId}/roles`).send({ roleIds: [role.id], roleExpiries: { [role.id]: 'tomorrow' } })).status).toBe(400);
    expect(await roleIdsOf(person.id)).toEqual(before);
  });

  it('holds a role through its last day and not after: an ended role gives nothing, and the nightly job takes it back and writes it to the audit log', async () => {
    const hr = await t.factories.signIn(await t.factories.user({ grants: HR }));
    const person = await t.factories.user();
    const personAgent = await t.factories.signIn(person);
    const role = await t.factories.role(keys([CorePermission.AuditView]));
    await giveRole(hr, person.employeeId, role.id, day(0)).then((r) => expect(r.status).toBe(200));
    expect(((await personAgent.get('/api/me').expect(200)).body.permissions as { key: string }[]).map((p) => p.key)).toContain('audit.view');
    await t.db.query('UPDATE user_roles SET expires_at = $2 WHERE user_id = $1', [person.id, day(-1)]);
    // Access is kept for a short time: tell it something changed.
    await t.app.get(UserAccessService).replaceGroups(person.id, []);
    expect(((await personAgent.get('/api/me').expect(200)).body.permissions as { key: string }[]).map((p) => p.key)).not.toContain('audit.view');
    expect(await roleIdsOf(person.id)).toEqual([]);
    const job = t.app.get(AccessExceptionsService);
    expect(await job.removeEnded()).toBe(1);
    expect(await job.removeEnded()).toBe(0);
    expect(await t.db.query('SELECT 1 FROM user_roles WHERE user_id = $1', [person.id])).toHaveLength(0);
    const auditor = await viewer();
    const log = (await auditor.get('/api/audit-logs').query({ action: 'access.exception_expired' }).expect(200)).body.items as { action: string }[];
    expect(log.map((l) => l.action)).toContain('access.exception_expired');
  });

  it('lists manual roles, personal permissions and groups of roles, and not the roles that come with the title', async () => {
    const org = await t.factories.org();
    const hr = await t.factories.signIn(await t.factories.user({ grants: HR }));
    const person = await t.factories.user({ unit: org.unitA });
    const manual = await t.factories.role(keys([CorePermission.AuditView]));
    const titleRole = ((await t.db.query('SELECT id FROM roles WHERE job_title_id = $1', [org.unitA.titleId])) as { id: string }[])[0]?.id as string;
    await hr.put(`/api/employees/${person.employeeId}/roles`).send({ roleIds: [manual.id, titleRole], roleExpiries: { [manual.id]: day(20) } }).expect(200);
    await t.app.get(UserAccessService).replacePermissions(person.id, [{ key: CorePermission.TicketsView, scope: 'unit' }], hr ? (await t.db.query('SELECT id FROM users LIMIT 1') as { id: string }[])[0]?.id : null);
    const groupAdmin = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, ...keys([CorePermission.RoleGroupsView, CorePermission.RoleGroupsCreate])] }));
    const group = (await groupAdmin.post('/api/role-groups').send({ nameAr: 'مجموعة', nameEn: 'Group', roleIds: [manual.id] }).expect(201)).body as { id: string };
    await t.app.get(UserAccessService).replaceGroups(person.id, [group.id]);
    const rows = (await list(await viewer())).filter((r) => r.userId === person.id);
    expect(rows.map((r) => `${r.kind}:${r.targetId}`).sort()).toEqual([`permission:${CorePermission.TicketsView}`, `role-group:${group.id}`, `role:${manual.id}`].sort());
    expect(rows.find((r) => r.kind === 'role')).toMatchObject({ expiresAt: day(20), targetNameEn: expect.any(String) });
    expect(rows.find((r) => r.kind === 'permission')).toMatchObject({ scope: 'unit', targetNameEn: expect.stringMatching(/ticket/i) });
  });

  it('changes the last day, takes an exception back, and answers 404 for one that is not there', async () => {
    const hr = await t.factories.signIn(await t.factories.user({ grants: HR }));
    const person = await t.factories.user();
    const role = await t.factories.role(keys([CorePermission.AuditView]));
    await giveRole(hr, person.employeeId, role.id).then((r) => expect(r.status).toBe(200));
    const agent = await viewer();
    const url = `/api/access/exceptions/role/${person.id}/${role.id}`;
    await agent.put(url).send({ expiresAt: day(30) }).expect(200);
    expect((await list(agent)).find((r) => r.userId === person.id)?.expiresAt).toBe(day(30));
    expect((await agent.put(url).send({ expiresAt: day(-2) }).expect(422)).body.code).toBe('PAST_END_DATE');
    await agent.put(url).send({ expiresAt: null }).expect(200);
    await agent.delete(url).expect(204);
    expect(await roleIdsOf(person.id)).toEqual([]);
    await agent.delete(url).expect(404);
    await agent.put(url).send({ expiresAt: day(3) }).expect(404);
    await agent.delete(`/api/access/exceptions/galaxy/${person.id}/x`).expect(400);
  });

  it('keeps a person\'s own permission with its last day when the permissions are saved again', async () => {
    const person = await t.factories.user();
    const service = t.app.get(UserAccessService);
    await service.replacePermissions(person.id, [{ key: CorePermission.AuditView, scope: 'all' }, { key: CorePermission.TicketsView, scope: 'own' }]);
    await t.db.query(`UPDATE user_permissions SET expires_at = $2 WHERE user_id = $1 AND permission_key = 'tickets.view'`, [person.id, day(40)]);
    await service.replacePermissions(person.id, [{ key: CorePermission.TicketsView, scope: 'company' }]);
    const rows = (await t.db.query('SELECT permission_key, scope, to_char(expires_at, \'YYYY-MM-DD\') AS expires_at FROM user_permissions WHERE user_id = $1', [person.id])) as { permission_key: string; scope: string; expires_at: string }[];
    expect(rows).toEqual([{ permission_key: 'tickets.view', scope: 'company', expires_at: day(40) }]);
  });

  it('answers 403 to someone without the keys or outside admin mode, and hides the page from a role that hides it', async () => {
    const plain = await t.factories.signIn(await t.factories.user({ grants: keys([CorePermission.ExceptionsView]) }));
    await plain.get('/api/access/exceptions').expect(403);
    const noKey = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT] }));
    await noKey.get('/api/access/exceptions').expect(403);
    const person = await t.factories.user();
    const role = await t.factories.role([]);
    await t.app.get(UserAccessService).replaceRoles(person.id, [role.id]);
    const viewOnly = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, ...keys([CorePermission.ExceptionsView])] }));
    await viewOnly.delete(`/api/access/exceptions/role/${person.id}/${role.id}`).expect(403);
    await viewOnly.put(`/api/access/exceptions/role/${person.id}/${role.id}`).send({ expiresAt: null }).expect(403);
  });
});

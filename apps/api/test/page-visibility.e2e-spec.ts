import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { UserAccessService } from '../src/core/access/application/user-access.service';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

const EMPLOYEES_VIEW = { key: CorePermission.EmployeesView, scope: 'all' as const };
const MANAGER = [ADMIN_MODE_GRANT, { key: CorePermission.PagesManage, scope: 'all' as const }, { key: CorePermission.RolesView, scope: 'all' as const }];

describe('Page visibility (FR-42)', () => {
  const t = useTestApp();

  async function manager() {
    return t.factories.signInAdminMode(await t.factories.user({ grants: MANAGER }));
  }
  const hide = (agent: Awaited<ReturnType<typeof manager>>, roleId: string, hiddenPages: string[]) => agent.put(`/api/page-visibility/roles/${roleId}`).send({ hiddenPages });

  it('hides a page from a role: the list says so, /me reports it, and the API refuses the page (403 PAGE_HIDDEN)', async () => {
    const admin = await manager();
    const role = await t.factories.role([EMPLOYEES_VIEW]);
    const user = await t.factories.user();
    await t.app.get(UserAccessService).replaceRoles(user.id, [role.id]);
    const agent = await t.factories.signIn(user);
    await agent.get('/api/employees').expect(200);

    expect((await hide(admin, role.id, ['employees', 'org']).expect(200)).body).toMatchObject({ id: role.id, locked: false, hiddenPages: ['employees', 'org'] });
    const overview = (await admin.get('/api/page-visibility').expect(200)).body;
    expect(overview.roles.find((r: { id: string }) => r.id === role.id).hiddenPages).toEqual(['employees', 'org']);
    expect((await agent.get('/api/me').expect(200)).body.hiddenPages).toEqual(['employees', 'org']);
    expect((await agent.get('/api/employees').expect(403)).body.code).toBe('PAGE_HIDDEN');

    await hide(admin, role.id, []).expect(200);
    await agent.get('/api/employees').expect(200);
  });

  it('hides a page from a person only when every one of their roles hides it', async () => {
    const admin = await manager();
    const hiding = await t.factories.role([EMPLOYEES_VIEW]);
    const showing = await t.factories.role([EMPLOYEES_VIEW]);
    const user = await t.factories.user();
    await t.app.get(UserAccessService).replaceRoles(user.id, [hiding.id, showing.id]);
    const agent = await t.factories.signIn(user);
    await hide(admin, hiding.id, ['employees']).expect(200);
    await agent.get('/api/employees').expect(200);
    await hide(admin, showing.id, ['employees']).expect(200);
    expect((await agent.get('/api/employees').expect(403)).body.code).toBe('PAGE_HIDDEN');
  });

  it('refuses to hide pages from a role that manages page visibility, and its members always see everything', async () => {
    const admin = await manager();
    const managers = (await admin.get('/api/page-visibility').expect(200)).body.roles.filter((r: { locked: boolean }) => r.locked);
    expect(managers.length).toBeGreaterThan(0);
    const res = await hide(admin, managers[0].id, ['employees']).expect(422);
    expect(res.body.code).toBe('ROLE_PAGES_LOCKED');
    await hide(admin, managers[0].id, []).expect(200);
  });

  it('validates the input and the role (400, 404) and needs the permission and admin mode (403)', async () => {
    const admin = await manager();
    const role = await t.factories.role([EMPLOYEES_VIEW]);
    await hide(admin, role.id, ['home']).expect(400);
    await admin.put(`/api/page-visibility/roles/${role.id}`).send({ hiddenPages: ['org'], extra: 1 }).expect(400);
    await hide(admin, '00000000-0000-4000-8000-0000000000aa', ['org']).expect(404);
    const plain = await t.factories.signIn(await t.factories.user());
    await plain.get('/api/page-visibility').expect(403);
    const noMode = await t.factories.signIn(await t.factories.user({ grants: MANAGER }));
    expect((await noMode.get('/api/page-visibility').expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
  });

  it('records the change in the audit log with the page names only', async () => {
    const admin = await manager();
    const role = await t.factories.role([EMPLOYEES_VIEW]);
    await hide(admin, role.id, ['audit']).expect(200);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const rows = await t.db.query<{ changes: unknown }[]>(`SELECT changes FROM audit_logs WHERE action = 'role.pages_updated' AND entity_id = $1`, [role.id]);
    expect(rows[0]?.changes).toEqual({ hiddenPages: ['audit'] });
  });
});

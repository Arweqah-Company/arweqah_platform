import { CorePermission, LIST_CATALOG } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

const MANAGER = [ADMIN_MODE_GRANT, { key: CorePermission.ListsManage, scope: 'all' as const }];

describe('List management (FR-44)', () => {
  const t = useTestApp();
  const manager = async () => t.factories.signInAdminMode(await t.factories.user({ grants: MANAGER }));
  const me = async (agent: Awaited<ReturnType<typeof manager>>) => (await agent.get('/api/me').expect(200)).body.listSettings;

  it('hides columns and filters of a list for everyone, and shows them again', async () => {
    const admin = await manager();
    const plain = await t.factories.signIn(await t.factories.user());
    expect(await me(plain)).toEqual({});
    const res = await admin.put('/api/list-settings/employees').send({ hiddenColumns: ['company', 'title'], hiddenFilters: ['gender', 'workMode'] }).expect(200);
    expect(res.body).toEqual({ hiddenColumns: ['company', 'title'], hiddenFilters: ['gender', 'workMode'] });
    expect((await me(plain)).employees).toEqual({ hiddenColumns: ['company', 'title'], hiddenFilters: ['gender', 'workMode'] });
    await admin.put('/api/list-settings/employees').send({ hiddenColumns: [], hiddenFilters: [] }).expect(200);
    expect(await me(plain)).toEqual({});
  });

  it('refuses a column or filter that is not part of the list, an unknown list, and hiding the first column (422)', async () => {
    const admin = await manager();
    const put = (key: string, body: object) => admin.put(`/api/list-settings/${key}`).send(body);
    const first = LIST_CATALOG.companies.columns[0];
    for (const res of [
      await put('companies', { hiddenColumns: ['salary'], hiddenFilters: [] }),
      await put('companies', { hiddenColumns: [], hiddenFilters: ['gender'] }),
      await put('nowhere', { hiddenColumns: [], hiddenFilters: [] }),
      await put('companies', { hiddenColumns: [first], hiddenFilters: [] }),
    ]) {
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('LIST_SETTING_INVALID');
    }
    await put('companies', { hiddenColumns: [], hiddenFilters: [], extra: 1 }).expect(400);
  });

  it('needs the permission and admin mode (403), and the change is audited with the names only', async () => {
    const plain = await t.factories.signIn(await t.factories.user());
    await plain.put('/api/list-settings/audit').send({ hiddenColumns: [], hiddenFilters: [] }).expect(403);
    const noMode = await t.factories.signIn(await t.factories.user({ grants: MANAGER }));
    expect((await noMode.put('/api/list-settings/audit').send({ hiddenColumns: [], hiddenFilters: [] }).expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
    const admin = await manager();
    await admin.put('/api/list-settings/audit').send({ hiddenColumns: ['category'], hiddenFilters: ['from'] }).expect(200);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const rows = await t.db.query<{ changes: unknown }[]>(`SELECT changes FROM audit_logs WHERE action = 'list.settings_updated' AND entity_id = 'audit'`);
    expect(rows[0]?.changes).toEqual({ hiddenColumns: ['category'], hiddenFilters: ['from'] });
  });
});

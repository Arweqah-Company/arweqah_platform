import { CorePermission, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { useTestApp } from './setup/test-app';

const VIEW_FULL = 'org.view_full';

const grant = (key: string): PermissionGrant => ({ key, scope: 'all' });

describe('The employees tab of a unit: GET /org/nodes/:id/employees (FR-17)', () => {
  const t = useTestApp();

  async function setup() {
    await t.factories.defaultCompany();
    const sector = await t.factories.node({ key: 'sector', parentId: null, name: 'Growth' });
    const sales = await t.factories.node({ key: 'department', parentId: sector.id, name: 'Sales', titles: true });
    const support = await t.factories.node({ key: 'department', parentId: sector.id, name: 'Support', titles: true });
    const boss = await t.factories.user({ unit: sales });
    const member = await t.factories.user({ unit: sales });
    await t.factories.user({ unit: support });
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [boss.employeeId, member.employeeId]);
    return { sector, sales, support, boss, member };
  }

  it('lists the people placed directly in the unit with number, work e-mail and manager; people of other units are not shown', async () => {
    const s = await setup();
    const viewer = await t.factories.signIn(await t.factories.user({ grants: [grant(CorePermission.OrgView)] }));
    const rows = (await viewer.get(`/api/org/nodes/${s.sales.id}/employees`).expect(200)).body as { id: string; employeeNumber: string; workEmail: string; managerName: string | null }[];
    expect(rows.map((r) => r.id).sort()).toEqual([s.boss.employeeId, s.member.employeeId].sort());
    const member = rows.find((r) => r.id === s.member.employeeId)!;
    expect(member.managerName).toBeTruthy();
    expect(member.workEmail).toContain('@');
    expect(member.employeeNumber).toBeTruthy();
    expect(rows.find((r) => r.id === s.boss.employeeId)!.managerName).toBeNull();
    expect((await viewer.get(`/api/org/nodes/${s.sector.id}/employees`).expect(200)).body).toEqual([]); // the sector itself has nobody directly
  });

  it('leaves out an employee whose contract has ended', async () => {
    const s = await setup();
    await t.db.query(`UPDATE employees SET start_date = '2020-01-01', end_date = '2021-01-01' WHERE id = $1`, [s.member.employeeId]);
    const viewer = await t.factories.signIn(await t.factories.user({ grants: [grant(CorePermission.OrgView)] }));
    const rows = (await viewer.get(`/api/org/nodes/${s.sales.id}/employees`).expect(200)).body as { id: string }[];
    expect(rows.map((r) => r.id)).toEqual([s.boss.employeeId]);
  });

  it('returns 403 without org.view, 404 for an unknown unit and 400 for a bad id', async () => {
    const s = await setup();
    const nobody = await t.factories.signIn(await t.factories.user({ bare: true }));
    await nobody.get(`/api/org/nodes/${s.sales.id}/employees`).expect(403);
    const viewer = await t.factories.signIn(await t.factories.user({ grants: [grant(CorePermission.OrgView)] }));
    await viewer.get('/api/org/nodes/00000000-0000-4000-8000-000000000000/employees').expect(404);
    await viewer.get('/api/org/nodes/not-a-uuid/employees').expect(400);
  });
  describe('review of PR 91: other companies and unknown units', () => {
    async function twoCompanies() {
      const org = await t.factories.org();
      const mine = await t.factories.user({ unit: org.unitA });
      const foreign = await t.factories.user({ unit: org.unitA });
      await t.db.query('UPDATE employees SET company_id = $1 WHERE id = $2', [org.otherCompanyId, foreign.employeeId]); // an employee of the other company placed in the same unit
      return { org, mine, foreign };
    }

    it('shows a viewer only the people of their own company in a unit managed per company (the others stay hidden)', async () => {
      const { org, mine, foreign } = await twoCompanies();
      await t.db.query(`UPDATE org_nodes SET management_mode = 'per_company' WHERE id = $1`, [org.unitA.id]);
      const viewer = await t.factories.signIn(await t.factories.user({ unit: org.unitA, grants: [grant(CorePermission.OrgView)] }));
      const ids = ((await viewer.get(`/api/org/nodes/${org.unitA.id}/employees`).expect(200)).body as { id: string }[]).map((r) => r.id);
      expect(ids).toContain(mine.employeeId);
      expect(ids).not.toContain(foreign.employeeId);
    });

    it('shows everyone in a shared unit, and the full-view key shows everyone too', async () => {
      const { org, mine, foreign } = await twoCompanies();
      await t.db.query(`UPDATE org_nodes SET management_mode = 'shared' WHERE id = $1`, [org.unitA.id]);
      const viewer = await t.factories.signIn(await t.factories.user({ unit: org.unitA, grants: [grant(CorePermission.OrgView)] }));
      expect(((await viewer.get(`/api/org/nodes/${org.unitA.id}/employees`).expect(200)).body as { id: string }[]).map((r) => r.id)).toEqual(expect.arrayContaining([mine.employeeId, foreign.employeeId]));
      await t.db.query(`UPDATE org_nodes SET management_mode = 'per_company' WHERE id = $1`, [org.unitA.id]);
      const full = await t.factories.signIn(await t.factories.user({ grants: [grant(CorePermission.OrgView), grant(VIEW_FULL)] }));
      expect(((await full.get(`/api/org/nodes/${org.unitA.id}/employees`).expect(200)).body as { id: string }[]).map((r) => r.id)).toEqual(expect.arrayContaining([mine.employeeId, foreign.employeeId]));
    });

    it('answers 404 for a unit that does not exist even with the full-view key, and 200 [] for an existing unit with nobody', async () => {
      const org = await t.factories.org();
      const full = await t.factories.signIn(await t.factories.user({ grants: [grant(CorePermission.OrgView), grant(VIEW_FULL)] }));
      await full.get('/api/org/nodes/00000000-0000-4000-8000-000000000000/employees').expect(404);
      expect((await full.get(`/api/org/nodes/${org.sectionC}/employees`).expect(200)).body).toEqual([]);
    });
  });
});

import { describe, expect, it } from 'vitest';
import { AppConfig } from '../src/config/app-config.service';
import { OrgDemoSeeder } from '../src/database/seeds/org-demo.seeder';
import { CompaniesService } from '../src/modules/org/application/services/companies.service';
import { OrgLevelsService } from '../src/modules/org/application/services/org-levels.service';
import { OrgNodesService } from '../src/modules/org/application/services/org-nodes.service';
import { FoundationSeeder } from '../src/database/seeds/foundation.seeder';
import { codeFor } from './helpers/totp';
import { useTestApp } from './setup/test-app';
import request from 'supertest';

describe('Seeders (FR-14, FR-25)', () => {
  const t = useTestApp();
  const count = async (sql: string): Promise<number> => (await t.db.query(sql))[0].n;

  it('creates the ten companies with the four default levels, the roles and the startup administrator', async () => {
    await t.app.get(FoundationSeeder).run();
    expect(await count('SELECT count(*)::int AS n FROM companies')).toBe(10);
    expect(await count('SELECT count(*)::int AS n FROM org_levels')).toBe(40);
    const arw = await t.db.query(`SELECT l.sort_order, l.is_assignable, ta.name AS ar, te.name AS en FROM org_levels l
      JOIN companies c ON c.id = l.company_id AND c.code = 'ARW'
      JOIN org_level_translations ta ON ta.org_level_id = l.id AND ta.lang = 'ar'
      JOIN org_level_translations te ON te.org_level_id = l.id AND te.lang = 'en' ORDER BY l.sort_order`);
    expect(arw.map((l: { ar: string }) => l.ar)).toEqual(['قطاع', 'إدارة', 'قسم', 'وحدة']);
    expect(arw.map((l: { en: string }) => l.en)).toEqual(['Sector', 'Department', 'Section', 'Unit']);
    expect(arw.map((l: { is_assignable: boolean }) => l.is_assignable)).toEqual([false, false, false, true]);
    const names = await t.db.query(`SELECT te.name AS en FROM companies c JOIN company_translations te ON te.company_id = c.id AND te.lang = 'en' ORDER BY c.code`);
    expect(names.map((n: { en: string }) => n.en)).toContain('Arweqah Alreyadah');
    const roles = await t.db.query('SELECT name_en FROM roles WHERE is_system ORDER BY name_en');
    expect(roles.map((r: { name_en: string }) => r.name_en)).toEqual(['Employee', 'System Admin']);
  });

  it('sample structure (development only): off by default, and when on fills each empty company once with units that have job titles', async () => {
    await t.app.get(FoundationSeeder).run();
    const build = (on: boolean) =>
      new OrgDemoSeeder({ get: () => on } as unknown as AppConfig, t.app.get(CompaniesService), t.app.get(OrgLevelsService), t.app.get(OrgNodesService));
    const before = await count('SELECT count(*)::int AS n FROM org_nodes');
    await build(false).run();
    expect(await count('SELECT count(*)::int AS n FROM org_nodes')).toBe(before);
    await build(true).run();
    expect(await count('SELECT count(*)::int AS n FROM org_nodes')).toBe(10 * 7);
    expect(await count('SELECT count(*)::int AS n FROM job_titles')).toBe(10 * 4);
    await build(true).run();
    expect(await count('SELECT count(*)::int AS n FROM org_nodes')).toBe(10 * 7);
  });

  it('is safe to run again: nothing is duplicated', async () => {
    const seeder = t.app.get(FoundationSeeder);
    await seeder.run();
    const snapshot = async () => [
      await count('SELECT count(*)::int AS n FROM companies'),
      await count('SELECT count(*)::int AS n FROM org_levels'),
      await count('SELECT count(*)::int AS n FROM users'),
      await count('SELECT count(*)::int AS n FROM employees'),
      await count('SELECT count(*)::int AS n FROM countries'),
      await count('SELECT count(*)::int AS n FROM role_permissions'),
      await count('SELECT count(*)::int AS n FROM authenticators'),
    ];
    const first = await snapshot();
    await seeder.run();
    expect(await snapshot()).toEqual(first);
  });

  it('makes the administrator an employee of Arweqah Alreyadah with every permission, and no password', async () => {
    await t.app.get(FoundationSeeder).run();
    const email = t.app.get(AppConfig).get('SEED_ADMIN_EMAIL') as string;
    expect(email).toMatch(/@arweqah\.sa$/);
    const admin = (await t.db.query(
      `SELECT e.is_system_account, e.org_node_id, c.code FROM employees e JOIN users u ON u.id = e.user_id JOIN companies c ON c.id = e.company_id WHERE u.email = $1`, [email],
    ))[0];
    expect(admin).toMatchObject({ is_system_account: true, org_node_id: null, code: 'ARW' });
    expect(await count(`SELECT count(*)::int AS n FROM auth_accounts WHERE provider_id = 'credential'`)).toBe(0);
    const scopes = await t.db.query(`SELECT DISTINCT scope FROM role_permissions rp JOIN roles r ON r.id = rp.role_id WHERE r.name_en = 'System Admin'`);
    expect(scopes.map((s: { scope: string }) => s.scope)).toEqual(['all']);
  });

  it('lets the development administrator sign in with the e-mail and the code of the seeded secret', async () => {
    await t.app.get(FoundationSeeder).run();
    const config = t.app.get(AppConfig);
    const secret = config.get('SEED_ADMIN_TOTP_SECRET');
    if (!secret) return;
    const res = await request(t.app.getHttpServer()).post('/api/auth/totp/sign-in').set('x-forwarded-for', '10.7.0.1')
      .send({ email: config.get('SEED_ADMIN_EMAIL'), code: codeFor(secret) });
    expect(res.status).toBe(200);
  });
});

import { describe, expect, it } from 'vitest';
import { AppConfig } from '../src/config/app-config.service';
import { FoundationSeeder } from '../src/database/seeds/foundation.seeder';
import { codeFor } from './helpers/totp';
import { useTestApp } from './setup/test-app';
import request from 'supertest';

describe('Seeders (FR-14, FR-25)', () => {
  const t = useTestApp();
  const count = async (sql: string): Promise<number> => (await t.db.query(sql))[0].n;

  it('creates the ten companies, the group\'s five unit types with their rules, the roles and the startup administrator', async () => {
    await t.app.get(FoundationSeeder).run();
    expect(await count('SELECT count(*)::int AS n FROM companies')).toBe(10);
    expect(await count('SELECT count(*)::int AS n FROM org_levels')).toBe(5);
    const types = await t.db.query(`SELECT l.template_code, l.is_assignable, l.is_built_in, ta.name AS ar, te.name AS en FROM org_levels l
      JOIN org_level_translations ta ON ta.org_level_id = l.id AND ta.lang = 'ar'
      JOIN org_level_translations te ON te.org_level_id = l.id AND te.lang = 'en' ORDER BY l.sort_order`);
    expect(types.map((l: { ar: string }) => l.ar)).toEqual(['قطاع', 'إدارة', 'قسم', 'وحدة', 'مكتب']);
    expect(types.map((l: { en: string }) => l.en)).toEqual(['Sector', 'Department', 'Section', 'Unit', 'Office']);
    expect(types.map((l: { is_assignable: boolean }) => l.is_assignable)).toEqual([false, true, true, true, true]);
    expect(types.every((l: { is_built_in: boolean }) => l.is_built_in)).toBe(true);
    expect(await count('SELECT count(*)::int AS n FROM org_level_parents')).toBe(14);
    expect(await count('SELECT count(*)::int AS n FROM org_level_parents WHERE parent_level_id IS NULL')).toBe(3);
    const names = await t.db.query(`SELECT te.name AS en FROM companies c JOIN company_translations te ON te.company_id = c.id AND te.lang = 'en' ORDER BY c.code`);
    expect(names.map((n: { en: string }) => n.en)).toContain('Arweqah Alreyadah');
    const roles = await t.db.query('SELECT name_en FROM roles WHERE is_system ORDER BY name_en');
    expect(roles.map((r: { name_en: string }) => r.name_en)).toEqual(['Employee', 'System Admin']);
  });

  it('organization structure (every environment, the server included): gives Arweqah Alreyadah the owner sheet once, with a job title for each unit, and never again', async () => {
    const seeder = t.app.get(FoundationSeeder);
    await seeder.run();
    expect(await count('SELECT count(*)::int AS n FROM org_nodes')).toBe(68);
    expect(await count('SELECT count(*)::int AS n FROM job_titles')).toBe(32);
    await seeder.run();
    expect(await count('SELECT count(*)::int AS n FROM org_nodes')).toBe(68);
    await t.db.query(`UPDATE org_nodes SET deleted_at = now() WHERE id = (SELECT id FROM org_nodes ORDER BY created_at DESC LIMIT 1)`);
    await seeder.run(); // a structure that someone changed is left alone
    expect(await count('SELECT count(*)::int AS n FROM org_nodes WHERE deleted_at IS NULL')).toBe(67);
  });

  it('gives the sample structure unit codes by type, with the top units shared (FR-96, FR-97)', async () => {
    await t.app.get(FoundationSeeder).run();
    expect(await count('SELECT count(*)::int AS n FROM org_nodes WHERE code IS NULL')).toBe(0);
    expect(await count(`SELECT count(*)::int AS n FROM org_nodes WHERE parent_id IS NULL AND management_mode = 'shared'`)).toBe(7);
    expect(await count(`SELECT count(*)::int AS n FROM org_nodes WHERE parent_id IS NOT NULL AND management_mode IS NOT NULL`)).toBe(0);
    expect(await count(`SELECT count(*)::int AS n FROM org_nodes WHERE parent_id IS NULL AND code !~ '^[A-Z]{3}\\.00\\.00\\.00$'`)).toBe(0);
  });

  it('keeps a type renamed or switched by an administrator and a rules table that was edited when it runs again', async () => {
    const seeder = t.app.get(FoundationSeeder);
    await seeder.run();
    await t.db.query(`UPDATE org_level_translations SET name = 'Branch' WHERE lang = 'en' AND org_level_id = (SELECT id FROM org_levels WHERE template_code = 'unit')`);
    await t.db.query('DELETE FROM org_level_parents WHERE parent_level_id IS NULL AND child_level_id = (SELECT id FROM org_levels WHERE template_code = $1)', ['office']);
    await seeder.run();
    expect(await count(`SELECT count(*)::int AS n FROM org_level_translations WHERE name = 'Branch'`)).toBe(1);
    expect(await count('SELECT count(*)::int AS n FROM org_level_parents')).toBe(13);
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

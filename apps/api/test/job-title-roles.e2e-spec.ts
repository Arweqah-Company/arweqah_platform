import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { AutoRolesService } from '../src/core/access/application/auto-roles.service';
import { ADMIN_MODE_GRANT, ORG_AND_ROLES_ADMIN_GRANTS, type TestAgent } from './factories/factories';
import { useTestApp } from './setup/test-app';

const ALL = 'all' as const;
const ORG_ADMIN = [ADMIN_MODE_GRANT, ...ORG_AND_ROLES_ADMIN_GRANTS];

interface RoleRow {
  id: string;
  nameAr: string;
  nameEn: string;
  assignment: string;
  autoRule: string | null;
  jobTitleId: string | null;
  usersCount: number;
  permissions: { key: string; scope: string }[];
  origin: { companyId: string; unitNameEn: string; companyNameEn: string } | null;
}

describe('A role for every job title (FR-68)', () => {
  const t = useTestApp();
  const roleOfTitle = async (jobTitleId: string): Promise<RoleRow | undefined> => (await listRoles()).find((r) => r.jobTitleId === jobTitleId);
  let agent: TestAgent;
  const listRoles = async (): Promise<RoleRow[]> => (await agent.get('/api/roles').expect(200)).body;

  /** The Employee role (the "everyone" rule): what a new job title role starts with when no template is chosen. */
  async function employeeRole(keys: string[]) {
    const role = await t.factories.role(keys.map((key) => ({ key, scope: ALL })));
    await t.db.query(`UPDATE roles SET assignment = 'auto', auto_rule = 'everyone' WHERE id = $1`, [role.id]);
    return role;
  }
  const setup = async (grants = ORG_ADMIN): Promise<void> => {
    agent = await t.factories.signInAdminMode(await t.factories.user({ grants }));
  };

  it('makes a role with each job title of a new unit, named «title — unit» and starting empty (the Employee role gives the baseline)', async () => {
    await employeeRole([CorePermission.ProfileView, CorePermission.TicketsView]);
    const org = await t.factories.org();
    await setup();
    const role = await roleOfTitle(org.unitA.titleId);
    expect(role).toMatchObject({ nameEn: 'Title Unit A — Unit A', assignment: 'auto', autoRule: 'job_title', usersCount: 0 });
    expect(role?.permissions).toEqual([]);
    expect(role?.origin).toMatchObject({ unitNameEn: 'Unit A', companyId: org.companyId });
  });

  it('copies the permissions of the template chosen for a title added later, and nothing when none is chosen', async () => {
    await employeeRole([CorePermission.ProfileView]);
    const org = await t.factories.org();
    await setup([...ORG_ADMIN, { key: CorePermission.AuditView, scope: ALL }]);
    const template = await t.factories.role([{ key: CorePermission.AuditView, scope: ALL }]);
    const added = (await agent.post(`/api/org/nodes/${org.unitC.id}/job-titles`).send({ jobTitles: [{ nameAr: 'مدقق', nameEn: 'Auditor', templateRoleId: template.id }, { nameAr: 'محلل', nameEn: 'Analyst' }] }).expect(201)).body as { id: string; nameEn: string }[];
    // The response is not in the order of the request.
    const idOf = (nameEn: string) => added.find((x) => x.nameEn === nameEn)?.id as string;
    expect((await roleOfTitle(idOf('Auditor')))?.permissions.map((p) => p.key)).toEqual([CorePermission.AuditView]);
    expect((await roleOfTitle(idOf('Analyst')))?.permissions).toEqual([]);
    const copy = await roleOfTitle(idOf('Auditor'));
    await t.db.query('DELETE FROM role_permissions WHERE role_id = $1', [template.id]);
    expect((await roleOfTitle(copy?.jobTitleId as string))?.permissions).toHaveLength(1);
  });

  it('refuses a template that does not exist, one that follows the organization, or one holding more than the actor does', async () => {
    const org = await t.factories.org();
    await setup();
    const send = (templateRoleId: string) => agent.post(`/api/org/nodes/${org.unitC.id}/job-titles`).send({ jobTitles: [{ nameAr: 'محلل', nameEn: 'Analyst', templateRoleId }] });
    await send('00000000-0000-4000-8000-0000000000aa').expect(404);
    const derived = (await roleOfTitle(org.unitA.titleId))?.id as string;
    expect((await send(derived).expect(422)).body.code).toBe('ROLE_TEMPLATE_INVALID');
    const strong = await t.factories.role([{ key: CorePermission.AuditView, scope: ALL }]);
    await send(strong.id).expect(403);
    expect((await listRoles()).filter((r) => r.nameEn === 'Analyst')).toHaveLength(0);
  });

  it('renames the role with the title and keeps the permissions an administrator set', async () => {
    const org = await t.factories.org();
    await setup([...ORG_ADMIN, { key: CorePermission.RolesUpdate, scope: ALL }, { key: CorePermission.AuditView, scope: ALL }]);
    const role = (await roleOfTitle(org.unitA.titleId)) as RoleRow;
    await agent.put(`/api/roles/${role.id}`).send({ nameAr: role.nameAr, nameEn: role.nameEn, permissions: [{ key: CorePermission.AuditView, scope: ALL }] }).expect(200);
    await agent.put(`/api/org/job-titles/${org.unitA.titleId}`).send({ nameAr: 'محاسب أول', nameEn: 'Senior accountant', isActive: true }).expect(200);
    expect(await roleOfTitle(org.unitA.titleId)).toMatchObject({ nameAr: 'محاسب أول', nameEn: 'Senior accountant', permissions: [{ key: CorePermission.AuditView, scope: ALL }] });
  });

  it('removes the role with its title, and the roles of a unit with the unit; a title that people hold stays', async () => {
    const org = await t.factories.org();
    await setup();
    const added = (await agent.post(`/api/org/nodes/${org.unitC.id}/job-titles`).send({ jobTitles: [{ nameAr: 'محلل', nameEn: 'Analyst' }] }).expect(201)).body as { id: string }[];
    const extra = added[0]?.id as string;
    expect(await roleOfTitle(extra)).toBeDefined();
    await agent.delete(`/api/org/job-titles/${extra}`).expect(204);
    expect(await roleOfTitle(extra)).toBeUndefined();
    await t.factories.user({ unit: org.unitC });
    await agent.delete(`/api/org/job-titles/${org.unitC.titleId}`).expect(422);
    expect(await roleOfTitle(org.unitC.titleId)).toBeDefined();
    await agent.delete(`/api/org/nodes/${org.unitOther.id}`).expect(204);
    expect(await roleOfTitle(org.unitOther.titleId)).toBeUndefined();
  });

  it('heals by itself: a title made another way gets its role, a removed title loses it', async () => {
    await employeeRole([CorePermission.ProfileView]);
    const org = await t.factories.org();
    await setup();
    await t.db.query(`INSERT INTO job_titles (org_node_id) VALUES ($1)`, [org.unitA.id]);
    const raw = ((await t.db.query('SELECT id FROM job_titles WHERE id NOT IN (SELECT job_title_id FROM roles WHERE job_title_id IS NOT NULL) AND deleted_at IS NULL')) as { id: string }[])[0]?.id as string;
    await t.db.query(`INSERT INTO job_title_translations (job_title_id, lang, name) VALUES ($1, 'ar', 'مسمى خام'), ($1, 'en', 'Raw title')`, [raw]);
    await t.app.get(AutoRolesService).sync();
    expect(await roleOfTitle(raw)).toMatchObject({ nameEn: 'Raw title — Unit A', permissions: [] });
    await t.db.query('UPDATE job_titles SET deleted_at = now() WHERE id = $1', [raw]);
    await t.app.get(AutoRolesService).sync();
    expect(await roleOfTitle(raw)).toBeUndefined();
  });

  it('answers 403 to a person without the organization keys', async () => {
    const org = await t.factories.org();
    const plain = await t.factories.signIn(await t.factories.user());
    await plain.post(`/api/org/nodes/${org.unitC.id}/job-titles`).send({ jobTitles: [{ nameAr: 'محلل', nameEn: 'Analyst' }] }).expect(403);
  });
});

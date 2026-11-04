import { CorePermission, DEFAULT_EDITABLE_FIELDS, type EmployeeDto, type PermissionGrant, type PermissionTargetDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { UserAccessService } from '../src/core/access/application/user-access.service';
import { ADMIN_MODE_GRANT, type TestAgent, type TestUser } from './factories/factories';
import { useTestApp } from './setup/test-app';

const P = CorePermission;
const grant = (key: string, scope: PermissionGrant['scope'], fields?: string[]): PermissionGrant => ({ key, scope, ...(fields && { fields }) });
const PERMISSIONS_ADMIN = [ADMIN_MODE_GRANT, ...[P.PermissionsView, P.PermissionsRoleUpdate, P.PermissionsUserUpdate, P.PermissionsUserGroupUpdate, P.PermissionsRoleGroupUpdate, P.EmployeesUpdate].map((key) => grant(key, 'all'))];

/** The whole edit form of an employee as the page sends it back, with some fields changed. */
const formOf = (e: EmployeeDto, changes: Record<string, unknown>) => ({
  companyId: e.company.id, orgNodeId: e.orgNode?.id, jobTitleId: e.jobTitle?.id, managerId: e.manager?.id ?? null,
  workEmail: e.workEmail, employeeNumber: e.employeeNumber, fullName: e.fullName, startDate: e.startDate, ...changes,
});

describe('The fields a holder of «edit employees» may change belong to each grant (FR-94)', () => {
  const t = useTestApp();

  async function setup() {
    const org = await t.factories.org();
    const colleague = await t.factories.user({ unit: org.unitA });
    return { org, colleague, admin: await t.factories.signInAdminMode(await t.factories.user({ grants: PERMISSIONS_ADMIN })) };
  }
  const record = async (agent: TestAgent, user: TestUser): Promise<EmployeeDto> => (await agent.get(`/api/employees/${user.employeeId}`).expect(200)).body;
  const setRole = (admin: TestAgent, roleId: string, permissions: object[]) => admin.put(`/api/permission-targets/role/${roleId}`).send({ permissions });

  it('starts a new grant with the basic data (contact and personal) and keeps the list the administrator saves, for roles, groups and people', async () => {
    const { admin } = await setup();
    const role = await t.factories.role([]);
    const saved = (await setRole(admin, role.id, [{ key: P.EmployeesUpdate, scope: 'all' }]).expect(200)).body as PermissionTargetDto;
    expect(saved.permissions[0]?.fields).toEqual([...DEFAULT_EDITABLE_FIELDS]);
    const wider = (await setRole(admin, role.id, [{ key: P.EmployeesUpdate, scope: 'own', fields: ['salaryCurrencyCountryId', 'iban', 'workPhone'] }]).expect(200)).body as PermissionTargetDto;
    expect(wider.permissions[0]).toMatchObject({ scope: 'own', fields: ['salaryCurrencyCountryId', 'iban', 'workPhone'] });
    const person = await t.factories.user();
    const personal = (await admin.put(`/api/permission-targets/user/${person.id}`).send({ permissions: [{ key: P.EmployeesUpdate, scope: 'own', fields: ['profession'] }] }).expect(200)).body as PermissionTargetDto;
    expect(personal.permissions[0]?.fields).toEqual(['profession']);
  });

  it('refuses a list of fields on a permission that carries none, and an unknown field (400)', async () => {
    const { admin } = await setup();
    const role = await t.factories.role([]);
    await setRole(admin, role.id, [{ key: P.EmployeesView, scope: 'all', fields: ['workPhone'] }]).expect(400);
    await setRole(admin, role.id, [{ key: P.EmployeesUpdate, scope: 'all', fields: ['notAField'] }]).expect(400);
  });

  it('lets a person change only the fields of their grant, with no field locked: salary is allowed to a holder whose list has it', async () => {
    const { org, colleague } = await setup();
    const hr = await t.factories.user({ unit: org.unitA, grants: [grant(P.EmployeesView, 'all'), grant(P.EmployeesUpdate, 'all', ['workLocation', 'iban'])] });
    const agent = await t.factories.signIn(hr);
    const target = await record(agent, colleague);
    expect(target.editableFields.sort()).toEqual(['iban', 'workLocation']);
    await agent.put(`/api/employees/${colleague.employeeId}`).send(formOf(target, { workLocation: 'Riyadh' })).expect(200);
    const refused = await agent.put(`/api/employees/${colleague.employeeId}`).send(formOf(target, { profession: 'Engineer' })).expect(422);
    expect(refused.body.code).toBe('FIELD_NOT_EDITABLE');
    expect(JSON.stringify(refused.body)).toContain('profession');
  });

  it('gives the union of the fields of every grant that reaches the record, and on their own record all of their grants', async () => {
    const { org, colleague } = await setup();
    const far = await t.factories.user({ unit: org.unitOther });
    const me = await t.factories.user({ unit: org.unitA, grants: [grant(P.EmployeesView, 'all'), grant(P.EmployeesUpdate, 'own', ['workPhone'])] });
    // A second role: «edit employees» at the reach of their unit, for the profession only.
    const unitRole = await t.factories.role([grant(P.EmployeesView, 'all'), grant(P.EmployeesUpdate, 'unit', ['profession'])]);
    const access = t.app.get(UserAccessService);
    const roleIds = ((await t.db.query('SELECT role_id FROM user_roles WHERE user_id = $1', [me.id])) as { role_id: string }[]).map((r) => r.role_id);
    await access.replaceRoles(me.id, [...roleIds, unitRole.id]);
    const agent = await t.factories.signIn(me);
    expect((await record(agent, me)).editableFields.sort()).toEqual(['profession', 'workPhone']);
    expect((await record(agent, colleague)).editableFields).toEqual(['profession']);
    expect((await record(agent, far)).editableFields).toEqual([]);
  });

  it('keeps the structure fields (company, unit, title, manager, relation, dates, number) out unless the grant lists them', async () => {
    const { org, colleague } = await setup();
    const hr = await t.factories.user({ unit: org.unitA, grants: [grant(P.EmployeesView, 'all'), grant(P.EmployeesUpdate, 'all', ['workLocation'])] });
    const agent = await t.factories.signIn(hr);
    const target = await record(agent, colleague);
    expect((await agent.put(`/api/employees/${colleague.employeeId}`).send(formOf(target, { employeeNumber: 'CHANGED-1' })).expect(422)).body.code).toBe('FIELD_NOT_EDITABLE');
    const lists = await t.factories.user({ unit: org.unitA, grants: [grant(P.EmployeesView, 'all'), grant(P.EmployeesUpdate, 'all', ['employeeNumber'])] });
    await (await t.factories.signIn(lists)).put(`/api/employees/${colleague.employeeId}`).send(formOf(target, { employeeNumber: 'CHANGED-2' })).expect(200);
  });

  it('shows a plain employee the fields of their own grant on their own record and on their page, and the administrator can give them more', async () => {
    const { org, admin } = await setup();
    const me = await t.factories.user({ unit: org.unitA });
    const base = ['fullNameEn', 'personalEmail', 'personalPhone', 'workPhone'];
    expect((await record(await t.factories.signIn(me), me)).editableFields.sort()).toEqual(base);
    expect(((await (await t.factories.signIn(me)).get('/api/me/profile').expect(200)).body.employee as EmployeeDto).editableFields.sort()).toEqual(base);
    // The administrator gives this one person more for their own record: even a pay field (no field is locked).
    await admin.put(`/api/permission-targets/user/${me.id}`).send({ permissions: [{ key: P.EmployeesUpdate, scope: 'own', fields: ['profession', 'iban'] }] }).expect(200);
    const agent = await t.factories.signIn(me);
    const after = await record(agent, me);
    expect(after.editableFields.sort()).toEqual([...base, 'iban', 'profession'].sort());
    await agent.put(`/api/employees/${me.employeeId}`).send(formOf(after, { profession: 'Analyst' })).expect(200);
  });

  it('applies the same lists to the plain fields of a bulk edit: a person whose grant lacks the field has the employee refused (preview and real run alike)', async () => {
    const { org, colleague } = await setup();
    const some = await t.factories.user({ unit: org.unitA, grants: [grant(P.EmployeesView, 'all'), grant(P.EmployeesBulkUpdate, 'all'), grant(P.EmployeesUpdate, 'all', ['workPhone'])] });
    const lists = await t.factories.user({ unit: org.unitA, grants: [grant(P.EmployeesView, 'all'), grant(P.EmployeesBulkUpdate, 'all'), grant(P.EmployeesUpdate, 'all', ['workLocation'])] });
    const body = { employeeIds: [colleague.employeeId], workLocation: 'Bulk place' };
    for (const dryRun of [true, false]) {
      const refused = (await (await t.factories.signIn(some)).post('/api/employees/bulk-update').send({ ...body, dryRun }).expect(200)).body as { accepted: unknown[]; rejected: { code: string }[] };
      expect(refused.accepted).toHaveLength(0);
      expect(refused.rejected[0]?.code).toBe('FIELD_NOT_EDITABLE');
    }
    const ok = (await (await t.factories.signIn(lists)).post('/api/employees/bulk-update').send(body).expect(200)).body as { accepted: unknown[] };
    expect(ok.accepted).toHaveLength(1);
  });

  it('does not let someone give fields they cannot change themselves (403)', async () => {
    const { org } = await setup();
    const limited = await t.factories.signInAdminMode(await t.factories.user({ unit: org.unitA, grants: [ADMIN_MODE_GRANT, grant(P.PermissionsView, 'all'), grant(P.PermissionsRoleUpdate, 'all'), grant(P.EmployeesUpdate, 'all', ['workPhone'])] }));
    const role = await t.factories.role([]);
    await limited.put(`/api/permission-targets/role/${role.id}`).send({ permissions: [{ key: P.EmployeesUpdate, scope: 'all', fields: ['workPhone', 'iban'] }] }).expect(403);
    await limited.put(`/api/permission-targets/role/${role.id}`).send({ permissions: [{ key: P.EmployeesUpdate, scope: 'all', fields: ['workPhone'] }] }).expect(200);
  });

  it('never lets someone give a field at a reach wider than the grant that holds it (CodeRabbit PR 50)', async () => {
    const { org } = await setup();
    const withoutUpdate = PERMISSIONS_ADMIN.filter((g) => g.key !== P.EmployeesUpdate);
    const giver = await t.factories.user({ unit: org.unitA, grants: [...withoutUpdate, grant(P.EmployeesUpdate, 'all', ['workPhone'])] });
    const ownRole = await t.factories.role([grant(P.EmployeesUpdate, 'own', ['iban'])]);
    const access = t.app.get(UserAccessService);
    const roleIds = ((await t.db.query('SELECT role_id FROM user_roles WHERE user_id = $1', [giver.id])) as { role_id: string }[]).map((r) => r.role_id);
    await access.replaceRoles(giver.id, [...roleIds, ownRole.id]);
    const agent = await t.factories.signInAdminMode(giver);
    const person = await t.factories.user();
    const give = (permission: PermissionGrant) => agent.put(`/api/permission-targets/user/${person.id}`).send({ permissions: [permission] });
    await give(grant(P.EmployeesUpdate, 'all', ['iban'])).expect(403);
    await give(grant(P.EmployeesUpdate, 'all', ['workPhone'])).expect(200);
    await give(grant(P.EmployeesUpdate, 'own', ['iban'])).expect(200);
  });

  it('does not count an unchanged ID number, IBAN or salary as a change just because it is stored with a new random IV (CodeRabbit PR 50)', async () => {
    const { org, colleague } = await setup();
    const view = [grant(P.EmployeesView, 'all'), grant(P.EmployeesViewSensitive, 'all')];
    const finance = await t.factories.signIn(await t.factories.user({ unit: org.unitA, grants: [...view, grant(P.EmployeesUpdate, 'all', ['iban'])] }));
    const IBAN = 'SA0380000000608010167519';
    const before = await record(finance, colleague);
    await finance.put(`/api/employees/${colleague.employeeId}`).send(formOf(before, { iban: IBAN })).expect(200);
    const hr = await t.factories.signIn(await t.factories.user({ unit: org.unitA, grants: [...view, grant(P.EmployeesUpdate, 'all', ['workLocation'])] }));
    const target = await record(hr, colleague);
    expect(target.iban).toBe(IBAN);
    await hr.put(`/api/employees/${colleague.employeeId}`).send(formOf(target, { workLocation: 'Riyadh', iban: target.iban })).expect(200);
  });
});

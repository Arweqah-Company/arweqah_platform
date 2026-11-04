import { CorePermission, type EmployeeFieldRuleDto, type PermissionGrant } from '@arweqah-platform/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

const P = CorePermission;
const grant = (key: string, scope: PermissionGrant['scope']): PermissionGrant => ({ key, scope });
const MANAGER = [ADMIN_MODE_GRANT, grant(P.EmployeeFieldsView, 'all'), grant(P.EmployeeFieldsEdit, 'all')];

describe('Who may change each employee field (FR-94)', () => {
  const t = useTestApp();
  // The rules are seeded by the migration (a reference table), so a test that changes them puts them back.
  afterEach(async () => {
    await t.db.query(`UPDATE employee_field_rules SET editable_by_self = field IN ('workPhone', 'personalPhone', 'personalEmail', 'fullNameEn'), editable_by_hr = true`);
  });

  async function setup() {
    const org = await t.factories.org();
    const admin = await t.factories.signInAdminMode(await t.factories.user({ grants: MANAGER }));
    const person = await t.factories.user({ unit: org.unitA });
    const own = await t.factories.signIn(person);
    const form = async (agent: typeof own, id: string, changes: Record<string, unknown>) => {
      const before = (await agent.get(`/api/employees/${id}`).expect(200)).body;
      return agent.put(`/api/employees/${id}`).send({ companyId: before.company.id, orgNodeId: before.orgNode?.id, jobTitleId: before.jobTitle?.id, workEmail: before.workEmail, employeeNumber: before.employeeNumber, fullName: before.fullName, startDate: before.startDate, managerId: before.manager?.id ?? null, ...changes });
    };
    return { org, admin, person, own, form };
  }
  const set = (agent: Awaited<ReturnType<typeof setup>>['admin'], rules: { field: string; editableBySelf: boolean; editableByHr: boolean }[]) => agent.put('/api/employee-fields').send({ rules });

  it('begins as the rule the platform had: the employee changes their phones and English name, not the rest', async () => {
    const { admin, person, own, form } = await setup();
    const list = (await admin.get('/api/employee-fields').expect(200)).body as EmployeeFieldRuleDto[];
    expect(list.filter((r) => r.editableBySelf).map((r) => r.field).sort()).toEqual(['fullNameEn', 'personalEmail', 'personalPhone', 'workPhone']);
    expect(list.find((r) => r.field === 'iban')).toMatchObject({ selfLocked: true, editableBySelf: false, group: 'salary' });
    await form(own, person.employeeId, { personalPhone: '+966500000001' }).then((r) => expect(r.status).toBe(200));
    const refused = await form(own, person.employeeId, { workLocation: 'Riyadh' });
    expect(refused.status).toBe(422);
    expect(refused.body.code).toBe('FIELD_NOT_EDITABLE');
  });

  it('takes effect at once: a field switched on for the employee can be changed by them, one switched off cannot', async () => {
    const { admin, person, own, form } = await setup();
    await set(admin, [{ field: 'workLocation', editableBySelf: true, editableByHr: true }, { field: 'personalPhone', editableBySelf: false, editableByHr: true }]).expect(200);
    await form(own, person.employeeId, { workLocation: 'Dammam' }).then((r) => expect(r.status).toBe(200));
    const refused = await form(own, person.employeeId, { personalPhone: '+966500000002' });
    expect(refused.status).toBe(422);
    expect((await own.put('/api/me/profile').send({ personalPhone: '+966500000003' })).status).toBe(422);
    expect((await own.get('/api/me/profile/field-rules').expect(200)).body.fields).toContain('workLocation');
  });

  it('never lets a field of identity, contract or pay be switched on for the employee (422)', async () => {
    const { admin } = await setup();
    const res = await set(admin, [{ field: 'iban', editableBySelf: true, editableByHr: true }]);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('FIELD_NEVER_SELF_EDITABLE');
    const list = (await admin.get('/api/employee-fields').expect(200)).body as EmployeeFieldRuleDto[];
    expect(list.find((r) => r.field === 'iban')?.editableBySelf).toBe(false);
  });

  it('keeps a field from HR when only the platform administrator may change it', async () => {
    const { admin, org, person, form } = await setup();
    await set(admin, [{ field: 'workLocation', editableBySelf: false, editableByHr: false }]).expect(200);
    const hr = await t.factories.signIn(await t.factories.user({ unit: org.unitB, grants: [grant(P.EmployeesView, 'all'), grant(P.EmployeesUpdate, 'all')] }));
    const refused = await form(hr, person.employeeId, { workLocation: 'Abha' });
    expect(refused.status).toBe(422);
    await form(hr, person.employeeId, { workPhone: '+966500000009' }).then((r) => expect(r.status).toBe(200));
    const asAdmin = await t.factories.signInAdminMode(await t.factories.user({ grants: [...MANAGER, grant(P.EmployeesView, 'all'), grant(P.EmployeesUpdate, 'all')] }));
    await form(asAdmin, person.employeeId, { workLocation: 'Abha' }).then((r) => expect(r.status).toBe(200));
  });

  it('is for platform administrators only: no key 403, admin mode off, and a malformed request 400', async () => {
    const { own, admin } = await setup();
    await own.get('/api/employee-fields').expect(403);
    const noMode = await t.factories.signIn(await t.factories.user({ grants: MANAGER }));
    expect((await noMode.get('/api/employee-fields').expect(403)).body.code).toBeTruthy();
    const viewOnly = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, grant(P.EmployeeFieldsView, 'all')] }));
    await viewOnly.get('/api/employee-fields').expect(200);
    await set(viewOnly, [{ field: 'workLocation', editableBySelf: true, editableByHr: true }]).expect(403);
    await set(admin, [{ field: 'notAField', editableBySelf: true, editableByHr: true }]).expect(400);
    await set(admin, []).expect(400);
  });
});

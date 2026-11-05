import { CorePermission, type LookupsDto, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { todayInRiyadh } from '../src/common/domain/riyadh-date';
import { EmployeeLifecycleJob } from '../src/modules/employees/infrastructure/jobs/employee-lifecycle.job';
import type { TestAgent, TestOrg, TestUnit, TestUser } from './factories/factories';
import { codeFor } from './helpers/totp';
import { useTestApp } from './setup/test-app';
import request from 'supertest';

const P = CorePermission;
const grant = (key: string, scope: PermissionGrant['scope']): PermissionGrant => ({ key, scope });
const hr = [P.EmployeesView, P.EmployeesCreate, P.EmployeesUpdate, P.EmployeesDeactivate, P.EmployeesViewSensitive, P.EmployeesAssignRoles, P.EmployeesTerminate, P.EmployeesResendInvite, P.EmployeesResetAuthenticator, P.LookupsView].map((k) => grant(k, 'all'));

let counter = 0;
const unique = () => String(++counter).padStart(5, '0');

describe('Employees (FR-17, FR-18, FR-20, FR-21)', () => {
  const t = useTestApp();

  async function setup() {
    const org = await t.factories.org();
    const admin = await t.factories.user({ grants: hr });
    const agent = await t.factories.signIn(admin);
    const lookups: LookupsDto = (await agent.get('/api/lookups').expect(200)).body;
    const pick = (list: { id: string; code: string }[], code: string) => (list.find((i) => i.code === code) as { id: string }).id;
    const sa = pick(lookups.countries, 'SA');
    const payload = (unit: TestUnit = org.unitA, overrides: Record<string, unknown> = {}) => {
      const n = unique();
      return {
        companyId: unit.companyId, orgNodeId: unit.id, jobTitleId: unit.titleId,
        workEmail: `emp${n}@arweqah.sa`, employeeNumber: `N${n}`, fullName: `موظف ${n}`, startDate: '2024-03-01',
        ...overrides,
      };
    };
    return { org, admin, agent, lookups, pick, sa, payload };
  }

  it('creates an employee with every section of the form, a sign-in account and an activation e-mail', async () => {
    const { agent, lookups, pick, sa, payload, org } = await setup();
    const body = payload(org.unitA, {
      relationTypeId: pick(lookups.relationTypes, 'employee'), workLocation: 'Riyadh HQ', workCountryId: sa, workMode: 1,
      personalEmail: 'sara.personal@example.com', workPhone: '+966112345678', personalPhone: '+966501234567',
      fullNameEn: 'Sara Ahmed', gender: 1, birthDate: '1990-05-17', nationalityId: sa, maritalStatusId: pick(lookups.maritalStatuses, 'married'),
      residencyStatusId: pick(lookups.residencyStatuses, 'citizen'), idTypeId: pick(lookups.idTypes, 'national_id'), idNumber: '1087654321', idExpiryDate: '2031-01-01',
      endDate: '2027-03-01', contractTypeId: pick(lookups.contractTypes, 'fixed_term'), contractCompanyId: org.companyId,
      isGosiRegistered: true, gosiCompanyId: org.companyId, gosiRegistrationDate: '2024-04-01', gosiSystemId: pick(lookups.gosiSystems, 'new_system'),
      profession: 'Engineer', isQiwaContract: true, hasMedicalInsurance: true, healthInsuranceCompanyId: org.companyId,
      monthlyGrossSalary: 15000.5, salaryCurrencyCountryId: sa, iban: 'SA03 8000 0000 6080 1016 7519', notes: 'Joined from referral',
    });
    const res = await agent.post('/api/employees').send(body).expect(201);
    const { employee, invitation } = res.body;
    expect(employee).toMatchObject({ fullName: body.fullName, workEmail: body.workEmail, isActive: true, authenticatorEnabled: false, sensitiveHidden: false, monthlyGrossSalary: 15000.5, idNumber: '1087654321', iban: 'SA0380000000608010167519' });
    expect(employee.orgNode.pathEn).toContain('Unit A');
    expect(invitation).toMatchObject({ sent: true, sentTo: body.workEmail });
    expect(t.mail.sent.at(-1)?.to).toBe(body.workEmail);
    const token = (invitation.enrollmentUrl as string).split('/enroll/')[1] as string;
    const start = await request(t.app.getHttpServer()).get(`/api/mfa/enrollment/${token}`).expect(200);
    const secret = new URL(start.body.otpauthUri).searchParams.get('secret') as string;
    await request(t.app.getHttpServer()).post(`/api/mfa/enrollment/${token}/confirm`).send({ code: codeFor(secret) }).expect(200);
    const signedIn = await request.agent(t.app.getHttpServer()).post('/api/auth/totp/sign-in').set('x-forwarded-for', '10.9.0.1').send({ email: body.workEmail, code: codeFor(secret, Date.now() + 30_000) });
    expect(signedIn.status).toBe(200);
  });

  it('stores ID number, IBAN and salary encrypted, and keeps them out of the audit log', async () => {
    const { agent, lookups, pick, sa, payload } = await setup();
    const body = payload(undefined, { idTypeId: pick(lookups.idTypes, 'national_id'), nationalityId: sa, idNumber: '1087654321', monthlyGrossSalary: 9876.54, salaryCurrencyCountryId: sa, iban: 'SA0380000000608010167519' });
    const created = await agent.post('/api/employees').send(body).expect(201);
    const row = (await t.db.query('SELECT id_number_enc, id_number_hash, iban_enc, monthly_gross_salary_enc FROM employees WHERE id = $1', [created.body.employee.id]))[0];
    const stored = JSON.stringify(row);
    for (const secret of ['1087654321', '9876.54', 'SA0380000000608010167519']) expect(stored).not.toContain(secret);
    expect(row.id_number_hash).toMatch(/^[0-9a-f]{64}$/);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const audit = JSON.stringify(await t.db.query('SELECT changes FROM audit_logs'));
    for (const secret of ['1087654321', '9876.54', 'SA0380000000608010167519']) expect(audit).not.toContain(secret);
  });

  it('validates the form (400, or 422 for a domain that is not allowed): domain, IBAN, age, dates, pairs and conditional fields', async () => {
    const { agent, payload, org, lookups, pick } = await setup();
    const bad = async (overrides: Record<string, unknown>) => (await agent.post('/api/employees').send(payload(org.unitA, overrides))).status;
    expect(await bad({ workEmail: 'someone@gmail.com' })).toBe(422);
    expect(await bad({ workEmail: 'someone@sub.arweqah.sa' })).toBe(422);
    expect(await bad({ workEmail: 'someone@arweqah.sa.evil.com' })).toBe(422);
    expect(await bad({ workEmail: 'not an address' })).toBe(400);
    expect(await bad({ iban: 'SA0000000000000000000000' })).toBe(400);
    expect(await bad({ iban: 'GB82WEST12345698765432' })).toBe(400);
    expect(await bad({ birthDate: '2015-01-01' })).toBe(400);
    expect(await bad({ birthDate: '1940-01-01' })).toBe(400);
    expect(await bad({ birthDate: '1995-01-01', startDate: '2010-01-01' })).toBe(400);
    expect(await bad({ endDate: '2023-01-01' })).toBe(400);
    expect(await bad({ idTypeId: pick(lookups.idTypes, 'iqama') })).toBe(400);
    expect(await bad({ idNumber: '2012345678' })).toBe(400);
    expect(await bad({ isGosiRegistered: true })).toBe(400);
    expect(await bad({ monthlyGrossSalary: 5000 })).toBe(400);
    expect(await bad({ monthlyGrossSalary: -1, salaryCurrencyCountryId: pick(lookups.countries, 'SA') })).toBe(400);
    expect(await bad({ workPhone: '0501234567' })).toBe(400);
    expect(await bad({ fullNameEn: 'سارة' })).toBe(400);
    expect(await bad({ personalEmail: 'a@arweqah.sa', workEmail: 'a@arweqah.sa' })).toBe(400);
    expect(await bad({ terminationReasonId: pick(lookups.terminationReasons, 'resignation') })).toBe(400);
    expect(await bad({ unexpected: true })).toBe(400);
    expect(await bad({ jobTitleId: undefined })).toBe(400);
  });

  it('applies the rules that depend on the chosen options (422): contract type, ID type, nationality, "other" texts', async () => {
    const { agent, payload, org, lookups, pick, sa } = await setup();
    const rule = async (overrides: Record<string, unknown>) => (await agent.post('/api/employees').send(payload(org.unitA, overrides)).expect(422)).body;
    expect((await rule({ contractTypeId: pick(lookups.contractTypes, 'fixed_term') })).details.path).toBe('endDate');
    expect((await rule({ contractTypeId: pick(lookups.contractTypes, 'other') })).details.path).toBe('contractTypeOther');
    const wrongNational = await rule({ idTypeId: pick(lookups.idTypes, 'national_id'), idNumber: '2087654321' });
    expect(wrongNational.details).toMatchObject({ path: 'idNumber', messageEn: expect.stringContaining('National ID'), messageAr: expect.stringContaining('الهوية الوطنية') });
    const wrongChecksum = await rule({ idTypeId: pick(lookups.idTypes, 'national_id'), idNumber: '1087654322' });
    expect(wrongChecksum.details).toMatchObject({ path: 'idNumber', messageEn: expect.stringContaining('check digit') });
    expect((await rule({ idTypeId: pick(lookups.idTypes, 'iqama'), idNumber: '2087654321' })).details.path).toBe('idNumber');
    expect((await rule({ idTypeId: pick(lookups.idTypes, 'home_country_id'), idNumber: 'AB12345' })).details.path).toBe('nationalityId');
    expect((await rule({ endDate: '2026-01-01', terminationReasonId: pick(lookups.terminationReasons, 'other') })).details.path).toBe('terminationReasonOther');
    const ok = await agent.post('/api/employees').send(payload(org.unitA, { idTypeId: pick(lookups.idTypes, 'home_country_id'), idNumber: 'AB12345', nationalityId: sa }));
    expect(ok.status).toBe(201);
  });

  it('saves values hidden by a flag as null even when the client sends them', async () => {
    const { agent, payload, org } = await setup();
    const res = await agent.post('/api/employees').send(payload(org.unitA, { isGosiRegistered: false, gosiCompanyId: org.companyId, gosiRegistrationDate: '2024-04-01', hasMedicalInsurance: false, healthInsuranceCompanyId: org.companyId })).expect(201);
    const row = (await t.db.query('SELECT gosi_company_id, gosi_registration_date, gosi_system_id, health_insurance_company_id FROM employees WHERE id = $1', [res.body.employee.id]))[0];
    expect(Object.values(row)).toEqual([null, null, null, null]);
  });

  it('keeps work e-mail, employee number and ID document unique, also when two requests race', async () => {
    const { agent, payload, org, lookups, pick, sa } = await setup();
    const first = payload(org.unitA, { idTypeId: pick(lookups.idTypes, 'national_id'), nationalityId: sa, idNumber: '1087654321' });
    await agent.post('/api/employees').send(first).expect(201);
    expect((await agent.post('/api/employees').send({ ...payload(), workEmail: first.workEmail }).expect(409)).body.code).toBe('EMPLOYEE_EMAIL_TAKEN');
    expect((await agent.post('/api/employees').send({ ...payload(), employeeNumber: first.employeeNumber }).expect(409)).body.code).toBe('EMPLOYEE_NUMBER_TAKEN');
    expect((await agent.post('/api/employees').send(payload(org.unitA, { idTypeId: pick(lookups.idTypes, 'national_id'), nationalityId: sa, idNumber: '1087654321' })).expect(409)).body.code).toBe('ID_DOCUMENT_TAKEN');
    const racing = payload();
    const results = await Promise.all([1, 2, 3].map(() => agent.post('/api/employees').send(racing)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    const users = await t.db.query('SELECT count(*)::int AS n FROM users WHERE email = $1', [racing.workEmail]);
    expect(users[0].n).toBe(1);
  });

  it('refuses a placement that does not fit: a unit with no title for them, title of another unit (422)', async () => {
    const { agent, payload, org } = await setup();
    const code = async (overrides: Record<string, unknown>) => (await agent.post('/api/employees').send(payload(org.unitA, overrides)).expect(422)).body.code;
    expect(await code({ orgNodeId: org.sectionAB })).toBe('INVALID_PLACEMENT');
    expect(await code({ jobTitleId: org.unitB.titleId })).toBe('INVALID_PLACEMENT');
  });

  it('FR-96: an employee of any company may be placed in any unit of the group structure', async () => {
    const { agent, payload, org } = await setup();
    const created = await agent.post('/api/employees').send(payload(org.unitA, { companyId: org.otherCompanyId })).expect(201);
    const row = (await t.db.query('SELECT company_id, org_node_id FROM employees WHERE id = $1', [created.body.employee.id]))[0];
    expect(row).toEqual({ company_id: org.otherCompanyId, org_node_id: org.unitA.id });
  });

  it('refuses a manager that would create a reporting loop (422)', async () => {
    const { agent, payload, org } = await setup();
    const boss = (await agent.post('/api/employees').send(payload(org.unitA)).expect(201)).body.employee;
    const report = (await agent.post('/api/employees').send(payload(org.unitA, { managerId: boss.id })).expect(201)).body.employee;
    const update = (employee: { id: string }, managerId: string | null) => agent.put(`/api/employees/${boss.id === employee.id ? boss.id : report.id}`).send({ ...asUpdate(boss.id === employee.id ? boss : report), managerId });
    expect((await update(boss, boss.id)).status).toBe(422);
    const loop = await update(boss, report.id);
    expect(loop.status).toBe(422);
    expect(loop.body.details.path).toBe('managerId');
  });

  it('lists and shows employees only inside the scope of each permission, answering 404 outside it (FR-20)', async () => {
    const { org, agent, payload } = await setup();
    const ids: Record<string, string> = {};
    for (const [key, unit] of [['a', org.unitA], ['b', org.unitB], ['c', org.unitC], ['other', org.unitOther]] as const) {
      ids[key] = (await agent.post('/api/employees').send(payload(unit)).expect(201)).body.employee.id;
    }
    const sectionAB: TestUnit = { id: org.sectionAB, titleId: org.unitA.titleId, companyId: org.companyId };
    const as = async (scope: PermissionGrant['scope'], unit: TestUnit | undefined) => {
      const user = await t.factories.user({ unit, grants: [grant(P.EmployeesView, scope), grant(P.EmployeesUpdate, scope)] });
      const session = await t.factories.signIn(user);
      const list = (await session.get('/api/employees').query({ pageSize: 100 }).expect(200)).body.items.map((e: { id: string }) => e.id) as string[];
      return { session, list, user };
    };
    const own = await as('own', org.unitA);
    expect(own.list).toEqual([own.user.employeeId]);
    const unit = await as('unit', org.unitA);
    expect(unit.list).toContain(ids.a);
    expect([ids.b, ids.c, ids.other].some((id) => unit.list.includes(id as string))).toBe(false);
    const subtree = await as('subtree', sectionAB);
    expect(subtree.list).toEqual(expect.arrayContaining([ids.a, ids.b]));
    expect([ids.c, ids.other].some((id) => subtree.list.includes(id as string))).toBe(false);
    const company = await as('company', org.unitA);
    expect(company.list).toEqual(expect.arrayContaining([ids.a, ids.b, ids.c]));
    expect(company.list).not.toContain(ids.other);
    const everyone = await as('all', org.unitA);
    expect(everyone.list).toEqual(expect.arrayContaining([ids.a, ids.b, ids.c, ids.other]));
    // Outside the scope the record does not exist: 404 for reading and for changing.
    await unit.session.get(`/api/employees/${ids.b}`).expect(404);
    await unit.session.put(`/api/employees/${ids.b}`).send(payload(org.unitA)).expect(404);
    await subtree.session.get(`/api/employees/${ids.a}`).expect(200);
    await subtree.session.get(`/api/employees/${ids.c}`).expect(404);
    await company.session.get(`/api/employees/${ids.other}`).expect(404);
  });

  it('refuses to create or move someone into a unit outside the actor\'s scope (404)', async () => {
    const { org, payload } = await setup();
    const unitHr = await t.factories.user({ unit: org.unitA, grants: [grant(P.EmployeesView, 'unit'), grant(P.EmployeesCreate, 'unit'), grant(P.EmployeesUpdate, 'unit')] });
    const session = await t.factories.signIn(unitHr);
    await session.post('/api/employees').send(payload(org.unitB)).expect(404);
    const mine = await session.post('/api/employees').send(payload(org.unitA)).expect(201);
    await session.put(`/api/employees/${mine.body.employee.id}`).send({ ...asUpdate(mine.body.employee), orgNodeId: org.unitB.id, jobTitleId: org.unitB.titleId }).expect(404);
  });

  it('masks ID number, IBAN and salary without employees.view_sensitive and leaves them untouched on update', async () => {
    const { org, agent, payload, lookups, pick, sa } = await setup();
    const created = (await agent.post('/api/employees').send(payload(org.unitA, { idTypeId: pick(lookups.idTypes, 'national_id'), nationalityId: sa, idNumber: '1087654321', monthlyGrossSalary: 12000, salaryCurrencyCountryId: sa, iban: 'SA0380000000608010167519' })).expect(201)).body.employee;
    const viewer = await t.factories.user({ grants: [grant(P.EmployeesView, 'all'), grant(P.EmployeesUpdate, 'all')] });
    const session = await t.factories.signIn(viewer);
    const seen = (await session.get(`/api/employees/${created.id}`).expect(200)).body;
    expect(seen).toMatchObject({ idNumber: '••••4321', iban: '••••7519', monthlyGrossSalary: null, sensitiveHidden: true });
    expect(JSON.stringify(seen)).not.toMatch(/1087654321|SA0380000000608010167519|12000/);
    // The form of a viewer without the permission never carries the masked values; anything sent for them is ignored.
    const { idNumber: _id, iban: _iban, ...editable } = asUpdate(seen);
    void [_id, _iban];
    await session.put(`/api/employees/${created.id}`).send({ ...editable, fullName: 'Renamed', idNumber: '2999999999', iban: 'SA4420000001234567891234', monthlyGrossSalary: 1, salaryCurrencyCountryId: sa }).expect(200);
    const again = (await agent.get(`/api/employees/${created.id}`).expect(200)).body;
    expect(again).toMatchObject({ fullName: 'Renamed', idNumber: '1087654321', monthlyGrossSalary: 12000, iban: 'SA0380000000608010167519' });
  });

  it('returns 403 to each role without the permission', async () => {
    const { org, payload } = await setup();
    const none = await t.factories.signIn(await t.factories.user({ bare: true }));
    await none.get('/api/employees').expect(403);
    await none.post('/api/employees').send(payload(org.unitA)).expect(403);
    const viewer = await t.factories.signIn(await t.factories.user({ grants: [grant(P.EmployeesView, 'all')] }));
    await viewer.post('/api/employees').send(payload(org.unitA)).expect(403);
    await viewer.post(`/api/employees/${'0'.repeat(8)}-0000-4000-8000-000000000000/deactivate`).expect(403);
    await viewer.put(`/api/employees/${'0'.repeat(8)}-0000-4000-8000-000000000000/roles`).send({ roleIds: [] }).expect(403);
  });

  it('deactivates and reactivates an account (sessions end at once), and never lets someone deactivate themselves', async () => {
    const { org, agent, payload } = await setup();
    const created = (await agent.post('/api/employees').send(payload(org.unitA)).expect(201)).body.employee;
    const target = await t.factories.user({ unit: org.unitB, grants: [grant(P.EmployeesView, 'all')] });
    const session = await t.factories.signIn(target);
    await session.get('/api/employees').expect(200);
    const row = (await t.db.query('SELECT id FROM employees WHERE user_id = $1', [target.id]))[0];
    await agent.post(`/api/employees/${row.id}/deactivate`).expect(200);
    await session.get('/api/me').expect(401);
    await request(t.app.getHttpServer()).post('/api/auth/totp/sign-in').set('x-forwarded-for', '10.9.1.1').send({ email: target.email, code: codeFor(target.secret, Date.now() + 30_000) }).expect(401);
    await agent.post(`/api/employees/${row.id}/activate`).expect(200);
    await t.factories.freshStep(target);
    await t.factories.signIn(target);
    const self = await agent.get('/api/me').expect(200);
    const mine = (await t.db.query('SELECT id FROM employees WHERE user_id = $1', [self.body.id]))[0];
    expect((await agent.post(`/api/employees/${mine.id}/deactivate`).expect(422)).body.code).toBe('SELF_ACTION');
    expect(created.id).toBeTruthy();
  });

  it('lets a person change their own roles and groups only in platform admin mode (FR-69)', async () => {
    const org = await t.factories.org();
    const me = await t.factories.user({ unit: org.unitA, grants: [grant(P.AdminModeUse, 'all'), grant(P.EmployeesView, 'all'), grant(P.EmployeesAssignRoles, 'all'), grant(P.EmployeesAssignGroups, 'all'), grant(P.RolesView, 'all')] });
    const plain = await t.factories.signIn(me);
    // Outside the mode the administrative grants are off (FR-84), so giving roles is refused before the self check.
    expect((await plain.put(`/api/employees/${me.employeeId}/roles`).send({ roleIds: [] }).expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
    expect((await plain.put(`/api/employees/${me.employeeId}/groups`).send({ groupIds: [] }).expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
    await t.factories.freshStep(me);
    const admin = await t.factories.signInAdminMode(me);
    await admin.put(`/api/employees/${me.employeeId}/groups`).send({ groupIds: [] }).expect(200);
    await admin.put(`/api/employees/${me.employeeId}/roles`).send({ roleIds: [] }).expect(200);
  });

  it('lists the people with no unit or job title to place, and never asks for a new employee without them (FR-72)', async () => {
    const { org, agent, payload } = await setup();
    const unplaced = await t.factories.user();
    const placed = await t.factories.user({ unit: org.unitA });
    const ids = ((await agent.get('/api/employees').query({ needsPlacement: 'true', pageSize: 100 }).expect(200)).body.items as { id: string; needsPlacement: boolean }[]);
    expect(ids.map((e) => e.id)).toContain(unplaced.employeeId);
    expect(ids.map((e) => e.id)).not.toContain(placed.employeeId);
    expect(ids.every((e) => e.needsPlacement)).toBe(true);
    const withoutTitle = Object.fromEntries(Object.entries(payload(org.unitA)).filter(([key]) => key !== 'jobTitleId'));
    expect((await agent.post('/api/employees').send(withoutTitle).expect(400)).body.code).toBeDefined();
    expect((await agent.post('/api/employees').send({ ...payload(org.unitA), jobTitleId: null }).expect(400)).body.code).toBeDefined();
  });

  it('cuts sign-in the day after the end date (Riyadh), keeps it through the end date, and says so on the employee (FR-71)', async () => {
    const { org, agent, payload } = await setup();
    const day = (offset: number): string => new Date(Date.parse(`${todayInRiyadh()}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
    const ended = (await agent.post('/api/employees').send(payload(org.unitA)).expect(201)).body.employee;
    const lastDay = (await agent.post('/api/employees').send(payload(org.unitA)).expect(201)).body.employee;
    await t.db.query('UPDATE employees SET end_date = $2 WHERE id = $1', [ended.id, day(-1)]);
    await t.db.query('UPDATE employees SET end_date = $2 WHERE id = $1', [lastDay.id, day(0)]);
    const job = t.app.get(EmployeeLifecycleJob);
    expect(await job.deactivateEnded()).toBe(1);
    expect(await job.deactivateEnded()).toBe(0);
    expect((await agent.get(`/api/employees/${ended.id}`).expect(200)).body).toMatchObject({ isActive: false, accessEndedAt: expect.any(String) });
    expect((await agent.get(`/api/employees/${lastDay.id}`).expect(200)).body).toMatchObject({ isActive: true, accessEndedAt: null });
    expect(await job.deactivateEnded(day(1))).toBe(1);
  });

  it('ends sign-in at once when a contract is ended in the past, and an open session stops working (FR-71)', async () => {
    const { org, agent, lookups, pick } = await setup();
    const day = (offset: number): string => new Date(Date.parse(`${todayInRiyadh()}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
    const person = await t.factories.user({ unit: org.unitA });
    const session = await t.factories.signIn(person);
    await session.get('/api/me').expect(200);
    await agent.post(`/api/employees/${person.employeeId}/terminate`).send({ endDate: day(-1), terminationReasonId: pick(lookups.terminationReasons, 'resignation') }).expect(200);
    expect((await t.db.query('SELECT access_ended_at FROM employees WHERE id = $1', [person.employeeId]))[0].access_ended_at).not.toBeNull();
    await session.get('/api/me').expect(401);
  });

  it('gives sign-in back when the end date is removed or moved out, only to who may switch accounts on, and not while the date is still past (FR-71)', async () => {
    const { org, agent, payload } = await setup();
    const day = (offset: number): string => new Date(Date.parse(`${todayInRiyadh()}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
    const make = async () => {
      const e = (await agent.post('/api/employees').send(payload(org.unitA)).expect(201)).body.employee;
      await t.db.query('UPDATE employees SET end_date = $2 WHERE id = $1', [e.id, day(-3)]);
      await t.app.get(EmployeeLifecycleJob).deactivateEnded();
      return (await agent.get(`/api/employees/${e.id}`).expect(200)).body;
    };
    const active = async (id: string) => (await agent.get(`/api/employees/${id}`).expect(200)).body;
    const moved = await make();
    await agent.put(`/api/employees/${moved.id}`).send({ ...asUpdate(moved), endDate: day(30) }).expect(200);
    expect(await active(moved.id)).toMatchObject({ isActive: true, accessEndedAt: null, endDate: day(30) });
    const removed = await make();
    await agent.put(`/api/employees/${removed.id}`).send({ ...asUpdate(removed), endDate: null }).expect(200);
    expect(await active(removed.id)).toMatchObject({ isActive: true, accessEndedAt: null });
    const stillPast = await make();
    await agent.put(`/api/employees/${stillPast.id}`).send({ ...asUpdate(stillPast), endDate: day(-1) }).expect(200);
    expect(await active(stillPast.id)).toMatchObject({ isActive: false, accessEndedAt: expect.any(String) });
    const noSwitch = await t.factories.signIn(await t.factories.user({ grants: hr.filter((g) => g.key !== P.EmployeesDeactivate) }));
    const another = await make();
    await noSwitch.put(`/api/employees/${another.id}`).send({ ...asUpdate(another), endDate: day(30) }).expect(200);
    expect(await active(another.id)).toMatchObject({ isActive: false, endDate: day(30) });
  });

  it('ends a contract with a reason, and the account stops working after the end date (job is idempotent)', async () => {
    const { org, agent, payload, lookups, pick } = await setup();
    const created = (await agent.post('/api/employees').send(payload(org.unitA)).expect(201)).body.employee;
    const reason = pick(lookups.terminationReasons, 'resignation');
    await agent.post(`/api/employees/${created.id}/terminate`).send({ endDate: '2020-01-01', terminationReasonId: reason }).expect(422);
    const future = new Date(Date.now() + 86_400_000 * 40).toISOString().slice(0, 10);
    const done = await agent.post(`/api/employees/${created.id}/terminate`).send({ endDate: future, terminationReasonId: reason }).expect(200);
    expect(done.body).toMatchObject({ endDate: future, terminationReasonId: reason, isActive: true });
    const job = t.app.get(EmployeeLifecycleJob);
    expect(await job.deactivateEnded()).toBe(0);
    const afterEnd = new Date(Date.now() + 86_400_000 * 41).toISOString().slice(0, 10);
    expect(await job.deactivateEnded(afterEnd)).toBe(1);
    expect(await job.deactivateEnded(afterEnd)).toBe(0);
    expect((await t.db.query('SELECT is_active FROM users WHERE id = $1', [created.userId]))[0].is_active).toBe(false);
  });

  it('assigns roles only with the permission, never beyond the actor\'s own rights or to themselves', async () => {
    const { org, payload } = await setup();
    const agent = await t.factories.signIn(await t.factories.user({ grants: [...hr, grant(P.AuditView, 'all'), grant(P.RolesCreate, 'all')] }));
    const target = (await agent.post('/api/employees').send(payload(org.unitA)).expect(201)).body.employee;
    const small = await t.factories.role([grant(P.AuditView, 'all')]);
    const big = await t.factories.role([grant(P.RolesCreate, 'all')]);
    const assigned = await agent.put(`/api/employees/${target.id}/roles`).send({ roleIds: [small.id] }).expect(200);
    expect(assigned.body.roles.map((r: { id: string }) => r.id)).toEqual([small.id]);
    const limited = await t.factories.user({ unit: org.unitB, grants: [grant(P.EmployeesView, 'all'), grant(P.EmployeesAssignRoles, 'all'), grant(P.AuditView, 'all')] });
    const session = await t.factories.signIn(limited);
    await session.put(`/api/employees/${target.id}/roles`).send({ roleIds: [big.id] }).expect(403);
    await session.put(`/api/employees/${target.id}/roles`).send({ roleIds: [small.id] }).expect(200);
    await session.put(`/api/employees/${limited.employeeId}/roles`).send({ roleIds: [small.id] }).expect(422);
    await session.put(`/api/employees/${target.id}/roles`).send({ roleIds: ['00000000-0000-4000-8000-000000000000'] }).expect(404);
    await agent.post('/api/employees').send(payload(org.unitA, { roleIds: [big.id] })).expect(201);
    const noAssign = await t.factories.signIn(await t.factories.user({ unit: org.unitB, grants: [grant(P.EmployeesView, 'all'), grant(P.EmployeesCreate, 'all')] }));
    await noAssign.post('/api/employees').send(payload(org.unitA, { roleIds: [small.id] })).expect(403);
  });

  it('re-sends the invitation and resets a lost authenticator (sessions end, a new link is mailed)', async () => {
    const { org, agent, payload } = await setup();
    const created = (await agent.post('/api/employees').send(payload(org.unitA)).expect(201)).body.employee;
    const before = t.mail.sent.length;
    await agent.post(`/api/employees/${created.id}/resend-invite`).expect(200);
    expect(t.mail.sent.length).toBe(before + 1);
    const member = await t.factories.user({ unit: org.unitB });
    const session = await t.factories.signIn(member);
    const row = (await t.db.query('SELECT id FROM employees WHERE user_id = $1', [member.id]))[0];
    const reset = await agent.post(`/api/employees/${row.id}/reset-authenticator`).expect(200);
    expect(reset.body.sent).toBe(true);
    await session.get('/api/me').expect(401);
    expect((await t.db.query('SELECT count(*)::int AS n FROM authenticators WHERE user_id = $1', [member.id]))[0].n).toBe(0);
    const me = await agent.get('/api/me').expect(200);
    const own = (await t.db.query('SELECT id FROM employees WHERE user_id = $1', [me.body.id]))[0];
    await agent.post(`/api/employees/${own.id}/reset-authenticator`).expect(422);
  });

  it('searches literally, filters by company, unit and status, and pages the list', async () => {
    const { org, agent, payload } = await setup();
    await agent.post('/api/employees').send(payload(org.unitA, { fullName: 'Ahmed 100%_done' })).expect(201);
    await agent.post('/api/employees').send(payload(org.unitB, { fullName: 'Ahmed Ali' })).expect(201);
    const search = async (query: Record<string, unknown>) => (await agent.get('/api/employees').query(query).expect(200)).body;
    expect((await search({ search: '100%_' })).items).toHaveLength(1);
    expect((await search({ search: '%' })).items).toHaveLength(1);
    expect((await search({ search: 'ahmed', orgNodeId: org.unitB.id })).items.map((e: { fullName: string }) => e.fullName)).toEqual(['Ahmed Ali']);
    expect((await search({ companyId: org.otherCompanyId })).total).toBe(0);
    const page = await search({ search: 'ahmed', pageSize: 1, page: 2 });
    expect(page).toMatchObject({ total: 2, page: 2, pageSize: 1 });
    expect(page.items).toHaveLength(1);
    await t.db.query('UPDATE employees SET job_title_id = NULL WHERE full_name = $1', ['Ahmed Ali']);
    const needs = await search({ status: 'needs-placement' });
    const names = needs.items.map((e: { fullName: string }) => e.fullName);
    expect(names).toContain('Ahmed Ali');
    expect(names).not.toContain('Ahmed 100%_done');
    await agent.get('/api/employees').query({ pageSize: 1000 }).expect(400);
    await agent.get('/api/employees').query({ status: 'bogus' }).expect(400);
  });

  it('filters the list by every attribute: title, contract, nationality, gender, work mode, statuses, start dates and the attention flags', async () => {
    const { agent, lookups, pick, sa, payload, org } = await setup();
    const soon = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const a = (await agent.post('/api/employees').send(payload(org.unitA, {
      gender: 1, workMode: 2, nationalityId: sa, maritalStatusId: pick(lookups.maritalStatuses, 'married'), startDate: '2024-03-01', endDate: soon,
      contractTypeId: pick(lookups.contractTypes, 'fixed_term'), residencyStatusId: pick(lookups.residencyStatuses, 'citizen'),
    })).expect(201)).body.employee;
    const b = (await agent.post('/api/employees').send(payload(org.unitA, { gender: 0, workMode: 0, startDate: '2025-06-01' })).expect(201)).body.employee;
    const ids = async (query: Record<string, unknown>) => (await agent.get('/api/employees').query({ pageSize: 100, ...query }).expect(200)).body.items.map((e: { id: string }) => e.id) as string[];
    // The signed-in HR employee also exists, so each filter is checked for who is in and who is out.
    const only = async (query: Record<string, unknown>, inside: string[], outside: string[]) => {
      const found = await ids(query);
      for (const id of inside) expect(found).toContain(id);
      for (const id of outside) expect(found).not.toContain(id);
    };
    await only({ gender: 1 }, [a.id], [b.id]);
    await only({ gender: 0 }, [b.id], [a.id]);
    await only({ workMode: 2 }, [a.id], [b.id]);
    await only({ nationalityId: sa }, [a.id], [b.id]);
    await only({ contractTypeId: pick(lookups.contractTypes, 'fixed_term') }, [a.id], [b.id]);
    await only({ maritalStatusId: pick(lookups.maritalStatuses, 'married') }, [a.id], [b.id]);
    await only({ residencyStatusId: pick(lookups.residencyStatuses, 'citizen') }, [a.id], [b.id]);
    await only({ jobTitleId: org.unitA.titleId }, [a.id, b.id], []);
    await only({ startFrom: '2025-01-01' }, [b.id], [a.id]);
    await only({ startTo: '2024-12-31' }, [a.id], [b.id]);
    await only({ contractEnding: true }, [a.id], [b.id]);
    await only({ idExpiring: true }, [], [a.id, b.id]);
    await only({ gender: 1, workMode: 0 }, [], [a.id, b.id]);
    await agent.get('/api/employees').query({ gender: 7 }).expect(400);
    await agent.get('/api/employees').query({ startFrom: 'tomorrow' }).expect(400);
  });

  it('counts employees for the dashboard inside each viewer\'s scope', async () => {
    const { org, agent, payload } = await setup();
    const future = new Date(Date.now() + 86_400_000 * 10).toISOString().slice(0, 10);
    await agent.post('/api/employees').send(payload(org.unitA, { endDate: future })).expect(201);
    await agent.post('/api/employees').send(payload(org.unitB)).expect(201);
    await agent.post('/api/employees').send(payload(org.unitOther)).expect(201);
    const summary = (await agent.get('/api/employees/summary').expect(200)).body;
    expect(summary).toMatchObject({ total: 4, active: 4, inactive: 0, contractEnding: 1, idExpiring: 0, needsPlacement: 1 });
    const unitViewer = await t.factories.signIn(await t.factories.user({ unit: org.unitA, grants: [grant(P.EmployeesView, 'unit')] }));
    expect((await unitViewer.get('/api/employees/summary').expect(200)).body.total).toBe(2);
    const plain = await t.factories.signIn(await t.factories.user({ bare: true }));
    await plain.get('/api/employees/summary').expect(403);
  });

  it('offers the direct-manager picker with names and numbers only', async () => {
    const { org, agent, payload } = await setup();
    await agent.post('/api/employees').send(payload(org.unitA, { fullName: 'Layla Hassan' })).expect(201);
    const res = await agent.get('/api/employees/managers').query({ search: 'layla' }).expect(200);
    expect(res.body).toHaveLength(1);
    expect(Object.keys(res.body[0]).sort()).toEqual(['employeeNumber', 'fullName', 'id']);
    const plain = await t.factories.signIn(await t.factories.user());
    await plain.get('/api/employees/managers').expect(403);
  });
});

/** The editable fields of an employee as the form would send them back. */
function asUpdate(e: Record<string, unknown> & { orgNode?: { id: string } | null; jobTitle?: { id: string } | null; company?: { id: string } }): Record<string, unknown> {
  const { id, userId, isActive, isSystemAccount, editableFields, authenticatorEnabled, accessEndedAt, company, orgNode, jobTitle, manager, roles, groups, names, sensitiveHidden, createdAt, updatedAt, ...rest } = e as Record<string, unknown>;
  void [id, userId, isActive, isSystemAccount, editableFields, authenticatorEnabled, accessEndedAt, roles, groups, names, sensitiveHidden, createdAt, updatedAt];
  const clean = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null));
  return { ...clean, companyId: (company as { id: string }).id, orgNodeId: (orgNode as { id: string }).id, jobTitleId: (jobTitle as { id: string }).id, managerId: (manager as { id: string } | null)?.id ?? null };
}

export type { TestAgent, TestOrg, TestUser };

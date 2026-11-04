import type { INestApplication } from '@nestjs/common';
import { ALL_EDITABLE_FIELDS, COMPANIES_ADMIN_PERMISSIONS, CorePermission, EMPLOYEE_DEFAULT_PERMISSIONS, ORG_ADMIN_PERMISSIONS, type PermissionGrant } from '@arweqah-platform/shared';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { UserAccessService } from '../../src/core/access/application/user-access.service';
import { AccessContext, NO_PLACEMENT } from '../../src/core/access/domain/access-context';
import { Role } from '../../src/core/access/domain/role.entity';
import { AuthenticatorService } from '../../src/core/auth/application/authenticator.service';
import { generateSecret } from '../../src/core/auth/domain/totp';
import { IdentityProvider } from '../../src/core/auth/application/identity-provider';
import { CompaniesService } from '../../src/modules/org/application/services/companies.service';
import { OrgLevelsService } from '../../src/modules/org/application/services/org-levels.service';
import { OrgNodesService } from '../../src/modules/org/application/services/org-nodes.service';
import { Employee } from '../../src/modules/employees/domain/entities/employee.entity';
import { codeFor } from '../helpers/totp';

/** Every unit made by the factories started long ago, so nothing depends on today's date. */
const UNIT_START = '2024-01-01';

export type TestAgent = ReturnType<typeof request.agent>;

export interface TestUser {
  id: string;
  email: string;
  /** Base32 secret of the user's authenticator app. */
  secret: string;
  employeeId: string;
}

export interface TestUnit {
  id: string;
  titleId: string;
  companyId: string;
}

/** A company with two sectors' worth of units: A and B share a section, C sits under another section. */
export interface TestOrg {
  companyId: string;
  otherCompanyId: string;
  unitA: TestUnit;
  unitB: TestUnit;
  unitC: TestUnit;
  /** A unit of the other company. */
  unitOther: TestUnit;
  /** Ids of the section above A and B, and of the whole chain above them (for subtree checks). */
  sectionAB: string;
  sectionC: string;
  /** The department above the sections (the one that can become a ticket desk), and the other company's. */
  department: string;
  otherDepartment: string;
}

let ipCounter = 1;
/** Each sign-in comes from its own address so the sign-in rate limit only applies where a test wants it. */
export const nextIp = (): string => `10.1.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

/** Builders for test data (never copy-pasted objects in specs). */
/** What an administrator of the organization and the roles is given (admin mode is entered with ADMIN_MODE_GRANT): companies, structure, and seeing the roles. */
export const ORG_AND_ROLES_ADMIN_GRANTS: PermissionGrant[] = [
  ...COMPANIES_ADMIN_PERMISSIONS.map((key) => ({ key, scope: 'all' as const })),
  ...ORG_ADMIN_PERMISSIONS.map((key) => ({ key, scope: 'all' as const })),
  { key: CorePermission.RolesView, scope: 'all' as const },
];

/** What a desk manager is given to set up the departments they manage and read their figures (admin mode is entered with ADMIN_MODE_GRANT). */
export const TICKET_DESK_ADMIN_GRANTS: PermissionGrant[] = [
  CorePermission.TicketsSetupView,
  CorePermission.TicketsSetupEdit,
  CorePermission.TicketsTypeCreate,
  CorePermission.TicketsTypeUpdate,
  CorePermission.TicketsTypeDelete,
  CorePermission.TicketsFiguresView,
].map((key) => ({ key, scope: 'own' as const }));

/** The same keys for every department (a platform manager). */
export const TICKET_PLATFORM_ADMIN_GRANTS: PermissionGrant[] = TICKET_DESK_ADMIN_GRANTS.map((g) => ({ key: g.key, scope: 'all' as const }));

/** Grant that lets a test user switch platform admin mode on. */
/** A test grant of «edit employees» that does not say which fields lets its holder change them all, so specs about other things need not list fields; the specs about the lists pass `fields` themselves. */
const editsEverything = (g: PermissionGrant): PermissionGrant => (g.key === CorePermission.EmployeesUpdate && !g.fields ? { ...g, fields: [...ALL_EDITABLE_FIELDS] } : g);

/** What `factories.user` takes: `without` lists key prefixes (such as `tasks.`) taken out of the Employee role's baseline, for tests about a person who lacks them. */
export interface UserOptions { grants?: PermissionGrant[]; unit?: TestUnit; enrolled?: boolean; active?: boolean; bare?: boolean; without?: string[] }

export const ADMIN_MODE_GRANT: PermissionGrant = { key: CorePermission.AdminModeUse, scope: 'all' };

export class Factories {
  private readonly db: DataSource;
  private readonly admin = new AccessContext('00000000-0000-4000-8000-000000000001', NO_PLACEMENT, ORG_ADMIN_PERMISSIONS.map((key) => ({ key, scope: 'all' as const })), true);

  constructor(private readonly app: INestApplication) {
    this.db = app.get(DataSource);
  }

  async role(grants: PermissionGrant[], options: { isSystem?: boolean } = {}): Promise<Role> {
    const role = Object.assign(new Role(), {
      id: randomUUID(),
      nameAr: `دور ${randomUUID().slice(0, 6)}`,
      nameEn: `Role ${randomUUID().slice(0, 6)}`,
      description: null,
      isSystem: options.isSystem ?? false,
      permissions: [],
    });
    role.replacePermissions(grants);
    return this.db.getRepository(Role).save(role);
  }

  async company(code = `T${randomUUID().slice(0, 5).toUpperCase()}`): Promise<string> {
    return (await this.app.get(CompaniesService).create({ code, nameAr: `شركة ${code}`, nameEn: `Company ${code}`, isActive: true }, null)).id;
  }

  /** The first company of the test, created on demand (the tables are emptied before every test). */
  async defaultCompany(): Promise<string> {
    const rows: { id: string }[] = await this.db.query('SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1');
    return rows[0]?.id ?? this.company('ARW');
  }

  async org(): Promise<TestOrg> {
    const companyId = await this.defaultCompany();
    const otherCompanyId = await this.company();
    const sector = await this.unit(companyId, 0, null, 'Sector');
    const department = await this.unit(companyId, 1, sector.id, 'Department');
    const sectionAB = await this.unit(companyId, 2, department.id, 'Section AB');
    const sectionC = await this.unit(companyId, 2, department.id, 'Section C');
    const [unitA, unitB, unitC] = [await this.leaf(companyId, sectionAB.id, 'Unit A'), await this.leaf(companyId, sectionAB.id, 'Unit B'), await this.leaf(companyId, sectionC.id, 'Unit C')];
    const otherSector = await this.unit(otherCompanyId, 0, null, 'Other sector');
    const otherDepartment = await this.unit(otherCompanyId, 1, otherSector.id, 'Other department');
    const otherSection = await this.unit(otherCompanyId, 2, otherDepartment.id, 'Other section');
    const unitOther = await this.leaf(otherCompanyId, otherSection.id, 'Other unit');
    return { companyId, otherCompanyId, unitA, unitB, unitC, unitOther, sectionAB: sectionAB.id, sectionC: sectionC.id, department: department.id, otherDepartment: otherDepartment.id };
  }

  private async unit(companyId: string, levelIndex: number, parentId: string | null, name: string): Promise<{ id: string }> {
    const levels = await this.app.get(OrgLevelsService).list(companyId);
    const node = await this.app.get(OrgNodesService).createNode(this.admin, { levelId: levels[levelIndex]?.id as string, parentId, nameAr: name, nameEn: name, startDate: UNIT_START, jobTitles: [] }, this.admin.userId);
    return { id: node.id };
  }

  private async leaf(companyId: string, parentId: string, name: string): Promise<TestUnit> {
    const levels = await this.app.get(OrgLevelsService).list(companyId);
    const node = await this.app.get(OrgNodesService).createNode(
      this.admin,
      { levelId: levels[3]?.id as string, parentId, nameAr: name, nameEn: name, startDate: UNIT_START, jobTitles: [{ nameAr: `مسمى ${name}`, nameEn: `Title ${name}` }] },
      this.admin.userId,
    );
    return { id: node.id, titleId: node.jobTitles[0]?.id as string, companyId };
  }

  /** A person with a sign-in account, an enrolled authenticator app and an employee record placed in `unit`. */
  async user(options: UserOptions = {}): Promise<TestUser> {
    const email = `user-${randomUUID().slice(0, 8)}@arweqah.sa`;
    const id = await this.app.get(IdentityProvider).createUser({ name: `User ${email}`, email, locale: 'ar' });
    const secret = generateSecret();
    await this.prepareAccount(id, { secret, ...options });
    const employee = await this.employeeFor(id, email, options.unit);
    return { id, email, secret, employeeId: employee.id };
  }

  private async prepareAccount(id: string, options: UserOptions & { secret: string }): Promise<void> {
    if (options.enrolled !== false) await this.app.get(AuthenticatorService).enableWithSecret(id, options.secret);
    if (options.active === false) await this.db.query('UPDATE users SET is_active = false WHERE id = $1', [id]);
    // Like the real Employee role, everyone starts with the own-account and ticket keys; `grants` add to them; `bare` gives a person with no role at all.
    if (options.bare) return;
    const defaults = EMPLOYEE_DEFAULT_PERMISSIONS.filter((p) => !options.without?.some((prefix) => p.key.startsWith(prefix)));
    await this.app.get(UserAccessService).replaceRoles(id, [(await this.role([...defaults, ...(options.grants ?? []).map(editsEverything)])).id]);
  }

  private async employeeFor(userId: string, email: string, unit?: TestUnit): Promise<Employee> {
    return this.db.getRepository(Employee).save(
      Object.assign(new Employee(), {
        userId,
        companyId: unit?.companyId ?? (await this.defaultCompany()),
        orgNodeId: unit?.id ?? null,
        jobTitleId: unit?.titleId ?? null,
        employeeNumber: `E-${randomUUID().slice(0, 8)}`,
        fullName: `User ${email}`,
        workEmail: email,
        startDate: '2024-01-01',
      }),
    );
  }

  /** Signs in through the real endpoint (e-mail + code of the authenticator app) and returns an agent with the session cookie. */
  async signIn(user: TestUser): Promise<TestAgent> {
    const agent = request.agent(this.app.getHttpServer());
    await this.freshStep(user);
    await agent.post('/api/auth/totp/sign-in').set('x-forwarded-for', nextIp()).send({ email: user.email, code: codeFor(user.secret) }).expect(200);
    return agent;
  }

  /** Signs in and switches platform admin mode on (the person needs the `admin_mode.use` grant); it uses the next 30-second code. */
  async signInAdminMode(user: TestUser): Promise<TestAgent> {
    const agent = await this.signIn(user);
    await agent.post('/api/admin-mode/activate').send({ code: codeFor(user.secret, Date.now() + 30_000) }).expect(200);
    return agent;
  }

  /** A code is accepted once per 30 s step; tests that sign the same person in again reset that memory first. */
  async freshStep(user: TestUser): Promise<void> {
    await this.db.query('UPDATE authenticators SET last_used_step = NULL, failed_count = 0, locked_until = NULL WHERE user_id = $1', [user.id]);
  }

  /** Makes the agent's session look like one created by Microsoft sign-in: the code was not entered yet. */
  async forgetCode(user: TestUser): Promise<void> {
    await this.db.query('UPDATE auth_sessions SET mfa_verified_at = NULL WHERE user_id = $1', [user.id]);
  }
}

import type { INestApplication } from '@nestjs/common';
import { CorePermission, type PermissionGrant } from '@arweqah-platform/shared';
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
}

let ipCounter = 1;
/** Each sign-in comes from its own address so the sign-in rate limit only applies where a test wants it. */
export const nextIp = (): string => `10.1.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

/** Builders for test data (never copy-pasted objects in specs). */
export class Factories {
  private readonly db: DataSource;
  private readonly admin = new AccessContext('00000000-0000-4000-8000-000000000001', NO_PLACEMENT, [{ key: CorePermission.OrgManage, scope: 'all' }], true);

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
    return { companyId, otherCompanyId, unitA, unitB, unitC, unitOther, sectionAB: sectionAB.id, sectionC: sectionC.id };
  }

  private async unit(companyId: string, levelIndex: number, parentId: string | null, name: string): Promise<{ id: string }> {
    const levels = await this.app.get(OrgLevelsService).list(companyId);
    const node = await this.app.get(OrgNodesService).createNode(this.admin, { levelId: levels[levelIndex]?.id as string, parentId, nameAr: name, nameEn: name, jobTitles: [] }, this.admin.userId);
    return { id: node.id };
  }

  private async leaf(companyId: string, parentId: string, name: string): Promise<TestUnit> {
    const levels = await this.app.get(OrgLevelsService).list(companyId);
    const node = await this.app.get(OrgNodesService).createNode(
      this.admin,
      { levelId: levels[3]?.id as string, parentId, nameAr: name, nameEn: name, jobTitles: [{ nameAr: `مسمى ${name}`, nameEn: `Title ${name}` }] },
      this.admin.userId,
    );
    return { id: node.id, titleId: node.jobTitles[0]?.id as string, companyId };
  }

  /** A person with a sign-in account, an enrolled authenticator app and an employee record placed in `unit`. */
  async user(options: { grants?: PermissionGrant[]; unit?: TestUnit; enrolled?: boolean; active?: boolean } = {}): Promise<TestUser> {
    const email = `user-${randomUUID().slice(0, 8)}@arweqah.sa`;
    const id = await this.app.get(IdentityProvider).createUser({ name: `User ${email}`, email, locale: 'ar' });
    const secret = generateSecret();
    await this.prepareAccount(id, { secret, ...options });
    const employee = await this.employeeFor(id, email, options.unit);
    return { id, email, secret, employeeId: employee.id };
  }

  private async prepareAccount(id: string, options: { secret: string; grants?: PermissionGrant[]; enrolled?: boolean; active?: boolean }): Promise<void> {
    if (options.enrolled !== false) await this.app.get(AuthenticatorService).enableWithSecret(id, options.secret);
    if (options.active === false) await this.db.query('UPDATE users SET is_active = false WHERE id = $1', [id]);
    if (options.grants) await this.app.get(UserAccessService).replaceRoles(id, [(await this.role(options.grants)).id]);
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

  /** A code is accepted once per 30 s step; tests that sign the same person in again reset that memory first. */
  async freshStep(user: TestUser): Promise<void> {
    await this.db.query('UPDATE authenticators SET last_used_step = NULL, failed_count = 0, locked_until = NULL WHERE user_id = $1', [user.id]);
  }

  /** Makes the agent's session look like one created by Microsoft sign-in: the code was not entered yet. */
  async forgetCode(user: TestUser): Promise<void> {
    await this.db.query('UPDATE auth_sessions SET mfa_verified_at = NULL WHERE user_id = $1', [user.id]);
  }
}

import type { INestApplication } from '@nestjs/common';
import type { PermissionGrant } from '@arweqah-platform/shared';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { UserAccessService } from '../../src/core/access/application/user-access.service';
import type { Placement } from '../../src/core/access/domain/access-context';
import { Role } from '../../src/core/access/domain/role.entity';
import { IdentityProvider } from '../../src/core/auth/application/identity-provider';
import { Branch, Department, Team } from '../../src/modules/org/domain/org.entities';

export type TestAgent = ReturnType<typeof request.agent>;

export const TEST_PASSWORD = 'Test-Passw0rd-123';

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export interface TestOrg {
  branch: Branch;
  otherBranch: Branch;
  department: Department;
  otherDepartment: Department;
  team: Team;
}

let ipCounter = 1;
/** Each sign-in comes from its own address so the sign-in rate limit only applies where a test wants it. */
export const nextIp = (): string => `10.1.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

/** Builders for test data (never copy-pasted objects in specs). */
export class Factories {
  private readonly db: DataSource;

  constructor(private readonly app: INestApplication) {
    this.db = app.get(DataSource);
  }

  async role(grants: PermissionGrant[], options: { requiresTwoFactor?: boolean; isSystem?: boolean } = {}): Promise<Role> {
    const role = Object.assign(new Role(), {
      id: randomUUID(),
      nameAr: `دور ${randomUUID().slice(0, 6)}`,
      nameEn: `Role ${randomUUID().slice(0, 6)}`,
      description: null,
      isSystem: options.isSystem ?? false,
      requiresTwoFactor: options.requiresTwoFactor ?? false,
      permissions: [],
    });
    role.replacePermissions(grants);
    return this.db.getRepository(Role).save(role);
  }

  async org(): Promise<TestOrg> {
    const branches = this.db.getRepository(Branch);
    const branch = await branches.save(Object.assign(new Branch(), { code: 'HQ', nameAr: 'المقر', nameEn: 'HQ', city: null }));
    const otherBranch = await branches.save(Object.assign(new Branch(), { code: 'JED', nameAr: 'جدة', nameEn: 'Jeddah', city: null }));
    const departments = this.db.getRepository(Department);
    const department = await departments.save(this.department('Engineering', branch.id));
    const otherDepartment = await departments.save(this.department('Finance', branch.id));
    const team = await this.db.getRepository(Team).save(
      Object.assign(new Team(), { nameAr: 'فريق المنصة', nameEn: 'Platform', departmentId: department.id, leadUserId: null }),
    );
    return { branch, otherBranch, department, otherDepartment, team };
  }

  async user(options: { grants?: PermissionGrant[]; placement?: Partial<Placement>; requiresTwoFactor?: boolean } = {}): Promise<TestUser> {
    const email = `user-${randomUUID().slice(0, 8)}@test.local`;
    const id = await this.app.get(IdentityProvider).createUser({ name: `User ${email}`, email, locale: 'ar', password: TEST_PASSWORD });
    const access = this.app.get(UserAccessService);
    await access.savePlacement(id, { branchId: null, departmentId: null, teamId: null, managerId: null, ...options.placement });
    if (options.grants) {
      const role = await this.role(options.grants, { requiresTwoFactor: options.requiresTwoFactor });
      await access.replaceRoles(id, [role.id]);
    }
    return { id, email, password: TEST_PASSWORD };
  }

  /** Signs in through the real Better Auth endpoint and returns an agent carrying the session cookie. */
  async signIn(user: TestUser): Promise<TestAgent> {
    const agent = request.agent(this.app.getHttpServer());
    await agent
      .post('/api/auth/sign-in/email')
      .set('x-forwarded-for', nextIp())
      .send({ email: user.email, password: user.password })
      .expect(200);
    return agent;
  }

  private department(nameEn: string, branchId: string): Department {
    return Object.assign(new Department(), { nameAr: nameEn, nameEn, branchId, parentId: null, headUserId: null });
  }
}

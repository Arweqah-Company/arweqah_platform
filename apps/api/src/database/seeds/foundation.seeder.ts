import { EMPLOYEE_DEFAULT_PERMISSIONS } from '@arweqah-platform/shared';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppConfig } from '../../config/app-config.service';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { AutoRolesService } from '../../core/access/application/auto-roles.service';
import { Role } from '../../core/access/domain/role.entity';
import { UserRole } from '../../core/access/domain/user-role.entity';
import { AuthenticatorService } from '../../core/auth/application/authenticator.service';
import { IdentityProvider } from '../../core/auth/application/identity-provider';
import { User } from '../../core/auth/domain/user.entity';
import { Employee } from '../../modules/employees/domain/entities/employee.entity';
import { CompaniesSeeder } from './companies.seeder';
import { DEFAULT_COMPANY_CODE } from './data/lookups.data';
import { LookupsSeeder } from './lookups.seeder';
import { EMPLOYEE_ROLE_SEED } from './data/roles.data';
import { RolesCatalogSeeder } from './roles-catalog.seeder';
import { OrgStructureSeeder } from './org-structure.seeder';
import { TicketsDemoSeeder } from './tickets-demo.seeder';

export const SYSTEM_ADMIN_ROLE = 'System Admin';
export const EMPLOYEE_ROLE = 'Employee';
const SYSTEM_EMPLOYEE_NUMBER = 'SYS-0001';

/** Idempotent: safe to run on every deploy. */
@Injectable()
export class FoundationSeeder {
  private readonly logger = new Logger('Seed');

  constructor(
    private readonly db: DataSource,
    private readonly catalog: PermissionCatalog,
    private readonly identity: IdentityProvider,
    private readonly authenticator: AuthenticatorService,
    private readonly config: AppConfig,
    private readonly lookups: LookupsSeeder,
    private readonly companies: CompaniesSeeder,
    private readonly demo: OrgStructureSeeder,
    private readonly ticketsDemo: TicketsDemoSeeder,
    private readonly rolesCatalog: RolesCatalogSeeder,
    private readonly autoRoles: AutoRolesService,
  ) {}

  async run(): Promise<void> {
    const admin = await this.upsertRole(SYSTEM_ADMIN_ROLE, 'مدير النظام', true);
    await this.upsertRole(EMPLOYEE_ROLE, 'موظف', false);
    await this.rolesCatalog.run();
    await this.lookups.run();
    await this.companies.run();
    await this.demo.run();
    await this.firstAdmin(admin);
    await this.ticketsDemo.run(await this.adminUserId());
    await this.autoRoles.sync();
  }

  private async adminUserId(): Promise<string | null> {
    const email = this.config.get('SEED_ADMIN_EMAIL')?.toLowerCase();
    const found = email ? await this.db.getRepository(User).findOne({ where: { email } }) : null;
    return found?.id ?? null;
  }

  /** System Admin always holds every permission in the catalog at the widest scope; Employee starts with the defaults. */
  private async upsertRole(nameEn: string, nameAr: string, isAdmin: boolean): Promise<Role> {
    const repo = this.db.getRepository(Role);
    const role = (await repo.findOne({ where: { nameEn, isSystem: true } })) ??
      Object.assign(new Role(), { nameEn, nameAr, description: null, isSystem: true, permissions: [] });
    if (!isAdmin) Object.assign(role, { assignment: EMPLOYEE_ROLE_SEED.assignment, autoRule: EMPLOYEE_ROLE_SEED.autoRule, description: role.description ?? EMPLOYEE_ROLE_SEED.note });
    const saved = await repo.save(role);
    // The Employee role starts with the own-account and ticket keys, only while it has none (later changes are the administrator's).
    const grants = isAdmin ? this.catalog.all().map((p) => ({ key: p.key, scope: 'all' as const })) : saved.permissions.length === 0 ? EMPLOYEE_DEFAULT_PERMISSIONS : null;
    if (grants) {
      saved.replacePermissions(grants);
      await this.db.transaction(async (m) => {
        await m.delete('role_permissions', { roleId: saved.id });
        await m.save(Role, saved);
      });
    }
    return saved;
  }

  /**
   * The startup administrator: a company employee with no password. They sign in with Microsoft
   * (the account is linked by e-mail on first sign-in) and enroll an authenticator app.
   */
  private async firstAdmin(role: Role): Promise<void> {
    const email = this.config.get('SEED_ADMIN_EMAIL')?.toLowerCase();
    if (!email) {
      this.logger.warn('SEED_ADMIN_EMAIL not set: skipping first admin');
      return;
    }
    const existing = await this.db.getRepository(User).findOne({ where: { email } });
    if (existing) return this.linkDevelopmentApp(existing.id);
    const company = await this.db.query<{ id: string }[]>(`SELECT id FROM companies WHERE code = $1 AND deleted_at IS NULL`, [DEFAULT_COMPANY_CODE]);
    const name = this.config.get('SEED_ADMIN_NAME');
    const userId = await this.identity.createUser({ name, email, locale: 'ar' });
    await this.db.getRepository(UserRole).insert({ userId, roleId: role.id });
    await this.db.getRepository(Employee).insert({
      userId,
      companyId: company[0]?.id as string,
      employeeNumber: SYSTEM_EMPLOYEE_NUMBER,
      fullName: name,
      workEmail: email,
      startDate: new Date().toISOString().slice(0, 10),
      isSystemAccount: true,
    });
    this.logger.log(`First admin created: ${email} (signs in with Microsoft, then links an authenticator app)`);
    await this.linkDevelopmentApp(userId);
  }

  /** Local development only: with SEED_ADMIN_TOTP_SECRET the admin can sign in by e-mail and code right away. */
  private async linkDevelopmentApp(userId: string): Promise<void> {
    const secret = this.config.get('SEED_ADMIN_TOTP_SECRET');
    if (!secret || (await this.authenticator.isEnabled(userId))) return;
    await this.authenticator.enableWithSecret(userId, secret);
    this.logger.warn('Authenticator app linked to the first admin from SEED_ADMIN_TOTP_SECRET (development only)');
  }
}

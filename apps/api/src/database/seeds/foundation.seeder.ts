import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppConfig } from '../../config/app-config.service';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { Role } from '../../core/access/domain/role.entity';
import { UserPlacement } from '../../core/access/domain/user-placement.entity';
import { UserRole } from '../../core/access/domain/user-role.entity';
import { IdentityProvider } from '../../core/auth/application/identity-provider';
import { Branch } from '../../modules/org/domain/org.entities';
import { User } from '../../modules/users/domain/user.entity';

export const SYSTEM_ADMIN_ROLE = 'System Admin';
export const EMPLOYEE_ROLE = 'Employee';

/** Idempotent: safe to run on every deploy. */
@Injectable()
export class FoundationSeeder {
  private readonly logger = new Logger('Seed');

  constructor(
    private readonly db: DataSource,
    private readonly catalog: PermissionCatalog,
    private readonly identity: IdentityProvider,
    private readonly config: AppConfig,
  ) {}

  async run(): Promise<void> {
    const admin = await this.upsertRole(SYSTEM_ADMIN_ROLE, 'مدير النظام', true);
    await this.upsertRole(EMPLOYEE_ROLE, 'موظف', false);
    const hq = await this.headOffice();
    await this.firstAdmin(admin, hq);
  }

  /** System Admin always holds every permission in the catalog at company scope. */
  private async upsertRole(nameEn: string, nameAr: string, isAdmin: boolean): Promise<Role> {
    const repo = this.db.getRepository(Role);
    const role = (await repo.findOne({ where: { nameEn, isSystem: true } })) ??
      Object.assign(new Role(), { nameEn, nameAr, description: null, isSystem: true, permissions: [] });
    role.requiresTwoFactor = isAdmin;
    const saved = await repo.save(role);
    if (isAdmin) {
      saved.replacePermissions(this.catalog.all().map((p) => ({ key: p.key, scope: 'company' as const })));
      await this.db.transaction(async (m) => {
        await m.delete('role_permissions', { roleId: saved.id });
        await m.save(Role, saved);
      });
    }
    return saved;
  }

  private async headOffice(): Promise<Branch> {
    const repo = this.db.getRepository(Branch);
    return (await repo.findOne({ where: { code: 'HQ' } })) ??
      repo.save(Object.assign(new Branch(), { code: 'HQ', nameAr: 'المقر الرئيسي', nameEn: 'Head Office', city: null }));
  }

  private async firstAdmin(role: Role, hq: Branch): Promise<void> {
    const email = this.config.get('SEED_ADMIN_EMAIL');
    const password = this.config.get('SEED_ADMIN_PASSWORD');
    if (!email || !password) {
      this.logger.warn('SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set: skipping first admin');
      return;
    }
    if (await this.db.getRepository(User).exists({ where: { email: email.toLowerCase() } })) return;
    const id = await this.identity.createUser({ name: this.config.get('SEED_ADMIN_NAME'), email: email.toLowerCase(), locale: 'ar', password });
    await this.db.getRepository(UserRole).insert({ userId: id, roleId: role.id });
    await this.db.getRepository(UserPlacement).insert({ userId: id, branchId: hq.id, departmentId: null, teamId: null, managerId: null });
    this.logger.log(`First admin created: ${email} (must enable two-factor authentication on first sign-in)`);
  }
}

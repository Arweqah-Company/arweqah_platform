import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { PermissionGrant, PermissionScope, RoleOriginDto } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../common/application/transaction-runner';
import { managerOf } from '../../../common/infrastructure/typeorm-transaction-runner';
import { Role } from '../domain/role.entity';
import { RoleRepository, type JobTitleRoleSeed } from '../domain/access.repository';
import { UserRole } from '../domain/user-role.entity';

@Injectable()
export class TypeOrmRoleRepository extends RoleRepository {
  constructor(
    @InjectRepository(Role) private readonly repo: Repository<Role>,
    @InjectRepository(UserRole) private readonly userRoles: Repository<UserRole>,
  ) {
    super();
  }

  async findAll(): Promise<(Role & { usersCount: number; origin: RoleOriginDto | null })[]> {
    const roles = await this.repo.find({ order: { isSystem: 'DESC', nameEn: 'ASC' } });
    const counts = await this.userRoles
      .createQueryBuilder('ur')
      .select('ur.role_id', 'roleId')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('ur.role_id')
      .getRawMany<{ roleId: string; count: number }>();
    const byRole = new Map(counts.map((c) => [c.roleId, c.count]));
    const origins = await this.originsOfJobTitleRoles();
    return roles.map((r) => Object.assign(r, { usersCount: byRole.get(r.id) ?? 0, origin: origins.get(r.id) ?? null }));
  }

  private async originsOfJobTitleRoles(): Promise<Map<string, RoleOriginDto>> {
    const rows: { roleId: string; companyId: string; companyAr: string | null; companyEn: string | null; unitAr: string | null; unitEn: string | null }[] = await this.repo.manager.query(
      `SELECT r.id AS "roleId", n.company_id AS "companyId", cta.name AS "companyAr", cte.name AS "companyEn", nta.name AS "unitAr", nte.name AS "unitEn"
       FROM roles r JOIN job_titles t ON t.id = r.job_title_id JOIN org_nodes n ON n.id = t.org_node_id
       LEFT JOIN company_translations cta ON cta.company_id = n.company_id AND cta.lang = 'ar' LEFT JOIN company_translations cte ON cte.company_id = n.company_id AND cte.lang = 'en'
       LEFT JOIN org_node_translations nta ON nta.org_node_id = n.id AND nta.lang = 'ar' LEFT JOIN org_node_translations nte ON nte.org_node_id = n.id AND nte.lang = 'en'
       WHERE r.auto_rule = 'job_title'`,
    );
    const levelRows: { roleId: string; companyId: string; companyAr: string | null; companyEn: string | null }[] = await this.repo.manager.query(
      `SELECT r.id AS "roleId", l.company_id AS "companyId", cta.name AS "companyAr", cte.name AS "companyEn"
       FROM roles r JOIN org_levels l ON l.id = r.org_level_id
       LEFT JOIN company_translations cta ON cta.company_id = l.company_id AND cta.lang = 'ar' LEFT JOIN company_translations cte ON cte.company_id = l.company_id AND cte.lang = 'en'
       WHERE r.auto_rule = 'node_head'`,
    );
    const heads = levelRows.map((x): [string, RoleOriginDto] => [x.roleId, { companyId: x.companyId, companyNameAr: x.companyAr ?? x.companyEn ?? '', companyNameEn: x.companyEn ?? x.companyAr ?? '', unitNameAr: '', unitNameEn: '' }]);
    return new Map([...heads, ...rows.map((x) => [x.roleId, { companyId: x.companyId, companyNameAr: x.companyAr ?? x.companyEn ?? '', companyNameEn: x.companyEn ?? x.companyAr ?? '', unitNameAr: x.unitAr ?? x.unitEn ?? '', unitNameEn: x.unitEn ?? x.unitAr ?? '' }] as [string, RoleOriginDto])]);
  }

  findById(id: string): Promise<Role | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIds(ids: string[]): Promise<Role[]> {
    return ids.length ? this.repo.find({ where: { id: In(ids) } }) : Promise.resolve([]);
  }

  save(role: Role): Promise<Role> {
    return this.repo.manager.transaction(async (m) => {
      // Replace the grant set atomically: cascade inserts new rows, stale ones are removed here.
      if (role.id) await m.delete('role_permissions', { roleId: role.id });
      return m.save(Role, role);
    });
  }

  async remove(role: Role): Promise<void> {
    await this.repo.remove(role);
  }

  async defaultTemplatePermissions(): Promise<PermissionGrant[]> {
    const rows: { key: string; scope: PermissionScope }[] = await this.repo.manager.query(
      `SELECT p.permission_key AS key, p.scope AS scope FROM role_permissions p JOIN roles r ON r.id = p.role_id WHERE r.auto_rule = 'everyone'`,
    );
    return rows;
  }

  async insertJobTitleRoles(seeds: JobTitleRoleSeed[], tx: TransactionContext): Promise<void> {
    const m = managerOf(tx, this.repo.manager);
    for (const seed of seeds) {
      const created = (await m.query(
        `INSERT INTO roles (name_ar, name_en, is_system, assignment, auto_rule, job_title_id) VALUES ($1, $2, false, 'auto', 'job_title', $3) RETURNING id`,
        [seed.nameAr, seed.nameEn, seed.jobTitleId],
      )) as { id: string }[];
      const id = created[0]?.id as string;
      for (const grant of seed.permissions) await m.query('INSERT INTO role_permissions (role_id, permission_key, scope) VALUES ($1, $2, $3)', [id, grant.key, grant.scope]);
    }
  }

  async renameJobTitleRole(jobTitleId: string, names: { nameAr: string; nameEn: string }, tx: TransactionContext): Promise<void> {
    await managerOf(tx, this.repo.manager).query(`UPDATE roles SET name_ar = $2, name_en = $3, updated_at = now() WHERE job_title_id = $1`, [jobTitleId, names.nameAr, names.nameEn]);
  }

  async removeJobTitleRoles(jobTitleIds: string[], tx: TransactionContext): Promise<void> {
    if (jobTitleIds.length) await managerOf(tx, this.repo.manager).query('DELETE FROM roles WHERE job_title_id = ANY($1)', [jobTitleIds]);
  }
}

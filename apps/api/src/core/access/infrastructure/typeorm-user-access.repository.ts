import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LEVEL_HEAD_DEFAULT_PERMISSIONS, type PermissionGrant, type PermissionScope } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../common/application/transaction-runner';
import { returnedRows } from '../../../common/infrastructure/query-result';
import { managerOf } from '../../../common/infrastructure/typeorm-transaction-runner';
import { NO_PLACEMENT, reachFrom, type Placement, type UnitReach } from '../domain/access-context';
import { UserAccessRepository, type UserAccessRecord } from '../domain/access.repository';
import { Role } from '../domain/role.entity';
import { UserPermission } from '../domain/user-permission.entity';
import { UserRoleGroup } from '../domain/user-role-group.entity';
import { UserRole } from '../domain/user-role.entity';

const GRANTS_OF_USER = `
  SELECT rp.permission_key AS key, rp.scope AS scope FROM role_permissions rp
  WHERE rp.role_id IN (
    SELECT role_id FROM user_roles WHERE user_id = $1
    UNION SELECT gr.role_id FROM user_role_groups ug JOIN role_group_roles gr ON gr.group_id = ug.group_id WHERE ug.user_id = $1)
  UNION ALL SELECT gp.permission_key, gp.scope FROM role_group_permissions gp JOIN user_role_groups ug ON ug.group_id = gp.group_id WHERE ug.user_id = $1
  UNION ALL SELECT permission_key, scope FROM user_permissions WHERE user_id = $1
  UNION ALL SELECT up.permission_key, up.scope FROM user_group_permissions up JOIN user_group_members m ON m.group_id = up.group_id WHERE m.user_id = $1`;

const WITH_REPORTS = `EXISTS (SELECT 1 FROM employees s WHERE s.manager_id = m.id AND s.deleted_at IS NULL)`;
/** Only "has_reports" is a fact kept by the system: exactly the people some employee reports to. The other automatic roles are stored choices made on the employee form (and the unit form for the head of a level). */
const AUTO_ROLE_STATEMENTS = [
  `INSERT INTO user_roles (user_id, role_id) SELECT m.user_id, r.id FROM employees m JOIN roles r ON r.auto_rule = 'has_reports'
     WHERE m.deleted_at IS NULL AND ${WITH_REPORTS} ON CONFLICT DO NOTHING RETURNING user_id`,
  `DELETE FROM user_roles ur USING roles r WHERE ur.role_id = r.id AND r.auto_rule = 'has_reports'
     AND NOT EXISTS (SELECT 1 FROM employees m WHERE m.user_id = ur.user_id AND m.deleted_at IS NULL AND ${WITH_REPORTS}) RETURNING ur.user_id`,
];

/** Does the employee manage an active unit of the level? */
const MANAGES_UNIT_OF_LEVEL = `EXISTS (SELECT 1 FROM org_nodes n WHERE n.manager_id = $1 AND n.org_level_id = $2 AND n.deleted_at IS NULL AND n.is_active)`;

const TITLE_NAME = (lang: string) => `(SELECT x.name FROM job_title_translations x WHERE x.job_title_id = t.id AND x.lang = '${lang}')`;
/** Every live job title has its role (new ones start with the permissions of the Employee role), and a removed title takes its role with it. */
const ENSURE_JOB_TITLE_ROLES = `
  WITH template AS (SELECT p.permission_key, p.scope FROM role_permissions p JOIN roles r ON r.id = p.role_id WHERE r.auto_rule = 'everyone'),
  made AS (
    INSERT INTO roles (name_ar, name_en, is_system, assignment, auto_rule, job_title_id)
    SELECT left(coalesce(${TITLE_NAME('ar')}, ${TITLE_NAME('en')}, ''), 120), left(coalesce(${TITLE_NAME('en')}, ${TITLE_NAME('ar')}, ''), 120), false, 'auto', 'job_title', t.id
    FROM job_titles t WHERE t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM roles r WHERE r.job_title_id = t.id)
    RETURNING id)
  INSERT INTO role_permissions (role_id, permission_key, scope) SELECT made.id, template.permission_key, template.scope FROM made CROSS JOIN template`;
const LEVEL_NAME = (lang: string) => `(SELECT x.name FROM org_level_translations x WHERE x.org_level_id = l.id AND x.lang = '${lang}')`;
const HEAD_NAME_AR = `left('قائد ' || coalesce(${LEVEL_NAME('ar')}, ${LEVEL_NAME('en')}, ''), 120)`;
const HEAD_NAME_EN = `left('Head of ' || coalesce(${LEVEL_NAME('en')}, ${LEVEL_NAME('ar')}, ''), 120)`;
/** Every live level has its head role (new ones start with the default permissions, passed as $1), a removed level takes its role with it, and a renamed level renames it. */
const ENSURE_LEVEL_HEAD_ROLES = `
  WITH made AS (
    INSERT INTO roles (name_ar, name_en, is_system, assignment, auto_rule, org_level_id)
    SELECT ${HEAD_NAME_AR}, ${HEAD_NAME_EN}, false, 'auto', 'node_head', l.id
    FROM org_levels l WHERE l.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM roles r WHERE r.org_level_id = l.id)
    RETURNING id)
  INSERT INTO role_permissions (role_id, permission_key, scope) SELECT made.id, d.key, d.scope FROM made CROSS JOIN jsonb_to_recordset($1::jsonb) AS d(key text, scope text)`;
const RENAME_LEVEL_HEAD_ROLES = `
  UPDATE roles r SET name_ar = ${HEAD_NAME_AR}, name_en = ${HEAD_NAME_EN}, updated_at = now()
  FROM org_levels l WHERE r.org_level_id = l.id AND l.deleted_at IS NULL AND (r.name_ar IS DISTINCT FROM ${HEAD_NAME_AR} OR r.name_en IS DISTINCT FROM ${HEAD_NAME_EN})`;
const REMOVE_ORPHAN_LEVEL_HEAD_ROLES = `DELETE FROM roles r WHERE r.org_level_id IS NOT NULL AND EXISTS (SELECT 1 FROM org_levels l WHERE l.id = r.org_level_id AND l.deleted_at IS NOT NULL)`;
const REMOVE_ORPHAN_JOB_TITLE_ROLES = `DELETE FROM roles r WHERE r.job_title_id IS NOT NULL AND EXISTS (SELECT 1 FROM job_titles t WHERE t.id = r.job_title_id AND t.deleted_at IS NOT NULL)`;

interface GrantRow {
  key: string | null;
  scope: PermissionScope | null;
}

interface PlacementRow {
  userId: string;
  companyId: string;
  orgNodeId: string | null;
  managerUserId: string | null;
}

@Injectable()
export class TypeOrmUserAccessRepository extends UserAccessRepository {
  constructor(
    @InjectRepository(UserRole) private readonly userRoles: Repository<UserRole>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
  ) {
    super();
  }

  async loadAccess(userId: string): Promise<UserAccessRecord | null> {
    const user = await this.userRoles.manager
      .createQueryBuilder()
      .select('u.is_active', 'isActive')
      .from('users', 'u')
      .where('u.id = :userId', { userId })
      .getRawOne<{ isActive: boolean }>();
    if (!user) return null;
    const rows = await this.grantRows(userId);
    const grants: PermissionGrant[] = rows
      .filter((r): r is GrantRow & { key: string; scope: PermissionScope } => !!r.key && !!r.scope)
      .map((r) => ({ key: r.key, scope: r.scope }));
    const placement = (await this.placementsOf([userId])).get(userId) ?? NO_PLACEMENT;
    return {
      isActive: user.isActive,
      grants,
      placement,
      reach: await this.reachOf(userId, placement.orgNodeId),
    };
  }

  /** The units the person reaches: where they sit and the units whose head role they hold because they manage them, each with the levels below it. */
  private async reachOf(userId: string, orgNodeId: string | null): Promise<UnitReach> {
    const rows: { nodeId: string; depth: number }[] = await this.userRoles.manager.query(
      `SELECT c.descendant_id AS "nodeId", c.depth AS depth FROM org_node_closure c WHERE c.ancestor_id = $2::uuid
       UNION ALL
       SELECT c.descendant_id, c.depth FROM employees e JOIN org_nodes n ON n.manager_id = e.id AND n.deleted_at IS NULL AND n.is_active
       JOIN roles r ON r.auto_rule = 'node_head' AND r.org_level_id = n.org_level_id
       JOIN user_roles ur ON ur.role_id = r.id AND ur.user_id = e.user_id
       JOIN org_node_closure c ON c.ancestor_id = n.id
       WHERE e.user_id = $1 AND e.deleted_at IS NULL`,
      [userId, orgNodeId],
    );
    return reachFrom(rows);
  }

  /** What a person holds: the permissions of their roles, of the roles inside their groups, and their own. */
  private grantRows(userId: string): Promise<GrantRow[]> {
    return this.userRoles.manager.query(GRANTS_OF_USER, [userId]);
  }

  async groupsOf(userIds: string[]): Promise<Map<string, { id: string; nameAr: string; nameEn: string }[]>> {
    const result = new Map<string, { id: string; nameAr: string; nameEn: string }[]>(userIds.map((id) => [id, []]));
    if (!userIds.length) return result;
    const rows: { userId: string; id: string; nameAr: string; nameEn: string }[] = await this.userRoles.manager.query(
      `SELECT ug.user_id AS "userId", g.id, g.name_ar AS "nameAr", g.name_en AS "nameEn" FROM user_role_groups ug JOIN role_groups g ON g.id = ug.group_id WHERE ug.user_id = ANY($1) ORDER BY g.name_ar`,
      [userIds],
    );
    for (const row of rows) result.get(row.userId)?.push({ id: row.id, nameAr: row.nameAr, nameEn: row.nameEn });
    return result;
  }

  async replaceGroups(userId: string, groupIds: string[], tx?: TransactionContext): Promise<void> {
    const m = managerOf(tx, this.userRoles.manager);
    await m.delete(UserRoleGroup, { userId });
    if (groupIds.length) await m.insert(UserRoleGroup, [...new Set(groupIds)].map((groupId) => ({ userId, groupId })));
  }

  async permissionsOf(userId: string): Promise<PermissionGrant[]> {
    const rows: { key: string; scope: PermissionScope }[] = await this.userRoles.manager.query('SELECT permission_key AS key, scope FROM user_permissions WHERE user_id = $1 ORDER BY permission_key', [userId]);
    return rows;
  }

  async replacePermissions(userId: string, grants: PermissionGrant[], tx?: TransactionContext): Promise<void> {
    const m = managerOf(tx, this.userRoles.manager);
    await m.delete(UserPermission, { userId });
    const unique = [...new Map(grants.map((g) => [g.key, g.scope])).entries()];
    if (unique.length) await m.insert(UserPermission, unique.map(([key, scope]) => ({ userId, key, scope })));
  }

  async rolesOf(userIds: string[]): Promise<Map<string, Role[]>> {
    const result = new Map<string, Role[]>(userIds.map((id) => [id, []]));
    if (!userIds.length) return result;
    const links = await this.userRoles.find({ where: { userId: In(userIds) } });
    const roles = await this.roles.find({ where: { id: In([...new Set(links.map((l) => l.roleId))]) } });
    const byId = new Map(roles.map((r) => [r.id, r]));
    for (const link of links) {
      const role = byId.get(link.roleId);
      if (role) result.get(link.userId)?.push(role);
    }
    return result;
  }

  async replaceRoles(userId: string, roleIds: string[], tx?: TransactionContext): Promise<void> {
    const m = managerOf(tx, this.userRoles.manager);
    await m.delete(UserRole, { userId });
    if (roleIds.length) await m.insert(UserRole, roleIds.map((roleId) => ({ userId, roleId })));
  }

  async syncAutoRoles(): Promise<number> {
    await this.userRoles.manager.query(REMOVE_ORPHAN_JOB_TITLE_ROLES);
    await this.userRoles.manager.query(ENSURE_JOB_TITLE_ROLES);
    await this.userRoles.manager.query(REMOVE_ORPHAN_LEVEL_HEAD_ROLES);
    await this.userRoles.manager.query(ENSURE_LEVEL_HEAD_ROLES, [JSON.stringify(LEVEL_HEAD_DEFAULT_PERMISSIONS)]);
    await this.userRoles.manager.query(RENAME_LEVEL_HEAD_ROLES);
    let changed = 0;
    for (const statement of AUTO_ROLE_STATEMENTS) changed += returnedRows<unknown>(await this.userRoles.manager.query(statement)).length;
    return changed;
  }

  async defaultRoleIdsFor(jobTitleId: string | null): Promise<{ everyoneId: string | null; titleId: string | null }> {
    const rows: { id: string; rule: string }[] = await this.roles.manager.query(
      `SELECT id, auto_rule AS rule FROM roles WHERE auto_rule = 'everyone' OR ($1::uuid IS NOT NULL AND job_title_id = $1::uuid)`,
      [jobTitleId],
    );
    return { everyoneId: rows.find((r) => r.rule === 'everyone')?.id ?? null, titleId: rows.find((r) => r.rule === 'job_title')?.id ?? null };
  }

  async syncHeadRole(levelId: string, employeeId: string): Promise<void> {
    const m = this.userRoles.manager;
    await m.query(
      `INSERT INTO user_roles (user_id, role_id) SELECT e.user_id, r.id FROM employees e JOIN roles r ON r.auto_rule = 'node_head' AND r.org_level_id = $2
       WHERE e.id = $1 AND e.deleted_at IS NULL AND ${MANAGES_UNIT_OF_LEVEL} ON CONFLICT DO NOTHING`,
      [employeeId, levelId],
    );
    await m.query(
      `DELETE FROM user_roles ur USING employees e, roles r WHERE e.id = $1 AND ur.user_id = e.user_id AND ur.role_id = r.id AND r.auto_rule = 'node_head' AND r.org_level_id = $2
       AND NOT ${MANAGES_UNIT_OF_LEVEL}`,
      [employeeId, levelId],
    );
  }

  /** Placement is read from the employee record (the HR source of truth); the manager is that employee's user id. */
  async placementsOf(userIds: string[]): Promise<Map<string, Placement>> {
    if (!userIds.length) return new Map();
    const rows: PlacementRow[] = await this.userRoles.manager
      .createQueryBuilder()
      .select('e.user_id', 'userId')
      .addSelect('e.company_id', 'companyId')
      .addSelect('e.org_node_id', 'orgNodeId')
      .addSelect('m.user_id', 'managerUserId')
      .from('employees', 'e')
      .leftJoin('employees', 'm', 'm.id = e.manager_id AND m.deleted_at IS NULL')
      .where('e.user_id IN (:...userIds)', { userIds })
      .andWhere('e.deleted_at IS NULL')
      .getRawMany<PlacementRow>();
    return new Map(rows.map((r) => [r.userId, { companyId: r.companyId, orgNodeId: r.orgNodeId, managerId: r.managerUserId }]));
  }
}

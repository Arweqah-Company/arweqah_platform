import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CorePermission, LEVEL_HEAD_DEFAULT_PERMISSIONS, type PermissionGrant, type PermissionScope } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../common/application/transaction-runner';
import { returnedRows } from '../../../common/infrastructure/query-result';
import { managerOf } from '../../../common/infrastructure/typeorm-transaction-runner';
import { todayInRiyadh } from '../../../common/domain/riyadh-date';
import { NO_PLACEMENT, reachFrom, type Placement, type UnitReach } from '../domain/access-context';
import { UserAccessRepository, type GrantSourceRow, type UserAccessRecord } from '../domain/access.repository';
import { Role } from '../domain/role.entity';
import { UserRole } from '../domain/user-role.entity';

/** Today in Riyadh: what is given "until" a day still holds through that day. */
const TODAY = `(now() AT TIME ZONE 'Asia/Riyadh')::date`;
/** The row has no end date, or its last day has not passed. */
const holds = (alias: string): string => `(${alias}.expires_at IS NULL OR ${alias}.expires_at >= ${TODAY})`;

const PERMISSIONS_OF_USER = `SELECT up.permission_key AS key, up.scope FROM user_permissions up WHERE up.user_id = $1 AND ${holds('up')} ORDER BY up.permission_key`;

/** A role that holds `admin_mode.use` is an administrative role: its grants work only in platform admin mode. */
const IS_ADMIN_ROLE = `EXISTS (SELECT 1 FROM role_permissions a WHERE a.role_id = rp.role_id AND a.permission_key = '${CorePermission.AdminModeUse}')`;

const GRANTS_OF_USER = `
  SELECT rp.permission_key AS key, rp.scope AS scope, ${IS_ADMIN_ROLE} AS elevated FROM role_permissions rp
  WHERE rp.role_id IN (
    SELECT ur.role_id FROM user_roles ur WHERE ur.user_id = $1 AND ${holds('ur')}
    UNION SELECT gr.role_id FROM user_role_groups ug JOIN role_group_roles gr ON gr.group_id = ug.group_id WHERE ug.user_id = $1 AND ${holds('ug')})
  UNION ALL SELECT gp.permission_key, gp.scope, false FROM role_group_permissions gp JOIN user_role_groups ug ON ug.group_id = gp.group_id WHERE ug.user_id = $1 AND ${holds('ug')}
  UNION ALL SELECT up.permission_key, up.scope, false FROM user_permissions up WHERE up.user_id = $1 AND ${holds('up')}
  UNION ALL SELECT ugp.permission_key, ugp.scope, false FROM user_group_permissions ugp JOIN user_group_members m ON m.group_id = ugp.group_id WHERE m.user_id = $1`;

/** The same grants as `GRANTS_OF_USER`, one row per source with its name, so a person can see where each permission comes from. */
const GRANT_SOURCES_OF_USER = `
  SELECT rp.permission_key AS key, rp.scope, 'role' AS kind, r.name_ar AS "nameAr", r.name_en AS "nameEn", ${IS_ADMIN_ROLE} AS elevated
    FROM user_roles ur JOIN roles r ON r.id = ur.role_id JOIN role_permissions rp ON rp.role_id = r.id WHERE ur.user_id = $1 AND ${holds('ur')}
  UNION ALL SELECT rp.permission_key, rp.scope, 'role_group', g.name_ar, g.name_en, ${IS_ADMIN_ROLE}
    FROM user_role_groups ug JOIN role_groups g ON g.id = ug.group_id JOIN role_group_roles gr ON gr.group_id = g.id JOIN role_permissions rp ON rp.role_id = gr.role_id WHERE ug.user_id = $1 AND ${holds('ug')}
  UNION ALL SELECT gp.permission_key, gp.scope, 'role_group', g.name_ar, g.name_en, false
    FROM user_role_groups ug JOIN role_groups g ON g.id = ug.group_id JOIN role_group_permissions gp ON gp.group_id = g.id WHERE ug.user_id = $1 AND ${holds('ug')}
  UNION ALL SELECT up.permission_key, up.scope, 'direct', '', '', false FROM user_permissions up WHERE up.user_id = $1 AND ${holds('up')}
  UNION ALL SELECT ugp.permission_key, ugp.scope, 'user_group', g.name_ar, g.name_en, false
    FROM user_group_members m JOIN user_groups g ON g.id = m.group_id JOIN user_group_permissions ugp ON ugp.group_id = g.id WHERE m.user_id = $1`;

const WITH_REPORTS = `EXISTS (SELECT 1 FROM employees s WHERE s.manager_id = m.id AND s.deleted_at IS NULL)`;
/** Only "has_reports" is a fact kept by the system: exactly the people some employee reports to. The other automatic roles are stored choices made on the employee form (and the unit form for the head of a level). */
const AUTO_ROLE_STATEMENTS = [
  `INSERT INTO user_roles (user_id, role_id) SELECT m.user_id, r.id FROM employees m JOIN roles r ON r.auto_rule = 'has_reports'
     WHERE m.deleted_at IS NULL AND ${WITH_REPORTS} ON CONFLICT DO NOTHING RETURNING user_id`,
  `DELETE FROM user_roles ur USING roles r WHERE ur.role_id = r.id AND r.auto_rule = 'has_reports'
     AND NOT EXISTS (SELECT 1 FROM employees m WHERE m.user_id = ur.user_id AND m.deleted_at IS NULL AND ${WITH_REPORTS}) RETURNING ur.user_id`,
];

/** Does the employee manage this active unit? */
const MANAGES_UNIT = `EXISTS (SELECT 1 FROM org_nodes n WHERE n.manager_id = $1 AND n.id = $2 AND n.deleted_at IS NULL AND n.is_active)`;

const TITLE_NAME = (lang: string) => `(SELECT x.name FROM job_title_translations x WHERE x.job_title_id = t.id AND x.lang = '${lang}')`;
const TITLE_UNIT = (lang: string) => `(SELECT x.name FROM org_node_translations x WHERE x.org_node_id = t.org_node_id AND x.lang = '${lang}')`;
/** The role of a job title is named «title — unit», so the many titles called "Employee" are told apart and only the Employee role itself carries that bare name. */
const TITLE_ROLE_NAME = (lang: string) => `left(coalesce(${TITLE_NAME(lang)}, ${TITLE_NAME(lang === 'ar' ? 'en' : 'ar')}, '') || ' — ' || coalesce(${TITLE_UNIT(lang)}, ${TITLE_UNIT(lang === 'ar' ? 'en' : 'ar')}, ''), 120)`;
/** Every live job title has its role (new ones start empty: the baseline comes from the Employee role, and the creator may pick a template), and a removed title takes its role with it. */
const ENSURE_JOB_TITLE_ROLES = `
  INSERT INTO roles (name_ar, name_en, is_system, assignment, auto_rule, job_title_id)
  SELECT ${TITLE_ROLE_NAME('ar')}, ${TITLE_ROLE_NAME('en')}, false, 'auto', 'job_title', t.id
  FROM job_titles t WHERE t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM roles r WHERE r.job_title_id = t.id)`;
const RENAME_JOB_TITLE_ROLES = `
  UPDATE roles r SET name_ar = ${TITLE_ROLE_NAME('ar')}, name_en = ${TITLE_ROLE_NAME('en')}, updated_at = now()
  FROM job_titles t WHERE r.job_title_id = t.id AND t.deleted_at IS NULL AND (r.name_ar IS DISTINCT FROM ${TITLE_ROLE_NAME('ar')} OR r.name_en IS DISTINCT FROM ${TITLE_ROLE_NAME('en')})`;
const NODE_NAME = (lang: string) => `(SELECT x.name FROM org_node_translations x WHERE x.org_node_id = n.id AND x.lang = '${lang}')`;
const HEAD_NAME_AR = `left('قائد ' || coalesce(${NODE_NAME('ar')}, ${NODE_NAME('en')}, ''), 120)`;
const HEAD_NAME_EN = `left('Head of ' || coalesce(${NODE_NAME('en')}, ${NODE_NAME('ar')}, ''), 120)`;
/** Every live unit has its own head role, whichever company it sits in (new ones start with the default permissions, passed as $1); a removed unit takes its role with it, and a renamed unit renames it. */
const ENSURE_NODE_HEAD_ROLES = `
  WITH made AS (
    INSERT INTO roles (name_ar, name_en, is_system, assignment, auto_rule, org_node_id)
    SELECT ${HEAD_NAME_AR}, ${HEAD_NAME_EN}, false, 'auto', 'node_head', n.id
    FROM org_nodes n WHERE n.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM roles r WHERE r.org_node_id = n.id)
    RETURNING id)
  INSERT INTO role_permissions (role_id, permission_key, scope) SELECT made.id, d.key, d.scope FROM made CROSS JOIN jsonb_to_recordset($1::jsonb) AS d(key text, scope text)`;
const RENAME_NODE_HEAD_ROLES = `
  UPDATE roles r SET name_ar = ${HEAD_NAME_AR}, name_en = ${HEAD_NAME_EN}, updated_at = now()
  FROM org_nodes n WHERE r.org_node_id = n.id AND n.deleted_at IS NULL AND (r.name_ar IS DISTINCT FROM ${HEAD_NAME_AR} OR r.name_en IS DISTINCT FROM ${HEAD_NAME_EN})`;
const REMOVE_ORPHAN_NODE_HEAD_ROLES = `DELETE FROM roles r WHERE r.org_node_id IS NOT NULL AND EXISTS (SELECT 1 FROM org_nodes n WHERE n.id = r.org_node_id AND n.deleted_at IS NOT NULL)`;
const REMOVE_ORPHAN_JOB_TITLE_ROLES = `DELETE FROM roles r WHERE r.job_title_id IS NOT NULL AND EXISTS (SELECT 1 FROM job_titles t WHERE t.id = r.job_title_id AND t.deleted_at IS NOT NULL)`;

interface GrantRow {
  key: string | null;
  scope: PermissionScope | null;
  elevated: boolean;
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
    const valid = rows.filter((r): r is GrantRow & { key: string; scope: PermissionScope } => !!r.key && !!r.scope);
    const toGrant = (r: { key: string; scope: PermissionScope }): PermissionGrant => ({ key: r.key, scope: r.scope });
    const waits = (r: GrantRow & { key: string }): boolean => r.elevated && r.key !== CorePermission.AdminModeUse;
    const grants = valid.filter((r) => !waits(r)).map(toGrant);
    const elevatedGrants = valid.filter(waits).map(toGrant);
    const placement = (await this.placementsOf([userId])).get(userId) ?? NO_PLACEMENT;
    return {
      isActive: user.isActive,
      grants,
      elevatedGrants,
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
       JOIN roles r ON r.auto_rule = 'node_head' AND r.org_node_id = n.id
       JOIN user_roles ur ON ur.role_id = r.id AND ur.user_id = e.user_id AND ${holds('ur')}
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

  grantSourcesOf(userId: string): Promise<GrantSourceRow[]> {
    return this.userRoles.manager.query(GRANT_SOURCES_OF_USER, [userId]);
  }

  async groupsOf(userIds: string[]): Promise<Map<string, { id: string; nameAr: string; nameEn: string }[]>> {
    const result = new Map<string, { id: string; nameAr: string; nameEn: string }[]>(userIds.map((id) => [id, []]));
    if (!userIds.length) return result;
    const rows: { userId: string; id: string; nameAr: string; nameEn: string }[] = await this.userRoles.manager.query(
      `SELECT ug.user_id AS "userId", g.id, g.name_ar AS "nameAr", g.name_en AS "nameEn" FROM user_role_groups ug JOIN role_groups g ON g.id = ug.group_id WHERE ug.user_id = ANY($1) AND ${holds('ug')} ORDER BY g.name_ar`,
      [userIds],
    );
    for (const row of rows) result.get(row.userId)?.push({ id: row.id, nameAr: row.nameAr, nameEn: row.nameEn });
    return result;
  }

  async replaceGroups(userId: string, groupIds: string[], grantedBy: string | null, tx?: TransactionContext): Promise<void> {
    const m = managerOf(tx, this.userRoles.manager);
    const unique = [...new Set(groupIds)];
    await m.query('DELETE FROM user_role_groups WHERE user_id = $1 AND NOT (group_id = ANY($2::uuid[]))', [userId, unique]);
    for (const groupId of unique) await m.query('INSERT INTO user_role_groups (user_id, group_id, granted_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [userId, groupId, grantedBy]);
  }

  async permissionsOf(userId: string): Promise<PermissionGrant[]> {
    const rows: { key: string; scope: PermissionScope }[] = await this.userRoles.manager.query(PERMISSIONS_OF_USER, [userId]);
    return rows;
  }

  async replacePermissions(userId: string, grants: PermissionGrant[], grantedBy: string | null, tx?: TransactionContext): Promise<void> {
    const m = managerOf(tx, this.userRoles.manager);
    const unique = [...new Map(grants.map((g) => [g.key, g.scope])).entries()];
    await m.query('DELETE FROM user_permissions WHERE user_id = $1 AND NOT (permission_key = ANY($2::text[]))', [userId, unique.map(([key]) => key)]);
    // A permission already held keeps its end date and who gave it; only its scope follows the new list.
    for (const [key, scope] of unique) {
      await m.query('INSERT INTO user_permissions (user_id, permission_key, scope, granted_by) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, permission_key) DO UPDATE SET scope = EXCLUDED.scope', [userId, key, scope, grantedBy]);
    }
  }

  async rolesOf(userIds: string[]): Promise<Map<string, Role[]>> {
    const result = new Map<string, Role[]>(userIds.map((id) => [id, []]));
    if (!userIds.length) return result;
    const links = (await this.userRoles.find({ where: { userId: In(userIds) } })).filter((l) => !l.expiresAt || l.expiresAt >= todayInRiyadh());
    const roles = await this.roles.find({ where: { id: In([...new Set(links.map((l) => l.roleId))]) } });
    const byId = new Map(roles.map((r) => [r.id, r]));
    for (const link of links) {
      const role = byId.get(link.roleId);
      if (role) result.get(link.userId)?.push(role);
    }
    return result;
  }

  async replaceRoles(userId: string, roleIds: string[], options: { expiries?: Record<string, string | null>; grantedBy?: string | null } = {}, tx?: TransactionContext): Promise<void> {
    const m = managerOf(tx, this.userRoles.manager);
    await m.query('DELETE FROM user_roles WHERE user_id = $1 AND NOT (role_id = ANY($2::uuid[]))', [userId, roleIds]);
    for (const roleId of roleIds) {
      const expiry = options.expiries?.[roleId];
      // A role already held keeps its end date and who gave it unless a new end date is named.
      await m.query(
        `INSERT INTO user_roles (user_id, role_id, expires_at, granted_by) VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, role_id) DO UPDATE SET expires_at = CASE WHEN $5::boolean THEN EXCLUDED.expires_at ELSE user_roles.expires_at END`,
        [userId, roleId, expiry ?? null, options.grantedBy ?? null, expiry !== undefined],
      );
    }
  }

  async roleExpiriesOf(userIds: string[]): Promise<Map<string, Map<string, string>>> {
    const result = new Map<string, Map<string, string>>();
    if (!userIds.length) return result;
    const rows: { userId: string; roleId: string; expiresAt: string }[] = await this.userRoles.manager.query(
      `SELECT ur.user_id AS "userId", ur.role_id AS "roleId", to_char(ur.expires_at, 'YYYY-MM-DD') AS "expiresAt" FROM user_roles ur WHERE ur.user_id = ANY($1) AND ur.expires_at IS NOT NULL`,
      [userIds],
    );
    for (const row of rows) result.set(row.userId, (result.get(row.userId) ?? new Map<string, string>()).set(row.roleId, row.expiresAt));
    return result;
  }

  async syncAutoRoles(): Promise<number> {
    await this.userRoles.manager.query(REMOVE_ORPHAN_JOB_TITLE_ROLES);
    await this.userRoles.manager.query(ENSURE_JOB_TITLE_ROLES);
    await this.userRoles.manager.query(RENAME_JOB_TITLE_ROLES);
    await this.userRoles.manager.query(REMOVE_ORPHAN_NODE_HEAD_ROLES);
    await this.userRoles.manager.query(ENSURE_NODE_HEAD_ROLES, [JSON.stringify(LEVEL_HEAD_DEFAULT_PERMISSIONS)]);
    await this.userRoles.manager.query(RENAME_NODE_HEAD_ROLES);
    let changed = 0;
    for (const statement of AUTO_ROLE_STATEMENTS) changed += returnedRows<unknown>(await this.userRoles.manager.query(statement)).length;
    return changed;
  }

  async defaultRoleIdsFor(jobTitleId: string | null, limitedAccess: boolean): Promise<{ baseId: string | null; titleId: string | null }> {
    const baseRule = limitedAccess ? 'limited_access' : 'everyone';
    const rows: { id: string; rule: string }[] = await this.roles.manager.query(
      `SELECT id, auto_rule AS rule FROM roles WHERE auto_rule = $2 OR ($1::uuid IS NOT NULL AND job_title_id = $1::uuid)`,
      [jobTitleId, baseRule],
    );
    return { baseId: rows.find((r) => r.rule === baseRule)?.id ?? null, titleId: rows.find((r) => r.rule === 'job_title')?.id ?? null };
  }

  async swapBaseRole(userId: string, limitedAccess: boolean): Promise<void> {
    const [from, to] = limitedAccess ? ['everyone', 'limited_access'] : ['limited_access', 'everyone'];
    const m = this.userRoles.manager;
    await m.query(`DELETE FROM user_roles ur USING roles r WHERE ur.user_id = $1 AND ur.role_id = r.id AND r.auto_rule = $2`, [userId, from]);
    await m.query(`INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE auto_rule = $2 ON CONFLICT DO NOTHING`, [userId, to]);
  }

  async syncHeadRole(nodeId: string, employeeId: string): Promise<void> {
    const m = this.userRoles.manager;
    await m.query(
      `INSERT INTO user_roles (user_id, role_id) SELECT e.user_id, r.id FROM employees e JOIN roles r ON r.auto_rule = 'node_head' AND r.org_node_id = $2
       WHERE e.id = $1 AND e.deleted_at IS NULL AND ${MANAGES_UNIT} ON CONFLICT DO NOTHING`,
      [employeeId, nodeId],
    );
    await m.query(
      `DELETE FROM user_roles ur USING employees e, roles r WHERE e.id = $1 AND ur.user_id = e.user_id AND ur.role_id = r.id AND r.auto_rule = 'node_head' AND r.org_node_id = $2
       AND NOT ${MANAGES_UNIT}`,
      [employeeId, nodeId],
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

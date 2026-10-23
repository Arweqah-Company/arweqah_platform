import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { PermissionGrant, PermissionScope } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../common/application/transaction-runner';
import { returnedRows } from '../../../common/infrastructure/query-result';
import { managerOf } from '../../../common/infrastructure/typeorm-transaction-runner';
import { NO_PLACEMENT, type Placement } from '../domain/access-context';
import { UserAccessRepository, type UserAccessRecord } from '../domain/access.repository';
import { Role } from '../domain/role.entity';
import { UserRole } from '../domain/user-role.entity';

const WITH_REPORTS = `EXISTS (SELECT 1 FROM employees s WHERE s.manager_id = m.id AND s.deleted_at IS NULL)`;
/** "everyone": every person with an employee record; "has_reports": exactly the people some employee reports to. */
const AUTO_ROLE_STATEMENTS = [
  `INSERT INTO user_roles (user_id, role_id) SELECT m.user_id, r.id FROM employees m JOIN roles r ON r.auto_rule = 'everyone'
     WHERE m.deleted_at IS NULL ON CONFLICT DO NOTHING RETURNING user_id`,
  `INSERT INTO user_roles (user_id, role_id) SELECT m.user_id, r.id FROM employees m JOIN roles r ON r.auto_rule = 'has_reports'
     WHERE m.deleted_at IS NULL AND ${WITH_REPORTS} ON CONFLICT DO NOTHING RETURNING user_id`,
  `DELETE FROM user_roles ur USING roles r WHERE ur.role_id = r.id AND r.auto_rule = 'has_reports'
     AND NOT EXISTS (SELECT 1 FROM employees m WHERE m.user_id = ur.user_id AND m.deleted_at IS NULL AND ${WITH_REPORTS}) RETURNING ur.user_id`,
];

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
      subtreeNodeIds: await this.subtreeOf(placement.orgNodeId),
    };
  }

  private async subtreeOf(orgNodeId: string | null): Promise<string[]> {
    if (!orgNodeId) return [];
    const rows: { id: string }[] = await this.userRoles.manager.query(
      'SELECT descendant_id AS id FROM org_node_closure WHERE ancestor_id = $1',
      [orgNodeId],
    );
    return rows.map((r) => r.id);
  }

  private grantRows(userId: string): Promise<GrantRow[]> {
    return this.userRoles
      .createQueryBuilder('ur')
      .innerJoin('roles', 'r', 'r.id = ur.role_id')
      .leftJoin('role_permissions', 'rp', 'rp.role_id = r.id')
      .select('rp.permission_key', 'key')
      .addSelect('rp.scope', 'scope')
      .where('ur.user_id = :userId', { userId })
      .getRawMany<GrantRow>();
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
    let changed = 0;
    for (const statement of AUTO_ROLE_STATEMENTS) changed += returnedRows<unknown>(await this.userRoles.manager.query(statement)).length;
    return changed;
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

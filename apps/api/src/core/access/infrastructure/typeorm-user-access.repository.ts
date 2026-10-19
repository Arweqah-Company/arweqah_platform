import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { PermissionGrant, PermissionScope } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../common/application/transaction-runner';
import { managerOf } from '../../../common/infrastructure/typeorm-transaction-runner';
import type { Placement } from '../domain/access-context';
import { UserAccessRepository, type UserAccessRecord } from '../domain/access.repository';
import { Role } from '../domain/role.entity';
import { UserPlacement } from '../domain/user-placement.entity';
import { UserRole } from '../domain/user-role.entity';

interface GrantRow {
  key: string | null;
  scope: PermissionScope | null;
  requiresTwoFactor: boolean | null;
}

@Injectable()
export class TypeOrmUserAccessRepository extends UserAccessRepository {
  constructor(
    @InjectRepository(UserRole) private readonly userRoles: Repository<UserRole>,
    @InjectRepository(UserPlacement) private readonly placements: Repository<UserPlacement>,
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
    const placement = (await this.placementsOf([userId])).get(userId) ?? emptyPlacement();
    return {
      isActive: user.isActive,
      grants,
      requiresTwoFactor: rows.some((r) => r.requiresTwoFactor),
      placement,
    };
  }

  private grantRows(userId: string): Promise<GrantRow[]> {
    return this.userRoles
      .createQueryBuilder('ur')
      .innerJoin('roles', 'r', 'r.id = ur.role_id')
      .leftJoin('role_permissions', 'rp', 'rp.role_id = r.id')
      .select('rp.permission_key', 'key')
      .addSelect('rp.scope', 'scope')
      .addSelect('r.requires_two_factor', 'requiresTwoFactor')
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

  async placementsOf(userIds: string[]): Promise<Map<string, Placement>> {
    if (!userIds.length) return new Map();
    const rows = await this.placements.find({ where: { userId: In(userIds) } });
    return new Map(rows.map((p) => [p.userId, toPlacement(p)]));
  }

  async savePlacement(userId: string, placement: Placement, tx?: TransactionContext): Promise<void> {
    await managerOf(tx, this.placements.manager).upsert(UserPlacement, { userId, ...placement }, ['userId']);
  }
}

function toPlacement(p: UserPlacement): Placement {
  return { branchId: p.branchId, departmentId: p.departmentId, teamId: p.teamId, managerId: p.managerId };
}

export function emptyPlacement(): Placement {
  return { branchId: null, departmentId: null, teamId: null, managerId: null };
}

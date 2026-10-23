import type { PermissionGrant } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../common/domain/transaction-context';
import type { Role } from './role.entity';
import type { Placement } from './access-context';

export interface UserAccessRecord {
  isActive: boolean;
  grants: PermissionGrant[];
  placement: Placement;
  /** The user's org unit and every unit below it (empty when unplaced). */
  subtreeNodeIds: string[];
}

export abstract class RoleRepository {
  abstract findAll(): Promise<(Role & { usersCount: number })[]>;
  abstract findById(id: string): Promise<Role | null>;
  abstract findByIds(ids: string[]): Promise<Role[]>;
  abstract save(role: Role): Promise<Role>;
  abstract remove(role: Role): Promise<void>;
}

export abstract class UserAccessRepository {
  abstract loadAccess(userId: string): Promise<UserAccessRecord | null>;
  abstract rolesOf(userIds: string[]): Promise<Map<string, Role[]>>;
  abstract replaceRoles(userId: string, roleIds: string[], tx?: TransactionContext): Promise<void>;
  abstract placementsOf(userIds: string[]): Promise<Map<string, Placement>>;
  /** The groups of roles each person was given. */
  abstract groupsOf(userIds: string[]): Promise<Map<string, { id: string; nameAr: string; nameEn: string }[]>>;
  abstract replaceGroups(userId: string, groupIds: string[], tx?: TransactionContext): Promise<void>;
  /** Permissions given to one person alone. */
  abstract permissionsOf(userId: string): Promise<PermissionGrant[]>;
  abstract replacePermissions(userId: string, grants: PermissionGrant[], tx?: TransactionContext): Promise<void>;
  /** Brings the members of the roles that have an auto rule up to date; returns how many memberships changed. */
  abstract syncAutoRoles(): Promise<number>;
}

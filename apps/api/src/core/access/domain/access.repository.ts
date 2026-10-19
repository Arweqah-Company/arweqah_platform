import type { PermissionGrant } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../common/domain/transaction-context';
import type { Role } from './role.entity';
import type { Placement } from './access-context';

export interface UserAccessRecord {
  isActive: boolean;
  grants: PermissionGrant[];
  requiresTwoFactor: boolean;
  placement: Placement;
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
  abstract savePlacement(userId: string, placement: Placement, tx?: TransactionContext): Promise<void>;
}

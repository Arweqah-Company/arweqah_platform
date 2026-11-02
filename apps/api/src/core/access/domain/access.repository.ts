import type { PermissionGrant, RoleOriginDto } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../common/domain/transaction-context';
import type { Role } from './role.entity';
import type { Placement, UnitReach } from './access-context';

export interface UserAccessRecord {
  isActive: boolean;
  grants: PermissionGrant[];
  placement: Placement;
  /** The units the person reaches and how deep: the unit they sit in and the units they manage through a head role, then the units below them. */
  reach: UnitReach;
}

/** A role to make for a job title: its name follows the title, its permissions are copied from a template. */
export interface JobTitleRoleSeed {
  jobTitleId: string;
  nameAr: string;
  nameEn: string;
  permissions: PermissionGrant[];
}

export abstract class RoleRepository {
  abstract findAll(): Promise<(Role & { usersCount: number; origin: RoleOriginDto | null })[]>;
  abstract findById(id: string): Promise<Role | null>;
  abstract findByIds(ids: string[]): Promise<Role[]>;
  abstract save(role: Role): Promise<Role>;
  abstract remove(role: Role): Promise<void>;
  /** The permissions of the "everyone" role (the Employee role): what a new job title role starts with when no template is chosen. */
  abstract defaultTemplatePermissions(): Promise<PermissionGrant[]>;
  abstract insertJobTitleRoles(seeds: JobTitleRoleSeed[], tx: TransactionContext): Promise<void>;
  abstract renameJobTitleRole(jobTitleId: string, names: { nameAr: string; nameEn: string }, tx: TransactionContext): Promise<void>;
  abstract removeJobTitleRoles(jobTitleIds: string[], tx: TransactionContext): Promise<void>;
}

export abstract class UserAccessRepository {
  abstract loadAccess(userId: string): Promise<UserAccessRecord | null>;
  abstract rolesOf(userIds: string[]): Promise<Map<string, Role[]>>;
  /** Replaces the roles of a person; a role already held keeps its end date unless `expiries` names a new one (null = no end date). */
  abstract replaceRoles(userId: string, roleIds: string[], options?: { expiries?: Record<string, string | null>; grantedBy?: string | null }, tx?: TransactionContext): Promise<void>;
  /** The end dates of the roles each person holds (only the roles that have one). */
  abstract roleExpiriesOf(userIds: string[]): Promise<Map<string, Map<string, string>>>;
  abstract placementsOf(userIds: string[]): Promise<Map<string, Placement>>;
  /** The groups of roles each person was given. */
  abstract groupsOf(userIds: string[]): Promise<Map<string, { id: string; nameAr: string; nameEn: string }[]>>;
  abstract replaceGroups(userId: string, groupIds: string[], grantedBy: string | null, tx?: TransactionContext): Promise<void>;
  /** Permissions given to one person alone. */
  abstract permissionsOf(userId: string): Promise<PermissionGrant[]>;
  abstract replacePermissions(userId: string, grants: PermissionGrant[], grantedBy: string | null, tx?: TransactionContext): Promise<void>;
  /** Brings the roles the system keeps up to date (who has reports) and the roles of job titles and levels in order; returns how many memberships changed. */
  abstract syncAutoRoles(): Promise<number>;
  /** The roles a new employee starts with: the base role (the Employee role, or the collaborator base for limited access) and the role of their job title (the ones that exist). */
  abstract defaultRoleIdsFor(jobTitleId: string | null, limitedAccess: boolean): Promise<{ baseId: string | null; titleId: string | null }>;
  /** Swaps the base role the person holds when their relation changes between employee and limited access; other roles stay. */
  abstract swapBaseRole(userId: string, limitedAccess: boolean): Promise<void>;
  /** Gives the head role of the unit to the employee when they manage that active unit, takes it back when they do not. */
  abstract syncHeadRole(nodeId: string, employeeId: string): Promise<void>;
}

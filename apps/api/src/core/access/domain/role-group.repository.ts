import type { PermissionGrant } from '@arweqah-platform/shared';

export interface RoleGroupRecord {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  roleIds: string[];
  usersCount: number;
}

export interface RoleGroupValues {
  nameAr: string;
  nameEn: string;
  description: string | null;
  roleIds: string[];
}

export abstract class RoleGroupRepository {
  abstract all(): Promise<RoleGroupRecord[]>;
  abstract find(id: string): Promise<RoleGroupRecord | null>;
  abstract insert(values: RoleGroupValues): Promise<string>;
  abstract update(id: string, values: RoleGroupValues): Promise<void>;
  abstract remove(id: string): Promise<void>;
  /** The permissions placed on one group itself. */
  abstract grantsOf(id: string): Promise<PermissionGrant[]>;
  /** The permissions placed on the groups that any of these roles sit in: what those roles bring besides their own. */
  abstract grantsOfGroupsHolding(roleIds: string[]): Promise<PermissionGrant[]>;
}

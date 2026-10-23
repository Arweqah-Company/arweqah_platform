import type { PermissionGrant, PermissionTargetKind } from '@arweqah-platform/shared';

export interface TargetRef {
  id: string;
  nameAr: string;
  nameEn: string;
}

/** The four things a permission can be placed on (a role, a group of roles, one person, a group of people). */
export abstract class PermissionTargetRepository {
  /** Choices for the page: everything of that kind, or (for people) those matching the search. */
  abstract list(kind: PermissionTargetKind, search?: string): Promise<TargetRef[]>;
  abstract find(kind: PermissionTargetKind, id: string): Promise<TargetRef | null>;
  /** What is placed on the target itself. */
  abstract direct(kind: PermissionTargetKind, id: string): Promise<PermissionGrant[]>;
  /** What reaches it from elsewhere: the roles inside a group, the roles and groups of a person. */
  abstract inherited(kind: PermissionTargetKind, id: string): Promise<PermissionGrant[]>;
  abstract replace(kind: PermissionTargetKind, id: string, grants: PermissionGrant[]): Promise<void>;
}

import type { PermissionScope } from './scope';

/** What a permission comes from: a role of the person, a group of roles, a group of people, or a grant to the person alone. */
export type AccessSourceKind = 'role' | 'role_group' | 'user_group' | 'direct';

export interface AccessSourceDto {
  kind: AccessSourceKind;
  nameAr: string;
  nameEn: string;
}

/** One permission in force for the signed-in person, with its widest scope and where it comes from. */
export interface MyAccessGrantDto {
  key: string;
  module: string;
  labelAr: string;
  labelEn: string;
  scope: PermissionScope;
  sources: AccessSourceDto[];
}

export interface MyAccessRoleDto {
  id: string;
  nameAr: string;
  nameEn: string;
  /** Held through a rule of the system (job title, head of a unit, everyone…) or given to the person. */
  assignment: 'auto' | 'manual';
}

/** `GET /me/access`: read once after sign-in and again when platform admin mode is turned on or off. */
export interface MyAccessDto {
  roles: MyAccessRoleDto[];
  grants: MyAccessGrantDto[];
  /** The person holds an administrative role whose permissions wait for platform admin mode (nothing else about them is told). */
  adminRolesHidden: boolean;
}

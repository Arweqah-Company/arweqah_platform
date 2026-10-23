import { z } from 'zod';
import { localizedNameSchema } from '../common/localized';
import { PERMISSION_SCOPES, type PermissionScope } from '../permissions/scope';

export const permissionGrantSchema = z.strictObject({
  key: z.string().regex(/^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/),
  scope: z.enum(PERMISSION_SCOPES),
});

export const ROLE_ASSIGNMENTS = ['auto', 'manual'] as const;
export type RoleAssignment = (typeof ROLE_ASSIGNMENTS)[number];

/** Roles the system keeps up to date by itself; nobody assigns them by hand. */
export const ROLE_AUTO_RULES = ['everyone', 'has_reports'] as const;
export type RoleAutoRule = (typeof ROLE_AUTO_RULES)[number];

export const upsertRoleSchema = z.strictObject({
  ...localizedNameSchema,
  description: z.string().trim().max(500).optional(),
  /** Left out = unchanged (a new role starts as manual). */
  assignment: z.enum(ROLE_ASSIGNMENTS).optional(),
  permissions: z.array(permissionGrantSchema).max(500),
});
export type UpsertRoleInput = z.infer<typeof upsertRoleSchema>;

export interface RoleDto {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  isSystem: boolean;
  /** Auto: given by a rule or a setup elsewhere; manual: given by HR or an administrator. */
  assignment: RoleAssignment;
  /** The rule that keeps an auto role's members up to date; null for manual roles and for auto roles whose rule is not defined yet. */
  autoRule: RoleAutoRule | null;
  permissions: { key: string; scope: PermissionScope }[];
  usersCount: number;
}

// ------------------------------------------------------------------ role groups

/** A group bundles roles: giving a person the group gives them every role in it. */
export const roleGroupInputSchema = z.strictObject({
  ...localizedNameSchema,
  description: z.string().trim().max(500).optional(),
  roleIds: z.array(z.uuid()).max(100),
});
export type RoleGroupInput = z.infer<typeof roleGroupInputSchema>;

export interface RoleGroupDto {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  roles: { id: string; nameAr: string; nameEn: string }[];
  usersCount: number;
}

/** Groups and personal permissions of one person (on top of their roles). */
export const assignGroupsSchema = z.strictObject({ groupIds: z.array(z.uuid()).max(50) });
export type AssignGroupsInput = z.infer<typeof assignGroupsSchema>;

export const assignPermissionsSchema = z.strictObject({ permissions: z.array(permissionGrantSchema).max(500) });
export type AssignPermissionsInput = z.infer<typeof assignPermissionsSchema>;

// ------------------------------------------------------------------ user groups

/** A group of people who get the same permissions (the members are chosen one by one). */
export const userGroupInputSchema = z.strictObject({
  ...localizedNameSchema,
  description: z.string().trim().max(500).optional(),
  userIds: z.array(z.uuid()).max(2000),
});
export type UserGroupInput = z.infer<typeof userGroupInputSchema>;

export interface UserGroupDto {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  members: { id: string; name: string }[];
}

// ------------------------------------------------------------------ the permissions page

/** What a permission can be placed on: a role, a group of roles, one person, or a group of people. */
export const PERMISSION_TARGET_KINDS = ['role', 'role-group', 'user', 'user-group'] as const;
export type PermissionTargetKind = (typeof PERMISSION_TARGET_KINDS)[number];

export interface PermissionTargetDto {
  kind: PermissionTargetKind;
  id: string;
  nameAr: string;
  nameEn: string;
  /** Placed on this target itself. */
  permissions: { key: string; scope: PermissionScope }[];
  /** Reaches it from elsewhere (the roles of a group, the roles and groups of a person); shown, not edited here. */
  inherited: { key: string; scope: PermissionScope }[];
}

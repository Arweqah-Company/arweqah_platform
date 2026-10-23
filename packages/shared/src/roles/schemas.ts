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

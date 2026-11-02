import { z } from 'zod';
import type { PermissionScope } from '../permissions/scope';
import { permissionGrantSchema } from './schemas';

/** The personal permissions of one person (on top of their roles and groups). */
export const assignPermissionsSchema = z.strictObject({ permissions: z.array(permissionGrantSchema).max(500) });
export type AssignPermissionsInput = z.infer<typeof assignPermissionsSchema>;

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

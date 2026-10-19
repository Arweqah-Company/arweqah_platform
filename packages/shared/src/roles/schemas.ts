import { z } from 'zod';
import { localizedNameSchema } from '../common/localized';
import { PERMISSION_SCOPES, type PermissionScope } from '../permissions/scope';

export const permissionGrantSchema = z.strictObject({
  key: z.string().regex(/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/),
  scope: z.enum(PERMISSION_SCOPES),
});

export const upsertRoleSchema = z.strictObject({
  ...localizedNameSchema,
  description: z.string().trim().max(500).optional(),
  permissions: z.array(permissionGrantSchema).max(500),
});
export type UpsertRoleInput = z.infer<typeof upsertRoleSchema>;

export interface RoleDto {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  isSystem: boolean;
  permissions: { key: string; scope: PermissionScope }[];
  usersCount: number;
}

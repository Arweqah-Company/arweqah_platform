import { z } from 'zod';
import { paginationQuerySchema } from '../common/pagination';
import type { PermissionScope } from '../permissions/scope';

export const PASSWORD_MIN_LENGTH = 10;

export const placementSchema = z.strictObject({
  branchId: z.uuid().nullable(),
  departmentId: z.uuid().nullable(),
  teamId: z.uuid().nullable(),
  managerId: z.uuid().nullable(),
});
export type PlacementInput = z.infer<typeof placementSchema>;

export const createUserSchema = z.strictObject({
  name: z.string().trim().min(2).max(120),
  email: z.email().transform((e) => e.toLowerCase()),
  /** Optional: users who sign in only with Microsoft get no password. */
  password: z.string().min(PASSWORD_MIN_LENGTH).max(128).optional(),
  locale: z.enum(['ar', 'en']).default('ar'),
  roleIds: z.array(z.uuid()).max(20).default([]),
  placement: placementSchema.optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const assignRolesSchema = z.strictObject({ roleIds: z.array(z.uuid()).max(20) });
export type AssignRolesInput = z.infer<typeof assignRolesSchema>;

export const usersQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['active', 'inactive']).optional(),
});
export type UsersQuery = z.infer<typeof usersQuerySchema>;

export interface UserDto {
  id: string;
  name: string;
  email: string;
  locale: 'ar' | 'en';
  isActive: boolean;
  twoFactorEnabled: boolean;
  roles: { id: string; nameAr: string; nameEn: string }[];
  placement: PlacementInput;
  createdAt: string;
}

export interface MeDto extends UserDto {
  permissions: { key: string; scope: PermissionScope }[];
}

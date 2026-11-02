import { z } from 'zod';
import { localizedNameSchema } from '../common/localized';

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

/** The groups of roles given to one person (their roles come on top). */
export const assignGroupsSchema = z.strictObject({ groupIds: z.array(z.uuid()).max(50) });
export type AssignGroupsInput = z.infer<typeof assignGroupsSchema>;

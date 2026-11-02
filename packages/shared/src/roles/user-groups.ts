import { z } from 'zod';
import { localizedNameSchema } from '../common/localized';

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

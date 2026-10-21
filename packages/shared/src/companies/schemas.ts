import { z } from 'zod';
import { localizedNameSchema } from '../common/localized';

export const upsertCompanySchema = z.strictObject({
  ...localizedNameSchema,
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,20}$/),
  isActive: z.boolean().default(true),
});
export type UpsertCompanyInput = z.infer<typeof upsertCompanySchema>;

export interface CompanyDto {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  employeesCount: number;
}

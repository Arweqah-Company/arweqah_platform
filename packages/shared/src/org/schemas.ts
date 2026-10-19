import { z } from 'zod';
import { localizedNameSchema } from '../common/localized';

export const upsertBranchSchema = z.strictObject({
  ...localizedNameSchema,
  code: z.string().trim().regex(/^[A-Z0-9-]{2,20}$/),
  city: z.string().trim().max(80).optional(),
});
export type UpsertBranchInput = z.infer<typeof upsertBranchSchema>;

export const upsertDepartmentSchema = z.strictObject({
  ...localizedNameSchema,
  branchId: z.uuid(),
  parentId: z.uuid().nullable().optional(),
  headUserId: z.uuid().nullable().optional(),
});
export type UpsertDepartmentInput = z.infer<typeof upsertDepartmentSchema>;

export const upsertTeamSchema = z.strictObject({
  ...localizedNameSchema,
  departmentId: z.uuid(),
  leadUserId: z.uuid().nullable().optional(),
});
export type UpsertTeamInput = z.infer<typeof upsertTeamSchema>;

export interface BranchDto {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  city: string | null;
}
export interface DepartmentDto {
  id: string;
  nameAr: string;
  nameEn: string;
  branchId: string;
  parentId: string | null;
  headUserId: string | null;
}
export interface TeamDto {
  id: string;
  nameAr: string;
  nameEn: string;
  departmentId: string;
  leadUserId: string | null;
}

export interface OrgTreeDto {
  branches: (BranchDto & { departments: (DepartmentDto & { teams: TeamDto[] })[] })[];
}

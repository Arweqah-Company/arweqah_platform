import { z } from 'zod';
import { paginationQuerySchema } from '../common/pagination';

/** «My team» (FR-92): the active colleagues of the viewer's own unit with their basic details; narrowed by company and job title (the unit is always the viewer's). */
export const directoryQuerySchema = paginationQuerySchema.extend({
  companyId: z.uuid().optional(),
  jobTitleId: z.uuid().optional(),
});
export type DirectoryQuery = z.infer<typeof directoryQuerySchema>;

interface Named {
  nameAr: string;
  nameEn: string;
}

/** What every colleague sees of an employee: who they are, where they sit and how to reach them at work. */
export interface DirectoryEntryDto {
  id: string;
  fullName: string;
  fullNameEn: string | null;
  photoFileId: string | null;
  company: Named & { id: string };
  orgNode: (Named & { id: string; pathAr: string; pathEn: string }) | null;
  jobTitle: (Named & { id: string }) | null;
  workEmail: string;
  workPhone: string | null;
}

/** How much of a colleague's profile the viewer gets: the basics, more for their managers (and the person themselves), the whole record for who may open it. */
export const DIRECTORY_LEVELS = ['basic', 'extended', 'full'] as const;
export type DirectoryLevel = (typeof DIRECTORY_LEVELS)[number];

export interface DirectoryProfileDto extends DirectoryEntryDto {
  level: DirectoryLevel;
  manager: { id: string; fullName: string } | null;
  /** Work and contact details beyond the basics: only at the `extended` and `full` levels. */
  details: {
    workLocation: string | null;
    workMode: 0 | 1 | 2 | null;
    startDate: string;
    personalPhone: string | null;
    personalEmail: string | null;
  } | null;
}

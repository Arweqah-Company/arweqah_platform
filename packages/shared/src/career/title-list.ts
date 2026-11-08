import { z } from 'zod';
import { paginationQuerySchema } from '../common/pagination';
import { TITLE_GRADE_MAX, TITLE_GRADE_MIN, TITLE_TRACKS, type TitleTrack } from '../org/unit-types';

/**
 * The list of job titles with the state of their career path (the page «career-path content», FR-113): each title is `none` (nothing saved),
 * `draft` (saved, not shown to the holders) or `ready` (shown to them, who are asked to acknowledge it).
 */
export const CAREER_LIST_STATUSES = ['none', 'draft', 'ready'] as const;
export type CareerListStatus = (typeof CAREER_LIST_STATUSES)[number];

/** `GET /career/titles`: search by name or code; filters by the path's state, grade, track and the unit (a title in that unit or below it). */
export const careerTitlesQuerySchema = paginationQuerySchema.extend({
  status: z.enum(CAREER_LIST_STATUSES).optional(),
  grade: z.coerce.number().int().min(TITLE_GRADE_MIN).max(TITLE_GRADE_MAX).optional(),
  track: z.enum(TITLE_TRACKS).optional(),
  orgNodeId: z.uuid().optional(),
});
export type CareerTitlesQuery = z.infer<typeof careerTitlesQuerySchema>;

export interface CareerTitleListItemDto {
  id: string;
  code: string | null;
  nameAr: string;
  nameEn: string;
  unitCode: string | null;
  unitNameAr: string;
  unitNameEn: string;
  grade: number | null;
  track: TitleTrack | null;
  status: CareerListStatus;
  /** The content version (0 = nothing saved). */
  version: number;
  /** The active employees holding the title (they are the ones asked to acknowledge). */
  holders: number;
  updatedAt: string | null;
}

import { z } from 'zod';
import { paginationQuerySchema, type Paginated } from '../common/pagination';
import type { ProofKind, RecordStatus } from './proof';

/**
 * «My career team»: the direct manager's view of the people under them (FR-115; plan §2.5). Read only: nobody edits an employee's path from here,
 * except deciding a proof that was referred to the manager.
 */
export const TEAM_STATUSES = ['regular', 'late', 'no_path'] as const;
export type TeamStatus = (typeof TEAM_STATUSES)[number];

export const teamQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  status: z.enum(TEAM_STATUSES).optional(),
});
export type TeamQuery = z.infer<typeof teamQuerySchema>;

export interface TeamMemberDto {
  employeeId: string;
  name: string;
  titleNameAr: string | null;
  titleNameEn: string | null;
  /** The units of priority «mandatory» and «necessary» that were approved, and all of them. */
  requiredDone: number;
  requiredTotal: number;
  /** Approved minutes, and the minutes a year of their development stage asks for (null when no rule covers their grade and track). */
  approvedMinutes: number;
  yearMinutes: number | null;
  /** Items of «required» past their date and not ticked. */
  overdue: number;
  waiting: number;
  status: TeamStatus;
}
export type TeamPageDto = Paginated<TeamMemberDto> & { lateCount: number };

export interface TeamWaitingProofDto {
  id: string;
  unitTitle: string;
  kind: ProofKind;
  status: RecordStatus;
  submittedAt: string;
  note: string | null;
}
export interface TeamMemberDetailDto extends TeamMemberDto {
  proofs: TeamWaitingProofDto[];
}

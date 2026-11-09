import { z } from 'zod';
import type { DevelopmentStageDto } from '../org/job-titles';
import type { TitleTrack } from '../org/unit-types';
import type { CareerContent } from './content';

/**
 * The employee's own career path and its acknowledgement (FR-111, FR-112; plan §2.2, §2.3).
 * The page shows the content of the title the employee holds, once HR set it ready; the platform is held back (in the web) until the
 * employee has acknowledged it, at the first sign-in, when the title changes, or when HR reopens the acknowledgement.
 */
export const CAREER_ACK_REASONS = ['first', 'title', 'reopened'] as const;
export type CareerAckReason = (typeof CAREER_ACK_REASONS)[number];

export interface MyCareerProfileDto {
  /** False when the employee has no title, or the title's path is not ready: the page says the path is not prepared yet. */
  available: boolean;
  titleId: string | null;
  titleCode: string | null;
  titleNameAr: string | null;
  titleNameEn: string | null;
  grade: number | null;
  track: TitleTrack | null;
  /** The unit the title belongs to (its code, and its names). */
  unitCode: string | null;
  unitNameAr: string | null;
  unitNameEn: string | null;
  /** The employee and their direct manager, by name. */
  employeeName: string | null;
  managerName: string | null;
  /** The development stage of the title's grade and track (hours a year and the budget cap), or null when no rule covers them. */
  stage: DevelopmentStageDto | null;
  /** The version of the content shown (what an acknowledgement records). */
  contentVersion: number | null;
  content: CareerContent | null;
  /** True while the platform is held back until the employee acknowledges; never for a «sign in as» session. */
  ackRequired: boolean;
  /** The system account: it is held back like anyone, except while platform admin mode is on (so the administration keeps working). The web applies it. */
  adminModeExempt: boolean;
  ackReason: CareerAckReason | null;
  acknowledgedAt: string | null;
  acknowledgedVersion: number | null;
}

/** `POST /career-profile/me/acknowledge`: the version the person read (a newer one is refused so nobody acknowledges text they did not see). */
export const acknowledgeCareerSchema = z.strictObject({ contentVersion: z.number().int().min(1) });
export type AcknowledgeCareerInput = z.infer<typeof acknowledgeCareerSchema>;

/** `POST /career/titles/:id/reopen-acknowledgement`: why HR asks the holders to acknowledge again. */
export const reopenAcknowledgementSchema = z.strictObject({ reason: z.string().trim().min(5).max(300) });
export type ReopenAcknowledgementInput = z.infer<typeof reopenAcknowledgementSchema>;

export interface ReopenAcknowledgementResultDto {
  /** The people holding the title who will be asked again. */
  affected: number;
}

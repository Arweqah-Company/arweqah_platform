import { z } from 'zod';
import { paginationQuerySchema, type Paginated } from '../common/pagination';

/**
 * Proof of a learning unit and its review (FR-114; plan `docs/plans/phase-6-career-path-performance.md` §2.4).
 * The employee sends a proof for a unit of the learning plan; the reviewer approves it (its hours then count), rejects it with a reason, or
 * refers it to the direct manager.
 */
export const PROOF_KINDS = ['certificate', 'application', 'output'] as const;
export type ProofKind = (typeof PROOF_KINDS)[number];

/** The stored states of a record. «Not started» is the absence of a record. */
export const RECORD_STATUSES = ['wait', 'referred', 'done', 'rej'] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

/** A proof is rejected this many times before the direct manager is told (plan §2.4). */
export const PROOF_REJECTIONS_BEFORE_MANAGER = 3;
export const PROOF_NOTE_MAX = 500;
export const PROOF_REASON_MIN = 5;
export const PROOF_REASON_MAX = 500;

export const submitProofSchema = z.strictObject({
  unitId: z.uuid(),
  kind: z.enum(PROOF_KINDS),
  /** The file the person uploaded first (`POST /files`); a certificate cannot go without one. */
  fileId: z.uuid().optional(),
  note: z.string().trim().max(PROOF_NOTE_MAX).optional(),
});
export type SubmitProofInput = z.infer<typeof submitProofSchema>;

export const rejectProofSchema = z.strictObject({ reason: z.string().trim().min(PROOF_REASON_MIN).max(PROOF_REASON_MAX) });
export type RejectProofInput = z.infer<typeof rejectProofSchema>;

export const certificatesQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  kind: z.enum(PROOF_KINDS).optional(),
  status: z.enum(RECORD_STATUSES).optional(),
});
export type CertificatesQuery = z.infer<typeof certificatesQuerySchema>;

/** One record of the employee: the state of a unit they sent a proof for. */
export interface LearningRecordDto {
  id: string;
  unitId: string;
  status: RecordStatus;
  kind: ProofKind;
  note: string | null;
  fileName: string | null;
  minutes: number;
  submittedAt: string;
  decidedAt: string | null;
  rejectionReason: string | null;
  rejectionCount: number;
}

/** A row of the review queue. */
export interface CertificateReviewItemDto {
  id: string;
  employeeId: string;
  employeeName: string;
  unitNameAr: string | null;
  unitNameEn: string | null;
  unitTitle: string;
  kind: ProofKind;
  status: RecordStatus;
  minutes: number;
  note: string | null;
  fileName: string | null;
  hasFile: boolean;
  submittedAt: string;
  rejectionCount: number;
}
export type CertificatesPageDto = Paginated<CertificateReviewItemDto>;

/** `PUT /career-profile/me/required/:index`: ticks (or unticks) an item of «required». */
export const setRequiredSchema = z.strictObject({ done: z.boolean() });
export type SetRequiredInput = z.infer<typeof setRequiredSchema>;

/** The progress of the signed-in employee in the plan of their title (the numbers on the cards, the medals and the check boxes). */
export interface MyProgressDto {
  /** The indexes of the items of «required» they marked as done. */
  requiredDone: number[];
  /** The minutes of the units whose proof was approved. */
  approvedMinutes: number;
  /** The units with an approved proof, and of all the units of the plan. */
  unitsDone: number;
  unitsTotal: number;
  /** Proofs waiting for a decision. */
  waiting: number;
  /** Each medal of the plan with the hours it asks for. */
  badges: { name: string; hours: number; reached: boolean }[];
  /** The next medal not yet reached, with the hours still missing; null when all are reached or the plan has none. */
  nextBadge: { name: string; hours: number; missingMinutes: number } | null;
}

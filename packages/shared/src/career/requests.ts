import { z } from 'zod';
import { paginationQuerySchema, type Paginated } from '../common/pagination';

/**
 * Development requests: learning outside the plan, or inside it at another provider, that the employee asks to be paid for (FR-116;
 * plan `docs/plans/phase-6-career-path-performance.md` §2.6). The approval chain follows the cost and whether the course is in the plan.
 */
export const REQUEST_PLAN_KINDS = ['in', 'out'] as const;
export type RequestPlanKind = (typeof REQUEST_PLAN_KINDS)[number];

/** Who decides a request now: the employee's direct manager, the head of their sector, or the CEO. */
export const REQUEST_LEVELS = ['direct', 'sector', 'ceo'] as const;
export type RequestLevel = (typeof REQUEST_LEVELS)[number];

export const REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** In the plan and up to this much (riyals) goes to the direct manager. */
export const REQUEST_DIRECT_LIMIT = 5000;
/** Above this much it goes to the CEO. */
export const REQUEST_SECTOR_LIMIT = 20000;
/** The direct manager has this many calendar days (about five working days) before the request goes up to the sector head. */
export const REQUEST_DIRECT_DAYS = 7;
export const REQUEST_COST_MAX = 10_000_000;
export const REQUEST_REASON_MIN = 5;

export const createRequestSchema = z.strictObject({
  courseName: z.string().trim().min(2).max(200),
  /** Whole riyals. */
  cost: z.number().int().min(0).max(REQUEST_COST_MAX),
  plan: z.enum(REQUEST_PLAN_KINDS),
  /** The retention agreement for funded training, uploaded first (`POST /files`). */
  agreementFileId: z.uuid().optional(),
});
export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const rejectRequestSchema = z.strictObject({ reason: z.string().trim().min(REQUEST_REASON_MIN).max(500) });
export type RejectRequestInput = z.infer<typeof rejectRequestSchema>;

export const requestsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  status: z.enum(REQUEST_STATUSES).optional(),
  level: z.enum(REQUEST_LEVELS).optional(),
  plan: z.enum(REQUEST_PLAN_KINDS).optional(),
  /** Only the requests waiting for the signed-in person. */
  mine: z.stringbool().optional(),
});
export type RequestsQuery = z.infer<typeof requestsQuerySchema>;

/** The chain a cost and a plan choice give, and the rest of the yearly budget (shown in the dialog before sending). */
export interface RequestPreviewDto {
  level: RequestLevel;
  /** The name of whoever decides, or null when nobody holds the post yet. */
  approverName: string | null;
  budgetCap: number | null;
  spent: number;
  left: number | null;
}

export const requestPreviewQuerySchema = z.strictObject({ cost: z.coerce.number().int().min(0).max(REQUEST_COST_MAX), plan: z.enum(REQUEST_PLAN_KINDS) });
export type RequestPreviewQuery = z.infer<typeof requestPreviewQuerySchema>;

export interface DevelopmentRequestDto {
  id: string;
  employeeId: string;
  employeeName: string;
  courseName: string;
  cost: number;
  plan: RequestPlanKind;
  status: RequestStatus;
  level: RequestLevel;
  approverName: string | null;
  /** The signed-in person decides it now (they are the approver and it is pending). */
  canDecide: boolean;
  overBudget: boolean;
  hasAgreement: boolean;
  agreementName: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  decidedAt: string | null;
}
export type RequestsPageDto = Paginated<DevelopmentRequestDto>;

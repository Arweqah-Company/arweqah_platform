import type { DevelopmentRequestDto } from '@arweqah-platform/shared';
import { isOverBudget } from '../../domain/rules/development-request.rules';
import type { RequestRow } from '../../domain/types/career-profile.types';

/** A request for the page: `canDecide` is true only for the person it is with, while it is pending. `spent` is what the employee already had approved this year; the budget warning is only for a request still pending. */
export function toRequestDto(row: RequestRow, viewerUserId: string, spent: number | null): DevelopmentRequestDto {
  return {
    id: row.id, employeeId: row.employeeId, employeeName: row.employeeName, courseName: row.courseName, cost: row.cost, plan: row.plan, status: row.status, level: row.level,
    approverName: row.approverName, canDecide: row.status === 'pending' && row.approverUserId === viewerUserId,
    overBudget: row.status === 'pending' && spent !== null && isOverBudget(row.cost, row.budgetCap, spent), hasAgreement: !!row.agreementFileId, agreementName: row.agreementName,
    rejectionReason: row.rejectionReason, submittedAt: row.submittedAt.toISOString(), decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
  };
}

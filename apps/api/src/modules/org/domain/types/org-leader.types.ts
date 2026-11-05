import type { LeaderKind } from '@arweqah-platform/shared';

/** One stored row of who leads a unit for a company, or acts for them. */
export interface LeaderRow {
  id: string;
  nodeId: string;
  companyId: string;
  employeeId: string;
  kind: LeaderKind;
  validFrom: string;
  validTo: string | null;
  reason: string;
  createdBy: string | null;
}

export interface NewLeader {
  nodeId: string;
  companyId: string;
  employeeId: string;
  kind: LeaderKind;
  validFrom: string;
  validTo: string | null;
  reason: string;
  createdBy: string | null;
}

/** What planning a leader does to the rows of one unit and company: close or drop the leader in the way. */
export interface LeaderPlan {
  /** Rows to end the day before the new one starts: id → last day. */
  close: { id: string; validTo: string }[];
  /** Rows the new one replaces (same start day, not started yet or starting today). */
  replaceIds: string[];
}

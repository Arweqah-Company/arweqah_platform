import type { AssignmentField } from '@arweqah-platform/shared';

/** The columns of `employees` that hold the value in force today, by placement field. */
export const ASSIGNMENT_COLUMN = { org_node: 'orgNodeId', job_title: 'jobTitleId', manager: 'managerId' } as const satisfies Record<AssignmentField, string>;
export type AssignmentColumn = (typeof ASSIGNMENT_COLUMN)[AssignmentField];

/** A change asked for: a value per field (null = no manager), only for the fields that change. */
export type PlacementChange = Partial<Record<AssignmentColumn, string | null>>;

/** What the rules need to know about a stored period. */
export interface Period {
  id: string;
  validFrom: string;
  validTo: string | null;
  appliedAt: Date | null;
}

export interface ChangePlan {
  /** The period to close the day before the new one starts, if there is one. */
  closeId: string | null;
  closeTo: string | null;
  /** A change on the day the open period began corrects that period instead of adding an empty one. */
  replaceId: string | null;
  /** The new value is in force today (otherwise it waits for its day). */
  applyNow: boolean;
}
